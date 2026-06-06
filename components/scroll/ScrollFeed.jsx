'use client';

// ============================================================
// FILE: components/scroll/ScrollFeed.jsx
// PURPOSE: Snap-scroll container — fetches scrolls in batches, renders ScrollCards
// ⚠️ CSS class is 'scroll-container' — matches scroll.css exactly, do not rename
// ⚠️ isFetchingRef is a ref (not state) — prevents stale closure inside scroll handler
// ⚠️ accessTokenRef is a ref (not state) — lets fetchBatch read current token
//    without being in useCallback deps (which would break stable callback).
// ⚠️ scrollsRef is a ref (not state) — lets the view signal effect read the
//    current scroll list without adding scrolls to its dep array.
// ⚠️ useAuthStore is a DEFAULT import from @/store/authStore
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 15: snap-scroll feed with batch loading and prefetch.
// Phase 16: two additions:
//   1. accessTokenRef — passed as Authorization header in feed fetch so the
//      API can return a personalised feed for logged-in users.
//   2. View signal effect — fires POST /api/signals when activeIndex changes,
//      recording that the user watched the card. Fire-and-forget: never blocks
//      the UI. Guests (no token) skip this silently.

// --- WHAT THIS MADE WORK ---
// Logged-in users now receive personalised feed + build a view history.
// View history powers the "already seen" −10,000 penalty in get_scroll_feed().

// --- WHAT THIS BROKE (if anything) ---
// Nothing. Guests still work — no auth header sent, API returns guest feed.

// --- PITFALLS ---
// 1. accessTokenRef + scrollsRef MUST be refs, not state. Adding accessToken
//    or scrolls to useCallback's dep array recreates fetchBatch on every auth
//    change or batch load, triggering extra fetches.
// 2. View signal effect dep array is [activeIndex] only. scrollsRef.current
//    is always up to date via its own useEffect — safe to read inside.
// 3. View signal is fire-and-forget — .catch(function(){}) swallows all
//    errors silently. A failed signal means one missed view record, not
//    a broken feed.
// 4. The signal is fired when the card becomes ACTIVE (user arrives),
//    not when they leave. This is intentional — simple and reliable.

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollFeed
// [May 26, 2026] FIXED: Now fetches /api/scrolls (own table) not /api/questions.
// [May 28, 2026] UPDATED: Phase 15C — batch loading, prefetch, isFetchingRef.
// [Jun 04, 2026] FIXED: Feed constrained between navbar and bottom nav.
//   Root cause: scroll-container used inset:0 (full viewport). Fix: useEffect
//   measures nav + bottom nav heights, sets --scroll-card-h CSS variable on :root,
//   applies top/bottom inline style to container. Cleans up on unmount.
// [Jun 06, 2026] UPDATED: Phase 16 — personalised feed.
//   Added accessTokenRef: Authorization header now sent with feed fetch.
//   Added scrollsRef: view signal effect reads current scrolls safely.
//   Added view signal useEffect: fires POST /api/signals on activeIndex change.
// --- END CHANGE LOG ---

import { useState, useEffect, useRef, useCallback } from 'react';
import '@/app/scroll/scroll.css';
import useAuthStore        from '@/store/authStore';
import ScrollCard          from '@/components/scroll/ScrollCard';
import ScrollMusicPlayer   from '@/components/scroll/ScrollMusicPlayer';

const BATCH_SIZE         = 7;
const PREFETCH_THRESHOLD = 2;

export default function ScrollFeed() {
  const [scrolls,      setScrolls]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [isFetching,   setIsFetching]   = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [feedBounds,   setFeedBounds]   = useState({ top: 0, bottom: 0 });

  // Phase 16: auth token — ref so fetchBatch stays stable (empty deps array).
  // Never put accessToken in useCallback deps — that recreates the callback
  // on every auth state change, causing double-fetches on load.
  const { accessToken } = useAuthStore();
  const accessTokenRef  = useRef(accessToken);
  useEffect(function() { accessTokenRef.current = accessToken; }, [accessToken]);

  const isFetchingRef    = useRef(false);
  const hasMoreRef       = useRef(true);
  const offsetRef        = useRef(0);
  const scrollsLengthRef = useRef(0);
  const containerRef     = useRef(null);

  // Phase 16: scrollsRef — lets view signal effect read current scrolls
  // without adding scrolls to its dep array (which would re-fire on every batch load).
  const scrollsRef = useRef(scrolls);
  useEffect(function() { scrollsRef.current = scrolls; }, [scrolls]);

  useEffect(function() {
    scrollsLengthRef.current = scrolls.length;
  }, [scrolls.length]);

  // ── Measure navbar + bottom nav, constrain feed ───────────
  useEffect(function() {
    function measure() {
      const nav    = document.querySelector('nav');
      const botNav = document.querySelector('.bottom-nav');
      const navH   = nav    ? nav.offsetHeight    : 0;
      const botH   = botNav ? botNav.offsetHeight : 0;
      setFeedBounds({ top: navH, bottom: botH });
      document.documentElement.style.setProperty(
        '--scroll-card-h',
        'calc(100dvh - ' + navH + 'px - ' + botH + 'px)'
      );
    }
    measure();
    window.addEventListener('resize', measure);
    return function() {
      window.removeEventListener('resize', measure);
      document.documentElement.style.removeProperty('--scroll-card-h');
    };
  }, []);

  // ── Fetch a batch ─────────────────────────────────────────
  // accessTokenRef.current read inside — never in deps array.
  // Authorization header enables personalised feed for logged-in users.
  // Guests: no header → API returns community-ranked feed.
  const fetchBatch = useCallback(async function(offset) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);

    try {
      const headers = {};
      if (accessTokenRef.current) {
        headers['Authorization'] = 'Bearer ' + accessTokenRef.current;
      }

      const res = await fetch(
        '/api/scrolls?limit=' + BATCH_SIZE + '&offset=' + offset,
        { cache: 'no-store', credentials: 'include', headers }
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

  // ── Phase 16: fire view signal when active card changes ───
  // scrollsRef.current is always current (synced above).
  // Fire-and-forget — never blocks the UI or re-fetches on error.
  // Guests (accessTokenRef.current is null) silently skip.
  useEffect(function() {
    const scroll = scrollsRef.current[activeIndex];
    if (!scroll || !accessTokenRef.current) return;

    fetch('/api/signals', {
      method:      'POST',
      credentials: 'include',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + accessTokenRef.current,
      },
      body: JSON.stringify({ scroll_id: scroll.id }),
    }).catch(function() {}); // Silently ignore — a missed signal is never critical
  }, [activeIndex]);

  // ── Track active card + trigger prefetch ──────────────────
  useEffect(function() {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
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
          height:         'var(--scroll-card-h, 100dvh)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#0a0a0a',
          flexDirection:  'column',
          gap:            12,
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
