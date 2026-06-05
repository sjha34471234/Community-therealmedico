'use client';

// --- WHY THIS CODE EXISTS ---
// Text tab for the Scroll Creator.
// Lets user type content, pick font, color, size, bold/italic/align/letterSpacing,
// then EITHER add a new draggable text block OR live-edit a selected text element.
// --- WHAT THIS MADE WORK ---
// Phase 15B-1: Add new text blocks via onAdd() callback.
// Phase 15D: Alignment + letter spacing.
// Jun 05 2026: Edit selected text elements — form populates from the selected
//   element; every change calls onUpdate(id, patch) to update canvas live.
// --- PITFALLS ---
// useEffect keyed on selectedElement?.id only (NOT the whole object).
//   Without this: every onUpdate → canvas update → element prop change → effect
//   re-fires → overwrites the user's typing mid-keystroke. Keying on id means the
//   effect only fires when a DIFFERENT element is selected, not on data changes.
// isEditing hides "Add Text Block" and the live preview — canvas IS the preview.
// A-/A+ buttons in the controls panel (ScrollCreatorElement) also change font size
//   via a separate code path. They may diverge from the size dropdown in this tab.
//   Known minor limitation — does not affect core text editing.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 text tab.
// [May 29 2026] ADDED: Phase 15D — align + letterSpacing.
// [Jun 05 2026] ADDED: Edit selected text element live.
//   - selectedElement prop: currently selected canvas element (or null) from page.js.
//   - onUpdate prop: (id, patch) → live-updates the element on canvas.
//   - useEffect populates all form fields when a text element is selected (keyed on id).
//   - isEditing flag: true when selectedElement?.type === 'text'.
//   - All change handlers call onUpdate(id, patch) when isEditing.
//   - Edit mode UI: blue banner shown, live preview + Add button hidden.
// --- END CHANGE LOG ---

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const FONTS = [
  { label: 'Inter (Default)', value: 'Inter, sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'Courier (Mono)',  value: 'Courier New, monospace' },
  { label: 'Arial Rounded',   value: 'Arial Rounded MT Bold, Arial, sans-serif' },
  { label: 'Palatino',        value: 'Palatino Linotype, Palatino, serif' },
];

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64];

const QUICK_COLORS = [
  '#ffffff', '#f8fafc', '#fef9c3', '#fce7f3',
  '#dbeafe', '#dcfce7', '#ffe4e6', '#f3e8ff',
  '#1D6FA4', '#ef4444', '#22c55e', '#f59e0b',
];

const ALIGN_OPTIONS = [
  { value: 'left',   label: 'L' },
  { value: 'center', label: 'C' },
  { value: 'right',  label: 'R' },
];

