// --- WHY THIS CODE EXISTS ---
// Central config and shared logic for the entire Phase 13 moderation system.
// Every mod API route imports from here — never hardcode action types,
// content types, or reasons in individual route files.

// --- WHAT THIS MADE WORK ---
// Single source of truth for:
//   - What content types can be reported
//   - What reasons a user can give when reporting
//   - What actions a mod can take
//   - Auto-flag word checking (loads words from DB, matches against post body)
//   - Permission checks (is this user a mod or admin?)

// --- PITFALLS ---
// ⚠️ WARNING: ADMIN_USER_ID must be set in Vercel env vars — never hardcode it in this file
// ⚠️ WARNING: flagged word check is case-insensitive — always lowercase before comparing
// ⚠️ WARNING: This file is imported by API routes only — never import in client components

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system foundation
// --- END CHANGE LOG ---


// ─────────────────────────────────────────
// CONTENT TYPES
// These are the 5 types of content that can be reported
// Must match content_type values in community_reports table
// ─────────────────────────────────────────

export const CONTENT_TYPES = {
  QUESTION:     'question',
  ANSWER:       'answer',
  REPLY:        'reply',
  ROOM_MESSAGE: 'room_message',
  DM_MESSAGE:   'dm_message',
};

// All valid content type values as an array — used for input validation
export const VALID_CONTENT_TYPES = Object.values(CONTENT_TYPES);


// ─────────────────────────────────────────
// REPORT REASONS
// These are the options shown to users when they click Report
// Must match reason values stored in community_reports table
// ─────────────────────────────────────────

export const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam or repetitive content' },
  { value: 'misinformation', label: 'Medical misinformation' },
  { value: 'harassment',     label: 'Harassment or bullying' },
  { value: 'inappropriate',  label: 'Inappropriate content' },
  { value: 'other',          label: 'Other' },
];

export const VALID_REASONS = REPORT_REASONS.map(r => r.value);


// ─────────────────────────────────────────
// MOD ACTION TYPES
// Every action a mod takes is logged in community_mod_actions
// Must match action_type values in that table
// ─────────────────────────────────────────

export const MOD_ACTIONS = {
  HIDE:         'hide',         // Hide a question, answer, reply, or room message
  UNHIDE:       'unhide',       // Restore hidden content
  BAN:          'ban',          // Ban or suspend a user
  UNBAN:        'unban',        // Lift a ban
  DISMISS:      'dismiss',      // Dismiss a report as false/resolved without action
  PROMOTE:      'promote',      // Give a user mod status
  DEMOTE:       'demote',       // Remove mod status from a user
  ADD_WORD:     'add_word',     // Add a word to the auto-flag list
  DELETE_WORD:  'delete_word',  // Remove a word from the auto-flag list
};

export const VALID_MOD_ACTIONS = Object.values(MOD_ACTIONS);


// ─────────────────────────────────────────
// BAN TYPES
// ─────────────────────────────────────────

export const BAN_TYPES = {
  PERMANENT:  'permanent',
  TEMPORARY:  'temporary',
};

export const VALID_BAN_TYPES = Object.values(BAN_TYPES);


// ─────────────────────────────────────────
// MODERATION SOURCE
// Tracks how a report was created — used for future AI integration
// ─────────────────────────────────────────

export const MOD_SOURCES = {
  USER: 'user',   // A user clicked the Report button
  AUTO: 'auto',   // A flagged word was detected automatically
  AI:   'ai',     // Future: AI moderation score triggered it
};


// ─────────────────────────────────────────
// REPORT STATUS
// ─────────────────────────────────────────

export const REPORT_STATUS = {
  PENDING:   'pending',
  RESOLVED:  'resolved',
  DISMISSED: 'dismissed',
};


// ─────────────────────────────────────────
// PERMISSION CHECKS
// Used by every mod API route to verify the caller has mod or admin rights
// ─────────────────────────────────────────

