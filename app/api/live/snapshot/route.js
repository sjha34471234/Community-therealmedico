// --- WHY THIS CODE EXISTS ---
// Stores viewer-reported snapshots of live streams for mod review.
// Called by LiveSnapshotAuditor.report() when a viewer taps "Report Stream".
// Snapshot data is a base64 JPEG at reduced resolution (~20-30KB).
// No auth required — broadcast_id + peer_id identify the source.

// --- WHAT THIS MADE WORK ---
// Phase 18D: mod team can review snapshots of reported live streams
//            Snapshots stored in live_snapshots table

// --- PITFALLS ---
// ⚠️ WARNING: snapshot_data is base64 JPEG stored as TEXT — large but infrequent
//             Max size expected ~40KB per snapshot after base64 encoding
// ⚠️ WARNING: No auth check — rate limiting is in LiveSnapshotAuditor (30s cooldown)
//             Server-side: limits to 1 snapshot per peer per 30s via DB check
// ⚠️ WARNING: broadcast_id verified to exist — rejects unknown broadcast IDs
// ⚠️ WARNING: snapshot_data can be empty string — snapshot captured before video loaded

// --- CHANGE LOG ---
// [Jun 10, 2026] CREATED: Phase 18D — snapshot storage endpoint
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  const supabase = supabaseServer();

  var body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { broadcast_id, peer_id, snapshot_data, reason } = body;

  if (!broadcast_id) return NextResponse.json({ error: 'broadcast_id required' }, { status: 400 });
  if (snapshot_data === undefined || snapshot_data === null) {
    return NextResponse.json({ error: 'snapshot_data required' }, { status: 400 });
  }

  // Verify broadcast exists
  const { data: broadcast } = await supabase
    .from('live_broadcasts')
    .select('id')
    .eq('id', broadcast_id)
    .single();

  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });

  // Rate limit: max 1 snapshot per peer per 30s
  if (peer_id) {
    const { data: recent } = await supabase
      .from('live_snapshots')
      .select('id, created_at')
      .eq('peer_id', peer_id)
      .gte('created_at', new Date(Date.now() - 30000).toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
  }

  // Insert snapshot
  const { error } = await supabase
    .from('live_snapshots')
    .insert({
      broadcast_id,
      peer_id:       peer_id   || null,
      snapshot_data: snapshot_data || '',
      reason:        reason    || 'viewer_report',
    });

  if (error) return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}
