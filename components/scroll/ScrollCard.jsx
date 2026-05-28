'use client';

// ============================================================
// FILE: components/scroll/ScrollCard.jsx
// PURPOSE: Single scroll card — full screen snap-scroll
// LAST CHANGED: May 28, 2026
// ⚠️ avatarRow prop on Avatar — NEVER avatar=
// ⚠️ Votes use scroll_id — NOT question_id or answer_id
// ⚠️ onClick only — no onTouchEnd (double-fire on mobile)
// ⚠️ Music plays when card is active, pauses when scrolled away
// ⚠️ bg.value for solid/gradient — NOT bg.color or bg.css
// ⚠️ bg.type 'custom-gradient' uses bg.color1, bg.color2, bg.direction
// ⚠️ Element positions: el.x/390*100% and el.y/680*100% (pixel-based, not fractions)
// ⚠️ Music fields: musicData.trackUrl, musicData.startSec, musicData.trackName
// ⚠️ scroll.avatar and scroll.community_username — flat fields from API, not nested
// ⚠️ useAuthStore is a DEFAULT import — import useAuthStore from '@/store/authStore'
// ⚠️ VolumeX and Music are the ONLY safe lucide icons for audio — never Volume2
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
  const singleTapTimer = useRef(null); // tells single tap from double tap
  const muteIconTimer  = useRef(null); // clears the mute overlay
  const audioRef       = useRef(null);

  const canvasData = scroll.canvas_data || null;
  const bg         = canvasData?.background;
  const elements   = canvasData?.elements || [];
  const musicData  = canvasData?.music;

  // ── Background style ──────────────────────────────────────
  // bg.value for solid and preset gradients
  // custom-gradient uses bg.color1, bg.color2, bg.direction
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
  }, []); // Only on mount — trackUrl won't change for a given card

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
        headers: {
          'Content-Type': 'application/json',
          Authorization:  'Bearer ' + accessToken,
        },
        credentials: 'include',
        body: JSON.stringify({ scroll_id: scroll.id, vote_type: voteTypeNum }),
      });
    } catch (_) {}
  }, [user, accessToken, myVote, scroll.id]);

  // ── Show mute/unmute icon briefly ─────────────────────────
  function flashMuteIcon() {
    clearTimeout(muteIconTimer.current);
    setShowMuteIcon(true);
    muteIconTimer.current = setTimeout(function() {
      setShowMuteIcon(false);
    }, 900);
  }

  // ── Tap handler ───────────────────────────────────────────
  // Double tap (< 300ms): heart + upvote. Cancels pending single-tap.
  // Single tap (confirmed after 300ms wait): toggle music + show icon.
  function handleTap() {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      // ── Double tap ──
      clearTimeout(singleTapTimer.current);
      setHeartVisible(true);
      setTimeout(function() { setHeartVisible(false); }, 750);
      if (myVote !== 'up') handleVote('up');
    } else {
      // ── Potential single tap — wait 300ms to confirm ──
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(function() {
        if (musicData && musicData.trackUrl) {
          setMusicPaused(function(prev) {
            flashMuteIcon();
            return !prev;
          });
        }
      }, 300);
    }

    lastTapRef.current = now;
  }

  return (
    <div className="scroll-card" onClick={handleTap}>

      {/* Background — canvas_data driven via inline bgStyle */}
      <div className="scroll-card-bg" style={bgStyle} />
      <div className="scroll-card-gradient" />

      {/* Double-tap heart burst */}
      {heartVisible && <span className="scroll-heart-burst">❤️</span>}

      {/* Mute / unmute visual feedback — appears on single tap, fades out */}
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

      {/* Canvas elements — text + icons, pixel-based positions */}
      {elements.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          {elements.map(function(el) {
            if (el.type === 'text') {
              return (
                <div
                  key={el.id}
                  style={{
                    position:       'absolute',
                    left:           (el.x / 390) * 100 + '%',
                    top:            (el.y / 680) * 100 + '%',
                    width:          (el.w / 390) * 100 + '%',
                    height:         (el.h / 680) * 100 + '%',
                    opacity:        el.opacity || 1,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontFamily:     el.font || 'Inter, sans-serif',
                    fontSize:       'clamp(10px, ' + ((el.size || 24) / 390 * 100) + 'vw, ' + (el.size || 24) + 'px)',
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
                    left:     (el.x / 390) * 100 + '%',
                    top:      (el.y / 680) * 100 + '%',
                    width:    (el.w / 390) * 100 + '%',
                    height:   (el.h / 680) * 100 + '%',
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

      {/* Bottom info — avatar + username + music indicator */}
      <div className="scroll-card-bottom">
        <div className="scroll-card-user-row">
          <Avatar avatarRow={scroll.avatar} username={scroll.community_username} size="sm" />
          <span className="scroll-card-username">@{scroll.community_username || 'anon'}</span>

          {/* Music indicator — dims and shows 'paused' when muted */}
          {musicData && (
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        4,
              color:      musicPaused ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
              fontSize:   11,
              marginLeft: 6,
              transition: 'color 0.25s ease',
            }}>
              {musicPaused
                ? <VolumeX size={11} />
                : <Music    size={11} />
              }
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {musicPaused ? 'muted' : musicData.trackName}
              </span>
            </div>
          )}
        </div>

        {/* Plain content — only shown when no canvas elements */}
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
// [May 28, 2026] ADDED: Phase 15C — single tap mute/unmute with visual feedback.
//   musicPaused state added. showMuteIcon state added.
//   handleTap updated: 300ms timer distinguishes single vs double tap.
//   Single tap confirmed → toggle musicPaused + flash mute icon overlay.
//   Double tap → heart + upvote, single-tap timer cancelled (no music toggle).
//   Mute icon: VolumeX when muted, Music when unmuted — both safe in lucide v0.303.
//   Music indicator in bottom bar shows VolumeX + 'muted' when paused, dims.
//   All existing logic preserved: bg.value, custom-gradient, pixel positions,
//   el.font/size/svg, trackUrl/startSec, scroll.avatar, scroll.community_username.
// --- END CHANGE LOG ---
