// ============================================================
// FILE: app/api/profile/route.js
// PURPOSE: Server-side profile update — sets community_username
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Browser client RLS blocks username save.
//               Service role bypasses RLS safely server-side.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Auth verified via Bearer token from client.
//                   Never trust user_id from request body.
//                   supabaseServer() must be called as a function
//                   inside the handler — never at module level.
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { username, accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify the token by getting the user from Supabase
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Validate username format
    const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }

    const db = supabaseServer()

    // Check uniqueness
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('community_username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Save — service role bypasses RLS
    const { error: updateError } = await db
      .from('profiles')
      .update({
        community_username: username,
        community_joined_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Server-side username save
// REASON: Browser client RLS was blocking username update silently
// [May 16, 2026] FIXED: Auth now uses Bearer token instead of cookies
// REASON: Safari/iPad drops cookies on API routes — token is more reliable
// [May 16, 2026] FIXED: supabaseServer() called as function via db variable
// REASON: Proxy broke chained Supabase calls — now uses direct function call
// --- END CHANGE LOG ---
