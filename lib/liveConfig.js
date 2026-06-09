// --- WHY THIS CODE EXISTS ---
// Central config for LiveMesh P2P live broadcast system.
// ALL constants live here — never scatter values inline across components.
// Changing any single value here propagates correctly across the entire system.

// --- WHAT THIS MADE WORK ---
// Phase 18A: 1:1 WebRTC foundation — ICE config, channel names
// Phase 18B+: Multi-tier tree, heartbeat, failover constants ready

// --- PITFALLS ---
// ⚠️ WARNING: STUN_URL and TURN_URL must always come from here — never hardcode inline
// ⚠️ WARNING: DATA_CHANNEL_CONFIG is Phase 18B+ only — not used in 18A
// ⚠️ WARNING: HEARTBEAT_INTERVAL_MS × FAILURE_THRESHOLD = 150ms failure detection (18C)
// ⚠️ WARNING: MIN_KARMA_FOR_TIER enforced server-side at join — never bypassed client-side

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh foundation constants
// --- END CHANGE LOG ---

export const LIVE_FACTOR           = 4;
export const LIVE_TREES            = 4;
export const LIVE_PARENTS          = 3;
export const LIVE_LATERALS         = 2;
export const HEARTBEAT_INTERVAL_MS = 50;
export const FAILURE_THRESHOLD     = 3;
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

// Pass directly to new RTCPeerConnection({ iceServers: ICE_SERVERS })
export const ICE_SERVERS = [
  { urls: STUN_URL },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];

// RTCDataChannel config — Phase 18B+ video chunk relay
// ordered:false + maxRetransmits:0 — missed packet better than late packet for live video
export const DATA_CHANNEL_CONFIG = { ordered: false, maxRetransmits: 0 };

// Always derive Realtime channel name from broadcastId — never hardcode
export function signalChannelName(broadcastId) {
  return 'signal:' + broadcastId;
}
