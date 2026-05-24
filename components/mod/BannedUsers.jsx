// --- WHY THIS CODE EXISTS ---
// Shows the list of currently banned users inside the mod panel.
// Mods can see who is banned, why, and when the ban expires.
// Mods can unban a user directly from this list.

// --- WHAT THIS MADE WORK ---
// Banned users list in ModSettings panel
// Unban button on each banned user row

// --- PITFALLS ---
// ⚠️ WARNING: This list only shows ACTIVE bans — where lifted_at IS NULL
// ⚠️ WARNING: Unban calls POST /api/mod/action with action_type = 'unban'
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: Temporary bans with a past expires_at still show here until
//             manually unbanned — automatic expiry enforcement is a future task

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldOff, RefreshCw, Clock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function BannedUsers() {
  const { accessToken } = useAuthStore();

  const [bans, setBans]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [working, setWorking] = useState(null); // stores ban id being processed

  // ── Fetch active bans ──
  const fetchBans = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      // Query community_banned_users joined with profiles for username
      // We reuse the mod reports endpoint pattern — direct Supabase via API
      const res = await fetch('/api/mod/banned', {
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + accessToken },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load banned users');
        return;
      }

      setBans(data.bans || []);

    } catch {
      setError('Something went wrong loading banned users.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchBans();
  }, [fetchBans]);

  // ── Unban a user ──
  async function handleUnban(ban) {
    setWorking(ban.id);

    try {
      const res = await fetch('/api/mod/action', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          action_type:    'unban',
          target_user_id: ban.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to unban user');
        return;
      }

      toast.success('@' + ban.username + ' has been unbanned');
      setBans(prev => prev.filter(b => b.id !== ban.id));

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setWorking(null);
    }
  }

  // ── Format date ──
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
    });
  }

  // ── Is ban expired ──
  function isExpired(ban) {
    if (ban.ban_type !== 'temporary' || !ban.expires_at) return false;
    return new Date(ban.expires_at) < new Date();
  }

  return (
    <div>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldOff size={18} color="var(--danger)" />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize:   '16px',
            color:      'var(--text-primary)',
          }}>
            Banned Users
          </span>
          {bans.length > 0 && (
            <span style={{
              background:   'var(--danger)',
              color:        '#fff',
              borderRadius: '20px',
              padding:      '1px 8px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   700,
              fontSize:     '12px',
            }}>
              {bans.length}
            </span>
          )}
        </div>

        <button
          onClick={fetchBans}
          disabled={loading}
          title="Refresh list"
          style={{
            background:   'none',
            border:       '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
            padding:      '6px 10px',
            cursor:       loading ? 'not-allowed' : 'pointer',
            color:        'var(--text-muted)',
            display:      'flex',
            alignItems:   'center',
            gap:          '5px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '13px',
          }}
        >
          <RefreshCw
            size={13}
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          />
          Refresh
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          padding:    '40px 0',
          textAlign:  'center',
          fontFamily: 'Inter, sans-serif',
          fontSize:   '14px',
          color:      'var(--text-muted)',
        }}>
          Loading banned users…
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{
          padding:      '14px',
          background:   '#FEF2F2',
          borderRadius: '8px',
          fontFamily:   'Inter, sans-serif',
          fontSize:     '14px',
          color:        'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && bans.length === 0 && (
        <div style={{
          padding:   '48px 0',
          textAlign: 'center',
        }}>
          <Shield size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize:   '15px',
            color:      'var(--text-primary)',
            margin:     '0 0 4px',
          }}>
            No active bans
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-muted)',
            margin:     0,
          }}>
            Banned users will appear here.
          </p>
        </div>
      )}

      {/* ── Ban list ── */}
      {!loading && !error && bans.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bans.map(ban => (
            <div
              key={ban.id}
              style={{
                background:   'var(--bg-primary)',
                border:       '1px solid ' + (isExpired(ban) ? 'var(--bg-tertiary)' : '#FEE2E2'),
                borderLeft:   '3px solid ' + (isExpired(ban) ? 'var(--bg-tertiary)' : 'var(--danger)'),
                borderRadius: '10px',
                padding:      '14px 16px',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                gap:          '12px',
                flexWrap:     'wrap',
              }}
            >
              {/* Left — user info */}
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize:   '14px',
                    color:      'var(--text-primary)',
                  }}>
                    @{ban.username || 'unknown'}
                  </span>

                  {/* Ban type badge */}
                  <span style={{
                    background:   ban.ban_type === 'permanent' ? '#FEF2F2' : '#FFF7ED',
                    color:        ban.ban_type === 'permanent' ? 'var(--danger)' : 'var(--warning)',
                    borderRadius: '5px',
                    padding:      '1px 7px',
                    fontFamily:   'Inter, sans-serif',
                    fontWeight:   600,
                    fontSize:     '11px',
                  }}>
                    {ban.ban_type === 'permanent' ? 'Permanent' : 'Temporary'}
                  </span>

                  {/* Expired badge */}
                  {isExpired(ban) && (
                    <span style={{
                      background:   'var(--bg-secondary)',
                      color:        'var(--text-muted)',
                      borderRadius: '5px',
                      padding:      '1px 7px',
                      fontFamily:   'Inter, sans-serif',
                      fontWeight:   600,
                      fontSize:     '11px',
                    }}>
                      Expired
                    </span>
                  )}
                </div>

                {/* Ban details row */}
                <div style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '12px',
                  flexWrap:   'wrap',
                }}>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '12px',
                    color:      'var(--text-muted)',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '3px',
                  }}>
                    <Clock size={11} />
                    Banned {formatDate(ban.created_at)}
                  </span>

                  {ban.ban_type === 'temporary' && ban.expires_at && (
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '12px',
                      color:      isExpired(ban) ? 'var(--text-muted)' : 'var(--warning)',
                    }}>
                      {isExpired(ban) ? 'Expired' : 'Until'} {formatDate(ban.expires_at)}
                    </span>
                  )}

                  {ban.reason && (
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '12px',
                      color:      'var(--text-secondary)',
                      fontStyle:  'italic',
                    }}>
                      "{ban.reason}"
                    </span>
                  )}
                </div>
              </div>

              {/* Right — unban button */}
              <button
                onClick={() => handleUnban(ban)}
                disabled={working === ban.id}
                style={{
                  background:   working === ban.id ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                  color:        working === ban.id ? 'var(--text-muted)' : 'var(--text-primary)',
                  border:       '1px solid var(--bg-tertiary)',
                  borderRadius: '8px',
                  padding:      '7px 14px',
                  fontFamily:   'Inter, sans-serif',
                  fontWeight:   600,
                  fontSize:     '13px',
                  cursor:       working === ban.id ? 'not-allowed' : 'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '5px',
                  whiteSpace:   'nowrap',
                  flexShrink:   0,
                }}
              >
                <Shield size={13} />
                {working === ban.id ? 'Unbanning…' : 'Unban'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
