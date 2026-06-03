'use client';

// --- WHY THIS CODE EXISTS ---
// Generic draggable + resizable wrapper for every element on the scroll canvas.
// Handles touch-first drag, resize, pinch-to-resize, font size controls.
// --- WHAT THIS MADE WORK ---
// Touch drag, bottom-right resize handle, pinch resize, selection state,
// controls panel (lock + opacity + font size + delete) above selected element.
// --- PITFALLS ---
// Must use onTouchStart/Move/End — mouse events don't work on iPad.
// touch-action: none on .creator-element is mandatory but NOT inherited by SVG children.
//   SVG elements default to touch-action: auto. Browser may fire touchcancel after
//   the first touchmove and take over the gesture → icon moves one block then stops.
//   Fix: creator.css sets touch-action: none on .creator-element svg and svg *.
//   Do NOT set pointer-events: none on SVG — that breaks icon tap/selection entirely.
// Controls panel stopPropagation must be TARGETED, not blanket.
//   Blanket stopPropagation on the panel div blocks drag-from-panel-area behaviour,
//   which is how users naturally grab selected elements near their controls.
//   Fix: only the range input gets stopPropagation — prevents slider from also moving element.
//   Buttons only need onTouchEnd stopPropagation (already in place) — brief taps
//   set dragStart momentarily but no touchmove fires, so no actual movement.
// getBoundingClientRect returns visual size incl. zoom. scale = rect.width / baseW.
//   Dividing touch delta by scale converts screen pixels → canvas coordinate pixels.
// Drag bounds: allow up to half the element off-canvas on any side.
//   Keeps elements reachable while eliminating hard stop at canvas border.
// onTouchCancel must clear drag/pinch state to prevent stuck drag after browser takeover.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 drag/resize element wrapper.
// [May 29 2026] ADDED: Phase 15D — locked, isPreview, canvasW/canvasH,
//   pinch guard, lock toggle, controls panel redesign.
// [May 31 2026] FIXED + ADDED (round 1):
//   FIX — Element stopped at canvas edge: bounds → [-w/2, baseW-w/2].
//   FIX — Pinch did nothing: added pinchStart ref + two-finger handler.
//   ADD — A-/A+ font size controls in controls panel for text elements.
//   ADD — onTouchCancel clears drag state.
//   ADD — SVG touch-action fix in CSS. Added touchAction: none to inner content div.
//   ADD — Controls panel div-level stopPropagation. ← REVERTED in round 2 (too broad).
//   ADD — pointer-events: none on SVG in CSS. ← REVERTED in round 2 (broke icon tap).
// [May 31 2026] FIXED (round 2):
//   REVERTED pointer-events: none on SVG — was making icons untappable/undraggable.
//     touch-action: none on SVG (in CSS) is sufficient without pointer-events: none.
//   REVERTED blanket controls panel stopPropagation — was preventing drag from panel
//     area, which is the natural grab point for selected elements near their controls.
//   TARGETED FIX: stopPropagation moved to range input only (onTouchStart + onTouchMove).
//     Slider no longer moves the element. Panel background still passes drag events through.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import { Trash2, Lock } from 'lucide-react';

// Pure helper — defined outside component (stable, no re-creation on each render).
// Returns screen-pixel distance between two touch points.
// Only the RATIO (current / start) is used — canvas zoom cancels out.
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
  type,      // 'text' or 'icon' — from canvas el.type. Controls font size UI + pinch.
  fontSize,  // current font size (el.size) — from canvas. Required for A-/A+ controls.
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
  // canvas rect.width = canvasW * zoom → rect.width / baseW = zoom factor.
  // Dividing touch delta by scale → canvas-pixel delta (zoom-compensated).
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
      // Second finger — cancel drag, start pinch on selected element.
      dragStart.current = null;
      setIsDragging(false);
      if (selected && !locked) {
        e.stopPropagation(); // prevent canvas area from treating this as canvas zoom
        pinchStart.current = {
          distance:   getPinchDistance(e.touches),
          elW:        w,
          elH:        h,
          elFontSize: fontSize || null,
        };
      }
      // Not selected: falls through → canvas area handles as canvas zoom.
      return;
    }

    if (e.touches.length > 2) return;

    // Single finger: start drag.
    if (locked) { onSelect(id); return; } // locked: select only, no drag
    e.stopPropagation();
    onSelect(id);
    const touch = e.touches[0];
    dragStart.current = { touchX: touch.clientX, touchY: touch.clientY, elX: x, elY: y };
    setIsDragging(true);
  }, [isPreview, locked, selected, id, x, y, w, h, fontSize, onSelect]);

  // ── DRAG + PINCH — TOUCH MOVE ─────────────────────────────
  const handleDragTouchMove = useCallback(function(e) {

    // Pinch resize (two fingers).
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

    // Single touch drag.
    if (!dragStart.current) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const dx    = touch.clientX - dragStart.current.touchX;
    const dy    = touch.clientY - dragStart.current.touchY;
    const scale = getScale();
    // Allow up to half the element off any canvas edge — eliminates hard border stop.
    const newX  = Math.max(-w / 2, Math.min(baseW - w / 2, dragStart.current.elX + dx / scale));
    const newY  = Math.max(-h / 2, Math.min(baseH - h / 2, dragStart.current.elY + dy / scale));
    onUpdate(id, { x: newX, y: newY });

  }, [id, w, h, baseW, baseH, type, onUpdate, getScale]);

  // ── DRAG + PINCH — TOUCH END ──────────────────────────────
  const handleDragTouchEnd = useCallback(function(e) {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) { dragStart.current = null; setIsDragging(false); }
  }, []);

  // ── TOUCH CANCEL — clears all drag/pinch state ────────────
  // Browser fires touchcancel when it takes over the gesture (system UI, scroll, etc.).
  // Without this, dragStart stays set and the next tap immediately starts a phantom drag.
  const handleDragTouchCancel = useCallback(function() {
    dragStart.current  = null;
    pinchStart.current = null;
    setIsDragging(false);
  }, []);

  // ── RESIZE HANDLE (bottom-right corner drag) ──────────────
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
      onTouchCancel={handleDragTouchCancel}
    >

      {/* ── Controls panel ──────────────────────────────────
          NO blanket stopPropagation on this div — touching the panel background
          should still bubble to the element wrapper so the element can be dragged
          from the panel area (the natural grab point for selected elements).
          Only the range input gets targeted stopPropagation (see below).
          ─────────────────────────────────────────────────── */}
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

          {/* Opacity — range input gets targeted stopPropagation.
              Without this, sliding the range also fires the element wrapper's drag
              handlers (touchmove bubbles up), moving the element unintentionally.
              stopPropagation on the INPUT (not the panel div) preserves drag-from-panel. */}
          <label>Opacity</label>
          <input
            type="range"
            min={10} max={100} step={5}
            value={opacityPct}
            onTouchStart={function(e) { e.stopPropagation(); }}
            onTouchMove={function(e)  { e.stopPropagation(); }}
            onChange={function(e) { onUpdate(id, { opacity: Number(e.target.value) / 100 }); }}
          />
          <span className="creator-controls-panel__pct">{opacityPct}%</span>

          {/* Font size controls — text elements only */}
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

      {/* ── Element content ──────────────────────────────────
          touchAction: none here ensures the inner div itself also declares
          no native touch handling (touch-action not inherited from parent).
          This is belt-and-suspenders alongside the CSS SVG rule.
          ─────────────────────────────────────────────────── */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4, touchAction: 'none' }}>
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
