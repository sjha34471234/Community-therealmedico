// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation — Tags (left), logo (centre), bell/gear/sign-in (right)
// LAST CHANGED: May 19, 2026
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
          <Link href="/tags" className="navbar-link">Tags</Link>
        </div>
        <div className="navbar-centre">
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-bold">The Real Medico</span><span className="navbar-logo-light"> Community</span>
          </Link>
        </div>
        <div className="navbar-right">
          {!loading && user ? (
            isOwnProfile ? (
              <Link href="/settings" className="navbar-gear" aria-label="Settings">
                <Settings size={20} />
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
// [May 19, 2026] UPDATED: On own profile page, bell swaps to gear icon → /settings.
// --- END CHANGE LOG ---
