// ============================================================
// FILE: app/layout.js
// PURPOSE: Root layout — wraps every page with Navbar, Footer,
//          BottomNav, toast notifications, and site-level metadata
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Next.js App Router requires a root layout.js
// DEPENDENCIES: app/globals.css, components/Navbar.jsx,
//               components/Footer.jsx, components/BottomNav.jsx,
//               react-hot-toast, components/AuthProvider.jsx
// ⚠️ DO NOT CHANGE: metadataBase must stay as the full community
//                   domain — OG images won't resolve without it
//                   Toaster must stay outside Suspense boundary
//                   BottomNav must be inside AuthProvider —
//                   it reads auth state via useAuthStore
//                   BottomNav must be a direct child of body —
//                   never nest inside a div with transform/filter
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
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
          <div style={{ minHeight: '100vh' }}>
            {children}
          </div>
          <Footer />
        </AuthProvider>
        {/* BottomNav is outside AuthProvider wrapper div but inside body.
            It uses its own useAuthStore hook internally.
            Keeping it as a direct child of body prevents any parent
            transform/filter/overflow from breaking position:fixed */}
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
// --- END CHANGE LOG ---
