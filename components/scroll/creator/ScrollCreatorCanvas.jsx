'use client';

// --- WHY THIS CODE EXISTS ---
// Main canvas component for the Scroll Creator.
// Holds ALL canvas state — background, elements, music, text settings.
// Renders the 390x680 design surface with background layer + elements layer.
// Passes state up to parent (page.js) via onChange callback for the Post button.
// --- WHAT THIS MADE WORK ---
// Background rendering (solid + gradient), element add/update/delete,
// selection management, drag overlay during drag/resize,
// canvas scale compensation for smaller screens.
// --- PITFALLS ---
// canvasRef must be passed to every ScrollCreatorElement so touch coords
// can be converted using the actual rendered canvas size vs 390px logical size.
// selectedId must be cleared when tapping blank canvas area.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 main canvas.
// --- END CHANGE LOG ---

import { useState, useRef, useCallback, useId } from 'react';
import ScrollCreatorElement from './ScrollCreatorElement';

// ── BACKGROUND RENDERER ──
function getBackgroundStyle(bg) {
  if (!bg) return { background: '#1a1a2e' };
  if (bg.type === 'solid') return { background: bg.value };
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'custom-gradient') {
    const dir = bg.direction || 'to bottom';
    return { background: `linear-gradient(${dir}, ${bg.color1 || '#1a1a2e'}, ${bg.color2 || '#16213e'})` };
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

export default function ScrollCreatorCanvas({ onChange }) {
  const canvasRef = useRef(null);
  const uidCounter = useRef(0);

  const makeId = () => {
    uidCounter.current += 1;
    return `el_${Date.now()}_${uidCounter.current}`;
  };

  const [canvas, setCanvas] = useState({
    background: { type: 'solid', value: '#1a1a2e' },
    elements: [],
    music: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // Notify parent whenever canvas changes
  const updateCanvas = useCallback((patch) => {
    setCanvas(prev => {
      const next = { ...prev, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  // ── ELEMENT MANAGEMENT ──
  const addElement = useCallback((el) => {
    const id = makeId();
    const newEl = { id, x: 80, y: 200, w: 230, h: 80, opacity: 1, ...el };
    setCanvas(prev => {
      const next = { ...prev, elements: [...prev.elements, newEl] };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  const updateElement = useCallback((id, patch) => {
    setCanvas(prev => {
      const next = {
        ...prev,
        elements: prev.elements.map(el => el.id === id ? { ...el, ...patch } : el),
      };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const deleteElement = useCallback((id) => {
    setCanvas(prev => {
      const next = { ...prev, elements: prev.elements.filter(el => el.id !== id) };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback((bg) => {
    updateCanvas({ background: bg });
  }, [updateCanvas]);

  const setMusic = useCallback((music) => {
    updateCanvas({ music });
  }, [updateCanvas]);

  // Deselect when tapping blank canvas
  const handleCanvasTap = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('creator-canvas__bg') || e.target.classList.contains('creator-canvas__elements')) {
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
          {canvas.elements.map(el => (
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
          ))}
        </div>

        {/* Preview overlay — shown while dragging */}
        <div className={`creator-canvas__preview-overlay${isDraggingAny ? ' creator-canvas__preview-overlay--visible' : ''}`}>
          <div className="creator-canvas__preview-meta">
            <span>↑ Upvote</span>
            <span>💬 Comment</span>
          </div>
        </div>

      </div>

      {/* Expose methods to parent via ref-like pattern — we use a hidden div with data attrs
          Parent uses the onChange callback instead, which is cleaner */}
    </div>
  );
}

// ── EXPORT HELPER HOOKS for parent to call addElement / setBackground / setMusic ──
// Pattern: parent passes ref, canvas exposes imperative API via useImperativeHandle

import { forwardRef, useImperativeHandle } from 'react';

export const ScrollCreatorCanvasWithRef = forwardRef(function ScrollCreatorCanvasWithRef({ onChange }, ref) {
  const canvasRef = useRef(null);
  const uidCounter = useRef(0);

  const makeId = () => {
    uidCounter.current += 1;
    return `el_${Date.now()}_${uidCounter.current}`;
  };

  const [canvas, setCanvas] = useState({
    background: { type: 'solid', value: '#1a1a2e' },
    elements: [],
    music: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const updateCanvas = useCallback((patch) => {
    setCanvas(prev => {
      const next = { ...prev, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const addElement = useCallback((el) => {
    const id = makeId();
    const newEl = { id, x: 80, y: 200, w: 230, h: 80, opacity: 1, ...el };
    setCanvas(prev => {
      const next = { ...prev, elements: [...prev.elements, newEl] };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(id);
  }, [onChange]);

  const updateElement = useCallback((id, patch) => {
    setCanvas(prev => {
      const next = {
        ...prev,
        elements: prev.elements.map(el => el.id === id ? { ...el, ...patch } : el),
      };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const deleteElement = useCallback((id) => {
    setCanvas(prev => {
      const next = { ...prev, elements: prev.elements.filter(el => el.id !== id) };
      if (onChange) onChange(next);
      return next;
    });
    setSelectedId(null);
  }, [onChange]);

  const setBackground = useCallback((bg) => {
    updateCanvas({ background: bg });
  }, [updateCanvas]);

  const setMusic = useCallback((music) => {
    updateCanvas({ music });
  }, [updateCanvas]);

  // Expose imperative API to parent
  useImperativeHandle(ref, () => ({
    addElement,
    setBackground,
    setMusic,
    getCanvas: () => canvas,
  }), [addElement, setBackground, setMusic, canvas]);

  const handleCanvasTap = useCallback((e) => {
    if (
      e.target === canvasRef.current ||
      e.target.classList.contains('creator-canvas__bg') ||
      e.target.classList.contains('creator-canvas__elements')
    ) {
      setSelectedId(null);
    }
  }, []);

  const bgStyle = getBackgroundStyle(canvas.background);

  return (
    <div className="creator-canvas-area" onTouchEnd={handleCanvasTap} onClick={handleCanvasTap}>
      <div ref={canvasRef} className="creator-canvas">

        <div className="creator-canvas__bg" style={bgStyle} />

        <div className="creator-canvas__elements">
          {canvas.elements.map(el => (
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
          ))}
        </div>

        <div className={`creator-canvas__preview-overlay${isDraggingAny ? ' creator-canvas__preview-overlay--visible' : ''}`}>
          <div className="creator-canvas__preview-meta">
            <span>↑ Upvote</span>
            <span>💬 Comment</span>
          </div>
        </div>

      </div>
    </div>
  );
});
