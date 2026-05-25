// ============================================================
// FILE: app/api/chat/dm/unread/route.js
// PURPOSE: Returns count of DM conversations with unread messages
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: BottomNav Chat tab unread badge.
// ⚠️ Uses user_a/user_b columns — NOT user1_id/user2_id
// ⚠️ Returns { count: 0 } on any error — never breaks the nav
// ============================================================

import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

export async function GET(request) {
  try {
    const user = await getUserFromHeader(request)
    if (!user) return NextResponse.json({ count: 0 })

    const db = supabaseServer()

    const { data: convos } = await db
      .from('community_dm_conversations')
      .select('id, user_a, user_b, last_message_at, user_a_last_read_at, user_b_last_read_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

    if (!convos || convos.length === 0) return NextResponse.json({ count: 0 })

    // Filter to conversations that might be unread
    const candidates = convos.filter(function(c) {
      const myLastRead = c.user_a === user.id ? c.user_a_last_read_at : c.user_b_last_read_at
      if (!c.last_message_at) return false
      return !myLastRead || new Date(c.last_message_at) > new Date(myLastRead)
    })

    if (candidates.length === 0) return NextResponse.json({ count: 0 })

    // For each candidate check the latest message is not from me
    let unreadCount = 0
    for (const convo of candidates) {
      const { data: latestMsg } = await db
        .from('community_dm_messages')
        .select('sender_id')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestMsg && latestMsg.sender_id !== user.id) {
        unreadCount++
      }
    }

    return NextResponse.json({ count: unreadCount })
  } catch (err) {
    return NextResponse.json({ count: 0 })
  }
}

// --- CHANGE LOG ---
// [May 25, 2026] CREATED: Unread DM count for BottomNav badge
// [May 25, 2026] FIXED: Uses user_a/user_b columns correctly
//   (earlier version wrongly used user1_id/user2_id which don't exist)
// --- END CHANGE LOG ---
