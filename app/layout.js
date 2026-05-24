// ============================================================
// FILE: app/layout.js
// PURPOSE: Root layout — wraps every page with Navbar, Footer,
//          BottomNav, toast notifications, analytics scripts,
//          and site-level metadata
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Next.js App Router requires a root layout.js
// DEPENDENCIES: app/globals.css, components/Navbar.jsx,
//               components/Footer.jsx, components/BottomNav.jsx,
//               react-hot-toast, components/AuthProvider.jsx,
//               components/ErrorBoundary.jsx
// ⚠️ DO NOT CHANGE: metadataBase must stay as the full community
//                   domain — OG images won't resolve without it
//                   Toaster must stay outside Suspense boundary
//                   BottomNav must be inside AuthProvider —
//                   it reads auth state via useAuthStore
//                   BottomNav must be a direct child of body —
//                   never nest inside a div with transform/filter
//                   GA4 + Clarity use next/script with
//                   strategy="afterInteractive" — never use
//                   strategy="beforeInteractive" (blocks render)
//                   GA4 script must come BEFORE the inline config
//                   script or gtag() will be undefined
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14A: Wire Google Analytics 4, Microsoft Clarity, and
// Google Search Console verification into the site.
// GA4 tracks page views and user behaviour.
// Clarity records session heatmaps and replays.
// Search Console meta tag proves domain ownership to Google.
// ErrorBoundary wraps children to catch and report JS crashes.

// --- WHAT THIS MADE WORK ---
// GA4 fires on every page navigation automatically via Next.js
// App Router — no manual route change listeners needed.
// Clarity auto-initialises and starts recording sessions.
// Search Console will show as verified after next crawl.

// --- PITFALLS ---
// ⚠️ strategy="afterInteractive" is correct — do not change to
//    "beforeInteractive" — it will block page render
// ⚠️ The inline gtag config script MUST come after the GA4
//    src script — order matters
// ⚠️ Search Console meta tag must be in metadata.verification
//    object — not as a manual <meta> tag in JSX

import './globals.css';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import AuthProvider from '@/components/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

const GA4_ID = 'G-0BKEYEXYG2';
const CLARITY_ID = 'ww6ntezzar';

export const metadata = {
  metadataBase: new URL('https://community.therealmedico.store'),
  title: {
    default: 'The Real Medico Community',
    template: '%s — The Real Medico Community',
  },
  description: 'Ask medical questions, share clinical knowledge, and learn from healthcare professionals worldwide. Free to read, sign up to participate.',
  openGraph: {
    siteName: 'The Real Medico Community',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
  },
  alternates: {
    canonical: 'https://community.therealmedico.store',
  },
  robots: {
    index: true,
    follow: true,
  },
  // --- Search Console domain verification ---
  // This generates: <meta name="google-site-verification" content="..." />
  // Google crawls this on next visit and marks domain as verified
  verification: {
    google: '8HPbbmw7QqaIs3jKfSKup-Ccd4x95L7znhPzBVdZlow',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>

        {/* ── Google Analytics 4 ── */}
        {/* strategy="afterInteractive" loads after page is interactive */}
        {/* This is the standard Next.js pattern for GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-config" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        {/* ── Microsoft Clarity ── */}
        {/* Records session replays and heatmaps */}
        {/* strategy="afterInteractive" — never block render for analytics */}
        <Script id="clarity-config" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>

        <AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '0.9rem',
                color: '#1A1D23',
                background: '#FFFFFF',
                border: '1px solid #EFF1F3',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              },
              success: {
                iconTheme: { primary: '#2E7D32', secondary: '#FFFFFF' },
              },
              error: {
                iconTheme: { primary: '#C62828', secondary: '#FFFFFF' },
              },
            }}
          />
          <Navbar />
          <div id="page-scroll-container">
            {/* ErrorBoundary catches any JS crash in any page */}
            {/* and shows a friendly fallback instead of white screen */}
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Footer />
          </div>
        </AuthProvider>
        <AuthProvider>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// [May 15, 2026] UPDATED: Wrapped body in AuthProvider
// [May 18, 2026] UPDATED: Added BottomNav
// [May 18, 2026] FIXED: BottomNav moved to separate AuthProvider at body level
// REASON: position:fixed was broken because BottomNav was nested inside
//         the same container as Footer — browser treated it as scrollable content.
//         Two AuthProvider instances is fine — Zustand store is a singleton,
//         both share the exact same auth state.
// [May 24, 2026] UPDATED: Added GA4 (G-0BKEYEXYG2) via next/script afterInteractive
// [May 24, 2026] UPDATED: Added Microsoft Clarity (ww6ntezzar) via next/script
// [May 24, 2026] UPDATED: Added Google Search Console verification meta tag
// [May 24, 2026] UPDATED: Wrapped children in ErrorBoundary for crash capture
// --- END CHANGE LOG ---
