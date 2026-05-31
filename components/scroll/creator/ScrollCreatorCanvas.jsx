'use client';

// --- WHY THIS CODE EXISTS ---
// Main canvas for Scroll Creator. Holds all canvas state.
// --- WHAT THIS MADE WORK ---
// Background, elements, music state. Music plays after user selects track.
// Music bar overlays bottom of canvas. Music stops on post/navigate.
// --- PITFALLS ---
// Audio must start AFTER user gesture — never on mount.
// Only ONE export: ScrollCreatorCanvasWithRef (forwardRef). No default export.
// displayWRef/displayHRef store BASE display size (without zoom) for getCanvas().
// Orientation change resets canvas via prevOrientationRef guard (skips on mount).
// CSS transform: scale(zoom) on canvas div — does NOT change coordinate space.
//   getBoundingClientRect() returns visual size = canvasW * zoom.
//   ScrollCreatorElement divides touch delta by this scale → correct coordinates.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// [May 27 2026] FIXED: Removed duplicate default export.
// [May 27 2026] ADDED: Instagram-style music playback on canvas.
// [May 28 2026] ADDED: orientation prop (portrait/square/landscape). size in getCanvas().
// [May 29 2026] ADDED: Phase 15D —
//   zoom state — pinch-to-zoom on canvas area (1x to 2.5x).
//   isPreview prop + onPreviewExit prop — hides editor chrome, tap to exit.
//   undo() — removes last added element. canUndo() checks if undo available.
//   setCanvasState(state) — restores a full canvas state (for draft restore).
//   TextElementContent updated — el.align (textAlign) + el.letterSpacing.
//   Music waveform animation — animated bars shown in music bar when playing.
//   All three above exposed via useImperativeHandle.
//   lastAddedIdRef cleared in deleteElement to prevent ghost undo.
//   canvasW/canvasH/zoom/isPreview passed to each ScrollCreatorElement.
// [May 31 2026] ADDED: type={el.type} and fontSize={el.size} passed to
//   ScrollCreatorElement. Required for two features in ScrollCreatorElement:
//   1. Pinch-to-resize also scales font size (type='text' + fontSize required).
//   2. A− / A+ font size controls in controls panel (type='text' required).
//   Without these props, both features silently degrade — element still renders,
//   controls panel still shows, but font size controls are hidden.
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Music, Pause, Play } from 'lucide-react';
import ScrollCreatorElement from './ScrollCreatorElement';

// ── Base coordinate dimensions per orientation ────────────────
const CANVAS_BASES = {
  portrait:  { w: 390, h: 680 },
  square:    { w: 390, h: 390 },
  landscape: { w: 640, h: 360 },
};

function calcDisplaySize(orientation, availableHeight) {
  const base    = CANVAS_BASES[orientation] || CANVAS_BASES.portrait;
  const ratio   = base.w / base.h;
  const maxH    = Math.max((availableHeight || 300) - 16, 80);
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const maxW    = Math.max(screenW - 32, 120);

  let h = maxH;
  let w = Math.floor(h * ratio);
  if (w > maxW) { w = maxW; h = Math.floor(w / ratio); }

  return { w, h };
}

function getBackgroundStyle(bg) {
  if (!bg) return { background: '#1a1a2e' };
  if (bg.type === 'solid')    return { background: bg.value };
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'custom-gradient') {
    if (bg.direction === 'radial') {
      return { background: 'radial-gradient(circle at center, ' + (bg.color1 || '#1a1a2e') + ', ' + (bg.color2 || '#16213e') + ')' };
    }
    return { background: 'linear-gradient(' + (bg.direction || 'to bottom') + ', ' + (bg.color1 || '#1a1a2e') + ', ' + (bg.color2 || '#16213e') + ')' };
  }
  return { background: '#1a1a2e' };
}

// ── Text element renderer — supports align + letterSpacing ────
function TextElementContent({ props }) {
  const alignment      = props.align || 'center';
  const justifyContent = alignment === 'left'  ? 'flex-start'
                       : alignment === 'right' ? 'flex-end'
                       : 'center';
  return (
    <div style={{
      width:            '100%',
      height:           '100%',
      display:          'flex',
      alignItems:       'center',
      justifyContent,
      fontFamily:       props.font  || 'Inter, sans-serif',
      fontSize:         props.size  || 24,
      color:            props.color || '#ffffff',
      fontWeight:       props.bold   ? 700 : 400,
      fontStyle:        props.italic ? 'italic' : 'normal',
      textAlign:        alignment,
      letterSpacing:    props.letterSpacing ? props.letterSpacing + 'px' : 'normal',
      padding:          '4px 8px',
      wordBreak:        'break-word',
      lineHeight:       1.3,
      userSelect:       'none',
      WebkitUserSelect: 'none',
    }}>
      {props.text || ''}
    </div>
  );
}

function IconElementContent({ props }) {
  return (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: props.svg || '' }}
    />
  );
}

