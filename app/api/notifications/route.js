// ============================================================
// FILE: app/api/notifications/route.js
// PURPOSE: GET notifications for logged-in user, PATCH mark all read
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Bearer token auth pattern, never cookies
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// ── helpers ──────────────────────────────────────────────────

function extractToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getUserId(token) {
  if (!token) return null;
  const db = supabaseServer();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// ── GET /api/notifications ────────────────────────────────────
// ?unread=true  → returns { count } only (used by bell polling)
// ?unread=      → returns last 50 notifications with actor profile

export async function GET(request) {
  try {
    const token = extractToken(request);
    const userId = await getUserId(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const db = supabaseServer();

    // Bell polling — just the count
    if (unreadOnly) {
      const { count, error } = await db
        .from('community_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return NextResponse.json({ count: count || 0 }, { cache: 'no-store' });
    }

    // Full list — last 50 with actor username + question title
    const { data, error } = await db
      .from('community_notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        question_id,
        answer_id,
        actor:actor_id (
          id,
          community_username,
          is_member
        ),
        question:question_id (
          slug,
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ notifications: data || [] }, { cache: 'no-store' });

  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PATCH /api/notifications ──────────────────────────────────
// Marks all notifications as read for the logged-in user

export async function PATCH(request) {
  try {
    const token = extractToken(request);
    const userId = await getUserId(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const db = supabaseServer();
    const { error } = await db
      .from('community_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — notifications API
// REASON: Notification Centre feature
// --- END CHANGE LOG ---
