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

  const linkStyle = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
  };

  const headingStyle = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 0.75rem 0',
  };

  return (
    <footer style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--bg-tertiary)', marginTop: '4rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        <div style={{ maxWidth: '260px' }}>
          <p style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)', margin: '0 0 0.5rem 0' }}>
            The Real Medico
          </p>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            A community for healthcare professionals and students. Ask questions, share knowledge, grow together.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>

          <div>
            <p style={headingStyle}>Ecosystem</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="https://therealmedico.store" style={linkStyle}>Store</a>
              <a href="https://learn.therealmedico.store" style={linkStyle}>Learn</a>
              <a href="https://community.therealmedico.store" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>Community ←</a>
            </div>
          </div>

          <div>
            <p style={headingStyle}>Community</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/tags" style={linkStyle}>Browse Tags</a>
              <a href="/ask" style={linkStyle}>Ask a Question</a>
            </div>
          </div>

        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--bg-tertiary)', padding: '1rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          © {currentYear} The Real Medico. All rights reserved. · This platform is for educational discussion only — not medical advice.
        </p>
      </div>
    </footer>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 14, 2026] FIXED: Removed onMouseEnter/onMouseLeave — Footer is a
//               server component and cannot have event handlers
// REASON: Event handlers caused static generation timeout on Vercel
// --- END CHANGE LOG ---
