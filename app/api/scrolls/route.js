// ============================================================
// FILE: app/api/scrolls/route.js
// PURPOSE: GET scroll feed + POST new scroll
// LAST CHANGED: May 27, 2026
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
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
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

// ── GET — scroll feed ─────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 20
    const offset = (page - 1) * limit

    const supabase = supabaseServer()

    const { data: scrolls, error } = await supabase
      .from('community_scrolls')
      .select('id, content, canvas_data, upvotes, downvotes, comment_count, user_id, created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('GET /api/scrolls error:', error)
      return NextResponse.json({ error: 'Failed to load scrolls' }, { status: 500 })
    }

    const list = scrolls || []

    if (list.length === 0) {
      return NextResponse.json({ scrolls: [], hasMore: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    }

    // Fetch author profiles
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

    // Fetch avatars
    let avatarMap = {}
    if (userIds.length > 0) {
      const { data: avatars } = await supabase
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .in('user_id', userIds)
      if (avatars) {
        avatars.forEach(function mapA(a) {
          avatarMap[a.user_id] = {
            shape: a.shape,
            color: a.color,
            icon: a.icon,
            border: a.border,
            pattern: a.pattern,
          }
        })
      }
    }

    // Attach profile + avatar to each scroll
    // canvas_data comes back as parsed object from Supabase JSONB automatically
    const final = list.map(function attach(s) {
      const profile = profileMap[s.user_id] || null
      return {
        ...s,
        canvas_data: s.canvas_data || null,
        community_username: profile ? (profile.community_username || 'Anonymous') : 'Anonymous',
        is_member: profile ? (profile.is_member === true) : false,
        avatar: avatarMap[s.user_id] || null,
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

    // Parse canvas_data — sent as JSON string from creator, stored as JSONB
    let parsedCanvas = null
    if (canvas_data) {
      try {
        parsedCanvas = typeof canvas_data === 'string' ? JSON.parse(canvas_data) : canvas_data
      } catch {
        // canvas_data malformed — allow post without it, don't block
        parsedCanvas = null
      }
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
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
        user_id: user.id,
        content: content.trim(),
        canvas_data: parsedCanvas,
        upvotes: 0,
        downvotes: 0,
        comment_count: 0,
        is_hidden: false,
        created_at: now,
        updated_at: now,
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

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: Scrolls API — separate from questions entirely.
//   GET: feed with profile + avatar attached.
//   POST: create new scroll with auth + rate limit.
// [May 27, 2026] UPDATED: Phase 15B-1 — added canvas_data JSONB to GET select
//   and POST insert. canvas_data parsed from string before insert,
//   returned as object in GET (Supabase JSONB auto-parses on read).
// --- END CHANGE LOG ---
