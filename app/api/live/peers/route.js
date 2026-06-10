// --- WHY THIS CODE EXISTS ---
// Allows viewers to update their peer capabilities after joining.
// Phase 18B: PATCH called once on join to report upload speed, battery, network.
// Phase 18D: PATCH called every 30s for live rebalancing.
//            Now tracks download_bps alongside upload_bps.
// DELETE: called when viewer leaves cleanly.

// --- WHAT THIS MADE WORK ---
// Phase 18B: capability data written to stream_peers for future tier rebalancing
// Phase 18D: download_bps tracked — relay peers need download to receive before relaying

// --- PITFALLS ---
// ⚠️ WARNING: peer_id UUID returned from /api/live/join acts as the secret.
//             Not guessable — no auth header required for this endpoint.
// ⚠️ WARNING: PATCH never updates tier_level or parent_one_id — only capabilities.
//             Tier changes only happen via the rebalance algorithm (Phase 18D).
// ⚠️ WARNING: download_bps column must exist in stream_peers before deploying this.
//             Run: ALTER TABLE stream_peers ADD COLUMN download_bps BIGINT DEFAULT 0;

// --- CHANGE LOG ---
// [Jun 09, 2026] CREATED: Phase 18B — peer capability update + delete endpoint
// [Jun 10, 2026] UPDATED: Phase 18D — added download_bps tracking
//                REASON: relay peers need sufficient download to receive the stream
//                before they can relay it. upload_bps alone was incomplete.
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH — update peer capabilities
export async function PATCH(request) {
  const supabase = supabaseServer();

  var body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { peer_id, upload_bps, download_bps, battery_pct, network_type } = body;
  if (!peer_id) return NextResponse.json({ error: 'peer_id required' }, { status: 400 });

  var updates = {};
  if (upload_bps   !== undefined) updates.upload_bps   = upload_bps;
  if (download_bps !== undefined) updates.download_bps = download_bps;
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
