// --- WHY THIS CODE EXISTS ---
// SHA-256 chunk verification utility using browser-native crypto.subtle.digest().
// Zero npm packages — browser built-in only.
// Phase 18D: utility ready for use. Full activation in Phase 18F when DataChannel
// chunk relay replaces RTCPeerConnection track relay.
// Currently used to verify snapshot integrity in LiveSnapshotAuditor.

// --- WHAT THIS MADE WORK ---
// Phase 18D: SHA-256 utility available across all LiveMesh components
// Phase 18F: chunk integrity verification in DataChannel relay pipeline

// --- PITFALLS ---
// ⚠️ WARNING: crypto.subtle is async — always await hashChunk()
// ⚠️ WARNING: crypto.subtle requires HTTPS — works on Vercel, not http://localhost
// ⚠️ WARNING: input must be ArrayBuffer or TypedArray — convert strings first
//             Use TextEncoder().encode(str).buffer for string inputs
// ⚠️ WARNING: returns lowercase hex string — always compare lowercase to lowercase

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18D — SHA-256 utility via crypto.subtle.digest
// --- END CHANGE LOG ---

export default class LiveChunkVerifier {

  // Hash any ArrayBuffer or TypedArray → lowercase hex string
  static async hashChunk(data) {
    try {
      var buffer = data instanceof ArrayBuffer ? data : data.buffer;
      var hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      var hashArray  = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch(e) {
      console.error('LiveChunkVerifier: hashChunk failed', e);
      return null;
    }
  }

  // Verify data matches an expected hex hash
  static async verifyChunk(data, expectedHex) {
    if (!expectedHex) return false;
    var actualHex = await LiveChunkVerifier.hashChunk(data);
    if (!actualHex) return false;
    return actualHex.toLowerCase() === expectedHex.toLowerCase();
  }

  // Hash a plain string (for signing signaling messages)
  static async hashString(str) {
    try {
      var encoded = new TextEncoder().encode(str);
      return await LiveChunkVerifier.hashChunk(encoded.buffer);
    } catch(e) {
      return null;
    }
  }

  // Generate a quick integrity token for a signaling payload
  // Usage: token = await LiveChunkVerifier.signPayload(JSON.stringify(payload), secret)
  static async signPayload(payloadStr, secret) {
    return await LiveChunkVerifier.hashString(payloadStr + secret);
  }
}
