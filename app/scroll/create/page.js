'use client';
// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — wires canvas, toolbar, tabs together.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1.
// [May 27 2026] FIXED: Canvas clipped — hide site chrome via useEffect.
// [May 27 2026] FIXED: Canvas still clipped — calculate exact available
//   height dynamically and pass to canvas as CSS variable.
// [May 28 2026] ADDED: Canvas orientation selector (Portrait/Square/Landscape).
//   Orientation row lives inside toolbarRef so its height is included in the
//   available-height calculation — canvas never gets clipped.
//   Changing orientation resets the canvas (handled in ScrollCreatorCanvas).
// --- END CHANGE LOG ---

import { useRef, useState, useCallback, useEffect } from 'react';
import './creator.css';
import { ScrollCreatorCanvasWithRef } from '@/components/scroll/creator/ScrollCreatorCanvas';
import ScrollCreatorToolbar from '@/components/scroll/creator/ScrollCreatorToolbar';
import ScrollCreatorTabs from '@/components/scroll/creator/ScrollCreatorTabs';

const ORIENTATION_OPTIONS = [
  { key: 'portrait',  label: '9:16', ariaLabel: 'Portrait'  },
  { key: 'square',    label: '1:1',  ariaLabel: 'Square'    },
  { key: 'landscape', label: '16:9', ariaLabel: 'Landscape' },
];

export default function ScrollCreatePage() {
  const canvasRef  = useRef(null);
  const toolbarRef = useRef(null);
  const tabsRef    = useRef(null);

  const [shadowBg, setShadowBg]                 = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic]           = useState(null);
  const [canvasAreaHeight, setCanvasAreaHeight] = useState(null);
  const [orientation, setOrientation]           = useState('portrait');

  // Hide site navbar + bottom nav while creator is open
  useEffect(() => {
    const navbar     = document.querySelector('nav');
    const bottomNav  = document.querySelector('.bottom-nav');
    const pageScroll = document.getElementById('page-scroll-container');
    if (navbar)     navbar.style.display      = 'none';
    if (bottomNav)  bottomNav.style.display   = 'none';
    if (pageScroll) pageScroll.style.overflow = 'hidden';
    return () => {
      if (navbar)     navbar.style.display      = '';
      if (bottomNav)  bottomNav.style.display   = '';
      if (pageScroll) pageScroll.style.overflow = '';
    };
  }, []);

  // Calculate exact available height for canvas area.
  // ⚠️ toolbarRef wraps BOTH the toolbar AND the orientation row —
  //    so both heights are subtracted and canvas is never clipped.
  useEffect(() => {
    function measure() {
      const totalH   = window.innerHeight;
      const toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 80;
      const tabsH    = tabsRef.current    ? tabsRef.current.offsetHeight    : 260;
      const available = totalH - toolbarH - tabsH;
      setCanvasAreaHeight(Math.max(available, 100));
    }
    measure();
    window.addEventListener('resize', measure);
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

      {/* Toolbar + orientation row — both inside toolbarRef for height measurement */}
      <div ref={toolbarRef}>
        <ScrollCreatorToolbar canvasRef={canvasRef} getCanvas={getCanvas} />

        {/* Canvas size / orientation selector */}
        <div className="creator-orientation-row">
          {ORIENTATION_OPTIONS.map(function(opt) {
            const isActive = orientation === opt.key;
            return (
              <button
                key={opt.key}
                className={'creator-orientation-btn' + (isActive ? ' creator-orientation-btn--active' : '')}
                onClick={function() { setOrientation(opt.key); }}
                aria-label={'Set canvas to ' + opt.ariaLabel}
                aria-pressed={isActive}
              >
                <div className={'creator-orientation-icon creator-orientation-icon--' + opt.key} />
                <span className="creator-orientation-label">{opt.label}</span>
              </button>
            );
          })}
          <span className="creator-orientation-hint">Size change clears canvas</span>
        </div>
      </div>

      <ScrollCreatorCanvasWithRef
        ref={canvasRef}
        orientation={orientation}
        availableHeight={canvasAreaHeight}
        onChange={function(canvas) {
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
