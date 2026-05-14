// ============================================================
// FILE: app/api/questions/route.js
// PURPOSE: GET — returns paginated question list for the feed
//          Hottest first by default (upvotes + recent activity)
//          For logged-in users: filters out already-viewed posts
//          unless new activity happened after the user viewed it
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Homepage feed and future tag/search pages
//               all fetch from this single endpoint
// DEPENDENCIES: lib/supabase.js, community_questions table,
//               community_post_views table
// ⚠️ DO NOT CHANGE: cache: 'no-store' must stay — this returns
//                   live data, never cache it
//                   Public GET requires no auth check
//                   Never return user emails or auth data
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Server-side Supabase client — uses anon key (RLS handles security)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Query params
    const sort = searchParams.get('sort') || 'hot';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;
    const userId = searchParams.get('userId') || null;

    const supabase = getSupabase();

    // ─── Fetch questions ─────────────────────────────────────

    let query = supabase
      .from('community_questions')
      .select('id, slug, title, body, tags, upvotes, view_count, answer_count, is_answered, is_pinned, last_activity_at, created_at, user_id')
      .range(offset, offset + limit - 1);

    if (sort === 'hot') {
      query = query.order('upvotes', { ascending: false }).order('last_activity_at', { ascending: false });
    } else if (sort === 'new') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'top') {
      query = query.order('upvotes', { ascending: false });
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ questions: [], hasMore: false });
    }

    // ─── Viewed post filtering (logged-in users only) ────────

    let processedQuestions = questions;

    if (userId) {
      const questionIds = questions.map(function(q) { return q.id; });

      const { data: views } = await supabase
        .from('community_post_views')
        .select('question_id, activity_snapshot')
        .eq('user_id', userId)
        .in('question_id', questionIds);

      if (views && views.length > 0) {
        // Build a map of question_id → activity_snapshot at time of viewing
        const viewMap = {};
        views.forEach(function(v) {
          viewMap[v.question_id] = v.activity_snapshot;
        });

        processedQuestions = questions.map(function(q) {
          const viewedAt = viewMap[q.id];

          if (!viewedAt) {
            // Never viewed — show normally
            return { ...q, isViewed: false, hasNewActivity: false };
          }

          // Check if new activity happened after the user viewed it
          const hasNewActivity = new Date(q.last_activity_at) > new Date(viewedAt);

          if (hasNewActivity) {
            // Resurface with highlight flag
            return { ...q, isViewed: true, hasNewActivity: true };
          }

          // Already viewed, no new activity — exclude from feed
          return null;
        }).filter(function(q) { return q !== null; });
      } else {
        // No views on record — show all normally
        processedQuestions = questions.map(function(q) {
          return { ...q, isViewed: false, hasNewActivity: false };
        });
      }
    } else {
      // Guest — show all, no view tracking
      processedQuestions = questions.map(function(q) {
        return { ...q, isViewed: false, hasNewActivity: false };
      });
    }

    // ─── Fetch display names from profiles ───────────────────

    const userIds = Array.from(new Set(
      processedQuestions
        .map(function(q) { return q.user_id; })
        .filter(Boolean)
    ));

    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, community_username')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach(function(p) {
          profileMap[p.id] = p.community_username || 'Anonymous';
        });
      }
    }

    // Attach display name, strip user_id from response
    const safeQuestions = processedQuestions.map(function(q) {
      return {
        id: q.id,
        slug: q.slug,
        title: q.title,
        body: q.body ? q.body.slice(0, 200) : '',
        tags: q.tags || [],
        upvotes: q.upvotes,
        view_count: q.view_count,
        answer_count: q.answer_count,
        is_answered: q.is_answered,
        is_pinned: q.is_pinned,
        last_activity_at: q.last_activity_at,
        created_at: q.created_at,
        author: profileMap[q.user_id] || 'Anonymous',
        isViewed: q.isViewed,
        hasNewActivity: q.hasNewActivity,
      };
    });

    return NextResponse.json({
      questions: safeQuestions,
      hasMore: questions.length === limit,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (err) {
    console.error('API route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Homepage feed needs paginated, sorted question list
//         with viewed-post filtering for logged-in users
// --- END CHANGE LOG ---
