// --- WHY THIS CODE EXISTS ---
// Viewer-side component. Phase 18B adds relay capability — every viewer
// can forward the received stream to their assigned children.
//
// Upstream flow (receiving from creator or parent peer):
// 1. Fetch broadcast info
// 2. Watch Live button → user gesture unlocks iOS autoplay
// 3. POST /api/live/join → get peerId, tier_level, parent_one_id
// 4. Create upstream RTCPeerConnection
// 5. Create LiveMeshEngine (for relaying to children)
// 6. Subscribe to Realtime channel, send viewer-join with parent_peer_id
// 7. Handle offer from parent → answer → ICE exchange
// 8. ontrack → set video + engine.setRelayStream()
//
// Downstream flow (relaying to children via LiveMeshEngine):
// 9. viewer-join events where parent_peer_id === myPeerId → engine.handleChildJoin()
// 10. answer from child → engine.handleChildAnswer()
// 11. upstream ice-candidate from child → engine.handleChildIce()
// 12. viewer-leave from child → engine.handleChildLeave()

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer watches a live broadcast (direct from creator)
// Phase 18B: viewer is also a relay node — forwards stream to assigned children

// --- PITFALLS ---
// ⚠️ WARNING: parent_one_id = null means parent is CREATOR ('creator' string used in signaling)
// ⚠️ WARNING: viewer-join payload must include parent_peer_id so creator/relay know to respond
// ⚠️ WARNING: ICE direction field: 'downstream' = parent→child, 'upstream' = child→parent
//             LivePlayer only processes downstream ICE (from its own parent)
//             LiveMeshEngine only processes upstream ICE (from its children)
// ⚠️ WARNING: iOS autoplay fix — prime video.play() synchronously in handleWatch user gesture
// ⚠️ WARNING: playsInline required — without it iOS Safari makes video fullscreen
// ⚠️ WARNING: engine.setChannel() must be called AFTER channel is created but BEFORE subscribe
// ⚠️ WARNING: Polling every 15s catches stream end when creator navigates away
// ⚠️ WARNING: engine.cleanup() and pc.close() both called in cleanup() — order matters

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — viewer component
// [Jun 08, 2026] FIXED: iOS black video — prime video.play() in user gesture context
// [Jun 08, 2026] ADDED: 15s polling for stream end detection
// [Jun 09, 2026] UPDATED: Phase 18B — relay capability via LiveMeshEngine
//                viewer now forwards received stream to assigned children
//                parent_peer_id added to viewer-join signaling
//                ICE direction field added to distinguish upstream vs downstream
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import supabase from '@/lib/supabase';
import { ICE_SERVERS, signalChannelName } from '@/lib/liveConfig';
import LiveMeshEngine from '@/components/live/LiveMeshEngine';