export default function ScrollCreatorText({ onAdd, selectedElement, onUpdate }) {
  const [text,          setText]          = useState('');
  const [font,          setFont]          = useState(FONTS[0].value);
  const [color,         setColor]         = useState('#ffffff');
  const [size,          setSize]          = useState(24);
  const [bold,          setBold]          = useState(false);
  const [italic,        setItalic]        = useState(false);
  const [align,         setAlign]         = useState('center');
  const [letterSpacing, setLetterSpacing] = useState(0);

  const charCount = text.length;
  const maxChars  = 300;

  // True when a text element is selected — switches tab to "live edit" mode.
  const isEditing = !!(selectedElement && selectedElement.type === 'text');

  // ── POPULATE FORM WHEN A TEXT ELEMENT IS SELECTED ────────
  // Keyed on selectedElement?.id so it fires only when the SELECTED ELEMENT
  // CHANGES — not on every canvas re-render caused by onUpdate patches.
  // If keyed on the whole element object: every keystroke → onUpdate → canvas
  // state update → new element reference → effect re-fires → overwrites input.
  // Resets all fields to defaults when selection becomes null.
  useEffect(function() {
    if (!selectedElement || selectedElement.type !== 'text') {
      setText('');
      setFont(FONTS[0].value);
      setColor('#ffffff');
      setSize(24);
      setBold(false);
      setItalic(false);
      setAlign('center');
      setLetterSpacing(0);
      return;
    }
    setText(selectedElement.text                   || '');
    setFont(selectedElement.font                   || FONTS[0].value);
    setColor(selectedElement.color                 || '#ffffff');
    setSize(selectedElement.size                   || 24);
    setBold(selectedElement.bold                   || false);
    setItalic(selectedElement.italic               || false);
    setAlign(selectedElement.align                 || 'center');
    setLetterSpacing(selectedElement.letterSpacing || 0);
  }, [selectedElement?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CHANGE HANDLERS ───────────────────────────────────────
  // Each handler: (1) updates local form state so the input re-renders,
  // (2) if editing, pushes the patch to the canvas element live via onUpdate.

  function handleTextChange(e) {
    var val = e.target.value;
    if (val.length > maxChars) return;
    setText(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { text: val });
  }

  function handleFontChange(e) {
    var val = e.target.value;
    setFont(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { font: val });
  }

  function handleSizeChange(e) {
    var val = Number(e.target.value);
    setSize(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { size: val });
  }

  function handleColorChange(c) {
    setColor(c);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { color: c });
  }

  function handleBoldToggle() {
    var val = !bold;
    setBold(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { bold: val });
  }

  function handleItalicToggle() {
    var val = !italic;
    setItalic(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { italic: val });
  }

  function handleAlignChange(val) {
    setAlign(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { align: val });
  }

  function handleSpacingChange(e) {
    var val = Number(e.target.value);
    setLetterSpacing(val);
    if (isEditing && onUpdate) onUpdate(selectedElement.id, { letterSpacing: val });
  }

  // ── ADD NEW TEXT BLOCK (non-edit mode only) ───────────────
  function handleAdd() {
    var trimmed = text.trim();
    if (!trimmed) { toast.error('Type some text first.'); return; }
    if (trimmed.length < 2) { toast.error('Text is too short.'); return; }
    onAdd({
      type:          'text',
      text:          trimmed,
      font,
      color,
      size,
      bold,
      italic,
      align,
      letterSpacing,
      w: 240,
      h: size * 2 + 24,
    });
    setText(''); // reset text only; keep style settings for next block
  }

  return (
    <div className="creator-text-tab">

      {/* ── EDIT MODE BANNER ─────────────────────────────────
          Shown when a text element is selected on canvas.
          Tells user changes are live and how to exit edit mode.
          ─────────────────────────────────────────────────── */}
      {isEditing && (
        <div style={{
          background:    'rgba(29,111,164,0.18)',
          border:        '1px solid rgba(29,111,164,0.4)',
          borderRadius:  7,
          padding:       '5px 10px',
          fontSize:      11,
          color:         '#7ec8f4',
          marginBottom:  8,
          textAlign:     'center',
          letterSpacing: '0.02em',
        }}>
          Editing selected text · changes update live · tap canvas to finish
        </div>
      )}

      {/* ── TEXTAREA ── */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder={isEditing ? 'Edit text here…' : 'Type your text here…'}
          rows={3}
          style={{ paddingBottom: 20 }}
        />
        <span style={{
          position: 'absolute',
          bottom:   8,
          right:    10,
          fontSize: 10,
          color:    charCount > 260 ? '#ef4444' : 'rgba(255,255,255,0.3)',
        }}>
          {charCount}/{maxChars}
        </span>
      </div>

      {/* ── ROW 1 — Font + Size ── */}
      <div className="creator-text-row" style={{ marginTop: 8 }}>
        <label>Font</label>
        <select value={font} onChange={handleFontChange}>
          {FONTS.map(function(f) {
            return <option key={f.value} value={f.value}>{f.label}</option>;
          })}
        </select>

        <label>Size</label>
        <select
          value={size}
          onChange={handleSizeChange}
          style={{
            background:   'rgba(255,255,255,0.08)',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color:        '#ffffff',
            fontSize:     12,
            padding:      '4px 8px',
            outline:      'none',
          }}
        >
          {FONT_SIZES.map(function(s) {
            return <option key={s} value={s}>{s}px</option>;
          })}
        </select>
      </div>

      {/* ── ROW 2 — Color + Bold + Italic ── */}
      <div className="creator-text-row" style={{ marginTop: 6 }}>
        <label>Color</label>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {QUICK_COLORS.map(function(c) {
            return (
              <button
                key={c}
                onClick={function() { handleColorChange(c); }}
                style={{
                  width:      22,
                  height:     22,
                  borderRadius: '50%',
                  background: c,
                  border:     color === c ? '2px solid #1D6FA4' : '2px solid rgba(255,255,255,0.15)',
                  cursor:     'pointer',
                  flexShrink: 0,
                  padding:    0,
                }}
                aria-label={'Color ' + c}
              />
            );
          })}
        </div>

        <input
          type="color"
          value={color}
          onChange={function(e) { handleColorChange(e.target.value); }}
          title="Custom color"
          style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0, flexShrink: 0 }}
        />

        <button
          onClick={handleBoldToggle}
          style={{
            padding:    '4px 10px',
            borderRadius: 6,
            border:     'none',
            background: bold ? '#1D6FA4' : 'rgba(255,255,255,0.08)',
            color:      '#ffffff',
            fontSize:   13,
            fontWeight: 700,
            cursor:     'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle bold"
        >B</button>

        <button
          onClick={handleItalicToggle}
          style={{
            padding:    '4px 10px',
            borderRadius: 6,
            border:     'none',
            background: italic ? '#1D6FA4' : 'rgba(255,255,255,0.08)',
            color:      '#ffffff',
            fontSize:   13,
            fontStyle:  'italic',
            cursor:     'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle italic"
        >I</button>
      </div>

      {/* ── ROW 3 — Alignment ── */}
      <div className="creator-text-row" style={{ marginTop: 6 }}>
        <label>Align</label>
        <div className="creator-text-align-group">
          {ALIGN_OPTIONS.map(function(opt) {
            return (
              <button
                key={opt.value}
                className={'creator-text-align-btn' + (align === opt.value ? ' creator-text-align-btn--active' : '')}
                onClick={function() { handleAlignChange(opt.value); }}
                aria-label={'Align ' + opt.value}
                aria-pressed={align === opt.value}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ROW 4 — Letter Spacing ── */}
      <div className="creator-text-spacing-row">
        <label>Spacing</label>
        <input
          type="range"
          min={0}
          max={8}
          step={0.5}
          value={letterSpacing}
          onChange={handleSpacingChange}
        />
        <span>{letterSpacing === 0 ? 'Normal' : letterSpacing + 'px'}</span>
      </div>

      {/* ── LIVE PREVIEW (non-edit mode only) ────────────────
          In edit mode, the canvas element IS the live preview — no need for this. */}
      {!isEditing && text.trim().length > 0 && (
        <div style={{
          marginTop:     8,
          padding:       '8px 10px',
          borderRadius:  8,
          background:    'rgba(255,255,255,0.04)',
          border:        '1px dashed rgba(255,255,255,0.1)',
          fontFamily:    font,
          fontSize:      Math.min(size, 20),
          color,
          fontWeight:    bold   ? 700 : 400,
          fontStyle:     italic ? 'italic' : 'normal',
          textAlign:     align,
          letterSpacing: letterSpacing ? letterSpacing + 'px' : 'normal',
          wordBreak:     'break-word',
          lineHeight:    1.4,
          maxHeight:     52,
          overflow:      'hidden',
          textOverflow:  'ellipsis',
        }}>
          {text}
        </div>
      )}

      {/* ── ADD BUTTON (non-edit mode only) ──────────────────
          Hidden in edit mode — no submit needed, all changes are live.
          User taps canvas to deselect and return to add-new mode. */}
      {!isEditing && (
        <div style={{ marginTop: 8 }}>
          <button
            className="creator-add-text-btn"
            onClick={handleAdd}
            disabled={!text.trim()}
            style={{ opacity: text.trim() ? 1 : 0.45 }}
          >
            <Plus size={14} />
            Add Text Block
          </button>
        </div>
      )}

    </div>
  );
}
