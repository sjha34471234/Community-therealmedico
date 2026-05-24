// --- WHY THIS CODE EXISTS ---
// Master mod panel rendered inside /settings for mods and admin only.
// Combines four sub-panels into one tabbed interface:
//   1. Report Queue   — pending reports with action buttons
//   2. Banned Users   — active bans with unban button
//   3. Flagged Words  — auto-flag word list manager
//   4. Moderators     — promote/demote users (admin only)
//
// This component gates itself — if the user is not a mod or admin
// it returns null and renders nothing.

// --- WHAT THIS MADE WORK ---
// Full mod panel inside /settings — tabbed, mobile-friendly
// Admin-only Moderators tab for promoting/demoting mods

// --- PITFALLS ---
// ⚠️ WARNING: Always check isMod OR isAdmin before rendering — never trust client alone
//             Server-side API routes also enforce this — double protection
// ⚠️ WARNING: Moderators tab is hidden for non-admin mods
// ⚠️ WARNING: Uses profile.is_mod and ADMIN_USER_ID check for admin detection
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: profile.id must match ADMIN_USER_ID env var for admin tab to show
//             Since env vars are server-only we pass isAdmin as a prop from the
//             settings page which reads it from the API response

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldOff, AlertTriangle, Users, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import ReportQueue from '@/components/mod/ReportQueue';
import BannedUsers from '@/components/mod/BannedUsers';
import FlaggedWords from '@/components/mod/FlaggedWords';

// ─────────────────────────────────────────
// Props:
//   isAdmin — boolean passed from settings page
//             true only when profile.id matches ADMIN_USER_ID on the server
// ─────────────────────────────────────────

