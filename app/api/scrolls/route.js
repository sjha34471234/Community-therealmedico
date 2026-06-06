// ============================================================
// FILE: app/api/scrolls/route.js
// PURPOSE: GET scroll feed + POST new scroll
// LAST CHANGED: Jun 06, 2026
// WHY IT EXISTS: Phase 15 — Scroll is its own content type,
//   separate from community_questions entirely.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE:
//   - force-dynamic + no-store — live data, never cache.
//   - Bearer token auth — never cookies.
//   - Rate limit: 10 scrolls per user per hour.
//   - Never return user emails or sensitive fields.
//   - Array.from(new Set(...)) — never [...new Set(...)].
//   - canvas_data must be parsed from string before insert (JSONB).
//   - Profiles from 'profiles' table, avatars from 'community_avatars'.
//     Never join these via Supabase — fetch separately and attach manually.
//   - GET auth is OPTIONAL — guests get community-ranked feed, no 401.
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 15: Scroll feed API — separate from questions entirely.
// Phase 16: GET now calls get_scroll_feed() Postgres RPC instead of a direct
//   table query. RPC handles all scoring: engagement, freshness, creator score,
//   follow/affinity boosts, seen penalty. Profile + avatar fetch is unchanged.

// --- WHAT THIS MADE WORK ---
// Logged-in users: algorithmic feed personalised by follows, affinity, creator
//   quality, freshness, and seen history.
// Guests: community-ranked feed using engagement + freshness + creator score
//   + trending bonus. No personalisation signals needed.

// --- WHAT THIS BROKE (if anything) ---
// Nothing broken. Response shape is identical to before + an extra `score`
// field per scroll (clients ignore unknown fields).

// --- FINAL SOLUTION ---
// GET extracts an optional Bearer token. If valid → passes user_id to RPC.
// If missing or invalid → passes null (guest mode).
// All profile + avatar logic unchanged — RPC returns user_ids which we resolve
// exactly as before.

// --- PITFALLS ---
// 1. get_scroll_feed() must exist in Supabase before deploying this file.
//    If the function doesn't exist, the RPC call returns an error and the
//    feed falls back to a 500. Run the SQL first.
// 2. supabase.rpc() returns data as an array (RETURNS TABLE function).
//    Treat list = data || [] exactly like the old .from().select() result.
// 3. p_user_id: null is valid — Postgres accepts NULL UUID and returns the
//    guest-mode feed. Never skip the rpc call for guests.
// 4. Auth errors in GET are silently swallowed (userId stays null) —
//    a bad token means guest feed, not a 401. This is intentional.
// 5. canvas_data from the RPC is still JSONB — Supabase auto-parses it.
//    Never JSON.parse manually.
// 6. supabaseServer() must be called inside handlers, never at module level.

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: Scrolls API — separate from questions entirely.
//   GET: feed with profile + avatar attached.
//   POST: create new scroll with auth + rate limit.
// [May 27, 2026] UPDATED: Phase 15B-1 — added canvas_data JSONB to GET select
//   and POST insert. canvas_data parsed from string before insert,
//   returned as object in GET (Supabase JSONB auto-parses on read).
// [May 28, 2026] UPDATED: Phase 15C — switched GET pagination from ?page=N (limit 20)
//   to ?offset=N&limit=N for batch loading. Default limit=7.
//   Rate limit, content validation, profile/avatar fetch all preserved exactly.
// [Jun 06, 2026] UPDATED: Phase 16 — GET now uses get_scroll_feed() Postgres RPC.
//   Optional Bearer token: logged-in → personalised, guest → community-ranked.
//   Profile + avatar fetch logic unchanged. POST unchanged.
// --- END CHANGE LOG ---

export const dynamic    = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse }   from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

async function checkScrollRateLimit(supabase, userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('community_scrolls')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)
  return (count || 0) >= 10
}

