'use client';

// ============================================================
// FILE: components/scroll/ScrollFeed.jsx
// PURPOSE: Snap-scroll container — fetches questions, renders ScrollCards
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll — orchestrates the full-screen feed
// DEPENDENCIES: components/scroll/ScrollCard.jsx, ScrollMusicPlayer.jsx
// ⚠️ DO NOT: The scroll container is position:fixed — it covers navbar/bottomnav.
//            This is intentional — Scroll is immersive full-screen.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import '@/app/scroll/scroll.css';
import ScrollCard from '@/components/scroll/ScrollCard';
import ScrollMusicPlayer from '@/components/scroll/ScrollMusicPlayer';

export default function ScrollFeed() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const containerRef = useRef(null);

  useEffect(function() {
    async function load() {
      try {
        const res = await fetch('/api/questions?sort=hot&limit=30', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json();
        setQuestions(data.questions || []);
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
  }, [questions]);

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>Loading scroll…</span>
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '42px' }}>🏥</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>No scrolls yet. Ask a question first!</span>
    </div>
  );

  return (
    <div ref={containerRef} className="scroll-container">
      {questions.map(function(q, i) {
        return (
          <ScrollCard
            key={q.id}
            question={q}
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
// [May 26, 2026] CREATED: ScrollFeed — fetches questions, snap-scroll container,
//   tracks active index, music player toggle.
// --- END CHANGE LOG ---
