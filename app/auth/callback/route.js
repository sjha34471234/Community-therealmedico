// ============================================================
// FILE: app/auth/callback/route.js
// PURPOSE: Handles Google OAuth redirect — exchanges code for session
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Google OAuth redirects here after sign in.
//               Without this, Google login silently fails.
// DEPENDENCIES: lib/supabase.js (createClient)
// ⚠️ DO NOT CHANGE: Must be a route handler (not a page).
//                   Never add 'use client' here.
// ============================================================

import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // After exchanging, send user to the feed
  return NextResponse.redirect(`${origin}/`)
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Google OAuth callback handler
// REASON: Google redirects here after sign in — must exchange code for session
// --- END CHANGE LOG ---
