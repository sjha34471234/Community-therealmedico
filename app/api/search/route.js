// ============================================================
// FILE: app/api/search/route.js
// PURPOSE: Full-text search across questions, tags, and usernames
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Powers both the inline dropdown and /search results page
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: cache: 'no-store' — results must always be fresh
// ⚠️ DO NOT CHANGE: Public GET — no auth required for search
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const filter = searchParams.get('filter') || 'all' // all | questions | tags | users
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit

    if (!q || q.length < 2) {
      return NextResponse.json({ questions: [], tags: [], users: [], total: 0 })
    }

    const db = supabaseServer()
    const results = { questions: [], tags: [], users: [] }

    // ── Questions ──────────────────────────────────────────────
    if (filter === 'all' || filter === 'questions') {
      const { data: questions, error: qErr } = await db
        .from('community_questions')
        .select('id, slug, title, body, tags, upvotes, answer_count, created_at')
        .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
        .order('upvotes', { ascending: false })
        .range(offset, offset + limit - 1)

      if (qErr) console.error('[api/search] questions error:', qErr)
      else results.questions = questions || []
    }

    // ── Tags ───────────────────────────────────────────────────
    if (filter === 'all' || filter === 'tags') {
      const { data: tags, error: tErr } = await db
        .from('community_tags')
        .select('id, name, slug, category, post_count')
        .ilike('name', `%${q}%`)
        .order('post_count', { ascending: false })
        .limit(filter === 'all' ? 5 : limit)

      if (tErr) console.error('[api/search] tags error:', tErr)
      else results.tags = tags || []
    }

    // ── Users ──────────────────────────────────────────────────
    if (filter === 'all' || filter === 'users') {
      const { data: users, error: uErr } = await db
        .from('profiles')
        .select('id, community_username, community_bio, community_flair, community_joined_at')
        .ilike('community_username', `%${q}%`)
        .not('community_username', 'is', null)
        .order('community_joined_at', { ascending: false })
        .limit(filter === 'all' ? 5 : limit)

      if (uErr) console.error('[api/search] users error:', uErr)
      else results.users = users || []
    }

    const total =
      results.questions.length + results.tags.length + results.users.length

    return NextResponse.json({ ...results, total }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[api/search] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Unified search endpoint for dropdown + full results page
// --- END CHANGE LOG ---
