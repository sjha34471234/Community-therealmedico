// --- WHY THIS CODE EXISTS ---
// Creator-side Phase 18A component. Full signaling flow:
// 1. POST /api/live → create broadcast, get broadcastId
// 2. getUserMedia → camera + mic
// 3. Subscribe to Supabase Realtime broadcast channel for signaling
// 4. When viewer sends 'viewer-join' event:
//    → Create RTCPeerConnection for that viewer
//    → Add local tracks → createOffer → send offer via Realtime
// 5. Handle 'answer' from viewer → setRemoteDescription
// 6. Handle 'ice-candidate' from viewer → addIceCandidate (with buffering)
// 7. PATCH /api/live on End Stream → notify viewers → cleanup

// --- WHAT THIS MADE WORK ---
// Phase 18A: creator goes live, viewers can connect and receive video

// --- PITFALLS ---
// ⚠️ WARNING: getUserMedia requires HTTPS — works on Vercel, not localhost
// ⚠️ WARNING: iOS Safari — getUserMedia pauses when user switches apps — warning shown always
// ⚠️ WARNING: preview video MUST be muted — prevents echo on creator's own audio
// ⚠️ WARNING: playsInline required on ALL video elements — iOS Safari goes fullscreen without it
// ⚠️ WARNING: DO NOT use useEffect([phase]) to set srcObject — unreliable on Android Chrome
//             Use a callback ref on the video element instead — sets srcObject synchronously
//             the instant React creates the DOM node, no timing dependency
// ⚠️ WARNING: peerConnsRef is a Map (viewerPeerId → RTCPeerConnection) — ready for Phase 18B
// ⚠️ WARNING: ICE candidates from a viewer may arrive before answer is set — buffered in icePendingRef
// ⚠️ WARNING: cleanup() stops all tracks, closes all PCs, unsubscribes channel
// ⚠️ WARNING: pagehide sendBeacon fires when creator navigates away — ends broadcast in DB
//             sendBeacon uses stream_key as secret (no auth header support)
// ⚠️ WARNING: Realtime channel config { broadcast: { self: false } } — creator must not receive own events

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh creator component
// [Jun 08, 2026] FIXED: Black preview — original approach used useEffect([phase]) which ran
//                after React paint but before Android Chrome reliably accepted srcObject.
//                Replaced with callback ref that sets srcObject synchronously on DOM creation.
// [Jun 08, 2026] FIXED: Stream not ending for viewers — added pagehide sendBeacon to
//                /api/live/beacon. Realtime channel closes before stream-ended event sends
//                when creator navigates away without tapping End Stream.
// [Jun 09, 2026] FIXED: Creator preview still black on Android Chrome — removed useEffect([phase])
//                entirely. Callback ref on video element sets srcObject the instant React
//                creates the DOM node. More reliable than any useEffect timing approach.
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import supabase from '@/lib/supabase';
import { ICE_SERVERS, signalChannelName } from '@/lib/liveConfig';

