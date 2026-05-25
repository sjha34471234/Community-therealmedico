// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation — logo (left), search+bell/gear/sign-in (right)
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: App-wide navigation.
// DEPENDENCIES: components/NotificationBell.jsx,
//               store/authStore.js, app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   Search icon added to navbar right — Search page removed from BottomNav.
//                   Username removed from navbar — lives in bottom nav Profile tab.
//                   On own profile page: bell swaps to gear icon → /settings.
// ============================================================
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, Search } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { user, loading, profile } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const isOwnProfile = user && profile?.community_username && pathname === `/profile/${profile.community_username}`;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link href="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span className="navbar-logo-bold">The Real Medico</span>
              <span style={{ fontSize: '11px', fontWeight: 400, color: '#5B6474', letterSpacing: '0.4px' }}>Community</span>
            </div>
          </Link>
        </div>
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => router.push('/search')}
            aria-label="Search"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#5B6474', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Search size={22} />
          </button>
          {!loading && user ? (
            isOwnProfile ? (
              <Link href="/settings" className="navbar-gear" aria-label="Settings">
                <Settings size={26} />
              </Link>
            ) : (
              <NotificationBell />
            )
          ) : !loading ? (
            <Link href="/auth" className="navbar-signin">Sign in</Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

// --- CHANGE LOG ---
// [May 19, 2026] REDESIGNED: Tags left, logo centre, bell/sign-in right.
//               Removed: SearchBar (bottom nav), username (bottom nav Profile tab).
// [May 20, 2026] UPDATED: Removed Tags link. Logo moved to left. Less cramped on mobile.
// [May 21, 2026] UPDATED: Settings icon size 20 → 26 for better tap target
// [May 26, 2026] UPDATED: Brand split to two lines (The Real Medico / Community).
//               Search icon added to navbar right side (left of bell/gear).
//               Search removed from BottomNav — Reels tab added instead.
// --- END CHANGE LOG ---
