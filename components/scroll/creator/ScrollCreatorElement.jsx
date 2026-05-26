'use client';

// --- WHY THIS CODE EXISTS ---
// Generic draggable + resizable wrapper for every element on the scroll canvas.
// Handles touch-first drag and resize — pure math, no external libraries.
// Used by both text blocks and animated icons.
// --- WHAT THIS MADE WORK ---
// Touch drag (move element around canvas), bottom-right resize handle,
// selection state, opacity panel with slider and delete button.
// --- PITFALLS ---
// Must use onTouchStart/Move/End — mouse events don't work reliably on iPad.
// touch-action: none in CSS is mandatory or the browser intercepts scroll.
// getBoundingClientRect used to convert touch coords to canvas-relative coords.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 drag/resize element wrapper.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

export default function ScrollCreatorElement({
  id,
  x, y, w, h, opacity,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  canvasRef,
  children,
}) {
  const elRef = useRef(null);
  const dragStart = useRef(null);
  const resizeStart = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // ── DRAG ──
  const handleDragTouchStart = useCallback((e) => {
    e.stopPropagation();
    onSelect(id);
    const touch = e.touches[0];
    dragStart.current = { touchX: touch.clientX, touchY: touch.clientY, elX: x, elY: y };
    setIsDragging(true);
  }, [id, x, y, onSelect]);

  const handleDragTouchMove = useCallback((e) => {
    if (!dragStart.current) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.touchX;
    const dy = touch.clientY - dragStart.current.touchY;

    // Get canvas scale factor (canvas may be scaled down on small screens)
    let scale = 1;
    if (canvasRef && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      scale = rect.width / 390;
    }

    const newX = Math.max(0, Math.min(390 - w, dragStart.current.elX + dx / scale));
    const newY = Math.max(0, Math.min(680 - h, dragStart.current.elY + dy / scale));
    onUpdate(id, { x: newX, y: newY });
  }, [id, w, h, onUpdate, canvasRef]);

  const handleDragTouchEnd = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  // ── RESIZE ──
  const handleResizeTouchStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    resizeStart.current = { touchX: touch.clientX, touchY: touch.clientY, elW: w, elH: h };
    setIsResizing(true);
  }, [w, h]);

  const handleResizeTouchMove = useCallback((e) => {
    if (!resizeStart.current) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const dx = touch.clientX - resizeStart.current.touchX;
    const dy = touch.clientY - resizeStart.current.touchY;

    let scale = 1;
    if (canvasRef && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      scale = rect.width / 390;
    }

    const newW = Math.max(60, Math.min(390 - x, resizeStart.current.elW + dx / scale));
    const newH = Math.max(40, Math.min(680 - y, resizeStart.current.elH + dy / scale));
    onUpdate(id, { w: newW, h: newH });
  }, [id, x, y, onUpdate, canvasRef]);

  const handleResizeTouchEnd = useCallback(() => {
    resizeStart.current = null;
    setIsResizing(false);
  }, []);

  const opacityPct = Math.round((opacity ?? 1) * 100);

  return (
    <div
      ref={elRef}
      className={`creator-element${selected ? ' creator-element--selected' : ''}`}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: opacity ?? 1,
        pointerEvents: 'all',
      }}
      onTouchStart={handleDragTouchStart}
      onTouchMove={handleDragTouchMove}
      onTouchEnd={handleDragTouchEnd}
    >
      {/* Opacity + delete panel — only when selected */}
      {selected && (
        <div className="creator-opacity-panel">
          <label>Opacity</label>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={opacityPct}
            onChange={(e) => onUpdate(id, { opacity: Number(e.target.value) / 100 })}
          />
          <span>{opacityPct}%</span>
          <button
            className="creator-opacity-panel__delete"
            onTouchEnd={(e) => { e.stopPropagation(); onDelete(id); }}
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            aria-label="Delete element"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Element content */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
        {children}
      </div>

      {/* Resize handle — bottom right */}
      {selected && (
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
