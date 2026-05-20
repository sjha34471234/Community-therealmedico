// ============================================================
// FILE: app/api/votes/route.js
// PURPOSE: Handle upvote/downvote on questions and answers
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: VoteButton.jsx has been wired to this endpoint
//   since Phase 3. Handles insert, update, and removal of votes,
//   and updates the vote count on the parent question or answer.
//   Phase 10: inserts upvote_question / upvote_answer notifications.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Vote count is always recalculated from the
//   votes table — never manually incremented. Auth is always
//   verified server-side. Never trust user_id from request body.
//   Never notify yourself — skip if actor_id === user_id.
// ============================================================
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// ── helpers ───────────────────────────────────────────────────

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

// ── Insert notification (safe — never throws) ─────────────────
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

// ── POST ──────────────────────────────────────────────────────
export async function POST(request) {
  try {
    // --- 1. Verify auth via Bearer token ---
    const token = extractToken(request);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
    }

    // --- 2. Parse body ---
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

    // --- 3. Check for existing vote ---
    const { data: existing } = await db
      .from('community_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq(targetField, targetId)
      .maybeSingle()

    // Was this a brand new upvote (not a change or removal)?
    const isNewUpvote = vote_type === 1 && !existing;

    // --- 4. Apply vote logic ---
    if (vote_type === 0 || (existing && existing.vote_type === vote_type)) {
      // Remove vote
      if (existing) {
        await db
          .from('community_votes')
          .delete()
          .eq('id', existing.id)
      }
    } else if (existing) {
      // Change vote direction
      await db
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
      await db
        .from('community_votes')
        .insert(insertRow)
    }

    // --- 5. Recalculate vote totals ---
    const { data: voteTotals } = await db
      .from('community_votes')
      .select('vote_type')
      .eq(targetField, targetId)

    const upvotes = (voteTotals ?? []).filter(function isUp(v) { return v.vote_type === 1 }).length
    const downvotes = (voteTotals ?? []).filter(function isDown(v) { return v.vote_type === -1 }).length

    // --- 6. Write totals back to parent row ---
    const table = question_id ? 'community_questions' : 'community_answers'
    await db
      .from(table)
      .update({ upvotes, downvotes })
      .eq('id', targetId)

    // --- 7. Notify on new upvote only ---
    if (isNewUpvote) {
      if (question_id) {
        // Find question owner
        const { data: q } = await db
          .from('community_questions')
          .select('user_id')
          .eq('id', question_id)
          .single();
        if (q?.user_id) {
          await insertNotification(db, {
            userId: q.user_id,
            type: 'upvote_question',
            actorId: user.id,
            questionId: question_id,
            answerId: null,
          });
        }
      } else {
        // Find answer owner + its question_id for the link
        const { data: a } = await db
          .from('community_answers')
          .select('user_id, question_id')
          .eq('id', answer_id)
          .single();
        if (a?.user_id) {
          await insertNotification(db, {
            userId: a.user_id,
            type: 'upvote_answer',
            actorId: user.id,
            questionId: a.question_id,
            answerId: answer_id,
          });
        }
      }
    }

    // Bust ISR cache for the question page so refresh shows correct count
    if (question_id) {
      const { data: q } = await db
        .from('community_questions')
        .select('slug')
        .eq('id', question_id)
        .single()
      if (q?.slug) revalidatePath('/q/' + q.slug)
    }

    // --- 8. Return new totals + user's current vote state ---
    const { data: currentVote } = await db
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
// REASON: VoteButton.jsx wired to this endpoint since Phase 3.
// [May 18, 2026] UPDATED: Phase 10
// REASON: Added upvote_question + upvote_answer notification inserts.
//         Switched to Bearer token auth + named supabaseServer import.
//         Only notifies on brand new upvotes — not on vote changes or removals.
// --- END CHANGE LOG ---