export default function ModSettings({ isAdmin = false }) {
  const { user, profile, accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState('queue');

  // Do not render if not a mod or admin
  if (!user || !profile) return null;
  if (!profile.is_mod && !isAdmin) return null;

  const tabs = [
    { id: 'queue',   label: 'Report Queue', icon: ShieldAlert },
    { id: 'banned',  label: 'Banned Users', icon: ShieldOff },
    { id: 'words',   label: 'Flagged Words', icon: AlertTriangle },
    // Moderators tab only visible to admin
    ...(isAdmin ? [{ id: 'mods', label: 'Moderators', icon: Users }] : []),
  ];

  return (
    <div style={{
      background:   'var(--bg-primary)',
      borderRadius: '12px',
      border:       '1px solid var(--bg-tertiary)',
      overflow:     'hidden',
      marginTop:    '24px',
    }}>

      {/* ── Section header ── */}
      <div style={{
        padding:        '16px 20px',
        borderBottom:   '1px solid var(--bg-secondary)',
        background:     'var(--bg-secondary)',
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
      }}>
        <ShieldAlert size={16} color="var(--accent-primary)" />
        <span style={{
          fontFamily:  'Inter, sans-serif',
          fontWeight:  700,
          fontSize:    '14px',
          color:       'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Moderation
        </span>
        {isAdmin && (
          <span style={{
            background:   'var(--member-bg)',
            color:        'var(--member-gold)',
            border:       '1px solid var(--member-border)',
            borderRadius: '5px',
            padding:      '1px 7px',
            fontFamily:   'Inter, sans-serif',
            fontWeight:   700,
            fontSize:     '11px',
            marginLeft:   '4px',
          }}>
            ADMIN
          </span>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display:      'flex',
        borderBottom: '1px solid var(--bg-secondary)',
        overflowX:    'auto',
        scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '6px',
                padding:      '12px 16px',
                background:   'none',
                border:       'none',
                borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   active ? 700 : 400,
                fontSize:     '13px',
                color:        active ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'color 0.15s',
                marginBottom: '-1px',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '20px' }}>

        {activeTab === 'queue' && <ReportQueue />}

        {activeTab === 'banned' && <BannedUsers />}

        {activeTab === 'words' && <FlaggedWords />}

        {activeTab === 'mods' && isAdmin && (
          <ModeratorsPanel accessToken={accessToken} />
        )}

      </div>
    </div>
  );
}


// ─────────────────────────────────────────
// INTERNAL — Moderators panel
// Admin only — promote users to mod, demote existing mods
// ─────────────────────────────────────────

function ModeratorsPanel({ accessToken }) {
  const [mods, setMods]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [working, setWorking]     = useState(null);

  // ── Load current mod list ──
  const fetchMods = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mod/promote', {
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + accessToken },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load moderators');
        return;
      }
      setMods(data.mods || []);
    } catch {
      setError('Something went wrong loading moderators.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // ── Search users to promote ──
  async function handleSearch() {
    const q = searchVal.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch(
        '/api/search?q=' + encodeURIComponent(q) + '&type=users&limit=5',
        {
          credentials: 'include',
          headers: { 'Authorization': 'Bearer ' + accessToken },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error('Search failed');
        return;
      }
      setSearchResults(data.users || []);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') handleSearch();
  }

  // ── Promote or demote ──
  async function handleAction(action, targetUserId, targetUsername) {
    setWorking(targetUserId);

    try {
      const res = await fetch('/api/mod/promote', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          action:         action,
          target_user_id: targetUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }

      if (action === 'promote') {
        toast.success('@' + targetUsername + ' is now a moderator');
        setSearchResults([]);
        setSearchVal('');
        await fetchMods();
      } else {
        toast.success('@' + targetUsername + ' has been demoted');
        setMods(prev => prev.filter(m => m.id !== targetUserId));
      }

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Users size={18} color="var(--accent-primary)" />
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize:   '16px',
          color:      'var(--text-primary)',
        }}>
          Moderators
        </span>
      </div>

      {/* ── Promote new mod — search box ── */}
      <div style={{
        background:   'var(--bg-secondary)',
        borderRadius: '10px',
        padding:      '14px',
        marginBottom: '20px',
      }}>
        <p style={{
          fontFamily:   'Inter, sans-serif',
          fontWeight:   600,
          fontSize:     '13px',
          color:        'var(--text-primary)',
          margin:       '0 0 10px',
        }}>
          Promote a user to moderator
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by username…"
            style={{
              flex:         1,
              minWidth:     '160px',
              background:   'var(--bg-primary)',
              border:       '1px solid var(--bg-tertiary)',
              borderRadius: '8px',
              padding:      '8px 12px',
              fontFamily:   'Inter, sans-serif',
              fontSize:     '13px',
              color:        'var(--text-primary)',
              outline:      'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchVal.trim()}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '5px',
              background:   searching || !searchVal.trim() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color:        searching || !searchVal.trim() ? 'var(--text-muted)' : '#fff',
              border:       'none',
              borderRadius: '8px',
              padding:      '8px 16px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
              fontSize:     '13px',
              cursor:       searching || !searchVal.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <Search size={13} />
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop:    '10px',
            display:      'flex',
            flexDirection:'column',
            gap:          '6px',
          }}>
            {searchResults.map(u => (
              <div
                key={u.id}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  background:     'var(--bg-primary)',
                  borderRadius:   '8px',
                  padding:        '8px 12px',
                  gap:            '10px',
                }}
              >
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize:   '13px',
                  color:      'var(--text-primary)',
                }}>
                  @{u.community_username || u.username}
                </span>
                <button
                  onClick={() => handleAction('promote', u.id, u.community_username || u.username)}
                  disabled={working === u.id || u.is_mod}
                  style={{
                    background:   u.is_mod ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                    color:        u.is_mod ? 'var(--text-muted)' : '#fff',
                    border:       'none',
                    borderRadius: '7px',
                    padding:      '5px 12px',
                    fontFamily:   'Inter, sans-serif',
                    fontWeight:   600,
                    fontSize:     '12px',
                    cursor:       working === u.id || u.is_mod ? 'not-allowed' : 'pointer',
                    whiteSpace:   'nowrap',
                  }}
                >
                  {u.is_mod ? 'Already a mod' : working === u.id ? 'Promoting…' : 'Promote'}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchVal && !searching && (
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-muted)',
            margin:     '10px 0 0',
          }}>
            No users found for "{searchVal}"
          </p>
        )}
      </div>

      {/* ── Current mod list ── */}
      {loading && (
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '13px',
          color:      'var(--text-muted)',
          padding:    '16px 0',
        }}>
          Loading moderators…
        </p>
      )}

      {!loading && error && (
        <div style={{
          padding:      '12px',
          background:   '#FEF2F2',
          borderRadius: '8px',
          fontFamily:   'Inter, sans-serif',
          fontSize:     '13px',
          color:        'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && mods.length === 0 && (
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '13px',
          color:      'var(--text-muted)',
          padding:    '8px 0',
        }}>
          No moderators yet. Search for a user above to promote them.
        </p>
      )}

      {!loading && !error && mods.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{
            fontFamily:   'Inter, sans-serif',
            fontWeight:   600,
            fontSize:     '13px',
            color:        'var(--text-secondary)',
            margin:       '0 0 6px',
          }}>
            Current moderators ({mods.length})
          </p>
          {mods.map(mod => (
            <div
              key={mod.id}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                background:     'var(--bg-secondary)',
                borderRadius:   '8px',
                padding:        '10px 14px',
                gap:            '10px',
              }}
            >
              <div>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize:   '14px',
                  color:      'var(--text-primary)',
                }}>
                  @{mod.community_username || 'unknown'}
                </span>
                {mod.is_banned && (
                  <span style={{
                    marginLeft:   '8px',
                    background:   '#FEF2F2',
                    color:        'var(--danger)',
                    borderRadius: '5px',
                    padding:      '1px 6px',
                    fontFamily:   'Inter, sans-serif',
                    fontWeight:   600,
                    fontSize:     '11px',
                  }}>
                    banned
                  </span>
                )}
              </div>
              <button
                onClick={() => handleAction('demote', mod.id, mod.community_username)}
                disabled={working === mod.id}
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          '4px',
                  background:   'none',
                  color:        'var(--danger)',
                  border:       '1px solid #FEE2E2',
                  borderRadius: '7px',
                  padding:      '5px 12px',
                  fontFamily:   'Inter, sans-serif',
                  fontWeight:   600,
                  fontSize:     '12px',
                  cursor:       working === mod.id ? 'not-allowed' : 'pointer',
                  whiteSpace:   'nowrap',
                }}
              >
                <X size={12} />
                {working === mod.id ? 'Demoting…' : 'Demote'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
