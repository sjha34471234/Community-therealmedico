// ============================================================
// FILE: app/api/tags/seed/route.js
// PURPOSE: One-time admin route that syncs lib/tagConfig.js into community_tags table
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Tags must exist in Supabase so questions can reference them.
//   This route upserts all tags from tagConfig — safe to re-run anytime.
//   Run it once after deploy, and again whenever tagConfig changes.
// DEPENDENCIES: lib/tagConfig.js, lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: Must use service role (supabaseServer) — bypasses RLS
// ⚠️ DO NOT CHANGE: Protected by SEED_SECRET env var — never expose publicly
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { ALL_TAGS } from '@/lib/tagConfig'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    // Protect with a secret so random users can't trigger this
    const { secret } = await request.json()
    if (secret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = supabaseServer()

    // Build rows to upsert
    const rows = ALL_TAGS.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
      category: tag.category,
      description: null,
      post_count: 0,
    }))

    // Upsert on slug — safe to re-run, won't reset post_count on conflict
    const { data, error } = await db
      .from('community_tags')
      .upsert(rows, {
        onConflict: 'slug',
        ignoreDuplicates: true, // Don't overwrite existing post_count
      })
      .select('id, name, slug, category')

    if (error) {
      console.error('[seed/tags] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      seeded: rows.length,
      message: `${rows.length} tags upserted into community_tags`,
    })
  } catch (err) {
    console.error('[seed/tags] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Need tags in Supabase to power tag pages and question tagging
// --- END CHANGE LOG ---
