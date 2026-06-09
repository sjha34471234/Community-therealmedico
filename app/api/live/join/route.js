// --- WHY THIS CODE EXISTS ---
// Viewer calls this before starting WebRTC.
// Phase 18A: everyone → Tier 1, Tree A, creator as parent.
// Phase 18B: distributes viewers across 4 trees in a factor-4 tier structure.
//   parent_one_id = null   → creator is parent (Tier 1 only)
//   parent_one_id = UUID   → another peer is parent (Tier 2+)

// --- WHAT THIS MADE WORK ---
// Phase 18A: viewer gets peer ID — tier 1, tree A
// Phase 18B: viewer gets tier + parent assignment across 4 trees (A/B/C/D)
//            Tier 1 peers connect directly to creator.
//            Tier 2+ peers connect to their assigned parent peer.

// --- PITFALLS ---
// ⚠️ WARNING: broadcast must be 'live' — returns 410 Gone if ended
// ⚠️ WARNING: parent_one_id = null means CREATOR is parent — Tier 1 only
// ⚠️ WARNING: parent_one_id = UUID means ANOTHER PEER is parent — Tier 2+
// ⚠️ WARNING: Clean up stale rows for this user BEFORE calling assignTierAndParent.
//             Stale rows skew the child-count calculation and cause wrong tier assignment.
// ⚠️ WARNING: MIN_KARMA_FOR_TIER enforced in Phase 18D. Not checked here yet.

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — simple join, tier 1 tree A
// [Jun 09, 2026] UPDATED: Phase 18B — tier assignment across 4 trees, parent assignment
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

// Assign a tier and parent for a new viewer joining this broadcast.
// Returns { tier_level, tree_assignment, parent_one_id }
// parent_one_id = null means creator is parent (Tier 1).
async function assignTierAndParent(supabase, broadcastId) {
  const TREES = ['A', 'B', 'C', 'D'];

  // Fetch all current peers for this broadcast
  const { data: existingPeers } = await supabase
    .from('stream_peers')
    .select('id, tier_level, tree_assignment, parent_one_id')
    .eq('broadcast_id', broadcastId);

  if (!existingPeers || existingPeers.length === 0) {
    // First viewer ever — Tree A, Tier 1, creator is parent
    return { tier_level: 1, tree_assignment: 'A', parent_one_id: null };
  }

  // Count peers per tree — pick the tree with fewest peers for load balance
  var treeCount = { A: 0, B: 0, C: 0, D: 0 };
  for (var i = 0; i < existingPeers.length; i++) {
    var tp = existingPeers[i].tree_assignment;
    if (treeCount[tp] !== undefined) treeCount[tp]++;
  }
  var targetTree = 'A';
  for (var t = 0; t < TREES.length; t++) {
    if (treeCount[TREES[t]] < treeCount[targetTree]) targetTree = TREES[t];
  }

  // Get peers in the target tree only
  var treePeers = existingPeers.filter(function(p) { return p.tree_assignment === targetTree; });

  // Check if there is still room for a direct Tier 1 connection to creator
  var tier1Count = treePeers.filter(function(p) { return p.tier_level === 1; }).length;
  if (tier1Count < LIVE_FACTOR) {
    return { tier_level: 1, tree_assignment: targetTree, parent_one_id: null };
  }

  // Build child-count map: how many children does each peer have?
  var childCount = {};
  for (var j = 0; j < treePeers.length; j++) { childCount[treePeers[j].id] = 0; }
  for (var k = 0; k < treePeers.length; k++) {
    var pid = treePeers[k].parent_one_id;
    if (pid && childCount[pid] !== undefined) childCount[pid]++;
  }

  // Sort by tier ascending — fill lower tiers first before going deeper
  var sorted = Array.from(treePeers).sort(function(a, b) { return a.tier_level - b.tier_level; });

  // First peer with an available child slot becomes the parent
  for (var m = 0; m < sorted.length; m++) {
    var parent = sorted[m];
    if ((childCount[parent.id] || 0) < LIVE_FACTOR) {
      return {
        tier_level:      parent.tier_level + 1,
        tree_assignment: targetTree,
        parent_one_id:   parent.id,
      };
    }
  }

  // All slots full — deep fallback (should not happen at normal scale)
  var maxTier = 0;
  for (var n = 0; n < treePeers.length; n++) {
    if (treePeers[n].tier_level > maxTier) maxTier = treePeers[n].tier_level;
  }
  return { tier_level: maxTier + 1, tree_assignment: targetTree, parent_one_id: null };
}

export async function POST(request) {
  const supabase = supabaseServer();
  const user = await getOptionalUser(request, supabase);

  var body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { broadcast_id, upload_bps, battery_pct, network_type, region } = body;
  if (!broadcast_id) return NextResponse.json({ error: 'broadcast_id required' }, { status: 400 });

  // Verify broadcast is live
  const { data: broadcast } = await supabase
    .from('live_broadcasts')
    .select('id, status, creator_id, title')
    .eq('id', broadcast_id)
    .single();

  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
  if (broadcast.status !== 'live') return NextResponse.json({ error: 'Broadcast has ended' }, { status: 410 });

  // Clean up stale rows for this user BEFORE tier assignment (stale rows skew child counts)
  if (user) {
    await supabase
      .from('stream_peers')
      .delete()
      .eq('broadcast_id', broadcast_id)
      .eq('user_id', user.id);
  }

  // Assign tier and parent
  const assignment = await assignTierAndParent(supabase, broadcast_id);

  // Fetch karma if logged in
  var karma_score = 0;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('karma_score')
      .eq('id', user.id)
      .single();
    if (profile && profile.karma_score) karma_score = profile.karma_score;
  }

  // Insert peer row
  const { data: peer, error } = await supabase
    .from('stream_peers')
    .insert({
      broadcast_id,
      user_id:         user ? user.id : null,
      tier_level:      assignment.tier_level,
      tree_assignment: assignment.tree_assignment,
      parent_one_id:   assignment.parent_one_id,
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
