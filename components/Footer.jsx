// ============================================================
// FILE: components/Footer.jsx
// PURPOSE: Minimal site footer with ecosystem links and disclaimer
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Appears on every page via app/layout.js
// DEPENDENCIES: app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: All links use <a> not <Link> — external domains
// ============================================================

export default function Footer() {
  const currentYear = new Date().getFullYear();

  function handleLinkEnter(e) {
    e.target.style.color = 'var(--accent-primary)';
  }
  function handleLinkLeave(e) {
    e.target.style.color = 'var(--text-secondary)';
  }

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--bg-tertiary)',
        marginTop: '4rem',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '2rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >

        {/* Brand block */}
        <div style={{ maxWidth: '260px' }}>
          <p
            style={{
              fontFamily: 'Merriweather, Georgia, serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--accent-primary)',
              margin: '0 0 0.5rem 0',
            }}
          >
            The Real Medico
          </p>
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            A community for healthcare professionals and students. Ask questions, share knowledge, grow together.
          </p>
        </div>

        {/* Links block */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>

          {/* Ecosystem links */}
          <div>
            <p
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 0.75rem 0',
              }}
            >
              Ecosystem
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

              
                href="https://therealmedico.store"
                onMouseEnter={handleLinkEnter}
                onMouseLeave={handleLinkLeave}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Store
              </a>

              
                href="https://learn.therealmedico.store"
                onMouseEnter={handleLinkEnter}
                onMouseLeave={handleLinkLeave}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Learn
              </a>

              
                href="https://community.therealmedico.store"
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Community ←
              </a>

            </div>
          </div>

          {/* Community links */}
          <div>
            <p
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 0.75rem 0',
              }}
            >
              Community
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

              
                href="/tags"
                onMouseEnter={handleLinkEnter}
                onMouseLeave={handleLinkLeave}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Browse Tags
              </a>

              
                href="/ask"
                onMouseEnter={handleLinkEnter}
                onMouseLeave={handleLinkLeave}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Ask a Question
              </a>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: '1px solid var(--bg-tertiary)',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          © {currentYear} The Real Medico. All rights reserved. · This platform is for educational discussion only — not medical advice.
        </p>
      </div>

    </footer>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 14, 2026] FIXED: Replaced inline arrow functions with named handlers
// REASON: JSX parser on Vercel rejected arrow functions in event props
// --- END CHANGE LOG ---
