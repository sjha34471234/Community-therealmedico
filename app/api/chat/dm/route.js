// --- WHY THIS CODE EXISTS ---
// API route for DM conversations (not messages — just the conversation threads themselves).
// GET → returns paginated list of all DM conversations for the logged-in user
// POST → creates a new DM conversation between two users (or returns existing one)

// --- WHAT THIS MADE WORK ---
// GET /api/chat/dm → sidebar DM list with last message preview (decrypted)
// POST /api/chat/dm { other_user_id } → start or resume a DM conversation
// Used by DMList.jsx (sidebar) and UserSearchModal.jsx (new DM button)

// --- PITFALLS ---
// ⚠️ user_a is ALWAYS the alphabetically smaller UUID — this enforces the UNIQUE constraint
//    If you insert with user_a and user_b swapped, you get a duplicate conversation
//    Always sort: const [a, b] = [uid1, uid2].sort()
// ⚠️ Last message preview must be decrypted before returning — never return raw cipher text
// ⚠️ If no messages exist yet, lastMessage is null — that is valid (new empty conversation)
// ⚠️ Bearer token required for both GET and POST — DMs are never public
// ⚠️ Never expose the other user's user_id in the response — only username and avatar
// ⚠️ dmListPageSize = 15 — load more on scroll using `offset` param (cursor not needed here
//    because DM list order rarely changes mid-scroll unlike message streams)

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — DM conversations GET + POST
// --- END CHANGE LOG ---

import { supabaseServer } from '@/lib/supabaseServer';
import { decrypt, CHAT_LIMITS } from '@/lib/chatConfig';
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
// GET — list DM conversations for logged-in user
// Query params: offset (optional, default 0)
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

    // Fetch conversations where user is either user_a or user_b
    // Order by last_message_at DESC so most recent appears first
    const { data: convos, error } = await supabase
      .from('community_dm_conversations')
      .select('id, user_a, user_b, last_message_at, created_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!convos || convos.length === 0) {
      return NextResponse.json({ conversations: [], hasMore: false }, { status: 200 });
    }

    // Collect the "other" user's ID for each conversation
    const otherUserIds = Array.from(new Set(
      convos.map(c => c.user_a === user.id ? c.user_b : c.user_a)
    ));

    // Bulk fetch other users' profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .in('id', otherUserIds);

    const profileMap = {};
    for (const p of (profiles || [])) {
      profileMap[p.id] = p;
    }

    // Bulk fetch other users' avatars
    const { data: avatars } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .in('user_id', otherUserIds);

    const avatarMap = {};
    for (const a of (avatars || [])) {
      avatarMap[a.user_id] = a;
    }

    // For each conversation fetch the latest DM message (for preview)
    const convoIds = convos.map(c => c.id);
    const { data: latestMsgs } = await supabase
      .from('community_dm_messages')
      .select('id, conversation_id, sender_id, body, iv, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false })
      .limit(convoIds.length * 1);

    // Build map of conversation_id → latest message
    const latestByConvo = {};
    for (const msg of (latestMsgs || [])) {
      if (!latestByConvo[msg.conversation_id]) {
        latestByConvo[msg.conversation_id] = msg;
      }
    }

    // Decrypt previews and build final response
    const conversations = await Promise.all(convos.map(async c => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const latest = latestByConvo[c.id];

      let preview = null;
      if (latest?.body && latest?.iv) {
        try {
          const decrypted = await decrypt(latest.body, latest.iv);
          // Truncate to 60 chars for sidebar preview
          preview = decrypted.slice(0, 60) + (decrypted.length > 60 ? '…' : '');
        } catch {
          preview = '🔒 Encrypted message';
        }
      }

      return {
        id: c.id,
        last_message_at: c.last_message_at,
        other_user: {
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
// Body: { other_user_id }
// Returns the conversation object (existing or newly created)
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

    // Verify other user exists
    const { data: otherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, community_username, is_member')
      .eq('id', other_user_id)
      .single();

    if (profileError || !otherProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ⚠️ CRITICAL: always sort so user_a < user_b alphabetically
    // This enforces the UNIQUE constraint — prevents duplicate conversations
    const [userA, userB] = [user.id, other_user_id].sort();

    // Try to find existing conversation first
    const { data: existing } = await supabase
      .from('community_dm_conversations')
      .select('id, user_a, user_b, last_message_at, created_at')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .single();

    if (existing) {
      // Fetch other user avatar
      const { data: avatar } = await supabase
        .from('community_avatars')
        .select('user_id, shape, color, icon, border, pattern')
        .eq('user_id', other_user_id)
        .single();

      return NextResponse.json({
        conversation: {
          id: existing.id,
          last_message_at: existing.last_message_at,
          other_user: {
            username: otherProfile.community_username || 'Unknown',
            is_member: otherProfile.is_member || false,
            avatar: avatar || null,
          },
          lastMessage: null,
        },
        created: false,
      }, { status: 200 });
    }

    // Create new conversation
    const { data: newConvo, error: insertError } = await supabase
      .from('community_dm_conversations')
      .insert({ user_a: userA, user_b: userB })
      .select('id, user_a, user_b, last_message_at, created_at')
      .single();

    if (insertError) throw insertError;

    // Fetch other user avatar for response
    const { data: avatar } = await supabase
      .from('community_avatars')
      .select('user_id, shape, color, icon, border, pattern')
      .eq('user_id', other_user_id)
      .single();

    return NextResponse.json({
      conversation: {
        id: newConvo.id,
        last_message_at: newConvo.last_message_at,
        other_user: {
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
