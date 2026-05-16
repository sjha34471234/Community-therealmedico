// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — auth state, username, search bar, nav links
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Site-wide navigation. Updated in Phase 6 to activate SearchBar
//   and add Tags link to nav.
// DEPENDENCIES: store/authStore.js, lib/supabase.js, components/SearchBar.jsx
// ⚠️ DO NOT CHANGE: Sign In navigates to /auth — never reopen modal. Crashed Chrome iPad.
// ⚠️ DO NOT CHANGE: Sign Out calls signOut() then window.location.href = '/' — force reload clears state
// ⚠️ DO NOT CHANGE: onAuthStateChange is in authStore — never add another listener here
// ⚠️ DO NOT CHANGE: .navbar-search hidden below 640px via CSS — don't remove that class
// ============================================================

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import supabase from '@/lib/supabase'
import SearchBar from '@/components/SearchBar'

export default function Navbar() {
  const { user, profile, loading } = useAuthStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Left — Logo */}
        <a href="/" className="navbar-logo">
          Real Medico
        </a>

        {/* Centre — Search bar (hidden on mobile via CSS) */}
        <div className="navbar-search">
          <SearchBar />
        </div>

        {/* Right — Nav links + auth */}
        <div className="navbar-right">
          <a href="/tags" className="navbar-link">Tags</a>

          {!loading && (
            <>
              {user && profile ? (
                <>
                  <a href={`/profile/${profile.community_username}`} className="navbar-link navbar-username">
                    {profile.community_username}
                  </a>
                  <button onClick={handleSignOut} className="navbar-btn navbar-btn--ghost">
                    Sign Out
                  </button>
                </>
              ) : (
                <a href="/auth" className="navbar-btn navbar-btn--primary">
                  Sign In
                </a>
              )}
            </>
          )}
        </div>

      </div>
    </nav>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] UPDATED: Phase 6 — SearchBar activated, Tags link added
// REASON: Search goes live in Phase 6
// --- END CHANGE LOG ---
