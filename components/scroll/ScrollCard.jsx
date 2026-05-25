'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen, snap-scroll aligned
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll — one card per question
// FEATURES:
//   - Title trimmed to max 25 words
//   - User avatar + username bottom left
//   - Right sidebar: upvote, downvote, comment count
//   - Double-tap anywhere = upvote + heart burst animation
//   - Comments drawer via ScrollComments
// ⚠️ PITFALLS:
//   - Double tap uses lastTapRef — two taps <300ms apart = double tap
//   - avatarRow prop — NEVER avatar= (silent bug per brain dump)
//   - useEffect MUST be before any conditional return (Rules of Hooks)
//   - stopPropagation on sidebar buttons — prevents double-tap firing
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/Avatar';
import ScrollComments from '@/components/scroll/ScrollComments';

function trimToWords(text, max) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  return words.slice(0, max).join(' ') + '…';
}

export default function ScrollCard({ question, isActive }) {
  const { user, accessToken } = useAuthStore();
  const [upvotes, setUpvotes] = useState(question.upvotes || 0);
  const [downvotes, setDownvotes] = useState(question.downvotes || 0);
  const [myVote, setMyVote] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTapRef = useRef(0);

  const handleVote = useCallback(async function(type) {
    if (!user || !accessToken) return;
    const newVote = myVote === type ? null : type;
    const prevVote = myVote;
    setMyVote(newVote);
    if (type === 'up') {
      setUpvotes(function(v) { return newVote === 'up' ? v + 1 : v - 1; });
      if (prevVote === 'down') setDownvotes(function(v) { return v - 1; });
    } else {
      setDownvotes(function(v) { return newVote === 'down' ? v + 1 : v - 1; });
      if (prevVote === 'up') setUpvotes(function(v) { return v - 1; });
    }
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ content_type: 'question', content_id: question.id, vote_type: newVote }),
      });
    } catch (_) {}
  }, [user, accessToken, myVote, question.id]);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setHeartVisible(true);
      setTimeout(function() { setHeartVisible(false); }, 750);
      if (myVote !== 'up') handleVote('up');
    }
    lastTapRef.current = now;
  }

  const tags = Array.isArray(question.tags) ? question.tags.slice(0, 3) : [];
  const commentCount = question.answer_count || 0;
  const displayText = trimToWords(question.title || question.body || '', 25);

  return (
    <div className="scroll-card" onClick={handleTap} onTouchEnd={handleTap}>
      <div className="scroll-card-bg" />
      <div className="scroll-card-gradient" />

      {heartVisible && <span className="scroll-heart-burst">❤️</span>}

      <div className="scroll-card-actions">
        <button
          className="scroll-action-btn"
          onClick={function(e) { e.stopPropagation(); handleVote('up'); }}
          aria-label="Upvote"
        >
          <div className={'scroll-action-icon' + (myVote === 'up' ? ' voted-up' : '')}>
            <ThumbsUp size={20} color={myVote === 'up' ? '#7EC8F0' : '#fff'} strokeWidth={1.8} />
          </div>
          <span className="scroll-action-label">{upvotes}</span>
        </button>

        <button
          className="scroll-action-btn"
          onClick={function(e) { e.stopPropagation(); handleVote('down'); }}
          aria-label="Downvote"
        >
          <div className={'scroll-action-icon' + (myVote === 'down' ? ' voted-down' : '')}>
            <ThumbsDown size={20} color={myVote === 'down' ? '#EF9A9A' : '#fff'} strokeWidth={1.8} />
          </div>
          <span className="scroll-action-label">{downvotes}</span>
        </button>

        <button
          className="scroll-action-btn"
          onClick={function(e) { e.stopPropagation(); setShowComments(true); }}
          aria-label="Comments"
        >
          <div className="scroll-action-icon">
            <MessageCircle size={20} color="#fff" strokeWidth={1.8} />
          </div>
          <span className="scroll-action-label">{commentCount}</span>
        </button>
      </div>

      <div className="scroll-card-bottom">
        <div className="scroll-card-user-row">
          <Avatar avatarRow={question.avatar} username={question.community_username} size="sm" />
          <span className="scroll-card-username">@{question.community_username || 'anon'}</span>
        </div>
        <div className="scroll-card-content">{displayText}</div>
        {tags.length > 0 && (
          <div className="scroll-card-tags">
            {tags.map(function(tag) {
              return <span key={tag} className="scroll-card-tag">#{tag}</span>;
            })}
          </div>
        )}
      </div>

      {showComments && (
        <ScrollComments
          question={question}
          onClose={function() { setShowComments(false); }}
        />
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollCard — full screen snap card, double-tap upvote,
//   right sidebar actions, bottom user+content+tags, comments drawer.
// --- END CHANGE LOG ---
