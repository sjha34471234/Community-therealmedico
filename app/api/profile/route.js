// ============================================================
// FILE: app/api/profile/route.js
// PURPOSE: Server-side profile fetch + update
// LAST CHANGED: May 2026
// WHY IT EXISTS: Browser client RLS blocks profile reads on refresh.
//               Service role bypasses RLS safely server-side.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Auth verified via Bearer token from Authorization header.
//                   NEVER read accessToken from request body — this was the old broken pattern.
//                   Never trust user_id from request body.
//                   supabaseServer() must be called as a function.
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

// ── POST — update profile (bio only — username is locked) ────
// ⚠️ WARNING: accessToken must come from Authorization header — NEVER from body
// ⚠️ WARNING: Username updates are blocked here — username is permanent after creation
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

    const { community_bio } = body

    // Validate bio
    if (typeof community_bio !== 'string') {
      return NextResponse.json({ error: 'Bio must be a string' }, { status: 400 })
    }

    const trimmedBio = community_bio.trim()

    if (trimmedBio.length > 160) {
      return NextResponse.json({ error: 'Bio must be 160 characters or fewer' }, { status: 400 })
    }

    const db = supabaseServer()

    const { error: updateError } = await db
      .from('profiles')
      .update({ community_bio: trimmedBio })
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
// [May 2026]     FIXED: POST handler rewritten — was reading accessToken from body
//                instead of Authorization header. This caused "Not authenticated"
//                on every bio save attempt. Now correctly reads Bearer token from header.
//                POST now handles community_bio update instead of username (username is locked).
//                Added is_mod and is_banned to GET SELECT for Phase 13 mod system.
// --- END CHANGE LOG ---
