// --- WHY THIS CODE EXISTS ---
// Relay engine for Phase 18B+. Every viewer is potentially a relay node.
// Creator → Tier1 → Tier2 → Tier3 → ...
// Each tier relays to the next. Creator's upload stays fixed regardless of viewer count.

// --- WHAT THIS MADE WORK ---
// Phase 18B: Factor-4 relay tree. Tier N viewers relay creator's stream to Tier N+1.
// Phase 18C: handleActivationRequest() — backup parent connects video to a child
//            whose primary parent failed and sent a 'parent-activate' signal.

// --- PITFALLS ---
// ⚠️ WARNING: This is a plain JS class — NOT a React component. No hooks, no JSX.
// ⚠️ WARNING: setChannel() must be called before any child can join.
// ⚠️ WARNING: setRelayStream() must be called when upstream track arrives.
//             handleChildJoin() before setRelayStream() queues in pendingJoins.
// ⚠️ WARNING: Max LIVE_FACTOR (4) children via handleChildJoin.
//             handleActivationRequest() BYPASSES this cap — a failing child needs
//             backup regardless of current child count.
// ⚠️ WARNING: _connectChild() and _connectChildAsBackup() are identical except
//             _connectChildAsBackup sends offer_type:'backup' so LivePlayer knows
//             to route the offer to handleBackupOffer not handleParentOffer.
// ⚠️ WARNING: cleanup() closes all child connections — call on viewer leave.

// --- CHANGE LOG ---
// [Jun 09, 2026] CREATED: Phase 18B — LiveMesh relay engine
// [Jun 10, 2026] UPDATED: Phase 18C — handleActivationRequest() for backup activation
// --- END CHANGE LOG ---

import { ICE_SERVERS, LIVE_FACTOR } from '@/lib/liveConfig';

export default class LiveMeshEngine {
  constructor(myPeerId) {
    this.myPeerId    = myPeerId;
    this.channel     = null;
    this.relayStream = null;
    this.childConns  = new Map();   // childPeerId → RTCPeerConnection
    this.icePending  = new Map();   // childPeerId → RTCIceCandidate[]
    this.pendingJoins = [];         // queued before relayStream was ready
  }

  setChannel(channel) {
    this.channel = channel;
  }

  setRelayStream(stream) {
    this.relayStream = stream;
    var pending = this.pendingJoins.splice(0);
    for (var i = 0; i < pending.length; i++) {
      this.handleChildJoin(pending[i]);
    }
  }

  // Normal child join — respects LIVE_FACTOR cap
  handleChildJoin(childPeerId) {
    if (!this.relayStream) {
      this.pendingJoins.push(childPeerId);
      return;
    }
    if (!this.channel) return;
    if (this.childConns.size >= LIVE_FACTOR) {
      console.warn('LiveMeshEngine: max children reached, ignoring', childPeerId);
      return;
    }
    this._connectChild(childPeerId, false);
  }

  // Phase 18C: backup activation — child's primary parent failed, I am the backup.
  // Bypasses LIVE_FACTOR cap — a peer in failover must be served regardless.
  // Sends offer with offer_type:'backup' so child's LivePlayer routes it correctly.
  handleActivationRequest(childPeerId) {
    if (!this.channel) return;
    if (!this.relayStream) {
      // Stream not ready — queue as normal join (will be served when stream arrives)
      this.pendingJoins.push(childPeerId);
      return;
    }
    this._connectChild(childPeerId, true);
  }

  async _connectChild(childPeerId, isBackup) {
    // Close stale connection if exists
    if (this.childConns.has(childPeerId)) {
      try { this.childConns.get(childPeerId).close(); } catch(e) {}
      this.childConns.delete(childPeerId);
    }

    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.childConns.set(childPeerId, pc);

    var self = this;
    this.relayStream.getTracks().forEach(function(track) {
      pc.addTrack(track, self.relayStream);
    });

    // ICE to child — direction: downstream (parent → child)
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

    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.channel.send({
        type:    'broadcast',
        event:   'offer',
        payload: {
          from:       this.myPeerId,
          to:         childPeerId,
          sdp:        pc.localDescription,
          offer_type: isBackup ? 'backup' : 'primary',
        },
      });
    } catch(err) {
      console.error('LiveMeshEngine: createOffer failed for child', childPeerId, err);
      this.childConns.delete(childPeerId);
    }
  }

  async handleChildAnswer(childPeerId, sdp) {
    var pc = this.childConns.get(childPeerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      var pending = this.icePending.get(childPeerId) || [];
      for (var i = 0; i < pending.length; i++) {
        try { await pc.addIceCandidate(new RTCIceCandidate(pending[i])); } catch(e) {}
      }
      this.icePending.delete(childPeerId);
    } catch(err) {
      console.error('LiveMeshEngine: handleChildAnswer failed', childPeerId, err);
    }
  }

  async handleChildIce(childPeerId, candidate) {
    var pc = this.childConns.get(childPeerId);
    if (!pc) return;
    if (!pc.remoteDescription) {
      var pending = this.icePending.get(childPeerId) || [];
      pending.push(candidate);
      this.icePending.set(childPeerId, pending);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
  }

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
