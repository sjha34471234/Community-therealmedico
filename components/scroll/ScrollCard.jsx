'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen snap-scroll
// LAST CHANGED: May 28, 2026
// ⚠️ avatarRow prop on Avatar — NEVER avatar=
// ⚠️ Votes use scroll_id — NOT question_id or answer_id
// ⚠️ onClick only — no onTouchEnd (double-fire on mobile)
// ⚠️ bg.value for solid/gradient — NOT bg.color or bg.css
// ⚠️ bg.type 'custom-gradient' uses bg.color1, bg.color2, bg.direction
// ⚠️ Music fields: musicData.trackUrl, musicData.startSec, musicData.trackName
// ⚠️ scroll.avatar and scroll.community_username — flat fields, not nested
// ⚠️ useAuthStore is a DEFAULT import
// ⚠️ VolumeX and Music are the only safe lucide audio icons (v0.303)
// ⚠️ canvas_data.size.w + size.h — actual creator display dimensions.
//    Elements are positioned as (el.x / size.w)*100% within an aspect-ratio
//    frame. Old scrolls without size default to { w:390, h:680 }.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Music, VolumeX } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/Avatar';
import ScrollComments from '@/components/scroll/ScrollComments';

export default function ScrollCard({ scroll, isActive }) {
  const { user, accessToken } = useAuthStore();
  const [upvotes, setUpvotes]           = useState(scroll.upvotes || 0);
  const [downvotes, setDownvotes]       = useState(scroll.downvotes || 0);
  const [myVote, setMyVote]             = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const [musicPaused, setMusicPaused]   = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);

  const lastTapRef     = useRef(0);
  const singleTapTimer = useRef(null);
  const muteIconTimer  = useRef(null);
  const audioRef       = useRef(null);

  const canvasData = scroll.canvas_data || null;
  const bg         = canvasData?.background;
  const elements   = canvasData?.elements || [];
  const musicData  = canvasData?.music;

  // ── Canvas coordinate space ───────────────────────────────
  // size.w/h = the actual px dimensions the creator used.
  // Old scrolls without size default to 390×680.
  const baseW       = canvasData?.size?.w || 390;
  const baseH       = canvasData?.size?.h || 680;
  const orientation = canvasData?.size?.orientation || 'portrait';

  // ── Background style ──────────────────────────────────────
  let bgStyle = {};
  if (bg) {
    if (bg.type === 'solid') {
      bgStyle = { background: bg.value };
    } else if (bg.type === 'gradient') {
      bgStyle = { background: bg.value };
    } else if (bg.type === 'custom-gradient') {
      bgStyle = {
        background: bg.direction === 'radial'
          ? 'radial-gradient(circle at center, ' + bg.color1 + ', ' + bg.color2 + ')'
          : 'linear-gradient(' + bg.direction + ', ' + bg.color1 + ', ' + bg.color2 + ')',
      };
    }
  }

  // ── Audio: create once on mount, destroy on unmount ───────
  useEffect(function() {
    if (!musicData || !musicData.trackUrl) return;
    const audio = new Audio(musicData.trackUrl);
    audio.loop        = true;
    audio.volume      = 0.4;
    audio.currentTime = musicData.startSec || 0;
    audioRef.current  = audio;
    return function() {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current  = null;
    };
  }, []);

  // ── Audio: respond to isActive + musicPaused ──────────────
  useEffect(function() {
    if (!audioRef.current) return;
    if (isActive && !musicPaused) {
      audioRef.current.play().catch(function() {});
    } else {
      audioRef.current.pause();
    }
  }, [isActive, musicPaused]);

  // ── Votes ─────────────────────────────────────────────────
  const handleVote = useCallback(async function(type) {
    if (!user || !accessToken) return;
    const newVote  = myVote === type ? null : type;
    const prevVote = myVote;
    setMyVote(newVote);
    if (type === 'up') {
      setUpvotes(function(v)   { return newVote === 'up'   ? v + 1 : v - 1; });
      if (prevVote === 'down') setDownvotes(function(v) { return v - 1; });
    } else {
      setDownvotes(function(v) { return newVote === 'down' ? v + 1 : v - 1; });
      if (prevVote === 'up')   setUpvotes(function(v) { return v - 1; });
    }
    const voteTypeNum = newVote === 'up' ? 1 : newVote === 'down' ? -1 : 0;
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ scroll_id: scroll.id, vote_type: voteTypeNum }),
      });
    } catch (_) {}
  }, [user, accessToken, myVote, scroll.id]);

  // ── Mute icon flash ───────────────────────────────────────
  function flashMuteIcon() {
    clearTimeout(muteIconTimer.current);
    setShowMuteIcon(true);
    muteIconTimer.current = setTimeout(function() { setShowMuteIcon(false); }, 900);
  }

  // ── Tap handler ───────────────────────────────────────────
  // Double tap (< 300ms): heart + upvote. Cancels single-tap.
  // Single tap (after 300ms wait): toggle music + flash icon.
  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      clearTimeout(singleTapTimer.current);
      setHeartVisible(true);
      setTimeout(function() { setHeartVisible(false); }, 750);
      if (myVote !== 'up') handleVote('up');
    } else {
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(function() {
        if (musicData && musicData.trackUrl) {
          setMusicPaused(function(prev) { flashMuteIcon(); return !prev; });
        }
      }, 300);
    }
    lastTapRef.current = now;
  }

  // ── Canvas frame style (aspect-ratio container for elements) ─
  // Portrait fills full screen. Square/Landscape centered with
  // background colour showing in the empty areas.
  const frameStyle = orientation === 'portrait' ? {
    position:      'absolute',
    inset:         0,
    zIndex:        1,
    pointerEvents: 'none',
  } : {
    position:      'absolute',
    top:           '50%',
    left:          '50%',
    transform:     'translate(-50%, -50%)',
    width:         '100%',
    aspectRatio:   baseW + ' / ' + baseH,
    maxHeight:     '100dvh',
    zIndex:        1,
    pointerEvents: 'none',
  };

  return (
    <div className="scroll-card" onClick={handleTap}>

      {/* Background — fills full card always, even for square/landscape */}
      <div className="scroll-card-bg" style={bgStyle} />
      <div className="scroll-card-gradient" />

      {/* Double-tap heart burst */}
      {heartVisible && <span className="scroll-heart-burst">❤️</span>}

      {/* Mute / unmute visual feedback */}
      {showMuteIcon && musicData && (
        <div className="scroll-mute-overlay">
          <div className="scroll-mute-icon-circle">
            {musicPaused
              ? <VolumeX size={38} color="#fff" strokeWidth={1.6} />
              : <Music    size={38} color="#fff" strokeWidth={1.6} />
            }
          </div>
        </div>
      )}

      {/* Canvas elements — inside aspect-ratio frame */}
      {elements.length > 0 && (
        <div style={frameStyle}>
          {elements.map(function(el) {
            if (el.type === 'text') {
              return (
                <div
                  key={el.id}
                  style={{
                    position:       'absolute',
                    left:           (el.x / baseW) * 100 + '%',
                    top:            (el.y / baseH) * 100 + '%',
                    width:          (el.w / baseW) * 100 + '%',
                    height:         (el.h / baseH) * 100 + '%',
                    opacity:        el.opacity || 1,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontFamily:     el.font || 'Inter, sans-serif',
                    fontSize:       'clamp(10px, ' + ((el.size || 24) / baseW * 100) + 'vw, ' + (el.size || 24) + 'px)',
                    color:          el.color || '#ffffff',
                    fontWeight:     el.bold   ? 700 : 400,
                    fontStyle:      el.italic ? 'italic' : 'normal',
                    textAlign:      'center',
                    padding:        '4px 8px',
                    wordBreak:      'break-word',
                    lineHeight:     1.3,
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
                    left:     (el.x / baseW) * 100 + '%',
                    top:      (el.y / baseH) * 100 + '%',
                    width:    (el.w / baseW) * 100 + '%',
                    height:   (el.h / baseH) * 100 + '%',
                    opacity:  el.opacity || 1,
                  }}
                  dangerouslySetInnerHTML={{ __html: el.svg || '' }}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Action buttons — TikTok/Instagram vertical column, right side */}
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
          {musicData && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6,
              color: musicPaused ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
              fontSize: 11, transition: 'color 0.25s ease',
            }}>
              {musicPaused ? <VolumeX size={11} /> : <Music size={11} />}
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {musicPaused ? 'muted' : musicData.trackName}
              </span>
            </div>
          )}
        </div>
        {elements.length === 0 && (
          <div className="scroll-card-content">{scroll.content}</div>
        )}
      </div>

      {showComments && (
        <ScrollComments scroll={scroll} onClose={function() { setShowComments(false); }} />
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollCard
// [May 27, 2026] FIXED: Vote call uses scroll_id + vote_type number.
// [May 27, 2026] ADDED: canvas_data rendering, music per card, music indicator.
// [May 28, 2026] ADDED: Single-tap mute toggle + mute icon visual feedback.
//   musicPaused state, singleTapTimer (300ms) to separate from double-tap.
//   Double-tap still fires heart + upvote, music toggle is cancelled.
// [May 28, 2026] ADDED: Multi-orientation support.
//   baseW/baseH read from canvas_data.size (stored by creator at post time).
//   Elements rendered as (el.x/baseW)*100% within an aspect-ratio frame.
//   Portrait: frame fills full screen (inset:0). Square/Landscape: centered
//   aspect-ratio box, background colour fills remainder of screen.
//   Old scrolls without canvas_data.size default to { w:390, h:680 }.
// --- END CHANGE LOG ---
