// --- WHY THIS CODE EXISTS ---
// API route for room chat messages.
// GET → fetches paginated messages for a room (guests can read)
// POST → sends a new message (signed-in users only)
// Includes rate limiting, sanitization, and avatar fetch for each message author.

// --- WHAT THIS MADE WORK ---
// GET /api/chat/messages?room_id=xxx&before=timestamp&limit=30
// POST /api/chat/messages { room_id, body }
// Used by RoomView.jsx for loading and sending messages

// --- PITFALLS ---
// ⚠️ Messages are fetched ORDER BY created_at DESC (newest first) then reversed in frontend
//    so "load older" scroll works correctly
// ⚠️ `before` param is a created_at timestamp — used for cursor pagination (no offset)
//    Offset pagination breaks under real-time inserts. Cursor is always correct.
// ⚠️ Rate limit is checked BEFORE DB insert — never after
// ⚠️ sanitize() MUST be called before every DB insert — never skip
// ⚠️ Room messages are NOT encrypted — they are public. Only DMs are encrypted.
// ⚠️ Bearer token is required for POST — read from Authorization header
// ⚠️ user_id comes from auth token ONLY — never trust request body for user identity
// ⚠️ avatarRow is attached to each message so MessageBubble.jsx can render avatars
//    without extra fetches — same bulk pattern as questions and notifications

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — room messages GET + POST
// --- END CHANGE LOG ---

import { supabaseServer } from '@/lib/supabaseServer';
import { sanitize, checkRateLimit, CHAT_LIMITS } from '@/lib/chatConfig';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================
// GET — fetch paginated room messages
// Query params: room_id (required), before (optional ISO timestamp), limit (optional)
// ============================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id');
    const before = searchParams.get('before');     // cursor — load messages before this timestamp
    const limit = Math.min(
      parseInt(searchParams.get('limit') || CHAT_LIMITS.roomPageSize),
      50  // hard cap — never allow more than 50 per request
    );

    if (!roomId) {
      return NextResponse.json({ error: 'room_id is required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Build query — cursor pagination using created_at
    let query = supabase
      .from('community_chat_messages')
      .select('id, room_id, user_id, body, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If `before` timestamp provided, only fetch messages older than that
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [], hasMore: false }, { status: 200 });
    }

    // Collect unique user IDs for bulk profile + avatar fetch
    const userIds = Array.from(new Set(messages.map(m => m.user_id).filter(Boolean)));

    // Bulk fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .in('id', userIds);

    const profileMap = {};
    for (const p of (profiles || [])) {
      profileMap[p.id] = p;
    }

    // Bulk fetch avatars — same pattern as questions and notifications
    const { data: avatars } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .in('user_id', userIds);

    const avatarMap = {};
    for (const a of (avatars || [])) {
      avatarMap[a.user_id] = a;
    }

    // Attach profile + avatar to each message
    const enriched = messages.map(msg => ({
      id: msg.id,
      room_id: msg.room_id,
      body: msg.body,
      created_at: msg.created_at,
      author_username: profileMap[msg.user_id]?.community_username || 'Anonymous',
      author_is_member: profileMap[msg.user_id]?.is_member || false,
      author_avatar: avatarMap[msg.user_id] || null,
    }));

    // Frontend expects oldest → newest so reverse the DESC results
    enriched.reverse();

    // hasMore: if we got a full page, there are probably more older messages
    const hasMore = messages.length === limit;

    return NextResponse.json({ messages: enriched, hasMore }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/chat/messages]', err.message);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// ============================================================
// POST — send a new room message
// Body: { room_id, body }
// Requires: Authorization: Bearer <token>
// ============================================================
export async function POST(request) {
  try {
    // Step 1 — verify auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sign in to send messages' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Step 2 — parse and validate body
    const { room_id, body } = await request.json();

    if (!room_id) {
      return NextResponse.json({ error: 'room_id is required' }, { status: 400 });
    }

    // Step 3 — sanitize message body
    const clean = sanitize(body || '');

    if (!clean) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (clean.length > CHAT_LIMITS.maxMessageLength) {
      return NextResponse.json(
        { error: `Message too long — max ${CHAT_LIMITS.maxMessageLength} characters` },
        { status: 400 }
      );
    }

    // Step 4 — rate limit check
    const rate = checkRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Slow down — wait ${rate.retryAfter}s before sending again` },
        { status: 429 }
      );
    }

    // Step 5 — verify room exists
    const { data: room, error: roomError } = await supabase
      .from('community_chat_rooms')
      .select('id')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Step 6 — insert message
    const { data: newMsg, error: insertError } = await supabase
      .from('community_chat_messages')
      .insert({
        room_id,
        user_id: user.id,
        body: clean,
      })
      .select('id, room_id, user_id, body, created_at')
      .single();

    if (insertError) throw insertError;

    // Step 7 — fetch sender profile + avatar to return with message
    // So the frontend can render it immediately without a refetch
    const { data: profile } = await supabase
      .from('profiles')
      .select('community_username, is_member')
      .eq('id', user.id)
      .single();

    const { data: avatar } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      message: {
        id: newMsg.id,
        room_id: newMsg.room_id,
        body: newMsg.body,
        created_at: newMsg.created_at,
        author_username: profile?.community_username || 'Anonymous',
        author_is_member: profile?.is_member || false,
        author_avatar: avatar || null,
      }
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/chat/messages]', err.message);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
