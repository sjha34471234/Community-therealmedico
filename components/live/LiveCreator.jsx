// --- WHY THIS CODE EXISTS ---
// Creator-side component. Phase 18B: only directly connects to Tier 1 viewers.
// Higher-tier viewers are handled by relay peers — creator never sees them.

// --- WHAT THIS MADE WORK ---
// Phase 18A: creator streams directly to all viewers
// Phase 18B: creator only connects to Tier 1 peers (max LIVE_FACTOR per tree × 4 trees = 16)
//            All higher-tier relaying happens peer-to-peer without creator involvement.

// --- PITFALLS ---
// ⚠️ WARNING: viewer-join handler MUST check parent_peer_id === 'creator'
//             Without this, creator responds to ALL viewer-joins including Tier 2+ ones
//             that should be handled by their relay parent.
// ⚠️ WARNING: ICE to viewers uses direction: 'downstream' (creator → child)
//             LivePlayer only processes ICE with direction === 'downstream'
// ⚠️ WARNING: answer handler checks payload.to === 'creator' — unchanged from 18A
// ⚠️ WARNING: preview video uses callback ref — not useEffect — for Android Chrome reliability
// ⚠️ WARNING: pagehide sendBeacon ends broadcast in DB when creator navigates away

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A
// [Jun 08, 2026] FIXED: Black preview — callback ref on video element
// [Jun 08, 2026] FIXED: Stream end — pagehide sendBeacon to /api/live/beacon
// [Jun 09, 2026] UPDATED: Phase 18B — filter viewer-join to parent_peer_id === 'creator' only
//                Added direction: 'downstream' to outgoing ICE sends
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
  const peerConnsRef    = useRef(new Map());  // viewerPeerId → RTCPeerConnection
  const icePendingRef   = useRef(new Map());  // viewerPeerId → RTCIceCandidate[]

  // Unmount cleanup
  useEffect(function() {
    return function() { cleanup(); };
  }, []);

  // pagehide beacon — fires when creator navigates away or closes tab
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
    var count = 0;
    peerConnsRef.current.forEach(function(pc) {
      if (pc.connectionState === 'connected') count++;
    });
    setViewerCount(count);
  }

  async function handleGoLive() {
    if (!user || !accessToken) { setError('You must be logged in to go live.'); return; }
    setLoading(true);
    setError(null);

    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch(e) {
      setError('Camera access denied. Please allow camera and microphone in your browser settings.');
      setLoading(false);
      return;
    }

    localStreamRef.current = stream;

    var broadcast;
    try {
      var res = await fetch('/api/live', {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ title: title.trim() || null }),
      });
      var data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start broadcast');
        cleanup(); setLoading(false); return;
      }
      broadcast = data.broadcast;
    } catch(e) {
      setError('Network error. Please try again.');
      cleanup(); setLoading(false); return;
    }

    broadcastRef.current = broadcast;
    subscribeToSignaling(broadcast.id);
    setPhase('live');
    setLoading(false);
  }

  function subscribeToSignaling(broadcastId) {
    var channel = supabase.channel(signalChannelName(broadcastId), {
      config: { broadcast: { self: false } },
    });

    channel
      // Phase 18B: ONLY respond to viewer-joins where parent is creator (Tier 1 only)
      // Tier 2+ viewers are handled by their relay parent — not creator's concern
      .on('broadcast', { event: 'viewer-join' }, function(msg) {
        if (msg.payload.parent_peer_id !== 'creator') return;
        handleViewerJoin(msg.payload.peer_id);
      })
      .on('broadcast', { event: 'answer' }, function(msg) {
        if (msg.payload.to === 'creator') {
          handleAnswer(msg.payload.from_peer_id, msg.payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, function(msg) {
        // Only process upstream ICE (from viewer/child to creator)
        if (msg.payload.to === 'creator' && msg.payload.direction === 'upstream') {
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

    if (peerConnsRef.current.has(viewerPeerId)) {
      try { peerConnsRef.current.get(viewerPeerId).close(); } catch(e) {}
      peerConnsRef.current.delete(viewerPeerId);
    }

    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnsRef.current.set(viewerPeerId, pc);

    localStreamRef.current.getTracks().forEach(function(track) {
      pc.addTrack(track, localStreamRef.current);
    });

    // ICE to viewer — direction: 'downstream' (creator → child)
    pc.onicecandidate = function(event) {
      if (!event.candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast', event: 'ice-candidate',
        payload: {
          from:      'creator',
          to:        viewerPeerId,
          candidate: event.candidate,
          direction: 'downstream',
        },
      });
    };

    pc.onconnectionstatechange = function() {
      refreshViewerCount();
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnsRef.current.delete(viewerPeerId);
      }
    };

    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current.send({
        type: 'broadcast', event: 'offer',
        payload: { from: 'creator', to: viewerPeerId, sdp: pc.localDescription },
      });
    } catch(err) {
      console.error('LiveCreator: createOffer failed', err);
    }
  }

  async function handleAnswer(viewerPeerId, sdp) {
    var pc = peerConnsRef.current.get(viewerPeerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      var pending = icePendingRef.current.get(viewerPeerId) || [];
      for (var i = 0; i < pending.length; i++) {
        try { await pc.addIceCandidate(new RTCIceCandidate(pending[i])); } catch(e) {}
      }
      icePendingRef.current.delete(viewerPeerId);
    } catch(err) {
      console.error('LiveCreator: setRemoteDescription failed', err);
    }
  }

  async function handleViewerIce(viewerPeerId, candidate) {
    var pc = peerConnsRef.current.get(viewerPeerId);
    if (!pc) return;
    if (!pc.remoteDescription) {
      var pending = icePendingRef.current.get(viewerPeerId) || [];
      pending.push(candidate);
      icePendingRef.current.set(viewerPeerId, pending);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
  }

  function handleViewerLeave(viewerPeerId) {
    var pc = peerConnsRef.current.get(viewerPeerId);
    if (pc) {
      try { pc.close(); } catch(e) {}
      peerConnsRef.current.delete(viewerPeerId);
      refreshViewerCount();
    }
  }

  async function handleEndStream() {
    if (!broadcastRef.current || !accessToken) return;
    setLoading(true);
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast', event: 'stream-ended',
          payload: { broadcast_id: broadcastRef.current.id },
        });
      } catch(e) {}
    }
    await fetch('/api/live', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ broadcast_id: broadcastRef.current.id }),
    }).catch(function() {});
    cleanup();
    setPhase('ended');
    setLoading(false);
  }

  function handleCopy() {
    if (!broadcastRef.current) return;
    var link = window.location.origin + '/live/' + broadcastRef.current.id;
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
          {error && <div style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          <button className="live-btn-start" onClick={handleGoLive} disabled={loading}>
            {loading ? 'Starting...' : '🔴  Go Live'}
          </button>
        </div>
      </div>
    );
  }

  // phase === 'live'
  var streamLink = (typeof window !== 'undefined' && broadcastRef.current)
    ? window.location.origin + '/live/' + broadcastRef.current.id
    : '';

  return (
    <div className="live-page">
      <div className="live-stage">
        <video
          ref={function(el) {
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

      {error && <div style={{ color: '#ff5252', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</div>}

      <div className="live-controls-bar">
        <button className="live-btn-end" onClick={handleEndStream} disabled={loading}>
          {loading ? 'Ending...' : 'End Stream'}
        </button>
      </div>
    </div>
  );
}
