'use client';

// ============================================================
// FILE: components/scroll/ScrollFeed.jsx
// PURPOSE: Snap-scroll container — fetches scrolls in batches, renders ScrollCards
// ⚠️ CSS class is 'scroll-container' — matches scroll.css exactly, do not rename
// ⚠️ isFetchingRef is a ref (not state) — prevents stale closure inside scroll handler
// ============================================================

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollFeed
// [May 26, 2026] FIXED: Now fetches /api/scrolls (own table) not /api/questions.
// [May 28, 2026] UPDATED: Phase 15C — batch loading, prefetch, isFetchingRef.
// [Jun 04, 2026] FIXED: Feed now constrained between navbar and bottom nav.
//   Root cause: scroll-container used inset:0 (full viewport). Cards were 100dvh
//   tall. Navbar and bottom nav floated on top, hiding elements near top/bottom
//   of each card that the creator designed to be visible.
//   Fix: useEffect measures nav (querySelector('nav')) and bottom nav
//   (.bottom-nav) offsetHeights. Sets --scroll-card-h CSS variable on :root
//   so scroll.css .scroll-card uses the correct contained height.
//   Container gets inline style top/bottom to sit between navbar + bottom nav.
//   Cleans up CSS variable on unmount so other pages aren't affected.
//   Scroll index now uses container.clientHeight (not window.innerHeight) so
//   snap-scroll math matches actual card height.
// --- END CHANGE LOG ---

import { useState, useEffect, useRef, useCallback } from 'react';
import '@/app/scroll/scroll.css';
import ScrollCard from '@/components/scroll/ScrollCard';
import ScrollMusicPlayer from '@/components/scroll/ScrollMusicPlayer';

const BATCH_SIZE         = 7;
const PREFETCH_THRESHOLD = 2;

export default function ScrollFeed() {
  const [scrolls,       setScrolls]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [isFetching,    setIsFetching]    = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [activeIndex,   setActiveIndex]   = useState(0);
  const [musicPlaying,  setMusicPlaying]  = useState(false);

  // Feed container bounds — measured from actual DOM navbar + bottom nav heights.
  // Applied as inline style on the container so it sits between them exactly.
  const [feedBounds, setFeedBounds] = useState({ top: 0, bottom: 0 });

  const isFetchingRef    = useRef(false);
  const hasMoreRef       = useRef(true);
  const offsetRef        = useRef(0);
  const scrollsLengthRef = useRef(0);
  const containerRef     = useRef(null);

  useEffect(function() {
    scrollsLengthRef.current = scrolls.length;
  }, [scrolls.length]);

  // ── Measure navbar + bottom nav, constrain feed ───────────
  // Sets CSS variable --scroll-card-h so scroll.css .scroll-card uses correct height.
  // Cleaned up on unmount so other pages aren't affected.
  useEffect(function() {
    function measure() {
      const nav    = document.querySelector('nav');
      const botNav = document.querySelector('.bottom-nav');
      const navH   = nav    ? nav.offsetHeight    : 0;
      const botH   = botNav ? botNav.offsetHeight : 0;

      setFeedBounds({ top: navH, bottom: botH });

      // CSS variable used by .scroll-card in scroll.css for snap-correct card height
      document.documentElement.style.setProperty(
        '--scroll-card-h',
        'calc(100dvh - ' + navH + 'px - ' + botH + 'px)'
      );
    }

    measure();
    window.addEventListener('resize', measure);

    return function() {
      window.removeEventListener('resize', measure);
      // Clean up so variable doesn't bleed into other pages
      document.documentElement.style.removeProperty('--scroll-card-h');
    };
  }, []);

  // ── Fetch a batch ─────────────────────────────────────────
  const fetchBatch = useCallback(async function(offset) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);

    try {
      const res = await fetch(
        '/api/scrolls?limit=' + BATCH_SIZE + '&offset=' + offset,
        { cache: 'no-store', credentials: 'include' }
      );
      const data  = await res.json();
      const batch = data.scrolls || [];

      setScrolls(function(prev) {
        return offset === 0 ? batch : prev.concat(batch);
      });
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
      offsetRef.current = offset + batch.length;
    } catch (_) {}

    isFetchingRef.current = false;
    setIsFetching(false);
    setLoading(false);
  }, []);

  useEffect(function() { fetchBatch(0); }, [fetchBatch]);

  // ── Track active card + trigger prefetch ──────────────────
  // Uses container.clientHeight (not window.innerHeight) so index math
  // matches the actual constrained card height.
  useEffect(function() {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      // Use actual container height — matches --scroll-card-h
      const cardH = container.clientHeight || window.innerHeight;
      const idx   = Math.round(container.scrollTop / cardH);
      setActiveIndex(idx);

      const remaining = scrollsLengthRef.current - 1 - idx;
      if (remaining <= PREFETCH_THRESHOLD && hasMoreRef.current && !isFetchingRef.current) {
        fetchBatch(offsetRef.current);
      }
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    return function() { container.removeEventListener('scroll', onScroll); };
  }, [scrolls.length, hasMore, fetchBatch]);

  // ── Loading state ─────────────────────────────────────────
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>Loading scroll…</span>
    </div>
  );

  if (scrolls.length === 0) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '42px' }}>📜</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>No scrolls yet — be the first to create one!</span>
    </div>
  );

  // ── Feed ──────────────────────────────────────────────────
  // Inline style: top/bottom constrain to visible area between navbar + bottom nav.
  // height: 'auto' overrides height: 100dvh from CSS so top+bottom positioning takes effect.
  return (
    <div
      ref={containerRef}
      className="scroll-container"
      style={{
        top:    feedBounds.top,
        bottom: feedBounds.bottom,
        height: 'auto',
      }}
    >
      {scrolls.map(function(s, i) {
        return (
          <ScrollCard
            key={s.id}
            scroll={s}
            isActive={i === activeIndex}
          />
        );
      })}

      {!hasMore && scrolls.length > 0 && (
        <div style={{
          height:          'var(--scroll-card-h, 100dvh)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          background:      '#0a0a0a',
          flexDirection:   'column',
          gap:             12,
        }}>
          <span style={{ fontSize: 36 }}>🎉</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>You've seen everything</span>
        </div>
      )}

      <ScrollMusicPlayer
        playing={musicPlaying}
        onToggle={function() { setMusicPlaying(function(p) { return !p; }); }}
      />
    </div>
  );
}
