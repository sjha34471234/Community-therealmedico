// ============================================================
// FILE: app/api/questions/route.js
// PURPOSE: API route for community questions — GET feed + POST new question
// LAST CHANGED: May 22, 2026
// WHY IT EXISTS: GET powers the live question feed (Phase 2).
//   POST added in Phase 3 — handles new question submission with auth,
//   rate limiting, slug generation, and Supabase insert.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE:
//   - force-dynamic + cache: 'no-store' — this is live data, never cache it.
//   - Auth must use Bearer token — never cookies (rule #36).
//   - Rate limit: max 5 questions per user per hour.
//   - Slug must be keyword-rich — never use UUID as slug.
//   - Array.from(new Set(...)) — never [...new Set(...)].
//   - Never return user emails or sensitive fields in GET response.
//   - body preview capped at 200 chars in GET — never return full body in feed.
//   - author_avatar is the raw avatarRow object — QuestionCard resolves it via Avatar.jsx
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// ── Slug generator ────────────────────────────────────────────────────────────
function generateSlug(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 74)
    .replace(/-$/, '')

  const suffix = Math.random().toString(36).slice(2, 8)
  return base + '-' + suffix
}

// ── Rate limit check ──────────────────────────────────────────────────────────
async function checkQuestionRateLimit(supabase, userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('community_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  return (count || 0) >= 5
}

// ── GET — question feed ───────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'hot'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 20
    const offset = (page - 1) * limit
    const userId = searchParams.get('userId') || null

    const supabase = supabaseServer()

    let query = supabase
      .from('community_questions')
      .select('id, slug, title, body, tags, upvotes, downvotes, view_count, answer_count, is_answered, is_pinned, last_activity_at, created_at, user_id')
      .eq('is_hidden', false)
      .range(offset, offset + limit - 1)

    if (sort === 'new') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'top') {
      query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('is_pinned', { ascending: false }).order('last_activity_at', { ascending: false })
    }

    const { data: questions, error } = await query

    if (error) {
      console.error('GET /api/questions error:', error)
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ questions: [], hasMore: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    }

    // Cap body preview at 200 chars
    let processed = questions.map(function capBody(q) {
      return {
        ...q,
        body: q.body ? q.body.slice(0, 200) : '',
      }
    })

    // Viewed-post filtering for logged-in users
    if (userId) {
      const questionIds = processed.map(function getId(q) { return q.id })

      const { data: views } = await supabase
        .from('community_post_views')
        .select('question_id, activity_snapshot')
        .eq('user_id', userId)
        .in('question_id', questionIds)

      const viewMap = {}
      if (views) {
        views.forEach(function mapView(v) {
          viewMap[v.question_id] = v.activity_snapshot
        })
      }

      processed = processed.map(function attachActivity(q) {
        const snapshot = viewMap[q.id]
        if (!snapshot) return { ...q, hasNewActivity: false }
        const hasNew = new Date(q.last_activity_at) > new Date(snapshot)
        return { ...q, hasNewActivity: hasNew }
      })

      processed = processed.filter(function filterViewed(q) {
        const snapshot = viewMap[q.id]
        if (!snapshot) return true
        return q.hasNewActivity
      })
    }

    // ── Block filtering ──
    // If a userId is provided, fetch all block relationships involving them.
    // Filter out questions from users they have blocked OR who have blocked them.
    // ⚠️ WARNING: Check BOTH directions — A blocks B AND B blocks A
    if (userId) {
      try {
        const { data: blocks } = await supabase
          .from('community_blocks')
          .select('blocker_id, blocked_id')
          .or('blocker_id.eq.' + userId + ',blocked_id.eq.' + userId)

        if (blocks && blocks.length > 0) {
          const blockedUserIds = new Set()
          blocks.forEach(function collectBlocked(b) {
            if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id)
            if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id)
          })
          processed = processed.filter(function filterBlocked(q) {
            return !blockedUserIds.has(q.user_id)
          })
        }
      } catch {
        // Block filter failure should never break the feed — fail open
      }
    }

    // Fetch author usernames + member status
    const userIds = Array.from(new Set(processed.map(function getId(q) { return q.user_id }).filter(Boolean)))
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

    // --- WHY THIS CODE EXISTS ---
    // Fetch avatar rows for all question authors in one bulk query.
    // QuestionCard needs author_avatar (the raw avatarRow) to render Avatar.jsx.
    // One query for all userIds — never one query per question.
    // avatarMap[user_id] = { shape, color, icon, border, pattern }
    // Missing rows (trigger failure edge case) safely produce null in the map.
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

    // Attach profile + avatar to each question
    const final = processed.map(function attachProfile(q) {
      const profile = profileMap[q.user_id] || null
      return {
        ...q,
        author_username: profile ? (profile.community_username || 'Anonymous User') : 'Anonymous User',
        is_member_post: profile ? (profile.is_member === true) : false,
        // --- WHY THIS EXISTS ---
        // author_avatar is the raw avatarRow. QuestionCard passes it straight
        // into <Avatar avatarRow={...} />. Null if no row found — Avatar handles safely.
        author_avatar: avatarMap[q.user_id] || null,
      }
    })

    return NextResponse.json(
      { questions: final, hasMore: questions.length === limit },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('GET /api/questions unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// ── POST — create new question ────────────────────────────────────────────────
export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { title, body: questionBody, tags } = body

    if (!title || typeof title !== 'string' || title.trim().length < 15) {
      return NextResponse.json({ error: 'Title must be at least 15 characters' }, { status: 400 })
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: 'Title must be under 200 characters' }, { status: 400 })
    }
    if (!questionBody || typeof questionBody !== 'string' || questionBody.trim().length < 30) {
      return NextResponse.json({ error: 'Body must be at least 30 characters' }, { status: 400 })
    }
    if (questionBody.trim().length > 5000) {
      return NextResponse.json({ error: 'Body must be under 5000 characters' }, { status: 400 })
    }

    const cleanTags = Array.isArray(tags)
      ? Array.from(new Set(
          tags
            .map(function cleanTag(t) { return String(t).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) })
            .filter(function filterTag(t) { return t.length > 0 })
        )).slice(0, 5)
      : []

    // Verify auth via Bearer token — never cookies (rule #36)
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'You must be signed in to ask a question' }, { status: 401 })
    }

    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to ask a question' }, { status: 401 })
    }

    // Rate limit check
    const rateLimited = await checkQuestionRateLimit(supabase, user.id)
    if (rateLimited) {
      return NextResponse.json(
        { error: 'You have posted too many questions in the last hour. Please wait before posting again.' },
        { status: 429 }
      )
    }

    // Generate slug
    const slug = generateSlug(title.trim())

    // Insert question
    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('community_questions')
      .insert({
        slug,
        title: title.trim(),
        body: questionBody.trim(),
        tags: cleanTags,
        user_id: user.id,
        upvotes: 0,
        view_count: 0,
        answer_count: 0,
        is_answered: false,
        is_pinned: false,
        last_activity_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id, slug')
      .single()

    if (insertError) {
      console.error('POST /api/questions insert error:', insertError)
      return NextResponse.json({ error: 'Failed to post question. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id, slug: inserted.slug }, { status: 201 })

  } catch (err) {
    console.error('POST /api/questions unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: GET handler — Phase 2 feed
// [May 14, 2026] UPDATED: POST handler added — Phase 3
// [May 17, 2026] UPDATED: profiles SELECT now includes is_member — Phase 7
// [May 19, 2026] FIXED: Auth switched from cookie-based to Bearer token (rule #36).
//               Removed createClient cookie approach — iPad drops cookies on API calls.
//               Now uses supabaseServer().auth.getUser(token) consistently.
// [May 22, 2026] UPDATED: Avatar data added to GET response.
//               Added bulk community_avatars query using same userIds already collected.
//               author_avatar (avatarRow) now attached to every question in final[].
//               QuestionCard passes it straight into <Avatar /> — no extra fetch needed.
// --- END CHANGE LOG ---
