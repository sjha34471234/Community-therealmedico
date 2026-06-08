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
// ⚠️ WARNING: getUserMedia requires HTTPS — works on Vercel (always HTTPS), not localhost
// ⚠️ WARNING: iOS Safari — getUserMedia pauses when user switches apps — warning shown always
// ⚠️ WARNING: preview video MUST be muted — prevents echo on creator's own audio
// ⚠️ WARNING: playsInline required on ALL video elements — without it iOS Safari goes fullscreen
// ⚠️ WARNING: peerConnsRef is a Map (viewerPeerId → RTCPeerConnection) — ready for Phase 18B multi-viewer
// ⚠️ WARNING: ICE candidates from a viewer may arrive before the answer is set — buffered in icePendingRef
// ⚠️ WARNING: cleanup() must stop all tracks, close all PCs, unsubscribe channel — called on unmount and on End Stream
// ⚠️ WARNING: Realtime channel config { broadcast: { self: false } } — creator must not receive its own events
// ⚠️ WARNING: window.location.origin only accessed in browser — safe in 'use client' component

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh creator component
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import supabase from '@/lib/supabase';
import { ICE_SERVERS, signalChannelName } from '@/lib/liveConfig';

export default function LiveCreator() {
  const { user, accessToken } = useAuthStore();

  const [phase, setPhase]           = useState('setup');  // 'setup' | 'live' | 'ended'
  const [title, setTitle]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [copied, setCopied]         = useState(false);

  const previewVideoRef = useRef(null);
  const localStreamRef  = useRef(null);
  const broadcastRef    = useRef(null);
  const channelRef      = useRef(null);
  const peerConnsRef    = useRef(new Map());  // viewerPeerId → RTCPeerConnection
  const icePendingRef   = useRef(new Map());  // viewerPeerId → RTCIceCandidate[]

  // Cleanup on unmount
  useEffect(function() {
    return function() { cleanup(); };
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

    // 1. Camera + mic — must be first (user gesture unlocks getUserMedia on iOS)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (mediaErr) {
      setError('Camera access denied. Please allow camera and microphone in your browser settings.');
      setLoading(false);
      return;
    }

    localStreamRef.current = stream;
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = stream;
      previewVideoRef.current.play().catch(function() {});
    }

    // 2. Create broadcast in DB
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

    // 3. Subscribe to Realtime signaling channel
    subscribeToSignaling(broadcast.id);

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

  // ── New viewer joined → create offer ──
  async function handleViewerJoin(viewerPeerId) {
    if (!localStreamRef.current || !channelRef.current) return;

    // Close any stale connection for this viewer (reconnect case)
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

    // Relay ICE candidates to this viewer
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

  // ── Received answer from a viewer ──
  async function handleAnswer(viewerPeerId, sdp) {
    const pc = peerConnsRef.current.get(viewerPeerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      // Flush any ICE candidates that arrived before the answer
      const pending = icePendingRef.current.get(viewerPeerId) || [];
      for (const candidate of pending) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      }
      icePendingRef.current.delete(viewerPeerId);
    } catch(err) {
      console.error('LiveCreator: setRemoteDescription failed', err);
    }
  }

  // ── Received ICE candidate from a viewer ──
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

  // ── Viewer left ──
  function handleViewerLeave(viewerPeerId) {
    const pc = peerConnsRef.current.get(viewerPeerId);
    if (pc) {
      try { pc.close(); } catch(e) {}
      peerConnsRef.current.delete(viewerPeerId);
      refreshViewerCount();
    }
  }

  // ── End stream ──
  async function handleEndStream() {
    if (!broadcastRef.current || !accessToken) return;
    setLoading(true);

    // Notify all viewers the stream is over
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
        <video ref={previewVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
