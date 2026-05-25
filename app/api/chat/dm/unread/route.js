// ============================================================
// FILE: app/api/chat/dm/unread/route.js
// PURPOSE: Returns count of DM conversations with unread messages
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: BottomNav Chat tab needs an unread badge like
//   NotificationBell. Separate lightweight endpoint — never
//   piggyback unread count onto the full DM list endpoint.
// ⚠️ DO NOT CHANGE: Bearer token auth only — never cookies.
//   Counts conversations where latest message is not from the
//   current user AND is newer than last_read_at for that convo.
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
    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    const db = supabaseServer()

    // Get all DM conversations this user is part of
    const { data: convos, error: convosError } = await db
      .from('community_dm_conversations')
      .select('id, user1_id, user2_id, last_message_at, user1_last_read_at, user2_last_read_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (convosError || !convos || convos.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    let unreadCount = 0

    for (const convo of convos) {
      const isUser1 = convo.user1_id === user.id
      const myLastRead = isUser1 ? convo.user1_last_read_at : convo.user2_last_read_at
      const lastMessageAt = convo.last_message_at

      if (!lastMessageAt) continue

      // If never read, or last message is newer than last read
      if (!myLastRead || new Date(lastMessageAt) > new Date(myLastRead)) {
        // Make sure the latest message is not from me
        const { data: latestMsg } = await db
          .from('community_dm_messages')
          .select('user_id')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestMsg && latestMsg.user_id !== user.id) {
          unreadCount++
        }
      }
    }

    return NextResponse.json({ count: unreadCount })
  } catch (err) {
    return NextResponse.json({ count: 0 })
  }
}

// --- CHANGE LOG ---
// [May 25, 2026] CREATED: Unread DM count endpoint for BottomNav badge
// REASON: BottomNav Chat tab needed a red dot badge like NotificationBell.
// LOGIC: Counts conversations where last_message_at > my last_read_at
//   AND the latest message sender is not me.
// --- END CHANGE LOG ---
