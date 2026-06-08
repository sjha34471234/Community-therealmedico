// --- WHY THIS CODE EXISTS ---
// Viewer-side Phase 18A component. Full signaling flow:
// 1. Fetches broadcast info on load
// 2. Viewer clicks Watch Live — user gesture unlocks iOS autoplay
// 3. POST /api/live/join → get peerId
// 4. Create RTCPeerConnection
// 5. Subscribe to Realtime channel, send 'viewer-join' on SUBSCRIBED
// 6. Handle 'offer' → setRemoteDescription → createAnswer → send answer
// 7. Handle 'ice-candidate' → addIceCandidate (with buffering)
// 8. ontrack → set srcObject → play
// 9. Handle 'stream-ended' event OR poll detects ended → show ended screen

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer watches a live broadcast

// --- PITFALLS ---
// ⚠️ WARNING: iOS Safari autoplay policy — video with audio tracks blocked unless play() is
//             called synchronously inside a user gesture. By the time ontrack fires (seconds
//             later after ICE), the gesture context has expired. Fix: prime video with an empty
//             MediaStream and call play() synchronously in handleWatch, BEFORE any await calls.
//             When ontrack fires and we replace srcObject, iOS accepts the continuation.
// ⚠️ WARNING: playsInline required — without it iOS Safari makes video fullscreen on tap
// ⚠️ WARNING: 'viewer-join' must only be sent AFTER channel status === 'SUBSCRIBED'
// ⚠️ WARNING: ICE candidates from creator may arrive before offer — buffered in icePendingRef
// ⚠️ WARNING: Polling detects stream end when creator navigates away without tapping End Stream
//             Poll interval 15s — viewer sees ended screen within 15s of creator leaving
// ⚠️ WARNING: video element always rendered (display toggled) so ref is never null when ontrack fires
// ⚠️ WARNING: cleanup() sends 'viewer-leave' before closing PC and unsubscribing channel

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh viewer component
// [Jun 08, 2026] FIXED: iOS black video — prime video.play() in handleWatch user gesture context
//                REASON: iOS Safari blocks audio-track autoplay when gesture context expires.
//                Fix: create empty MediaStream, set as srcObject, call play() synchronously
//                in handleWatch. When ontrack fires later, iOS accepts srcObject replacement.
// [Jun 08, 2026] ADDED: Broadcast status polling every 15s while joining/watching
//                REASON: Realtime stream-ended event unreliable when creator tab closes.
//                Polling catches stream end within 15s regardless of how creator left.
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import supabase from '@/lib/supabase';
import { ICE_SERVERS, signalChannelName } from '@/lib/liveConfig';

