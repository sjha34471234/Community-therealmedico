// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation — Tags (left), logo (centre), bell/sign-in (right)
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: App-wide navigation.
// DEPENDENCIES: components/NotificationBell.jsx,
//               store/authStore.js, app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   Search lives in bottom nav Search tab — not here.
//                   Username removed from navbar — lives in bottom nav Profile tab.
//                   All navbar classes must exist in globals.css.
// ============================================================
'use client';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';
export default function Navbar() {
  const { user, loading } = useAuthStore();
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
            <NotificationBell />
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
//               Removed: SearchBar (now in bottom nav), username (now in bottom nav Profile tab).
// --- END CHANGE LOG ---
