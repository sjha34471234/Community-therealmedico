'use client';

// --- WHY THIS CODE EXISTS ---
// Main canvas for Scroll Creator. Holds all canvas state.
// --- WHAT THIS MADE WORK ---
// Background, elements, music state. Orientation change scales elements.
// Elements stored in BASE coordinate space (CANVAS_BASES). Scaled to display for render.
// --- PITFALLS ---
// Audio must start AFTER user gesture — never on mount.
// Only ONE export: ScrollCreatorCanvasWithRef (forwardRef). No default export.
// COORDINATE SYSTEM — critical:
//   All element x/y/w/h are stored in BASE coordinates (CANVAS_BASES dimensions).
//   Portrait base: 390×680. Square: 390×390. Landscape: 640×360.
//   Canvas renders at display size (smaller on most devices, e.g. 220×384 on iPad portrait).
//   Before passing coords to ScrollCreatorElement, multiply by scaleX/scaleY.
//   ScrollCreatorElement returns updated coords in DISPLAY space via onUpdate.
//   updateElement divides by scaleX/scaleY to store back in BASE space.
//   getCanvas() returns size.w/h = BASE dimensions. Feed uses (el.x / size.w) * 100%.
//   This ensures scrolls look identical on all screen sizes.
// scaleXRef/scaleYRef/baseWRef/baseHRef are updated every render (before JSX return).
// displayWRef/displayHRef kept for backward compat — no longer used for getCanvas/addElement.
// Orientation change: elements scaled proportionally, background/music preserved.
// CSS transform: scale(zoom) — does NOT change canvas coordinate space.
//   getBoundingClientRect() returns visual size = canvasW * zoom.
//   ScrollCreatorElement divides touch delta by this scale → correct display coords.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// [May 27 2026] FIXED: Removed duplicate default export.
// [May 27 2026] ADDED: Instagram-style music playback on canvas.
// [May 28 2026] ADDED: orientation prop. size in getCanvas().
// [May 29 2026] ADDED: Phase 15D — zoom, isPreview, undo, setCanvasState,
//   text align/letterSpacing, waveform, type/fontSize props to element.
// [May 31 2026] ADDED: type={el.type} fontSize={el.size} to ScrollCreatorElement.
// [Jun 03 2026] FIXED: Three bugs —
//   BUG 1 — Elements appear bunched in top-right corner in feed.
//     Root cause: addElement used displayWRef (device pixels, e.g. 220px iPad) for
//     element coords. getCanvas() stored size.w = displayW (220). Template elements
//     used base coords (390). Feed: (95/220)*100% = 43% instead of (95/390)*100% = 24%.
//     Fix: All elements now use BASE coordinates (CANVAS_BASES). addElement uses
//     baseWRef/baseHRef. getCanvas() stores size.w = base.w (390). Canvas scales
//     elements base→display before passing to ScrollCreatorElement. updateElement
//     converts display→base when storing patches.
//   BUG 2 — Orientation change wiped all elements.
//     Root cause: orientation change effect set elements: [].
//     Fix: Elements scaled proportionally using old/new CANVAS_BASES ratio.
//     Background and music also preserved (no longer reset on orientation change).
//   ADD — Full-screen edit mode support: page.js passes larger availableHeight.
//     Canvas handles it automatically via calcDisplaySize.
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Music, Pause, Play } from 'lucide-react';
import ScrollCreatorElement from './ScrollCreatorElement';

