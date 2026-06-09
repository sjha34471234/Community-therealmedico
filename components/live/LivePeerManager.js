// --- WHY THIS CODE EXISTS ---
// Manages parent liveness tracking and failover for a viewer's upstream connection.
// Phase 18C:
//   1. Sends heartbeat pings (as a relay, so MY children know I'm alive)
//   2. Watches for heartbeat pings from MY parent
//   3. Detects failure via missed pings OR RTCPeerConnection 'failed' state
//   4. On failure: sends 'parent-activate' Realtime signal, fires onPrimaryFailed callback

// --- WHAT THIS MADE WORK ---
// Phase 18C: relay parent failure → backup parent activates → video continues

// --- PITFALLS ---
// ⚠️ WARNING: Only watches for pings if backupParentId is non-null
//             Tier 1 peers connect to creator — no relay backup is possible
//             If creator fails, stream ends — no point watching for its heartbeat
// ⚠️ WARNING: failoverFired flag prevents double-activation
//             Both pc.connectionState==='failed' AND missed pings can fire together
//             Without this flag, two parent-activate signals would be sent
// ⚠️ WARNING: REALTIME_HEARTBEAT_MS (2s) used here, NOT HEARTBEAT_INTERVAL_MS (50ms)
//             50ms via Realtime would hit rate limits and cause false positives
// ⚠️ WARNING: watchdog uses REALTIME_HEARTBEAT_MS + 500ms buffer for Realtime latency
// ⚠️ WARNING: startPinging() broadcasts to ALL peers on channel
//             Children filter by checking payload.from === their parentPeerId
// ⚠️ WARNING: cleanup() MUST be called on leave — stops all intervals and timers

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18C — heartbeat monitoring + relay failover
// --- END CHANGE LOG ---

import { REALTIME_HEARTBEAT_MS, FAILURE_THRESHOLD } from '@/lib/liveConfig';

export default class LivePeerManager {
  constructor(myPeerId, parentPeerId, backupParentId) {
    this.myPeerId       = myPeerId;
    this.parentPeerId   = parentPeerId;     // 'creator' or UUID of primary parent
    this.backupParentId = backupParentId;   // UUID of backup parent, or null
    this.channel        = null;
    this.onPrimaryFailed = null;            // callback(backupParentId)

    this.watchdogTimer  = null;
    this.pingInterval   = null;
    this.missedPings    = 0;
    this.watching       = false;
    this.failoverFired  = false;            // prevents double-activation
  }

  setChannel(channel) {
    this.channel = channel;
  }

  setOnPrimaryFailed(callback) {
    this.onPrimaryFailed = callback;
  }

  // Start watching for pings from parent.
  // Call when video is flowing — no point watching before that.
  // Does nothing if backupParentId is null — no backup to activate.
  startWatching() {
    if (this.watching) return;
    if (!this.backupParentId) return;
    this.watching = true;
    this.missedPings = 0;
    this._scheduleWatchdog();
  }

  // Start sending pings so my children know I'm alive as a relay.
  // Call when setRelayStream fires — I am now actively relaying.
  startPinging() {
    if (this.pingInterval) return;
    var self = this;
    this.pingInterval = setInterval(function() {
      if (!self.channel) return;
      try {
        self.channel.send({
          type: 'broadcast',
          event: 'heartbeat-ping',
          payload: { from: self.myPeerId },
        });
      } catch(e) {}
    }, REALTIME_HEARTBEAT_MS);
  }

  // Called by LivePlayer when a heartbeat-ping event arrives from parent.
  // Resets the watchdog — parent confirmed alive.
  onPingReceived(fromPeerId) {
    if (fromPeerId !== this.parentPeerId) return;
    if (!this.watching) return;
    this.missedPings = 0;
    if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = null; }
    this._scheduleWatchdog();
  }

  // Called by LivePlayer when RTCPeerConnection.connectionState changes.
  // 'failed' triggers immediate failover — faster than waiting for 3 missed pings.
  onConnectionStateChange(state) {
    if (state === 'failed') {
      this._declareFailed();
    }
  }

  _scheduleWatchdog() {
    if (!this.watching) return;
    var self = this;
    // +500ms buffer over REALTIME_HEARTBEAT_MS to absorb Realtime delivery latency
    this.watchdogTimer = setTimeout(function() {
      self.missedPings++;
      if (self.missedPings >= FAILURE_THRESHOLD) {
        self._declareFailed();
      } else {
        self._scheduleWatchdog();
      }
    }, REALTIME_HEARTBEAT_MS + 500);
  }

  _declareFailed() {
    if (this.failoverFired) return;
    this.failoverFired = true;
    this.watching = false;
    if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = null; }

    // Signal backup parent to send video to us
    if (this.backupParentId && this.channel) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'parent-activate',
          payload: {
            peer_id:          this.myPeerId,
            activate_peer_id: this.backupParentId,
          },
        });
      } catch(e) {}
    }

    if (this.onPrimaryFailed) this.onPrimaryFailed(this.backupParentId);
  }

  cleanup() {
    this.watching      = false;
    this.failoverFired = false;
    if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = null; }
    if (this.pingInterval)  { clearInterval(this.pingInterval); this.pingInterval = null; }
    this.channel         = null;
    this.onPrimaryFailed = null;
  }
}
