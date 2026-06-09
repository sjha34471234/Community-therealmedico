// --- WHY THIS CODE EXISTS ---
// Allows viewers to update their peer capabilities after joining.
// Phase 18B: PATCH called once on join to report upload speed, battery, network.
// Phase 18D: PATCH called every 30s for live rebalancing.
// DELETE: called when viewer leaves cleanly.

// --- WHAT THIS MADE WORK ---
// Phase 18B: capability data written to stream_peers for future tier rebalancing

// --- PITFALLS ---
// ⚠️ WARNING: peer_id UUID returned from /api/live/join acts as the secret.
//             Not guessable — no auth header required for this endpoint.
// ⚠️ WARNING: PATCH never updates tier_level or parent_one_id — only capabilities.
//             Tier changes only happen via the rebalance algorithm (Phase 18D).

// --- CHANGE LOG ---
// [Jun 09, 2026] CREATED: Phase 18B — peer capability update + delete endpoint
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH — update peer capabilities (upload_bps, battery_pct, network_type)
export async function PATCH(request) {
  const supabase = supabaseServer();

  var body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { peer_id, upload_bps, battery_pct, network_type } = body;
  if (!peer_id) return NextResponse.json({ error: 'peer_id required' }, { status: 400 });

  var updates = {};
  if (upload_bps   !== undefined) updates.upload_bps   = upload_bps;
  if (battery_pct  !== undefined) updates.battery_pct  = battery_pct;
  if (network_type !== undefined) updates.network_type = network_type;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('stream_peers')
    .update(updates)
    .eq('id', peer_id);

  if (error) return NextResponse.json({ error: 'Failed to update peer' }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE — remove a peer row when viewer leaves
export async function DELETE(request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);
  const peer_id = searchParams.get('peer_id');
  if (!peer_id) return NextResponse.json({ error: 'peer_id required' }, { status: 400 });

  await supabase.from('stream_peers').delete().eq('id', peer_id);

  return NextResponse.json({ success: true });
}
