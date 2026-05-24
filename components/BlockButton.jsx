// --- WHY THIS CODE EXISTS ---
// A reusable block/unblock button used in two places:
//   1. Profile pages — next to the Follow button
//   2. DM conversation header — inside DMView
//
// On mount it checks block status via GET /api/mod/block?target_id=
// Clicking toggles between blocked and unblocked state.

// --- WHAT THIS MADE WORK ---
// Block button on profile pages
// Block button inside DM conversation header
// Prevents blocked users from sending DMs (enforced server-side in DM route)

// --- PITFALLS ---
// ⚠️ WARNING: Never render this for the current user's own profile
//             Compare targetUserId with user.id before rendering
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: Block is silent — blocked user gets no notification
// ⚠️ WARNING: After blocking from DM view, user should still be able to
//             see old messages — just cannot send new ones
// ⚠️ WARNING: This component manages its own loading state —
//             parent does not need to track block status

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect } from 'react';
import { ShieldOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// ─────────────────────────────────────────
// Props:
//   targetUserId    — UUID of the user to block/unblock
//   targetUsername  — display name shown in confirm prompt
//   variant         — 'button' | 'icon' (default: 'button')
//                     'button' = full pill button with text (profile page)
//                     'icon'   = icon only, no text (DM header)
//   onBlock         — optional callback fired after block succeeds
//   onUnblock       — optional callback fired after unblock succeeds
// ─────────────────────────────────────────

export default function BlockButton({
  targetUserId,
  targetUsername,
  variant = 'button',
  onBlock,
  onUnblock,
}) {
  const { user, accessToken } = useAuthStore();

  const [isBlocked, setIsBlocked]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [working, setWorking]       = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Load initial block status on mount ──
  // ⚠️ WARNING: useEffect MUST be before any conditional returns — Rules of Hooks
  // If conditions below mean we return null, useEffect still runs but does nothing
  useEffect(() => {
    if (!targetUserId || !accessToken || !user || targetUserId === user.id) return;

    let cancelled = false;

    async function fetchBlockStatus() {
      try {
        const res = await fetch(
          '/api/mod/block?target_id=' + targetUserId,
          {
            credentials: 'include',
            headers: { 'Authorization': 'Bearer ' + accessToken },
          }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setIsBlocked(data.blocked_by_me === true);
      } catch {
        // Silently fail — button stays in default unblocked state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlockStatus();
    return () => { cancelled = true; };
  }, [targetUserId, accessToken, user]);

  // Do not render if not signed in or viewing own profile
  if (!user || !accessToken) return null;
  if (targetUserId === user.id) return null;

  // ── Block action ──
  async function handleBlock() {
    setWorking(true);
    setConfirmOpen(false);

    try {
      const res = await fetch('/api/mod/block', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ target_id: targetUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to block user');
        return;
      }

      setIsBlocked(true);
      toast.success('@' + targetUsername + ' has been blocked');
      if (onBlock) onBlock();

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  // ── Unblock action ──
  async function handleUnblock() {
    setWorking(true);

    try {
      const res = await fetch('/api/mod/block', {
        method:      'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ target_id: targetUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to unblock user');
        return;
      }

      setIsBlocked(false);
      toast.success('@' + targetUsername + ' has been unblocked');
      if (onUnblock) onUnblock();

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  // Do not render until we know the block status
  if (loading) return null;

  // ── Icon variant (used in DM header) ──
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => isBlocked ? handleUnblock() : setConfirmOpen(true)}
          disabled={working}
          title={isBlocked ? 'Unblock ' + targetUsername : 'Block ' + targetUsername}
          style={{
            background:   isBlocked ? 'var(--accent-light)' : 'none',
            border:       '1px solid ' + (isBlocked ? 'var(--accent-primary)' : 'var(--bg-tertiary)'),
            borderRadius: '8px',
            padding:      '6px',
            cursor:       working ? 'not-allowed' : 'pointer',
            color:        isBlocked ? 'var(--accent-primary)' : 'var(--text-muted)',
            display:      'flex',
            alignItems:   'center',
            transition:   'all 0.15s',
          }}
        >
          {isBlocked ? <ShieldOff size={16} /> : <Shield size={16} />}
        </button>

        {confirmOpen && (
          <BlockConfirmModal
            username={targetUsername}
            onConfirm={handleBlock}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </>
    );
  }

  // ── Button variant (used on profile page) ──
  return (
    <>
      <button
        onClick={() => isBlocked ? handleUnblock() : setConfirmOpen(true)}
        disabled={working}
        style={{
          display:      'inline-flex',
          alignItems:   'center',
          gap:          '6px',
          background:   isBlocked ? 'var(--accent-light)' : 'var(--bg-secondary)',
          color:        isBlocked ? 'var(--accent-primary)' : 'var(--text-secondary)',
          border:       '1px solid ' + (isBlocked ? 'var(--accent-primary)' : 'var(--bg-tertiary)'),
          borderRadius: '20px',
          padding:      '7px 16px',
          fontFamily:   'Inter, sans-serif',
          fontWeight:   600,
          fontSize:     '13px',
          cursor:       working ? 'not-allowed' : 'pointer',
          transition:   'all 0.15s',
          whiteSpace:   'nowrap',
        }}
      >
        {isBlocked
          ? <><ShieldOff size={14} /> Unblock</>
          : <><Shield size={14} /> Block</>
        }
      </button>

      {confirmOpen && (
        <BlockConfirmModal
          username={targetUsername}
          onConfirm={handleBlock}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}


// ─────────────────────────────────────────
// INTERNAL — Block confirmation modal
// Shown before blocking to prevent accidental blocks
// Not shown for unblock — unblocking is always instant
// ─────────────────────────────────────────

function BlockConfirmModal({ username, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.45)',
        zIndex:         2000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   'var(--bg-primary)',
          borderRadius: '12px',
          width:        '100%',
          maxWidth:     '380px',
          padding:      '24px',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width:          '40px',
            height:         '40px',
            borderRadius:   '50%',
            background:     '#FEF2F2',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}>
            <Shield size={20} color="var(--danger)" />
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize:   '15px',
            color:      'var(--text-primary)',
            margin:     0,
          }}>
            Block @{username}?
          </p>
        </div>

        <p style={{
          fontFamily:   'Inter, sans-serif',
          fontSize:     '13px',
          color:        'var(--text-secondary)',
          margin:       '0 0 20px',
          lineHeight:   1.5,
        }}>
          They will not be able to send you direct messages. Their posts will be hidden from your feed. They will not be notified.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background:   'var(--bg-secondary)',
              color:        'var(--text-secondary)',
              border:       'none',
              borderRadius: '8px',
              padding:      '9px 18px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '14px',
              cursor:       'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background:   'var(--danger)',
              color:        '#fff',
              border:       'none',
              borderRadius: '8px',
              padding:      '9px 18px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '14px',
              cursor:       'pointer',
            }}
          >
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
