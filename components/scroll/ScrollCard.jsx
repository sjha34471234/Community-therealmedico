'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen snap-scroll
// LAST CHANGED: May 27, 2026
// WHY IT EXISTS: Phase 15 Scroll
// ⚠️ prop is `scroll` not `question` — separate content type
// ⚠️ avatarRow prop on Avatar — NEVER avatar=
// ⚠️ Votes use scroll_id param — NOT question_id or answer_id
// ⚠️ onClick only — no onTouchEnd to prevent double-fire on mobile
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

    // Map to vote_type number — same as questions/answers
    const voteTypeNum = newVote === 'up' ? 1 : newVote === 'down' ? -1 : 0;

    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          scroll_id: scroll.id,
          vote_type: voteTypeNum,
        }),
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

  // Build background style from canvas_data if available
const canvasData = scroll.canvas_data || null;
const bg = canvasData?.background;
let bgStyle = {};
if (bg) {
  if (bg.type === 'solid') bgStyle = { background: bg.value };
  else if (bg.type === 'gradient') bgStyle = { background: bg.value };
  else if (bg.type === 'custom-gradient') {
    const dir = bg.direction === 'radial'
      ? 'radial-gradient(circle at center, ' + bg.color1 + ', ' + bg.color2 + ')'
      : 'linear-gradient(' + bg.direction + ', ' + bg.color1 + ', ' + bg.color2 + ')';
    bgStyle = { background: dir };
  }
}

const elements = canvasData?.elements || [];

return (
  <div className="scroll-card" onClick={handleTap}>
    <div className="scroll-card-bg" style={bgStyle} />
    <div className="scroll-card-gradient" />

    {/* Render canvas elements */}
    {elements.length > 0 && (
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {elements.map(function(el) {
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: (el.x / 390) * 100 + '%',
                  top: (el.y / 680) * 100 + '%',
                  width: (el.w / 390) * 100 + '%',
                  height: (el.h / 680) * 100 + '%',
                  opacity: el.opacity || 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: el.font || 'Inter, sans-serif',
                  fontSize: 'clamp(10px, ' + ((el.size || 24) / 390 * 100) + 'vw, ' + (el.size || 24) + 'px)',
                  color: el.color || '#ffffff',
                  fontWeight: el.bold ? 700 : 400,
                  fontStyle: el.italic ? 'italic' : 'normal',
                  textAlign: 'center',
                  padding: '4px 8px',
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                }}
              >
                {el.text}
              </div>
            );
          }
          if (el.type === 'icon') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: (el.x / 390) * 100 + '%',
                  top: (el.y / 680) * 100 + '%',
                  width: (el.w / 390) * 100 + '%',
                  height: (el.h / 680) * 100 + '%',
                  opacity: el.opacity || 1,
                }}
                dangerouslySetInnerHTML={{ __html: el.svg || '' }}
              />
            );
          }
          return null;
        })}
      </div>
    )}

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
// [May 27, 2026] FIXED: Vote call now sends scroll_id + vote_type number.
//   Previously sent content_type/content_id which votes API doesn't understand.
//   Removed onTouchEnd double-fire. votes API updated to handle scroll_id.
// --- END CHANGE LOG ---
