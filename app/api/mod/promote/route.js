// --- WHY THIS CODE EXISTS ---
// Admin-only route for promoting a user to mod or demoting a mod back to regular user.
// This is the ONLY route that changes is_mod on profiles.
// Separated from action/route.js because promote/demote is admin-only —
// mods themselves cannot promote or demote anyone.

// --- WHAT THIS MADE WORK ---
// Promote button in ModSettings panel (admin only)
// Demote button on mod list in ModSettings panel (admin only)

// --- PITFALLS ---
// ⚠️ WARNING: isAdmin() check is MANDATORY — mods must never reach this route successfully
// ⚠️ WARNING: Admin cannot demote themselves — would lock out the entire mod system
// ⚠️ WARNING: Promoting a banned user is allowed — ban and mod status are independent
// ⚠️ WARNING: ADMIN_USER_ID must be set in Vercel env vars — without it isAdmin() always returns false

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MOD_ACTIONS, isAdmin } from '@/lib/modConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// ─────────────────────────────────────────
// HELPER — extract and verify bearer token
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
// GET — List all current mods
// Admin only — returns all profiles where is_mod = true
// ─────────────────────────────────────────

export async function GET(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Admin only
  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  const { data: mods, error } = await supabase
    .from('profiles')
    .select('id, community_username, is_mod, is_banned, community_joined_at')
    .eq('is_mod', true)
    .order('community_username', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load mod list' }, { status: 500 });
  }

  return NextResponse.json({ mods: mods || [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}


// ─────────────────────────────────────────
// POST — Promote or demote a user
// Body:
//   action         — 'promote' | 'demote'
//   target_user_id — UUID of the user to promote or demote
// ─────────────────────────────────────────

export async function POST(request) {
  const supabase = supabaseServer();

  // Auth
  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Admin only — this is the strictest check in the entire mod system
  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, target_user_id } = body;

  // Validate action
  if (!action || !['promote', 'demote'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be promote or demote' },
      { status: 400 }
    );
  }

  // Validate target
  if (!target_user_id || typeof target_user_id !== 'string') {
    return NextResponse.json(
      { error: 'target_user_id is required' },
      { status: 400 }
    );
  }

  // Admin cannot demote themselves
  if (action === 'demote' && isAdmin(target_user_id)) {
    return NextResponse.json(
      { error: 'The admin account cannot be demoted' },
      { status: 400 }
    );
  }

  // Cannot promote or demote yourself
  if (target_user_id === user.id && action === 'demote') {
    return NextResponse.json(
      { error: 'You cannot demote yourself' },
      { status: 400 }
    );
  }

  // Check target user exists
  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, community_username, is_mod')
    .eq('id', target_user_id)
    .single();

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Pointless action checks — give clear feedback
  if (action === 'promote' && targetProfile.is_mo
