// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — logo, tags link, search bar,
//          gear icon (logged in), sign in link (logged out)
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: App-wide navigation. Sign Out was removed in Phase 8
//                and moved to components/settings/AccountSettings.jsx.
//                Gear icon added linking to /settings.
// DEPENDENCIES: components/SearchBar.jsx, store/authStore.js,
//               app/globals.css (navbar styles)
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never a modal.
//                   Sign Out does NOT live here — AccountSettings only.
//                   .navbar-search hides SearchBar below 640px.
//                   External links use <a> — never Next.js <Link>.
//                   Phase 10 adds NotificationBell between search and gear.
// ============================================================

'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import SearchBar from '@/components/SearchBar';

export default function Navbar() {
  const { user, loading } = useAuthStore();

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
            <Link href="/settings" className="navbar-gear" aria-label="Settings">
              <Settings size={20} strokeWidth={1.75} />
            </Link>
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
// [May 17, 2026] UPDATED: Phase 8 — replaced Sign Out button with gear icon
// REASON: Sign Out moved to AccountSettings.jsx per architectural rule.
//         Gear icon links to /settings for logged-in users.
// --- END CHANGE LOG ---
