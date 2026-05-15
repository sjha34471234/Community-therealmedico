// ============================================================
// FILE: app/api/answers/route.js
// PURPOSE: API route for community answers — GET answers + POST new answer
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Handles answer submission with auth verification, rate limiting,
//   and critically — updates last_activity_at on the parent question after every
//   new answer. This update is what powers the feed resurfacing "new reply" logic.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE:
//   - After inserting an answer, ALWAYS update last_activity_at on the question.
//     Skipping this breaks the entire viewed-post / new reply feed system.
//   - After inserting an answer, ALWAYS increment answer_count on the question.
//   - Auth must be verified server-side — never trust client-sent user_id.
//   - Rate limit: max 10 answers per user per hour.
//   - force-dynamic + cache: 'no-store' — live data, never cached.
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

// ── Rate limit check ──────────────────────────────────────────────────────────
async function checkAnswerRateLimit(supabase, userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('community_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  return (count || 0) >= 10
}

// ── GET — fetch answers for a question ───────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('question_id')

    if (!questionId) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: answers, error } = await supabase
      .from('community_answers')
      .select('id, body, upvotes, downvotes, is_accepted, created_at, user_id')
      .eq('question_id', questionId)
      .order('is_accepted', { ascending: false })
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('GET /api/answers error:', error)
      return NextResponse.json({ error: 'Failed to load answers' }, { status: 500 })
    }

    // Fetch author usernames
    const userIds = Array.from(new Set(
      (answers || []).map(function getId(a) { return a.user_id }).filter(Boolean)
    ))

    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, community_username')
        .in('id', userIds)
      if (profiles) {
        profiles.forEach(function mapP(p) { profileMap[p.id] = p })
      }
    }

    const final = (answers || []).map(function attachProfile(a) {
      const profile = profileMap[a.user_id] || null
      return {
        ...a,
        author_username: profile ? (profile.community_username || 'Anonymous User') : 'Anonymous User',
      }
    })

    return NextResponse.json(
      { answers: final },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('GET /api/answers unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// ── POST — submit a new answer ────────────────────────────────────────────────
export async function POST(request) {
  try {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { question_id, body: answerBody } = body

    // Validation
    if (!question_id || typeof question_id !== 'string') {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }
    if (!answerBody || typeof answerBody !== 'string' || answerBody.trim().length < 30) {
      return NextResponse.json({ error: 'Answer must be at least 30 characters' }, { status: 400 })
    }
    if (answerBody.trim().length > 5000) {
      return NextResponse.json({ error: 'Answer must be under 5000 characters' }, { status: 400 })
    }

    // Verify auth server-side
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        },
      }
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to post an answer' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Verify question exists
    const { data: question, error: qError } = await supabase
      .from('community_questions')
      .select('id, answer_count')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Rate limit check
    const rateLimited = await checkAnswerRateLimit(supabase, user.id)
    if (rateLimited) {
      return NextResponse.json(
        { error: 'You have posted too many answers in the last hour. Please wait before posting again.' },
        { status: 429 }
      )
    }

    // Insert answer
    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('community_answers')
      .insert({
        question_id,
        user_id: user.id,
        body: answerBody.trim(),
        upvotes: 0,
        downvotes: 0,
        is_accepted: false,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('POST /api/answers insert error:', insertError)
      return NextResponse.json({ error: 'Failed to post answer. Please try again.' }, { status: 500 })
    }

    // ⚠️ CRITICAL — update last_activity_at on the question.
    // This is what powers the feed resurfacing "new reply" logic.
    // Also increment answer_count.
    const { error: updateError } = await supabase
      .from('community_questions')
      .update({
        last_activity_at: now,
        answer_count: (question.answer_count || 0) + 1,
        updated_at: now,
      })
      .eq('id', question_id)

    if (updateError) {
      // Answer was posted but the feed signal failed — log but don't fail the request
      console.error('POST /api/answers — failed to update last_activity_at:', updateError)
    }

    return NextResponse.json({ id: inserted.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/answers unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// REASON: Answer submission + retrieval. Auth verified server-side. Rate limit 10/hour.
//   Critical: updates last_activity_at + answer_count on parent question after insert.
//   This update powers the feed "new reply" resurfacing logic — never skip it.
// --- END CHANGE LOG ---
