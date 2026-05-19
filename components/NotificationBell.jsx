// ============================================================
// FILE: components/NotificationBell.jsx
// PURPOSE: Bell icon with unread badge, dropdown preview, polls every 60s
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: store/authStore.js, app/api/notifications/route.js
//               app/notifications/notifications.css
// ⚠️ DO NOT CHANGE: polling interval, mark-read on open pattern
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, MessageCircle, ThumbsUp, UserPlus, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notificationMeta(n) {
  const actor = n.actor?.community_username || 'Someone';
  switch (n.type) {
    case 'new_answer':
      return { icon: MessageCircle, color: '#1D6FA4', text: `${actor} answered your question` };
    case 'answer_accepted':
      return { icon: CheckCircle, color: '#2E7D32', text: 'Your answer was accepted' };
    case 'upvote_question':
      return { icon: ThumbsUp, color: '#B45309', text: `${actor} upvoted your question` };
    case 'upvote_answer':
      return { icon: ThumbsUp, color: '#B45309', text: `${actor} upvoted your answer` };
    case 'new_follower':
      return { icon: UserPlus, color: '#6B21A8', text: `${actor} started following you` };
    default:
      return { icon: Bell, color: '#9AA0AE', text: 'New notification' };
  }
}

function notificationLink(n) {
  if (n.question?.slug) return `/q/${n.question.slug}`;
  if (n.type === 'new_follower' && n.actor?.community_username) {
    return `/profile/${n.actor.community_username}`;
  }
  return '/notifications';
}

export default function NotificationBell() {
  const { user, accessToken } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/notifications?unread=true`,
        { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include', cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (_) {}
  }, [accessToken]);

  useEffect(() => {
    if (!user || !accessToken) return;
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(pollRef.current);
  }, [user, accessToken, fetchUnreadCount]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(
        `${window.location.origin}/api/notifications`,
        { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include', cache: 'no-store' }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications || []);
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
    <>
      {/* Backdrop */}
      {open && <div className="notif-backdrop" onClick={() => setOpen(false)} />}

      <div className="notif-bell-wrap" ref={dropdownRef}>
        {/* Bell button */}
        <button className={`notif-bell-btn${open ? ' notif-bell-btn--active' : ''}`} onClick={handleOpen} aria-label="Notifications">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="notif-dropdown">
            {/* Header */}
            <div className="notif-dropdown-header">
              <div className="notif-dropdown-header-left">
                <Bell size={15} />
                <span>Notifications</span>
                {unreadCount === 0 && notifications.length > 0 && (
                  <span className="notif-all-read-pill">All read</span>
                )}
              </div>
              <Link href="/notifications" className="notif-see-all" onClick={() => setOpen(false)}>
                See all
              </Link>
            </div>

            {/* Body */}
            <div className="notif-dropdown-body">
              {loading && (
                <div className="notif-loading">
                  <span className="notif-loading-dot" />
                  <span className="notif-loading-dot" />
                  <span className="notif-loading-dot" />
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="notif-empty">
                  <Bell size={28} strokeWidth={1.5} />
                  <p>You're all caught up</p>
                </div>
              )}

              {!loading && notifications.slice(0, 8).map((n) => {
                const { icon: Icon, color, text } = notificationMeta(n);
                const href = notificationLink(n);
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="notif-item-icon" style={{ background: `${color}18`, color }}>
                      <Icon size={14} />
                    </span>
                    <div className="notif-item-body">
                      <p className="notif-item-text">{text}</p>
                      {n.question?.title && (
                        <p className="notif-item-sub">{n.question.title}</p>
                      )}
                      <p className="notif-item-time">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="notif-item-dot" />}
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            {!loading && notifications.length > 0 && (
              <div className="notif-dropdown-footer">
                <Link href="/notifications" className="notif-footer-link" onClick={() => setOpen(false)}>
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — notification bell
// [May 19, 2026] REDESIGNED: New dropdown layout — icon per type, backdrop,
//               max-height scroll, loading dots, empty state, footer link.
// --- END CHANGE LOG ---
