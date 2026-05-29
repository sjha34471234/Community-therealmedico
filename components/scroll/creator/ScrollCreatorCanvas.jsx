'use client';

// --- WHY THIS CODE EXISTS ---
// Main canvas for Scroll Creator. Holds all canvas state.
// --- WHAT THIS MADE WORK ---
// Background, elements, music state. Music plays on canvas
// immediately after user selects a track (Instagram-style).
// Music bar overlays bottom of canvas showing track name + pause.
// Music stops when user posts or navigates away.
// --- PITFALLS ---
// Audio must start AFTER user gesture — never on mount.
// Audio ref created fresh each time music changes.
// useImperativeHandle exposes addElement/setBackground/setMusic/getCanvas.
// Only ONE export — ScrollCreatorCanvasWithRef. No default export.
// displayWRef + displayHRef updated every render so getCanvas() always
//   captures the current display dimensions at post time.
// Orientation change resets canvas — handled via prevOrientationRef guard
//   so it does NOT fire on mount (avoids double-reset on first render).
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// [May 27 2026] FIXED: Removed duplicate default export.
// [May 27 2026] ADDED: Instagram-style music playback on canvas after selection.
// [May 28 2026] ADDED: orientation prop (portrait/square/landscape).
//   Canvas display dimensions calculated per orientation.
//   getCanvas() now includes size: { w, h, orientation } so the feed
//   can render elements at the exact aspect ratio they were created in.
//   Element default positions are proportional to base dimensions so
//   they land sensibly in all three orientations.
//   Orientation change resets canvas state (elements + music cleared).
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Music, Pause, Play } from 'lucide-react';
import ScrollCreatorElement from './ScrollCreatorElement';

// ── Base coordinate dimensions per orientation ──────────────
// Elements are stored in absolute px within these coordinate spaces.
// The canvas is DISPLAYED smaller (scaled to fit available height/width),
// but getCanvas() stores the DISPLAY dimensions in size.w / size.h
// so ScrollCard can render elements at the exact same proportions.
const CANVAS_BASES = {
  portrait:  { w: 390, h: 680 },
  square:    { w: 390, h: 390 },
  landscape: { w: 640, h: 360 },
};

// ── Calculate display dimensions that fit in available space ─
function calcDisplaySize(orientation, availableHeight) {
  const base   = CANVAS_BASES[orientation] || CANVAS_BASES.portrait;
  const ratio  = base.w / base.h; // width/height ratio
  const maxH   = Math.max((availableHeight || 300) - 16, 80);
  const screenW = (typeof window !== 'undefined' ? window.innerWidth : 390);
  const maxW   = Math.max(screenW - 32, 120);

  let h = maxH;
  let w = Math.floor(h * ratio);

  // If width overflows screen, constrain by width instead
  if (w > maxW) {
    w = maxW;
    h = Math.floor(w / ratio);
  }

  return { w, h };
}

