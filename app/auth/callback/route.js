// ============================================================
// FILE: app/auth/callback/route.js
// PURPOSE: Receives Google OAuth code and hands it to client page
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: Google OAuth redirects here after sign in.
// ⚠️ DO NOT exchange the code here — this is a server route.
//    lib/supabase.js uses plain supabase-js with localStorage.
//    exchangeCodeForSession() called server-side loses the session
//    immediately because there is no localStorage on the server.
//    Fix: redirect to /auth/confirm (a client page) with the code
//    so the browser client can do the exchange in localStorage.
// ============================================================
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    return NextResponse.redirect(`${origin}/auth/confirm?code=${code}&next=${encodeURIComponent(next)}`)
  }

  return NextResponse.redirect(`${origin}/`)
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Google OAuth callback handler
// [May 25, 2026] FIXED: Silent login failure — was calling exchangeCodeForSession
//   server-side which lost the session because localStorage does not exist on server.
//   Now redirects to /auth/confirm (client page) with the code so browser client
//   can do the exchange and persist session to localStorage correctly.
// --- END CHANGE LOG ---
