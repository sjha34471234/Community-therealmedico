// --- WHY THIS CODE EXISTS ---
// Handles live broadcast lifecycle:
//   POST  — creator starts a new broadcast, gets broadcast ID back
//   GET   — anyone fetches broadcast info by ?id=... (viewer join page needs this)
//   PATCH — creator ends their broadcast (status → 'ended')

// --- WHAT THIS MADE WORK ---
// Phase 18A: creator starts/ends broadcasts. Viewer page fetches broadcast status on load.

// --- PITFALLS ---
// ⚠️ WARNING: POST auto-ends any existing live broadcasts for this creator first
//             Prevents ghost broadcasts if creator navigated away without ending
// ⚠️ WARNING: PATCH checks creator_id === user.id — only the creator can end their own broadcast
// ⚠️ WARNING: GET is public — no auth required. Viewer pages use this on mount.

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh broadcast CRUD
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

// POST — start a new broadcast
export async function POST(request) {
  const supabase = supabaseServer();
  const user = await getAuthedUser(request, supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const { title } = body;

  // Auto-end ghost broadcasts from this creator before creating a new one
  await supabase
    .from('live_broadcasts')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('creator_id', user.id)
    .eq('status', 'live');

  const { data: broadcast, error } = await supabase
    .from('live_broadcasts')
    .insert({ creator_id: user.id, title: title || null })
    .select()
    .single();

  if (error || !broadcast) {
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }

  return NextResponse.json({ broadcast }, { status: 201 });
}

// GET — fetch broadcast info by ?id=...
export async function GET(request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data: broadcast, error } = await supabase
    .from('live_broadcasts')
    .select('id, creator_id, stream_key, title, status, started_at, ended_at')
    .eq('id', id)
    .single();

  if (error || !broadcast) {
    return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
  }

  // Attach creator username — fetched separately (never join via query builder)
  let creator_username = 'unknown';
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_username')
    .eq('id', broadcast.creator_id)
    .single();
  if (profile) creator_username = profile.community_username;

  return NextResponse.json(
    { broadcast: { ...broadcast, creator_username } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// PATCH — end a broadcast
export async function PATCH(request) {
  const supabase = supabaseServer();
  const user = await getAuthedUser(request, supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { broadcast_id } = body;
  if (!broadcast_id) return NextResponse.json({ error: 'broadcast_id required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('live_broadcasts')
    .select('id, creator_id, status')
    .eq('id', broadcast_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
  if (existing.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (existing.status === 'ended') return NextResponse.json({ broadcast: existing });

  const { data: updated, error } = await supabase
    .from('live_broadcasts')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', broadcast_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to end broadcast' }, { status: 500 });

  return NextResponse.json({ broadcast: updated });
}
