// --- WHY THIS CODE EXISTS ---
// Renders a single chat message — used in both RoomView and DMView.
// Shows avatar, username, timestamp, and message body.
// For DMs, "sent by me" messages appear on the right (like WhatsApp).
// For room messages, all messages appear on the left (like Slack).

// --- WHAT THIS MADE WORK ---
// MessageBubble → used by RoomView.jsx and DMView.jsx
// Handles both room messages (no sentByMe) and DM messages (sentByMe flips layout)
// Avatar uses avatarRow= prop — the correct prop name, never avatar=

// --- PITFALLS ---
// ⚠️ Avatar prop is avatarRow — NEVER avatar= (silent bug, shows default stethoscope)
// ⚠️ Username link must be null-safe — only render <a> if author_username exists
// ⚠️ Timestamp uses toLocaleTimeString — shows local time, not UTC
// ⚠️ Member usernames get gold colour (#B8860B) per design language
// ⚠️ Do not add onClick to the whole bubble — breaks text selection

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — single message bubble component
// --- END CHANGE LOG ---

'use client';

import Avatar from '@/components/Avatar';

// Helper — format timestamp as "2:34 PM" or "Yesterday 2:34 PM" or "May 20 2:34 PM"
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

export default function MessageBubble({ message, isDM = false }) {
  // message shape:
  // { id, body, created_at, author_username, author_is_member, author_avatar, sentByMe? }
  // sentByMe is only relevant for DMs — ignored for room messages

  const {
    body,
    created_at,
    author_username,
    author_is_member,
    author_avatar,
    sentByMe,
  } = message;

  // DM messages from "me" appear on the right
  const isRight = isDM && sentByMe;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isRight ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: '12px',
        padding: '0 12px',
      }}
    >
      {/* Avatar — hidden for "my" DM messages to save space */}
      {!isRight && (
        <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
          <Avatar
            avatarRow={author_avatar}
            username={author_username}
            size="xs"
          />
        </div>
      )}

      {/* Bubble content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isRight ? 'flex-end' : 'flex-start',
          maxWidth: '72%',
        }}
      >
        {/* Username + timestamp — hidden for "my" DM messages */}
        {!isRight && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '3px',
            }}
          >
            {author_username ? (
              
                href={`/profile/${author_username}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: author_is_member ? '#B8860B' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {author_username}
                {author_is_member && (
                  <span
                    style={{
                      marginLeft: '4px',
                      fontSize: '10px',
                      color: '#B8860B',
                      border: '1px solid #D4AF37',
                      borderRadius: '3px',
                      padding: '0 3px',
                      fontWeight: 700,
                    }}
                  >
                    ✦
                  </span>
                )}
              </a>
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Anonymous
              </span>
            )}
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {formatTime(created_at)}
            </span>
          </div>
        )}

        {/* Message body bubble */}
        <div
          style={{
            backgroundColor: isRight ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: isRight ? '#ffffff' : 'var(--text-primary)',
            borderRadius: isRight ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
            padding: '8px 12px',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'Inter, sans-serif',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {body}
        </div>

        {/* Timestamp for "my" DM messages — shown below bubble on right */}
        {isRight && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '3px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {formatTime(created_at)}
          </span>
        )}
      </div>
    </div>
  );
}
