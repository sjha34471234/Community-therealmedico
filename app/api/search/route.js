// ============================================================
// FILE: app/api/search/route.js
// PURPOSE: Full-text search across questions, tags, and usernames
// LAST CHANGED: May 23, 2026
// WHY IT EXISTS: Powers both the inline dropdown and /search results page
//                Also powers UserSearchModal.jsx in Phase 12 Chat
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: cache: 'no-store' — results must always be fresh
// ⚠️ DO NOT CHANGE: Public GET — no auth required for search
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Unified search endpoint for questions, tags, and users.
// Used by: SearchBar dropdown, /search page, and UserSearchModal (Phase 12 Chat).

// --- WHAT CHANGED May 23, 2026 ---
// 1. Added `offset` param support alongside existing `page` param
//    UserSearchModal sends offset= directly, not page=
//    Both still work — offset takes priority if provided
// 2. Added `hasMore` to response — UserSearchModal needs this for lazy load
// 3. Added `is_member` and `avatar` to users SELECT
//    UserSearchModal renders avatars and member badges
// 4. Added `type` param as alias for `filter` — UserSearchModal sends type=users

// --- PITFALLS ---
// ⚠️ Never remove `hasMore` from response — UserSearchModal lazy load breaks without it
// ⚠️ Never remove `is_member` from users SELECT — member badge breaks in modal
// ⚠️ Never remove `avatar` join — avatar shows default stethoscope without it
// ⚠️ offset param takes priority over page param — do not swap this logic
// ⚠️ `type` param is an alias for `filter` — both must keep working

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// [May 23, 2026] UPDATED: Added offset param, hasMore, is_member + avatar to users,
//                         type= alias for filter= — Phase 12 Chat UserSearchModal support
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    // `type` is an alias for `filter` — UserSearchModal sends type=users
    const filter = searchParams.get('filter') || searchParams.get('type') || 'all'

    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // offset param takes priority over page param
    // UserSearchModal sends offset= directly
    // Existing SearchBar/search page sends page=
    const rawOffset = searchParams.get('offset')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const offset = rawOffset !== null ? parseInt(rawOffset, 10) : (page - 1) * limit

    if (!q || q.length < 2) {
      return NextResponse.json({
        questions: [],
        tags: [],
        users: [],
        total: 0,
        hasMore: false,
      })
    }

    const db = supabaseServer()
    const results = { questions: [], tags: [], users: [] }

    // ── Questions ──────────────────────────────────────────────
    if (filter === 'all' || filter === 'questions') {
      const { data: questions, error: qErr } = await db
        .from('community_questions')
        .select('id, slug, title, body, tags, upvotes, downvotes, answer_count, created_at')
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
      // Fetch one extra record beyond limit to determine hasMore
      // Without this we'd need a separate COUNT query (expensive)
      const fetchLimit = filter === 'all' ? 5 : limit + 1

      const { data: users, error: uErr } = await db
        .from('profiles')
        .select('id, community_username, community_bio, community_flair, community_joined_at, is_member')
        .ilike('community_username', `%${q}%`)
        .not('community_username', 'is', null)
        .order('community_joined_at', { ascending: false })
        .range(offset, offset + fetchLimit - 1)

      if (uErr) {
        console.error('[api/search] users error:', uErr)
      } else {
        const rawUsers = users || []

        // Determine hasMore from the extra record trick
        const hasMoreUsers = filter !== 'all' && rawUsers.length > limit
        const trimmedUsers = hasMoreUsers ? rawUsers.slice(0, limit) : rawUsers

        // Bulk fetch avatars for returned users
        const userIds = trimmedUsers.map(u => u.id).filter(Boolean)
        let avatarMap = {}
        if (userIds.length > 0) {
          const { data: avatars } = await db
            .from('community_avatars')
            .select('user_id, shape, color, icon, border, pattern')
            .in('user_id', userIds)

          for (const a of (avatars || [])) {
            avatarMap[a.user_id] = a
          }
        }

        // Attach avatar to each user
        results.users = trimmedUsers.map(u => ({
          ...u,
          avatar: avatarMap[u.id] || null,
        }))

        // hasMore only meaningful when filtering by users specifically
        if (filter === 'users') {
          results.hasMore = hasMoreUsers
        }
      }
    }

    const total =
      results.questions.length + results.tags.length + results.users.length

    // hasMore at top level — used by UserSearchModal lazy load
    // Only relevant when type=users or filter=users
    const hasMore = results.hasMore || false
    delete results.hasMore // clean up before spreading

    return NextResponse.json({ ...results, total, hasMore }, {
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (err) {
    console.error('[api/search] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
