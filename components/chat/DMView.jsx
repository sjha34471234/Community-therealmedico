// --- WHY THIS CODE EXISTS ---
// Main chat window for a single DM conversation.
// Same pattern as RoomView but for encrypted private messages.
// "Sent by me" messages appear on the right (WhatsApp style).
// --- PITFALLS ---
// ⚠️ ALWAYS unsubscribe Realtime channel on unmount
// ⚠️ Raw Realtime payload has NO decrypted body — always fetch from API
// ⚠️ mountedRef pattern — prevents state updates after unmount
// ⚠️ Use user + accessToken from authStore — never session
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM window with Realtime + AES-256 + lazy load
// [May 23, 2026] FIXED: session replaced with user + accessToken from authStore
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader, ChevronLeft } from 'lucide-react';
import ReportButton from '@/components/ReportButton';
import BlockButton from '@/components/BlockButton';
import MessageBubble from './MessageBubble';
import Avatar from '@/components/Avatar';
import useAuthStore from '@/store/authStore';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DMView({ convo, onBack }) {
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
  const other = convo?.other_user;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchLatestMessages = useCallback(async () => {
    if (!accessToken || !convo?.id) return null;
    try {
      const res = await fetch('/api/chat/dm/messages?conversation_id=' + convo.id + '&limit=1', {
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.messages || [];
    } catch {
      return null;
    }
  }, [accessToken, convo?.id]);

  const loadInitial = useCallback(async () => {
    if (!convo?.id || !accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/dm/messages?conversation_id=' + convo.id + '&limit=30', {
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!mountedRef.current) return;
      const msgs = data.messages || [];
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      if (msgs.length > 0) oldestCreatedAt.current = msgs[0].created_at;
      setTimeout(scrollToBottom, 100);
    } catch {
      if (mountedRef.current) setError('Failed to load messages');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [convo?.id, accessToken, scrollToBottom]);

  const loadOlder = useCallback(async () => {
    if (!convo?.id || !accessToken || loadingOlder || !hasMore || !oldestCreatedAt.current) return;
    setLoadingOlder(true);
    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;
    try {
      const res = await fetch('/api/chat/dm/messages?conversation_id=' + convo.id + '&before=' + encodeURIComponent(oldestCreatedAt.current) + '&limit=30', {
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
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
  }, [convo?.id, accessToken, loadingOlder, hasMore]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) loadOlder();
  }, [hasMore, loadingOlder, loadOlder]);

  useEffect(() => {
    if (!convo?.id) return;
    mountedRef.current = true;
    loadInitial();
    const channel = supabaseClient
      .channel('dm:' + convo.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_dm_messages', filter: 'conversation_id=eq.' + convo.id },
        async (payload) => {
          if (!mountedRef.current) return;
          const newId = payload.new?.id;
          if (!newId) return;
          const latest = await fetchLatestMessages();
          if (!latest || !mountedRef.current) return;
          const incoming = latest.find(m => m.id === newId);
          if (!incoming) return;
          setMessages(prev => {
            if (prev.some(m => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();
    return () => {
      mountedRef.current = false;
      supabaseClient.removeChannel(channel);
    };
  }, [convo?.id]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !accessToken) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/dm/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ conversation_id: convo.id, body: text }),
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
  }, [input, sending, accessToken, convo?.id, scrollToBottom]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <Avatar avatarRow={other?.avatar} username={other?.username} size="sm" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: other?.is_member ? '#B8860B' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            {other?.username || 'Unknown'}
            {other?.is_member && <span style={{ marginLeft: '5px', fontSize: '10px', color: '#B8860B', border: '1px solid #D4AF37', borderRadius: '3px', padding: '0 3px', fontWeight: 700 }}>✦</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>🔒 End-to-end encrypted</div>
        </div>
        {/* Block button — icon variant, sits in header */}
        {other?.id && (
          <BlockButton
            targetUserId={other.id}
            targetUsername={other.username || 'this user'}
            variant="icon"
          />
        )}
      </div>

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
        {loadingOlder && (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!hasMore && messages.length > 0 && !loading && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'Inter, sans-serif', opacity: 0.5 }}>
            🔒 Beginning of your encrypted conversation with {other?.username}
          </div>
        )}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: '44px', margin: '4px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', opacity: 0.4, alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end', width: '60%' }} />
          ))
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
            <Avatar avatarRow={other?.avatar} username={other?.username} size="lg" />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>{other?.username || 'Unknown'}</div>
            <div style={{ fontSize: '13px', fontStyle: 'italic' }}>Send a message to start the conversation</div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>🔒 Messages are encrypted</div>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} isDM={true} />)
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ padding: '6px 16px', backgroundColor: '#FEF2F2', color: 'var(--danger)', fontSize: '12px', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          {error}
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '8px 12px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Message ' + (other?.username || '') + '…'}
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