export default function LivePlayer({ broadcastId }) {
  const { accessToken } = useAuthStore();

  const [phase, setPhase]               = useState('loading');
  const [errorMsg, setErrorMsg]         = useState(null);
  const [broadcastInfo, setBroadcastInfo] = useState(null);

  const videoRef        = useRef(null);
  const pcRef           = useRef(null);
  const channelRef      = useRef(null);
  const peerIdRef       = useRef(null);
  const parentPeerIdRef = useRef(null);  // 'creator' or UUID of parent peer
  const engineRef       = useRef(null);  // LiveMeshEngine for relaying to children
  const icePendingRef   = useRef([]);    // upstream ICE buffered before offer arrives
  const pollRef         = useRef(null);

  // Load broadcast info on mount
  useEffect(function() {
    if (!broadcastId) return;
    async function load() {
      try {
        var res = await fetch('/api/live?id=' + broadcastId, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) { setPhase('error'); setErrorMsg('Stream not found.'); return; }
        var data = await res.json();
        if (data.broadcast.status === 'ended') { setPhase('ended'); return; }
        setBroadcastInfo(data.broadcast);
        setPhase('waiting');
      } catch(e) {
        setPhase('error'); setErrorMsg('Failed to load stream info.');
      }
    }
    load();
  }, [broadcastId]);

  // Poll broadcast status every 15s while joining or watching
  useEffect(function() {
    if (phase !== 'joining' && phase !== 'watching') return;
    pollRef.current = setInterval(async function() {
      try {
        var res = await fetch('/api/live?id=' + broadcastId, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        var data = await res.json();
        if (data.broadcast && data.broadcast.status === 'ended') {
          clearInterval(pollRef.current); pollRef.current = null;
          setPhase('ended'); cleanup(false);
        }
      } catch(e) {}
    }, 15000);
    return function() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [phase, broadcastId]);

  // Unmount cleanup
  useEffect(function() {
    return function() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      cleanup(true);
    };
  }, []);

  function cleanup(sendLeave) {
    if (sendLeave && channelRef.current && peerIdRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast', event: 'viewer-leave',
          payload: { peer_id: peerIdRef.current },
        });
      } catch(e) {}
      // Also delete peer row from DB
      if (peerIdRef.current) {
        fetch('/api/live/peers?peer_id=' + peerIdRef.current, {
          method: 'DELETE', credentials: 'include',
        }).catch(function() {});
      }
    }
    if (engineRef.current) { engineRef.current.cleanup(); engineRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch(e) {} pcRef.current = null; }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch(e) {}
      channelRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    icePendingRef.current = [];
  }

  // ── Watch Live — user gesture unlocks iOS audio autoplay ──
  async function handleWatch() {
    setPhase('joining');
    setErrorMsg(null);

    // iOS autoplay fix — prime video.play() NOW inside the user gesture context
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = new MediaStream();
        videoRef.current.play().catch(function() {});
      } catch(e) {}
    }

    // 1. Join broadcast — get peer ID, tier, parent assignment
    var peerId, tier_level, parent_one_id;
    try {
      var joinRes = await fetch('/api/live/join', {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {}),
        },
        body: JSON.stringify({ broadcast_id: broadcastId }),
      });
      var joinData = await joinRes.json();
      if (!joinRes.ok) {
        if (joinRes.status === 410) { setPhase('ended'); return; }
        setPhase('error'); setErrorMsg(joinData.error || 'Failed to join stream.'); return;
      }
      peerId       = joinData.peer.id;
      tier_level   = joinData.peer.tier_level;
      parent_one_id = joinData.peer.parent_one_id;  // null = creator, UUID = relay parent
    } catch(e) {
      setPhase('error'); setErrorMsg('Network error. Please try again.'); return;
    }

    peerIdRef.current    = peerId;
    // null parent_one_id means creator is parent — use string 'creator' in signaling
    parentPeerIdRef.current = parent_one_id || 'creator';

    // 2. Create upstream RTCPeerConnection (to creator or parent relay)
    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = function(event) {
      if (!videoRef.current || !event.streams || !event.streams[0]) return;
      var stream = event.streams[0];
      // Display the stream
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(function() {});
      setPhase('watching');
      // Pass stream to engine for relay to children
      if (engineRef.current) { engineRef.current.setRelayStream(stream); }
    };

    // Send ICE to parent — direction 'upstream' (child → parent)
    pc.onicecandidate = function(event) {
      if (!event.candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast', event: 'ice-candidate',
        payload: {
          from:      peerIdRef.current,
          to:        parentPeerIdRef.current,
          candidate: event.candidate,
          direction: 'upstream',
        },
      });
    };

    pc.onconnectionstatechange = function() {
      if (pc.connectionState === 'failed') {
        setPhase('error'); setErrorMsg('Connection failed. Check your network and try again.');
      }
    };

    // 3. Create LiveMeshEngine for relaying to children
    var engine = new LiveMeshEngine(peerId);
    engineRef.current = engine;

    // 4. Create signaling channel with ALL event handlers
    var channelName = signalChannelName(broadcastId);
    var channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });

    // Offer from parent/creator → my upstream connection
    channel.on('broadcast', { event: 'offer' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      await handleParentOffer(msg.payload.sdp);
    });

    // ICE candidate — only process 'downstream' direction (parent → me)
    channel.on('broadcast', { event: 'ice-candidate' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      if (msg.payload.direction === 'upstream') {
        // This is from a child to me as relay — delegate to engine
        if (engineRef.current) {
          await engineRef.current.handleChildIce(msg.payload.from, msg.payload.candidate);
        }
        return;
      }
      // direction === 'downstream' — from parent/creator to me
      await handleParentIce(msg.payload.candidate);
    });

    // Answer from a child → engine
    channel.on('broadcast', { event: 'answer' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      if (engineRef.current) {
        await engineRef.current.handleChildAnswer(msg.payload.from_peer_id, msg.payload.sdp);
      }
    });

    // viewer-join where I am the assigned parent → engine relay
    channel.on('broadcast', { event: 'viewer-join' }, function(msg) {
      if (msg.payload.parent_peer_id !== peerIdRef.current) return;
      if (engineRef.current) { engineRef.current.handleChildJoin(msg.payload.peer_id); }
    });

    // viewer-leave from a child → engine
    channel.on('broadcast', { event: 'viewer-leave' }, function(msg) {
      if (engineRef.current) { engineRef.current.handleChildLeave(msg.payload.peer_id); }
    });

    // Stream ended by creator
    channel.on('broadcast', { event: 'stream-ended' }, function() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setPhase('ended'); cleanup(false);
    });

    // Give engine the channel for sending to children
    engine.setChannel(channel);

    // Subscribe — send viewer-join only after SUBSCRIBED
    channel.subscribe(function(status) {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast', event: 'viewer-join',
          payload: {
            peer_id:        peerIdRef.current,
            parent_peer_id: parentPeerIdRef.current,
            tier_level:     tier_level,
          },
        });
      }
    });

    channelRef.current = channel;
  }

  // Handle offer from creator or parent relay
  async function handleParentOffer(sdp) {
    var pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      // Flush buffered upstream ICE
      for (var i = 0; i < icePendingRef.current.length; i++) {
        try { await pc.addIceCandidate(new RTCIceCandidate(icePendingRef.current[i])); } catch(e) {}
      }
      icePendingRef.current = [];
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'answer',
          payload: {
            from_peer_id: peerIdRef.current,
            to:           parentPeerIdRef.current,
            sdp:          pc.localDescription,
          },
        });
      }
    } catch(err) {
      console.error('LivePlayer: handleParentOffer failed', err);
      setPhase('error'); setErrorMsg('WebRTC handshake failed.');
    }
  }

  // Handle ICE candidate from parent/creator (direction: downstream)
  async function handleParentIce(candidate) {
    var pc = pcRef.current;
    if (!pc) return;
    if (!pc.remoteDescription) {
      icePendingRef.current.push(candidate);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
  }

  // ── Render ──

  if (phase === 'loading') {
    return (
      <div className="live-page">
        <div style={{ marginTop: 80, color: '#444', fontSize: 14, textAlign: 'center' }}>Loading stream...</div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="live-page">
        <div className="live-ended-screen">
          <div style={{ fontSize: 36 }}>📺</div>
          <div>Stream has ended</div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="live-page">
        <div style={{ marginTop: 80, textAlign: 'center' }}>
          <div style={{ color: '#ff5252', fontSize: 15 }}>{errorMsg || 'Something went wrong.'}</div>
          <button onClick={function() { window.location.reload(); }}
            className="live-btn-watch" style={{ maxWidth: 200, marginTop: 24 }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="live-page">
      {broadcastInfo && (
        <>
          <div className="live-stream-title">{broadcastInfo.title || 'Live Stream'}</div>
          <div className="live-creator-name">by {broadcastInfo.creator_username}</div>
        </>
      )}

      <div className="live-stage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: phase === 'watching' ? 'block' : 'none',
          }}
        />
        {(phase === 'waiting' || phase === 'joining') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {phase === 'joining' ? (
              <>
                <div>
                  <span className="live-connecting-dot" />
                  <span className="live-connecting-dot" />
                  <span className="live-connecting-dot" />
                </div>
                <div style={{ fontSize: 13, color: '#555' }}>Connecting to stream...</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#555' }}>Stream is live</div>
            )}
          </div>
        )}
        {phase === 'watching' && <div className="live-badge">LIVE</div>}
      </div>

      {phase === 'waiting' && (
        <button className="live-btn-watch" onClick={handleWatch}>▶  Watch Live</button>
      )}
      {phase === 'joining' && (
        <button className="live-btn-watch" disabled>Connecting...</button>
      )}
      {phase === 'watching' && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#444', textAlign: 'center' }}>
          Connected — watching live
        </div>
      )}
    </div>
  );
}