// ── Base coordinate dimensions per orientation ────────────────
// ALL element x/y/w/h are stored in these coordinate spaces.
// Device-independent — ensures consistent rendering on all screens.
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
  const displayWRef        = useRef(390); // kept for backward compat
  const displayHRef        = useRef(680); // kept for backward compat
  const baseWRef           = useRef(390); // BASE canvas width (CANVAS_BASES) — used in addElement
  const baseHRef           = useRef(680); // BASE canvas height — used in addElement
  const scaleXRef          = useRef(1);   // canvasW / base.w — display scale factor X
  const scaleYRef          = useRef(1);   // canvasH / base.h — display scale factor Y
  const prevOrientationRef = useRef(orientation || 'portrait');
  const lastAddedIdRef     = useRef(null);

  const isPinchingRef      = useRef(false);
  const wasPinchRef        = useRef(false);
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

  // ── Orientation change: scale elements proportionally ─────
  // OLD behaviour: wipe elements to []. Background/music also reset.
  // NEW behaviour: scale x/y/w/h using old/new CANVAS_BASES ratio.
  //   Background and music preserved — user keeps their work.
  //   Elements in base coords, so scaling: newX = oldX * (newBase.w / oldBase.w).
  useEffect(function() {
    if (prevOrientationRef.current === safeOrientation) return;
    const prevOrientation    = prevOrientationRef.current;
    prevOrientationRef.current = safeOrientation;

    const oldBase = CANVAS_BASES[prevOrientation] || CANVAS_BASES.portrait;
    const newBase = CANVAS_BASES[safeOrientation] || CANVAS_BASES.portrait;
    const sX      = newBase.w / oldBase.w;
    const sY      = newBase.h / oldBase.h;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMusicPlaying(false);
    setSelectedId(null);
    lastAddedIdRef.current = null;
    setZoom(1);

    setCanvas(function(prev) {
      const scaledElements = prev.elements.map(function(el) {
        return Object.assign({}, el, {
          x: Math.round(el.x * sX),
          y: Math.round(el.y * sY),
          w: Math.max(60, Math.round(el.w * sX)),
          h: Math.max(30, Math.round(el.h * sY)),
        });
      });
      const next = { ...prev, elements: scaledElements }; // preserves background + music
      if (onChange) onChange(next);
      return next;
    });
  }, [safeOrientation, onChange]);

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

  // ── addElement: positions in BASE coordinates ─────────────
  // Uses baseWRef/baseHRef (updated every render) instead of displayWRef.
  // Elements at 10%/28% of base canvas, 80%×12% of base canvas.
  // Stored in base coords → device-independent → renders correctly everywhere.
  const addElement = useCallback(function(el) {
    const id  = makeId();
    const bW  = baseWRef.current;
    const bH  = baseHRef.current;
    const newEl = {
      id,
      x:       Math.floor(bW * 0.10),
      y:       Math.floor(bH * 0.28),
      w:       Math.floor(bW * 0.80),
      h:       Math.floor(bH * 0.12),
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

  // ── updateElement: convert display → base for x/y/w/h ─────
  // ScrollCreatorElement returns coordinates in DISPLAY pixel space (it received
  // scaled coords). We divide by scale factors to store back in BASE space.
  // Non-positional fields (opacity, locked, size, font, color, etc.) pass through.
  const updateElement = useCallback(function(id, patch) {
    const sX = scaleXRef.current;
    const sY = scaleYRef.current;
    const basePatch = Object.assign({}, patch);
    if (basePatch.x !== undefined) basePatch.x = basePatch.x / sX;
    if (basePatch.y !== undefined) basePatch.y = basePatch.y / sY;
    if (basePatch.w !== undefined) basePatch.w = basePatch.w / sX;
    if (basePatch.h !== undefined) basePatch.h = basePatch.h / sY;
    setCanvas(function(prev) {
      const next = { ...prev, elements: prev.elements.map(function(el) { return el.id === id ? { ...el, ...basePatch } : el; }) };
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

  useImperativeHandle(ref, function() {
    return {
      addElement,
      setBackground,
      setMusic,

      // getCanvas: returns BASE dimensions in size — device-independent.
      // Feed uses (el.x / size.w) * 100% for positioning.
      // With size.w = base.w (390 portrait), this is correct on all screens.
      getCanvas: function() {
        return {
          ...canvas,
          size: { w: baseWRef.current, h: baseHRef.current, orientation: safeOrientation },
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

      // setCanvasState: elements should be in BASE coordinates.
      // Templates use base coords. New drafts use base coords (getCanvas returns base).
      // Old drafts (pre Jun 3 2026) used display coords — elements may appear slightly
      // offset after restore. Acceptable one-time migration side-effect.
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

  // ── Calculate display dimensions + update ALL refs ─────────
  // Must happen before JSX return so refs are current when JSX evaluates.
  const base                     = CANVAS_BASES[safeOrientation] || CANVAS_BASES.portrait;
  const { w: canvasW, h: canvasH } = calcDisplaySize(safeOrientation, availableHeight);

  displayWRef.current = canvasW;          // kept for backward compat
  displayHRef.current = canvasH;          // kept for backward compat
  baseWRef.current    = base.w;           // used in addElement
  baseHRef.current    = base.h;           // used in addElement
  scaleXRef.current   = canvasW / base.w; // used in updateElement + JSX scaling
  scaleYRef.current   = canvasH / base.h; // used in updateElement + JSX scaling

  const bgStyle = getBackgroundStyle(canvas.background);

  // Pre-compute scale for JSX (avoid repeated ref access in .map())
  const sX = scaleXRef.current;
  const sY = scaleYRef.current;

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
        <div className="creator-canvas__bg" style={bgStyle} />

        <div className="creator-canvas__elements">
          {canvas.elements.map(function(el) {
            // Scale from BASE coordinates → display pixels for rendering.
            // ScrollCreatorElement returns onUpdate patches in display pixels.
            // updateElement converts them back to base coords for storage.
            return (
              <ScrollCreatorElement
                key={el.id}
                id={el.id}
                x={el.x * sX} y={el.y * sY} w={el.w * sX} h={el.h * sY}
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
