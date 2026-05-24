// --- WHY THIS CODE EXISTS ---
// Manages the block relationship between users.
// GET    — check if the current user has blocked someone (or is blocked by them)
// POST   — block a user
// DELETE — unblock a user
//
// Blocks are one-way but checked both ways:
//   A blocks B → B cannot DM A, B's content is filtered from A's feed
//   B does NOT know they are blocked — no notification, no error message

// --- WHAT THIS MADE WORK ---
// BlockButton.jsx on profile pages and DM conversation header
// DM route block check — prevents sending messages to someone who blocked you
// Feed filtering — blocked users' content hidden from each other

// --- PITFALLS ---
// ⚠️ WARNING: GET checks BOTH directions — A blocked B OR B blocked A
// ⚠️ WARNING: POST and DELETE only act on the current user as blocker
//             A user can only manage their own blocks — never someone else's
// ⚠️ WARNING: Blocking does not delete existing DM messages — just prevents new ones
// ⚠️ WARNING: Blocking does not unfollow — follows are left intact
//             If you want to add unfollow-on-block, do it in a future phase
// ⚠️ WARNING: Never tell the blocked user they are blocked — isBlocked response
//             is only returned to the blocker, never to the blocked party

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { isBanned } from '@/lib/modConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// ─────────────────────────────────────────
// HELPER — extract and verify bearer token
// Returns user object or null
// ─────────────────────────────────────────

async function getAuthedUser(request, supabase) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}


// ─────────────────────────────────────────
// GET — Check block status between current user and a target
// Query params:
//   target_id — UUID of the other user
//
// Returns:
//   { blocked_by_me: bool, blocked_by_them: bool, either_blocked: bool }
//
// blocked_by_me    — current user has blocked target
// blocked_by_them  — target has blocked current user
// either_blocked   — true if either direction is blocked
//
// ⚠️ WARNING: Only return this data to the current user (the requester)
//             Never expose blocked_by_them to the target user themselves
// ─────────────────────────────────────────

export async function GET(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('target_id');

  if (!targetId || typeof targetId !== 'string') {
    return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
  }

  // Cannot check block status with yourself
  if (targetId === user.id) {
    return NextResponse.json({
      blocked_by_me:   false,
      blocked_by_them: false,
      either_blocked:  false,
    });
  }

  // Check both directions in one query
  const { data: blocks, error } = await supabase
    .from('community_blocks')
    .select('blocker_id, blocked_id')
    .or(
      'and(blocker_id.eq.' + user.id + ',blocked_id.eq.' + targetId + '),' +
      'and(blocker_id.eq.' + targetId + ',blocked_id.eq.' + user.id + ')'
    );

  if (error) {
    return NextResponse.json({ error: 'Failed to check block status' }, { status: 500 });
  }

  const blockedByMe = (blocks || []).some(
    b => b.blocker_id === user.id && b.blocked_id === targetId
  );

  const blockedByThem = (blocks || []).some(
    b => b.blocker_id === targetId && b.blocked_id === user.id
  );

  return NextResponse.json({
    blocked_by_me:   blockedByMe,
    blocked_by_them: blockedByThem,
    either_blocked:  blockedByMe || blockedByThem,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}


// ─────────────────────────────────────────
// POST — Block a user
// Body: { target_id: string }
// ─────────────────────────────────────────

export async function POST(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Sign in to block users' }, { status: 401 });
  }

  // Banned users cannot block
  const banned = await isBanned(supabase, user.id);
  if (banned) {
    return NextResponse.json(
      { error: 'Your account has been suspended' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { target_id } = body;

  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
  }

  // Cannot block yourself
  if (target_id === user.id) {
    return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
  }

  // Check target user exists
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, community_username')
    .eq('id', target_id)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Insert block — UNIQUE constraint handles duplicate silently via conflict
  const { data: block, error: insertError } = await supabase
    .from('community_blocks')
    .insert({
      blocker_id: user.id,
      blocked_id: target_id,
    })
    .select()
    .single();

  if (insertError) {
    // Unique constraint — already blocked
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already blocked this user' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }

  return NextResponse.json(
    {
      success:          true,
      blocked_id:       target_id,
      blocked_username: targetProfile.community_username,
    },
    { status: 201 }
  );
}


// ─────────────────────────────────────────
// DELETE — Unblock a user
// Body: { target_id: string }
// ─────────────────────────────────────────

export async function DELETE(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { target_id } = body;

  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
  }

  // Check the block actually exists before trying to delete
  const { data: existing } = await supabase
    .from('community_blocks')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', target_id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: 'You have not blocked this user' },
      { status: 404 }
    );
  }

  const { error: deleteError } = await supabase
    .from('community_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', target_id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }

  return NextResponse.json({
    success:    true,
    unblocked:  target_id,
  });
}
