// ============================================================
// FILE: app/api/scrolls/comments/route.js
// PURPOSE: GET scroll comments + POST new comment/reply
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 — Scroll comments are separate from
//   community_answers — scrolls are their own content type.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE:
//   - Bearer token auth — never cookies.
//   - parent_id IS NULL for top-level comments.
//   - comment_count updated on top-level POST only.
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

function extractToken(request) {
  const auth = request.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

// ── GET — comments for a scroll ───────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const scrollId = searchParams.get('scroll_id')
    const parentId = searchParams.get('parent_id')

    if (!scrollId) {
      return NextResponse.json({ error: 'scroll_id is required' }, { status: 400 })
    }

    const supabase = supabaseServer()

    let query = supabase
      .from('community_scroll_comments')
      .select('id, body, user_id, parent_id, created_at')
      .eq('scroll_id', scrollId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('GET /api/scrolls/comments error:', error)
      return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
    }

    const list = comments || []

    if (list.length === 0) {
      return NextResponse.json({ comments: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    }

    // Fetch reply counts for top-level comments
    let replyCounts = {}
    if (!parentId && list.length > 0) {
      const commentIds = list.map(function getId(c) { return c.id })
      const { data: replies } = await supabase
        .from('community_scroll_comments')
        .select('parent_id')
        .in('parent_id', commentIds)
        .eq('is_hidden', false)
      if (replies) {
        replies.forEach(function count(r) {
          replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1
        })
      }
    }

    // Fetch author profiles + avatars
    const userIds = Array.from(new Set(list.map(function getId(c) { return c.user_id }).filter(Boolean)))
    let profileMap = {}
    let avatarMap = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, community_username, is_member')
        .in('id', userIds)
      if (profiles) {
        profiles.forEach(function mapP(p) { profileMap[p.id] = p })
      }

      const { data: avatars } = await supabase
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .in('user_id', userIds)
      if (avatars) {
        avatars.forEach(function mapA(a) {
          avatarMap[a.user_id] = {
            shape: a.shape, color: a.color, icon: a.icon,
            border: a.border, pattern: a.pattern,
          }
        })
      }
    }

    const final = list.map(function attach(c) {
      const profile = profileMap[c.user_id] || null
      return {
        ...c,
        community_username: profile ? (profile.community_username || 'Anonymous') : 'Anonymous',
        avatar: avatarMap[c.user_id] || null,
        reply_count: replyCounts[c.id] || 0,
      }
    })

    return NextResponse.json(
      { comments: final },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('GET /api/scrolls/comments unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// ── POST — new comment or reply ───────────────────────────────
export async function POST(request) {
  try {
    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { scroll_id, body: commentBody, parent_id } = body

    if (!scroll_id) {
      return NextResponse.json({ error: 'scroll_id is required' }, { status: 400 })
    }
    if (!commentBody || typeof commentBody !== 'string' || commentBody.trim().length < 1) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }
    if (commentBody.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment must be under 1000 characters' }, { status: 400 })
    }

    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('community_scroll_comments')
      .insert({
        scroll_id,
        user_id: user.id,
        body: commentBody.trim(),
        parent_id: parent_id || null,
        is_hidden: false,
        created_at: now,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('POST /api/scrolls/comments insert error:', insertError)
      return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 })
    }

    // Increment comment_count on scroll for top-level comments only
    if (!parent_id) {
      await supabase.rpc('increment_scroll_comment_count', { scroll_id_param: scroll_id })
    }

    return NextResponse.json({ id: inserted.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/scrolls/comments unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: Scroll comments API — separate from /api/answers.
//   GET: top-level comments + reply counts + profiles + avatars.
//   POST: new comment or reply, increments comment_count on scroll.
// --- END CHANGE LOG ---
