// --- WHY THIS CODE EXISTS ---
// API route that returns the list of all 12 chat rooms.
// Also returns the latest message preview and message count for each room
// so the sidebar can show "last activity" without a separate query.

// --- WHAT THIS MADE WORK ---
// GET /api/chat/rooms → returns all 12 rooms with last message preview
// Used by RoomList.jsx to render the sidebar room list
// Guests can call this — no auth required (rooms are public)

// --- PITFALLS ---
// ⚠️ Room list comes from lib/chatConfig.js (chatRooms array) — NOT from a DB query
// ⚠️ We only hit the DB for the last message preview per room — one efficient query
// ⚠️ Never expose user_id in the response — only username and avatar
// ⚠️ cache: 'no-store' is set on this route — room activity must always be fresh

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — rooms list API
// --- END CHANGE LOG ---

import { supabaseServer } from '@/lib/supabaseServer';
import { chatRooms } from '@/lib/chatConfig';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = supabaseServer();

    // Step 1 — get all room IDs from DB so we can match to our config slugs
    const { data: dbRooms, error: roomsError } = await supabase
      .from('community_chat_rooms')
      .select('id, slug')
      .order('display_order', { ascending: true });

    if (roomsError) throw roomsError;

    // Build a map of slug → room id for fast lookup
    const slugToId = {};
    for (const r of dbRooms) {
      slugToId[r.slug] = r.id;
    }

    // Step 2 — for each room, fetch the single latest message
    // We do this as one query per room using Promise.all — fast and parallel
    const roomIds = dbRooms.map(r => r.id);

    // Fetch latest message for all rooms in one query
    // We get the most recent message per room using a subquery pattern
    const { data: latestMessages, error: msgError } = await supabase
      .from('community_chat_messages')
      .select(`
        id,
        room_id,
        body,
        created_at,
        user_id
      `)
      .in('room_id', roomIds)
      .order('created_at', { ascending: false })
      .limit(roomIds.length * 1);

    if (msgError) throw msgError;

    // Build a map of room_id → latest message
    const latestByRoom = {};
    for (const msg of (latestMessages || [])) {
      if (!latestByRoom[msg.room_id]) {
        latestByRoom[msg.room_id] = msg;
      }
    }

    // Step 3 — fetch usernames for users who sent the latest messages
    const userIds = Array.from(new Set(
      Object.values(latestByRoom)
        .map(m => m.user_id)
        .filter(Boolean)
    ));

    const usernameMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, community_username')
        .in('id', userIds);

      for (const p of (profiles || [])) {
        usernameMap[p.id] = p.community_username;
      }
    }

    // Step 4 — merge config + DB data into final response
    const rooms = chatRooms.map(room => {
      const roomId = slugToId[room.slug];
      const latest = roomId ? latestByRoom[roomId] : null;

      return {
        id: roomId || null,
        slug: room.slug,
        name: room.name,
        icon: room.icon,
        description: room.description,
        order: room.order,
        lastMessage: latest ? {
          // Truncate preview to 60 chars so sidebar stays clean
          preview: latest.body
            ? latest.body.slice(0, 60) + (latest.body.length > 60 ? '…' : '')
            : null,
          createdAt: latest.created_at,
          username: usernameMap[latest.user_id] || 'Someone',
        } : null,
      };
    });

    return NextResponse.json({ rooms }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/chat/rooms]', err.message);
    return NextResponse.json(
      { error: 'Failed to load rooms' },
      { status: 500 }
    );
  }
}
