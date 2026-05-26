'use client';

// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — replaces Phase 15A placeholder.
// Wires together: ScrollCreatorCanvasWithRef, ScrollCreatorToolbar, ScrollCreatorTabs.
// Uses useRef + useImperativeHandle pattern so Toolbar can call getCanvas()
// and Tabs can call addElement / setBackground / setMusic on the canvas.
// position: fixed; z-index: 600 — covers navbar + bottomnav for immersive experience.
// --- WHAT THIS MADE WORK ---
// Full creator: canvas, toolbar (post button), text tab, background tab,
// icons tab, music tab — all wired together in one page shell.
// --- PITFALLS ---
// Must be 'use client' — all touch logic and refs are browser-only.
// canvasRef.current exposes { addElement, setBackground, setMusic, getCanvas }
// via useImperativeHandle in ScrollCreatorCanvasWithRef.
// creator.css must be imported here — per-page CSS rule.
// Auth check happens inside ScrollCreatorToolbar on Post tap — not here.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 — replaces placeholder from Phase 15A.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import './creator.css';
import { ScrollCreatorCanvasWithRef } from '@/components/scroll/creator/ScrollCreatorCanvas';
import ScrollCreatorToolbar from '@/components/scroll/creator/ScrollCreatorToolbar';
import ScrollCreatorTabs from '@/components/scroll/creator/ScrollCreatorTabs';

export default function ScrollCreatePage() {
  const canvasRef = useRef(null);

  // Mirror canvas state here so Tabs get currentBackground + currentMusic
  // for selected-state highlighting — canvas is the source of truth,
  // this is display-only shadow state.
  const [shadowBg, setShadowBg] = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic] = useState(null);

  // ── CALLBACKS passed to Tabs ──

  const handleAddElement = useCallback((el) => {
    if (canvasRef.current) {
      canvasRef.current.addElement(el);
    }
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

  // ── getCanvas passed to Toolbar for Post flow ──
  const getCanvas = useCallback(() => {
    if (canvasRef.current) {
      return canvasRef.current.getCanvas();
    }
    return null;
  }, []);

  return (
    <div className="creator-page">

      {/* ── TOP TOOLBAR — back button + Post button ── */}
      <ScrollCreatorToolbar
        canvasRef={canvasRef}
        getCanvas={getCanvas}
      />

      {/* ── CANVAS — the 390×680 design surface ── */}
      <ScrollCreatorCanvasWithRef
        ref={canvasRef}
        onChange={(canvas) => {
          // Keep shadow state in sync for tab selected states
          if (canvas.background) setShadowBg(canvas.background);
          if (canvas.music !== undefined) setShadowMusic(canvas.music);
        }}
      />

      {/* ── BOTTOM TABS — Text / Background / Icons / Music ── */}
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
