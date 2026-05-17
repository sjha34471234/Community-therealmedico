// ============================================================
// FILE: app/api/follows/route.js
// PURPOSE: Follow/unfollow toggle + follower/following list endpoints
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Phase 9 — follows system. Single route handles
//                all follow operations for the community_follows table.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Users cannot follow themselves — enforced here
//                   server-side AND hidden client-side (rule #48).
//                   POST is auth-required. GET is public.
//                   Always call supabaseServer() inside handler —
//                   never at module level (rule #34).
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// ─── Helper: extract and verify Bearer token ─────────────────
async function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// ─── POST /api/follows ───────────────────────────────────────
// Body: { following_id: string }
// Toggles follow/unfollow. Auth required.
// Returns: { following: boolean, follower_count: number }
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const { following_id } = body;

    if (!following_id) {
      return NextResponse.json({ error: 'following_id is required' }, { status: 400 });
    }

    // Cannot follow yourself — enforced server-side
    if (user.id === following_id) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Check if follow already exists
    const { data: existing } = await supabase
      .from('community_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .maybeSingle();

    let following;

    if (existing) {
      // Already following — unfollow
      const { error: deleteError } = await supabase
        .from('community_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id);

      if (deleteError) throw deleteError;
      following = false;
    } else {
      // Not following — follow
      const { error: insertError } = await supabase
        .from('community_follows')
        .insert({ follower_id: user.id, following_id });

      if (insertError) throw insertError;
      following = true;
    }

    // Return updated follower count for the target user
    const { count } = await supabase
      .from('community_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', following_id);

    return NextResponse.json({ following, follower_count: count ?? 0 });

  } catch (err) {
    console.error('POST /api/follows error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── GET /api/follows ────────────────────────────────────────
// Three modes:
//   ?user_id=...&type=followers     → list of people following user
//   ?user_id=...&type=following     → list of people user follows
//   ?follower_id=...&following_id=. → boolean: is follower following target?
// All public — no auth required.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const type = searchParams.get('type');
    const follower_id = searchParams.get('follower_id');
    const following_id = searchParams.get('following_id');

    const supabase = supabaseServer();

    // Mode 3: check if one user follows another
    if (follower_id && following_id) {
      const { data } = await supabase
        .from('community_follows')
        .select('id')
        .eq('follower_id', follower_id)
        .eq('following_id', following_id)
        .maybeSingle();

      return NextResponse.json({ following: !!data }, { cache: 'no-store' });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (type === 'followers') {
      // People who follow this user
      const { data, error } = await supabase
        .from('community_follows')
        .select(`
          follower_id,
          profiles!community_follows_follower_id_fkey (
            id,
            community_username,
            community_bio,
            is_member
          )
        `)
        .eq('following_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const followers = (data || []).map((row) => row.profiles).filter(Boolean);
      return NextResponse.json({ followers }, { cache: 'no-store' });
    }

    if (type === 'following') {
      // People this user follows
      const { data, error } = await supabase
        .from('community_follows')
        .select(`
          following_id,
          profiles!community_follows_following_id_fkey (
            id,
            community_username,
            community_bio,
            is_member
          )
        `)
        .eq('follower_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const following = (data || []).map((row) => row.profiles).filter(Boolean);
      return NextResponse.json({ following }, { cache: 'no-store' });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (err) {
    console.error('GET /api/follows error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 9 — follows API
// REASON: Community needs follow/unfollow functionality.
//         Single route handles toggle, list, and status check.
//         Self-follow blocked server-side per rule #48.
// --- END CHANGE LOG ---
