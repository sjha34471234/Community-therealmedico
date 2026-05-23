// ============================================================
// FILE: components/BottomNav.jsx
// PURPOSE: Bottom navigation bar — Home, Search, Ask, Chat, Profile
// LAST CHANGED: May 23, 2026
// WHY IT EXISTS: Phase 10 — Instagram-style bottom nav for all screen sizes
// DEPENDENCIES: store/authStore.js, app/globals.css (bottom nav styles)
// ⚠️ DO NOT CHANGE: Auth gate pattern — never redirect, always prompt.
//                   Ask is always centred with raised style.
//                   5 items keeps layout balanced around the Ask pill.
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Bottom navigation bar fixed at the bottom of every page.
// 5 items: Home · Search · Ask (raised pill) · Chat · Profile
// Auth-gated items redirect to /auth if not signed in.
// Profile tab navigates to the user's own profile page.

// --- WHAT CHANGED May 23, 2026 ---
// Chat tab: removed isComingSoon flag and "Coming soon" toast.
// Chat now links directly to /chat — Phase 12 Chat is live.

// --- PITFALLS ---
// ⚠️ Never add a 6th item — layout is balanced for exactly 5
// ⚠️ Ask item must always have isAsk: true — drives the raised pill style
// ⚠️ Never redirect on auth gate — always push to /auth and let user come back
// ⚠️ Profile href is dynamic — built from profile.community_username at render time

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — bottom navigation
// [May 18, 2026] UPDATED: Added Chat tab between Ask and Profile
// REASON: 4 items looked unbalanced. 5 items (Home·Search·Ask·Chat·Profile)
//         centres the Ask pill perfectly with 2 items on each side.
// [May 23, 2026] UPDATED: Chat tab now links to /chat — Phase 12 Chat is live.
//                         Removed isComingSoon flag and toast. href set to /chat.
// --- END CHANGE LOG ---

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
    authRequired: false,
  },
  {
    key: 'search',
    label: 'Search',
    href: '/search',
    icon: Search,
    authRequired: false,
  },
  {
    key: 'ask',
    label: 'Ask',
    href: '/ask',
    icon: PlusCircle,
    authRequired: true,
    isAsk: true,
  },
  {
    key: 'chat',
    label: 'Chat',
    href: '/chat',
    icon: MessageCircle,
    authRequired: false,
  },
  {
    key: 'profile',
    label: 'Profile',
    href: null,
    icon: User,
    authRequired: true,
  },
];

export default function BottomNav() {
  const { user, loading, profile } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  function isActive(item) {
    if (item.key === 'home') return pathname === '/';
    if (item.key === 'search') return pathname.startsWith('/search');
    if (item.key === 'ask') return pathname === '/ask';
    if (item.key === 'chat') return pathname.startsWith('/chat');
    if (item.key === 'profile') {
      if (!user || !profile?.community_username) return false;
      return pathname === `/profile/${profile.community_username}`;
    }
    return false;
  }

  function handleTap(e, item) {
    // Auth required and not logged in — send to sign in
    if (item.authRequired && !user && !loading) {
      e.preventDefault();
      router.push('/auth');
      return;
    }

    // Profile tab — go to own profile
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
        {NAV_ITEMS.map((item) => {
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
              onClick={(e) => handleTap(e, item)}
              className={[
                'bottom-nav-item',
                item.isAsk ? 'bottom-nav-ask' : '',
                active && !item.isAsk ? 'bottom-nav-item--active' : '',
              ].filter(Boolean).join(' ')}
              aria-label={item.label}
            >
              <Icon
                size={item.isAsk ? 28 : 22}
                strokeWidth={active && !item.isAsk ? 2.25 : 1.75}
              />
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
