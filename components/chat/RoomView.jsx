// --- WHY THIS CODE EXISTS ---
// Renders a single chat message — used in both RoomView and DMView.
// Shows avatar, username, timestamp, and message body.
// For DMs, "sent by me" messages appear on the right (like WhatsApp).
// For room messages, all messages appear on the left (like Slack).
// --- PITFALLS ---
// ⚠️ Avatar prop is avatarRow — NEVER avatar= (silent bug, shows default stethoscope)
// ⚠️ Username link must be null-safe — only render link if author_username exists
// ⚠️ Member usernames get gold colour (#B8860B) per design language
// ⚠️ All anchor tags are single line — iPad clipboard rule
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — single message bubble component
// [May 23, 2026] FIXED: All multiline anchor tags collapsed to single line — iPad clipboard bug
// --- END CHANGE LOG ---

'use client';

import Avatar from '@/components/Avatar';

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  if (isYesterday) return 'Yesterday ' + timeStr;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

export default function MessageBubble({ message, isDM = false }) {
  const { body, created_at, author_username, author_is_member, author_avatar, sentByMe } = message;
  const isRight = isDM && sentByMe;

  return (
    <div style={{ display: 'flex', flexDirection: isRight ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginBottom: '12px', padding: '0 12px' }}>

      {!isRight && (
        <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
          <Avatar avatarRow={author_avatar} username={author_username} size="xs" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>

        {!isRight && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            {author_username ? (
              <a href={'/profile/' + author_username} style={{ fontSize: '12px', fontWeight: 600, color: author_is_member ? '#B8860B' : 'var(--text-primary)', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>{author_username}{author_is_member && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#B8860B', border: '1px solid #D4AF37', borderRadius: '3px', padding: '0 3px', fontWeight: 700 }}>✦</span>}</a>
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Anonymous</span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{formatTime(created_at)}</span>
          </div>
        )}

        <div style={{ backgroundColor: isRight ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isRight ? '#ffffff' : 'var(--text-primary)', borderRadius: isRight ? '16px 16px 4px 16px' : '4px 16px 16px 16px', padding: '8px 12px', fontSize: '14px', lineHeight: '1.5', fontFamily: 'Inter, sans-serif', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {body}
        </div>

        {isRight && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'Inter, sans-serif' }}>{formatTime(created_at)}</span>
        )}

      </div>
    </div>
  );
}
