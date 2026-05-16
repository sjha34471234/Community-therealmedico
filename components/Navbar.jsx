// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — logo, search, auth button
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Appears on every page via app/layout.js
// DEPENDENCIES: lucide-react, AuthModal, authStore
// ⚠️ DO NOT CHANGE: navbar-search class controls mobile hide via CSS
//                   Logo uses <a> not <Link> — same domain but safe
//                   Never use onMouseEnter in arrow functions in JSX
// ============================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import AuthModal from '@/components/AuthModal'

export default function Navbar() {
  const { user, profile } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)

  const supabase = createClient()

  function handleSignInEnter(e) {
    e.target.style.backgroundColor = 'var(--accent-hover)'
  }

  function handleSignInLeave(e) {
    e.target.style.backgroundColor = 'var(--accent-primary)'
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <header
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--bg-tertiary)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 1rem',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Logo */}
          <a href="/" style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            The Real Medico
            <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px', letterSpacing: '0.04em' }}>
              Community
            </span>
          </a>

          {/* Search bar — hidden on mobile, visible 640px+ — disabled until Phase 6 */}
          <div className="navbar-search">
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search questions…"
              disabled
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '6px',
                border: '1px solid var(--bg-tertiary)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'not-allowed',
                opacity: 0.7,
              }}
            />
          </div>

          {/* Right side */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            {user ? (
              <>
                {/* Profile link */}
                {profile?.community_username && (
                  <Link
                    href={`/profile/${profile.community_username}`}
                    style={{
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {profile.community_username}
                  </Link>
                )}

                {/* Sign Out button */}
                <button
                  onClick={handleSignOut}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              /* Sign In button — opens modal */
              <button
                onClick={() => setModalOpen(true)}
                onMouseEnter={handleSignInEnter}
                onMouseLeave={handleSignInLeave}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth modal — rendered outside header so it overlays everything */}
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 14, 2026] FIXED: Replaced inline arrow functions with named handlers
// [May 14, 2026] FIXED: Search bar now uses className="navbar-search" — hides on mobile
// [May 16, 2026] UPDATED: Sign In button now opens AuthModal instead of linking to store
//               Added signed-in state — shows username link + Sign Out button
// --- END CHANGE LOG ---
