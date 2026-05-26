'use client';

// --- WHY THIS CODE EXISTS ---
// Background tab for the Scroll Creator.
// Lets user pick solid colors, preset gradients, or build a custom gradient.
// Calls onSelect(bg) which flows up to ScrollCreatorCanvas.setBackground().
// --- WHAT THIS MADE WORK ---
// 20 solid color swatches (dark medical palette),
// 10 preset gradient swatches,
// custom gradient builder (2 color pickers + direction select).
// Selected swatch gets a blue border highlight.
// --- PITFALLS ---
// bg objects must match the shape expected by getBackgroundStyle() in Canvas:
//   solid:   { type: 'solid', value: '#hex' }
//   gradient: { type: 'gradient', value: 'css gradient string' }
//   custom:  { type: 'custom-gradient', color1, color2, direction }
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 background tab.
// --- END CHANGE LOG ---

import { useState } from 'react';

// ── 20 SOLID COLORS — dark medical palette ──
const SOLID_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1D6FA4',
  '#0d1b2a', '#1b2838', '#2d132c', '#1a0a2e',
  '#0a2e1a', '#0a2a2e', '#2e1a0a', '#2e0a0a',
  '#111111', '#1c1c1c', '#222831', '#393e46',
  '#1f4e79', '#1a3a4a', '#2e4a1a', '#4a1a2e',
];

// ── 10 PRESET GRADIENTS ──
const PRESET_GRADIENTS = [
  { label: 'Night Blue',    value: 'linear-gradient(135deg, #1a1a2e 0%, #1D6FA4 100%)' },
  { label: 'Deep Ocean',    value: 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)' },
  { label: 'Medical Teal',  value: 'linear-gradient(135deg, #0a2e2a 0%, #1D6FA4 100%)' },
  { label: 'Midnight',      value: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a2e 100%)' },
  { label: 'Dark Crimson',  value: 'linear-gradient(135deg, #2e0a0a 0%, #1a1a2e 100%)' },
  { label: 'Forest Night',  value: 'linear-gradient(135deg, #0a2e1a 0%, #111111 100%)' },
  { label: 'Purple Haze',   value: 'linear-gradient(135deg, #1a0a2e 0%, #2d132c 100%)' },
  { label: 'Steel Blue',    value: 'linear-gradient(180deg, #1f4e79 0%, #111827 100%)' },
  { label: 'Warm Dark',     value: 'linear-gradient(135deg, #2e1a0a 0%, #1c1c1c 100%)' },
  { label: 'Slate',         value: 'linear-gradient(180deg, #222831 0%, #393e46 100%)' },
];

// ── GRADIENT DIRECTIONS ──
const DIRECTIONS = [
  { label: 'Top → Bottom',  value: 'to bottom' },
  { label: 'Bottom → Top',  value: 'to top' },
  { label: 'Left → Right',  value: 'to right' },
  { label: 'Right → Left',  value: 'to left' },
  { label: 'Diagonal ↘',    value: '135deg' },
  { label: 'Diagonal ↗',    value: '45deg' },
  { label: 'Radial',        value: 'radial' },
];

function getCustomGradientStyle(color1, color2, direction) {
  if (direction === 'radial') {
    return `radial-gradient(circle at center, ${color1}, ${color2})`;
  }
  return `linear-gradient(${direction}, ${color1}, ${color2})`;
}

export default function ScrollCreatorBackground({ current, onSelect }) {
  const [customColor1, setCustomColor1] = useState('#1D6FA4');
  const [customColor2, setCustomColor2] = useState('#0a0a0a');
  const [customDir, setCustomDir] = useState('135deg');

  const handleCustomChange = (c1, c2, dir) => {
    onSelect({
      type: 'custom-gradient',
      color1: c1,
      color2: c2,
      direction: dir,
      value: getCustomGradientStyle(c1, c2, dir),
    });
  };

  const isSolidSelected = (hex) =>
    current?.type === 'solid' && current?.value === hex;

  const isGradientSelected = (val) =>
    current?.type === 'gradient' && current?.value === val;

  const isCustomSelected = current?.type === 'custom-gradient';

  return (
    <div>
      {/* ── SOLID COLORS ── */}
      <div className="creator-bg-section-label">Solid Colors</div>
      <div className="creator-bg-swatches">
        {SOLID_COLORS.map((hex) => (
          <button
            key={hex}
            className={`creator-bg-swatch${isSolidSelected(hex) ? ' creator-bg-swatch--selected' : ''}`}
            style={{ background: hex }}
            onClick={() => onSelect({ type: 'solid', value: hex })}
            aria-label={`Solid color ${hex}`}
          />
        ))}
      </div>

      {/* ── PRESET GRADIENTS ── */}
      <div className="creator-bg-section-label">Gradients</div>
      <div className="creator-bg-gradients">
        {PRESET_GRADIENTS.map((g) => (
          <button
            key={g.value}
            className={`creator-bg-gradient${isGradientSelected(g.value) ? ' creator-bg-gradient--selected' : ''}`}
            style={{ background: g.value }}
            onClick={() => onSelect({ type: 'gradient', value: g.value })}
            aria-label={g.label}
            title={g.label}
          />
        ))}
      </div>

      {/* ── CUSTOM GRADIENT ── */}
      <div className="creator-bg-section-label">Custom Gradient</div>
      <div className="creator-custom-gradient-row">
        <label>From</label>
        <input
          type="color"
          value={customColor1}
          onChange={(e) => {
            setCustomColor1(e.target.value);
            handleCustomChange(e.target.value, customColor2, customDir);
          }}
          aria-label="Gradient start color"
        />
        <label>To</label>
        <input
          type="color"
          value={customColor2}
          onChange={(e) => {
            setCustomColor2(e.target.value);
            handleCustomChange(customColor1, e.target.value, customDir);
          }}
          aria-label="Gradient end color"
        />
        <label>Direction</label>
        <select
          value={customDir}
          onChange={(e) => {
            setCustomDir(e.target.value);
            handleCustomChange(customColor1, customColor2, e.target.value);
          }}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        {/* Live preview swatch */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            flexShrink: 0,
            background: getCustomGradientStyle(customColor1, customColor2, customDir),
            border: isCustomSelected ? '2px solid #1D6FA4' : '2px solid rgba(255,255,255,0.1)',
          }}
        />
      </div>
    </div>
  );
}
