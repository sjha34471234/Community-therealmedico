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
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// [May 27 2026] FIXED: Removed duplicate default export.
// [May 27 2026] ADDED: Instagram-style music playback on canvas after selection.
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Music, Pause, Play } from 'lucide-react';
import ScrollCreatorElement from './ScrollCreatorElement';

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

export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef({ onChange, availableHeight }, ref) {
  const canvasRef = useRef(null);
  const uidCounter = useRef(0);
  const audioRef = useRef(null);

  function makeId() {
    uidCounter.current += 1;
    return 'el_' + Date.now() + '_' + uidCounter.current;
  }

  const [canvas, setCanvas] = useState({
    background: { type: 'solid', value: '#1a1a2e' },
    elements: [],
    music: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // ── Start/stop music when canvas.music changes ──
  useEffect(function() {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMusicPlaying(false);

    if (!canvas.music || !canvas.music.trackUrl) return;

    const audio = new Audio(canvas.music.trackUrl);
    audio.loop = true;
    audio.volume = 0.5;
    audio.currentTime = canvas.music.startSec || 0;
    audioRef.current = audio;

    // Auto-play — will work since user just tapped "Use this track" (gesture)
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
    const id = makeId();
    const newEl = { id, x: 80, y: 200, w: 230, h: 80, opacity: 1, ...el };
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
      getCanvas: function() { return canvas; },
      stopMusic: function() {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      },
    };
  }, [addElement, setBackground, setMusic, canvas]);

  const handleCanvasTap = useCallback(function(e) {
    const cls = e.target.className || '';
    if (
      e.target === canvasRef.current ||
      (typeof cls === 'string' && (cls.includes('creator-canvas__bg') || cls.includes('creator-canvas__elements')))
    ) {
      setSelectedId(null);
    }
  }, []);

  const bgStyle = getBackgroundStyle(canvas.background);

  // Calculate canvas size from available height — maintain ~390:680 portrait ratio
const ratio = 390 / 680;
const canvasH = availableHeight ? Math.floor(availableHeight - 16) : 340;
const canvasW = Math.floor(canvasH * ratio);

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

        {/* Music bar — shows when music is selected */}
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
