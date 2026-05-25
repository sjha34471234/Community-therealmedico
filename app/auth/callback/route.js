// ============================================================
// FILE: app/auth/callback/route.js
// PURPOSE: Handles Google OAuth redirect — exchanges code for session
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: Google OAuth redirects here after sign in.
//               Without this, Google login silently fails.
// DEPENDENCIES: @supabase/auth-helpers-nextjs, next/headers
// ⚠️ DO NOT CHANGE: Must be a route handler (not a page).
//                   Never add 'use client' here.
//                   Must use createRouteHandlerClient — NOT createClient.
//                   createClient is a browser client and cannot set cookies
//                   in a server route handler. That was the original bug.
// ============================================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Google OAuth callback handler
// REASON: Google redirects here after sign in — must exchange code for session

// [May 25, 2026] FIXED: Silent login failure for all new Google sign-ins
// BUG: Was using createClient() (browser client) in a server route handler.
//      exchangeCodeForSession() succeeded but could not set session cookie
//      server-side, so user was redirected to / with no session.
// FIX: Replaced with createRouteHandlerClient from @supabase/auth-helpers-nextjs
//      which correctly reads/writes cookies in the server context.
// --- END CHANGE LOG ---
