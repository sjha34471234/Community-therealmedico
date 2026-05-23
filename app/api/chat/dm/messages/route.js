// --- WHY THIS CODE EXISTS ---
// API route for DM messages inside a conversation.
// GET → fetches paginated messages for a conversation (decrypted before returning)
// POST → sends a new DM message (sanitized, rate limited, encrypted before saving)

// --- WHAT THIS MADE WORK ---
// GET /api/chat/dm/messages?conversation_id=xxx&before=timestamp&limit=30
// POST /api/chat/dm/messages { conversation_id, body }
// Used by DMView.jsx for loading and sending encrypted DM messages

// --- PITFALLS ---
// ⚠️ ALWAYS verify the requesting user is a participant before returning messages
//    RLS handles this at DB level but we double-check here for defence in depth
// ⚠️ Messages are stored as cipher text in `body` column + random `iv` column
//    NEVER return raw cipher text to frontend — always decrypt first
// ⚠️ If decrypt() fails for a message, return '[message unavailable]' — never crash
// ⚠️ Messages fetched ORDER BY created_at DESC then reversed — same as room messages
// ⚠️ `before` cursor param used for pagination — never offset (same reason as rooms)
// ⚠️ After inserting a message, update last_message_at on the conversation
//    This keeps the DM list sorted correctly (most recent first)
// ⚠️ Rate limit is shared across room + DM messages (same checkRateLimit function)
//    3 messages per 10 seconds total — not per channel
// ⚠️ sanitize() must be called before encrypt() — sanitize plaintext, then encrypt

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM messages GET + POST with AES-256 encryption
// --- END CHANGE LOG ---

import { supabaseServer } from '@/lib/supabaseServer';
import { sanitize, checkRateLimit, encrypt, decrypt, CHAT_LIMITS } from '@/lib/chatConfig';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================
// HELPER — verify Bearer token, return user or null
// ============================================================
async function getAuthUser(request, supabase) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================================
// HELPER — verify user is a participant in this conversation
// Returns the conversation row or null
// ============================================================
async function getConversationForUser(supabase, conversationId, userId) {
  const { data, error } = await supabase
    .from('community_dm_conversations')
    .select('id, user_a, user_b')
    .eq('id', conversationId)
    .single();

  if (error || !data) return null;
  if (data.user_a !== userId && data.user_b !== userId) return null;
  return data;
}

// ============================================================
// GET — fetch paginated DM messages for a conversation
// Query params: conversation_id (required), before (optional), limit (optional)
// ============================================================
export async function GET(request) {
  try {
    const supabase = supabaseServer();
    const user = await getAuthUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view messages' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const before = searchParams.get('before');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || CHAT_LIMITS.dmPageSize),
      50
    );

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Verify user is a participant — security check
    const convo = await getConversationForUser(supabase, conversationId, user.id);
    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build paginated query
    let query = supabase
      .from('community_dm_messages')
      .select('id, conversation_id, sender_id, body, iv, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [], hasMore: false }, { status: 200 });
    }

    // Collect unique sender IDs for bulk profile + avatar fetch
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)));

    // Bulk fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .in('id', senderIds);

    const profileMap = {};
    for (const p of (profiles || [])) {
      profileMap[p.id] = p;
    }

    // Bulk fetch avatars
    const { data: avatars } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .in('user_id', senderIds);

    const avatarMap = {};
    for (const a of (avatars || [])) {
      avatarMap[a.user_id] = a;
    }

    // Decrypt all messages in parallel
    // Promise.all runs all decryptions simultaneously — much faster than one by one
    const enriched = await Promise.all(messages.map(async msg => {
      let decryptedBody = '[message unavailable]';
      if (msg.body && msg.iv) {
        decryptedBody = await decrypt(msg.body, msg.iv);
      }

      return {
        id: msg.id,
        conversation_id: msg.conversation_id,
        body: decryptedBody,
        created_at: msg.created_at,
        sentByMe: msg.sender_id === user.id,
        author_username: profileMap[msg.sender_id]?.community_username || 'Anonymous',
        author_is_member: profileMap[msg.sender_id]?.is_member || false,
        author_avatar: avatarMap[msg.sender_id] || null,
      };
    }));

    // Reverse so frontend gets oldest → newest
    enriched.reverse();

    const hasMore = messages.length === limit;

    return NextResponse.json({ messages: enriched, hasMore }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/chat/dm/messages]', err.message);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// ============================================================
// POST — send a new DM message
// Body: { conversation_id, body }
// Requires: Authorization: Bearer <token>
// ============================================================
export async function POST(request) {
  try {
    const supabase = supabaseServer();
    const user = await getAuthUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to send messages' }, { status: 401 });
    }

    const { conversation_id, body } = await request.json();

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Verify user is a participant — never let outsiders post
    const convo = await getConversationForUser(supabase, conversation_id, user.id);
    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Sanitize first — always sanitize plaintext BEFORE encrypting
    const clean = sanitize(body || '');

    if (!clean) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (clean.length > CHAT_LIMITS.maxDmLength) {
      return NextResponse.json(
        { error: `Message too long — max ${CHAT_LIMITS.maxDmLength} characters` },
        { status: 400 }
      );
    }

    // Rate limit check — shared across room + DM messages
    const rate = checkRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Slow down — wait ${rate.retryAfter}s before sending again` },
        { status: 429 }
      );
    }

    // Encrypt the clean message body
    // ⚠️ sanitize() was called first — we always encrypt clean text, never raw input
    const { cipher, iv } = await encrypt(clean);

    // Insert encrypted message
    const { data: newMsg, error: insertError } = await supabase
      .from('community_dm_messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        body: cipher,   // encrypted cipher text stored in body column
        iv,             // random IV stored separately — needed for decryption
      })
      .select('id, conversation_id, sender_id, body, iv, created_at')
      .single();

    if (insertError) throw insertError;

    // Update last_message_at on conversation so DM list stays sorted
    await supabase
      .from('community_dm_conversations')
      .update({ last_message_at: newMsg.created_at })
      .eq('id', conversation_id);

    // Fetch sender profile + avatar for immediate render in frontend
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

    // Return decrypted body to the sender for immediate display
    // We already have the clean text so no need to decrypt again
    return NextResponse.json({
      message: {
        id: newMsg.id,
        conversation_id: newMsg.conversation_id,
        body: clean,   // return plaintext to sender — they just typed it
        created_at: newMsg.created_at,
        sentByMe: true,
        author_username: profile?.community_username || 'Anonymous',
        author_is_member: profile?.is_member || false,
        author_avatar: avatar || null,
      }
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/chat/dm/messages]', err.message);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
