// ============================================================
// FILE: lib/karma.js
// PURPOSE: Karma point values + function to award/deduct karma
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Central karma logic — all API routes call this
//               instead of writing karma SQL inline
// DEPENDENCIES: lib/supabaseServer.js (service role client)
// ⚠️ DO NOT CHANGE: KARMA_VALUES — these are the agreed point
//                   values from the brain dump. Change here only.
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'

// --- Karma point values (single source of truth) ---
export const KARMA_VALUES = {
  question_upvoted:   +5,
  question_downvoted: -2,
  answer_upvoted:     +10,
  answer_downvoted:   -2,
  answer_accepted:    +15,  // person whose answer got accepted
  answer_acceptor:    +2,   // person who accepted an answer
  downvote_cast:      -1,   // person who cast the downvote
}

// --- Milestone badges (matches brain dump exactly) ---
export const KARMA_MILESTONES = [
  { min: 5000, emoji: '🏛️', label: 'Elder of the Rounds' },
  { min: 2500, emoji: '⚕️', label: 'Pillar of the Community' },
  { min: 1000, emoji: '🤝', label: 'Trusted Voice' },
  { min: 500,  emoji: '🩻', label: 'Reading the Signs' },
  { min: 200,  emoji: '🔬', label: 'Under the Microscope' },
  { min: 50,   emoji: '📖', label: 'On the Wards' },
  { min: 1,    emoji: '🌱', label: 'First Day' },
]

// ---
// getMilestone(karma)
// Returns the highest milestone the user has reached.
// Returns null if karma is 0 or below.
// ---
export function getMilestone(karma) {
  if (!karma || karma < 1) return null
  for (const milestone of KARMA_MILESTONES) {
    if (karma >= milestone.min) return milestone
  }
  return null
}

// ---
// awardKarma({ userId, eventType, sourceId })
// Call this from any API route when a karma event happens.
//
// userId    — the user receiving (or losing) karma
// eventType — one of the keys in KARMA_VALUES above
// sourceId  — the question or answer UUID that caused this (for the event log)
//
// What it does:
// 1. Logs the event to community_karma_events
// 2. Upserts community_karma — creates the row if first time, else adds delta
// Returns { success: true } or { success: false, error }
// ---
export async function awardKarma({ userId, eventType, sourceId = null }) {
  const delta = KARMA_VALUES[eventType]

  if (delta === undefined) {
    console.error(`[karma] Unknown eventType: ${eventType}`)
    return { success: false, error: 'Unknown eventType' }
  }

  try {
    // Step 1 — log the event
    const { error: logError } = await supabaseServer
      .from('community_karma_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        delta,
        source_id: sourceId,
      })

    if (logError) {
      console.error('[karma] Failed to log event:', logError.message)
      return { success: false, error: logError.message }
    }

    // Step 2 — upsert the total
    // If the user has no karma row yet, create it with this delta.
    // If they do, add the delta to their existing total.
    const { error: upsertError } = await supabaseServer.rpc('upsert_karma', {
      p_user_id: userId,
      p_delta: delta,
    })

    if (upsertError) {
      console.error('[karma] Failed to upsert total:', upsertError.message)
      return { success: false, error: upsertError.message }
    }

    return { success: true, delta }

  } catch (err) {
    console.error('[karma] Unexpected error:', err.message)
    return { success: false, error: err.message }
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Phase 5 — karma system
// REASON: Central karma logic needed by votes API and answers API
// --- END CHANGE LOG ---
