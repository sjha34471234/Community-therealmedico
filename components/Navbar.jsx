// ============================================================
// FILE: components/Navbar.jsx
// PURPOSE: Top navigation bar — logo, search placeholder, sign in button
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Appears on every page via app/layout.js
//               Search bar is present but disabled until Phase 6
//               Sign In links to main store shared auth
// DEPENDENCIES: lucide-react, app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: Sign In must use <a> tag not <Link> — it goes
//                   to therealmedico.store which is a different domain
//                   Search input stays disabled until Phase 6
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';

export default function Navbar() {
  // May 14, 2026 REASON: Mobile menu toggle state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* ── Logo ── */}
        <Link
          href="/"
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

        {/* ── Search bar — disabled until Phase 6 ── */}
        <div
          style={{
            flex: 1,
            maxWidth: '480px',
            position: 'relative',
          }}
        >
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

        {/* ── Right side actions ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >

          {/* Ask a question — links to /ask (Phase 2) */}
          <Link
            href="/ask"
            style={{
              display: 'none', // hidden until Phase 2
            }}
          >
            Ask
          </Link>

          {/* Sign In — uses <a> not <Link> because it's a different domain */}
          {/* May 14, 2026 REASON: rule #23 — external links use <a> tag */}
          
            href="https://therealmedico.store/login?ref=community"
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
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--accent-primary)'}
          >
            Sign In
          </a>

          {/* Mobile menu toggle — visible on small screens */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none', // shown via media query workaround below
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* ── Mobile search (shown below navbar on small screens) ── */}
      <div
        className="mobile-search-bar"
        style={{
          padding: '0 1rem 0.75rem',
          display: 'none', // controlled by CSS class below
        }}
      >
        <div style={{ position: 'relative' }}>
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
              padding: '8px 12px 8px 32px',
              borderRadius: '6px',
              border: '1px solid var(--bg-tertiary)',
              backgroundColor: 'var(--bg-secondary)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'not-allowed',
              opacity: 0.7,
            }}
          />
        </div>
      </div>

    </header>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Phase 1 navbar — logo + disabled search + sign in button
// --- END CHANGE LOG ---
