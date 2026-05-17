// ============================================================
// FILE: components/QuestionCard.jsx
// PURPOSE: Renders a single question in the feed
//          Shows new-reply badge + left border for resurfaced posts
//          Shows gold left border for Real Medico+ member posts
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Homepage feed, tag pages, search results all
//               reuse this single card component
// DEPENDENCIES: components/TagPill.jsx, app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: <a> tags must stay on single lines — iPad rule
//                   hasNewActivity border + badge must stay together
//                   body preview is capped at 200 chars by the API
//                   is_member_post border must not override hasNewActivity border
// ============================================================

'use client';

import TagPill from '@/components/TagPill';

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  return Math.floor(months / 12) + 'y ago';
}

export default function QuestionCard({ question }) {
  if (!question) return null;

  const hasNewActivity = question.hasNewActivity === true;
  const isMemberPost = question.is_member_post === true;

  // Priority: new activity (blue) > member post (gold) > default
  let borderLeft = '1px solid var(--bg-tertiary)';
  if (hasNewActivity) {
    borderLeft = '4px solid var(--accent-primary)';
  } else if (isMemberPost) {
    borderLeft = '4px solid var(--member-border)';
  }

  const cardStyle = {
    backgroundColor: isMemberPost && !hasNewActivity ? 'var(--member-bg)' : 'var(--bg-primary)',
    border: '1px solid var(--bg-tertiary)',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '0.75rem',
    borderLeft: borderLeft,
    transition: 'box-shadow 0.15s ease',
  };

  return (
    <div style={cardStyle}>

      {/* New activity badge */}
      {hasNewActivity && (
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.03em' }}>● New reply</span>
        </div>
      )}

      {/* Pinned badge */}
      {question.is_pinned && (
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF9C3', color: '#854D0E', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.03em' }}>📌 Pinned</span>
        </div>
      )}

      {/* Question title */}
      <a href={'/q/' + question.slug} style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: '0.4rem' }}>
        {question.is_answered && (
          <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, marginRight: '6px' }}>✓ Answered</span>
        )}
        {question.title}
      </a>

      {/* Body preview */}
      {question.body && (
        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {question.body}
        </p>
      )}

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {question.tags.slice(0, 4).map(function(tag) {
            return <TagPill key={tag} tag={tag} />;
          })}
        </div>
      )}

      {/* Footer row — stats + meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>▲ {question.upvotes || 0}</span>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: question.answer_count > 0 ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>💬 {question.answer_count || 0} {question.answer_count === 1 ? 'answer' : 'answers'}</span>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}>👁 {question.view_count || 0}</span>
        </div>

        {/* Author + time */}
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ color: isMemberPost ? 'var(--member-gold)' : 'var(--accent-primary)', fontWeight: 500 }}>
            {isMemberPost ? '👑 ' : ''}{question.author_username || 'Anonymous'}
          </span>
          <span style={{ margin: '0 4px' }}>·</span>
          <span>{timeAgo(question.created_at)}</span>
        </div>

      </div>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Homepage feed needs a card component for each question
// [May 17, 2026] UPDATED: Real Medico+ gold border + subtle bg + gold author name
// REASON: Phase 7 — member cosmetics on question cards
// --- END CHANGE LOG ---
