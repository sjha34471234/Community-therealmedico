// --- WHY THIS CODE EXISTS ---
// Main chat window for a single room.
// Loads last 30 messages on open, scroll up to load older messages.
// Subscribes to Supabase Realtime for new messages — unsubscribes on unmount.
// Guests can read but cannot send — shows sign in prompt instead of input.

// --- WHAT THIS MADE WORK ---
// RoomView → used by ChatLayout.jsx
// GET /api/chat/messages?room_id=xxx — initial load + load older
// POST /api/chat/messages — send new message
// Supabase Realtime channel — receives new messages pushed by DB trigger

// --- PITFALLS ---
// ⚠️ ALWAYS unsubscribe from Realtime channel on unmount — memory leak + connection leak
// ⚠️ Only subscribe to ONE channel at a time — unsubscribe before switching rooms
// ⚠️ On Realtime new message: fetch full enriched message from API (has avatar + username)
//    Do NOT use raw Realtime payload — it has no avatar or profile data
// ⚠️ Scroll to bottom on initial load and on new message sent/received
//    But do NOT scroll to bottom when loading older messages (scroll up) — ruins UX
// ⚠️ `before` cursor = created_at of oldest currently loaded message
//    Pass this when fetching older messages — never use offset
// ⚠️ mountedRef pattern — prevents state updates after unmount causing React warnings
// ⚠️ Message deduplication by id — Realtime may deliver a message already in state
//    Always check before appending
// ⚠️ Rate limit errors (429) must show user-friendly message — not raw error

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — room chat window with Realtime + lazy load
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@supabase/supabase-js';

// Supabase client for Realtime — declared outside component, never inside useEffect
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RoomView({ room }) {
  const { session } = useAuthStore();
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
  const channelRef = useRef(null);
  const oldestCreatedAt = useRef(null);

  // ── Scroll to bottom ──────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Fetch a single enriched message by id (for Realtime events) ──
  const fetchOneMessage = useCallback(async (messageId) => {
    try {
      // We fetch the full page and find our message
      // This gives us avatar + profile data the raw Realtime payload lacks
      const res = await fetch(
        `/api/chat/messages?room_id=${room.id}&limit=1`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Find our specific message in latest results
      return (data.messages || []).find(m => m.id === messageId) || null;
    } catch {
      return null;
    }
  }, [room.id]);

  // ── Load initial messages ─────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!room?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/chat/messages?room_id=${room.id}&limit=30`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      if (!mountedRef.current) return;
      const msgs = data.messages || [];
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      if (msgs.length > 0) {
        oldestCreatedAt.current = msgs[0].created_at;
      }
      // Scroll to bottom after initial load
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      if (mountedRef.current) setError('Failed to load messages');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [room?.id, scrollToBottom]);

  // ── Load older messages (scroll up) ──────────────────────
  const loadOlder = useCallback(async () => {
    if (!room?.id || loadingOlder || !hasMore || !oldestCreatedAt.current) return;
    setLoadingOlder(true);

    // Remember scroll position before inserting older messages
    const scrollEl = scrollRef.current;
    const scrollHeightBefore = scrollEl?.scrollHeight || 0;

    try {
      const res = await fetch(
        `/api/chat/messages?room_id=${room.id}&before=${encodeURIComponent(oldestCreatedAt.current)}&limit=30`,
        { cache: 'no-store' }
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
        // Restore scroll position so user stays where they were
        requestAnimationFrame(() => {
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightBefore;
          }
        });
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent fail — user can scroll up again
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [room?.id, loadingOlder, hasMore]);

  // ── Scroll listener — load older on scroll to top ────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Supabase Realtime subscription ───────────────────────
  useEffect(() => {
    if (!room?.id) return;
    mountedRef.current = true;

    // Load messages for this room
    loadInitial();

    // Subscribe to new messages in this room only
    // ⚠️ One channel per room — unsubscribe when room changes or unmounts
    const channel = supabaseClient
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        async (payload) => {
          if (!mountedRef.current) return;
          const newId = payload.new?.id;
          if (!newId) return;

          // Fetch enriched version of the new message (with avatar + username)
          const enriched = await fetchOneMessage(newId);
          if (!enriched || !mountedRef.current) return;

          setMessages(prev => {
            // Deduplicate — Realtime may fire for messages we already added optimistically
            if (prev.some(m => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });

          // Scroll to bottom for new messages
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      // ⚠️ Always unsubscribe — prevents connection leak
      supabaseClient.removeChannel(channel);
    };
  }, [room?.id]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !session?.access_token) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ room_id: room.id, body: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send');
        return;
      }

      // Clear input immediately — message arrives via Realtime
      setInput('');

      // Optimistically add message to state in case Realtime is slow
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
  }, [input, sending, session?.access_token, room?.id, scrollToBottom]);

  // Send on Enter (not Shift+Enter)
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
      {/* Room header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {room.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {room.description}
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
        {/* Load older spinner at top */}
        {loadingOlder && (
          <div
            style={{
              padding: '8px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* No more older messages indicator */}
        {!hasMore && messages.length > 0 && !loading && (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              opacity: 0.5,
            }}
          >
            Beginning of #{room.name}
          </div>
        )}

        {/* Initial load skeleton */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '48px',
                margin: '4px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                opacity: 0.4,
              }}
            />
          ))
        ) : messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              fontStyle: 'italic',
            }}
          >
            No messages yet — be the first to say something!
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isDM={false} />
          ))
        )}

        {/* Invisible anchor for scroll-to-bottom */}
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

      {/* Input area */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        {session ? (
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
              placeholder={`Message #${room.name}…`}
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
                // Auto-grow textarea up to 120px
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
        ) : (
          // Guest — show sign in prompt instead of input
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            
              href="/auth"
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            ) : (
          // Guest — show sign in prompt instead of input
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
          </div>
        )}

        {/* Character count — shown when nearing limit */}
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

      {/* Spin animation for loader */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
