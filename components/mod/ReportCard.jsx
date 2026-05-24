// --- WHY THIS CODE EXISTS ---
// A single report card inside the mod queue.
// Shows the report details and gives mods three actions:
//   Hide    — hides the content from public view
//   Ban     — bans the content author
//   Dismiss — marks the report as false/resolved without action
//
// Also shows a link to the reported content so the mod can
// view it in context before acting.

// --- WHAT THIS MADE WORK ---
// Individual report cards in ReportQueue with working action buttons
// Inline ban form — mod picks permanent or temporary ban with reason

// --- PITFALLS ---
// ⚠️ WARNING: content_id is a UUID — it is NOT a slug
//             We cannot link directly to questions by UUID — only by slug
//             For questions and answers we show the UUID and let mod use it as reference
//             Linking to room messages and DMs is not possible — show context text only
// ⚠️ WARNING: After any action, call onActionTaken(report.id) to remove card from queue
// ⚠️ WARNING: Ban form expires_at must be a future date — validated client side
// ⚠️ WARNING: Uses accessToken from authStore — never session

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState } from 'react';
import { EyeOff, Eye, ShieldOff, X, ChevronDown, Flag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Label maps for display
const CONTENT_TYPE_LABELS = {
  question:     'Question',
  answer:       'Answer',
  reply:        'Reply',
  room_message: 'Chat Message',
  dm_message:   'Direct Message',
};

const REASON_LABELS = {
  spam:           'Spam or repetitive content',
  misinformation: 'Medical misinformation',
  harassment:     'Harassment or bullying',
  inappropriate:  'Inappropriate content',
  other:          'Other',
};

const SOURCE_LABELS = {
  user: 'User report',
  auto: 'Auto-flagged',
  ai:   'AI flagged',
};

export default function ReportCard({ report, onActionTaken }) {
  const { accessToken } = useAuthStore();

  const [working, setWorking]       = useState(false);
  const [showBanForm, setShowBanForm] = useState(false);
  const [banType, setBanType]       = useState('permanent');
  const [banReason, setBanReason]   = useState('');
  const [expiresAt, setExpiresAt]   = useState('');

  // ── POST to /api/mod/action ──
  async function callAction(payload) {
    setWorking(true);
    try {
      const res = await fetch('/api/mod/action', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return false;
      }

      return true;

    } catch {
      toast.error('Something went wrong. Please try again.');
      return false;
    } finally {
      setWorking(false);
    }
  }

  // ── Hide action ──
  async function handleHide() {
    const ok = await callAction({
      action_type:  'hide',
      content_type: report.content_type,
      content_id:   report.content_id,
      report_id:    report.id,
    });
    if (ok) {
      toast.success('Content hidden from public view');
      onActionTaken(report.id);
    }
  }

  // ── Dismiss action ──
  async function handleDismiss() {
    const ok = await callAction({
      action_type: 'dismiss',
      report_id:   report.id,
    });
    if (ok) {
      toast.success('Report dismissed');
      onActionTaken(report.id);
    }
  }

  // ── Ban action ──
  async function handleBan() {
    if (!report.reported_user_id && !report.content_owner_id) {
      toast.error('Cannot identify the content author to ban');
      return;
    }

    if (banType === 'temporary') {
      if (!expiresAt) {
        toast.error('Please set an expiry date for the temporary ban');
        return;
      }
      const expiry = new Date(expiresAt);
      if (expiry <= new Date()) {
        toast.error('Expiry date must be in the future');
        return;
      }
    }

    const ok = await callAction({
      action_type:     'ban',
      target_user_id:  report.content_owner_id || report.reporter_id,
      report_id:       report.id,
      ban_type:        banType,
      expires_at:      banType === 'temporary' ? new Date(expiresAt).toISOString() : null,
      reason:          banReason.trim() || null,
    });

    if (ok) {
      toast.success('User banned');
      onActionTaken(report.id);
    }
  }

  // ── Format date ──
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
      hour:  '2-digit',
      minute:'2-digit',
    });
  }

  const isAutoFlag = report.moderation_source === 'auto' || report.moderation_source === 'ai';
  const contentLabel = CONTENT_TYPE_LABELS[report.content_type] || report.content_type;

  return (
    <div style={{
      background:   'var(--bg-primary)',
      border:       '1px solid ' + (isAutoFlag ? '#FEE2E2' : 'var(--bg-tertiary)'),
      borderLeft:   '3px solid ' + (isAutoFlag ? 'var(--danger)' : 'var(--accent-primary)'),
      borderRadius: '10px',
      padding:      '16px',
      transition:   'box-shadow 0.15s',
    }}>

      {/* ── Top row: type badge + source + date ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '10px',
        flexWrap:       'wrap',
        gap:            '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

          {/* Content type badge */}
          <span style={{
            background:   'var(--accent-light)',
            color:        'var(--accent-primary)',
            borderRadius: '6px',
            padding:      '2px 8px',
            fontFamily:   'Inter, sans-serif',
            fontWeight:   600,
            fontSize:     '11px',
            textTransform:'uppercase',
            letterSpacing:'0.04em',
          }}>
            {contentLabel}
          </span>

          {/* Auto-flag badge */}
          {isAutoFlag && (
            <span style={{
              background:   '#FEF2F2',
              color:        'var(--danger)',
              borderRadius: '6px',
              padding:      '2px 8px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '11px',
            }}>
              {SOURCE_LABELS[report.moderation_source] || 'Auto-flagged'}
            </span>
          )}

          {/* Reason badge */}
          <span style={{
            background:   'var(--bg-secondary)',
            color:        'var(--text-secondary)',
            borderRadius: '6px',
            padding:      '2px 8px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '11px',
          }}>
            {REASON_LABELS[report.reason] || report.reason}
          </span>
        </div>

        {/* Date */}
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '12px',
          color:      'var(--text-muted)',
          display:    'flex',
          alignItems: 'center',
          gap:        '4px',
        }}>
          <Clock size={11} />
          {formatDate(report.created_at)}
        </span>
      </div>

      {/* ── Reporter ── */}
      <p style={{
        fontFamily:   'Inter, sans-serif',
        fontSize:     '13px',
        color:        'var(--text-secondary)',
        margin:       '0 0 6px',
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Reported by </span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          @{report.reporter_username || 'auto-flag'}
        </span>
      </p>

      {/* ── Content ID (reference) ── */}
      <p style={{
        fontFamily:   'Inter, sans-serif',
        fontSize:     '12px',
        color:        'var(--text-muted)',
        margin:       '0 0 6px',
        wordBreak:    'break-all',
      }}>
        Content ID: {report.content_id}
      </p>

      {/* ── Optional details from reporter ── */}
      {report.details && (
        <div style={{
          background:   'var(--bg-secondary)',
          borderRadius: '6px',
          padding:      '8px 10px',
          marginBottom: '12px',
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-secondary)',
            margin:     0,
            fontStyle:  'italic',
          }}>
            "{report.details}"
          </p>
        </div>
      )}

      {/* ── Action buttons (only for pending reports) ── */}
      {report.status === 'pending' && !showBanForm && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>

          {/* Hide button — not for DM messages */}
          {report.content_type !== 'dm_message' && (
            <button
              onClick={handleHide}
              disabled={working}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '5px',
                background:   'var(--bg-secondary)',
                color:        'var(--text-primary)',
                border:       'none',
                borderRadius: '8px',
                padding:      '7px 14px',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   600,
                fontSize:     '13px',
                cursor:       working ? 'not-allowed' : 'pointer',
                transition:   'background 0.15s',
              }}
            >
              <EyeOff size={14} />
              Hide Content
            </button>
          )}

          {/* Ban button */}
          <button
            onClick={() => setShowBanForm(true)}
            disabled={working}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '5px',
              background:   '#FEF2F2',
              color:        'var(--danger)',
              border:       'none',
              borderRadius: '8px',
              padding:      '7px 14px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '13px',
              cursor:       working ? 'not-allowed' : 'pointer',
            }}
          >
            <ShieldOff size={14} />
            Ban User
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            disabled={working}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '5px',
              background:   'none',
              color:        'var(--text-muted)',
              border:       '1px solid var(--bg-tertiary)',
              borderRadius: '8px',
              padding:      '7px 14px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '13px',
              cursor:       working ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={14} />
            Dismiss
          </button>
        </div>
      )}

      {/* ── Resolved / dismissed status ── */}
      {report.status !== 'pending' && (
        <div style={{
          display:    'inline-flex',
          alignItems: 'center',
          gap:        '5px',
          background: report.status === 'resolved' ? '#F0FDF4' : 'var(--bg-secondary)',
          color:      report.status === 'resolved' ? 'var(--success)' : 'var(--text-muted)',
          borderRadius: '6px',
          padding:    '4px 10px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize:   '12px',
          marginTop:  '4px',
        }}>
          {report.status === 'resolved' ? '✓ Resolved' : '— Dismissed'}
        </div>
      )}

      {/* ── Ban form (inline, expands when Ban User clicked) ── */}
      {showBanForm && (
        <div style={{
          marginTop:    '12px',
          background:   '#FEF2F2',
          borderRadius: '8px',
          padding:      '14px',
          border:       '1px solid #FEE2E2',
        }}>
          <p style={{
            fontFamily:   'Inter, sans-serif',
            fontWeight:   700,
            fontSize:     '13px',
            color:        'var(--danger)',
            margin:       '0 0 12px',
            display:      'flex',
            alignItems:   'center',
            gap:          '6px',
          }}>
            <ShieldOff size={14} /> Ban User
          </p>

          {/* Ban type */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{
              display:      'block',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '12px',
              color:        'var(--text-primary)',
              marginBottom: '5px',
            }}>
              Ban type
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={banType}
                onChange={e => setBanType(e.target.value)}
                style={{
                  width:        '100%',
                  appearance:   'none',
                  background:   'var(--bg-primary)',
                  border:       '1px solid var(--bg-tertiary)',
                  borderRadius: '6px',
                  padding:      '7px 30px 7px 10px',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '13px',
                  color:        'var(--text-primary)',
                  cursor:       'pointer',
                  outline:      'none',
                }}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
              <ChevronDown size={13} style={{
                position:      'absolute',
                right:         '8px',
                top:           '50%',
                transform:     'translateY(-50%)',
                pointerEvents: 'none',
                color:         'var(--text-muted)',
              }} />
            </div>
          </div>

          {/* Expiry date — only for temporary ban */}
          {banType === 'temporary' && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{
                display:      'block',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   600,
                fontSize:     '12px',
                color:        'var(--text-primary)',
                marginBottom: '5px',
              }}>
                Ban until
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={{
                  width:        '100%',
                  background:   'var(--bg-primary)',
                  border:       '1px solid var(--bg-tertiary)',
                  borderRadius: '6px',
                  padding:      '7px 10px',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '13px',
                  color:        'var(--text-primary)',
                  outline:      'none',
                  boxSizing:    'border-box',
                }}
              />
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display:      'block',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '12px',
              color:        'var(--text-primary)',
              marginBottom: '5px',
            }}>
              Reason{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              maxLength={200}
              placeholder="Internal note — not shown to the user"
              style={{
                width:        '100%',
                background:   'var(--bg-primary)',
                border:       '1px solid var(--bg-tertiary)',
                borderRadius: '6px',
                padding:      '7px 10px',
                fontFamily:   'Inter, sans-serif',
                fontSize:     '13px',
                color:        'var(--text-primary)',
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />
          </div>

          {/* Ban form buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleBan}
              disabled={working}
              style={{
                background:   working ? 'var(--bg-tertiary)' : 'var(--danger)',
                color:        working ? 'var(--text-muted)' : '#fff',
                border:       'none',
                borderRadius: '7px',
                padding:      '7px 16px',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   600,
                fontSize:     '13px',
                cursor:       working ? 'not-allowed' : 'pointer',
              }}
            >
              {working ? 'Banning…' : 'Confirm Ban'}
            </button>
            <button
              onClick={() => setShowBanForm(false)}
              disabled={working}
              style={{
                background:   'var(--bg-primary)',
                color:        'var(--text-secondary)',
                border:       '1px solid var(--bg-tertiary)',
                borderRadius: '7px',
                padding:      '7px 16px',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   600,
                fontSize:     '13px',
                cursor:       'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
