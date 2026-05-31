'use client';

// --- WHY THIS CODE EXISTS ---
// Generic draggable + resizable wrapper for every element on the scroll canvas.
// Handles touch-first drag, resize, and pinch-to-resize — pure math, no libraries.
// --- WHAT THIS MADE WORK ---
// Touch drag, bottom-right resize handle, pinch resize, selection state,
// controls panel (opacity + lock + delete) above selected element.
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
// The ratio (current dist / start dist) is scale-invariant.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 drag/resize element wrapper.
// [May 29 2026] ADDED: Phase 15D —
//   locked prop: disables drag/resize, shows lock overlay icon.
//   isPreview prop: disables all interaction and hides controls.
//   canvasW / canvasH props: correct bounds for all orientations.
//   Pinch guard: touch handlers returned early if e.touches.length > 1.
//   Lock toggle button in controls panel.
//   Controls panel renamed creator-opacity-panel → creator-controls-panel.
// [May 31 2026] FIXED: Two bugs —
//
//   BUG 1 — Element stops moving when any edge touches canvas edge.
//   Root cause: drag bounds clamped to [0, baseW-w] and [0, baseH-h].
//     Element's top-left corner couldn't go past 0, and bottom-right
//     couldn't go past canvas edge — so it FROZE at the border.
//   Fix: allow element to go up to half its size off-canvas on any edge.
//     X: Math.max(-w/2, Math.min(baseW - w/2, ...))
//     Y: Math.max(-h/2, Math.min(baseH - h/2, ...))
//     Element must keep at least half itself inside canvas — so it stays
//     selectable and deletable. Full off-canvas would make it unreachable.
//   Also fixed resize: removed baseW/baseH max so element can grow past edge.
//
//   BUG 2 — Pinch gesture does nothing on text/icon elements.
//   Root cause: old pinch guard `if (e.touches.length > 1) return` exited
//     immediately for ALL two-finger touches — even on selected elements.
//     The canvas's zoom handler then consumed the pinch for canvas zoom.
//   Fix: when element IS selected and two fingers land on it:
//     - stopPropagation (prevents canvas zoom from firing)
//     - store pinchStart { distance, elW, elH, elFontSize }
//     - on touchMove: compute ratio = newDist / startDist, scale w and h
//     - if type='text' AND fontSize prop passed: also scales el.size (font size)
//     - if type/fontSize not passed: only w/h scale (graceful fallback, still useful)
//   When element is NOT selected: two-finger touch falls through to canvas zoom (correct).
//
//   CANVAS CHANGE NEEDED FOR FONT SIZE SCALING:
//   In ScrollCreatorCanvas.jsx, wherever <ScrollCreatorElement> is rendered,
//   add these two props to enable font-size scaling during pinch on text:
//     type={el.type}
//     fontSize={el.size}
//   Without these, pinch still resizes the element box (w/h) — just no font scaling.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback } from 'react';
import { Trash2, Lock } from 'lucide-react';

