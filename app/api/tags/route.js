// ============================================================
// FILE: app/api/tags/route.js
// PURPOSE: Returns all tags from community_tags grouped by category
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Tags page needs server data. Public GET — no auth required.
// DEPENDENCIES: lib/supabaseServer.js, lib/tagConfig.js
// ⚠️ DO NOT CHANGE: cache: 'no-store' — post_count changes frequently
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { TAG_CATEGORIES } from '@/lib/tagConfig'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = supabaseServer()

    const { data: tags, error } = await db
      .from('community_tags')
      .select('id, name, slug, category, description, post_count')
      .order('post_count', { ascending: false })

    if (error) {
      console.error('[api/tags] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group tags by category, preserving TAG_CATEGORIES order
    const grouped = TAG_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      description: cat.description,
      tags: tags.filter((t) => t.category === cat.id),
    })).filter((cat) => cat.tags.length > 0)

    return NextResponse.json({ grouped }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[api/tags] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Tags page needs grouped tag data with live post counts
// --- END CHANGE LOG ---