function getBackgroundStyle(bg) {
  if (!bg) return { background: '#1a1a2e' };
  if (bg.type === 'solid') return { background: bg.value };
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
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: props.font || 'Inter, sans-serif',
      fontSize: props.size || 24,
      color: props.color || '#ffffff',
      fontWeight: props.bold ? 700 : 400,
      fontStyle: props.italic ? 'italic' : 'normal',
      textAlign: 'center',
      padding: '4px 8px',
      wordBreak: 'break-word',
      lineHeight: 1.3,
      userSelect: 'none',
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

export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef(
  { onChange, availableHeight, orientation },
  ref
) {
  const canvasRef    = useRef(null);
  const uidCounter   = useRef(0);
  const audioRef     = useRef(null);
  // Refs updated every render so getCanvas() always reads current display size
  const displayWRef  = useRef(390);
  const displayHRef  = useRef(680);
  // Guard: skip reset on mount, only fire on actual orientation CHANGE
  const prevOrientationRef = useRef(orientation || 'portrait');

  const safeOrientation = orientation || 'portrait';

  function makeId() {
    uidCounter.current += 1;
    return 'el_' + Date.now() + '_' + uidCounter.current;
  }

  const [canvas, setCanvas] = useState({
    background: { type: 'solid', value: '#1a1a2e' },
    elements: [],
    music: null,
  });
  const [selectedId, setSelectedId]   = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // ── Reset canvas when orientation changes (not on mount) ──
  useEffect(function() {
    if (prevOrientationRef.current === safeOrientation) return;
    prevOrientationRef.current = safeOrientation;

    // Stop music
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMusicPlaying(false);
    setSelectedId(null);

    // Reset all canvas state
    const next = { background: { type: 'solid', value: '#1a1a2e' }, elements: [], music: null };
    setCanvas(next);
    if (onChange) onChange(next);
  }, [safeOrientation, onChange]);

  // ── Start/stop music when canvas.music changes ────────────
  useEffect(function() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMusicPlaying(false);

    if (!canvas.music || !canvas.music.trackUrl) return;

    const audio = new Audio(canvas.music.trackUrl);
    audio.loop        = true;
    audio.volume      = 0.5;
    audio.currentTime = canvas.music.startSec || 0;
    audioRef.current  = audio;

    audio.play().then(function() {
      setMusicPlaying(true);
    }).catch(function() {
      setMusicPlaying(false);
    });

    return function() {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [canvas.music]);

  // Stop audio on unmount
  useEffect(function() {
    return function() {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusicPlayback = useCallback(function() {
    if (!audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current.play().then(function() {
        setMusicPlaying(true);
      }).catch(function() {});
    }
  }, [musicPlaying]);

  const updateCanvas = useCallback(function(patch) {
    setCanvas(function(prev) {
      const next = { ...prev, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const addElement = useCallback(function(el) {
    const id   = makeId();
    const dW   = displayWRef.current;
    const dH   = displayHRef.current;
    // Default position: proportional to current display dimensions
    const newEl = {
      id,
      x:       Math.floor(dW * 0.10),
      y:       Math.floor(dH * 0.28),
      w:       Math.floor(dW * 0.80),
      h:       Math.floor(dH * 0.12),
      opacity: 1,
      ...el,
    };
    setCanvas(function(prev) {
      const next = { ...prev, elements: [...prev.elements, newEl] };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  const updateElement = useCallback(function(id, patch) {
    setCanvas(function(prev) {
      const next = {
        ...prev,
        elements: prev.elements.map(function(el) {
          return el.id === id ? { ...el, ...patch } : el;
        }),
      };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const deleteElement = useCallback(function(id) {
    setCanvas(function(prev) {
      const next = { ...prev, elements: prev.elements.filter(function(el) { return el.id !== id; }) };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback(function(bg) {
    updateCanvas({ background: bg });
  }, [updateCanvas]);

  const setMusic = useCallback(function(music) {
    updateCanvas({ music });
  }, [updateCanvas]);

  useImperativeHandle(ref, function() {
    return {
      addElement,
      setBackground,
      setMusic,
      // getCanvas includes size so ScrollCard knows exact coordinate space
      getCanvas: function() {
        return {
          ...canvas,
          size: {
            w:           displayWRef.current,
            h:           displayHRef.current,
            orientation: safeOrientation,
          },
        };
      },
      stopMusic: function() {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      },
    };
  }, [addElement, setBackground, setMusic, canvas, safeOrientation]);

  const handleCanvasTap = useCallback(function(e) {
    const cls = e.target.className || '';
    if (
      e.target === canvasRef.current ||
      (typeof cls === 'string' && (cls.includes('creator-canvas__bg') || cls.includes('creator-canvas__elements')))
    ) {
      setSelectedId(null);
    }
  }, []);

  // ── Calculate display dimensions ──────────────────────────
  const { w: canvasW, h: canvasH } = calcDisplaySize(safeOrientation, availableHeight);
  // Keep refs current so getCanvas() is always accurate
  displayWRef.current = canvasW;
  displayHRef.current = canvasH;

  const bgStyle = getBackgroundStyle(canvas.background);

  return (
    <div
      className="creator-canvas-area"
      onTouchEnd={handleCanvasTap}
      onClick={handleCanvasTap}
      style={availableHeight ? { height: availableHeight } : {}}
    >
      <div
        ref={canvasRef}
        className="creator-canvas"
        style={{ width: canvasW, height: canvasH }}
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
                selected={selectedId === el.id}
                onSelect={setSelectedId}
                onUpdate={updateElement}
                onDelete={deleteElement}
                canvasRef={canvasRef}
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
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
            padding: '20px 12px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'all',
          }}>
            <button
              onClick={function(e) { e.stopPropagation(); toggleMusicPlayback(); }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label={musicPlaying ? 'Pause music' : 'Play music'}
            >
              {musicPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Music size={10} />
                {canvas.music.trackName}
              </div>
            </div>
          </div>
        )}

        {/* Preview overlay */}
        <div className="creator-canvas__preview-overlay">
          <div className="creator-canvas__preview-meta">
            <span>↑ Upvote</span>
            <span>💬 Comment</span>
          </div>
        </div>
      </div>
    </div>
  );
});
