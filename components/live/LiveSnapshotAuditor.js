// --- WHY THIS CODE EXISTS ---
// Silent snapshot capture for mod reports.
// When a viewer taps "Report Stream", this captures the current video frame
// at reduced resolution and sends it to /api/live/snapshot for mod review.
// The viewer sees no interruption — fully silent capture.

// --- WHAT THIS MADE WORK ---
// Phase 18D: mod team receives a video frame alongside stream reports
//            Snapshot stored in live_snapshots table for review

// --- PITFALLS ---
// ⚠️ WARNING: captureFrame must be called while video is actively playing
//             Returns null if video element has no data (readyState < 2)
// ⚠️ WARNING: Canvas is resized to max 320px wide to keep payload small
//             A 320×240 JPEG at 60% is ~20-30KB base64 — safe for DB TEXT storage
// ⚠️ WARNING: report() is fire-and-forget — never throws, never blocks UI
// ⚠️ WARNING: cooldown prevents spam — one report per 30 seconds per auditor instance

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18D — silent snapshot capture on mod report
// --- END CHANGE LOG ---

export default class LiveSnapshotAuditor {
  constructor() {
    this.lastReportTime = 0;
    this.COOLDOWN_MS    = 30000;  // 30s between reports
  }

  // Capture current video frame at reduced resolution.
  // Returns base64 JPEG data URL, or null on failure.
  captureFrame(videoElement) {
    try {
      if (!videoElement) return null;
      if (videoElement.readyState < 2) return null;     // no video data yet
      if (videoElement.videoWidth === 0) return null;   // video not rendering

      var canvas  = document.createElement('canvas');
      var maxW    = 320;
      var ratio   = videoElement.videoHeight / videoElement.videoWidth;
      canvas.width  = maxW;
      canvas.height = Math.round(maxW * ratio);

      var ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // JPEG at 60% quality — small payload, readable for mods
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch(e) {
      console.error('LiveSnapshotAuditor: captureFrame failed', e);
      return null;
    }
  }

  // Silently capture and report. Fire-and-forget — never throws.
  async report(broadcastId, peerId, videoElement, reason) {
    var now = Date.now();
    if (now - this.lastReportTime < this.COOLDOWN_MS) return;
    this.lastReportTime = now;

    var snapshotData = this.captureFrame(videoElement);

    try {
      await fetch('/api/live/snapshot', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast_id:  broadcastId,
          peer_id:       peerId,
          snapshot_data: snapshotData || '',
          reason:        reason || 'viewer_report',
        }),
      });
    } catch(e) {
      // Silent — never interrupt the viewer experience
    }
  }
}
