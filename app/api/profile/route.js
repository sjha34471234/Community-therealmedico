// ============================================================
// FILE: app/api/profile/route.js
// PURPOSE: Server-side profile fetch + update
// LAST CHANGED: May 21, 2026
// WHY IT EXISTS: Browser client RLS blocks profile reads on refresh.
//               Service role bypasses RLS safely server-side.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Auth verified via Bearer token from client.
//                   Never trust user_id from request body.
//                   supabaseServer() must be called as a function.
// ============================================================
import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
// ── GET — fetch profile by access token ──────────────────────
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const db = supabaseServer()
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, community_username, community_bio, community_joined_at, community_flair, is_member')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json({ profile })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
// ── POST — save community_username ───────────────────────────
export async function POST(request) {
  try {
    const { username, accessToken } = await request.json()
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }
    const db = supabaseServer()
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('community_username', username)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
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
// [May 16, 2026] UPDATED: Added GET handler
// [May 21, 2026] FIXED: Added is_member to profile SELECT
//               Was missing — caused all components to read isMember as false
//               including AvatarSettings, blocking member options for everyone
// --- END CHANGE LOG ---
