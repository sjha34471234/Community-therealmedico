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

async function getAuthedUser(request, supabase) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

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

export async function POST(request) {
  const supabase = supabaseServer();

  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, target_user_id } = body;

  if (!action || !['promote', 'demote'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be promote or demote' },
      { status: 400 }
    );
  }

  if (!target_user_id || typeof target_user_id !== 'string') {
    return NextResponse.json(
      { error: 'target_user_id is required' },
      { status: 400 }
    );
  }

  if (action === 'demote' && isAdmin(target_user_id)) {
    return NextResponse.json(
      { error: 'The admin account cannot be demoted' },
      { status: 400 }
    );
  }

  if (target_user_id === user.id && action === 'demote') {
    return NextResponse.json(
      { error: 'You cannot demote yourself' },
      { status: 400 }
    );
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, community_username, is_mod')
    .eq('id', target_user_id)
    .single();

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (action === 'promote' && targetProfile.is_mod) {
    return NextResponse.json(
      { error: targetProfile.community_username + ' is already a moderator' },
      { status: 409 }
    );
  }

  if (action === 'demote' && !targetProfile.is_mod) {
    return NextResponse.json(
      { error: targetProfile.community_username + ' is not a moderator' },
      { status: 409 }
    );
  }

  const newModStatus = action === 'promote';

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_mod: newModStatus })
    .eq('id', target_user_id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to ' + action + ' user' },
      { status: 500 }
    );
  }

  try {
    await supabase
      .from('community_mod_actions')
      .insert({
        mod_id:         user.id,
        action_type:    action === 'promote' ? MOD_ACTIONS.PROMOTE : MOD_ACTIONS.DEMOTE,
        target_user_id: target_user_id,
        note:           action === 'promote' ? 'Promoted to moderator' : 'Removed moderator status',
      });
  } catch {
    // Audit log failure should never block the main action
  }

  return NextResponse.json({
    success:  true,
    action:   action,
    username: targetProfile.community_username,
    is_mod:   newModStatus,
  });
}
