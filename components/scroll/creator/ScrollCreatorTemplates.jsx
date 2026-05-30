'use client';
// --- WHY THIS CODE EXISTS ---
// Phase 15E — Creator Template Picker.
// Shows a full-screen overlay when Scroll Creator first opens
// (unless a draft is being restored — page.js hides this when a valid draft is found).
// User taps a template → onSelectTemplate(tpl) fires → page.js:
//   1. setOrientation(tpl.orientation)
//   2. setTimeout 50ms → canvasRef.current.setCanvasState({ background, elements, music })
// "Start blank →" button calls onStartBlank() → picker hides, blank canvas shown.
// Element IDs in TEMPLATES are short static strings ('e1','e2','e3').
// page.js MUST regenerate them with random IDs before calling setCanvasState
// to avoid conflicts if the same template is loaded twice in a session.
// All templates are designed for portrait canvas (390×680 px).
// Loading on square/landscape places some elements near or outside edge — acceptable,
// user can drag/delete them. page.js always sets orientation = 'portrait' for templates.
// --- WHAT THIS MADE WORK ---
// Blank canvas intimidation removed. User lands on a polished starting point
// with real placeholder text they can tap and edit immediately.
// --- PITFALLS ---
// - background.value must be a valid CSS background string (color or gradient).
//   It is used directly as a CSS `background` property in the canvas and the feed.
// - preview blocks are purely visual thumbnail indicators — not real rendered text.
//   They are position: absolute inside the thumbnail div, percentage-based so they
//   scale correctly regardless of thumbnail rendered size.
// - For Clinical White (light background), block colors must be dark — NOT white.
// - Never import any lucide icon not in the v0.303 safe list.
//   This file uses no icons — the "→" is a unicode character in a text button.
// --- CHANGE LOG ---
// [May 30 2026] CREATED: Phase 15E — 6 templates, full-screen overlay picker.
// --- END CHANGE LOG ---

// ── TEMPLATE DEFINITIONS ─────────────────────────────────────────────────────
// Each template produces a canvas-ready object that setCanvasState() can consume.
// background.value = valid CSS background string (used in canvas + feed rendering).
// preview = array of layout indicator blocks for the thumbnail (percentage positioning).
// elements = text elements positioned for portrait canvas (390×680 px).

