'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen snap-scroll
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll
// ⚠️ prop is `scroll` not `question` — separate content type
// ⚠️ avatarRow prop on Avatar — NEVER avatar=
// ⚠️ useEffect before any conditional return — Rules of Hooks
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/Avatar';
import ScrollComments from '@/components/scroll/ScrollComments';

export default function ScrollCard({ scroll, isActive }) {
  const { user, accessToken } = useAuthStore();
  const [upvotes, setUpvotes] = useState(scroll.upvotes || 0);
  const [downvotes, setDownvotes] = useState(scroll.downvotes || 0);
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
        body: JSON.stringify({ content_type: 'scroll', content_id: scroll.id, vote_type: newVote }),
      });
    } catch (_) {}
  }, [user, accessToken, myVote, scroll.id]);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setHeartVisible(true);
      setTimeout(function() { setHeartVisible(false); }, 750);
      if (myVote !== 'up') handleVote('up');
    }
    lastTapRef.current = now;
  }

  return (
    <div className="scroll-card" onClick={handleTap}>
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
          <span className="scroll-action-label">{scroll.comment_count || 0}</span>
        </button>
      </div>

      <div className="scroll-card-bottom">
        <div className="scroll-card-user-row">
          <Avatar avatarRow={scroll.avatar} username={scroll.community_username} size="sm" />
          <span className="scroll-card-username">@{scroll.community_username || 'anon'}</span>
        </div>
        <div className="scroll-card-content">{scroll.content}</div>
      </div>

      {showComments && (
        <ScrollComments
          scroll={scroll}
          onClose={function() { setShowComments(false); }}
        />
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollCard
// [May 26, 2026] FIXED: prop renamed question → scroll, uses scroll.content,
//   scroll.comment_count, scroll.avatar, scroll.community_username.
// --- END CHANGE LOG ---