// ── Distance between two touch points ─────────────────────────
function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef(
  { onChange, availableHeight, orientation, isPreview, onPreviewExit },
  ref
) {
  const canvasRef          = useRef(null);
  const uidCounter         = useRef(0);
  const audioRef           = useRef(null);
  const displayWRef        = useRef(390); // BASE display size (no zoom) — used in getCanvas()
  const displayHRef        = useRef(680);
  const prevOrientationRef = useRef(orientation || 'portrait');
  const lastAddedIdRef     = useRef(null); // for undo

  // ── Pinch zoom refs ───────────────────────────────────────
  const isPinchingRef      = useRef(false);
  const wasPinchRef        = useRef(false);  // prevents deselect after pinch
  const pinchStartDistRef  = useRef(null);
  const pinchStartZoomRef  = useRef(1);

  const safeOrientation = orientation || 'portrait';

  function makeId() {
    uidCounter.current += 1;
    return 'el_' + Date.now() + '_' + uidCounter.current;
  }

  const [canvas,       setCanvas]       = useState({ background: { type: 'solid', value: '#1a1a2e' }, elements: [], music: null });
  const [selectedId,   setSelectedId]   = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [zoom,         setZoom]         = useState(1);

  // ── Reset canvas when orientation changes (not on mount) ──
  useEffect(function() {
    if (prevOrientationRef.current === safeOrientation) return;
    prevOrientationRef.current = safeOrientation;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMusicPlaying(false);
    setSelectedId(null);
    lastAddedIdRef.current = null;
    setZoom(1);
    const next = { background: { type: 'solid', value: '#1a1a2e' }, elements: [], music: null };
    setCanvas(next);
    if (onChange) onChange(next);
  }, [safeOrientation, onChange]);

  // ── Start/stop music when canvas.music changes ────────────
  useEffect(function() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMusicPlaying(false);
    if (!canvas.music || !canvas.music.trackUrl) return;
    const audio       = new Audio(canvas.music.trackUrl);
    audio.loop        = true;
    audio.volume      = 0.5;
    audio.currentTime = canvas.music.startSec || 0;
    audioRef.current  = audio;
    audio.play().then(function() { setMusicPlaying(true); }).catch(function() { setMusicPlaying(false); });
    return function() { audio.pause(); audio.currentTime = 0; };
  }, [canvas.music]);

  // ── Stop audio on unmount ─────────────────────────────────
  useEffect(function() {
    return function() { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const toggleMusicPlayback = useCallback(function() {
    if (!audioRef.current) return;
    if (musicPlaying) { audioRef.current.pause(); setMusicPlaying(false); }
    else { audioRef.current.play().then(function() { setMusicPlaying(true); }).catch(function() {}); }
  }, [musicPlaying]);

  const updateCanvas = useCallback(function(patch) {
    setCanvas(function(prev) {
      const next = { ...prev, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const addElement = useCallback(function(el) {
    const id  = makeId();
    const dW  = displayWRef.current;
    const dH  = displayHRef.current;
    const newEl = {
      id,
      x:       Math.floor(dW * 0.10),
      y:       Math.floor(dH * 0.28),
      w:       Math.floor(dW * 0.80),
      h:       Math.floor(dH * 0.12),
      opacity: 1,
      locked:  false,
      ...el,
    };
    lastAddedIdRef.current = id;
    setCanvas(function(prev) {
      const next = { ...prev, elements: [...prev.elements, newEl] };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  const updateElement = useCallback(function(id, patch) {
    setCanvas(function(prev) {
      const next = { ...prev, elements: prev.elements.map(function(el) { return el.id === id ? { ...el, ...patch } : el; }) };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const deleteElement = useCallback(function(id) {
    if (lastAddedIdRef.current === id) lastAddedIdRef.current = null;
    setCanvas(function(prev) {
      const next = { ...prev, elements: prev.elements.filter(function(el) { return el.id !== id; }) };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback(function(bg)    { updateCanvas({ background: bg }); }, [updateCanvas]);
  const setMusic      = useCallback(function(music) { updateCanvas({ music }); },          [updateCanvas]);

  // ── Expose API to parent via ref ──────────────────────────
  useImperativeHandle(ref, function() {
    return {
      addElement,
      setBackground,
      setMusic,

      getCanvas: function() {
        return {
          ...canvas,
          size: { w: displayWRef.current, h: displayHRef.current, orientation: safeOrientation },
        };
      },

      stopMusic: function() {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      },

      undo: function() {
        if (!lastAddedIdRef.current) return false;
        const id = lastAddedIdRef.current;
        lastAddedIdRef.current = null;
        setCanvas(function(prev) {
          const next = { ...prev, elements: prev.elements.filter(function(el) { return el.id !== id; }) };
          if (onChange) onChange(next);
          return next;
        });
        setSelectedId(null);
        return true;
      },

      canUndo: function() { return lastAddedIdRef.current !== null; },

      setCanvasState: function(state) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setMusicPlaying(false);
        setSelectedId(null);
        lastAddedIdRef.current = null;
        const next = {
          background: state.background || { type: 'solid', value: '#1a1a2e' },
          elements:   state.elements   || [],
          music:      state.music      || null,
        };
        setCanvas(next);
        if (onChange) onChange(next);
      },
    };
  }, [addElement, setBackground, setMusic, canvas, safeOrientation, onChange]);

  // ── Canvas area touch handlers — pinch zoom ───────────────
  const handleAreaTouchStart = useCallback(function(e) {
    if (e.touches.length === 2) {
      isPinchingRef.current     = true;
      pinchStartDistRef.current = getTouchDist(e.touches);
      pinchStartZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleAreaTouchMove = useCallback(function(e) {
    if (e.touches.length === 2 && isPinchingRef.current && pinchStartDistRef.current) {
      const dist    = getTouchDist(e.touches);
      const newZoom = Math.max(1, Math.min(2.5, pinchStartZoomRef.current * (dist / pinchStartDistRef.current)));
      setZoom(newZoom);
    }
  }, []);

  const handleAreaTouchEnd = useCallback(function(e) {
    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current     = false;
      pinchStartDistRef.current = null;
      wasPinchRef.current       = true;
      setTimeout(function() { wasPinchRef.current = false; }, 300);
    }
  }, []);

  // ── Canvas area tap — deselect / preview exit ─────────────
  const handleCanvasTap = useCallback(function(e) {
    if (isPreview) { if (onPreviewExit) onPreviewExit(); return; }
    if (wasPinchRef.current) return;
    const cls = e.target.className || '';
    if (
      e.target === canvasRef.current ||
      (typeof cls === 'string' && (cls.includes('creator-canvas__bg') || cls.includes('creator-canvas__elements')))
    ) {
      setSelectedId(null);
    }
  }, [isPreview, onPreviewExit]);

  // ── Calculate display dimensions ──────────────────────────
  const { w: canvasW, h: canvasH } = calcDisplaySize(safeOrientation, availableHeight);
  displayWRef.current = canvasW;
  displayHRef.current = canvasH;

  const bgStyle = getBackgroundStyle(canvas.background);

  return (
    <div
      className={'creator-canvas-area' + (zoom > 1 ? ' creator-canvas-area--zoomed' : '')}
      onTouchStart={handleAreaTouchStart}
      onTouchMove={handleAreaTouchMove}
      onTouchEnd={handleAreaTouchEnd}
      onClick={handleCanvasTap}
      style={availableHeight ? { height: availableHeight } : {}}
    >
      <div
        ref={canvasRef}
        className="creator-canvas"
        style={{
          width:           canvasW,
          height:          canvasH,
          transform:       zoom !== 1 ? 'scale(' + zoom + ')' : undefined,
          transformOrigin: 'center center',
        }}
      >
        {/* Background */}
        <div className="creator-canvas__bg" style={bgStyle} />

        {/* Elements */}
        <div className="creator-canvas__elements">
          {canvas.elements.map(function(el) {
            return (
              <ScrollCreatorElement
                key={el.id}
                id={el.id}
                x={el.x} y={el.y} w={el.w} h={el.h}
                opacity={el.opacity}
                locked={el.locked || false}
                selected={!isPreview && selectedId === el.id}
                isPreview={isPreview || false}
                type={el.type}
                fontSize={el.size}
                onSelect={setSelectedId}
                onUpdate={updateElement}
                onDelete={deleteElement}
                canvasRef={canvasRef}
                canvasW={canvasW}
                canvasH={canvasH}
              >
                {el.type === 'text' && <TextElementContent props={el} />}
                {el.type === 'icon' && <IconElementContent props={el} />}
              </ScrollCreatorElement>
            );
          })}
        </div>

        {/* Music bar */}
        {canvas.music && (
          <div style={{
            position:   'absolute',
            bottom:     0, left: 0, right: 0,
            zIndex:     5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
            padding:    '20px 12px 10px',
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            pointerEvents: 'all',
          }}>
            <button
              onClick={function(e) { e.stopPropagation(); if (!isPreview) toggleMusicPlayback(); }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '50%',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', cursor: 'pointer', flexShrink: 0,
              }}
              aria-label={musicPlaying ? 'Pause music' : 'Play music'}
            >
              {musicPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>

            {musicPlaying && (
              <div className="creator-music-waveform">
                <span />
                <span style={{ animationDelay: '0.15s' }} />
                <span style={{ animationDelay: '0.30s' }} />
                <span style={{ animationDelay: '0.45s' }} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#ffffff', fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Music size={10} />
                {canvas.music.trackName}
              </div>
            </div>
          </div>
        )}

        {/* Preview overlay hint */}
        <div className={'creator-canvas__preview-overlay' + (isPreview ? ' creator-canvas__preview-overlay--visible' : '')}>
          <div className="creator-canvas__preview-meta">
            <span>↑ Upvote</span>
            <span>💬 Comment</span>
          </div>
        </div>
      </div>
    </div>
  );
});
