// --- WHY THIS CODE EXISTS ---
// Viewer-side component.
// Phase 18A: watch a live broadcast direct from creator.
// Phase 18B: relay capability — forward stream to assigned children via LiveMeshEngine.
// Phase 18C: failover — detect parent failure, activate backup parent via LivePeerManager.

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer watches direct from creator
// Phase 18B: viewer relays stream to children
// Phase 18C: parent failure detected → backup parent activated → video continues

// --- PITFALLS ---
// ⚠️ WARNING: parent_one_id = null means parent is CREATOR ('creator' in signaling)
// ⚠️ WARNING: parent_two_id = null means no backup — Tier 1 or no alternates available
// ⚠️ WARNING: iOS autoplay fix — prime video.play() synchronously in handleWatch gesture
// ⚠️ WARNING: playsInline required — iOS Safari makes video fullscreen without it
// ⚠️ WARNING: buildPeerConnection() must be called inside handleWatch AND handlePrimaryFailed
//             Both times it captures the current parentPeerIdRef value via closure over ref
// ⚠️ WARNING: offer with offer_type:'backup' routes to handleParentOffer after updating
//             parentPeerIdRef — the standard handleParentOffer sends the answer to the
//             correct peer because parentPeerIdRef was updated just before calling it
// ⚠️ WARNING: engine.setRelayStream() triggers pending child joins — pinging must start after
// ⚠️ WARNING: Polling every 15s catches stream end when creator navigates away
// ⚠️ WARNING: handlePrimaryFailed does NOT clear videoRef.srcObject — keeps frozen frame
//             visible while backup connects — avoids brief black screen

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A
// [Jun 08, 2026] FIXED: iOS black video — prime video.play() in user gesture context
// [Jun 08, 2026] ADDED: 15s polling for stream end detection
// [Jun 09, 2026] UPDATED: Phase 18B — relay via LiveMeshEngine, parent_peer_id signaling
// [Jun 10, 2026] UPDATED: Phase 18C — LivePeerManager wired in, backup activation flow,
//                heartbeat-ping and parent-activate event handling
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import supabase from '@/lib/supabase';
import { ICE_SERVERS, signalChannelName } from '@/lib/liveConfig';
import LiveMeshEngine from '@/components/live/LiveMeshEngine';
import LivePeerManager from '@/components/live/LivePeerManager';

