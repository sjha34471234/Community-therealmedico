// ============================================================
// FILE: app/api/votes/route.js
// PURPOSE: Handle upvote/downvote on questions and answers
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: VoteButton.jsx has been wired to this endpoint
//   since Phase 3. Handles insert, update, and removal of votes,
//   and updates the vote count on the parent question or answer.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Vote count is always recalculated from the
//   votes table — never manually incremented. Auth is always
//   verified server-side. Never trust user_id from request body.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Helper — create anon client with request cookies for auth check
function anonClientWithCookies(request) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Cookie: request.headers.get('cookie') ?? '' },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

// Service role client — bypasses RLS for vote writes
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(request) {
  try {
    // --- 1. Verify auth ---
    const anonClient = anonClientWithCookies(request)
    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
    }

    // --- 2. Parse body ---
    const body = await request.json()
    const { question_id, answer_id, vote_type } = body

    // vote_type must be 1 (up), -1 (down), or 0 (remove)
    if (![1, -1, 0].includes(vote_type)) {
      return NextResponse.json({ error: 'Invalid vote_type' }, { status: 400 })
    }

    // Must target either a question or an answer — not both, not neither
    if ((!question_id && !answer_id) || (question_id && answer_id)) {
      return NextResponse.json({ error: 'Provide either question_id or answer_id' }, { status: 400 })
    }

    const supabase = adminClient()
    const targetField = question_id ? 'question_id' : 'answer_id'
    const targetId = question_id ?? answer_id

    // --- 3. Check for existing vote ---
    const { data: existing } = await supabase
      .from('community_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq(targetField, targetId)
      .maybeSingle()

    // --- 4. Apply vote logic ---
    if (vote_type === 0 || (existing && existing.vote_type === vote_type)) {
      // Remove vote — either explicit 0 or clicking same vote again
      if (existing) {
        await supabase
          .from('community_votes')
          .delete()
          .eq('id', existing.id)
      }
    } else if (existing) {
      // Change vote direction (up→down or down→up)
      await supabase
        .from('community_votes')
        .update({ vote_type })
        .eq('id', existing.id)
    } else {
      // New vote
      const insertRow = {
        user_id: user.id,
        vote_type,
        [targetField]: targetId,
      }
      await supabase
        .from('community_votes')
        .insert(insertRow)
    }

    // --- 5. Recalculate vote totals from votes table ---
    const { data: voteTotals } = await supabase
      .from('community_votes')
      .select('vote_type')
      .eq(targetField, targetId)

    const upvotes = (voteTotals ?? []).filter(v => v.vote_type === 1).length
    const downvotes = (voteTotals ?? []).filter(v => v.vote_type === -1).length

    // --- 6. Write totals back to parent row ---
    const table = question_id ? 'community_questions' : 'community_answers'
    const idField = question_id ? 'id' : 'id'

    await supabase
      .from(table)
      .update({ upvotes, downvotes })
      .eq(idField, targetId)

    // --- 7. Return new totals + user's current vote state ---
    const { data: currentVote } = await supabase
      .from('community_votes')
      .select('vote_type')
      .eq('user_id', user.id)
      .eq(targetField, targetId)
      .maybeSingle()

    return NextResponse.json({
      upvotes,
      downvotes,
      userVote: currentVote?.vote_type ?? 0,
    })

  } catch (err) {
    console.error('[votes/route.js] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — votes API
// REASON: VoteButton.jsx wired to this endpoint since Phase 3,
//   needed the actual route to go live
// --- END CHANGE LOG ---
