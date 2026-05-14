// ============================================================
// FILE: app/page.js
// PURPOSE: Homepage — static placeholder for Phase 1
//          Will become the live question feed in Phase 2
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Next.js requires a page.js at app/ root to
//               render the homepage route (/)
// DEPENDENCIES: app/layout.js, app/globals.css
// ⚠️ DO NOT CHANGE: revalidate value — set to 300 (5 min) ready
//                   for Phase 2 when live data gets added
// ============================================================

export const revalidate = 300;

export const metadata = {
  title: 'Medical Q&A Community — The Real Medico',
  description: 'Ask medical questions, share clinical knowledge, and learn from healthcare professionals worldwide. Free to read, sign up to participate.',
  openGraph: {
    title: 'Medical Q&A Community — The Real Medico',
    description: 'Ask medical questions and get answers from the healthcare community.',
    url: 'https://community.therealmedico.store',
    siteName: 'The Real Medico Community',
    type: 'website',
  },
  alternates: {
    canonical: 'https://community.therealmedico.store',
  },
};

export default function HomePage() {

  return (
    <div
      style={{
        maxWidth: '768px',
        margin: '0 auto',
        padding: '3rem 1rem',
      }}
    >

      {/* Hero block */}
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--bg-tertiary)',
          marginBottom: '2rem',
        }}
      >
        <h1
          style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontWeight: 700,
            fontSize: '2rem',
            color: 'var(--text-primary)',
            margin: '0 0 1rem 0',
            lineHeight: 1.3,
          }}
        >
          The Real Medico Community
        </h1>

        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            maxWidth: '480px',
            margin: '0 auto 2rem auto',
            lineHeight: 1.7,
          }}
        >
          A place for healthcare professionals and students to ask questions,
          share knowledge, and learn from each other.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'Questions', value: '—' },
            { label: 'Answers', value: '—' },
            { label: 'Members', value: '—' },
          ].map(function(stat) {
            return (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <p
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: 'var(--accent-primary)',
                    margin: '0 0 0.25rem 0',
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          
            href="https://therealmedico.store/login?ref=community"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              padding: '10px 24px',
              borderRadius: '7px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Join the Community
          </a>
          
            href="#coming-soon"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--accent-primary)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              padding: '10px 24px',
              borderRadius: '7px',
              textDecoration: 'none',
              border: '1px solid var(--accent-primary)',
              display: 'inline-block',
            }}
          >
            Browse Questions
          </a>
        </div>

      </div>

      {/* Coming soon block */}
      <div
        id="coming-soon"
        style={{
          padding: '2rem',
          backgroundColor: 'var(--accent-light)',
          borderRadius: '10px',
          border: '1px solid var(--accent-primary)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: 'var(--accent-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          🚧 Questions feed coming soon
        </p>
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          We are building the Q&A feed. Sign in now to be ready when it launches.
        </p>
      </div>

    </div>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 14, 2026] FIXED: Removed inline arrow functions, replaced .map arrow
//               with named function, removed &amp; entity that broke JSX
// REASON: JSX parser on Vercel rejected arrow functions in event props
// --- END CHANGE LOG ---
