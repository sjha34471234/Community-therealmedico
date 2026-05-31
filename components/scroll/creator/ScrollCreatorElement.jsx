'use client';

// --- WHY THIS CODE EXISTS ---
// Generic draggable + resizable wrapper for every element on the scroll canvas.
// Handles touch-first drag, resize, and pinch-to-resize — pure math, no libraries.
// --- WHAT THIS MADE WORK ---
// Touch drag, bottom-right resize handle, pinch resize, selection state,
// controls panel (lock + opacity + font size + delete) above selected element.
// --- PITFALLS ---
// Must use onTouchStart/Move/End — mouse events don't work on iPad.
// touch-action: none in CSS is mandatory.
// getBoundingClientRect converts touch coords to canvas-relative coords.
// When CSS transform: scale(zoom) is applied to canvas, getBoundingClientRect
// returns visual dimensions including zoom. scale = rect.width / canvasW = zoom.
// Dividing touch delta by scale auto-compensates — no special zoom math needed.
// canvasW / canvasH props replace hardcoded 390/680 for correct bounds at
// all orientations (portrait 390x680, square 390x390, landscape 640x360).
// Pinch distance ratio is dimensionless — canvas zoom does NOT affect it.
// Drag bounds use half-element overflow: element can go half off-canvas on any edge.
// Font size controls only render when type='text' AND fontSize prop is provided.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 drag/resize element wrapper.
// [May 29 2026] ADDED: Phase 15D —
//   locked prop, isPreview prop, canvasW/canvasH props.
//   Pinch guard (touches > 1 = early return). Lock toggle in controls panel.
//   Controls panel renamed creator-opacity-panel → creator-controls-panel.
// [May 31 2026] FIXED + ADDED:
//   FIX 1 — Element stops at canvas edge during drag.
//     Bounds changed from [0, baseW-w] → [-w/2, baseW-w/2].
//     Element can go half off-canvas on any edge. Stays reachable.
//   FIX 2 — Pinch gesture did nothing.
//     Added pinchStart ref + getPinchDistance() helper.
//     Two-finger on SELECTED element: intercepts pinch, scales w/h.
//     If type='text' and fontSize provided: also scales el.size.
//     Two-finger on UNSELECTED element: falls through to canvas zoom.
//   ADD — A− / size / A+ font size controls in controls panel.
//     Only rendered when type='text'. Uses fontSize prop for current value.
//     A− decreases by 2 (min 8). A+ increases by 2 (max 96).
//     Size display updates live as user taps (canvas re-renders with new el.size).
//     Requires ScrollCreatorCanvas to pass type={el.type} fontSize={el.size}.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import { Trash2, Lock } from 'lucide-react';

