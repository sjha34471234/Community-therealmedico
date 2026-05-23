// --- WHY THIS CODE EXISTS ---
// Single source of truth for all chat configuration.
// Contains: room definitions, sanitizer, rate limiter, and AES-256 encryption helpers.
// Every chat API route imports from here — nothing is hardcoded elsewhere.

// --- WHAT THIS MADE WORK ---
// chatRooms → RoomList.jsx renders rooms from this, not from DB (faster, no extra query)
// sanitize() → strips HTML/scripts before any message hits the DB
// rateLimiter → blocks users sending more than 3 messages per 10 seconds
// encrypt() / decrypt() → AES-256-CBC for DM messages at rest
// All icons are v0.303-safe Lucide names

// --- PITFALLS ---
// ⚠️ Room slugs here MUST match slugs seeded in Supabase — never change them
// ⚠️ CHAT_ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes) — set in Vercel env vars
// ⚠️ encrypt() and decrypt() are async — always await them
// ⚠️ Never import crypto from anywhere — use the global crypto (Web Crypto API, works in Next.js Edge)
// ⚠️ sanitize() must be called on EVERY message body before DB insert — never skip it
// ⚠️ rateLimiter is in-memory — resets on Vercel cold start. That's acceptable for this use case.

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — config, sanitizer, rate limiter, encryption
// --- END CHANGE LOG ---

// ============================================================
// ROOM DEFINITIONS
// Icons must be v0.303-safe Lucide names only
// ============================================================
export const chatRooms = [
  { slug: 'nursing',      name: 'Nursing',              icon: 'Stethoscope', description: 'For nurses and nursing students',             order: 1  },
  { slug: 'medicine',     name: 'MBBS / Medicine',       icon: 'Activity',    description: 'For medical students and doctors',            order: 2  },
  { slug: 'pharmacy',     name: 'Pharmacy',              icon: 'Pill',        description: 'For pharmacists and pharmacy students',       order: 3  },
  { slug: 'dentistry',    name: 'Dentistry',             icon: 'Bone',        description: 'For dental students and dentists',            order: 4  },
  { slug: 'paramedics',   name: 'Paramedics',            icon: 'Zap',         description: 'For paramedics and emergency care',           order: 5  },
  { slug: 'general',      name: 'General Healthcare',    icon: 'Heart',       description: 'Open discussion for all healthcare workers',  order: 6  },
  { slug: 'anatomy',      name: 'Anatomy & Physiology',  icon: 'Brain',       description: 'Deep dives into human body structure',        order: 7  },
  { slug: 'pathology',    name: 'Pathology',             icon: 'Microscope',  description: 'Disease processes and lab findings',          order: 8  },
  { slug: 'pharmacology', name: 'Pharmacology',          icon: 'FlaskConical',description: 'Drug mechanisms, interactions, mnemonics',    order: 9  },
  { slug: 'radiology',    name: 'Radiology',             icon: 'Eye',         description: 'Imaging, X-rays, CT, MRI discussion',        order: 10 },
  { slug: 'surgery',      name: 'Surgery',               icon: 'Clipboard',   description: 'Surgical procedures and clinical skills',     order: 11 },
  { slug: 'pediatrics',   name: 'Pediatrics',            icon: 'Baby',        description: 'Child health and pediatric nursing',          order: 12 },
];

// ============================================================
// SANITIZER
// Strips all HTML tags and trims whitespace.
// Prevents XSS attacks — someone trying to inject <script> tags.
// Must be called on every message body before saving to DB.
// ============================================================
export function sanitize(text) {
  if (typeof text !== 'string') return '';
  // Remove all HTML tags
  const stripped = text.replace(/<[^>]*>/g, '');
  // Collapse multiple spaces/newlines into single space
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  return collapsed;
}

// ============================================================
// RATE LIMITER
// Allows max 3 messages per 10 seconds per user.
// Uses an in-memory Map — no DB calls, no extra packages.
// Map structure: { userId → [timestamp, timestamp, ...] }
// On every message: remove timestamps older than 10s, then check count.
// ============================================================
const messageLog = new Map();

export function checkRateLimit(userId) {
  // Returns { allowed: true } or { allowed: false, retryAfter: seconds }
  const now = Date.now();
  const windowMs = 10_000;   // 10 seconds
  const maxMessages = 3;     // max 3 messages in that window

  const timestamps = (messageLog.get(userId) || []).filter(
    ts => now - ts < windowMs
  );

  if (timestamps.length >= maxMessages) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  messageLog.set(userId, timestamps);
  return { allowed: true };
}

// ============================================================
// ENCRYPTION HELPERS — AES-256-CBC
// Used for DM messages only. Room messages are public — no encryption needed.
//
// How it works:
// 1. encrypt(plaintext) → generates a random IV → encrypts → returns { cipher, iv }
// 2. Both cipher and iv are saved to community_dm_messages table
// 3. decrypt(cipher, iv) → reverses the process → returns original text
//
// The secret key comes from CHAT_ENCRYPTION_KEY env var (set in Vercel).
// It must be exactly 64 hex characters (= 32 bytes = 256 bits).
// ============================================================

// Helper: convert hex string to Uint8Array
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

// Helper: convert Uint8Array to hex string
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: import the raw key bytes into a CryptoKey object
async function getKey() {
  const keyHex = process.env.CHAT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('CHAT_ENCRYPTION_KEY must be exactly 64 hex characters');
  }
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

// encrypt(plaintext) → { cipher: string, iv: string }
// cipher and iv are both hex strings — safe to store in DB as text columns
export async function encrypt(plaintext) {
  const key = await getKey();
  // Generate a fresh random IV for every message
  const ivBytes = crypto.getRandomValues(new Uint8Array(16));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivBytes },
    key,
    encoded
  );
  return {
    cipher: bytesToHex(new Uint8Array(cipherBuffer)),
    iv: bytesToHex(ivBytes),
  };
}

// decrypt(cipher, iv) → plaintext string
export async function decrypt(cipherHex, ivHex) {
  try {
    const key = await getKey();
    const cipherBytes = hexToBytes(cipherHex);
    const ivBytes = hexToBytes(ivHex);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBytes },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    // If decryption fails for any reason, return a safe fallback
    // This prevents one bad message from crashing the whole DM thread
    return '[message unavailable]';
  }
}

// ============================================================
// MESSAGE LIMITS
// Used by API routes for validation before DB insert
// ============================================================
export const CHAT_LIMITS = {
  maxMessageLength: 500,   // characters
  maxDmLength: 500,        // characters (same for DMs)
  roomPageSize: 30,        // messages loaded per page in rooms
  dmPageSize: 30,          // messages loaded per page in DMs
  dmListPageSize: 15,      // DM conversations loaded per page in sidebar
  userSearchPageSize: 10,  // users shown per page in new DM search modal
};
