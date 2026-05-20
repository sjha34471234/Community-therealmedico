// ============================================================
// FILE: app/api/answers/route.js
// PURPOSE: GET answers + POST new answer + accept answer
// LAST CHANGED: May 20, 2026
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { awardKarma } from '@/lib/karma'

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

async function checkAnswerRateLimit(db, userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await db
    .from('community_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)
  return (count || 0) >= 10
}

async function insertNotification(db, { userId, type, actorId, questionId, answerId }) {
  if (userId === actorId) return;
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

// ── GET ───────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('question_id')

    if (!questionId) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }

    const db = supabaseServer()

    const { data: answers, error } = await db
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

    const userIds = Array.from(new Set(
      (answers || []).map(function getId(a) { return a.user_id }).filter(Boolean)
    ))

    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, community_username, is_member')
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
        author_is_member: profile ? (profile.is_member || false) : false,
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

// ── POST ──────────────────────────────────────────────────────
export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // ── Accept answer ─────────────────────────────────────────
    if (body.action === 'accept') {
      const token = extractToken(request);
      const user = await getUserFromToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
      }

      const { answer_id, question_id } = body;
      if (!answer_id || !question_id) {
        return NextResponse.json({ error: 'answer_id and question_id required' }, { status: 400 });
      }

      const db = supabaseServer();

      const { data: question, error: qErr } = await db
        .from('community_questions')
        .select('id, user_id')
        .eq('id', question_id)
        .single();

      if (qErr || !question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }
      if (question.user_id !== user.id) {
        return NextResponse.json({ error: 'Only the question author can accept answers' }, { status: 403 });
      }

      await db.from('community_answers').update({ is_accepted: false }).eq('question_id', question_id);

      const { data: accepted, error: acceptErr } = await db
        .from('community_answers')
        .update({ is_accepted: true })
        .eq('id', answer_id)
        .select('id, user_id')
        .single();

      if (acceptErr) {
        return NextResponse.json({ error: 'Failed to accept answer' }, { status: 500 });
      }

      await db.from('community_questions').update({ is_answered: true }).eq('id', question_id);

      // Karma — answer author gets +15, question author gets +2
      if (accepted.user_id !== user.id) {
        await awardKarma({ userId: accepted.user_id, eventType: 'answer_accepted', sourceId: answer_id })
      }
      await awardKarma({ userId: user.id, eventType: 'answer_acceptor', sourceId: answer_id })

      await insertNotification(db, {
        userId: accepted.user_id,
        type: 'answer_accepted',
        actorId: user.id,
        questionId: question_id,
        answerId: answer_id,
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── New answer ────────────────────────────────────────────
    const { question_id, body: answerBody } = body

    if (!question_id || typeof question_id !== 'string') {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }
    if (!answerBody || typeof answerBody !== 'string' || answerBody.trim().length < 30) {
      return NextResponse.json({ error: 'Answer must be at least 30 characters' }, { status: 400 })
    }
    if (answerBody.trim().length > 5000) {
      return NextResponse.json({ error: 'Answer must be under 5000 characters' }, { status: 400 })
    }

    const token = extractToken(request);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to post an answer' }, { status: 401 })
    }

    const db = supabaseServer()

    const { data: question, error: qError } = await db
      .from('community_questions')
      .select('id, user_id, answer_count')
      .eq('id', question_id)
      .single()

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const rateLimited = await checkAnswerRateLimit(db, user.id)
    if (rateLimited) {
      return NextResponse.json(
        { error: 'You have posted too many answers in the last hour. Please wait before posting again.' },
        { status: 429 }
      )
    }

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await db
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

    const { error: updateError } = await db
      .from('community_questions')
      .update({
        last_activity_at: now,
        answer_count: (question.answer_count || 0) + 1,
        updated_at: now,
      })
      .eq('id', question_id)

    if (updateError) {
      console.error('POST /api/answers — failed to update last_activity_at:', updateError)
    }

    await insertNotification(db, {
      userId: question.user_id,
      type: 'new_answer',
      actorId: user.id,
      questionId: question_id,
      answerId: inserted.id,
    });

    return NextResponse.json({ id: inserted.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/answers unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// [May 18, 2026] UPDATED: Phase 10 — notifications + Bearer token + accept action
// [May 20, 2026] FIXED: awardKarma calls added for answer_accepted + answer_acceptor
// --- END CHANGE LOG ---
