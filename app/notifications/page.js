// ============================================================
// FILE: app/notifications/page.js
// PURPOSE: Full notifications page — shows all 50 recent notifications
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Phase 10 — Notification Centre
// DEPENDENCIES: store/authStore.js, app/api/notifications/route.js,
//               app/notifications/notifications.css
// ⚠️ DO NOT CHANGE: noindex metadata — this is a private page.
//                   force-dynamic — live data, never cache.
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import '@/app/notifications/notifications.css';

export const metadata = {
  title: 'Notifications — The Real Medico Community',
  robots: { index: false, follow: false },
};

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
    case 'new_answer':      return { bold: actor, rest: ' answered your question' };
    case 'answer_accepted': return { bold: null,  rest: 'Your answer was accepted' };
    case 'upvote_question': return { bold: actor, rest: ' upvoted your question' };
    case 'upvote_answer':   return { bold: actor, rest: ' upvoted your answer' };
    case 'new_follower':    return { bold: actor, rest: ' started following you' };
    default:                return { bold: null,  rest: 'New notification' };
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

export default function NotificationsPage() {
  const { user, loading, accessToken } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  // Fetch all notifications
  useEffect(() => {
    if (!user || !accessToken) return;

    async function fetchAll() {
      setFetching(true);
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

        // Mark all read
        await fetch(`${window.location.origin}/api/notifications`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
      } catch (_) {
      } finally {
        setFetching(false);
      }
    }

    fetchAll();
  }, [user, accessToken]);

  if (loading || !user) return null;

  return (
    <main className="notif-page">
      <div className="notif-page-inner">
        <h1 className="notif-page-title">Notifications</h1>

        {fetching && (
          <div className="notif-page-empty">Loading...</div>
        )}

        {!fetching && notifications.length === 0 && (
          <div className="notif-page-empty">
            No notifications yet. Start participating to get notified!
          </div>
        )}

        {!fetching && notifications.length > 0 && (
          <div className="notif-page-list">
            {notifications.map((n) => {
              const { bold, rest } = notificationText(n);
              const href = notificationLink(n);
              return (
                <Link
                  key={n.id}
                  href={href}
                  className={`notif-page-item${n.read ? '' : ' notif-page-item--unread'}`}
                >
                  <div className="notif-page-item-content">
                    <p className="notif-page-item-text">
                      {bold && <strong>{bold}</strong>}
                      {rest}
                    </p>
                    {n.question?.title && (
                      <p className="notif-page-item-sub">{n.question.title}</p>
                    )}
                  </div>
                  <p className="notif-page-item-time">{timeAgo(n.created_at)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — full notifications page
// REASON: Notification Centre feature
// --- END CHANGE LOG ---
