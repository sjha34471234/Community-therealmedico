// --- WHY THIS CODE EXISTS ---
// Two jobs:
//   GET  — returns the mod queue (all pending reports) for mods and admin only
//   POST — lets any signed-in user submit a report on any content

// --- WHAT THIS MADE WORK ---
// GET:  Mod queue in ModSettings panel — paginated, most recent first
// POST: Report button on questions, answers, replies, room messages, DM messages

// --- PITFALLS ---
// ⚠️ WARNING: GET is mod/admin only — always check isModerator() before returning data
// ⚠️ WARNING: POST is auth required but NOT mod-only — any signed-in user can report
// ⚠️ WARNING: One user cannot report the same content twice — enforced here not in DB
// ⚠️ WARNING: Banned users cannot submit reports — check isBanned() first
// ⚠️ WARNING: content_id is not validated against its table — too expensive per request
// ⚠️ WARNING: cache: 'no-store' is required — mod queue must always be fresh

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  VALID_CONTENT_TYPES,
  VALID_REASONS,
  REPORT_STATUS,
  MOD_SOURCES,
  isModerator,
  isBanned,
} from '@/lib/modConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// ─────────────────────────────────────────
// HELPER — extract and verify bearer token
// Returns { userId } on success or null on failure
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
// GET — Mod queue
// Query params:
//   status  = 'pending' | 'resolved' | 'dismissed' (default: 'pending')
//   type    = content type filter (optional)
//   page    = page number, 1-based (default: 1)
//   limit   = items per page (default: 20, max: 50)
// ─────────────────────────────────────────

export async function GET(request) {
  const supabase = supabaseServer();

  // Auth — must be signed in
  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Permission — must be mod or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_mod, is_banned')
    .eq('id', user.id)
    .single();

  if (!isModerator(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const status  = searchParams.get('status')  || REPORT_STATUS.PENDING;
  const type    = searchParams.get('type')    || null;
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit   = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset  = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('community_reports')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && VALID_CONTENT_TYPES.includes(type)) {
    query = query.eq('content_type', type);
  }

  const { data: reports, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }

  // Attach reporter usernames in bulk
  // Collect all non-null reporter_ids
  const reporterIds = Array.from(new Set(
    (reports || [])
      .map(r => r.reporter_id)
      .filter(Boolean)
  ));

  let reporterMap = {};
  if (reporterIds.length > 0) {
    const { data: reporters } = await supabase
      .from('profiles')
      .select('id, community_username')
      .in('id', reporterIds);

    if (reporters) {
      for (const r of reporters) {
        reporterMap[r.id] = r.community_username;
      }
    }
  }

  // Attach reporter_username to each report
  const enriched = (reports || []).map(r => ({
    ...r,
    reporter_username: r.reporter_id ? (reporterMap[r.reporter_id] || 'unknown') : 'auto-flag',
  }));

  return NextResponse.json({
    reports: enriched,
    total: count || 0,
    page,
    limit,
    hasMore: offset + limit < (count || 0),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}


// ─────────────────────────────────────────
// POST — Submit a report
// Body: { content_type, content_id, reason, details? }
// ─────────────────────────────────────────

export async function POST(request) {
  const supabase = supabaseServer();

  // Auth — must be signed in to report
  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Sign in to report content' }, { status: 401 });
  }

  // Banned users cannot report
  const banned = await isBanned(supabase, user.id);
  if (banned) {
    return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { content_type, content_id, reason, details } = body;

  // Validate content_type
  if (!content_type || !VALID_CONTENT_TYPES.includes(content_type)) {
    return NextResponse.json(
      { error: 'Invalid content type. Must be one of: ' + VALID_CONTENT_TYPES.join(', ') },
      { status: 400 }
    );
  }

  // Validate content_id (must be a non-empty string — UUID format)
  if (!content_id || typeof content_id !== 'string' || content_id.length < 10) {
    return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 });
  }

  // Validate reason
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: 'Invalid reason. Must be one of: ' + VALID_REASONS.join(', ') },
      { status: 400 }
    );
  }

  // Sanitize optional details field
  const cleanDetails = details
    ? String(details).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : null;

  // Check if this user already reported this exact content
  // ⚠️ WARNING: We allow the same content to be reported by different users
  // but NOT the same user reporting the same content twice
  const { data: existing } = await supabase
    .from('community_reports')
    .select('id')
    .eq('content_type', content_type)
    .eq('content_id', content_id)
    .eq('reporter_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'You have already reported this content' },
      { status: 409 }
    );
  }

  // Insert the report
  const { data: report, error: insertError } = await supabase
    .from('community_reports')
    .insert({
      content_type:       content_type,
      content_id:         content_id,
      reporter_id:        user.id,
      reason:             reason,
      details:            cleanDetails,
      status:             REPORT_STATUS.PENDING,
      moderation_source:  MOD_SOURCES.USER,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  return NextResponse.json({ success: true, report_id: report.id }, { status: 201 });
}