export default function LiveCreator() {
  const { user, accessToken } = useAuthStore();

  const [phase, setPhase]             = useState('setup');
  const [title, setTitle]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [copied, setCopied]           = useState(false);

  const previewVideoRef = useRef(null);
  const localStreamRef  = useRef(null);
  const broadcastRef    = useRef(null);
  const channelRef      = useRef(null);
  const peerConnsRef    = useRef(new Map());
  const icePendingRef   = useRef(new Map());

  // ── Unmount cleanup ──
  useEffect(function() {
    return function() { cleanup(); };
  }, []);

  // ── pagehide beacon — fires when creator navigates away or closes tab ──
  // sendBeacon is the only reliable send during page unload.
  // Registered once on mount — broadcastRef is a ref so always has latest value.
  useEffect(function() {
    function onPageHide() {
      if (broadcastRef.current) {
        try {
          navigator.sendBeacon('/api/live/beacon', JSON.stringify({
            broadcast_id: broadcastRef.current.id,
            stream_key:   broadcastRef.current.stream_key,
          }));
        } catch(e) {}
      }
    }
    window.addEventListener('pagehide', onPageHide);
    return function() { window.removeEventListener('pagehide', onPageHide); };
  }, []);

  function cleanup() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(function(t) { try { t.stop(); } catch(e) {} });
      localStreamRef.current = null;
    }
    peerConnsRef.current.forEach(function(pc) { try { pc.close(); } catch(e) {} });
    peerConnsRef.current.clear();
    icePendingRef.current.clear();
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch(e) {}
      channelRef.current = null;
    }
  }

  function refreshViewerCount() {
    let count = 0;
    peerConnsRef.current.forEach(function(pc) {
      if (pc.connectionState === 'connected') count++;
    });
    setViewerCount(count);
  }

  // ── Go Live ──
  async function handleGoLive() {
    if (!user || !accessToken) {
      setError('You must be logged in to go live.');
      return;
    }
    setLoading(true);
    setError(null);

    // Camera + mic must be first — user gesture unlocks getUserMedia on iOS
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch(mediaErr) {
      setError('Camera access denied. Please allow camera and microphone in your browser settings.');
      setLoading(false);
      return;
    }

    localStreamRef.current = stream;
    // DO NOT set previewVideoRef.current.srcObject here.
    // The video element is in the 'live' phase render — not yet in the DOM.
    // The callback ref on the video element handles this synchronously when it mounts.

    // Create broadcast in DB
    let broadcast;
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ title: title.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start broadcast');
        cleanup();
        setLoading(false);
        return;
      }
      broadcast = data.broadcast;
    } catch(e) {
      setError('Network error. Please try again.');
      cleanup();
      setLoading(false);
      return;
    }

    broadcastRef.current = broadcast;
    subscribeToSignaling(broadcast.id);

    // setPhase triggers React to mount the live-phase video element.
    // The callback ref on that element sets srcObject synchronously on mount.
    setPhase('live');
    setLoading(false);
  }

  function subscribeToSignaling(broadcastId) {
    const channelName = signalChannelName(broadcastId);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'viewer-join' }, function(msg) {
        handleViewerJoin(msg.payload.peer_id);
      })
      .on('broadcast', { event: 'answer' }, function(msg) {
        if (msg.payload.to === 'creator') {
          handleAnswer(msg.payload.from_peer_id, msg.payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, function(msg) {
        if (msg.payload.to === 'creator') {
          handleViewerIce(msg.payload.from_peer_id, msg.payload.candidate);
        }
      })
      .on('broadcast', { event: 'viewer-leave' }, function(msg) {
        handleViewerLeave(msg.payload.peer_id);
      })
      .subscribe();

    channelRef.current = channel;
  }

  async function handleViewerJoin(viewerPeerId) {
    if (!localStreamRef.current || !channelRef.current) return;

    // Close stale connection for this viewer (reconnect case)
    if (peerConnsRef.current.has(viewerPeerId)) {
      try { peerConnsRef.current.get(viewerPeerId).close(); } catch(e) {}
      peerConnsRef.current.delete(viewerPeerId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnsRef.current.set(viewerPeerId, pc);

    // Add all local tracks to this peer connection
    localStreamRef.current.getTracks().forEach(function(track) {
      pc.addTrack(track, localStreamRef.current);
    });

    // Relay our ICE candidates to this viewer
    pc.onicecandidate = function(event) {
      if (!event.candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { from: 'creator', to: viewerPeerId, candidate: event.candidate },
      });
    };

    pc.onconnectionstatechange = function() {
      refreshViewerCount();
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnsRef.current.delete(viewerPeerId);
      }
    };

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: { from: 'creator', to: viewerPeerId, sdp: pc.localDescription },
      });
    } catch(err) {
      console.error('LiveCreator: createOffer failed', err);
    }
  }

  async function handleAnswer(viewerPeerId, sdp) {
    const pc = peerConnsRef.current.get(viewerPeerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      // Flush ICE candidates that arrived before the answer
      const pending = icePendingRef.current.get(viewerPeerId) || [];
      for (const candidate of pending) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      }
      icePendingRef.current.delete(viewerPeerId);
    } catch(err) {
      console.error('LiveCreator: setRemoteDescription failed', err);
    }
  }

  async function handleViewerIce(viewerPeerId, candidate) {
    const pc = peerConnsRef.current.get(viewerPeerId);
    if (!pc) return;
    // Buffer if remote description not yet set
    if (!pc.remoteDescription) {
      const pending = icePendingRef.current.get(viewerPeerId) || [];
      pending.push(candidate);
      icePendingRef.current.set(viewerPeerId, pending);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
  }

  function handleViewerLeave(viewerPeerId) {
    const pc = peerConnsRef.current.get(viewerPeerId);
    if (pc) {
      try { pc.close(); } catch(e) {}
      peerConnsRef.current.delete(viewerPeerId);
      refreshViewerCount();
    }
  }

  async function handleEndStream() {
    if (!broadcastRef.current || !accessToken) return;
    setLoading(true);

    // Notify all viewers stream is over via Realtime
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stream-ended',
          payload: { broadcast_id: broadcastRef.current.id },
        });
      } catch(e) {}
    }

    // Mark broadcast ended in DB
    await fetch('/api/live', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
      },
      body: JSON.stringify({ broadcast_id: broadcastRef.current.id }),
    }).catch(function() {});

    cleanup();
    setPhase('ended');
    setLoading(false);
  }

  function handleCopy() {
    if (!broadcastRef.current) return;
    const link = window.location.origin + '/live/' + broadcastRef.current.id;
    navigator.clipboard.writeText(link).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  // ── Render ──

  if (phase === 'ended') {
    return (
      <div className="live-page">
        <div style={{ marginTop: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: '#fff' }}>Stream ended</div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>Thanks for going live.</div>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="live-page">
        <div className="live-setup">
          <div className="live-setup-title">Go Live</div>
          <div className="live-ios-warning">
            ⚠️ Keep this tab open while streaming. Switching apps on iPhone/iPad pauses your camera.
          </div>
          <input
            className="live-setup-input"
            type="text"
            placeholder="Stream title (optional)"
            value={title}
            onChange={function(e) { setTitle(e.target.value); }}
            maxLength={100}
          />
          {error && (
            <div style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{error}</div>
          )}
          <button className="live-btn-start" onClick={handleGoLive} disabled={loading}>
            {loading ? 'Starting...' : '🔴  Go Live'}
          </button>
        </div>
      </div>
    );
  }

  // phase === 'live'
  const streamLink = (typeof window !== 'undefined' && broadcastRef.current)
    ? window.location.origin + '/live/' + broadcastRef.current.id
    : '';

  return (
    <div className="live-page">
      <div className="live-stage">
        <video
          ref={function(el) {
            // Callback ref — sets srcObject the instant React creates this DOM element.
            // More reliable than useEffect([phase]) on Android Chrome where the timing
            // between newly-mounted elements and useEffect execution is not guaranteed.
            // This fires synchronously during React's commit phase, before paint.
            previewVideoRef.current = el;
            if (el && localStreamRef.current) {
              el.srcObject = localStreamRef.current;
              el.play().catch(function() {});
            }
          }}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="live-badge">LIVE</div>
        <div className="live-viewer-count">👁 {viewerCount}</div>
      </div>

      <div className="live-preview-label">Your camera preview — muted for you, audio on for viewers</div>

      <div className="live-share-row">
        <div className="live-share-link">{streamLink}</div>
        <button className="live-btn-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff5252', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</div>
      )}

      <div className="live-controls-bar">
        <button className="live-btn-end" onClick={handleEndStream} disabled={loading}>
          {loading ? 'Ending...' : 'End Stream'}
        </button>
      </div>
    </div>
  );
}
