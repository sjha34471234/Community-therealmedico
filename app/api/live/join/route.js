// --- WHY THIS CODE EXISTS ---
// Viewer calls this before starting WebRTC.
// Creates a stream_peers row and returns the peer ID used in Realtime signaling.
// Phase 18A: simple join — everyone tier 1, tree A.
// Phase 18D: will add JWT admission gating and Sybil guard.

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer gets a peer ID to use as their identity in signaling messages

// --- PITFALLS ---
// ⚠️ WARNING: broadcast must be 'live' — returns 410 Gone if ended
// ⚠️ WARNING: user_id is optional — guests can watch (set null if no token)
// ⚠️ WARNING: deletes old peer rows for this user on this broadcast before inserting
//             handles reconnects and page refreshes without orphaned rows

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh join endpoint
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getOptionalUser(request, supabase) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request) {
  const supabase = supabaseServer();
  const user = await getOptionalUser(request, supabase);

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { broadcast_id } = body;
  if (!broadcast_id) return NextResponse.json({ error: 'broadcast_id required' }, { status: 400 });

  // Verify broadcast is live
  const { data: broadcast } = await supabase
    .from('live_broadcasts')
    .select('id, status, creator_id, title')
    .eq('id', broadcast_id)
    .single();

  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
  if (broadcast.status !== 'live') return NextResponse.json({ error: 'Broadcast has ended' }, { status: 410 });

  // Clean up any existing peer rows for this user on this broadcast (handles reconnects)
  if (user) {
    await supabase
      .from('stream_peers')
      .delete()
      .eq('broadcast_id', broadcast_id)
      .eq('user_id', user.id);
  }

  // Insert peer row — Phase 18A: tier 1, tree A for all viewers
  const { data: peer, error } = await supabase
    .from('stream_peers')
    .insert({
      broadcast_id,
      user_id: user ? user.id : null,
      tier_level: 1,
      tree_assignment: 'A',
    })
    .select()
    .single();

  if (error || !peer) {
    return NextResponse.json({ error: 'Failed to join broadcast' }, { status: 500 });
  }

  return NextResponse.json({ peer, broadcast }, { status: 201 });
}
