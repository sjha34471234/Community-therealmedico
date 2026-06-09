// --- WHY THIS CODE EXISTS ---
// Relay engine for Phase 18B. Every viewer is potentially a relay node.
// When a peer receives video from its parent (or creator), it forwards
// that stream to its children via their own RTCPeerConnections.
//
// Creator → Tier1 → Tier2 → Tier3 → ...
// Each tier relays to the next. Creator's upload stays fixed regardless of viewer count.

// --- WHAT THIS MADE WORK ---
// Phase 18B: Factor-4 relay tree. Tier 1 viewers relay creator's stream to Tier 2.
//            Tier N viewers relay to Tier N+1. Up to LIVE_FACTOR (4) children per peer.

// --- PITFALLS ---
// ⚠️ WARNING: This is a plain JS class — NOT a React component. No hooks, no JSX.
// ⚠️ WARNING: setChannel() must be called before any child can join.
//             Channel is needed to send offers and ICE to children.
// ⚠️ WARNING: setRelayStream() must be called when upstream track arrives.
//             handleChildJoin() called before setRelayStream() queues the peer in
//             pendingJoins and processes it when setRelayStream() fires.
// ⚠️ WARNING: Max LIVE_FACTOR (4) children — additional joins are ignored.
//             Those viewers will reconnect and be assigned a different parent.
// ⚠️ WARNING: cleanup() closes all child connections — call on viewer leave or page hide.
// ⚠️ WARNING: LivePlayer delegates all channel events to this engine — this class
//             does NOT bind its own channel listeners. LivePlayer calls the public
//             handle* methods directly. This avoids Supabase Realtime binding timing issues.

// --- CHANGE LOG ---
// [Jun 09, 2026] CREATED: Phase 18B — LiveMesh relay engine
// --- END CHANGE LOG ---

import { ICE_SERVERS, LIVE_FACTOR } from '@/lib/liveConfig';

export default class LiveMeshEngine {
  constructor(myPeerId) {
    this.myPeerId   = myPeerId;
    this.channel    = null;         // set via setChannel()
    this.relayStream = null;        // set via setRelayStream()
    this.childConns  = new Map();   // childPeerId → RTCPeerConnection
    this.icePending  = new Map();   // childPeerId → RTCIceCandidate[] (buffered before answer)
    this.pendingJoins = [];         // childPeerIds queued before relayStream was ready
  }

  // ── Called by LivePlayer after subscription is confirmed ──
  setChannel(channel) {
    this.channel = channel;
  }

  // ── Called by LivePlayer when the upstream video track is received ──
  // stream = the MediaStream received from creator or parent peer
  setRelayStream(stream) {
    this.relayStream = stream;
    // Process any viewer-joins that arrived before the stream was ready
    var pending = this.pendingJoins.splice(0);
    for (var i = 0; i < pending.length; i++) {
      this.handleChildJoin(pending[i]);
    }
  }

  // ── Called by LivePlayer when a viewer-join event arrives for this peer as parent ──
  handleChildJoin(childPeerId) {
    if (!this.relayStream) {
      // Stream not ready yet — queue and process when setRelayStream fires
      this.pendingJoins.push(childPeerId);
      return;
    }
    if (!this.channel) return;
    if (this.childConns.size >= LIVE_FACTOR) {
      // Full — this child will reconnect and be reassigned to another parent
      console.warn('LiveMeshEngine: max children reached, ignoring', childPeerId);
      return;
    }
    this._connectChild(childPeerId);
  }

  async _connectChild(childPeerId) {
    // Close stale connection if exists (reconnect case)
    if (this.childConns.has(childPeerId)) {
      try { this.childConns.get(childPeerId).close(); } catch(e) {}
      this.childConns.delete(childPeerId);
    }

    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.childConns.set(childPeerId, pc);

    // Forward relay stream tracks to child
    var self = this;
    this.relayStream.getTracks().forEach(function(track) {
      pc.addTrack(track, self.relayStream);
    });

    // Send ICE candidates to child (direction: downstream = parent → child)
    pc.onicecandidate = function(event) {
      if (!event.candidate || !self.channel) return;
      self.channel.send({
        type:    'broadcast',
        event:   'ice-candidate',
        payload: {
          from:      self.myPeerId,
          to:        childPeerId,
          candidate: event.candidate,
          direction: 'downstream',
        },
      });
    };

    pc.onconnectionstatechange = function() {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        self.childConns.delete(childPeerId);
      }
    };

    // Create and send offer to child
    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.channel.send({
        type:    'broadcast',
        event:   'offer',
        payload: { from: this.myPeerId, to: childPeerId, sdp: pc.localDescription },
      });
    } catch(err) {
      console.error('LiveMeshEngine: createOffer failed for child', childPeerId, err);
      this.childConns.delete(childPeerId);
    }
  }

  // ── Called by LivePlayer when an answer arrives from a child ──
  async handleChildAnswer(childPeerId, sdp) {
    var pc = this.childConns.get(childPeerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      // Flush buffered ICE candidates
      var pending = this.icePending.get(childPeerId) || [];
      for (var i = 0; i < pending.length; i++) {
        try { await pc.addIceCandidate(new RTCIceCandidate(pending[i])); } catch(e) {}
      }
      this.icePending.delete(childPeerId);
    } catch(err) {
      console.error('LiveMeshEngine: handleChildAnswer failed', childPeerId, err);
    }
  }

  // ── Called by LivePlayer when an upstream ICE candidate arrives from a child ──
  async handleChildIce(childPeerId, candidate) {
    var pc = this.childConns.get(childPeerId);
    if (!pc) return;
    if (!pc.remoteDescription) {
      // Buffer until answer is set
      var pending = this.icePending.get(childPeerId) || [];
      pending.push(candidate);
      this.icePending.set(childPeerId, pending);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
  }

  // ── Called by LivePlayer when a child viewer leaves ──
  handleChildLeave(childPeerId) {
    var pc = this.childConns.get(childPeerId);
    if (pc) {
      try { pc.close(); } catch(e) {}
      this.childConns.delete(childPeerId);
    }
  }

  getChildCount() {
    return this.childConns.size;
  }

  cleanup() {
    this.childConns.forEach(function(pc) { try { pc.close(); } catch(e) {} });
    this.childConns.clear();
    this.icePending.clear();
    this.pendingJoins = [];
    this.relayStream  = null;
    this.channel      = null;
  }
}
