// ============================================================
// FILE: components/NotificationBell.jsx
// PURPOSE: Bell icon with unread badge, dropdown preview, polls every 60s
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: store/authStore.js, app/api/notifications/route.js
// ⚠️ DO NOT CHANGE: polling interval, mark-read on open pattern
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';

// ── helpers ──────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notificationText(n) {
  const actor = n.actor?.community_username || 'Someone';
  switch (n.type) {
    case 'new_answer':       return { bold: actor, rest: ' answered your question' };
    case 'answer_accepted':  return { bold: null,  rest: 'Your answer was accepted' };
    case 'upvote_question':  return { bold: actor, rest: ' upvoted your question' };
    case 'upvote_answer':    return { bold: actor, rest: ' upvoted your answer' };
    case 'new_follower':     return { bold: actor, rest: ' started following you' };
    default:                 return { bold: null,  rest: 'New notification' };
  }
}

function notificationLink(n) {
  if (n.question?.slug) return `/q/${n.question.slug}`;
  if (n.type === 'new_follower' && n.actor?.community_username) {
    return `/profile/${n.actor.community_username}`;
  }
  return '/notifications';
}

// ── component ─────────────────────────────────────────────────

export default function NotificationBell() {
  const { user, accessToken } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  // ── fetch unread count ──────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/notifications?unread=true`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
          cache: 'no-store',
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (_) {}
  }, [accessToken]);

  // ── poll every 60 seconds ───────────────────────────────────
  useEffect(() => {
    if (!user || !accessToken) return;
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(pollRef.current);
  }, [user, accessToken, fetchUnreadCount]);

  // ── close on outside click ──────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── open dropdown — fetch full list + mark read ─────────────
  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(
        `${window.location.origin}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications || []);

      // mark all read
      if (unreadCount > 0) {
        await fetch(`${window.location.origin}/api/notifications`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        setUnreadCount(0);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      {/* Bell button */}
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            <Link href="/notifications" className="notif-see-all" onClick={() => setOpen(false)}>
              See all
            </Link>
          </div>

          {loading && (
            <div className="notif-empty">Loading...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="notif-empty">No notifications yet</div>
          )}

          {!loading && notifications.slice(0, 10).map((n) => {
            const { bold, rest } = notificationText(n);
            const href = notificationLink(n);
            return (
              <Link
                key={n.id}
                href={href}
                className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                onClick={() => setOpen(false)}
              >
                <p className="notif-item-text">
                  {bold && <strong>{bold}</strong>}
                  {rest}
                </p>
                {n.question?.title && (
                  <p className="notif-item-sub">{n.question.title}</p>
                )}
                <p className="notif-item-time">{timeAgo(n.created_at)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — notification bell
// REASON: Notification Centre feature
// --- END CHANGE LOG ---
