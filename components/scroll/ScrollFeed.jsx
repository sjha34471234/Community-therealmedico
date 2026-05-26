'use client';

// ============================================================
// FILE: components/scroll/ScrollFeed.jsx
// PURPOSE: Snap-scroll container — fetches scrolls, renders ScrollCards
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll — orchestrates the full-screen feed
// DEPENDENCIES: components/scroll/ScrollCard.jsx, ScrollMusicPlayer.jsx
// ⚠️ Fetches from /api/scrolls — NOT /api/questions (separate table)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import '@/app/scroll/scroll.css';
import ScrollCard from '@/components/scroll/ScrollCard';
import ScrollMusicPlayer from '@/components/scroll/ScrollMusicPlayer';

export default function ScrollFeed() {
  const [scrolls, setScrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const containerRef = useRef(null);

  useEffect(function() {
    async function load() {
      try {
        const res = await fetch('/api/scrolls', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json();
        setScrolls(data.scrolls || []);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(function() {
    const container = containerRef.current;
    if (!container) return;
    function onScroll() {
      const idx = Math.round(container.scrollTop / window.innerHeight);
      setActiveIndex(idx);
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    return function() { container.removeEventListener('scroll', onScroll); };
  }, [scrolls]);

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
// --- END CHANGE LOG ---
