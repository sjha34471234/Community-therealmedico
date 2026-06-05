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
// onSelectElement fires whenever selectedId changes (tap element, tap canvas, delete,
//   undo, setCanvasState). Sends full element object (or null) to page.js.
//   page.js uses it to populate ScrollCreatorText for live editing.
//   updateElementById exposed via ref — called by page.js handleUpdateElement.
//   Safe for non-positional patches (text/font/color/size/bold/italic/align/letterSpacing)
//   because updateElement only converts x/y/w/h which are absent in those patches.
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
//     Root cause: addElement used displayWRef (device pixels). Fix: BASE coords.
//   BUG 2 — Orientation change wiped all elements.
//     Fix: elements scaled proportionally using old/new CANVAS_BASES ratio.
//   ADD — Full-screen edit mode support: page.js passes larger availableHeight.
// [Jun 05 2026] ADDED: Text element edit-in-place support.
//   onSelectElement prop: callback fired whenever selectedId changes.
//     Sends the full element object from canvas.elements (or null on deselect).
//     useEffect watches [selectedId, onSelectElement] — fires on selection change only,
//     not on every element data update (avoids re-populating text tab mid-keystroke).
//   updateElementById: exposed via useImperativeHandle. Calls updateElement(id, patch).
//     updateElement only converts x/y/w/h — safe for non-positional text patches.
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
  var base    = CANVAS_BASES[orientation] || CANVAS_BASES.portrait;
  var ratio   = base.w / base.h;
  var maxH    = Math.max((availableHeight || 300) - 16, 80);
  var screenW = typeof window !== 'undefined' ? window.innerWidth : 390;
  var maxW    = Math.max(screenW - 32, 120);

  var h = maxH;
  var w = Math.floor(h * ratio);
  if (w > maxW) { w = maxW; h = Math.floor(w / ratio); }

  return { w: w, h: h };
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

