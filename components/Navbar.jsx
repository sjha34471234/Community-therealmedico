// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation — logo, tags, search, username, bell
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: App-wide navigation.
// DEPENDENCIES: components/SearchBar.jsx, components/NotificationBell.jsx,
//               store/authStore.js, app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   .navbar-search hides SearchBar below 640px.
//                   Gear icon removed Phase 10 — bell replaces it.
//                   All navbar classes must exist in globals.css.
// ============================================================
'use client';

import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import SearchBar from '@/components/SearchBar';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { user, loading, profile } = useAuthStore();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          The Real Medico
        </Link>

        <div className="navbar-links">
          <Link href="/tags" className="navbar-link">
            Tags
          </Link>
        </div>

        <div className="navbar-search">
          <SearchBar />
        </div>

        <div className="navbar-actions">
          {!loading && user ? (
            <>
              <Link
                href={`/profile/${profile?.community_username}`}
                className="navbar-username"
              >
                {profile?.community_username}
              </Link>
              <NotificationBell />
            </>
          ) : !loading ? (
            <Link href="/auth" className="navbar-signin">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] UPDATED: Phase 8 — replaced Sign Out with gear icon
// REASON: Sign Out moved to AccountSettings.jsx per architectural rule.
// [May 17, 2026] UPDATED: Restored username link next to gear icon
// REASON: Username was missing from navbar after Phase 8 rewrite.
// [May 18, 2026] UPDATED: Phase 10 — removed gear icon, added NotificationBell
// REASON: Gear moves to Account tab in bottom nav. Bell added for notifications.
// --- END CHANGE LOG ---
