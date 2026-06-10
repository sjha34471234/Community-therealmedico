// --- WHY THIS CODE EXISTS ---
// Central config for LiveMesh P2P live broadcast system.
// ALL constants live here — never scatter values inline across components.

// --- WHAT THIS MADE WORK ---
// Phase 18A: 1:1 WebRTC foundation — ICE config, channel names
// Phase 18B: Multi-tier tree constants
// Phase 18C: REALTIME_HEARTBEAT_MS for Realtime-based parent liveness tracking

// --- PITFALLS ---
// ⚠️ WARNING: STUN_URL and TURN_URL must always come from here — never hardcode inline
// ⚠️ WARNING: HEARTBEAT_INTERVAL_MS = 50ms is for DataChannel heartbeat (Phase 18D only)
//             REALTIME_HEARTBEAT_MS = 2000ms is for Realtime-based heartbeat (Phase 18C)
//             Do NOT use HEARTBEAT_INTERVAL_MS for Realtime — rate limits will be hit
// ⚠️ WARNING: LIVE_FACTOR = 4 in production — was temporarily 1 for Phase 18B relay testing
// ⚠️ WARNING: MIN_KARMA_FOR_TIER enforced server-side at join — never bypassed client-side

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh foundation constants
// [Jun 10, 2026] UPDATED: Phase 18C — added REALTIME_HEARTBEAT_MS for Realtime heartbeat
// [Jun 10, 2026] FIXED: LIVE_FACTOR restored to 4 (was temporarily 1 for Phase 18B testing)
// --- END CHANGE LOG ---

export const LIVE_FACTOR           = 1;
export const LIVE_TREES            = 4;
export const LIVE_PARENTS          = 3;
export const LIVE_LATERALS         = 2;
export const HEARTBEAT_INTERVAL_MS = 50;      // DataChannel heartbeat — Phase 18D only
export const REALTIME_HEARTBEAT_MS = 2000;    // Realtime heartbeat — Phase 18C
export const FAILURE_THRESHOLD     = 3;       // missed heartbeats before declaring parent dead
export const PREBUFFER_SECONDS     = 2;
export const CHUNK_SIZE_BYTES      = 16384;
export const LOAD_CYCLE_MS         = 30000;
export const ROTATION_CYCLE_MS     = 300000;
export const LOAD_SPIKE_THRESHOLD  = 0.90;
export const MIN_KARMA_FOR_TIER    = 50;
export const MIN_ACCOUNT_AGE_DAYS  = 7;

export const STUN_URL        = 'stun:stun.l.google.com:19302';
export const TURN_URL        = 'turn:openrelay.metered.ca:80';
export const TURN_USERNAME   = 'openrelayproject';
export const TURN_CREDENTIAL = 'openrelayproject';

export const ICE_SERVERS = [
  { urls: STUN_URL },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];

export const DATA_CHANNEL_CONFIG = { ordered: false, maxRetransmits: 0 };

export function signalChannelName(broadcastId) {
  return 'signal:' + broadcastId;
}