function TextElementContent({ props, scale }) {
  var s              = scale || 1;
  var alignment      = props.align || 'center';
  var justifyContent = alignment === 'left'  ? 'flex-start'
                     : alignment === 'right' ? 'flex-end'
                     : 'center';
  return (
    <div style={{
      width:            '100%',
      height:           '100%',
      display:          'flex',
      alignItems:       'center',
      justifyContent:   justifyContent,
      fontFamily:       props.font  || 'Inter, sans-serif',
      fontSize:         (props.size || 24) * s,
      color:            props.color || '#ffffff',
      fontWeight:       props.bold   ? 700 : 400,
      fontStyle:        props.italic ? 'italic' : 'normal',
      textAlign:        alignment,
      letterSpacing:    props.letterSpacing ? (props.letterSpacing * s) + 'px' : 'normal',
      padding:          (4 * s) + 'px ' + (8 * s) + 'px',
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
  var dx = touches[0].clientX - touches[1].clientX;
  var dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef(
  { onChange, availableHeight, orientation, isPreview, onPreviewExit, onSelectElement },
  ref
) {
  var canvasRef          = useRef(null);
  var uidCounter         = useRef(0);
  var audioRef           = useRef(null);
  var displayWRef        = useRef(390);
  var displayHRef        = useRef(680);
  var baseWRef           = useRef(390);
  var baseHRef           = useRef(680);
  var scaleXRef          = useRef(1);
  var scaleYRef          = useRef(1);
  var prevOrientationRef = useRef(orientation || 'portrait');
  var lastAddedIdRef     = useRef(null);

  var isPinchingRef      = useRef(false);
  var wasPinchRef        = useRef(false);
  var pinchStartDistRef  = useRef(null);
  var pinchStartZoomRef  = useRef(1);

  var safeOrientation = orientation || 'portrait';

  function makeId() {
    uidCounter.current += 1;
    return 'el_' + Date.now() + '_' + uidCounter.current;
  }

  const [canvas,       setCanvas]       = useState({ background: { type: 'solid', value: '#1a1a2e' }, elements: [], music: null });
  const [selectedId,   setSelectedId]   = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [zoom,         setZoom]         = useState(1);

  // ── Orientation change: scale elements proportionally ─────
  useEffect(function() {
    if (prevOrientationRef.current === safeOrientation) return;
    var prevOrientation      = prevOrientationRef.current;
    prevOrientationRef.current = safeOrientation;

    var oldBase = CANVAS_BASES[prevOrientation] || CANVAS_BASES.portrait;
    var newBase = CANVAS_BASES[safeOrientation] || CANVAS_BASES.portrait;
    var sX      = newBase.w / oldBase.w;
    var sY      = newBase.h / oldBase.h;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMusicPlaying(false);
    setSelectedId(null);
    lastAddedIdRef.current = null;
    setZoom(1);

    setCanvas(function(prev) {
      var scaledElements = prev.elements.map(function(el) {
        return Object.assign({}, el, {
          x: Math.round(el.x * sX),
          y: Math.round(el.y * sY),
          w: Math.max(60, Math.round(el.w * sX)),
          h: Math.max(30, Math.round(el.h * sY)),
        });
      });
      var next = Object.assign({}, prev, { elements: scaledElements });
      if (onChange) onChange(next);
      return next;
    });
  }, [safeOrientation, onChange]);

  useEffect(function() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMusicPlaying(false);
    if (!canvas.music || !canvas.music.trackUrl) return;
    var audio       = new Audio(canvas.music.trackUrl);
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

  // ── Fire onSelectElement when selection changes ───────────
  // Sends the full element object to page.js so ScrollCreatorText can populate.
  // Keyed on [selectedId, onSelectElement] — fires on selection change only.
  // canvas.elements intentionally omitted from deps: we want element data at the
  // MOMENT of selection, not re-fire on every element update (which would send a
  // new reference every keystroke and cause unnecessary re-renders in page.js).
  // canvas is state → its value in the closure is current at effect run time. ✓
  useEffect(function() {
    if (!onSelectElement) return;
    if (!selectedId) { onSelectElement(null); return; }
    var el = canvas.elements.find(function(e) { return e.id === selectedId; }) || null;
    onSelectElement(el);
  }, [selectedId, onSelectElement]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMusicPlayback = useCallback(function() {
    if (!audioRef.current) return;
    if (musicPlaying) { audioRef.current.pause(); setMusicPlaying(false); }
    else { audioRef.current.play().then(function() { setMusicPlaying(true); }).catch(function() {}); }
  }, [musicPlaying]);

  const updateCanvas = useCallback(function(patch) {
    setCanvas(function(prev) {
      var next = Object.assign({}, prev, patch);
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const addElement = useCallback(function(el) {
    var id  = makeId();
    var bW  = baseWRef.current;
    var bH  = baseHRef.current;
    var newEl = Object.assign({
      id:      id,
      x:       Math.floor(bW * 0.10),
      y:       Math.floor(bH * 0.28),
      w:       Math.floor(bW * 0.80),
      h:       Math.floor(bH * 0.12),
      opacity: 1,
      locked:  false,
    }, el);
    lastAddedIdRef.current = id;
    setCanvas(function(prev) {
      var next = Object.assign({}, prev, { elements: prev.elements.concat([newEl]) });
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  // ── updateElement: convert display → base for x/y/w/h ─────
  // Non-positional fields (text, font, color, size, bold, italic, align,
  // letterSpacing) pass through unchanged — no conversion needed.
  // Called both internally (ScrollCreatorElement drag/resize) and externally
  // via updateElementById ref (ScrollCreatorText live edits).
  const updateElement = useCallback(function(id, patch) {
    var sX = scaleXRef.current;
    var sY = scaleYRef.current;
    var basePatch = Object.assign({}, patch);
    if (basePatch.x !== undefined) basePatch.x = basePatch.x / sX;
    if (basePatch.y !== undefined) basePatch.y = basePatch.y / sY;
    if (basePatch.w !== undefined) basePatch.w = basePatch.w / sX;
    if (basePatch.h !== undefined) basePatch.h = basePatch.h / sY;
    setCanvas(function(prev) {
      var next = Object.assign({}, prev, {
        elements: prev.elements.map(function(el) {
          return el.id === id ? Object.assign({}, el, basePatch) : el;
        }),
      });
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const deleteElement = useCallback(function(id) {
    if (lastAddedIdRef.current === id) lastAddedIdRef.current = null;
    setCanvas(function(prev) {
      var next = Object.assign({}, prev, { elements: prev.elements.filter(function(el) { return el.id !== id; }) });
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback(function(bg)    { updateCanvas({ background: bg }); }, [updateCanvas]);
  const setMusic      = useCallback(function(music) { updateCanvas({ music: music }); },  [updateCanvas]);

  useImperativeHandle(ref, function() {
    return {
      addElement,
      setBackground,
      setMusic,

      getCanvas: function() {
        return Object.assign({}, canvas, {
          size: { w: baseWRef.current, h: baseHRef.current, orientation: safeOrientation },
        });
      },

      stopMusic: function() {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      },

      undo: function() {
        if (!lastAddedIdRef.current) return false;
        var id = lastAddedIdRef.current;
        lastAddedIdRef.current = null;
        setCanvas(function(prev) {
          var next = Object.assign({}, prev, { elements: prev.elements.filter(function(el) { return el.id !== id; }) });
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
        var next = {
          background: state.background || { type: 'solid', value: '#1a1a2e' },
          elements:   state.elements   || [],
          music:      state.music      || null,
        };
        setCanvas(next);
        if (onChange) onChange(next);
      },

      // updateElementById: exposed so page.js can push text tab changes to canvas.
      // Calls updateElement which handles non-positional patches correctly.
      updateElementById: function(id, patch) { updateElement(id, patch); },
    };
  }, [addElement, setBackground, setMusic, updateElement, canvas, safeOrientation, onChange]);

  const handleAreaTouchStart = useCallback(function(e) {
    if (e.touches.length === 2) {
      isPinchingRef.current     = true;
      pinchStartDistRef.current = getTouchDist(e.touches);
      pinchStartZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleAreaTouchMove = useCallback(function(e) {
    if (e.touches.length === 2 && isPinchingRef.current && pinchStartDistRef.current) {
      var dist    = getTouchDist(e.touches);
      var newZoom = Math.max(1, Math.min(2.5, pinchStartZoomRef.current * (dist / pinchStartDistRef.current)));
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
    var cls = e.target.className || '';
    if (
      e.target === canvasRef.current ||
      (typeof cls === 'string' && (cls.includes('creator-canvas__bg') || cls.includes('creator-canvas__elements')))
    ) {
      setSelectedId(null);
    }
  }, [isPreview, onPreviewExit]);

  // ── Calculate display dimensions + update ALL refs ─────────
  var base                       = CANVAS_BASES[safeOrientation] || CANVAS_BASES.portrait;
  var displaySize                = calcDisplaySize(safeOrientation, availableHeight);
  var canvasW                    = displaySize.w;
  var canvasH                    = displaySize.h;

  displayWRef.current = canvasW;
  displayHRef.current = canvasH;
  baseWRef.current    = base.w;
  baseHRef.current    = base.h;
  scaleXRef.current   = canvasW / base.w;
  scaleYRef.current   = canvasH / base.h;

  var bgStyle = getBackgroundStyle(canvas.background);
  var sX      = scaleXRef.current;
  var sY      = scaleYRef.current;

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
                {el.type === 'text' && <TextElementContent props={el} scale={sX} />}
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
                background:   'rgba(255,255,255,0.15)',
                border:       'none',
                borderRadius: '50%',
                width:        28,
                height:       28,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                color:        '#ffffff',
                cursor:       'pointer',
                flexShrink:   0,
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
                color:      '#ffffff',
                fontSize:   11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow:   'hidden',
                textOverflow: 'ellipsis',
                display:    'flex',
                alignItems: 'center',
                gap:        4,
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
