// --- WHY THIS CODE EXISTS ---
// Viewer calls this before starting WebRTC.
// Creates a stream_peers row and returns peer ID, tier, and parent assignments.
// Phase 18A: simple join — tier 1, tree A.
// Phase 18B: distributes viewers across 4 trees, factor-4 tier structure.
// Phase 18C: assigns parent_two_id — backup parent for Tier 2+ peers.
// Phase 18D: accepts previous_peer_id — cleans up stale guest rows on reconnect.

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer gets peer ID, tier 1, tree A
// Phase 18B: tier + parent assignment across 4 trees
// Phase 18C: backup parent (parent_two_id) assigned for Tier 2+ peers
// Phase 18D: previous_peer_id cleanup — works for guests + all browsers

// --- PITFALLS ---
// ⚠️ WARNING: parent_one_id = null means CREATOR is parent (Tier 1 only)
// ⚠️ WARNING: parent_two_id = null for Tier 1 — creator is source, no relay backup
// ⚠️ WARNING: tier1Count < 1 — creator only connects to ONE peer per tree (4 total)
//             This caps creator upload at 4 × 500kbps = 2Mbps regardless of viewer count
//             DO NOT change to < LIVE_FACTOR — that caused creator overload (8Mbps+)
// ⚠️ WARNING: previous_peer_id cleanup uses eq('broadcast_id') as safety constraint
//             Prevents deleting rows from other broadcasts with a guessed UUID
// ⚠️ WARNING: Clean up stale rows BEFORE assignParents — stale rows skew child counts

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — simple join, tier 1 tree A
// [Jun 09, 2026] UPDATED: Phase 18B — tier assignment across 4 trees
// [Jun 10, 2026] UPDATED: Phase 18C — parent_two_id assignment for backup failover
// [Jun 10, 2026] UPDATED: Phase 18D — previous_peer_id cleanup for guest reconnects
//                REASON: guest rows were never cleaned up (cleanup was inside if(user) block)
//                causing duplicate peer rows and stale entries on page refresh
// [Jun 10, 2026] FIXED: tier1Count < 1 (was < LIVE_FACTOR)
//                REASON: < LIVE_FACTOR allowed 16 direct connections to creator (4 per tree × 4)
//                causing 8Mbps+ upload load on creator's phone. Correct: 1 per tree = 4 total = 2Mbps
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { LIVE_FACTOR } from '@/lib/liveConfig';

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

