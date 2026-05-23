// --- WHY THIS CODE EXISTS ---
// Modal for searching users to start a new DM conversation.
// Opened when user clicks the + button in DMList or "Message" on a profile page.
// Lazy loads 10 users at a time — scroll to bottom to load more.
// On selecting a user, calls POST /api/chat/dm to create or retrieve the conversation.

// --- WHAT THIS MADE WORK ---
// UserSearchModal → used by ChatLayout.jsx (+ button) and profile page (Message button)
// Searches community_username in profiles table via /api/profile search
// Creates or retrieves DM conversation then calls onSelectConvo(convo)

// --- PITFALLS ---
// ⚠️ Search is debounced 300ms — never fire on every keystroke (hammers DB)
// ⚠️ Clicking a user calls POST /api/chat/dm — if conversation exists it returns existing
//    Never create a new conversation if one already exists — API handles deduplication
// ⚠️ Bearer token required for POST /api/chat/dm
// ⚠️ Avatar prop is avatarRow — NEVER avatar=
// ⚠️ Close modal on Escape key and on backdrop click — standard modal UX
// ⚠️ Cannot message yourself — filter out current user from results
// ⚠️ Search query must be trimmed before sending — never search raw whitespace

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — user search modal for new DMs
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 10;

export default function UserSearchModal({ onSelectConvo, onClose }) {
  const { session, profile } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [starting, setStarting] = useState(null); // user_id being opened
  const [error, setError] = useState('');
  const offsetRef = useRef(0);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Search function — fetches users matching query
  const searchUsers = useCallback(async (searchQuery, offset = 0, append = false) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setHasMore(false);
      offsetRef.current = 0;
      return;
    }

    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        type: 'users',
        limit: PAGE_SIZE,
        offset,
      });
      const res = await fetch(`/api/search?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      // Filter out current user from results
      const currentUserId = session?.user?.id;
      const filtered = (data.users || []).filter(u => u.id !== currentUserId);

      if (append) {
        setResults(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          return [...prev, ...filtered.filter(u => !existingIds.has(u.id))];
        });
      } else {
        setResults(filtered);
      }

      setHasMore(data.hasMore || false);
      offsetRef.current = offset + filtered.length;
    } catch {
      setError('Search failed — try again');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session?.user?.id]);

  // Debounced search on query change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      offsetRef.current = 0;
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(query, 0, false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchUsers]);

  // Scroll to bottom → load more
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom && hasMore && !loadingMore) {
      searchUsers(query, offsetRef.current, true);
    }
  }, [hasMore, loadingMore, query, searchUsers]);

  // Start or open DM with selected user
  const handleSelectUser = useCallback(async (user) => {
    if (!session?.access_token) return;
    setStarting(user.id);
    setError('');
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ other_user_id: user.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to open conversation');
      }
      const data = await res.json();
      onSelectConvo(data.conversation);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(null);
    }
  }, [session?.access_token, onSelectConvo, onClose]);

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Modal panel — stop click propagation so backdrop click doesn't fire inside */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--bg-secondary)',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            New Message
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--bg-secondary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          >
            <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by username…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '14px',
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              color: 'var(--danger)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {error}
          </div>
        )}

        {/* Results list */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '52px',
                  margin: '4px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  opacity: 0.5,
                }}
              />
            ))
          ) : results.length === 0 && query.trim() ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              No users found for "{query}"
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                fontStyle: 'italic',
              }}
            >
              Type a username to search
            </div>
          ) : (
            <>
              {results.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={starting === user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: starting === user.id ? 'wait' : 'pointer',
                    textAlign: 'left',
                    borderRadius: '8px',
                    opacity: starting === user.id ? 0.6 : 1,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Avatar
                    avatarRow={user.avatar}
                    username={user.community_username}
                    size="sm"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: user.is_member ? '#B8860B' : 'var(--text-primary)',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user.community_username}
                      {user.is_member && (
                        <span
                          style={{
                            marginLeft: '4px',
                            fontSize: '10px',
                            color: '#B8860B',
                            border: '1px solid #D4AF37',
                            borderRadius: '3px',
                            padding: '0 3px',
                            fontWeight: 700,
                          }}
                        >
                          ✦
                        </span>
                      )}
                    </div>
                    {user.community_bio && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          fontFamily: 'Inter, sans-serif',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}
                      >
                        {user.community_bio}
                      </div>
                    )}
                  </div>
                  {starting === user.id && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Opening…
                    </span>
                  )}
                </button>
              ))}

              {/* Load more spinner */}
              {loadingMore && (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Loading more…
                </div>
              )}

              {/* End of results */}
              {!hasMore && results.length > 0 && (
                <div
                  style={{
                    padding: '8px 16px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontFamily: 'Inter, sans-serif',
                    opacity: 0.6,
                  }}
                >
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
