// --- WHY THIS CODE EXISTS ---
// Returns the list of currently active bans for the BannedUsers.jsx panel.
// "Active" means lifted_at IS NULL — bans that have been lifted are excluded.
// Attaches the banned user's username to each row for display.
// Mod/admin only — regular users cannot access this route.

// --- WHAT THIS MADE WORK ---
// BannedUsers.jsx panel inside ModSettings — list of active bans with unban button

// --- PITFALLS ---
// ⚠️ WARNING: Only returns bans where lifted_at IS NULL — lifted bans are history only
// ⚠️ WARNING: Mod/admin only — always check isModerator() before returning data
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: Does NOT auto-lift expired temporary bans — that is a future task
//             Expired temporary bans still show here until manually unbanned
//             A future cron job or Supabase scheduled function can handle auto-lift

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system — bonus route for BannedUsers.jsx
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { isModerator } from '@/lib/modConfig';

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
// GET — return all active bans
// Active = lifted_at IS NULL
// ─────────────────────────────────────────

export async function GET(request) {
  const supabase = supabaseServer();

  // Auth
  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Permission — mod or admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_mod, is_banned')
    .eq('id', user.id)
    .single();

  if (!isModerator(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch active bans — lifted_at IS NULL means ban is still in effect
  const { data: bans, error } = await supabase
    .from('community_banned_users')
    .select('id, user_id, banned_by, reason, ban_type, expires_at, created_at')
    .is('lifted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load banned users' }, { status: 500 });
  }

  if (!bans || bans.length === 0) {
    return NextResponse.json({ bans: [] }, { status: 200 });
  }

  // Attach usernames — bulk fetch profiles for all banned user_ids
  const userIds = Array.from(new Set(bans.map(b => b.user_id).filter(Boolean)));

  let usernameMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username')
      .in('id', userIds);

    if (profiles) {
      for (const p of profiles) {
        usernameMap[p.id] = p.community_username;
      }
    }
  }

  // Attach banned_by username too — so mods can see who issued the ban
  const bannedByIds = Array.from(new Set(bans.map(b => b.banned_by).filter(Boolean)));
  let bannedByMap = {};
  if (bannedByIds.length > 0) {
    const { data: modProfiles } = await supabase
      .from('profiles')
      .select('id, community_username')
      .in('id', bannedByIds);

    if (modProfiles) {
      for (const p of modProfiles) {
        bannedByMap[p.id] = p.community_username;
      }
    }
  }

  // Build final response
  const enriched = bans.map(b => ({
    id:               b.id,
    user_id:          b.user_id,
    username:         usernameMap[b.user_id] || 'unknown',
    banned_by:        b.banned_by,
    banned_by_username: bannedByMap[b.banned_by] || 'unknown',
    reason:           b.reason || null,
    ban_type:         b.ban_type,
    expires_at:       b.expires_at || null,
    created_at:       b.created_at,
  }));

  return NextResponse.json(
    { bans: enriched },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