// Returns { tier_level, tree_assignment, parent_one_id, parent_two_id }
async function assignParents(supabase, broadcastId) {
  const TREES = ['A', 'B', 'C', 'D'];

  const { data: existingPeers } = await supabase
    .from('stream_peers')
    .select('id, tier_level, tree_assignment, parent_one_id')
    .eq('broadcast_id', broadcastId);

  if (!existingPeers || existingPeers.length === 0) {
    return { tier_level: 1, tree_assignment: 'A', parent_one_id: null, parent_two_id: null };
  }

  // Count peers per tree — assign to least-loaded tree
  var treeCount = { A: 0, B: 0, C: 0, D: 0 };
  for (var i = 0; i < existingPeers.length; i++) {
    var tp = existingPeers[i].tree_assignment;
    if (treeCount[tp] !== undefined) treeCount[tp]++;
  }
  var targetTree = 'A';
  for (var t = 0; t < TREES.length; t++) {
    if (treeCount[TREES[t]] < treeCount[targetTree]) targetTree = TREES[t];
  }

  var treePeers = existingPeers.filter(function(p) { return p.tree_assignment === targetTree; });

  // Build child-count map
  var childCount = {};
  for (var j = 0; j < treePeers.length; j++) { childCount[treePeers[j].id] = 0; }
  for (var k = 0; k < treePeers.length; k++) {
    var pid = treePeers[k].parent_one_id;
    if (pid && childCount[pid] !== undefined) childCount[pid]++;
  }

  // ⚠️ CRITICAL: tier1Count < 1 — creator connects to EXACTLY 1 peer per tree (4 total)
  // This caps creator's upload at 4 × 500kbps = 2Mbps. DO NOT change to < LIVE_FACTOR.
  var tier1Count = treePeers.filter(function(p) { return p.tier_level === 1; }).length;
  if (tier1Count < 1) {
    return { tier_level: 1, tree_assignment: targetTree, parent_one_id: null, parent_two_id: null };
  }

  // Find primary parent — lowest tier with available child slot
  var sorted = Array.from(treePeers).sort(function(a, b) { return a.tier_level - b.tier_level; });
  var parentOne = null;
  for (var m = 0; m < sorted.length; m++) {
    if ((childCount[sorted[m].id] || 0) < LIVE_FACTOR) {
      parentOne = sorted[m];
      break;
    }
  }

  if (!parentOne) {
    var maxTier = 0;
    for (var n = 0; n < treePeers.length; n++) {
      if (treePeers[n].tier_level > maxTier) maxTier = treePeers[n].tier_level;
    }
    return { tier_level: maxTier + 1, tree_assignment: targetTree, parent_one_id: null, parent_two_id: null };
  }

  // Find backup parent — same tier as parentOne, different peer, has available slot
  var parentTwo = null;
  for (var p = 0; p < sorted.length; p++) {
    var candidate = sorted[p];
    if (candidate.tier_level === parentOne.tier_level
      && candidate.id !== parentOne.id
      && (childCount[candidate.id] || 0) < LIVE_FACTOR) {
      parentTwo = candidate;
      break;
    }
  }

  return {
    tier_level:      parentOne.tier_level + 1,
    tree_assignment: targetTree,
    parent_one_id:   parentOne.id,
    parent_two_id:   parentTwo ? parentTwo.id : null,
  };
}

export async function POST(request) {
  const supabase = supabaseServer();
  const user = await getOptionalUser(request, supabase);

  var body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { broadcast_id, upload_bps, battery_pct, network_type, region, previous_peer_id } = body;
  if (!broadcast_id) return NextResponse.json({ error: 'broadcast_id required' }, { status: 400 });

  const { data: broadcast } = await supabase
    .from('live_broadcasts')
    .select('id, status, creator_id, title')
    .eq('id', broadcast_id)
    .single();

  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
  if (broadcast.status !== 'live') return NextResponse.json({ error: 'Broadcast has ended' }, { status: 410 });

  // Clean stale rows for logged-in users (existing — handles same-user multi-tab)
  if (user) {
    await supabase
      .from('stream_peers')
      .delete()
      .eq('broadcast_id', broadcast_id)
      .eq('user_id', user.id);
  }

  // Phase 18D: clean stale row by previous_peer_id — works for guests + all browsers
  // sessionStorage in LivePlayer sends this on reconnect/page-refresh
  // broadcast_id constraint prevents accidental cross-broadcast deletion
  if (previous_peer_id) {
    await supabase
      .from('stream_peers')
      .delete()
      .eq('id', previous_peer_id)
      .eq('broadcast_id', broadcast_id);
  }

  const assignment = await assignParents(supabase, broadcast_id);

  var karma_score = 0;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('karma_score')
      .eq('id', user.id)
      .single();
    if (profile && profile.karma_score) karma_score = profile.karma_score;
  }

  const { data: peer, error } = await supabase
    .from('stream_peers')
    .insert({
      broadcast_id,
      user_id:         user ? user.id : null,
      tier_level:      assignment.tier_level,
      tree_assignment: assignment.tree_assignment,
      parent_one_id:   assignment.parent_one_id,
      parent_two_id:   assignment.parent_two_id,
      upload_bps:      upload_bps   || 0,
      battery_pct:     battery_pct  !== undefined ? battery_pct : 100,
      network_type:    network_type || 'unknown',
      region:          region       || null,
      karma_score,
    })
    .select()
    .single();

  if (error || !peer) {
    return NextResponse.json({ error: 'Failed to join broadcast' }, { status: 500 });
  }

  return NextResponse.json({ peer, broadcast }, { status: 201 });
}
