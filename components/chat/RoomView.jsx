// --- WHY THIS CODE EXISTS ---
// Main chat window for a single room.
// Loads last 30 messages on open, scroll up to load older messages.
// Subscribes to Supabase Realtime for new messages — unsubscribes on unmount.
// Guests can read but cannot send — shows sign in prompt instead of input.
// --- PITFALLS ---
// ⚠️ ALWAYS unsubscribe Realtime channel on unmount
// ⚠️ On Realtime new message: fetch enriched message from API — never use raw payload
// ⚠️ mountedRef pattern — prevents state updates after unmount
// ⚠️ Deduplicate messages by id
// ⚠️ All anchor tags single line — iPad clipboard rule
// ⚠️ Use user + accessToken from authStore — never session
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — room chat window with Realtime + lazy load
// [May 23, 2026] FIXED: session replaced with user + accessToken from authStore
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import MessageBubble from './MessageBubble';
import useAuthStore from '@/store/authStore';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RoomView({ room, onBack }) {
  const { user, accessToken } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const mountedRef = useRef(true);
  const oldestCreatedAt = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchOneMessage = useCallback(async (messageId) => {
    try {
      const res = await fetch('/api/chat/messages?room_id=' + room.id + '&limit=1', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.messages || []).find(m => m.id === messageId) || null;
    } catch {
      return null;
    }
  }, [room.id]);

  const loadInitial = useCallback(async () => {
    if (!room?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/messages?room_id=' + room.id + '&limit=30', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      if (!mountedRef.current) return;
      const msgs = data.messages || [];
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      if (msgs.length > 0) oldestCreatedAt.current = msgs[0].created_at;
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      if (mountedRef.current) setError('Failed to load messages');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [room?.id, scrollToBottom]);

  const loadOlder = useCallback(async () => {
    if (!room?.id || loadingOlder || !hasMore || !oldestCreatedAt.current) return;
    setLoadingOlder(true);
    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;
    try {
      const res = await fetch('/api/chat/messages?room_id=' + room.id + '&before=' + encodeURIComponent(oldestCreatedAt.current) + '&limit=30', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (!mountedRef.current) return;
      const older = data.messages || [];
      if (older.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = older.filter(m => !existingIds.has(m.id));
          return [...fresh, ...prev];
        });
        oldestCreatedAt.current = older[0].created_at;
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightBefore;
        });
      }
      setHasMore(data.hasMore || false);
    } catch {
      // silent fail
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [room?.id, loadingOlder, hasMore]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) loadOlder();
  }, [hasMore, loadingOlder, loadOlder]);

  useEffect(() => {
    if (!room?.id) return;
    mountedRef.current = true;
    loadInitial();
    const channel = supabaseClient
      .channel('room:' + room.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_chat_messages', filter: 'room_id=eq.' + room.id },
        async (payload) => {
          if (!mountedRef.current) return;
          const newId = payload.new?.id;
          if (!newId) return;
          const enriched = await fetchOneMessage(newId);
          if (!enriched || !mountedRef.current) return;
          setMessages(prev => {
            if (prev.some(m => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();
    return () => {
      mountedRef.current = false;
      supabaseClient.removeChannel(channel);
    };
  }, [room?.id]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !accessToken) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ room_id: room.id, body: text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send'); return; }
      setInput('');
      setMessages(prev => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch {
      setError('Failed to send — check your connection');
    } finally {
      setSending(false);
    }
  }, [input, sending, accessToken, room?.id, scrollToBottom]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{room.name}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{room.description}</div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
        {loadingOlder && (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!hasMore && messages.length > 0 && !loading && (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'Inter, sans-serif', opacity: 0.5 }}>
            Beginning of #{room.name}
          </div>
        )}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '48px', margin: '4px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', opacity: 0.4 }} />
          ))
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
            No messages yet — be the first to say something!
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} isDM={false} />)
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ padding: '6px 16px', backgroundColor: '#FEF2F2', color: 'var(--danger)', fontSize: '12px', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          {error}
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        {user ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '8px 12px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={'Message #' + room.name + '…'}
              rows={1}
              maxLength={500}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', resize: 'none', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{ background: input.trim() && !sending ? 'var(--accent-primary)' : 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: input.trim() && !sending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s', flexShrink: 0 }}
            >
              {sending ? <Loader size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} color={input.trim() ? '#fff' : 'var(--text-muted)'} />}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
            <a href="/auth" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
            {' '}to join the conversation
          </div>
        )}
        {input.length > 400 && (
          <div style={{ textAlign: 'right', fontSize: '11px', color: input.length > 480 ? 'var(--danger)' : 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}>
            {500 - input.length} left
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
