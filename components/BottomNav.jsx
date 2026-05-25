// ============================================================
// FILE: components/BottomNav.jsx
// PURPOSE: Bottom navigation — Home, Scroll, +Menu, Chat, Profile
//          + centre button opens popup: Ask a Question | Create a Scroll
//          Chat tab shows red dot badge for unread DMs
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 10 — bottom nav for all screen sizes
// DEPENDENCIES: store/authStore.js, app/globals.css (bottom nav styles)
// ⚠️ DO NOT CHANGE: Auth gate pattern — never redirect, always prompt.
//                   DM unread poll interval is 30s.
//                   + centre button is a popup menu, NOT a direct link.
//                   Search moved to Navbar — Scroll replaces it here.
//                   Scroll icon does not exist in lucide v0.303 — use Film.
// ============================================================
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Film, PlusCircle, MessageCircle, User, FileQuestion } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useAuthStore from '@/store/authStore';

const NAV_ITEMS = [
  { key: 'home',    label: 'Home',   href: '/',       icon: Home,          authRequired: false },
  { key: 'scroll',  label: 'Scroll', href: '/scroll', icon: Film,          authRequired: false },
  { key: 'plus',    label: null,     href: null,      icon: PlusCircle,    authRequired: false, isAsk: true },
  { key: 'chat',    label: 'Chat',   href: '/chat',   icon: MessageCircle, authRequired: false },
  { key: 'profile', label: 'Profile',href: null,      icon: User,          authRequired: true },
];

export default function BottomNav() {
  const { user, loading, profile, accessToken } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [dmUnread, setDmUnread] = useState(0);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const pollRef = useRef(null);
  const menuRef = useRef(null);

  // ── Poll unread DM count every 30s ───────────────────────
  useEffect(function() {
    if (!user || !accessToken) { setDmUnread(0); return; }
    async function fetchUnread() {
      try {
        const res = await fetch(
          window.location.origin + '/api/chat/dm/unread',
          { headers: { Authorization: 'Bearer ' + accessToken }, credentials: 'include', cache: 'no-store' }
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

  // Clear badge when on /chat
  useEffect(function() {
    if (pathname.startsWith('/chat')) setDmUnread(0);
  }, [pathname]);

  // Close plus menu on outside tap
  useEffect(function() {
    if (!showPlusMenu) return;
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return function() {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [showPlusMenu]);

  function isActive(item) {
    if (item.key === 'home')    return pathname === '/';
    if (item.key === 'scroll')  return pathname.startsWith('/scroll');
    if (item.key === 'chat')    return pathname.startsWith('/chat');
    if (item.key === 'profile') {
      if (!user || !profile?.community_username) return false;
      return pathname === `/profile/${profile.community_username}`;
    }
    return false;
  }

  function handleTap(e, item) {
    if (item.key === 'plus') {
      e.preventDefault();
      if (!user && !loading) { router.push('/auth'); return; }
      setShowPlusMenu(function(v) { return !v; });
      return;
    }
    if (item.authRequired && !user && !loading) {
      e.preventDefault();
      router.push('/auth');
      return;
    }
    if (item.key === 'profile' && user && profile?.community_username) {
      e.preventDefault();
      router.push('/profile/' + profile.community_username);
      return;
    }
  }

  function handleMenuChoice(path) {
    setShowPlusMenu(false);
    if (!user && !loading) { router.push('/auth'); return; }
    router.push(path);
  }

  if (loading) return null;

  return (
    <nav className="bottom-nav">
      {showPlusMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            border: '1px solid var(--bg-tertiary)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            zIndex: 2000,
            minWidth: '200px',
            animation: 'plusMenuIn 0.16s ease',
          }}
        >
          <button
            onClick={function() { handleMenuChoice('/ask'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--bg-secondary)', transition: 'background 0.12s' }}
          >
            <FileQuestion size={18} color="var(--accent-primary)" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Ask a Question</span>
          </button>
          <button
            onClick={function() { handleMenuChoice('/scroll/create'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.12s' }}
          >
            <Film size={18} color="var(--accent-primary)" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Create a Scroll</span>
          </button>
        </div>
      )}

      <div className="bottom-nav-inner">
        {NAV_ITEMS.map(function(item) {
          const Icon = item.icon;
          const active = isActive(item);

          let href = item.href || '#';
          if (item.key === 'profile' && user && profile?.community_username) href = '/profile/' + profile.community_username;
          if (item.key === 'profile' && !user) href = '/auth';

          return (
            <Link
              key={item.key}
              href={href}
              onClick={function(e) { handleTap(e, item); }}
              className={[
                'bottom-nav-item',
                item.isAsk ? 'bottom-nav-ask' : '',
                active && !item.isAsk ? 'bottom-nav-item--active' : '',
                item.key === 'plus' && showPlusMenu ? 'bottom-nav-ask--open' : '',
              ].filter(Boolean).join(' ')}
              aria-label={item.label || 'Create'}
            >
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon
                  size={item.isAsk ? 28 : 22}
                  strokeWidth={active && !item.isAsk ? 2.25 : 1.75}
                />
                {item.key === 'chat' && dmUnread > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    minWidth: '16px', height: '16px',
                    background: '#C62828', color: '#fff',
                    fontSize: '9px', fontWeight: 700,
                    borderRadius: '99px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1, boxSizing: 'border-box',
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
// [May 18, 2026] CREATED: Phase 10 — bottom navigation.
// [May 23, 2026] UPDATED: Chat tab links to /chat.
// [May 25, 2026] ADDED: Unread DM badge on Chat tab.
// [May 26, 2026] UPDATED: Search → Scroll tab (Film icon, /scroll).
//               + centre button now opens popup menu:
//               "Ask a Question" → /ask | "Create a Scroll" → /scroll/create.
//               Search moved to Navbar. All other logic preserved exactly.
//               FIXED: Removed Scroll icon import — does not exist in lucide v0.303.
//               Using Film icon for Scroll tab instead.
// --- END CHANGE LOG ---
