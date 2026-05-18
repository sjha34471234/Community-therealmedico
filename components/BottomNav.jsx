// ============================================================
// FILE: components/BottomNav.jsx
// PURPOSE: Bottom navigation bar — Home, Search, Ask, Profile
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Phase 10 — Instagram-style bottom nav for all screen sizes
// DEPENDENCIES: store/authStore.js, app/globals.css (bottom nav styles)
// ⚠️ DO NOT CHANGE: Auth gate pattern — never redirect, always prompt.
//                   Ask is always centred with raised style.
//                   Chat will be added between Ask and Profile in Phase 11.
// ============================================================
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusCircle, User } from 'lucide-react';
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
    if (item.key === 'profile') return pathname.startsWith('/profile');
    if (item.key === 'ask') return pathname === '/ask';
    if (item.key === 'search') return pathname === '/search' || pathname.startsWith('/search');
    return false;
  }

  function handleTap(e, item) {
    // If auth required and not logged in — go to sign in page
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
    // Settings tab — go to settings (Account tab)
    if (item.key === 'account') {
      e.preventDefault();
      router.push('/settings');
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
          const href = item.key === 'profile' && user && profile?.community_username
            ? `/profile/${profile.community_username}`
            : item.href || '/auth';

          return (
            <Link
              key={item.key}
              href={href}
              onClick={(e) => handleTap(e, item)}
              className={[
                'bottom-nav-item',
                item.isAsk ? 'bottom-nav-ask' : '',
                active ? 'bottom-nav-item--active' : '',
              ].filter(Boolean).join(' ')}
              aria-label={item.label}
            >
              <Icon
                size={item.isAsk ? 28 : 22}
                strokeWidth={active ? 2.25 : 1.75}
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

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10 — bottom navigation
// REASON: Instagram-style bottom nav requested.
//         Chat tab will be inserted between Ask and Profile in Phase 11.
// --- END CHANGE LOG ---
