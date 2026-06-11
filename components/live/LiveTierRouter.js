// --- WHY THIS CODE EXISTS ---
// Monitors this peer's load and capabilities every LOAD_CYCLE_MS (30s).
// Reports bandwidth (upload + download), battery, network type to /api/live/peers.
// Detects load spikes and sends 'relay-at-capacity' Realtime event.

// --- WHAT THIS MADE WORK ---
// Phase 18D: server always has current capability data per peer
//            load spike detected → new joiners avoid this peer

// --- PITFALLS ---
// ⚠️ WARNING: navigator.connection and navigator.getBattery() are Chrome/Android only
//             Brave blocks them via privacy shields. Safari/iOS does not support them.
//             DO NOT rely on these for bandwidth — use RTCPeerConnection.getStats() instead.
// ⚠️ WARNING: RTCPeerConnection.getStats() is W3C standard — works on Chrome, Safari,
//             Firefox, Brave, Edge — every browser that supports WebRTC.
//             Measures actual video bitrate, more accurate than navigator.connection estimates.
// ⚠️ WARNING: First getStats() call returns 0 bps — no delta to measure yet.
//             Second call 30s later returns real values. This is expected.
// ⚠️ WARNING: pcRef is a React ref — pcRef.current is the live RTCPeerConnection.
//             Always access pcRef.current at call time, never cache the PC object.
// ⚠️ WARNING: start() must be called AFTER channel is subscribed and stream is flowing.
// ⚠️ WARNING: cleanup() must be called on leave — clears the 30s interval.

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18D — capability reporting + load spike detection
// [Jun 10, 2026] UPDATED: Phase 18D — added download_bps tracking
// [Jun 10, 2026] FIXED: replaced navigator.connection with RTCPeerConnection.getStats()
//                REASON: navigator.connection unavailable on Safari/iOS, blocked by Brave
//                privacy shields, and Firefox. getStats() works on all WebRTC browsers
//                and measures actual bitrate rather than estimated capacity.
// --- END CHANGE LOG ---

import { LOAD_CYCLE_MS, LIVE_FACTOR, LOAD_SPIKE_THRESHOLD } from '@/lib/liveConfig';

export default class LiveTierRouter {
  constructor(peerId, pcRef, engineRef) {
    this.peerId    = peerId;
    this.pcRef     = pcRef;       // React ref → RTCPeerConnection for upstream stats
    this.engineRef = engineRef;   // React ref → LiveMeshEngine for child count
    this.channel   = null;
    this.interval  = null;

    // For delta calculation between getStats() calls
    this.lastStatsTime      = 0;
    this.lastBytesReceived  = 0;
    this.lastBytesSent      = 0;
  }

  start(channel) {
    this.channel = channel;
    var self = this;
    // First call immediately — establishes baseline (returns 0 bps on first call, real on second)
    self._reportCapabilities();
    this.interval = setInterval(function() {
      self._reportCapabilities();
    }, LOAD_CYCLE_MS);
  }

  async _reportCapabilities() {
    var bandwidth    = await this._measureBandwidth();
    var batteryInfo  = await this._getBatteryInfo();
    var networkType  = this._getNetworkType();
    var childCount   = this.engineRef && this.engineRef.current
      ? this.engineRef.current.getChildCount()
      : 0;

    try {
      await fetch('/api/live/peers', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peer_id:      this.peerId,
          upload_bps:   bandwidth.upload_bps,
          download_bps: bandwidth.download_bps,
          battery_pct:  batteryInfo.battery_pct,
          network_type: networkType,
        }),
      });
    } catch(e) {}

    // Load spike detection
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

  // Measure actual bitrate using RTCPeerConnection.getStats()
  // Works on Chrome, Safari, Firefox, Brave, Edge — all WebRTC browsers
  // Returns { upload_bps, download_bps } — both 0 on first call (no delta yet)
  async _measureBandwidth() {
    var defaults = { upload_bps: 0, download_bps: 0 };
    try {
      var pc = this.pcRef && this.pcRef.current;
      if (!pc || typeof pc.getStats !== 'function') return defaults;

      var stats = await pc.getStats();
      var bytesReceived = 0;
      var bytesSent     = 0;

      stats.forEach(function(report) {
        // inbound-rtp: bytes this peer received (viewer download from parent/creator)
        if (report.type === 'inbound-rtp' && report.bytesReceived) {
          bytesReceived += report.bytesReceived;
        }
        // outbound-rtp: bytes this peer sent (relay upload to children)
        if (report.type === 'outbound-rtp' && report.bytesSent) {
          bytesSent += report.bytesSent;
        }
      });

      var now     = Date.now();
      var elapsed = this.lastStatsTime > 0 ? (now - this.lastStatsTime) / 1000 : 0;

      // Delta / elapsed = bits per second
      var download_bps = (elapsed > 0 && bytesReceived >= this.lastBytesReceived)
        ? Math.round((bytesReceived - this.lastBytesReceived) * 8 / elapsed) : 0;
      var upload_bps = (elapsed > 0 && bytesSent >= this.lastBytesSent)
        ? Math.round((bytesSent - this.lastBytesSent) * 8 / elapsed) : 0;

      // Store for next delta calculation
      this.lastStatsTime     = now;
      this.lastBytesReceived = bytesReceived;
      this.lastBytesSent     = bytesSent;

      return { download_bps, upload_bps };
    } catch(e) {
      return defaults;
    }
  }

  // Best-effort network type — Chrome/Android only, 'unknown' everywhere else
  // Not critical — used only as a soft signal for tier assignment scoring
  _getNetworkType() {
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!conn) return 'unknown';
      if (conn.type === 'wifi') return 'wifi';
      if (conn.effectiveType === '4g') return '4g';
      if (conn.effectiveType === '3g') return '3g';
      return 'unknown';
    } catch(e) {
      return 'unknown';
    }
  }

  // Best-effort battery — Chrome/Android only, defaults to 100 everywhere else
  // Brave may block this via privacy shields — try/catch handles it silently
  async _getBatteryInfo() {
    try {
      if (!navigator.getBattery) return { battery_pct: 100 };
      var battery = await navigator.getBattery();
      return { battery_pct: Math.round(battery.level * 100) };
    } catch(e) {
      return { battery_pct: 100 };
    }
  }

  cleanup() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.channel            = null;
    this.lastStatsTime      = 0;
    this.lastBytesReceived  = 0;
    this.lastBytesSent      = 0;
  }
}
