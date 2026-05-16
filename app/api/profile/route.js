// ============================================================
// FILE: app/api/profile/route.js
// PURPOSE: Server-side profile update — sets community_username
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Browser client RLS blocks username save.
//               Service role bypasses RLS safely server-side.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Always verify auth before updating.
//                   Never trust user_id from request body.
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    // Verify auth using anon client + cookie
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: { cookie: request.headers.get('cookie') || '' },
        },
      }
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { username } = await request.json()

    // Validate
    const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }

    // Check uniqueness
    const { data: existing } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('community_username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Save — service role bypasses RLS
    const { error: updateError } = await supabaseServer
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
// --- END CHANGE LOG ---
