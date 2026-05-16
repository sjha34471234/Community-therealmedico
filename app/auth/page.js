// ============================================================
// FILE: app/auth/page.js
// PURPOSE: Standalone sign in / sign up page — fallback for direct links
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Users who land on /auth directly need a full page
//               auth experience, not just a modal
// DEPENDENCIES: components/AuthPageClient.jsx
// ⚠️ DO NOT CHANGE: Must stay a server component with no Supabase calls.
//                   Redirect after login is handled in AuthPageClient.
// ============================================================

import AuthPageClient from '@/components/AuthPageClient'

export const metadata = {
  title: 'Sign In — The Real Medico Community',
  description: 'Sign in or create a free account to ask questions, answer, and vote on The Real Medico Community.',
  alternates: {
    canonical: 'https://community.therealmedico.store/auth',
  },
}

export default function AuthPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <AuthPageClient />
    </main>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Standalone auth page — Phase 5 auth flow
// [May 16, 2026] FIXED: Removed supabaseServer call — caused build crash
//               Redirect now handled client-side in AuthPageClient
// --- END CHANGE LOG ---
