// ============================================================
// FILE: app/api/notifications/route.js
// PURPOSE: GET notifications for logged-in user, PATCH mark all read
// LAST CHANGED: May 22, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Bearer token auth pattern, never cookies
//                   actor_avatar is the raw avatarRow — resolved by Avatar.jsx
//                   Bulk avatar fetch uses actor IDs already present in data —
//                   never fetch one avatar per notification in a loop
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
// ?unread=      → returns last 50 notifications with actor profile + avatar
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

    if (!data || data.length === 0) {
      return NextResponse.json({ notifications: [] }, { cache: 'no-store' });
    }

    // --- WHY THIS CODE EXISTS ---
    // Fetch avatar rows for all actors in one bulk query.
    // NotificationBell shows actor avatar (xs, 28px) in the dropdown.
    // We collect all unique actor IDs from the notification list,
    // fetch their community_avatars rows in one query, build a map,
    // then attach actor_avatar to each notification.
    // ⚠️ WARNING: Never fetch avatars in a loop — always bulk query.
    const actorIds = Array.from(new Set(
      data.map(function getId(n) { return n.actor?.id; }).filter(Boolean)
    ));

    let avatarMap = {};
    if (actorIds.length > 0) {
      const { data: avatars } = await db
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .in('user_id', actorIds);
      if (avatars) {
        avatars.forEach(function mapA(a) {
          avatarMap[a.user_id] = {
            shape: a.shape,
            color: a.color,
            icon: a.icon,
            border: a.border,
            pattern: a.pattern,
          };
        });
      }
    }

    // Attach actor_avatar to each notification
    const withAvatars = data.map(function attachAvatar(n) {
      return {
        ...n,
        // actor_avatar is the raw avatarRow — passed into <Avatar avatarRow={...} />
        // null if actor has no row (trigger failure edge case) — Avatar handles safely
        actor_avatar: n.actor?.id ? (avatarMap[n.actor.id] || null) : null,
      };
    });

    return NextResponse.json({ notifications: withAvatars }, { cache: 'no-store' });

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
// [May 22, 2026] UPDATED: actor_avatar added to full notification list response.
// REASON: NotificationBell dropdown now shows actor avatar (xs, 28px) instead of
//         a generic type icon. Bulk query on community_avatars using actor IDs
//         already present in the notification data — zero extra per-row fetches.
// --- END CHANGE LOG ---
