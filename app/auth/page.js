// ============================================================
// FILE: app/auth/page.js
// PURPOSE: Standalone sign in / sign up page — fallback for direct links
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Users who land on /auth directly need a full page
//               auth experience, not just a modal
// DEPENDENCIES: components/AuthModal.jsx (reuses same form logic)
// ⚠️ DO NOT CHANGE: redirect to / after auth is handled in AuthModal
//                   This page is a server component — no 'use client'
// ============================================================

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'
import AuthPageClient from '@/components/AuthPageClient'

export const metadata = {
  title: 'Sign In — The Real Medico Community',
  description: 'Sign in or create a free account to ask questions, answer, and vote on The Real Medico Community.',
  alternates: {
    canonical: 'https://community.therealmedico.store/auth',
  },
}

export default async function AuthPage() {
  // If already logged in, send them to the feed immediately
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (user) redirect('/')

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
// REASON: Users need a full page fallback for direct /auth links
// --- END CHANGE LOG ---
