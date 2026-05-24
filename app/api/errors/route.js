// ============================================================
// FILE: app/api/errors/route.js
// PURPOSE: Receives error reports from ErrorBoundary and
//          ErrorReporter. Clusters duplicate errors by fingerprint
//          so the dev console shows counts not noise.
//          GET: returns error log list (admin only)
//          POST: logs an error (any user, even unauthenticated)
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Central error collection point. Without this,
//               user-reported bugs disappear into the void.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: fingerprint logic — changing it will break
//                   clustering (duplicate errors will no longer
//                   match existing rows)
// ⚠️ DO NOT CHANGE: upsert logic — this is how duplicate errors
//                   increment count instead of creating new rows
// ⚠️ POST is intentionally open — unauthenticated errors must
//    be logged too (crashes before auth loads)
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14B error logging. ErrorBoundary catches JS crashes and
// calls POST /api/errors automatically. ErrorReporter lets users
// manually describe what broke. Both hit this route.

// --- WHAT THIS MADE WORK ---
// Duplicate errors cluster into one row with occurrence_count++
// Admin can see all errors sorted by frequency at /admin/errors
// Unauthenticated crashes are logged with reporter_id = null

// --- PITFALLS ---
// ⚠️ Fingerprint must be deterministic — same error = same fingerprint
//    Always built from: message + url (path only, no query params)
// ⚠️ Never log full query params — may contain sensitive data
// ⚠️ stack traces can be very long — truncate to 2000 chars
// ⚠️ upsert uses onConflict: 'fingerprint' — must match the
//    UNIQUE INDEX created in the SQL migration

import { supabaseServer } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// Build a deterministic fingerprint from error message + page path
// Same error on same page = same fingerprint = clusters into one row
function buildFingerprint(message, pageUrl) {
  // Strip query params and hash — only use the path
  let path = pageUrl || '';
  try {
    const url = new URL(pageUrl || '', 'https://community.therealmedico.store');
    path = url.pathname;
  } catch (_) {
    path = pageUrl || 'unknown';
  }

  // Simple deterministic string — no crypto needed
  // message + path is enough to cluster duplicates
  const raw = `${(message || '').slice(0, 200)}::${path}`;

  // Convert to a safe alphanumeric fingerprint
  // btoa gives base64 — replace chars that break DB
  if (typeof btoa !== 'undefined') {
    return btoa(raw).replace(/[+/=]/g, '').slice(0, 64);
  }
  // Node fallback
  return Buffer.from(raw).toString('base64').replace(/[+/=]/g, '').slice(0, 64);
}

// ── GET /api/errors — admin only ────────────────────────────
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabase = supabaseServer();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Admin only
    if (user.id !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const sortBy = searchParams.get('sort') || 'occurrence_count';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const validSorts = ['occurrence_count', 'last_seen_at', 'affected_users', 'first_seen_at'];
    const safeSort = validSorts.includes(sortBy) ? sortBy : 'occurrence_count';

    let query = supabase
      .from('community_error_logs')
      .select('*', { count: 'exact' })
      .order(safeSort, { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: errors, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ errors, count, page, limit }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/errors]', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST /api/errors — log or cluster an error ──────────────
// Intentionally open — no auth required
// Unauthenticated crashes must be logged too
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      error_message,
      error_stack,
      error_source = 'auto',  // 'auto' = JS crash, 'user' = manual report
      page_url,
      component,
      user_description,
      user_id,               // optional — null for unauthenticated
    } = body;

    if (!error_message) {
      return NextResponse.json({ error: 'error_message is required' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const fingerprint = buildFingerprint(error_message, page_url);

    // Truncate stack trace — can be very long
    const safeStack = error_stack ? error_stack.slice(0, 2000) : null;

    // Try to find existing row with same fingerprint
    const { data: existing } = await supabase
      .from('community_error_logs')
      .select('id, occurrence_count, affected_users, reporter_ids')
      .eq('fingerprint', fingerprint)
      .single();

    if (existing) {
      // Error already exists — increment counts
      const reporterIds = existing.reporter_ids || [];
      const isNewUser = user_id && !reporterIds.includes(user_id);

      await supabase
        .from('community_error_logs')
        .update({
          occurrence_count: existing.occurrence_count + 1,
          affected_users: isNewUser ? existing.affected_users + 1 : existing.affected_users,
          reporter_ids: isNewUser ? [...reporterIds, user_id] : reporterIds,
          last_seen_at: new Date().toISOString(),
          // Update description if user provided one (auto crashes don't have descriptions)
          ...(user_description ? { user_description } : {}),
        })
        .eq('id', existing.id);

      return NextResponse.json({ clustered: true, id: existing.id }, { status: 200 });
    }

    // New error — create fresh row
    const { data: newError, error: insertError } = await supabase
      .from('community_error_logs')
      .insert({
        fingerprint,
        error_message: error_message.slice(0, 500),
        error_stack: safeStack,
        error_source,
        page_url: page_url ? page_url.slice(0, 500) : null,
        component: component ? component.slice(0, 100) : null,
        user_description: user_description ? user_description.slice(0, 1000) : null,
        occurrence_count: 1,
        affected_users: 1,
        reporter_ids: user_id ? [user_id] : [],
        status: 'open',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ clustered: false, id: newError.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/errors]', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PATCH /api/errors — update status (admin only) ──────────
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id, status, resolution_note } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

    const validStatuses = ['open', 'resolved', 'ignored'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await supabase
      .from('community_error_logs')
      .update({
        status,
        resolution_note: resolution_note || null,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' ? user.id : null,
      })
      .eq('id', id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[PATCH /api/errors]', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14B error logging API
// REASON: Central error collection with clustering — duplicate errors
//         increment count instead of creating noise
// --- END CHANGE LOG ---
