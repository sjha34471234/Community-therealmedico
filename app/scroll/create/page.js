'use client';

// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — wires canvas, toolbar, tabs together.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1.
// [May 27 2026] FIXED: Canvas clipped — hide site chrome via useEffect.
// [May 27 2026] FIXED: Canvas still clipped — calculate exact available
//   height dynamically and pass to canvas as CSS variable.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback, useEffect } from 'react';
import './creator.css';
import { ScrollCreatorCanvasWithRef } from '@/components/scroll/creator/ScrollCreatorCanvas';
import ScrollCreatorToolbar from '@/components/scroll/creator/ScrollCreatorToolbar';
import ScrollCreatorTabs from '@/components/scroll/creator/ScrollCreatorTabs';

export default function ScrollCreatePage() {
  const canvasRef = useRef(null);
  const toolbarRef = useRef(null);
  const tabsRef = useRef(null);
  const [shadowBg, setShadowBg] = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic] = useState(null);
  const [canvasAreaHeight, setCanvasAreaHeight] = useState(null);

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

  // Calculate exact available height for canvas area
  useEffect(() => {
    function measure() {
      const totalH = window.innerHeight;
      const toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 52;
      const tabsH = tabsRef.current ? tabsRef.current.offsetHeight : 260;
      const available = totalH - toolbarH - tabsH;
      setCanvasAreaHeight(Math.max(available, 120));
    }
    measure();
    window.addEventListener('resize', measure);
    // Re-measure after a short delay to catch any layout shifts
    const t = setTimeout(measure, 300);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
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
      <div ref={toolbarRef}>
        <ScrollCreatorToolbar canvasRef={canvasRef} getCanvas={getCanvas} />
      </div>

      <ScrollCreatorCanvasWithRef
        ref={canvasRef}
        availableHeight={canvasAreaHeight}
        onChange={(canvas) => {
          if (canvas.background) setShadowBg(canvas.background);
          if (canvas.music !== undefined) setShadowMusic(canvas.music);
        }}
      />

      <div ref={tabsRef}>
        <ScrollCreatorTabs
          onAddElement={handleAddElement}
          onBackground={handleBackground}
          onMusic={handleMusic}
          currentBackground={shadowBg}
          currentMusic={shadowMusic}
        />
      </div>
    </div>
  );
}
