'use client';

// ============================================================
// FILE: components/scroll/ScrollFeed.jsx
// PURPOSE: Snap-scroll container — fetches scrolls in batches, renders ScrollCards
// LAST CHANGED: May 28, 2026
// WHY IT EXISTS: Phase 15 Scroll — orchestrates the full-screen feed
// DEPENDENCIES: components/scroll/ScrollCard.jsx, ScrollMusicPlayer.jsx
// ⚠️ Fetches from /api/scrolls — NOT /api/questions (separate table)
// ⚠️ CSS class is 'scroll-container' — matches scroll.css exactly, do not rename
// ⚠️ isFetchingRef is a ref (not state) — prevents stale closure inside scroll handler
// ⚠️ ScrollMusicPlayer must stay rendered — controls global music UI
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import '@/app/scroll/scroll.css';
import ScrollCard from '@/components/scroll/ScrollCard';
import ScrollMusicPlayer from '@/components/scroll/ScrollMusicPlayer';

const BATCH_SIZE = 7;
// Fetch next batch when this many cards remain before end
const PREFETCH_THRESHOLD = 2;

export default function ScrollFeed() {
  const [scrolls, setScrolls]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isFetching, setIsFetching]   = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // Refs to avoid stale closures inside scroll handler
  const isFetchingRef    = useRef(false);
  const hasMoreRef       = useRef(true);
  const offsetRef        = useRef(0);
  const scrollsLengthRef = useRef(0);
  const containerRef     = useRef(null);

  // Keep scrollsLengthRef in sync whenever scrolls array changes
  useEffect(function() {
    scrollsLengthRef.current = scrolls.length;
  }, [scrolls.length]);

  // ── Fetch a batch ───────────────────────────────────────────
  const fetchBatch = useCallback(async function(offset) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);

    try {
      const res = await fetch(
        '/api/scrolls?limit=' + BATCH_SIZE + '&offset=' + offset,
        { cache: 'no-store', credentials: 'include' }
      );
      const data = await res.json();
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

  // Initial load
  useEffect(function() {
    fetchBatch(0);
  }, [fetchBatch]);

  // ── Track active card + trigger prefetch ────────────────────
  // Effect re-registers on scrolls.length / hasMore change so handler
  // always reads fresh values — no stale closure needed for those two.
  useEffect(function() {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      const idx = Math.round(container.scrollTop / window.innerHeight);
      setActiveIndex(idx);

      // Prefetch when PREFETCH_THRESHOLD cards remain before end
      const remaining = scrollsLengthRef.current - 1 - idx;
      if (remaining <= PREFETCH_THRESHOLD && hasMoreRef.current && !isFetchingRef.current) {
        fetchBatch(offsetRef.current);
      }
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    return function() { container.removeEventListener('scroll', onScroll); };
  }, [scrolls.length, hasMore, fetchBatch]);

  // ── Loading state ───────────────────────────────────────────
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>Loading scroll…</span>
    </div>
  );

  // ── Empty state ─────────────────────────────────────────────
  if (scrolls.length === 0) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '42px' }}>📜</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>No scrolls yet — be the first to create one!</span>
    </div>
  );

  // ── Feed ────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="scroll-container">
      {scrolls.map(function(s, i) {
        return (
          <ScrollCard
            key={s.id}
            scroll={s}
            isActive={i === activeIndex}
          />
        );
      })}

      {/* End-of-feed indicator — only shows after all batches loaded */}
      {!hasMore && scrolls.length > 0 && (
        <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', flexDirection: 'column', gap: 12 }}>
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

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollFeed
// [May 26, 2026] FIXED: Now fetches /api/scrolls (own table) not /api/questions.
//   prop renamed question → scroll passed to ScrollCard.
// [May 28, 2026] UPDATED: Phase 15C — batch loading.
//   Loads BATCH_SIZE=7 scrolls at a time using ?offset=N&limit=7.
//   Prefetches next batch when PREFETCH_THRESHOLD=2 cards remain before end.
//   isFetchingRef (ref not state) prevents double-fetches from rapid scroll events.
//   ScrollMusicPlayer and scroll-container class preserved exactly.
// --- END CHANGE LOG ---
