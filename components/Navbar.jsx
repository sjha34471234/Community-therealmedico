// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation — logo (left), bell/gear/sign-in (right)
// LAST CHANGED: May 21, 2026
// WHY IT EXISTS: App-wide navigation.
// DEPENDENCIES: components/NotificationBell.jsx,
//               store/authStore.js, app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   Search lives in bottom nav Search tab — not here.
//                   Username removed from navbar — lives in bottom nav Profile tab.
//                   On own profile page: bell swaps to gear icon → /settings.
// ============================================================
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';
export default function Navbar() {
  const { user, loading, profile } = useAuthStore();
  const pathname = usePathname();
  const isOwnProfile = user && profile?.community_username && pathname === `/profile/${profile.community_username}`;
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-bold">The Real Medico</span><span className="navbar-logo-light"> Community</span>
          </Link>
        </div>
        <div className="navbar-right">
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
// --- END CHANGE LOG ---