const TEMPLATES = [

  // ── 1. Medical Blue ──────────────────────────────────────────────────────
  {
    id: 'medical-blue',
    name: 'Medical Blue',
    orientation: 'portrait',
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #0a1628 0%, #1D6FA4 100%)',
    },
    // Preview indicator blocks — percentage positions inside thumbnail
    preview: [
      { top: '18%', left: '25%', width: '50%', height: '3.5%', color: 'rgba(255,255,255,0.45)' },
      { top: '33%', left: '11%', width: '78%', height: '19%',  color: 'rgba(255,255,255,0.88)' },
      { top: '87%', left: '22%', width: '56%', height: '2.5%', color: 'rgba(255,255,255,0.3)'  },
    ],
    // Canvas elements (portrait 390×680 px coordinate space)
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'CLINICAL PEARL',
        font: 'Georgia, serif', size: 11, bold: false, italic: false,
        color: 'rgba(255,255,255,0.55)', align: 'center', letterSpacing: 4,
        x: 95, y: 120, w: 200, h: 30, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Write your key\nclinical insight\nhere.',
        font: 'Georgia, serif', size: 28, bold: true, italic: false,
        color: '#ffffff', align: 'center', letterSpacing: 0,
        x: 45, y: 225, w: 300, h: 158, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: '— The Real Medico',
        font: 'Georgia, serif', size: 12, bold: false, italic: true,
        color: 'rgba(255,255,255,0.38)', align: 'center', letterSpacing: 0,
        x: 95, y: 598, w: 200, h: 28, opacity: 1, locked: false,
      },
    ],
  },

  // ── 2. Night Study ───────────────────────────────────────────────────────
  {
    id: 'night-study',
    name: 'Night Study',
    orientation: 'portrait',
    background: {
      type: 'solid',
      value: '#0a0a0a',
    },
    preview: [
      { top: '16%', left: '10%', width: '80%', height: '4.5%', color: 'rgba(255,255,255,0.9)'  },
      { top: '24%', left: '15%', width: '70%', height: '3%',   color: 'rgba(255,255,255,0.35)' },
      { top: '39%', left: '7%',  width: '86%', height: '22%',  color: 'rgba(255,255,255,0.72)' },
    ],
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'STUDY NOTES',
        font: 'Inter, sans-serif', size: 13, bold: true, italic: false,
        color: '#ffffff', align: 'center', letterSpacing: 5,
        x: 75, y: 110, w: 240, h: 32, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Topic goes here',
        font: 'Inter, sans-serif', size: 14, bold: false, italic: false,
        color: 'rgba(255,255,255,0.38)', align: 'center', letterSpacing: 1,
        x: 75, y: 155, w: 240, h: 30, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: 'Type your main note\nor concept here.\nMake it count.',
        font: 'Inter, sans-serif', size: 26, bold: true, italic: false,
        color: '#ffffff', align: 'left', letterSpacing: 0,
        x: 30, y: 268, w: 330, h: 178, opacity: 1, locked: false,
      },
    ],
  },

  // ── 3. Emergency Red ─────────────────────────────────────────────────────
  {
    id: 'emergency-red',
    name: 'Emergency Red',
    orientation: 'portrait',
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #1c0000 0%, #7f1d1d 100%)',
    },
    preview: [
      { top: '16%', left: '30%', width: '40%', height: '4%',  color: '#ef4444'               },
      { top: '33%', left: '8%',  width: '84%', height: '17%', color: 'rgba(255,255,255,0.9)'  },
      { top: '62%', left: '14%', width: '72%', height: '4.5%', color: 'rgba(255,255,255,0.4)' },
    ],
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'CRITICAL CARE',
        font: 'Inter, sans-serif', size: 12, bold: true, italic: false,
        color: '#ef4444', align: 'center', letterSpacing: 4,
        x: 90, y: 115, w: 210, h: 30, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Key clinical\npoint here.',
        font: 'Inter, sans-serif', size: 34, bold: true, italic: false,
        color: '#ffffff', align: 'center', letterSpacing: 0,
        x: 30, y: 228, w: 330, h: 140, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: 'Remember this. It saves lives.',
        font: 'Inter, sans-serif', size: 14, bold: false, italic: true,
        color: 'rgba(255,255,255,0.45)', align: 'center', letterSpacing: 0,
        x: 55, y: 432, w: 280, h: 40, opacity: 1, locked: false,
      },
    ],
  },

  // ── 4. Clinical White ────────────────────────────────────────────────────
  // Light background — preview block colors MUST be dark (not white).
  {
    id: 'clinical-white',
    name: 'Clinical White',
    orientation: 'portrait',
    background: {
      type: 'solid',
      value: '#f8fafc',
    },
    preview: [
      { top: '18%', left: '11%', width: '78%', height: '11%',  color: 'rgba(26,29,35,0.85)'    },
      { top: '37%', left: '11%', width: '78%', height: '3.5%', color: 'rgba(91,100,116,0.55)'  },
      { top: '44%', left: '11%', width: '78%', height: '3.5%', color: 'rgba(91,100,116,0.55)'  },
      { top: '86%', left: '22%', width: '56%', height: '2.5%', color: 'rgba(91,100,116,0.35)'  },
    ],
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'Clinical Pearl',
        font: 'Palatino, Georgia, serif', size: 32, bold: true, italic: false,
        color: '#1A1D23', align: 'center', letterSpacing: 0,
        x: 45, y: 125, w: 300, h: 80, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Your tip or insight goes here.\nKeep it clear and concise.',
        font: 'Palatino, Georgia, serif', size: 17, bold: false, italic: false,
        color: '#5B6474', align: 'center', letterSpacing: 0,
        x: 45, y: 285, w: 300, h: 95, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: '— The Real Medico Community',
        font: 'Palatino, Georgia, serif', size: 11, bold: false, italic: true,
        color: '#9AA0AE', align: 'center', letterSpacing: 0,
        x: 80, y: 598, w: 230, h: 26, opacity: 1, locked: false,
      },
    ],
  },

  // ── 5. Nature Calm ───────────────────────────────────────────────────────
  {
    id: 'nature-calm',
    name: 'Nature Calm',
    orientation: 'portrait',
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #052e16 0%, #166534 100%)',
    },
    preview: [
      { top: '17%', left: '11%', width: '78%', height: '15%',  color: 'rgba(255,255,255,0.9)'  },
      { top: '40%', left: '11%', width: '78%', height: '3.5%', color: 'rgba(255,255,255,0.55)' },
      { top: '47%', left: '11%', width: '78%', height: '3.5%', color: 'rgba(255,255,255,0.55)' },
      { top: '87%', left: '20%', width: '60%', height: '2.5%', color: '#22c55e'                },
    ],
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'HEALING &\nWELLNESS',
        font: 'Inter, sans-serif', size: 32, bold: true, italic: false,
        color: '#ffffff', align: 'center', letterSpacing: 2,
        x: 45, y: 118, w: 300, h: 128, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Your health tip or\nwellness insight here.',
        font: 'Inter, sans-serif', size: 17, bold: false, italic: false,
        color: 'rgba(255,255,255,0.75)', align: 'center', letterSpacing: 0,
        x: 45, y: 315, w: 300, h: 95, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: "Take a breath. You've got this.",
        font: 'Inter, sans-serif', size: 13, bold: false, italic: true,
        color: '#22c55e', align: 'center', letterSpacing: 0,
        x: 65, y: 598, w: 260, h: 28, opacity: 1, locked: false,
      },
    ],
  },

  // ── 6. Neon Focus ────────────────────────────────────────────────────────
  {
    id: 'neon-focus',
    name: 'Neon Focus',
    orientation: 'portrait',
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #0f0520 0%, #4c1d95 100%)',
    },
    preview: [
      { top: '16%', left: '28%', width: '44%', height: '3.5%',  color: '#a78bfa'                },
      { top: '31%', left: '8%',  width: '84%', height: '21%',   color: 'rgba(255,255,255,0.9)'  },
      { top: '65%', left: '17%', width: '66%', height: '3.5%',  color: 'rgba(167,139,250,0.55)' },
    ],
    elements: [
      {
        id: 'e1', type: 'text',
        text: 'FOCUS MODE',
        font: 'Inter, sans-serif', size: 12, bold: true, italic: false,
        color: '#a78bfa', align: 'center', letterSpacing: 5,
        x: 90, y: 112, w: 210, h: 30, opacity: 1, locked: false,
      },
      {
        id: 'e2', type: 'text',
        text: 'Your concept\nor topic here.',
        font: 'Inter, sans-serif', size: 36, bold: true, italic: false,
        color: '#ffffff', align: 'center', letterSpacing: 0,
        x: 30, y: 215, w: 330, h: 170, opacity: 1, locked: false,
      },
      {
        id: 'e3', type: 'text',
        text: 'Study smarter. Not harder.',
        font: 'Inter, sans-serif', size: 13, bold: false, italic: true,
        color: 'rgba(167,139,250,0.7)', align: 'center', letterSpacing: 0,
        x: 65, y: 452, w: 260, h: 30, opacity: 1, locked: false,
      },
    ],
  },

];

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function ScrollCreatorTemplates({ isOpen, onSelectTemplate, onStartBlank }) {
  // Early return keeps it off the DOM entirely when not shown.
  // No animation needed — it mounts/unmounts cleanly.
  if (!isOpen) return null;

  return (
    <div className="creator-tpl-overlay">

      {/* Header */}
      <div className="creator-tpl-header">
        <div className="creator-tpl-header__text">
          <h2 className="creator-tpl-title">Start with a template</h2>
          <p className="creator-tpl-subtitle">Pick one to get started, or start blank</p>
        </div>
        <button
          className="creator-tpl-blank-btn"
          onClick={onStartBlank}
          aria-label="Start with a blank canvas"
        >
          Start blank →
        </button>
      </div>

      {/* Template grid — 2 columns, scrollable */}
      <div className="creator-tpl-grid">
        {TEMPLATES.map(function(tpl) {
          return (
            <button
              key={tpl.id}
              className="creator-tpl-card"
              onClick={function() { onSelectTemplate(tpl); }}
              aria-label={'Use ' + tpl.name + ' template'}
            >
              {/* Thumbnail — background CSS + layout indicator blocks */}
              <div
                className="creator-tpl-thumb"
                style={{ background: tpl.background.value }}
              >
                {tpl.preview.map(function(block, i) {
                  return (
                    <div
                      key={i}
                      className="creator-tpl-block"
                      style={{
                        top:        block.top,
                        left:       block.left,
                        width:      block.width,
                        height:     block.height,
                        background: block.color,
                      }}
                    />
                  );
                })}
              </div>

              {/* Template name */}
              <span className="creator-tpl-name">{tpl.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
