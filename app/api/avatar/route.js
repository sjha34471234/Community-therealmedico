// ============================================================
// FILE: app/api/avatar/route.js
// PURPOSE: GET avatar for any user, POST to save own avatar
// LAST CHANGED: May 21, 2026
// DEPENDENCIES: lib/supabaseServer.js, lib/avatarConfig.js
// ============================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { AVATAR_DEFAULTS, getShape, getColor, getIcon, getBorder, getPattern, filterByMembership, AVATAR_SHAPES, AVATAR_COLORS, AVATAR_ICONS, AVATAR_BORDERS, AVATAR_PATTERNS } from '@/lib/avatarConfig'

function extractToken(request) {
  const auth = request.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

async function getUserFromToken(token) {
  if (!token) return null
  const db = supabaseServer()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// ── GET ───────────────────────────────────────────────────────
// Public — fetch avatar for any user_id
// GET /api/avatar?user_id=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const db = supabaseServer()
    const { data, error } = await db
      .from('community_avatars')
      .select('shape, color, icon, border, pattern')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // Return defaults if no row found
      return NextResponse.json({ avatar: AVATAR_DEFAULTS }, { status: 200 })
    }

    return NextResponse.json({ avatar: data }, { status: 200 })
  } catch (err) {
    console.error('GET /api/avatar error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────
// Auth required — save own avatar settings
// POST /api/avatar with body { shape, color, icon, border, pattern }
export async function POST(request) {
  try {
    const token = extractToken(request)
    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { shape, color, icon, border, pattern } = body

    // Check membership — controls which options are allowed
    const db = supabaseServer()
    const { data: profile } = await db
      .from('profiles')
      .select('is_member')
      .eq('id', user.id)
      .single()

    const isMember = profile?.is_member || false

    // Validate each value against allowed options for this user's tier
    const allowedShapes   = filterByMembership(AVATAR_SHAPES,   isMember).map(function(s) { return s.key })
    const allowedColors   = filterByMembership(AVATAR_COLORS,   isMember).map(function(c) { return c.key })
    const allowedIcons    = filterByMembership(AVATAR_ICONS,    isMember).map(function(i) { return i.key })
    const allowedBorders  = filterByMembership(AVATAR_BORDERS,  isMember).map(function(b) { return b.key })
    const allowedPatterns = filterByMembership(AVATAR_PATTERNS, isMember).map(function(p) { return p.key })

    if (shape   && !allowedShapes.includes(shape))   return NextResponse.json({ error: 'Shape not available on your plan' },   { status: 403 })
    if (color   && !allowedColors.includes(color))   return NextResponse.json({ error: 'Color not available on your plan' },   { status: 403 })
    if (icon    && !allowedIcons.includes(icon))     return NextResponse.json({ error: 'Icon not available on your plan' },    { status: 403 })
    if (border  && !allowedBorders.includes(border)) return NextResponse.json({ error: 'Border not available on your plan' },  { status: 403 })
    if (pattern && !allowedPatterns.includes(pattern)) return NextResponse.json({ error: 'Pattern not available on your plan' }, { status: 403 })

    // Upsert — insert if no row, update if exists
    const now = new Date().toISOString()
    const { error: upsertError } = await db
      .from('community_avatars')
      .upsert({
        user_id:    user.id,
        shape:      shape   || AVATAR_DEFAULTS.shape,
        color:      color   || AVATAR_DEFAULTS.color,
        icon:       icon    || AVATAR_DEFAULTS.icon,
        border:     border  || AVATAR_DEFAULTS.border,
        pattern:    pattern || AVATAR_DEFAULTS.pattern,
        updated_at: now,
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('POST /api/avatar upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/avatar error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Avatar API — GET public, POST auth-required
//               Validates options against membership tier before saving
//               Upserts to community_avatars table
// --- END CHANGE LOG ---
