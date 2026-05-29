'use client';

// --- WHY THIS CODE EXISTS ---
// Post confirmation bottom sheet for Scroll Creator.
// Appears when user taps Post — shows mini canvas preview and
// "Post it!" button to prevent accidental posts.
// Triggered by ScrollCreatorToolbar → page.js → rendered here.
// --- WHAT THIS MADE WORK ---
// Bottom sheet with mini background preview, simplified text overlay,
// music indicator, element count, Post and Cancel buttons.
// --- PITFALLS ---
// Backdrop click = cancel (onCancel). Sheet click stops propagation.
// getBackgroundStyle duplicated from canvas — keep in sync if bg types change.
// Mini preview dimensions depend on orientation — portrait is tall and narrow.
// Font sizes clamped to avoid overflow in small preview box.
// --- CHANGE LOG ---
// [May 29 2026] CREATED: Phase 15D post confirmation sheet.
// --- END CHANGE LOG ---

import { Music } from 'lucide-react';

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

export default function ScrollPostConfirmSheet({
  isOpen,
  onConfirm,
  onCancel,
  canvas,
  orientation,
  posting,
}) {
  if (!isOpen || !canvas) return null;

  const bgStyle       = getBackgroundStyle(canvas.background);
  const textElements  = (canvas.elements || []).filter(function(el) { return el.type === 'text'; });
  const elementCount  = (canvas.elements || []).length;

  // Mini preview box dimensions by orientation
  const previewH = 160;
  const previewW = orientation === 'landscape' ? 285
                 : orientation === 'square'    ? 160
                 :                               90;

  // Scale factor: preview vs canvas coordinate space
  const baseH    = canvas.size ? canvas.size.h : 680;
  const scale    = previewH / baseH;

  return (
    <div className="creator-confirm-backdrop" onClick={onCancel}>
      <div className="creator-confirm-sheet" onClick={function(e) { e.stopPropagation(); }}>

        {/* Handle bar */}
        <div className="creator-confirm-handle" />

        <div className="creator-confirm-title">Ready to post?</div>
        <div className="creator-confirm-subtitle">Here's what your scroll will look like.</div>

        {/* Mini canvas preview */}
        <div className="creator-confirm-preview-wrap">
          <div
            className="creator-confirm-preview"
            style={{ width: previewW, height: previewH, ...bgStyle }}
          >
            {/* First two text elements, scaled down */}
            {textElements.slice(0, 2).map(function(el, i) {
              return (
                <div
                  key={i}
                  style={{
                    position:     'absolute',
                    top:          i === 0 ? '22%' : '52%',
                    left:         6,
                    right:        6,
                    textAlign:    el.align || 'center',
                    fontSize:     Math.max(7, Math.min(13, (el.size || 24) * scale)),
                    color:        el.color || '#ffffff',
                    fontFamily:   el.font  || 'Inter, sans-serif',
                    fontWeight:   el.bold   ? 700  : 400,
                    fontStyle:    el.italic ? 'italic' : 'normal',
                    letterSpacing: el.letterSpacing ? el.letterSpacing * scale + 'px' : 'normal',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}
                >
                  {el.text}
                </div>
              );
            })}

            {/* Music indicator at bottom */}
            {canvas.music && (
              <div style={{
                position:   'absolute',
                bottom:     5,
                left:       6,
                right:      6,
                display:    'flex',
                alignItems: 'center',
                gap:        3,
                color:      'rgba(255,255,255,0.75)',
                fontSize:   9,
              }}>
                <Music size={7} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {canvas.music.trackName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="creator-confirm-meta">
          {elementCount} element{elementCount !== 1 ? 's' : ''}
          {canvas.music ? ' · ' + canvas.music.trackName : ''}
          {orientation && orientation !== 'portrait' ? ' · ' + orientation : ''}
        </div>

        {/* Post button */}
        <button
          className="creator-confirm-post-btn"
          onClick={onConfirm}
          disabled={posting}
        >
          {posting ? 'Posting…' : '✓  Post it!'}
        </button>

        {/* Cancel */}
        <button
          className="creator-confirm-cancel-btn"
          onClick={onCancel}
          disabled={posting}
        >
          Go back and edit
        </button>

      </div>
    </div>
  );
}
