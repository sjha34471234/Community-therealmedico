// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — logo, tags link, search bar,
//          username link, gear icon (logged in), sign in (logged out)
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: App-wide navigation. Sign Out was removed in Phase 8
//                and moved to components/settings/AccountSettings.jsx.
//                Gear icon links to /settings. Username links to profile.
// DEPENDENCIES: components/SearchBar.jsx, store/authStore.js,
//               app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   .navbar-search hides SearchBar below 640px.
//                   External links use <a> — never Next.js <Link>.
//                   Phase 10 adds NotificationBell between search and gear.
//                   All navbar classes must exist in globals.css —
//                   verify every className has a matching CSS rule.
// ============================================================

'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import SearchBar from '@/components/SearchBar';

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
              <Link href={`/profile/${profile?.community_username}`} className="navbar-username">
                {profile?.community_username}
              </Link>
              <Link href="/settings" className="navbar-gear" aria-label="Settings">
                <Settings size={20} strokeWidth={1.75} />
              </Link>
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
// --- END CHANGE LOG ---
