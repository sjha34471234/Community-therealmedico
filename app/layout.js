// ============================================================
// FILE: app/layout.js
// PURPOSE: Root layout — wraps every page with Navbar, Footer,
//          BottomNav, toast notifications, and site-level metadata
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Next.js App Router requires a root layout.js
//               Everything inside here appears on every page
// DEPENDENCIES: app/globals.css, components/Navbar.jsx,
//               components/Footer.jsx, components/BottomNav.jsx,
//               react-hot-toast, components/AuthProvider.jsx
// ⚠️ DO NOT CHANGE: metadataBase must stay as the full community
//                   domain — OG images won't resolve without it
//                   Toaster must stay outside Suspense boundary
//                   BottomNav must be inside AuthProvider —
//                   it reads auth state via useAuthStore
// ============================================================
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import AuthProvider from '@/components/AuthProvider';

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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Global toast notifications — sits above everything */}
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
          {/* Top navigation — appears on every page */}
          <Navbar />
          {/* Page content */}
          <main>
            {children}
          </main>
          {/* Footer — appears on every page */}
          <Footer />
          {/* Bottom navigation — appears on every page, above footer */}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Root layout required for Next.js 14 App Router
// [May 15, 2026] UPDATED: Wrapped body in AuthProvider
// REASON: Phase 4 — starts global auth listener once at app level
// [May 18, 2026] UPDATED: Added BottomNav
// REASON: Phase 10 — Instagram-style bottom navigation on all pages
// --- END CHANGE LOG ---