export default function LivePlayer({ broadcastId }) {
  const { accessToken } = useAuthStore();

  const [phase, setPhase]               = useState('loading');
  const [errorMsg, setErrorMsg]         = useState(null);
  const [broadcastInfo, setBroadcastInfo] = useState(null);

  const videoRef          = useRef(null);
  const pcRef             = useRef(null);
  const channelRef        = useRef(null);
  const peerIdRef         = useRef(null);
  const parentPeerIdRef   = useRef(null);     // 'creator' or UUID of current active parent
  const backupParentIdRef = useRef(null);     // Phase 18C: UUID of backup parent, or null
  const engineRef         = useRef(null);
  const peerManagerRef    = useRef(null);     // Phase 18C: heartbeat + failover
  const icePendingRef     = useRef([]);
  const pollRef           = useRef(null);

  // Load broadcast on mount
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
      } catch(e) { setPhase('error'); setErrorMsg('Failed to load stream info.'); }
    }
    load();
  }, [broadcastId]);

  // Poll broadcast status every 15s
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
      fetch('/api/live/peers?peer_id=' + peerIdRef.current, {
        method: 'DELETE', credentials: 'include',
      }).catch(function() {});
    }
    if (peerManagerRef.current) { peerManagerRef.current.cleanup(); peerManagerRef.current = null; }
    if (engineRef.current) { engineRef.current.cleanup(); engineRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch(e) {} pcRef.current = null; }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch(e) {}
      channelRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    icePendingRef.current = [];
  }

  // Builds an RTCPeerConnection with standard handlers.
  // Uses ref values (not closure primitives) so handlers always see current state.
  function buildPeerConnection() {
    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = function(event) {
      if (!videoRef.current || !event.streams || !event.streams[0]) return;
      var stream = event.streams[0];
      // Replace srcObject — if failover, this resumes from frozen frame to live
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(function() {});
      setPhase('watching');
      // Relay stream to children + start pinging them
      if (engineRef.current) {
        engineRef.current.setRelayStream(stream);
        if (peerManagerRef.current) { peerManagerRef.current.startPinging(); }
      }
      // Watch for parent heartbeat (only starts if backupParentId is set)
      if (peerManagerRef.current) { peerManagerRef.current.startWatching(); }
    };

    // ICE to parent — direction: upstream (child → parent)
    pc.onicecandidate = function(event) {
      if (!event.candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast', event: 'ice-candidate',
        payload: {
          from:      peerIdRef.current,
          to:        parentPeerIdRef.current,  // ref — always current parent
          candidate: event.candidate,
          direction: 'upstream',
        },
      });
    };

    pc.onconnectionstatechange = function() {
      if (peerManagerRef.current) {
        peerManagerRef.current.onConnectionStateChange(pc.connectionState);
      }
      // If no backup parent and connection fails — show error
      if (pc.connectionState === 'failed' && !backupParentIdRef.current) {
        setPhase('error'); setErrorMsg('Connection lost. Please try again.');
      }
    };

    return pc;
  }

  // Phase 18C: primary parent failed — switch to backup without black screen
  function handlePrimaryFailed(backupId) {
    if (!backupId) {
      setPhase('error'); setErrorMsg('Connection lost. Please try again.');
      return;
    }

    // Close failed primary (do NOT clear videoRef.srcObject — keep frozen frame visible)
    if (pcRef.current) {
      try { pcRef.current.close(); } catch(e) {}
      pcRef.current = null;
    }
    icePendingRef.current = [];

    // Update active parent ref — ICE candidates and answer will go to backup
    parentPeerIdRef.current = backupId;

    // Create new PC ready to receive backup offer
    // Backup offer arrives via channel event handler (offer_type: 'backup')
    var pc = buildPeerConnection();
    pcRef.current = pc;
  }

  // Watch Live — user gesture needed for iOS audio autoplay
  async function handleWatch() {
    setPhase('joining');
    setErrorMsg(null);

    // iOS autoplay fix — prime play() NOW inside the user gesture
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = new MediaStream();
        videoRef.current.play().catch(function() {});
      } catch(e) {}
    }

    // Join — get peer ID, tier, parent assignments
    var peerId, tier_level, parent_one_id, parent_two_id;
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
      peerId        = joinData.peer.id;
      tier_level    = joinData.peer.tier_level;
      parent_one_id = joinData.peer.parent_one_id;
      parent_two_id = joinData.peer.parent_two_id;
    } catch(e) {
      setPhase('error'); setErrorMsg('Network error. Please try again.'); return;
    }

    peerIdRef.current         = peerId;
    parentPeerIdRef.current   = parent_one_id || 'creator';
    backupParentIdRef.current = parent_two_id  || null;

    // Primary upstream connection
    var pc = buildPeerConnection();
    pcRef.current = pc;

    // Relay engine for forwarding to children
    var engine = new LiveMeshEngine(peerId);
    engineRef.current = engine;

    // Phase 18C: heartbeat + failover manager
    var manager = new LivePeerManager(peerId, parentPeerIdRef.current, backupParentIdRef.current);
    peerManagerRef.current = manager;
    manager.setOnPrimaryFailed(function(backupId) {
      handlePrimaryFailed(backupId);
    });

    // Signaling channel
    var channelName = signalChannelName(broadcastId);
    var channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });

    // Offer from parent/creator OR backup offer after failover
    channel.on('broadcast', { event: 'offer' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      if (msg.payload.offer_type === 'backup') {
        // Backup parent is offering video — update active parent ref first
        parentPeerIdRef.current = msg.payload.from;
      }
      await handleParentOffer(msg.payload.sdp);
    });

    // ICE candidates
    channel.on('broadcast', { event: 'ice-candidate' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      if (msg.payload.direction === 'upstream') {
        // From a child to me as relay
        if (engineRef.current) {
          await engineRef.current.handleChildIce(msg.payload.from, msg.payload.candidate);
        }
        return;
      }
      // From parent/creator to me
      await handleParentIce(msg.payload.candidate);
    });

    // Answer from a child peer
    channel.on('broadcast', { event: 'answer' }, async function(msg) {
      if (msg.payload.to !== peerIdRef.current) return;
      if (engineRef.current) {
        await engineRef.current.handleChildAnswer(msg.payload.from_peer_id, msg.payload.sdp);
      }
    });

    // Child joining — I am their assigned parent
    channel.on('broadcast', { event: 'viewer-join' }, function(msg) {
      if (msg.payload.parent_peer_id !== peerIdRef.current) return;
      if (engineRef.current) { engineRef.current.handleChildJoin(msg.payload.peer_id); }
    });

    // Child leaving
    channel.on('broadcast', { event: 'viewer-leave' }, function(msg) {
      if (engineRef.current) { engineRef.current.handleChildLeave(msg.payload.peer_id); }
    });

    // Stream ended by creator
    channel.on('broadcast', { event: 'stream-ended' }, function() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setPhase('ended'); cleanup(false);
    });

    // Phase 18C: heartbeat from parent — resets watchdog
    channel.on('broadcast', { event: 'heartbeat-ping' }, function(msg) {
      if (peerManagerRef.current) {
        peerManagerRef.current.onPingReceived(msg.payload.from);
      }
    });

    // Phase 18C: I am being activated as backup parent by a child
    channel.on('broadcast', { event: 'parent-activate' }, function(msg) {
      if (msg.payload.activate_peer_id !== peerIdRef.current) return;
      if (engineRef.current) {
        engineRef.current.handleActivationRequest(msg.payload.peer_id);
      }
    });

    engine.setChannel(channel);
    manager.setChannel(channel);

    // Send viewer-join ONLY after SUBSCRIBED — creator/relay must be ready to receive
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

  async function handleParentOffer(sdp) {
    var pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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
