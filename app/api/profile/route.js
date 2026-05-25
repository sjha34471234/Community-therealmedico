// ============================================================
// FILE: app/api/profile/route.js
// PURPOSE: Server-side profile fetch + update
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: Browser client RLS blocks profile reads on refresh.
//               Service role bypasses RLS safely server-side.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Auth verified via Bearer token from Authorization header.
//                   NEVER read accessToken from request body.
//                   Never trust user_id from request body.
//                   supabaseServer() must be called as a function.
//                   Username can only be set once — locked after first save.
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// ── Helper — verify Bearer token, return user or null ────────
async function getUserFromHeader(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return null
  return user
}

// ── GET — fetch profile by access token ──────────────────────
export async function GET(request) {
  try {
    const user = await getUserFromHeader(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = supabaseServer()
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, community_username, community_bio, community_joined_at, community_flair, is_member, is_mod, is_banned')
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

// ── POST — update profile (username first time, bio anytime) ─
// ⚠️ WARNING: accessToken must come from Authorization header — NEVER from body
// ⚠️ WARNING: Username is permanent — once set it cannot be changed
export async function POST(request) {
  try {
    const user = await getUserFromHeader(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const db = supabaseServer()

    // ── Username save (first time only) ──────────────────────
    if (body.username !== undefined) {
      const { username } = body

      if (!USERNAME_REGEX.test(username)) {
        return NextResponse.json({ error: '3–20 characters. Letters, numbers, underscores only.' }, { status: 400 })
      }

      // Check username not already taken
      const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('community_username', username)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Username already taken. Please choose another.' }, { status: 409 })
      }

      // Check user doesn't already have a username — username is permanent
      const { data: currentProfile } = await db
        .from('profiles')
        .select('community_username')
        .eq('id', user.id)
        .single()

      if (currentProfile?.community_username) {
        return NextResponse.json({ error: 'Username already set and cannot be changed.' }, { status: 403 })
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
    }

    // ── Bio update ────────────────────────────────────────────
    if (body.community_bio !== undefined) {
      const { community_bio } = body

      if (typeof community_bio !== 'string') {
        return NextResponse.json({ error: 'Bio must be a string' }, { status: 400 })
      }

      const trimmedBio = community_bio.trim()

      if (trimmedBio.length > 160) {
        return NextResponse.json({ error: 'Bio must be 160 characters or fewer' }, { status: 400 })
      }

      const { error: updateError } = await db
        .from('profiles')
        .update({ community_bio: trimmedBio })
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Server-side profile update
// [May 16, 2026] UPDATED: Added GET handler
// [May 21, 2026] FIXED: Added is_member to profile SELECT
// [May 2026]     FIXED: POST rewritten — reads Bearer token from header not body.
//                POST handles community_bio only (username locked after creation).
// [May 25, 2026] FIXED: POST now handles BOTH username (first time) and bio.
//                Username save was broken — POST only handled bio, causing
//                "Bio must be a string" error when UsernameModal tried to save username.
//                Added username taken check and username already set guard.
// --- END CHANGE LOG ---
