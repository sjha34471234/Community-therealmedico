'use client';

// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — replaces Phase 15A placeholder.
// Wires together: ScrollCreatorCanvasWithRef, ScrollCreatorToolbar, ScrollCreatorTabs.
// position: fixed; z-index: 600 — covers navbar + bottomnav for immersive experience.
// Hides site navbar + bottomnav via useEffect on mount, restores on unmount.
// --- WHAT THIS MADE WORK ---
// Full creator wired up. Canvas sized to fit between toolbar and tab bar
// without being clipped by site navbar or bottom nav.
// --- PITFALLS ---
// Must be 'use client' — all touch logic and refs are browser-only.
// Navbar hide/show uses display:none on #page-scroll-container siblings.
// creator.css must be imported here — per-page CSS rule.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 — replaces placeholder from Phase 15A.
// [May 27 2026] FIXED: Canvas clipped by navbar/bottomnav — hide site chrome while creator open.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback, useEffect } from 'react';
import './creator.css';
import { ScrollCreatorCanvasWithRef } from '@/components/scroll/creator/ScrollCreatorCanvas';
import ScrollCreatorToolbar from '@/components/scroll/creator/ScrollCreatorToolbar';
import ScrollCreatorTabs from '@/components/scroll/creator/ScrollCreatorTabs';

export default function ScrollCreatePage() {
  const canvasRef = useRef(null);
  const [shadowBg, setShadowBg] = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic] = useState(null);

  // Hide site navbar + bottom nav while creator is open
  useEffect(() => {
    const navbar = document.querySelector('nav');
    const bottomNav = document.querySelector('.bottom-nav');
    const pageScroll = document.getElementById('page-scroll-container');

    if (navbar) navbar.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    if (pageScroll) pageScroll.style.overflow = 'hidden';

    return () => {
      if (navbar) navbar.style.display = '';
      if (bottomNav) bottomNav.style.display = '';
      if (pageScroll) pageScroll.style.overflow = '';
    };
  }, []);

  const handleAddElement = useCallback((el) => {
    if (canvasRef.current) canvasRef.current.addElement(el);
  }, []);

  const handleBackground = useCallback((bg) => {
    if (canvasRef.current) {
      canvasRef.current.setBackground(bg);
      setShadowBg(bg);
    }
  }, []);

  const handleMusic = useCallback((music) => {
    if (canvasRef.current) {
      canvasRef.current.setMusic(music);
      setShadowMusic(music);
    }
  }, []);

  const getCanvas = useCallback(() => {
    if (canvasRef.current) return canvasRef.current.getCanvas();
    return null;
  }, []);

  return (
    <div className="creator-page">
      <ScrollCreatorToolbar canvasRef={canvasRef} getCanvas={getCanvas} />
      <ScrollCreatorCanvasWithRef
        ref={canvasRef}
        onChange={(canvas) => {
          if (canvas.background) setShadowBg(canvas.background);
          if (canvas.music !== undefined) setShadowMusic(canvas.music);
        }}
      />
      <ScrollCreatorTabs
        onAddElement={handleAddElement}
        onBackground={handleBackground}
        onMusic={handleMusic}
        currentBackground={shadowBg}
        currentMusic={shadowMusic}
      />
    </div>
  );
}
