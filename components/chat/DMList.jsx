// --- WHY THIS CODE EXISTS ---
// Renders the list of DM conversations in the left sidebar.
// Lazy loads 15 at a time. Polls every 15 seconds.
// --- PITFALLS ---
// ⚠️ Use user + accessToken from authStore — never session
// ⚠️ Polling must be cleared on unmount
// ⚠️ Poll = refresh page 1 only — never append poll results
// ⚠️ Avatar prop is avatarRow — NEVER avatar=
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM list sidebar
// [May 23, 2026] FIXED: session replaced with user + accessToken from authStore
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

  const fetchFirstPage = useCallback(async () => {
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

  const loadMore = useCallback(async () => {
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
      setConvos(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const fresh = newConvos.filter(c => !existingIds.has(c.id));
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

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && hasMore && !loadingMore) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  useEffect(() => {
    fetchFirstPage();
    const interval = setInterval(fetchFirstPage, 15000);
    return () => clearInterval(interval);
  }, [fetchFirstPage]);

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
        <button onClick={onNewDM} title="New message" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Plus size={16} />
        </button>
      </div>

      <div ref={listRef} onScroll={handleScroll} style={{ overflowY: 'auto', flex: 1, padding: '0 0 8px' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '52px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', margin: '2px 8px', opacity: 0.5 }} />
          ))
        ) : convos.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
            No messages yet.
            <br />
            <button onClick={onNewDM} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' }}>Start a conversation</button>
          </div>
        ) : (
          <>
            {convos.map(convo => {
              const isActive = convo.id === activeConvoId;
              const other = convo.other_user;
              return (
                <button key={convo.id} onClick={() => onSelectConvo(convo)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'calc(100% - 8px)', margin: '1px 4px', padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: isActive ? 'var(--accent-light)' : 'transparent', textAlign: 'left', transition: 'background-color 0.15s' }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <div style={{ flexShrink: 0 }}>
                    <Avatar avatarRow={other.avatar} username={other.username} size="sm" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: other.is_member ? '#B8860B' : isActive ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {other.username || 'Unknown'}
                      {other.is_member && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#B8860B', border: '1px solid #D4AF37', borderRadius: '3px', padding: '0 3px', fontWeight: 700 }}>✦</span>}
                    </div>
                    {convo.lastMessage?.preview ? (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {convo.lastMessage.sentByMe && <span style={{ fontWeight: 500 }}>You: </span>}
                        {convo.lastMessage.preview}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontStyle: 'italic', marginTop: '1px' }}>No messages yet</div>
                    )}
                  </div>
                  {convo.last_message_at && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}>
                      {shortTime(convo.last_message_at)}
                    </div>
                  )}
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
