// --- WHY THIS CODE EXISTS ---
// This is the single route that handles every mod action:
//   hide, unhide, ban, unban, dismiss
// All actions are logged to community_mod_actions for a permanent audit trail.
// Mods can act on a report (resolve it) or act directly on content (no report needed).

// --- WHAT THIS MADE WORK ---
// ReportCard buttons: Hide, Unhide, Ban, Unban, Dismiss
// Every action writes to community_mod_actions — permanent record of who did what

// --- PITFALLS ---
// ⚠️ WARNING: Only mods and admin can call this route — always check isModerator()
// ⚠️ WARNING: Ban sets profiles.is_banned = true AND inserts to community_banned_users
// ⚠️ WARNING: Unban sets profiles.is_banned = false AND sets lifted_at on the ban row
// ⚠️ WARNING: hide/unhide updates the correct table based on content_type
// ⚠️ WARNING: dismiss only changes report status — does NOT hide the content
// ⚠️ WARNING: A mod cannot ban another mod — only admin can ban a mod
// ⚠️ WARNING: A mod cannot ban the admin — blocked by isAdmin() check on target

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  MOD_ACTIONS,
  VALID_MOD_ACTIONS,
  BAN_TYPES,
  VALID_BAN_TYPES,
  REPORT_STATUS,
  CONTENT_TYPES,
  isModerator,
  isAdmin,
} from '@/lib/modConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// ─────────────────────────────────────────
// HELPER — extract and verify bearer token
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
// HELPER — get the correct table name for a content type
// Returns null if content type does not map to a hideable table
// ─────────────────────────────────────────

function getTableForContentType(contentType) {
  const map = {
    [CONTENT_TYPES.QUESTION]:     'community_questions',
    [CONTENT_TYPES.ANSWER]:       'community_answers',
    [CONTENT_TYPES.REPLY]:        'community_answers',
    [CONTENT_TYPES.ROOM_MESSAGE]: 'community_chat_messages',
  };
  // ⚠️ WARNING: DM messages are not in this map — they are deleted not hidden
  return map[contentType] || null;
}


// ─────────────────────────────────────────
// POST — Execute a mod action
// Body:
//   action_type   — required — one of VALID_MOD_ACTIONS
//   content_type  — required for hide/unhide
//   content_id    — required for hide/unhide
//   target_user_id — required for ban/unban
//   report_id     — optional — if acting from a report card, pass this to resolve it
//   ban_type      — 'permanent' | 'temporary' (required when action_type = 'ban')
//   expires_at    — ISO date string (required when ban_type = 'temporary')
//   reason        — optional note stored on the ban or mod action
// ─────────────────────────────────────────