// Returns true if the given user profile has mod OR admin status
// profile must have: is_mod (boolean)
// adminId is read from env — Sushant's own Supabase user UUID
export function isModerator(profile) {
  if (!profile) return false;
  const adminId = process.env.ADMIN_USER_ID;
  if (adminId && profile.id === adminId) return true;
  return profile.is_mod === true;
}

// Returns true ONLY for the admin (site owner)
// Used for actions only the owner can do: promote/demote mods
export function isAdmin(userId) {
  if (!userId) return false;
  const adminId = process.env.ADMIN_USER_ID;
  return adminId && userId === adminId;
}


// ─────────────────────────────────────────
// AUTO-FLAG WORD CHECK
// Called by question, answer, and chat message POST routes
// Loads the current flagged words list from Supabase
// Returns the first matching word if found, null if clean
// ─────────────────────────────────────────

// supabase — a supabaseServer() instance passed in from the calling route
// body — the plain text content AFTER sanitization, BEFORE saving
export async function checkFlaggedWords(supabase, body) {
  if (!body || typeof body !== 'string') return null;

  try {
    const { data: words, error } = await supabase
      .from('community_flagged_words')
      .select('word');

    if (error || !words || words.length === 0) return null;

    const lowerBody = body.toLowerCase();

    for (const row of words) {
      // ⚠️ WARNING: Use word boundary check — 'ass' should not flag 'class'
      const pattern = new RegExp('\\b' + row.word.toLowerCase() + '\\b');
      if (pattern.test(lowerBody)) {
        return row.word;
      }
    }

    return null;
  } catch {
    // If word check fails, do not block the post — fail open
    return null;
  }
}


// ─────────────────────────────────────────
// AUTO-REPORT CREATOR
// Called after checkFlaggedWords returns a match
// Creates a report with moderation_source = 'auto'
// ─────────────────────────────────────────

// supabase — supabaseServer() instance
// contentType — one of VALID_CONTENT_TYPES
// contentId — UUID of the content row just saved
// matchedWord — the word that triggered the flag
export async function createAutoReport(supabase, contentType, contentId, matchedWord) {
  try {
    await supabase
      .from('community_reports')
      .insert({
        content_type:        contentType,
        content_id:          contentId,
        reporter_id:         null,
        reason:              'inappropriate',
        details:             'Auto-flagged: matched word "' + matchedWord + '"',
        status:              REPORT_STATUS.PENDING,
        moderation_source:   MOD_SOURCES.AUTO,
      });
  } catch {
    // Auto-report failure should never block the post from saving
    // Fail silently — mod queue may just miss this one
  }
}


// ─────────────────────────────────────────
// BLOCK CHECK
// Returns true if userA has blocked userB OR userB has blocked userA
// Used in DM route before allowing a message to be sent
// ─────────────────────────────────────────

export async function isBlocked(supabase, userA, userB) {
  if (!userA || !userB) return false;

  try {
    const { data, error } = await supabase
      .from('community_blocks')
      .select('id')
      .or(
        'blocker_id.eq.' + userA + ',blocked_id.eq.' + userA
      )
      .or(
        'blocker_id.eq.' + userB + ',blocked_id.eq.' + userB
      )
      .limit(1);

    if (error) return false;

    // ⚠️ WARNING: The OR above matches any block involving either user
    // We then check both directions explicitly below
    const { data: exact } = await supabase
      .from('community_blocks')
      .select('id')
      .or(
        'and(blocker_id.eq.' + userA + ',blocked_id.eq.' + userB + '),' +
        'and(blocker_id.eq.' + userB + ',blocked_id.eq.' + userA + ')'
      )
      .limit(1);

    return exact && exact.length > 0;
  } catch {
    return false;
  }
}


// ─────────────────────────────────────────
// BANNED USER CHECK
// Returns true if the given user is currently banned
// Called in every write API route before processing
// ─────────────────────────────────────────

export async function isBanned(supabase, userId) {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.is_banned === true;
  } catch {
    return false;
  }
}
