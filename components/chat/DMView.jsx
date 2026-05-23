// --- WHY THIS CODE EXISTS ---
// Main chat window for a single DM conversation.
// Same pattern as RoomView but for encrypted private messages.
// "Sent by me" messages appear on the right (WhatsApp style).
// Subscribes to Supabase Realtime on the dm_messages table filtered by conversation_id.

// --- WHAT THIS MADE WORK ---
// DMView → used by ChatLayout.jsx
// GET /api/chat/dm/messages?conversation_id=xxx — initial load + load older
// POST /api/chat/dm/messages — send encrypted message
// Supabase Realtime — receives new DMs in real time

// --- PITFALLS ---
// ⚠️ ALWAYS unsubscribe Realtime channel on unmount — never leave open
// ⚠️ Raw Realtime payload has NO decrypted body — always fetch enriched message from API
// ⚠️ Scroll to bottom on initial load and on new message — but NOT when loading older
// ⚠️ `before` cursor = created_at of oldest currently loaded message
// ⚠️ mountedRef pattern — prevents state updates after unmount
// ⚠️ Deduplicate messages by id — Realtime + optimistic add can cause doubles
// ⚠️ Bearer token required for all fetch calls — read from session
// ⚠️ convo.other_user.username used in placeholder — always null-safe

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM window with Realtime + AES-256 + lazy load
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader, ChevronLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';
import Avatar from '@/components/Avatar';
import useAuthStore from '@/store/authStore';
import { createClient } from '@supabase/supabase-js';

// Supabase client for Realtime — declared outside component
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

  // ── Scroll to bottom ──────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Fetch one enriched DM message by id (for Realtime) ───
  // Raw Realtime payload has cipher text — we need decrypted version from API
  const fetchLatestMessages = useCallback(async () => {
    if (!session?.access_token || !convo?.id) return null;
    try {
      const res = await fetch(
        `/api/chat/dm/messages?conversation_id=${convo.id}&limit=1`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.messages || [];
    } catch {
      return null;
    }
  }, [session?.access_token, convo?.id]);

  // ── Load initial messages ─────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!convo?.id || !session?.access_token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/chat/dm/messages?conversation_id=${convo.id}&limit=30`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!mountedRef.current) return;
      const msgs = data.messages || [];
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      if (msgs.length > 0) {
        oldestCreatedAt.current = msgs[0].created_at;
      }
      setTimeout(scrollToBottom, 100);
    } catch {
      if (mountedRef.current) setError('Failed to load messages');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [convo?.id, session?.access_token, scrollToBottom]);

  // ── Load older messages ───────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!convo?.id || !session?.access_token || loadingOlder || !hasMore || !oldestCreatedAt.current) return;
    setLoadingOlder(true);

    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;

    try {
      const res = await fetch(
        `/api/chat/dm/messages?conversation_id=${convo.id}&before=${encodeURIComponent(oldestCreatedAt.current)}&limit=30`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }
      );
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
        // Restore scroll position — do not jump to top
        requestAnimationFrame(() => {
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightBefore;
          }
        });
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent fail
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [convo?.id, session?.access_token, loadingOlder, hasMore]);

  // ── Scroll listener ───────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Supabase Realtime subscription ───────────────────────
  useEffect(() => {
    if (!convo?.id) return;
    mountedRef.current = true;
    loadInitial();

    // Subscribe to new DM messages in this conversation only
    const channel = supabaseClient
      .channel(`dm:${convo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_dm_messages',
          filter: `conversation_id=eq.${convo.id}`,
        },
        async (payload) => {
          if (!mountedRef.current) return;
          const newId = payload.new?.id;
          if (!newId) return;

          // Fetch latest enriched message (decrypted) from API
          // ⚠️ Never use raw payload — it has cipher text not plaintext
          const latest = await fetchLatestMessages();
          if (!latest || !mountedRef.current) return;

          const incoming = latest.find(m => m.id === newId);
          if (!incoming) return;

          setMessages(prev => {
            // Deduplicate — optimistic add may have already added this
            if (prev.some(m => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      // ⚠️ Always unsubscribe on unmount
      supabaseClient.removeChannel(channel);
    };
  }, [convo?.id]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !session?.access_token) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat/dm/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          conversation_id: convo.id,
          body: text,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send');
        return;
      }

      setInput('');

      // Optimistically add — Realtime will deduplicate if it arrives too
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
  }, [input, sending, session?.access_token, convo?.id, scrollToBottom]);

  // Send on Enter, new line on Shift+Enter
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* DM header — other user's avatar + name */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        {/* Back button — visible on mobile */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <Avatar
          avatarRow={other?.avatar}
          username={other?.username}
          size="sm"
        />

        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: other?.is_member ? '#B8860B' : 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {other?.username || 'Unknown'}
            {other?.is_member && (
              <span
                style={{
                  marginLeft: '5px',
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
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            🔒 End-to-end encrypted
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Load older spinner */}
        {loadingOlder && (
          <div
            style={{
              padding: '8px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Beginning of conversation */}
        {!hasMore && messages.length > 0 && !loading && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              opacity: 0.5,
            }}
          >
            🔒 This is the beginning of your encrypted conversation with {other?.username}
          </div>
        )}

        {/* Skeleton */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '44px',
                margin: '4px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                opacity: 0.4,
                alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                width: '60%',
              }}
            />
          ))
        ) : messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Avatar
              avatarRow={other?.avatar}
              username={other?.username}
              size="lg"
            />
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginTop: '8px',
              }}
            >
              {other?.username || 'Unknown'}
            </div>
            <div style={{ fontSize: '13px', fontStyle: 'italic' }}>
              Send a message to start the conversation
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>
              🔒 Messages are encrypted
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isDM={true} />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div
          style={{
            padding: '6px 16px',
            backgroundColor: '#FEF2F2',
            color: 'var(--danger)',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '8px 12px',
          }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.username || ''}…`}
            rows={1}
            maxLength={500}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              background: input.trim() && !sending
                ? 'var(--accent-primary)'
                : 'var(--bg-tertiary)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: input.trim() && !sending ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s',
              flexShrink: 0,
            }}
          >
            {sending
              ? <Loader size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={16} color={input.trim() ? '#fff' : 'var(--text-muted)'} />
            }
          </button>
        </div>

        {/* Character count */}
        {input.length > 400 && (
          <div
            style={{
              textAlign: 'right',
              fontSize: '11px',
              color: input.length > 480 ? 'var(--danger)' : 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
              marginTop: '4px',
            }}
          >
            {500 - input.length} left
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
