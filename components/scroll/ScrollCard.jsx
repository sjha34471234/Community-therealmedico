'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen snap-scroll
// LAST CHANGED: May 27, 2026
// ⚠️ avatarRow prop on Avatar — NEVER avatar=
// ⚠️ Votes use scroll_id — NOT question_id or answer_id
// ⚠️ onClick only — no onTouchEnd (double-fire on mobile)
// ⚠️ Music plays when card is active, pauses when scrolled away
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Music } from 'lucide-react';
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
  const [musicReady, setMusicReady] = useState(false);
  const lastTapRef = useRef(0);
  const audioRef = useRef(null);

  const canvasData = scroll.canvas_data || null;
  const bg = canvasData?.background;
  const elements = canvasData?.elements || [];
  const musicData = canvasData?.music;

  // Build background style
  let bgStyle = {};
  if (bg) {
    if (bg.type === 'solid') bgStyle = { background: bg.value };
    else if (bg.type === 'gradient') bgStyle = { background: bg.value };
    else if (bg.type === 'custom-gradient') {
      bgStyle = {
        background: bg.direction === 'radial'
          ? 'radial-gradient(circle at center, ' + bg.color1 + ', ' + bg.color2 + ')'
          : 'linear-gradient(' + bg.direction + ', ' + bg.color1 + ', ' + bg.color2 + ')',
      };
    }
  }

  // ── Setup music audio on mount ──
  useEffect(function() {
    if (!musicData || !musicData.trackUrl) return;

    const audio = new Audio(musicData.trackUrl);
    audio.loop = true;
    audio.volume = 0.4;
    audio.currentTime = musicData.startSec || 0;
    audioRef.current = audio;
    setMusicReady(true);

    return function() {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
      setMusicReady(false);
    };
  }, [musicData?.trackUrl]);

  // ── Play when active, pause when not ──
  useEffect(function() {
    if (!audioRef.current) return;
    if (isActive) {
      audioRef.current.play().catch(function() {});
    } else {
      audioRef.current.pause();
    }
  }, [isActive]);

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

    const voteTypeNum = newVote === 'up' ? 1 : newVote === 'down' ? -1 : 0;

    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        credentials: 'include',
        body: JSON.stringify({ scroll_id: scroll.id, vote_type: voteTypeNum }),
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
      {/* Background */}
      <div className="scroll-card-bg" style={bgStyle} />
      <div className="scroll-card-gradient" />

      {heartVisible && <span className="scroll-heart-burst">❤️</span>}

      {/* Canvas elements — text + icons */}
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

      {/* Action buttons */}
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

      {/* Bottom info */}
      <div className="scroll-card-bottom">
        <div className="scroll-card-user-row">
          <Avatar avatarRow={scroll.avatar} username={scroll.community_username} size="sm" />
          <span className="scroll-card-username">@{scroll.community_username || 'anon'}</span>
          {/* Music indicator */}
          {musicData && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              marginLeft: 6,
            }}>
              <Music size={11} />
              <span style={{
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {musicData.trackName}
              </span>
            </div>
          )}
        </div>
        {/* Only show plain content if no canvas elements */}
        {elements.length === 0 && (
          <div className="scroll-card-content">{scroll.content}</div>
        )}
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
// [May 27, 2026] FIXED: Vote call uses scroll_id + vote_type number.
// [May 27, 2026] ADDED: canvas_data rendering — background, text elements,
//   icon elements all render proportionally scaled to screen size.
//   Music plays when card is active (isActive=true), pauses when scrolled past.
//   Music indicator shows track name bottom of card.
//   Plain content text only shown when no canvas elements exist.
// --- END CHANGE LOG ---
