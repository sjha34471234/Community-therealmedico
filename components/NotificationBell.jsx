// ============================================================
// FILE: components/NotificationBell.jsx
// PURPOSE: Bell icon with unread badge, dropdown preview, polls every 60s
// LAST CHANGED: May 22, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: store/authStore.js, app/api/notifications/route.js,
//               components/Avatar.jsx, app/notifications/notifications.css
// ⚠️ DO NOT CHANGE: polling interval, mark-read on open pattern
//                   Avatar size="xs" = 28px — matches reply thread hierarchy
//                   actor_avatar passed straight from API — never fetched here
//                   notificationMeta still returns color for the unread dot
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, MessageCircle, ThumbsUp, UserPlus, CheckCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/Avatar';
import '@/app/notifications/notifications.css';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- WHY THIS CODE EXISTS ---
// notificationMeta now only drives the text label and accent color.
// The icon is no longer shown — replaced by the actor's Avatar.
// color is kept so we can tint the unread dot consistently per type.
function notificationMeta(n) {
  const actor = n.actor?.community_username || 'Someone';
  switch (n.type) {
    case 'new_answer':
      return { color: '#1D6FA4', text: `${actor} answered your question` };
    case 'new_reply':
      return { color: '#1D6FA4', text: `${actor} replied to your answer` };
    case 'answer_accepted':
      return { color: '#2E7D32', text: 'Your answer was accepted' };
    case 'upvote_question':
      return { color: '#B45309', text: `${actor} upvoted your question` };
    case 'upvote_answer':
      return { color: '#B45309', text: `${actor} upvoted your answer` };
    case 'new_follower':
      return { color: '#6B21A8', text: `${actor} started following you` };
    default:
      return { color: '#9AA0AE', text: 'New notification' };
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
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 60, right: 12 });
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  function calcPosition() {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const dropdownWidth = 300;
    const left = Math.max(8, rect.right - dropdownWidth);
    setDropdownPos({ top: rect.bottom + 8, left });
  }

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
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    calcPosition();
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
    <div ref={bellRef}>
      <button
        className={`notif-bell-btn${open ? ' notif-bell-btn--active' : ''}`}
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell size={26} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {mounted && open && createPortal(
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />

          <div
            className="notif-dropdown"
            ref={dropdownRef}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
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
                const { color, text } = notificationMeta(n);
                const href = notificationLink(n);
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                    onClick={() => setOpen(false)}
                  >
                    {/* --- WHY THIS CODE EXISTS ---
                        Actor avatar (xs, 28px) replaces the old generic type icon.
                        actor_avatar comes from the API — already fetched in bulk.
                        Null-safe: if actor or avatar is missing, Avatar shows
                        the first letter of actor username as fallback.
                        Link wraps the avatar only if actor username exists. */}
                    <span className="notif-item-icon">
                      {n.actor?.community_username ? (
                        <a href={'/profile/' + n.actor.community_username} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', textDecoration: 'none' }}>
                          <Avatar
                            avatarRow={n.actor_avatar || null}
                            username={n.actor.community_username}
                            isMember={n.actor.is_member === true}
                            size="xs"
                          />
                        </a>
                      ) : (
                        <Avatar
                          avatarRow={null}
                          username="?"
                          isMember={false}
                          size="xs"
                        />
                      )}
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
        </>,
        document.body
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — notification bell
// [May 19, 2026] REDESIGNED: Portal-based dropdown, backdrop, type icons
// [May 19, 2026] FIXED: Dynamic positioning via getBoundingClientRect()
//               Dropdown now anchors precisely below the bell button.
// [May 22, 2026] UPDATED: Actor avatar (xs, 28px) replaces generic type icon.
//               REASON: Avatar system complete — notification dropdown was the
//               last place showing a generic icon instead of the real actor avatar.
//               actor_avatar comes from API (bulk fetched in notifications/route.js).
//               Added new_reply case to notificationMeta (was showing "New notification").
//               Bell size kept at 26 (set earlier this session).
// --- END CHANGE LOG ---
