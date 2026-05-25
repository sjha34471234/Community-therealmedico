// ============================================================
// FILE: components/BottomNav.jsx
// PURPOSE: Bottom navigation bar — Home, Reels, Ask, Chat, Profile
//          Chat tab shows red dot badge when there are unread DMs
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 10 — Instagram-style bottom nav for all screen sizes
// DEPENDENCIES: store/authStore.js, app/globals.css (bottom nav styles)
// ⚠️ DO NOT CHANGE: Auth gate pattern — never redirect, always prompt.
//                   Ask is always centred with raised style.
//                   5 items keeps layout balanced around the Ask pill.
//                   DM unread poll interval is 30s — matches chat UX expectations.
//                   Search moved to Navbar — Reels replaces it here.
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Film, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useAuthStore from '@/store/authStore';

const NAV_ITEMS = [
  { key: 'home',    label: 'Home',    href: '/',       icon: Home,          authRequired: false },
  { key: 'reels',   label: 'Reels',   href: '/reels',  icon: Film,          authRequired: false },
  { key: 'ask',     label: 'Ask',     href: '/ask',    icon: PlusCircle,    authRequired: true, isAsk: true },
  { key: 'chat',    label: 'Chat',    href: '/chat',   icon: MessageCircle, authRequired: false },
  { key: 'profile', label: 'Profile', href: null,      icon: User,          authRequired: true },
];

export default function BottomNav() {
  const { user, loading, profile, accessToken } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [dmUnread, setDmUnread] = useState(0);
  const pollRef = useRef(null);

  // ── Poll unread DM count every 30s ───────────────────────
  useEffect(function() {
    if (!user || !accessToken) {
      setDmUnread(0);
      return;
    }

    async function fetchUnread() {
      try {
        const res = await fetch(
          window.location.origin + '/api/chat/dm/unread',
          {
            headers: { Authorization: 'Bearer ' + accessToken },
            credentials: 'include',
            cache: 'no-store',
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        setDmUnread(data.count || 0);
      } catch (_) {}
    }

    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30000);
    return function() { clearInterval(pollRef.current); };
  }, [user, accessToken]);

  // Clear unread badge when user is on /chat
  useEffect(function() {
    if (pathname.startsWith('/chat')) {
      setDmUnread(0);
    }
  }, [pathname]);

  function isActive(item) {
    if (item.key === 'home')    return pathname === '/';
    if (item.key === 'reels')   return pathname.startsWith('/reels');
    if (item.key === 'ask')     return pathname === '/ask';
    if (item.key === 'chat')    return pathname.startsWith('/chat');
    if (item.key === 'profile') {
      if (!user || !profile?.community_username) return false;
      return pathname === `/profile/${profile.community_username}`;
    }
    return false;
  }

  function handleTap(e, item) {
    if (item.authRequired && !user && !loading) {
      e.preventDefault();
      router.push('/auth');
      return;
    }
    if (item.key === 'profile' && user && profile?.community_username) {
      e.preventDefault();
      router.push(`/profile/${profile.community_username}`);
      return;
    }
  }

  if (loading) return null;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map(function(item) {
          const Icon = item.icon;
          const active = isActive(item);

          let href = item.href || '#';
          if (item.key === 'profile' && user && profile?.community_username) {
            href = `/profile/${profile.community_username}`;
          }
          if (item.key === 'profile' && !user) {
            href = '/auth';
          }

          return (
            <Link
              key={item.key}
              href={href}
              onClick={function(e) { handleTap(e, item); }}
              className={[
                'bottom-nav-item',
                item.isAsk ? 'bottom-nav-ask' : '',
                active && !item.isAsk ? 'bottom-nav-item--active' : '',
              ].filter(Boolean).join(' ')}
              aria-label={item.label}
            >
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon
                  size={item.isAsk ? 28 : 22}
                  strokeWidth={active && !item.isAsk ? 2.25 : 1.75}
                />
                {item.key === 'chat' && dmUnread > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '16px',
                    height: '16px',
                    background: '#C62828',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '99px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    lineHeight: 1,
                    boxSizing: 'border-box',
                    border: '1.5px solid var(--bg-primary)',
                  }}>
                    {dmUnread > 9 ? '9+' : dmUnread}
                  </span>
                )}
              </span>
              {!item.isAsk && (
                <span className="bottom-nav-label">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — bottom navigation
// [May 18, 2026] UPDATED: Added Chat tab
// [May 23, 2026] UPDATED: Chat tab now links to /chat — Phase 12 Chat is live.
// [May 25, 2026] ADDED: Unread DM badge on Chat tab
// [May 26, 2026] UPDATED: Search tab replaced with Reels (Film icon, /reels).
//               Search moved to Navbar icon. All other logic preserved exactly.
// --- END CHANGE LOG ---
