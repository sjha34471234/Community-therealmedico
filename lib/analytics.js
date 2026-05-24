// ============================================================
// FILE: lib/analytics.js
// PURPOSE: Helper functions to fire GA4 custom events from
//          anywhere in the app — question views, answers posted,
//          votes cast, searches, etc.
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Calling window.gtag() directly everywhere is
//               messy and breaks if GA4 hasn't loaded yet.
//               This wrapper checks gtag exists before calling,
//               and provides named functions for each event type
//               so tracking calls are readable and consistent.
// DEPENDENCIES: None — wraps window.gtag set by layout.js
// ⚠️ DO NOT CHANGE: typeof window check — this file may be
//                   imported in SSR context where window is
//                   undefined — always guard with typeof window
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14A — analytics event tracking. GA4 auto-tracks page
// views but custom events (question_viewed, answer_posted etc.)
// must be fired manually. This file is the single place for all
// custom event calls — never call window.gtag directly elsewhere.

// --- WHAT THIS MADE WORK ---
// Any component can import trackEvent() and fire a GA4 event
// without worrying about whether gtag has loaded yet.

// --- PITFALLS ---
// ⚠️ window.gtag may not exist if GA4 script hasn't loaded yet
//    Always wrap in typeof window !== 'undefined' check
// ⚠️ Event names must be snake_case — GA4 rejects camelCase
// ⚠️ Parameter values must be strings or numbers — never objects

/**
 * Fire a custom GA4 event.
 * Safe to call anywhere — SSR, client, before GA4 loads.
 *
 * @param {string} eventName - snake_case event name e.g. 'question_viewed'
 * @param {Object} params - key/value pairs of event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

// ── Named event helpers ──────────────────────────────────────
// Use these instead of calling trackEvent() with raw strings.
// Keeps event names consistent across the codebase.

/** Called when a user views a question detail page */
export function trackQuestionView(slug, title) {
  trackEvent('question_viewed', { slug, title });
}

/** Called when a user submits a new question */
export function trackQuestionPosted(tags) {
  trackEvent('question_posted', { tags: (tags || []).join(',') });
}

/** Called when a user posts an answer */
export function trackAnswerPosted(questionSlug) {
  trackEvent('answer_posted', { question_slug: questionSlug });
}

/** Called when a user casts a vote */
export function trackVote(contentType, direction) {
  trackEvent('vote_cast', { content_type: contentType, direction });
}

/** Called when a user runs a search */
export function trackSearch(query) {
  trackEvent('search_performed', { search_term: query });
}

/** Called when a user opens a chat DM */
export function trackDMOpened() {
  trackEvent('dm_opened');
}

/** Called when a user submits an error report */
export function trackErrorReported(errorType) {
  trackEvent('error_reported', { error_type: errorType });
}

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14A analytics helper
// REASON: Central place for all GA4 custom event calls
// --- END CHANGE LOG ---