export async function POST(request) {
  const supabase = supabaseServer();

  // Auth
  const user = await getAuthedUser(request, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Permission — must be mod or admin
  const { data: modProfile } = await supabase
    .from('profiles')
    .select('id, is_mod, is_banned')
    .eq('id', user.id)
    .single();

  if (!isModerator(modProfile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    action_type,
    content_type,
    content_id,
    target_user_id,
    report_id,
    ban_type,
    expires_at,
    reason,
  } = body;

  // Validate action_type
  if (!action_type || !VALID_MOD_ACTIONS.includes(action_type)) {
    return NextResponse.json(
      { error: 'Invalid action_type. Must be one of: ' + VALID_MOD_ACTIONS.join(', ') },
      { status: 400 }
    );
  }

  // ─────────────────────────────────────────
  // ACTION: hide
  // Sets is_hidden = true on the content row
  // ─────────────────────────────────────────

  if (action_type === MOD_ACTIONS.HIDE) {
    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'content_type and content_id are required for hide' },
        { status: 400 }
      );
    }

    const table = getTableForContentType(content_type);
    if (!table) {
      return NextResponse.json(
        { error: 'Cannot hide content of type: ' + content_type },
        { status: 400 }
      );
    }

    const { error: hideError } = await supabase
      .from(table)
      .update({ is_hidden: true })
      .eq('id', content_id);

    if (hideError) {
      return NextResponse.json({ error: 'Failed to hide content' }, { status: 500 });
    }

    await logModAction(supabase, {
      mod_id:        user.id,
      action_type:   MOD_ACTIONS.HIDE,
      content_type,
      content_id,
      report_id:     report_id || null,
      note:          reason || null,
    });

    await resolveReport(supabase, report_id, user.id);

    return NextResponse.json({ success: true, action: MOD_ACTIONS.HIDE });
  }


  // ─────────────────────────────────────────
  // ACTION: unhide
  // Sets is_hidden = false on the content row
  // ─────────────────────────────────────────

  if (action_type === MOD_ACTIONS.UNHIDE) {
    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'content_type and content_id are required for unhide' },
        { status: 400 }
      );
    }

    const table = getTableForContentType(content_type);
    if (!table) {
      return NextResponse.json(
        { error: 'Cannot unhide content of type: ' + content_type },
        { status: 400 }
      );
    }

    const { error: unhideError } = await supabase
      .from(table)
      .update({ is_hidden: false })
      .eq('id', content_id);

    if (unhideError) {
      return NextResponse.json({ error: 'Failed to unhide content' }, { status: 500 });
    }

    await logModAction(supabase, {
      mod_id:       user.id,
      action_type:  MOD_ACTIONS.UNHIDE,
      content_type,
      content_id,
      report_id:    report_id || null,
      note:         reason || null,
    });

    return NextResponse.json({ success: true, action: MOD_ACTIONS.UNHIDE });
  }


  // ─────────────────────────────────────────
  // ACTION: dismiss
  // Marks the report as dismissed — no content change
  // ─────────────────────────────────────────

  if (action_type === MOD_ACTIONS.DISMISS) {
    if (!report_id) {
      return NextResponse.json(
        { error: 'report_id is required for dismiss' },
        { status: 400 }
      );
    }

    const { error: dismissError } = await supabase
      .from('community_reports')
      .update({
        status:      REPORT_STATUS.DISMISSED,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', report_id);

    if (dismissError) {
      return NextResponse.json({ error: 'Failed to dismiss report' }, { status: 500 });
    }

    await logModAction(supabase, {
      mod_id:      user.id,
      action_type: MOD_ACTIONS.DISMISS,
      report_id:   report_id,
      note:        reason || null,
    });

    return NextResponse.json({ success: true, action: MOD_ACTIONS.DISMISS });
  }


  // ─────────────────────────────────────────
  // ACTION: ban
  // 1. Validates target is not a mod or admin
  // 2. Sets profiles.is_banned = true
  // 3. Inserts row to community_banned_users
  // 4. Resolves the report if report_id passed
  // ─────────────────────────────────────────

  if (action_type === MOD_ACTIONS.BAN) {
    if (!target_user_id) {
      return NextResponse.json(
        { error: 'target_user_id is required for ban' },
        { status: 400 }
      );
    }

    // Cannot ban yourself
    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 400 });
    }

    // Cannot ban the admin
    if (isAdmin(target_user_id)) {
      return NextResponse.json({ error: 'Cannot ban the site admin' }, { status: 403 });
    }

    // Check if target is a mod — only admin can ban a mod
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, is_mod')
      .eq('id', target_user_id)
      .single();

    if (targetProfile && targetProfile.is_mod && !isAdmin(user.id)) {
      return NextResponse.json(
        { error: 'Only the admin can ban a moderator' },
        { status: 403 }
      );
    }

    // Validate ban_type
    const resolvedBanType = ban_type && VALID_BAN_TYPES.includes(ban_type)
      ? ban_type
      : BAN_TYPES.PERMANENT;

    // Validate expires_at for temporary bans
    if (resolvedBanType === BAN_TYPES.TEMPORARY && !expires_at) {
      return NextResponse.json(
        { error: 'expires_at is required for temporary bans' },
        { status: 400 }
      );
    }

    // Set is_banned flag on profile
    const { error: banFlagError } = await supabase
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', target_user_id);

    if (banFlagError) {
      return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
    }

    // Insert ban record
    await supabase
      .from('community_banned_users')
      .insert({
        user_id:    target_user_id,
        banned_by:  user.id,
        reason:     reason || null,
        ban_type:   resolvedBanType,
        expires_at: resolvedBanType === BAN_TYPES.TEMPORARY ? expires_at : null,
      });

    await logModAction(supabase, {
      mod_id:          user.id,
      action_type:     MOD_ACTIONS.BAN,
      target_user_id,
      report_id:       report_id || null,
      note:            reason || null,
    });

    await resolveReport(supabase, report_id, user.id);

    return NextResponse.json({ success: true, action: MOD_ACTIONS.BAN });
  }


  // ─────────────────────────────────────────
  // ACTION: unban
  // 1. Sets profiles.is_banned = false
  // 2. Sets lifted_at on the active ban row
  // ─────────────────────────────────────────

  if (action_type === MOD_ACTIONS.UNBAN) {
    if (!target_user_id) {
      return NextResponse.json(
        { error: 'target_user_id is required for unban' },
        { status: 400 }
      );
    }

    // Clear is_banned flag
    const { error: unbanFlagError } = await supabase
      .from('profiles')
      .update({ is_banned: false })
      .eq('id', target_user_id);

    if (unbanFlagError) {
      return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
    }

    // Mark the most recent active ban as lifted
    await supabase
      .from('community_banned_users')
      .update({
        lifted_at: new Date().toISOString(),
        lifted_by: user.id,
      })
      .eq('user_id', target_user_id)
      .is('lifted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    await logModAction(supabase, {
      mod_id:         user.id,
      action_type:    MOD_ACTIONS.UNBAN,
      target_user_id,
      note:           reason || null,
    });

    return NextResponse.json({ success: true, action: MOD_ACTIONS.UNBAN });
  }

  // Fallback — action_type passed validation but has no handler above
  return NextResponse.json({ error: 'Action not implemented' }, { status: 400 });
}


// ─────────────────────────────────────────
// INTERNAL HELPER — log a mod action
// Always call this after every successful action
// ─────────────────────────────────────────

async function logModAction(supabase, {
  mod_id,
  action_type,
  content_type = null,
  content_id = null,
  target_user_id = null,
  report_id = null,
  note = null,
}) {
  try {
    await supabase
      .from('community_mod_actions')
      .insert({
        mod_id,
        action_type,
        content_type,
        content_id,
        target_user_id,
        report_id,
        note,
      });
  } catch {
    // Log failure should never block the main action from returning success
  }
}


// ─────────────────────────────────────────
// INTERNAL HELPER — resolve a report
// Called after hide or ban to mark the associated report resolved
// Safe to call with null report_id — does nothing
// ─────────────────────────────────────────

async function resolveReport(supabase, reportId, modId) {
  if (!reportId) return;
  try {
    await supabase
      .from('community_reports')
      .update({
        status:      REPORT_STATUS.RESOLVED,
        resolved_at: new Date().toISOString(),
        resolved_by: modId,
      })
      .eq('id', reportId);
  } catch {
    // Resolve failure should never block the main action
  }
}
