// ============================================================
// FILE: app/api/votes/route.js
// PURPOSE: Handle upvote/downvote on questions and answers
// LAST CHANGED: May 20, 2026
// ============================================================

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabaseServer'
import { awardKarma } from '@/lib/karma'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function extractToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getUserFromToken(token) {
  if (!token) return null;
  const db = supabaseServer();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function insertNotification(db, { userId, type, actorId, questionId, answerId }) {
  if (!userId || userId === actorId) return;
  try {
    await db.from('community_notifications').insert({
      user_id: userId,
      type,
      actor_id: actorId,
      question_id: questionId || null,
      answer_id: answerId || null,
    });
  } catch (err) {
    console.error('insertNotification error:', err);
  }
}

// ── GET /api/votes ────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const question_id = searchParams.get('question_id')
    const answer_id = searchParams.get('answer_id')

    if (!question_id && !answer_id) {
      return NextResponse.json({ error: 'Provide question_id or answer_id' }, { status: 400 })
    }

    const db = supabaseServer()
    const targetField = question_id ? 'question_id' : 'answer_id'
    const targetId = question_id ?? answer_id
    const table = question_id ? 'community_questions' : 'community_answers'

    const { data: row } = await db
      .from(table)
      .select('upvotes, downvotes')
      .eq('id', targetId)
      .single()

    let userVote = null
    const token = extractToken(request)
    if (token) {
      const user = await getUserFromToken(token)
      if (user) {
        const { data: vote } = await db
          .from('community_votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq(targetField, targetId)
          .maybeSingle()
        userVote = vote?.vote_type ?? null
      }
    }

    return NextResponse.json({
      upvotes: row?.upvotes ?? 0,
      downvotes: row?.downvotes ?? 0,
      userVote,
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (err) {
    console.error('[votes/route.js] GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST /api/votes ───────────────────────────────────────────
export async function POST(request) {
  try {
    const token = extractToken(request);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
    }

    const body = await request.json()
    const { question_id, answer_id, vote_type } = body

    if (![1, -1, 0].includes(vote_type)) {
      return NextResponse.json({ error: 'Invalid vote_type' }, { status: 400 })
    }

    if ((!question_id && !answer_id) || (question_id && answer_id)) {
      return NextResponse.json({ error: 'Provide either question_id or answer_id' }, { status: 400 })
    }

    const db = supabaseServer()
    const targetField = question_id ? 'question_id' : 'answer_id'
    const targetId = question_id ?? answer_id

    // Check for existing vote
    const { data: existing } = await db
      .from('community_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq(targetField, targetId)
      .maybeSingle()

    const prevVoteType = existing?.vote_type ?? null
    const isNewUpvote = vote_type === 1 && !existing
    const isNewDownvote = vote_type === -1 && !existing
    const isRemovingUpvote = vote_type === 0 && prevVoteType === 1
    const isRemovingDownvote = vote_type === 0 && prevVoteType === -1
    const isChangingToUpvote = vote_type === 1 && prevVoteType === -1
    const isChangingToDownvote = vote_type === -1 && prevVoteType === 1

    // Apply vote logic
    if (vote_type === 0 || (existing && existing.vote_type === vote_type)) {
      if (existing) {
        await db.from('community_votes').delete().eq('id', existing.id)
      }
    } else if (existing) {
      await db.from('community_votes').update({ vote_type }).eq('id', existing.id)
    } else {
      const insertRow = { user_id: user.id, vote_type, [targetField]: targetId }
      await db.from('community_votes').insert(insertRow)
    }

    // Recalculate vote totals
    const { data: voteTotals } = await db
      .from('community_votes')
      .select('vote_type')
      .eq(targetField, targetId)

    const upvotes = (voteTotals ?? []).filter(function isUp(v) { return v.vote_type === 1 }).length
    const downvotes = (voteTotals ?? []).filter(function isDown(v) { return v.vote_type === -1 }).length

    const table = question_id ? 'community_questions' : 'community_answers'
    await db.from(table).update({ upvotes, downvotes }).eq('id', targetId)

    // ── Get content owner for karma ───────────────────────────
    let ownerId = null
    if (question_id) {
      const { data: q } = await db.from('community_questions').select('user_id').eq('id', question_id).single()
      ownerId = q?.user_id || null
    } else {
      const { data: a } = await db.from('community_answers').select('user_id').eq('id', answer_id).single()
      ownerId = a?.user_id || null
    }

    // ── Award karma based on vote change ─────────────────────
    if (ownerId && ownerId !== user.id) {
      if (isNewUpvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_upvoted' : 'answer_upvoted', sourceId: targetId })
      }
      if (isNewDownvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_downvoted' : 'answer_downvoted', sourceId: targetId })
        await awardKarma({ userId: user.id, eventType: 'downvote_cast', sourceId: targetId })
      }
      if (isRemovingUpvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_downvoted' : 'answer_downvoted', sourceId: targetId })
      }
      if (isRemovingDownvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_upvoted' : 'answer_upvoted', sourceId: targetId })
      }
      if (isChangingToUpvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_upvoted' : 'answer_upvoted', sourceId: targetId })
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_upvoted' : 'answer_upvoted', sourceId: targetId })
      }
      if (isChangingToDownvote) {
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_downvoted' : 'answer_downvoted', sourceId: targetId })
        await awardKarma({ userId: ownerId, eventType: question_id ? 'question_downvoted' : 'answer_downvoted', sourceId: targetId })
      }
    }

    // ── Notify on new upvote only ─────────────────────────────
    if (isNewUpvote) {
      if (question_id) {
        const { data: q } = await db.from('community_questions').select('user_id').eq('id', question_id).single()
        if (q?.user_id) {
          await insertNotification(db, { userId: q.user_id, type: 'upvote_question', actorId: user.id, questionId: question_id, answerId: null })
        }
      } else {
        const { data: a } = await db.from('community_answers').select('user_id, question_id').eq('id', answer_id).single()
        if (a?.user_id) {
          await insertNotification(db, { userId: a.user_id, type: 'upvote_answer', actorId: user.id, questionId: a.question_id, answerId: answer_id })
        }
      }
    }

    // Bust ISR cache
    if (question_id) {
      const { data: q } = await db.from('community_questions').select('slug').eq('id', question_id).single()
      if (q?.slug) revalidatePath('/q/' + q.slug)
    }

    const { data: currentVote } = await db
      .from('community_votes')
      .select('vote_type')
      .eq('user_id', user.id)
      .eq(targetField, targetId)
      .maybeSingle()

    return NextResponse.json({ upvotes, downvotes, userVote: currentVote?.vote_type ?? 0 })

  } catch (err) {
    console.error('[votes/route.js] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4
// [May 18, 2026] UPDATED: Phase 10 — notifications + Bearer token auth
// [May 20, 2026] FIXED: GET + POST return downvotes. revalidatePath added.
// [May 20, 2026] FIXED: awardKarma calls added for all vote change scenarios
// --- END CHANGE LOG ---
