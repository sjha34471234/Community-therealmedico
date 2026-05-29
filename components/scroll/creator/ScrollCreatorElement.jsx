'use client';

// --- WHY THIS CODE EXISTS ---
// Generic draggable + resizable wrapper for every element on the scroll canvas.
// Handles touch-first drag and resize — pure math, no external libraries.
// --- WHAT THIS MADE WORK ---
// Touch drag, bottom-right resize handle, selection state, controls panel
// (opacity + lock + delete) above selected element.
// --- PITFALLS ---
// Must use onTouchStart/Move/End — mouse events don't work on iPad.
// touch-action: none in CSS is mandatory.
// getBoundingClientRect converts touch coords to canvas-relative coords.
// When CSS transform: scale(zoom) is applied to canvas, getBoundingClientRect
// returns visual dimensions including zoom. scale = rect.width / canvasW = zoom.
// Dividing touch delta by scale auto-compensates — no special zoom math needed.
// canvasW / canvasH props replace hardcoded 390/680 for correct bounds at
// all orientations (portrait 390x680, square 390x390, landscape 640x360).
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 drag/resize element wrapper.
// [May 29 2026] ADDED: Phase 15D —
//   locked prop: disables drag/resize, shows lock overlay icon.
//   isPreview prop: disables all interaction and hides controls.
//   canvasW / canvasH props: correct bounds for all orientations (was hardcoded 390/680).
//   Pinch guard: touch handlers return early if e.touches.length > 1.
//   Lock toggle button added to controls panel.
//   Controls panel renamed from creator-opacity-panel to creator-controls-panel.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import { Trash2, Lock } from 'lucide-react';

export default function ScrollCreatorElement({
  id,
  x, y, w, h, opacity,
  locked,
  selected,
  isPreview,
  onSelect,
  onUpdate,
  onDelete,
  canvasRef,
  canvasW,
  canvasH,
  children,
}) {
  // Use passed-in canvas dimensions, fall back to portrait defaults
  const baseW = canvasW || 390;
  const baseH = canvasH || 680;

  const dragStart  = useRef(null);
  const resizeStart = useRef(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [isResizing,  setIsResizing]  = useState(false);

  // ── SHARED SCALE HELPER ────────────────────────────────────
  // getBoundingClientRect on the canvas div returns visual width = canvasW * zoom.
  // scale = rect.width / canvasW = zoom. Dividing delta by scale converts screen
  // pixels → canvas coordinate pixels automatically.
  const getScale = useCallback(function() {
    if (canvasRef && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      return rect.width / baseW;
    }
    return 1;
  }, [canvasRef, baseW]);

  // ── DRAG ──────────────────────────────────────────────────
  const handleDragTouchStart = useCallback(function(e) {
    if (isPreview) return;
    if (locked) { onSelect(id); return; } // select but don't drag
    if (e.touches.length > 1) return;     // pinch guard
    e.stopPropagation();
    onSelect(id);
    const touch = e.touches[0];
    dragStart.current = { touchX: touch.clientX, touchY: touch.clientY, elX: x, elY: y };
    setIsDragging(true);
  }, [isPreview, locked, id, x, y, onSelect]);

  const handleDragTouchMove = useCallback(function(e) {
    if (!dragStart.current) return;
    if (e.touches.length > 1) {
      // Second finger added — cancel drag
      dragStart.current = null;
      setIsDragging(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const touch  = e.touches[0];
    const dx     = touch.clientX - dragStart.current.touchX;
    const dy     = touch.clientY - dragStart.current.touchY;
    const scale  = getScale();
    const newX   = Math.max(0, Math.min(baseW - w, dragStart.current.elX + dx / scale));
    const newY   = Math.max(0, Math.min(baseH - h, dragStart.current.elY + dy / scale));
    onUpdate(id, { x: newX, y: newY });
  }, [id, w, h, baseW, baseH, onUpdate, getScale]);

  const handleDragTouchEnd = useCallback(function() {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  // ── RESIZE ────────────────────────────────────────────────
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
    if (e.touches.length > 1) {
      resizeStart.current = null;
      setIsResizing(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const touch  = e.touches[0];
    const dx     = touch.clientX - resizeStart.current.touchX;
    const dy     = touch.clientY - resizeStart.current.touchY;
    const scale  = getScale();
    const newW   = Math.max(60,  Math.min(baseW - x, resizeStart.current.elW + dx / scale));
    const newH   = Math.max(40,  Math.min(baseH - y, resizeStart.current.elH + dy / scale));
    onUpdate(id, { w: newW, h: newH });
  }, [id, x, y, baseW, baseH, onUpdate, getScale]);

  const handleResizeTouchEnd = useCallback(function() {
    resizeStart.current = null;
    setIsResizing(false);
  }, []);

  const opacityPct = Math.round((opacity ?? 1) * 100);
  const showControls = selected && !isPreview;

  return (
    <div
      className={
        'creator-element' +
        (selected && !isPreview ? ' creator-element--selected' : '') +
        (locked ? ' creator-element--locked' : '')
      }
      style={{
        left:    x,
        top:     y,
        width:   w,
        height:  h,
        opacity: opacity ?? 1,
        pointerEvents: 'all',
      }}
      onTouchStart={handleDragTouchStart}
      onTouchMove={handleDragTouchMove}
      onTouchEnd={handleDragTouchEnd}
    >
      {/* ── Controls panel — floats above element when selected ── */}
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
            min={10}
            max={100}
            step={5}
            value={opacityPct}
            onChange={function(e) { onUpdate(id, { opacity: Number(e.target.value) / 100 }); }}
          />
          <span className="creator-controls-panel__pct">{opacityPct}%</span>

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

      {/* ── Lock overlay icon (when locked + selected) ── */}
      {locked && selected && !isPreview && (
        <div className="creator-element__lock-overlay">
          <Lock size={10} />
        </div>
      )}

      {/* ── Resize handle — bottom right, hidden when locked or preview ── */}
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
