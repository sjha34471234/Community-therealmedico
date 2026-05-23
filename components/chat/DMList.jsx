// --- WHY THIS CODE EXISTS ---
// Renders the list of DM conversations in the left sidebar.
// Shows the other person's avatar, username, and last message preview (decrypted by API).
// Lazy loads 15 conversations at a time — scroll to bottom to load more.
// Polls every 15 seconds for new DM activity — same pattern as RoomList.

// --- WHAT THIS MADE WORK ---
// DMList → used by ChatLayout.jsx
// Fetches from /api/chat/dm with offset-based pagination
// Active conversation is highlighted
// "New DM" button opens UserSearchModal

// --- PITFALLS ---
// ⚠️ Polling must be cleared on unmount — return clearInterval in useEffect
// ⚠️ On poll refresh, replace the FIRST page only — never append poll results
//    Appending poll results causes duplicates. Poll = refresh page 1, not load more.
// ⚠️ "Load more" appends to existing list using offset — not cursor
//    DM list order is stable (sorted by last_message_at) so offset is safe here
// ⚠️ Avatar prop is avatarRow — NEVER avatar=
// ⚠️ Requires auth — guests see a "Sign in to view DMs" message instead
// ⚠️ Bearer token read from Supabase session — never hardcoded

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM list sidebar with lazy load + polling
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import useAuthStore from '@/store/authStore';

// Format last message time — short format
function shortTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const PAGE_SIZE = 15;

export default function DMList({ activeConvoId, onSelectConvo, onNewDM }) {
  const { session } = useAuthStore();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const listRef = useRef(null);

  // Fetch first page — used on mount and on poll refresh
  const fetchFirstPage = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/chat/dm?offset=0', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setConvos(data.conversations || []);
      setHasMore(data.hasMore || false);
      offsetRef.current = data.conversations?.length || 0;
    } catch {
      // Silent fail on poll
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Load more — appends next page to existing list
  const loadMore = useCallback(async () => {
    if (!session?.access_token || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/chat/dm?offset=${offsetRef.current}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const newConvos = data.conversations || [];
      setConvos(prev => {
        // Deduplicate by id in case of overlap
        const existingIds = new Set(prev.map(c => c.id));
        const fresh = newConvos.filter(c => !existingIds.has(c.id));
        return [...prev, ...fresh];
      });
      setHasMore(data.hasMore || false);
      offsetRef.current = offsetRef.current + newConvos.length;
    } catch {
      // Silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [session?.access_token, loadingMore, hasMore]);

  // Scroll listener — load more when user scrolls to bottom of DM list
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // Mount: fetch first page + start polling
  useEffect(() => {
    fetchFirstPage();
    const interval = setInterval(fetchFirstPage, 15000);
    return () => clearInterval(interval);
  }, [fetchFirstPage]);

  // Not signed in
  if (!session) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <MessageSquare size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
        <div>Sign in to view direct messages</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Section header + New DM button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px 8px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Direct Messages
        </span>

        {/* New DM button */}
        <button
          onClick={onNewDM}
          title="New message"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Scrollable DM list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          overflowY: 'auto',
          flex: 1,
          padding: '0 0 8px',
        }}
      >
        {loading ? (
          // Skeleton placeholders
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '52px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                margin: '2px 8px',
                opacity: 0.5,
              }}
            />
          ))
        ) : convos.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              fontStyle: 'italic',
            }}
          >
            No messages yet.
            <br />
            <button
              onClick={onNewDM}
              style={{
                marginTop: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                textDecoration: 'underline',
              }}
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <>
            {convos.map(convo => {
              const isActive = convo.id === activeConvoId;
              const other = convo.other_user;

              return (
                <button
                  key={convo.id}
                  onClick={() => onSelectConvo(convo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: 'calc(100% - 8px)',
                    margin: '1px 4px',
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                    textAlign: 'left',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Other user avatar */}
                  <div style={{ flexShrink: 0 }}>
                    <Avatar
                      avatarRow={other.avatar}
                      username={other.username}
                      size="sm"
                    />
                  </div>

                  {/* Username + last message preview */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        color: other.is_member
                          ? '#B8860B'
                          : isActive
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {other.username || 'Unknown'}
                      {other.is_member && (
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

                    {convo.lastMessage?.preview ? (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontFamily: 'Inter, sans-serif',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}
                      >
                        {convo.lastMessage.sentByMe && (
                          <span style={{ fontWeight: 500 }}>You: </span>
                        )}
                        {convo.lastMessage.preview}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontFamily: 'Inter, sans-serif',
                          fontStyle: 'italic',
                          marginTop: '1px',
                        }}
                      >
                        No messages yet
                      </div>
                    )}
                  </div>

                  {/* Last activity time */}
                  {convo.last_message_at && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: 'Inter, sans-serif',
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                        marginTop: '2px',
                      }}
                    >
                      {shortTime(convo.last_message_at)}
                    </div>
                  )}
                </button>
              );
            })}

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
                Loading…
              </div>
            )}

            {/* End of list */}
            {!hasMore && convos.length > 0 && (
              <div
                style={{
                  padding: '8px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif',
                  opacity: 0.6,
                }}
              >
                All caught up
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
