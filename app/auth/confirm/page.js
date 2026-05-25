// ============================================================
// FILE: app/auth/confirm/page.js
// PURPOSE: Client-side OAuth code exchange — completes Google sign in
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: exchangeCodeForSession must run in the browser so
//   the session is saved to localStorage by the plain supabase-js client.
//   Called from /auth/callback which passes the code as a query param.
// ⚠️ DO NOT remove 'use client' — this must run in the browser.
// ⚠️ DO NOT import supabaseServer here — server client cannot write localStorage.
// ============================================================
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function AuthConfirmPage() {
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

// --- CHANGE LOG ---
// [May 25, 2026] CREATED: Client-side OAuth code exchange
// REASON: exchangeCodeForSession must happen in the browser so the plain
//   supabase-js client can persist the session to localStorage.
//   /auth/callback (server route) redirects here with the code.
// --- END CHANGE LOG ---
