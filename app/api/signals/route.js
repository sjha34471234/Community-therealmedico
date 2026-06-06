// ============================================================
// FILE: app/api/signals/route.js
// PURPOSE: Record a view signal when a logged-in user watches a scroll.
//
// WHY IT EXISTS: Phase 16 — Algorithmic Feed.
//   The "already seen" penalty (−10,000) in get_scroll_feed() needs
//   to know which scrolls the user has watched. This route writes that
//   data to community_user_signals.
//
// ONLY signal_type supported: 'view'
//   - Fired by ScrollFeed.jsx when activeIndex changes (card becomes active).
//   - Uses upsert with ignoreDuplicates so duplicate calls are safe.
//   - Guests (no token) silently receive 401 — they have no seen history.
//   - Never blocks the UI — ScrollFeed fires this as fire-and-forget.
//
// DEPENDENCIES: lib/supabaseServer.js, community_user_signals table
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 16 needs a seen-scroll history to push watched scrolls out of feed.
// community_user_signals table holds this data (view signal only for now).
// The UNIQUE constraint on (user_id, scroll_id, signal_type) means upsert
// with ignoreDuplicates is idempotent — safe to call on every card view.

// --- WHAT THIS MADE WORK ---
// Logged-in users now build a view history as they scroll.
// get_scroll_feed() reads this history to apply the −10,000 seen penalty.

// --- WHAT THIS BROKE ---
// Nothing — new file, no changes to existing routes.

// --- PITFALLS ---
// 1. scroll_id must be a valid UUID — Postgres rejects non-UUID strings with
//    a type error. We validate it's a non-empty string before querying.
// 2. ignoreDuplicates: true is REQUIRED — without it, upsert throws a 409
//    on the UNIQUE constraint. The API would return 500 on repeated views.
// 3. Never call supabaseServer() outside the handler (module-level) —
//    breaks cold start. Always call inside the handler.
// 4. signal_type is checked by a DB constraint ('view' only) — sending any
//    other type will fail at the DB level and return a 500 here.

// --- CHANGE LOG ---
// [Jun 06, 2026] CREATED: Phase 16 — view signal API for algorithmic feed.
// --- END CHANGE LOG ---

export const dynamic    = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse }    from 'next/server'
import { supabaseServer }  from '@/lib/supabaseServer'

export async function POST(request) {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      // Guests have no view history — silently reject, never block the UI
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const supabase = supabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    // ── Parse body ───────────────────────────────────────────
    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { scroll_id } = body
    if (!scroll_id || typeof scroll_id !== 'string' || scroll_id.trim().length === 0) {
      return NextResponse.json({ error: 'scroll_id is required' }, { status: 400 })
    }

    // ── Record view signal ───────────────────────────────────
    // ignoreDuplicates: true — UNIQUE(user_id, scroll_id, signal_type) means
    // re-viewing the same scroll is a no-op. Never throws on duplicate.
    const { error: upsertError } = await supabase
      .from('community_user_signals')
      .upsert(
        {
          user_id:     user.id,
          scroll_id:   scroll_id.trim(),
          signal_type: 'view',
        },
        { onConflict: 'user_id,scroll_id,signal_type', ignoreDuplicates: true }
      )

    if (upsertError) {
      console.error('POST /api/signals upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to record signal' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('POST /api/signals unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