// ── GET — algorithmic scroll feed ────────────────────────────
// Phase 16: calls get_scroll_feed() Postgres RPC.
//   - Logged-in: personalised by follows, affinity, creator score, seen history.
//   - Guest:     community-ranked by engagement + freshness + creator score + trending.
// Pagination: ?offset=N&limit=N (same as Phase 15C — no change on client side).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const limit  = Math.min(20, Math.max(1, parseInt(searchParams.get('limit')  || '7', 10)))
    const offset = Math.max(0,              parseInt(searchParams.get('offset') || '0', 10))

    const supabase = supabaseServer()

    // Optional auth — bad/missing token → guest feed, never a 401
    let userId = null
    const authHeader = request.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '').trim()
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    // Phase 16: RPC handles all scoring. p_user_id=null → guest mode.
    const { data: scrolls, error } = await supabase
      .rpc('get_scroll_feed', {
        p_user_id: userId,
        p_offset:  offset,
        p_limit:   limit,
      })

    if (error) {
      console.error('GET /api/scrolls RPC error:', error)
      return NextResponse.json({ error: 'Failed to load scrolls' }, { status: 500 })
    }

    const list = scrolls || []

    if (list.length === 0) {
      return NextResponse.json(
        { scrolls: [], hasMore: false },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Fetch author profiles — from 'profiles' table (NOT community_profiles)
    // Never join via Supabase — fetch separately and attach manually (⚠️ rule).
    const userIds = Array.from(new Set(list.map(function getId(s) { return s.user_id }).filter(Boolean)))
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, community_username, is_member')
        .in('id', userIds)
      if (profiles) {
        profiles.forEach(function mapP(p) { profileMap[p.id] = p })
      }
    }

    // Fetch avatars — from 'community_avatars' (separate from profiles)
    let avatarMap = {}
    if (userIds.length > 0) {
      const { data: avatars } = await supabase
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .in('user_id', userIds)
      if (avatars) {
        avatars.forEach(function mapA(a) {
          avatarMap[a.user_id] = {
            shape:   a.shape,
            color:   a.color,
            icon:    a.icon,
            border:  a.border,
            pattern: a.pattern,
          }
        })
      }
    }

    // Attach profile + avatar to each scroll.
    // canvas_data: Supabase auto-parses JSONB on RPC return — never JSON.parse.
    const final = list.map(function attach(s) {
      const profile = profileMap[s.user_id] || null
      return {
        ...s,
        canvas_data:        s.canvas_data || null,
        community_username: profile ? (profile.community_username || 'Anonymous') : 'Anonymous',
        is_member:          profile ? (profile.is_member === true) : false,
        avatar:             avatarMap[s.user_id] || null,
      }
    })

    return NextResponse.json(
      { scrolls: final, hasMore: list.length === limit },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('GET /api/scrolls unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// ── POST — create new scroll ──────────────────────────────────
// Unchanged from Phase 15C.
export async function POST(request) {
  try {
    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { content, canvas_data } = body

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return NextResponse.json({ error: 'Content must be at least 5 characters' }, { status: 400 })
    }
    if (content.trim().length > 300) {
      return NextResponse.json({ error: 'Content must be under 300 characters' }, { status: 400 })
    }

    let parsedCanvas = null
    if (canvas_data) {
      try {
        parsedCanvas = typeof canvas_data === 'string' ? JSON.parse(canvas_data) : canvas_data
      } catch {
        parsedCanvas = null
      }
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const rateLimited = await checkScrollRateLimit(supabase, user.id)
    if (rateLimited) {
      return NextResponse.json({ error: 'Too many scrolls posted. Please wait.' }, { status: 429 })
    }

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('community_scrolls')
      .insert({
        user_id:       user.id,
        content:       content.trim(),
        canvas_data:   parsedCanvas,
        upvotes:       0,
        downvotes:     0,
        comment_count: 0,
        is_hidden:     false,
        created_at:    now,
        updated_at:    now,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('POST /api/scrolls insert error:', insertError)
      return NextResponse.json({ error: 'Failed to post scroll. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/scrolls unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
