// --- WHY THIS CODE EXISTS ---
// Monitors this peer's load and capabilities every LOAD_CYCLE_MS (30s).
// Reports bandwidth, battery, network type to /api/live/peers so the server
// has fresh data for future tier rebalancing decisions.
// Detects load spikes: when child count >= LOAD_SPIKE_THRESHOLD × LIVE_FACTOR,
// sends 'relay-at-capacity' Realtime event so the join server can skip this peer.

// --- WHAT THIS MADE WORK ---
// Phase 18D: server always has current capability data per peer
//            load spike detected → new joiners avoid this peer within 30s

// --- PITFALLS ---
// ⚠️ WARNING: navigator.connection is Chrome/Android only — Safari returns undefined
//             Fall back to conservative defaults on unsupported browsers
// ⚠️ WARNING: navigator.getBattery() is Chrome/Android only — try/catch required
// ⚠️ WARNING: PATCH /api/live/peers uses peer_id as the secret — no auth header needed
// ⚠️ WARNING: start() must be called AFTER channel is subscribed
// ⚠️ WARNING: cleanup() must be called on leave — clears the 30s interval

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18D — capability reporting + load spike detection
// --- END CHANGE LOG ---

import { LOAD_CYCLE_MS, LIVE_FACTOR, LOAD_SPIKE_THRESHOLD } from '@/lib/liveConfig';

export default class LiveTierRouter {
  constructor(peerId, engineRef) {
    this.peerId    = peerId;
    this.engineRef = engineRef;   // ref to LiveMeshEngine — read child count from it
    this.channel   = null;
    this.interval  = null;
  }

  start(channel) {
    this.channel = channel;
    var self = this;
    // Report immediately on start, then every LOAD_CYCLE_MS
    self._reportCapabilities();
    this.interval = setInterval(function() {
      self._reportCapabilities();
    }, LOAD_CYCLE_MS);
  }

  async _reportCapabilities() {
    var networkInfo = this._getNetworkInfo();
    var batteryInfo = await this._getBatteryInfo();
    var childCount  = this.engineRef && this.engineRef.current
      ? this.engineRef.current.getChildCount()
      : 0;

    // PATCH capabilities to server — peer_id is the unguessable identifier
    try {
      await fetch('/api/live/peers', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peer_id:      this.peerId,
          upload_bps:   networkInfo.upload_bps,
          battery_pct:  batteryInfo.battery_pct,
          network_type: networkInfo.network_type,
        }),
      });
    } catch(e) {}

    // Load spike detection — send Realtime event if at or over threshold
    var capacityFraction = childCount / LIVE_FACTOR;
    if (capacityFraction >= LOAD_SPIKE_THRESHOLD && this.channel) {
      try {
        this.channel.send({
          type:    'broadcast',
          event:   'relay-at-capacity',
          payload: { peer_id: this.peerId, child_count: childCount },
        });
      } catch(e) {}
    }
  }

  _getNetworkInfo() {
    var defaults = { upload_bps: 0, network_type: 'unknown' };
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!conn) return defaults;
      // downlink is in Mbps — convert to bps
      var upload_bps   = conn.downlink ? Math.round(conn.downlink * 1000000 * 0.6) : 0;
      var network_type = conn.effectiveType === '4g' ? '4g'
        : conn.effectiveType === '3g' ? '3g'
        : conn.type === 'wifi' ? 'wifi'
        : 'unknown';
      return { upload_bps, network_type };
    } catch(e) {
      return defaults;
    }
  }

  async _getBatteryInfo() {
    var defaults = { battery_pct: 100 };
    try {
      if (!navigator.getBattery) return defaults;
      var battery = await navigator.getBattery();
      return { battery_pct: Math.round(battery.level * 100) };
    } catch(e) {
      return defaults;
    }
  }

  cleanup() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.channel = null;
  }
}
