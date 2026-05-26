'use client';

// --- WHY THIS CODE EXISTS ---
// Text tab for the Scroll Creator.
// Lets user type content, pick font, color, size, then add it as a
// draggable text block on the canvas via onAdd() callback.
// --- WHAT THIS MADE WORK ---
// Textarea for text input, font family select (5 options),
// color picker, font size number input, bold/italic toggles,
// Add Text Block button that calls onAdd with a text element object.
// Character counter (max 300 chars — matches community_scrolls content limit).
// --- PITFALLS ---
// onAdd must be called with type:'text' and all text props so
// TextElementContent in ScrollCreatorCanvas renders correctly.
// Font names must be web-safe or system fonts — no Google Fonts loaded.
// Text is placed at canvas center by default — user can drag after adding.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 text tab.
// --- END CHANGE LOG ---

import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const FONTS = [
  { label: 'Inter (Default)',   value: 'Inter, sans-serif' },
  { label: 'Georgia (Serif)',   value: 'Georgia, serif' },
  { label: 'Courier (Mono)',    value: 'Courier New, monospace' },
  { label: 'Arial Rounded',     value: 'Arial Rounded MT Bold, Arial, sans-serif' },
  { label: 'Palatino',          value: 'Palatino Linotype, Palatino, serif' },
];

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64];

const QUICK_COLORS = [
  '#ffffff', '#f8fafc', '#fef9c3', '#fce7f3',
  '#dbeafe', '#dcfce7', '#ffe4e6', '#f3e8ff',
  '#1D6FA4', '#ef4444', '#22c55e', '#f59e0b',
];

export default function ScrollCreatorText({ onAdd }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState(FONTS[0].value);
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(24);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const charCount = text.length;
  const maxChars = 300;

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Type some text first.');
      return;
    }
    if (trimmed.length < 2) {
      toast.error('Text is too short.');
      return;
    }

    onAdd({
      type: 'text',
      text: trimmed,
      font,
      color,
      size,
      bold,
      italic,
      w: 240,
      h: size * 2 + 24,
    });

    // Reset text only — keep style settings for next block
    setText('');
  };

  return (
    <div className="creator-text-tab">

      {/* ── TEXTAREA ── */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={e => {
            if (e.target.value.length <= maxChars) setText(e.target.value);
          }}
          placeholder="Type your text here…"
          rows={3}
          style={{ paddingBottom: 20 }}
        />
        {/* char counter */}
        <span style={{
          position: 'absolute',
          bottom: 8,
          right: 10,
          fontSize: 10,
          color: charCount > 260 ? '#ef4444' : 'rgba(255,255,255,0.3)',
        }}>
          {charCount}/{maxChars}
        </span>
      </div>

      {/* ── ROW 1 — Font + Size ── */}
      <div className="creator-text-row" style={{ marginTop: 8 }}>
        <label>Font</label>
        <select value={font} onChange={e => setFont(e.target.value)}>
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <label>Size</label>
        <select
          value={size}
          onChange={e => setSize(Number(e.target.value))}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#ffffff',
            fontSize: 12,
            padding: '4px 8px',
            outline: 'none',
          }}
        >
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </div>

      {/* ── ROW 2 — Color + Bold + Italic ── */}
      <div className="creator-text-row" style={{ marginTop: 6 }}>
        <label>Color</label>

        {/* Quick color swatches */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {QUICK_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid #1D6FA4' : '2px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        {/* Full color picker */}
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          title="Custom color"
          style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0, flexShrink: 0 }}
        />

        {/* Bold toggle */}
        <button
          onClick={() => setBold(b => !b)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            background: bold ? '#1D6FA4' : 'rgba(255,255,255,0.08)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle bold"
        >
          B
        </button>

        {/* Italic toggle */}
        <button
          onClick={() => setItalic(i => !i)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            background: italic ? '#1D6FA4' : 'rgba(255,255,255,0.08)',
            color: '#ffffff',
            fontSize: 13,
            fontStyle: 'italic',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle italic"
        >
          I
        </button>
      </div>

      {/* ── LIVE PREVIEW ── */}
      {text.trim().length > 0 && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.1)',
          fontFamily: font,
          fontSize: Math.min(size, 20),
          color,
          fontWeight: bold ? 700 : 400,
          fontStyle: italic ? 'italic' : 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.4,
          maxHeight: 52,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {text}
        </div>
      )}

      {/* ── ADD BUTTON ── */}
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

    </div>
  );
}
