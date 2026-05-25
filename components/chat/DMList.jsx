// --- WHY THIS CODE EXISTS ---
// Renders the list of DM conversations in the left sidebar.
// Lazy loads 15 at a time. Polls every 15 seconds.
// Shows blue unread dot + bold name for conversations with unread messages.
// Marks conversation as read when user opens it via PATCH /api/chat/dm.
// --- PITFALLS ---
// ⚠️ Use user + accessToken from authStore — never session
// ⚠️ Polling must be cleared on unmount
// ⚠️ Poll = refresh page 1 only — never append poll results
// ⚠️ Avatar prop is avatarRow — NEVER avatar=
// ⚠️ isUnread comes from API — never compute it client-side
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM list sidebar
// [May 23, 2026] FIXED: session replaced with user + accessToken from authStore
// [May 25, 2026] ADDED: Unread indicator — blue dot + bold name + bold preview
//                Calls PATCH /api/chat/dm when conversation opened to mark read.
//                isUnread flag comes from GET /api/chat/dm response.
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import useAuthStore from '@/store/authStore';

function shortTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  return Math.floor(hrs / 24) + 'd';
}

const PAGE_SIZE = 15;

export default function DMList({ activeConvoId, onSelectConvo, onNewDM }) {
  const { user, accessToken } = useAuthStore();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const listRef = useRef(null);

  const fetchFirstPage = useCallback(async function() {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/chat/dm?offset=0', {
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setConvos(data.conversations || []);
      setHasMore(data.hasMore || false);
      offsetRef.current = data.conversations?.length || 0;
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadMore = useCallback(async function() {
    if (!accessToken || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch('/api/chat/dm?offset=' + offsetRef.current, {
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const newConvos = data.conversations || [];
      setConvos(function(prev) {
        const existingIds = new Set(prev.map(function(c) { return c.id }));
        const fresh = newConvos.filter(function(c) { return !existingIds.has(c.id) });
        return [...prev, ...fresh];
      });
      setHasMore(data.hasMore || false);
      offsetRef.current = offsetRef.current + newConvos.length;
    } catch {
      // silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [accessToken, loadingMore, hasMore]);

  const handleScroll = useCallback(function() {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && hasMore && !loadingMore) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  useEffect(function() {
    fetchFirstPage();
    const interval = setInterval(fetchFirstPage, 15000);
    return function() { clearInterval(interval); };
  }, [fetchFirstPage]);

  // Mark conversation as read when opened
  async function markAsRead(convoId) {
    if (!accessToken) return;
    try {
      await fetch('/api/chat/dm', {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_id: convoId }),
        credentials: 'include',
      });
      // Optimistically clear unread dot in local state
      setConvos(function(prev) {
        return prev.map(function(c) {
          if (c.id === convoId) return { ...c, isUnread: false };
          return c;
        });
      });
    } catch {
      // silent fail — unread dot will clear on next poll
    }
  }

  function handleSelectConvo(convo) {
    if (convo.isUnread) markAsRead(convo.id);
    onSelectConvo(convo);
  }

  if (!user) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
        <MessageSquare size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
        <div>Sign in to view direct messages</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Direct Messages</span>
        <button onClick={onNewDM} title="New message" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} onMouseEnter={function(e) { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)' }} onMouseLeave={function(e) { e.currentTarget.style.backgroundColor = 'transparent' }}>
          <Plus size={16} />
        </button>
      </div>

      <div ref={listRef} onScroll={handleScroll} style={{ overflowY: 'auto', flex: 1, padding: '0 0 8px' }}>
        {loading ? (
          Array.from({ length: 4 }).map(function(_, i) {
            return (
              <div key={i} style={{ height: '52px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', margin: '2px 8px', opacity: 0.5 }} />
            );
          })
        ) : convos.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
            No messages yet.
            <br />
            <button onClick={onNewDM} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' }}>Start a conversation</button>
          </div>
        ) : (
          <>
            {convos.map(function(convo) {
              const isActive = convo.id === activeConvoId;
              const other = convo.other_user;
              const unread = convo.isUnread && !isActive;

              return (
                <button key={convo.id} onClick={function() { handleSelectConvo(convo) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'calc(100% - 8px)', margin: '1px 4px', padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: isActive ? 'var(--accent-light)' : 'transparent', textAlign: 'left', transition: 'background-color 0.15s' }} onMouseEnter={function(e) { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)' }} onMouseLeave={function(e) { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}>

                  {/* Avatar with unread blue ring */}
                  <div style={{ flexShrink: 0, position: 'relative' }}>
                    <Avatar avatarRow={other.avatar} username={other.username} size="sm" />
                    {unread && (
                      <span style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '0px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        border: '2px solid var(--bg-primary)',
                        display: 'block',
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Username — bold if unread */}
                    <div style={{ fontSize: '13px', fontWeight: unread ? 700 : isActive ? 700 : 500, color: other.is_member ? '#B8860B' : isActive ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {other.username || 'Unknown'}
                      {other.is_member && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#B8860B', border: '1px solid #D4AF37', borderRadius: '3px', padding: '0 3px', fontWeight: 700 }}>✦</span>}
                    </div>

                    {/* Preview — bold if unread */}
                    {convo.lastMessage?.preview ? (
                      <div style={{ fontSize: '11px', color: unread ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px', fontWeight: unread ? 600 : 400 }}>
                        {convo.lastMessage.sentByMe && <span style={{ fontWeight: 500 }}>You: </span>}
                        {convo.lastMessage.preview}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontStyle: 'italic', marginTop: '1px' }}>No messages yet</div>
                    )}
                  </div>

                  {/* Time + unread dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {convo.last_message_at && (
                      <div style={{ fontSize: '11px', color: unread ? 'var(--accent-primary)' : 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontWeight: unread ? 700 : 400 }}>
                        {shortTime(convo.last_message_at)}
                      </div>
                    )}
                  </div>

                </button>
              );
            })}
            {loadingMore && <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Loading…</div>}
            {!hasMore && convos.length > 0 && <div style={{ padding: '8px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'Inter, sans-serif', opacity: 0.6 }}>All caught up</div>}
          </>
        )}
      </div>
    </div>
  );
}
