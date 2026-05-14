// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — logo, search placeholder, sign in button
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Appears on every page via app/layout.js
// DEPENDENCIES: lucide-react, app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: Sign In must use <a> tag not <Link> — external domain
// ============================================================

'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

export default function Navbar() {
  function handleSignInEnter(e) {
    e.target.style.backgroundColor = 'var(--accent-hover)';
  }
  function handleSignInLeave(e) {
    e.target.style.backgroundColor = 'var(--accent-primary)';
  }

  return (
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
        <Link
         <a href="/"
          style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          The Real Medico
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginLeft: '6px',
              letterSpacing: '0.04em',
            }}
          >
            Community
          </span>
        </Link>

        {/* Search bar — disabled until Phase 6 */}
        <div style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
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
          {/* May 14, 2026 REASON: external domain — must use <a> not <Link> */}
          
           <a href="https://therealmedico.store/login?ref=community"
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
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            Sign In
          </a>
        </div>

      </div>
    </header>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 14, 2026] FIXED: Replaced inline arrow functions with named handlers
// REASON: JSX parser on Vercel rejected arrow functions in event props
// --- END CHANGE LOG ---
