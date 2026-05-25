// ============================================================
// FILE: app/auth/confirm/page.js
// PURPOSE: Client-side OAuth code exchange — completes Google sign in
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: exchangeCodeForSession must run in the browser so
//   the session is saved to localStorage by the plain supabase-js client.
//   Called from /auth/callback which passes the code as a query param.
// ⚠️ DO NOT remove 'use client' — this must run in the browser.
// ⚠️ DO NOT remove Suspense wrapper — Next.js 14 requires it for useSearchParams.
// ============================================================
'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase'

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/'

    if (!code) {
      router.replace('/')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(() => {
      router.replace(next)
    }).catch(() => {
      router.replace('/')
    })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Signing you in…</p>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Signing you in…</p>
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  )
}

// --- CHANGE LOG ---
// [May 25, 2026] CREATED: Client-side OAuth code exchange
// REASON: exchangeCodeForSession must happen in the browser so the plain
//   supabase-js client can persist the session to localStorage.
//   /auth/callback (server route) redirects here with the code.
// [May 25, 2026] FIXED: Wrapped useSearchParams in Suspense boundary
// REASON: Next.js 14 requires useSearchParams to be inside Suspense or build fails.
// --- END CHANGE LOG ---
