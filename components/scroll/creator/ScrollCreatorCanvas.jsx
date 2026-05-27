'use client';

// --- WHY THIS CODE EXISTS ---
// Main canvas component for the Scroll Creator.
// Holds ALL canvas state — background, elements, music.
// Exposes addElement, setBackground, setMusic, getCanvas via useImperativeHandle
// so the parent page can call them from tab callbacks.
// --- WHAT THIS MADE WORK ---
// Background rendering (solid + gradient), element add/update/delete,
// selection management, canvas scale compensation for smaller screens.
// --- PITFALLS ---
// Only ONE export — ScrollCreatorCanvasWithRef (forwardRef).
// The original file had a duplicate default export + forwardRef export
// which caused a React hooks crash that broke the entire /scroll route.
// canvasRef passed to every ScrollCreatorElement so touch coords can be
// converted using actual rendered size vs 390px logical size.
// selectedId cleared when tapping blank canvas area.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// [May 27 2026] FIXED: Removed duplicate default export — only forwardRef
//   export remains. Duplicate was causing React hooks crash on /scroll route.
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ScrollCreatorElement from './ScrollCreatorElement';

// ── BACKGROUND RENDERER ──
function getBackgroundStyle(bg) {
  if (!bg) return { background: '#1a1a2e' };
  if (bg.type === 'solid') return { background: bg.value };
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'custom-gradient') {
    const dir = bg.direction || 'to bottom';
    if (dir === 'radial') {
      return { background: 'radial-gradient(circle at center, ' + (bg.color1 || '#1a1a2e') + ', ' + (bg.color2 || '#16213e') + ')' };
    }
    return { background: 'linear-gradient(' + dir + ', ' + (bg.color1 || '#1a1a2e') + ', ' + (bg.color2 || '#16213e') + ')' };
  }
  return { background: '#1a1a2e' };
}

// ── TEXT ELEMENT RENDERER ──
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

// ── ICON ELEMENT RENDERER ──
function IconElementContent({ props }) {
  return (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: props.svg || '' }}
    />
  );
}

// ── MAIN CANVAS — forwardRef so parent can call addElement / setBackground / setMusic ──
export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef({ onChange }, ref) {
  const canvasRef = useRef(null);
  const uidCounter = useRef(0);

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

  const updateCanvas = useCallback(function updateCanvas(patch) {
    setCanvas(function(prev) {
      const next = { ...prev, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const addElement = useCallback(function addElement(el) {
    const id = makeId();
    const newEl = { id, x: 80, y: 200, w: 230, h: 80, opacity: 1, ...el };
    setCanvas(function(prev) {
      const next = { ...prev, elements: [...prev.elements, newEl] };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  const updateElement = useCallback(function updateElement(id, patch) {
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

  const deleteElement = useCallback(function deleteElement(id) {
    setCanvas(function(prev) {
      const next = { ...prev, elements: prev.elements.filter(function(el) { return el.id !== id; }) };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback(function setBackground(bg) {
    updateCanvas({ background: bg });
  }, [updateCanvas]);

  const setMusic = useCallback(function setMusic(music) {
    updateCanvas({ music });
  }, [updateCanvas]);

  // Expose imperative API to parent page
  useImperativeHandle(ref, function() {
    return {
      addElement,
      setBackground,
      setMusic,
      getCanvas: function() { return canvas; },
    };
  }, [addElement, setBackground, setMusic, canvas]);

  // Deselect when tapping blank canvas area
  const handleCanvasTap = useCallback(function handleCanvasTap(e) {
    const cls = e.target.className || '';
    if (
      e.target === canvasRef.current ||
      (typeof cls === 'string' && (cls.includes('creator-canvas__bg') || cls.includes('creator-canvas__elements')))
    ) {
      setSelectedId(null);
    }
  }, []);

  const bgStyle = getBackgroundStyle(canvas.background);

  return (
    <div className="creator-canvas-area" onTouchEnd={handleCanvasTap} onClick={handleCanvasTap}>
      <div ref={canvasRef} className="creator-canvas">

        {/* Background layer */}
        <div className="creator-canvas__bg" style={bgStyle} />

        {/* Elements layer */}
        <div className="creator-canvas__elements">
          {canvas.elements.map(function renderEl(el) {
            return (
              <ScrollCreatorElement
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                w={el.w}
                h={el.h}
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

        {/* Preview overlay — shown while dragging */}
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