export default function LivePlayer({ broadcastId }) {
  const { accessToken } = useAuthStore();

  const [phase, setPhase]           = useState('loading');
  const [errorMsg, setErrorMsg]     = useState(null);
  const [broadcastInfo, setBroadcastInfo] = useState(null);

  const videoRef      = useRef(null);
  const pcRef         = useRef(null);
  const channelRef    = useRef(null);
  const peerIdRef     = useRef(null);
  const icePendingRef = useRef([]);
  const pollRef       = useRef(null);

  // Fetch broadcast info on load
  useEffect(function() {
    if (!broadcastId) return;
    async function loadBroadcast() {
      try {
        const res = await fetch('/api/live?id=' + broadcastId, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) { setPhase('error'); setErrorMsg('Stream not found.'); return; }
        const data = await res.json();
        if (data.broadcast.status === 'ended') { setPhase('ended'); return; }
        setBroadcastInfo(data.broadcast);
        setPhase('waiting');
      } catch(e) {
        setPhase('error');
        setErrorMsg('Failed to load stream info.');
      }
    }
    loadBroadcast();
  }, [broadcastId]);

  // Poll broadcast status every 15s while joining or watching
  // Catches stream end when creator navigates away without tapping End Stream
  useEffect(function() {
    if (phase !== 'joining' && phase !== 'watching') return;

    pollRef.current = setInterval(async function() {
      try {
        const res = await fetch('/api/live?id=' + broadcastId, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.broadcast && data.broadcast.status === 'ended') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPhase('ended');
          cleanup(false);
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
          type: 'broadcast',
          event: 'viewer-leave',
          payload: { peer_id: peerIdRef.current },
        });
      } catch(e) {}
    }
    if (pcRef.current) { try { pcRef.current.close(); } catch(e) {} pcRef.current = null; }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch(e) {}
      channelRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    icePendingRef.current = [];
  }

  // ── Watch Live — this button tap is the iOS user gesture ──
  async function handleWatch() {
    setPhase('joining');
    setErrorMsg(null);

    // ── iOS autoplay fix ──
    // Call video.play() NOW, synchronously, while still inside the user gesture handler.
    // iOS Safari records this gesture and allows audio playback later when srcObject is set.
    // We use an empty MediaStream so play() has something to work with.
    // Without this, video.play() in ontrack (seconds later) is outside the gesture context
    // and iOS blocks it silently, resulting in black video with no error.
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = new MediaStream();
        videoRef.current.play().catch(function() {});
      } catch(e) {}
    }

    // Join broadcast — get peer ID
    let peerId;
    try {
      const joinRes = await fetch('/api/live/join', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {}),
        },
        body: JSON.stringify({ broadcast_id: broadcastId }),
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        if (joinRes.status === 410) { setPhase('ended'); return; }
        setPhase('error');
        setErrorMsg(joinData.error || 'Failed to join stream.');
        return;
      }
      peerId = joinData.peer.id;
      peerIdRef.current = peerId;
    } catch(e) {
      setPhase('error');
      setErrorMsg('Network error. Please try again.');
      return;
    }

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // When creator's tracks arrive — replace srcObject and play
    // iOS accepts this because play() was already called in the user gesture above
    pc.ontrack = function(event) {
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(function() {});
        setPhase('watching');
      }
    };

    pc.onicecandidate = function(event) {
      if (!event.candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { from: peerIdRef.current, to: 'creator', candidate: event.candidate },
      });
    };

    pc.onconnectionstatechange = function() {
      if (pc.connectionState === 'failed') {
        setPhase('error');
        setErrorMsg('Connection failed. Check your network and try again.');
      }
    };

    // Subscribe to signaling channel, send viewer-join only after SUBSCRIBED
    const channelName = signalChannelName(broadcastId);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'offer' }, async function(msg) {
        if (msg.payload.to !== peerIdRef.current) return;
        await handleOffer(msg.payload.sdp);
      })
      .on('broadcast', { event: 'ice-candidate' }, async function(msg) {
        if (msg.payload.to !== peerIdRef.current) return;
        await handleCreatorIce(msg.payload.candidate);
      })
      .on('broadcast', { event: 'stream-ended' }, function() {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setPhase('ended');
        cleanup(false);
      })
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: { peer_id: peerIdRef.current },
          });
        }
      });

    channelRef.current = channel;
  }

  async function handleOffer(sdp) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const candidate of icePendingRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      }
      icePendingRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: { from_peer_id: peerIdRef.current, to: 'creator', sdp: pc.localDescription },
        });
      }
    } catch(err) {
      console.error('LivePlayer: handleOffer failed', err);
      setPhase('error');
      setErrorMsg('WebRTC handshake failed.');
    }
  }

  async function handleCreatorIce(candidate) {
    const pc = pcRef.current;
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
          <button
            onClick={function() { window.location.reload(); }}
            className="live-btn-watch"
            style={{ maxWidth: 200, marginTop: 24 }}
          >
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
        {/* Video always in DOM so ref is valid when ontrack fires */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
        <button className="live-btn-watch" onClick={handleWatch}>
          ▶  Watch Live
        </button>
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
