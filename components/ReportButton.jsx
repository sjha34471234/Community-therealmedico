// --- WHY THIS CODE EXISTS ---
// A reusable report button that works on all 5 content types:
//   question, answer, reply, room_message, dm_message
//
// Renders as a small flag icon. On click it opens a modal where
// the user picks a reason and optionally adds details.
// Submits to POST /api/mod/reports.

// --- WHAT THIS MADE WORK ---
// Report button on questions, answers, replies, room messages, DM messages
// Single component handles all 5 content types — no duplication

// --- PITFALLS ---
// ⚠️ WARNING: Only render this component for signed-in users — check user before rendering
// ⚠️ WARNING: Never show this button on the current user's own content
//             Pass ownerId and compare with user.id before rendering
// ⚠️ WARNING: contentType must be one of the 5 valid values — validated server-side too
// ⚠️ WARNING: Uses accessToken from authStore — never session

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState } from 'react';
import { Flag, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Report reasons — must match VALID_REASONS in modConfig.js
const REASONS = [
  { value: 'spam',           label: 'Spam or repetitive content' },
  { value: 'misinformation', label: 'Medical misinformation' },
  { value: 'harassment',     label: 'Harassment or bullying' },
  { value: 'inappropriate',  label: 'Inappropriate content' },
  { value: 'other',          label: 'Other' },
];

// ─────────────────────────────────────────
// Props:
//   contentType — 'question' | 'answer' | 'reply' | 'room_message' | 'dm_message'
//   contentId   — UUID of the content row
//   ownerId     — UUID of the content author (used to hide button on own content)
//   size        — 'sm' | 'xs' (default: 'sm') — controls icon size
// ─────────────────────────────────────────

export default function ReportButton({ contentType, contentId, ownerId, size = 'sm' }) {
  const { user, accessToken } = useAuthStore();

  const [modalOpen, setModalOpen]   = useState(false);
  const [reason, setReason]         = useState('');
  const [details, setDetails]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // Do not render if:
  // - User is not signed in
  // - This is the user's own content
  if (!user || !accessToken) return null;
  if (ownerId && ownerId === user.id) return null;

  const iconSize = size === 'xs' ? 13 : 15;

  function openModal() {
    // Reset state every time modal opens
    setReason('');
    setDetails('');
    setSubmitted(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  async function handleSubmit() {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/mod/reports', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id:   contentId,
          reason:       reason,
          details:      details.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Already reported — treat as success silently
        if (res.status === 409) {
          setSubmitted(true);
          return;
        }
        toast.error(data.error || 'Failed to submit report');
        return;
      }

      setSubmitted(true);

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={openModal}
        title="Report this content"
        style={{
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          padding:     '2px 4px',
          borderRadius: '4px',
          color:       'var(--text-muted)',
          display:     'inline-flex',
          alignItems:  'center',
          gap:         '3px',
          fontSize:    '12px',
          lineHeight:  1,
          transition:  'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <Flag size={iconSize} />
      </button>

      {/* ── Modal overlay ── */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position:        'fixed',
            inset:           0,
            background:      'rgba(0,0,0,0.45)',
            zIndex:          2000,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            padding:         '16px',
          }}
        >
          {/* ── Modal box ── */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   'var(--bg-primary)',
              borderRadius: '12px',
              width:        '100%',
              maxWidth:     '420px',
              boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
              overflow:     'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '16px 20px',
              borderBottom:   '1px solid var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={16} color="var(--danger)" />
                <span style={{
                  fontFamily:  'Inter, sans-serif',
                  fontWeight:  600,
                  fontSize:    '15px',
                  color:       'var(--text-primary)',
                }}>
                  Report Content
                </span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background:   'none',
                  border:       'none',
                  cursor:       'pointer',
                  color:        'var(--text-muted)',
                  padding:      '4px',
                  borderRadius: '4px',
                  display:      'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px' }}>

              {/* ── Success state ── */}
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width:        '48px',
                    height:       '48px',
                    borderRadius: '50%',
                    background:   'var(--accent-light)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    margin:       '0 auto 12px',
                  }}>
                    <Flag size={22} color="var(--accent-primary)" />
                  </div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize:   '15px',
                    color:      'var(--text-primary)',
                    margin:     '0 0 6px',
                  }}>
                    Report submitted
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '13px',
                    color:      'var(--text-secondary)',
                    margin:     '0 0 20px',
                  }}>
                    Our mod team will review this shortly. Thank you for helping keep the community safe.
                  </p>
                  <button
                    onClick={closeModal}
                    style={{
                      background:   'var(--accent-primary)',
                      color:        '#fff',
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '9px 24px',
                      fontFamily:   'Inter, sans-serif',
                      fontWeight:   600,
                      fontSize:     '14px',
                      cursor:       'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>

              ) : (
                /* ── Form state ── */
                <>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '13px',
                    color:      'var(--text-secondary)',
                    margin:     '0 0 16px',
                  }}>
                    Why are you reporting this? Our mod team reviews all reports.
                  </p>

                  {/* Reason selector */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{
                      display:     'block',
                      fontFamily:  'Inter, sans-serif',
                      fontWeight:  600,
                      fontSize:    '13px',
                      color:       'var(--text-primary)',
                      marginBottom: '6px',
                    }}>
                      Reason
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{
                          width:        '100%',
                          appearance:   'none',
                          background:   'var(--bg-secondary)',
                          border:       '1px solid var(--bg-tertiary)',
                          borderRadius: '8px',
                          padding:      '9px 36px 9px 12px',
                          fontFamily:   'Inter, sans-serif',
                          fontSize:     '14px',
                          color:        reason ? 'var(--text-primary)' : 'var(--text-muted)',
                          cursor:       'pointer',
                          outline:      'none',
                        }}
                      >
                        <option value="" disabled>Select a reason…</option>
                        {REASONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        style={{
                          position:      'absolute',
                          right:         '10px',
                          top:           '50%',
                          transform:     'translateY(-50%)',
                          pointerEvents: 'none',
                          color:         'var(--text-muted)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Optional details */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display:      'block',
                      fontFamily:   'Inter, sans-serif',
                      fontWeight:   600,
                      fontSize:     '13px',
                      color:        'var(--text-primary)',
                      marginBottom: '6px',
                    }}>
                      Additional details{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Any extra context that would help our mod team…"
                      style={{
                        width:        '100%',
                        background:   'var(--bg-secondary)',
                        border:       '1px solid var(--bg-tertiary)',
                        borderRadius: '8px',
                        padding:      '9px 12px',
                        fontFamily:   'Inter, sans-serif',
                        fontSize:     '13px',
                        color:        'var(--text-primary)',
                        resize:       'vertical',
                        outline:      'none',
                        boxSizing:    'border-box',
                      }}
                    />
                    <div style={{
                      textAlign:  'right',
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '11px',
                      color:      'var(--text-muted)',
                      marginTop:  '3px',
                    }}>
                      {details.length}/500
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={closeModal}
                      disabled={submitting}
                      style={{
                        background:   'var(--bg-secondary)',
                        color:        'var(--text-secondary)',
                        border:       'none',
                        borderRadius: '8px',
                        padding:      '9px 18px',
                        fontFamily:   'Inter, sans-serif',
                        fontWeight:   600,
                        fontSize:     '14px',
                        cursor:       submitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !reason}
                      style={{
                        background:   submitting || !reason ? 'var(--bg-tertiary)' : 'var(--danger)',
                        color:        submitting || !reason ? 'var(--text-muted)' : '#fff',
                        border:       'none',
                        borderRadius: '8px',
                        padding:      '9px 18px',
                        fontFamily:   'Inter, sans-serif',
                        fontWeight:   600,
                        fontSize:     '14px',
                        cursor:       submitting || !reason ? 'not-allowed' : 'pointer',
                        transition:   'background 0.15s',
                      }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
