// --- WHY THIS CODE EXISTS ---
// API route for DM conversations (not messages — just the conversation threads themselves).
// GET → returns paginated list of all DM conversations for the logged-in user
//        Each conversation now includes isUnread flag for the blue dot in DMList
// POST → creates a new DM conversation between two users (or returns existing one)
// PATCH → marks a conversation as read (called when user opens a DM)

// --- PITFALLS ---
// ⚠️ user_a is ALWAYS the alphabetically smaller UUID — enforces UNIQUE constraint
// ⚠️ Last message preview must be decrypted before returning — never return raw cipher text
// ⚠️ Bearer token required for all methods — DMs are never public
// ⚠️ user_a_last_read_at and user_b_last_read_at added May 25 — used for unread tracking
// ⚠️ isUnread = last_message_at > my_last_read_at AND latest message not sent by me

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM conversations GET + POST
// [May 2026]     UPDATED: Phase 13 — block + ban check added to POST.
//                other_user.id included in responses for BlockButton.
// [May 25, 2026] UPDATED: Added isUnread flag to each conversation in GET.
//                Added PATCH handler to mark conversation as read.
//                Uses user_a_last_read_at / user_b_last_read_at columns
//                added to community_dm_conversations table May 25, 2026.
// --- END CHANGE LOG ---

import { supabaseServer } from '@/lib/supabaseServer';
import { decrypt, CHAT_LIMITS } from '@/lib/chatConfig';
import { isBlocked, isBanned } from '@/lib/modConfig';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAuthUser(request, supabase) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================================
// GET — list DM conversations for logged-in user
// ============================================================
export async function GET(request) {
  try {
    const supabase = supabaseServer();
    const user = await getAuthUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view messages' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = CHAT_LIMITS.dmListPageSize;

    const { data: convos, error } = await supabase
      .from('community_dm_conversations')
      .select('id, user_a, user_b, last_message_at, created_at, user_a_last_read_at, user_b_last_read_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!convos || convos.length === 0) {
      return NextResponse.json({ conversations: [], hasMore: false }, { status: 200 });
    }

    const otherUserIds = Array.from(new Set(
      convos.map(c => c.user_a === user.id ? c.user_b : c.user_a)
    ));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .in('id', otherUserIds);

    const profileMap = {};
    for (const p of (profiles || [])) profileMap[p.id] = p;

    const { data: avatars } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .in('user_id', otherUserIds);

    const avatarMap = {};
    for (const a of (avatars || [])) avatarMap[a.user_id] = a;

    const convoIds = convos.map(c => c.id);
    const { data: latestMsgs } = await supabase
      .from('community_dm_messages')
      .select('id, conversation_id, sender_id, body, iv, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false })
      .limit(convoIds.length * 1);

    const latestByConvo = {};
    for (const msg of (latestMsgs || [])) {
      if (!latestByConvo[msg.conversation_id]) {
        latestByConvo[msg.conversation_id] = msg;
      }
    }

    const conversations = await Promise.all(convos.map(async c => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const latest = latestByConvo[c.id];

      let preview = null;
      if (latest?.body && latest?.iv) {
        try {
          const decrypted = await decrypt(latest.body, latest.iv);
          preview = decrypted.slice(0, 60) + (decrypted.length > 60 ? '…' : '');
        } catch {
          preview = '🔒 Encrypted message';
        }
      }

      // ── Unread logic ──────────────────────────────────────
      // isUnread = latest message exists + not sent by me
      //            + last_message_at is newer than my last read time
      const myLastRead = c.user_a === user.id ? c.user_a_last_read_at : c.user_b_last_read_at;
      const isUnread = !!(
        latest &&
        latest.sender_id !== user.id &&
        c.last_message_at &&
        (!myLastRead || new Date(c.last_message_at) > new Date(myLastRead))
      );

      return {
        id: c.id,
        last_message_at: c.last_message_at,
        isUnread,
        other_user: {
          id: otherId,
          username: profileMap[otherId]?.community_username || 'Unknown',
          is_member: profileMap[otherId]?.is_member || false,
          avatar: avatarMap[otherId] || null,
        },
        lastMessage: latest ? {
          preview,
          createdAt: latest.created_at,
          sentByMe: latest.sender_id === user.id,
        } : null,
      };
    }));

    const hasMore = convos.length === limit;
    return NextResponse.json({ conversations, hasMore }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/chat/dm]', err.message);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

// ============================================================
// POST — create or retrieve a DM conversation
// ============================================================
export async function POST(request) {
  try {
    const supabase = supabaseServer();
    const user = await getAuthUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to send messages' }, { status: 401 });
    }

    const { other_user_id } = await request.json();
    if (!other_user_id) {
      return NextResponse.json({ error: 'other_user_id is required' }, { status: 400 });
    }
    if (other_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    const banned = await isBanned(supabase, user.id);
    if (banned) {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
    }

    const blocked = await isBlocked(supabase, user.id, other_user_id);
    if (blocked) {
      return NextResponse.json({ error: 'You cannot send messages to this user' }, { status: 403 });
    }

    const { data: otherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .eq('id', other_user_id)
      .single();

    if (profileError || !otherProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [userA, userB] = [user.id, other_user_id].sort();

    const { data: existing } = await supabase
      .from('community_dm_conversations')
      .select('id, user_a, user_b, last_message_at, created_at')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .single();

    if (existing) {
      const { data: avatar } = await supabase
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .eq('user_id', other_user_id)
        .single();

      return NextResponse.json({
        conversation: {
          id: existing.id,
          last_message_at: existing.last_message_at,
          isUnread: false,
          other_user: {
            id: other_user_id,
            username: otherProfile.community_username || 'Unknown',
            is_member: otherProfile.is_member || false,
            avatar: avatar || null,
          },
          lastMessage: null,
        },
        created: false,
      }, { status: 200 });
    }

    const { data: newConvo, error: insertError } = await supabase
      .from('community_dm_conversations')
      .insert({ user_a: userA, user_b: userB })
      .select('id, user_a, user_b, last_message_at, created_at')
      .single();

    if (insertError) throw insertError;

    const { data: avatar } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .eq('user_id', other_user_id)
      .single();

    return NextResponse.json({
      conversation: {
        id: newConvo.id,
        last_message_at: newConvo.last_message_at,
        isUnread: false,
        other_user: {
          id: other_user_id,
          username: otherProfile.community_username || 'Unknown',
          is_member: otherProfile.is_member || false,
          avatar: avatar || null,
        },
        lastMessage: null,
      },
      created: true,
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/chat/dm]', err.message);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// ============================================================
// PATCH — mark a conversation as read
// Body: { conversation_id }
// Called when user opens a DM conversation
// ============================================================
export async function PATCH(request) {
  try {
    const supabase = supabaseServer();
    const user = await getAuthUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { conversation_id } = await request.json();
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Verify user is part of this conversation
    const { data: convo } = await supabase
      .from('community_dm_conversations')
      .select('id, user_a, user_b')
      .eq('id', conversation_id)
      .single();

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isUserA = convo.user_a === user.id;
    const isUserB = convo.user_b === user.id;

    if (!isUserA && !isUserB) {
      return NextResponse.json({ error: 'Not part of this conversation' }, { status: 403 });
    }

    // Update the correct last_read_at column
    const updateField = isUserA ? 'user_a_last_read_at' : 'user_b_last_read_at';
    await supabase
      .from('community_dm_conversations')
      .update({ [updateField]: new Date().toISOString() })
      .eq('id', conversation_id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[PATCH /api/chat/dm]', err.message);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