// ── PURE HELPER — defined outside component (stable, no re-creation) ─────────
// Returns pixel distance between two touch points (screen coordinates).
// Only the RATIO (current/start) is ever used — canvas zoom cancels out.
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
  type,      // optional — 'text' or 'icon'. Enables font-size scaling during pinch.
             // Pass el.type from ScrollCreatorCanvas to activate.
  fontSize,  // optional — current font size value (el.size). Required for text pinch-scale.
             // Pass el.size from ScrollCreatorCanvas to activate.
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

  const [isDragging,  setIsDragging]  = useState(false);
  const [isResizing,  setIsResizing]  = useState(false);

  // ── SCALE HELPER ──────────────────────────────────────────
  // canvas getBoundingClientRect().width includes CSS zoom.
  // scale = rect.width / baseW = current zoom factor.
  // Dividing touch delta by scale → canvas-pixel delta.
  const getScale = useCallback(function() {
    if (canvasRef && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      return rect.width / baseW;
    }
    return 1;
  }, [canvasRef, baseW]);

  // ── DRAG + PINCH TOUCH START ──────────────────────────────
  const handleDragTouchStart = useCallback(function(e) {
    if (isPreview) return;

    if (e.touches.length === 2) {
      // Second finger landed — cancel any in-progress drag, start pinch if selected.
      dragStart.current = null;
      setIsDragging(false);

      if (selected && !locked) {
        // Intercept: prevent canvas zoom from firing on this selected element.
        e.stopPropagation();
        pinchStart.current = {
          distance:   getPinchDistance(e.touches),
          elW:        w,
          elH:        h,
          elFontSize: fontSize || null,
        };
      }
      // If not selected: fall through — canvas zoom gets the event.
      return;
    }

    if (e.touches.length > 2) return; // 3+ fingers — ignore

    // ── Single finger: start drag ──
    if (locked) {
      onSelect(id); // locked: select-only, no drag
      return;
    }
    e.stopPropagation();
    onSelect(id);
    const touch = e.touches[0];
    dragStart.current = { touchX: touch.clientX, touchY: touch.clientY, elX: x, elY: y };
    setIsDragging(true);
  }, [isPreview, locked, selected, id, x, y, w, h, fontSize, onSelect]);

  // ── DRAG + PINCH TOUCH MOVE ───────────────────────────────
  const handleDragTouchMove = useCallback(function(e) {

    // ── Pinch resize (two fingers) ─────────────────────────
    if (e.touches.length >= 2) {
      if (!pinchStart.current) return; // pinch didn't start on this element
      e.preventDefault();
      e.stopPropagation();

      const dist  = getPinchDistance(e.touches);
      const ratio = dist / pinchStart.current.distance;

      const newW = Math.max(60, pinchStart.current.elW * ratio);
      const newH = Math.max(40, pinchStart.current.elH * ratio);
      const updates = { w: newW, h: newH };

      // Font size scaling: only when type='text' AND fontSize was captured.
      // Clamped to [8, 96] — 8px is readable minimum, 96px is very large.
      if (type === 'text' && pinchStart.current.elFontSize) {
        updates.size = Math.max(8, Math.min(96,
          Math.round(pinchStart.current.elFontSize * ratio)
        ));
      }

      onUpdate(id, updates);
      return;
    }

    // ── Single touch drag ──────────────────────────────────
    if (!dragStart.current) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const dx    = touch.clientX - dragStart.current.touchX;
    const dy    = touch.clientY - dragStart.current.touchY;
    const scale = getScale();

    // FIX: Was Math.max(0, Math.min(baseW - w, ...)) — hard-stopped at canvas edge.
    // Now: element can go up to half off-canvas on any side.
    // This prevents the "freezes at border" feel while keeping element reachable.
    const newX = Math.max(-w / 2, Math.min(baseW - w / 2, dragStart.current.elX + dx / scale));
    const newY = Math.max(-h / 2, Math.min(baseH - h / 2, dragStart.current.elY + dy / scale));
    onUpdate(id, { x: newX, y: newY });

  }, [id, w, h, baseW, baseH, type, onUpdate, getScale]);

  // ── DRAG + PINCH TOUCH END ────────────────────────────────
  const handleDragTouchEnd = useCallback(function(e) {
    // e.touches = fingers STILL on screen after this touch ended.
    if (e.touches.length < 2) {
      pinchStart.current = null; // second finger lifted — end pinch
    }
    if (e.touches.length === 0) {
      dragStart.current = null;  // all fingers lifted — end drag
      setIsDragging(false);
    }
  }, []);

  // ── RESIZE HANDLE (bottom-right corner) ──────────────────
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
    // FIX: Removed baseW/baseH max — element can grow beyond canvas edge.
    // Was: Math.min(baseW - x, ...) — stopped growing when right edge hit canvas.
    const newW = Math.max(60, resizeStart.current.elW + dx / scale);
    const newH = Math.max(40, resizeStart.current.elH + dy / scale);
    onUpdate(id, { w: newW, h: newH });
  }, [id, onUpdate, getScale]);

  const handleResizeTouchEnd = useCallback(function() {
    resizeStart.current = null;
    setIsResizing(false);
  }, []);

  // ── RENDER ────────────────────────────────────────────────
  const opacityPct   = Math.round((opacity ?? 1) * 100);
  const showControls = selected && !isPreview;

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
      {/* ── Controls panel — floats above element when selected ── */}
      {showControls && (
        <div className="creator-controls-panel">

          {/* Lock toggle */}
          <button
            className={
              'creator-controls-panel__icon-btn creator-controls-panel__lock-btn' +
              (locked ? ' creator-controls-panel__lock-btn--active' : '')
            }
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

      {/* ── Lock overlay icon (locked + selected) ── */}
      {locked && selected && !isPreview && (
        <div className="creator-element__lock-overlay">
          <Lock size={10} />
        </div>
      )}

      {/* ── Resize handle — bottom right, hidden when locked or in preview ── */}
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