// Pure helper — outside component to avoid re-creation on every render.
// Returns screen-pixel distance between two touch points.
// Only the RATIO (current / start) is used — so canvas zoom cancels out.
function getPinchDistance(touches) {
  var dx = touches[1].clientX - touches[0].clientX;
  var dy = touches[1].clientY - touches[0].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function ScrollCreatorElement({
  id,
  x, y, w, h, opacity,
  locked,
  selected,
  isPreview,
  type,      // 'text' or 'icon' — passed from canvas as el.type.
             // Controls whether font size UI renders and pinch scales el.size.
  fontSize,  // current font size (el.size) — passed from canvas as el.size.
             // Required for A-/A+ display and pinch font-size scaling.
  onSelect,
  onUpdate,
  onDelete,
  canvasRef,
  canvasW,
  canvasH,
  children,
}) {
  const baseW = canvasW || 390;
  const baseH = canvasH || 680;

  const dragStart   = useRef(null); // { touchX, touchY, elX, elY }
  const resizeStart = useRef(null); // { touchX, touchY, elW, elH }
  const pinchStart  = useRef(null); // { distance, elW, elH, elFontSize }

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // ── SCALE HELPER ──────────────────────────────────────────
  const getScale = useCallback(function() {
    if (canvasRef && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      return rect.width / baseW;
    }
    return 1;
  }, [canvasRef, baseW]);

  // ── DRAG + PINCH — TOUCH START ────────────────────────────
  const handleDragTouchStart = useCallback(function(e) {
    if (isPreview) return;

    if (e.touches.length === 2) {
      dragStart.current = null;
      setIsDragging(false);
      if (selected && !locked) {
        e.stopPropagation();
        pinchStart.current = {
          distance:   getPinchDistance(e.touches),
          elW:        w,
          elH:        h,
          elFontSize: fontSize || null,
        };
      }
      return;
    }

    if (e.touches.length > 2) return;

    if (locked) { onSelect(id); return; }
    e.stopPropagation();
    onSelect(id);
    const touch = e.touches[0];
    dragStart.current = { touchX: touch.clientX, touchY: touch.clientY, elX: x, elY: y };
    setIsDragging(true);
  }, [isPreview, locked, selected, id, x, y, w, h, fontSize, onSelect]);

  // ── DRAG + PINCH — TOUCH MOVE ─────────────────────────────
  const handleDragTouchMove = useCallback(function(e) {

    if (e.touches.length >= 2) {
      if (!pinchStart.current) return;
      e.preventDefault();
      e.stopPropagation();
      const dist  = getPinchDistance(e.touches);
      const ratio = dist / pinchStart.current.distance;
      const newW  = Math.max(60, pinchStart.current.elW * ratio);
      const newH  = Math.max(40, pinchStart.current.elH * ratio);
      const updates = { w: newW, h: newH };
      if (type === 'text' && pinchStart.current.elFontSize) {
        updates.size = Math.max(8, Math.min(96, Math.round(pinchStart.current.elFontSize * ratio)));
      }
      onUpdate(id, updates);
      return;
    }

    if (!dragStart.current) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const dx    = touch.clientX - dragStart.current.touchX;
    const dy    = touch.clientY - dragStart.current.touchY;
    const scale = getScale();
    const newX  = Math.max(-w / 2, Math.min(baseW - w / 2, dragStart.current.elX + dx / scale));
    const newY  = Math.max(-h / 2, Math.min(baseH - h / 2, dragStart.current.elY + dy / scale));
    onUpdate(id, { x: newX, y: newY });

  }, [id, w, h, baseW, baseH, type, onUpdate, getScale]);

  // ── DRAG + PINCH — TOUCH END ──────────────────────────────
  const handleDragTouchEnd = useCallback(function(e) {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) { dragStart.current = null; setIsDragging(false); }
  }, []);

  // ── RESIZE HANDLE ─────────────────────────────────────────
  const handleResizeTouchStart = useCallback(function(e) {
    if (isPreview || locked) return;
    if (e.touches.length > 1) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    resizeStart.current = { touchX: touch.clientX, touchY: touch.clientY, elW: w, elH: h };
    setIsResizing(true);
  }, [isPreview, locked, w, h]);

  const handleResizeTouchMove = useCallback(function(e) {
    if (!resizeStart.current) return;
    if (e.touches.length > 1) { resizeStart.current = null; setIsResizing(false); return; }
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const dx    = touch.clientX - resizeStart.current.touchX;
    const dy    = touch.clientY - resizeStart.current.touchY;
    const scale = getScale();
    const newW  = Math.max(60, resizeStart.current.elW + dx / scale);
    const newH  = Math.max(40, resizeStart.current.elH + dy / scale);
    onUpdate(id, { w: newW, h: newH });
  }, [id, onUpdate, getScale]);

  const handleResizeTouchEnd = useCallback(function() {
    resizeStart.current = null;
    setIsResizing(false);
  }, []);

  // ── FONT SIZE STEP HANDLERS ───────────────────────────────
  const handleFontDecrease = useCallback(function(e) {
    e.stopPropagation();
    onUpdate(id, { size: Math.max(8, (fontSize || 24) - 2) });
  }, [id, fontSize, onUpdate]);

  const handleFontIncrease = useCallback(function(e) {
    e.stopPropagation();
    onUpdate(id, { size: Math.min(96, (fontSize || 24) + 2) });
  }, [id, fontSize, onUpdate]);

  // ── RENDER ────────────────────────────────────────────────
  const opacityPct   = Math.round((opacity ?? 1) * 100);
  const showControls = selected && !isPreview;
  const isText       = type === 'text';

  return (
    <div
      className={
        'creator-element' +
        (selected && !isPreview ? ' creator-element--selected' : '') +
        (locked ? ' creator-element--locked' : '')
      }
      style={{
        left:          x,
        top:           y,
        width:         w,
        height:        h,
        opacity:       opacity ?? 1,
        pointerEvents: 'all',
      }}
      onTouchStart={handleDragTouchStart}
      onTouchMove={handleDragTouchMove}
      onTouchEnd={handleDragTouchEnd}
    >

      {/* ── Controls panel — floats above selected element ── */}
      {showControls && (
        <div className="creator-controls-panel">

          {/* Lock toggle */}
          <button
            className={'creator-controls-panel__icon-btn creator-controls-panel__lock-btn' + (locked ? ' creator-controls-panel__lock-btn--active' : '')}
            onTouchEnd={function(e) { e.stopPropagation(); onUpdate(id, { locked: !locked }); }}
            onClick={function(e)    { e.stopPropagation(); onUpdate(id, { locked: !locked }); }}
            aria-label={locked ? 'Unlock element' : 'Lock element'}
          >
            <Lock size={13} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* Opacity */}
          <label>Opacity</label>
          <input
            type="range"
            min={10} max={100} step={5}
            value={opacityPct}
            onChange={function(e) { onUpdate(id, { opacity: Number(e.target.value) / 100 }); }}
          />
          <span className="creator-controls-panel__pct">{opacityPct}%</span>

          {/* Font size — text elements only.
              Divider + A- button + size number + A+ button.
              Size display updates live: canvas re-renders new el.size
              which flows back in as the fontSize prop. */}
          {isText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

              <button
                className="creator-controls-panel__icon-btn"
                style={{ fontSize: 11, fontWeight: 800, padding: '2px 5px', minWidth: 24, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, lineHeight: 1 }}
                onTouchEnd={handleFontDecrease}
                onClick={handleFontDecrease}
                aria-label="Decrease font size"
              >
                A-
              </button>

              <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, minWidth: 22, textAlign: 'center', flexShrink: 0 }}>
                {fontSize || 24}
              </span>

              <button
                className="creator-controls-panel__icon-btn"
                style={{ fontSize: 11, fontWeight: 800, padding: '2px 5px', minWidth: 24, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, lineHeight: 1 }}
                onTouchEnd={handleFontIncrease}
                onClick={handleFontIncrease}
                aria-label="Increase font size"
              >
                A+
              </button>

            </div>
          )}

          {/* Delete */}
          <button
            className="creator-controls-panel__icon-btn creator-controls-panel__delete-btn"
            onTouchEnd={function(e) { e.stopPropagation(); onDelete(id); }}
            onClick={function(e)    { e.stopPropagation(); onDelete(id); }}
            aria-label="Delete element"
          >
            <Trash2 size={13} />
          </button>

        </div>
      )}

      {/* ── Element content ── */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
        {children}
      </div>

      {/* ── Lock overlay icon (locked + selected) ── */}
      {locked && selected && !isPreview && (
        <div className="creator-element__lock-overlay">
          <Lock size={10} />
        </div>
      )}

      {/* ── Resize handle — bottom right corner ── */}
      {selected && !locked && !isPreview && (
        <div
          className="creator-element__resize-handle"
          onTouchStart={handleResizeTouchStart}
          onTouchMove={handleResizeTouchMove}
          onTouchEnd={handleResizeTouchEnd}
        />
      )}

    </div>
  );
}
