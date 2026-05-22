// ============================================================
// FILE: lib/avatarConfig.js
// PURPOSE: All avatar options — shapes, colors, icons, borders, patterns
//          25 options free, all 50 for Real Medico+ members
// LAST CHANGED: May 21, 2026
// ============================================================

// ── SHAPES ───────────────────────────────────────────────────
// free: first 4 — paid: all 10
export const AVATAR_SHAPES = [
  { key: 'circle',        label: 'Circle',         free: true,  clipPath: null,         borderRadius: '50%' },
  { key: 'hexagon',       label: 'Hexagon',        free: true,  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', borderRadius: '0' },
  { key: 'rounded-sq',   label: 'Rounded square', free: true,  clipPath: null,         borderRadius: '22%' },
  { key: 'shield',        label: 'Shield',         free: true,  clipPath: 'polygon(50% 0%, 100% 18%, 100% 72%, 50% 100%, 0% 72%, 0% 18%)', borderRadius: '0' },
  { key: 'diamond',       label: 'Diamond',        free: false, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: '0' },
  { key: 'cross',         label: 'Medical cross',  free: false, clipPath: 'polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)', borderRadius: '0' },
  { key: 'pentagon',      label: 'Pentagon',       free: false, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', borderRadius: '0' },
  { key: 'octagon',       label: 'Octagon',        free: false, clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)', borderRadius: '0' },
  { key: 'star',          label: 'Star',           free: false, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', borderRadius: '0' },
  { key: 'teardrop',      label: 'Teardrop',       free: false, clipPath: 'polygon(50% 0%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%)', borderRadius: '0' },
]

// ── COLORS ───────────────────────────────────────────────────
// free: first 8 — paid: all 16
export const AVATAR_COLORS = [
  { key: 'teal',      label: 'Teal',      hex: '#1D9E75', free: true  },
  { key: 'blue',      label: 'Blue',      hex: '#185FA5', free: true  },
  { key: 'coral',     label: 'Coral',     hex: '#D85A30', free: true  },
  { key: 'purple',    label: 'Purple',    hex: '#534AB7', free: true  },
  { key: 'amber',     label: 'Amber',     hex: '#BA7517', free: true  },
  { key: 'pink',      label: 'Pink',      hex: '#D4537E', free: true  },
  { key: 'green',     label: 'Green',     hex: '#3B6D11', free: true  },
  { key: 'navy',      label: 'Navy',      hex: '#042C53', free: true  },
  { key: 'rosegold',  label: 'Rose gold', hex: '#B76E79', free: false },
  { key: 'midnight',  label: 'Midnight',  hex: '#1A1A2E', free: false },
  { key: 'crimson',   label: 'Crimson',   hex: '#A32D2D', free: false },
  { key: 'sage',      label: 'Sage',      hex: '#5F7A61', free: false },
  { key: 'slate',     label: 'Slate',     hex: '#3D5A80', free: false },
  { key: 'maroon',    label: 'Maroon',    hex: '#7B2D42', free: false },
  { key: 'forest',    label: 'Forest',    hex: '#1B4332', free: false },
  { key: 'copper',    label: 'Copper',    hex: '#8B4513', free: false },
]

// ── ICONS ────────────────────────────────────────────────────
// free: first 16 — paid: all 32
export const AVATAR_ICONS = [
  { key: 'stethoscope', label: 'Stethoscope', emoji: '🩺', free: true  },
  { key: 'pill',        label: 'Pill',        emoji: '💊', free: true  },
  { key: 'microscope',  label: 'Microscope',  emoji: '🔬', free: true  },
  { key: 'heart',       label: 'Heart',       emoji: '🫀', free: true  },
  { key: 'dna',         label: 'DNA',         emoji: '🧬', free: true  },
  { key: 'xray',        label: 'X-ray',       emoji: '🩻', free: true  },
  { key: 'brain',       label: 'Brain',       emoji: '🧠', free: true  },
  { key: 'caduceus',    label: 'Caduceus',    emoji: '⚕️', free: true  },
  { key: 'blood',       label: 'Blood drop',  emoji: '🩸', free: true  },
  { key: 'syringe',     label: 'Syringe',     emoji: '💉', free: true  },
  { key: 'lungs',       label: 'Lungs',       emoji: '🫁', free: true  },
  { key: 'tooth',       label: 'Tooth',       emoji: '🦷', free: true  },
  { key: 'bandage',     label: 'Bandage',     emoji: '🩹', free: true  },
  { key: 'bone',        label: 'Bone',        emoji: '🦴', free: true  },
  { key: 'eyes',        label: 'Eyes',        emoji: '👁️',  free: true  },
  { key: 'hospital',    label: 'Hospital',    emoji: '🏥', free: true  },
  { key: 'ambulance',   label: 'Ambulance',   emoji: '🚑', free: false },
  { key: 'test-tube',   label: 'Test tube',   emoji: '🧪', free: false },
  { key: 'petri',       label: 'Petri dish',  emoji: '🧫', free: false },
  { key: 'dna2',        label: 'Microbe',     emoji: '🦠', free: false },
  { key: 'ear',         label: 'Ear',         emoji: '👂', free: false },
  { key: 'nose',        label: 'Nose',        emoji: '👃', free: false },
  { key: 'flexed',      label: 'Muscle',      emoji: '💪', free: false },
  { key: 'spine',       label: 'Skeleton',    emoji: '💀', free: false },
  { key: 'pregnant',    label: 'Pregnant',    emoji: '🤰', free: false },
  { key: 'baby',        label: 'Baby',        emoji: '👶', free: false },
  { key: 'elderly',     label: 'Elderly',     emoji: '🧓', free: false },
  { key: 'wheelchair',  label: 'Wheelchair',  emoji: '♿', free: false },
  { key: 'thermometer', label: 'Thermometer', emoji: '🌡️', free: false },
  { key: 'volcano',     label: 'Heartbeat',   emoji: '📈', free: false },
  { key: 'clipboard',   label: 'Chart',       emoji: '📋', free: false },
  { key: 'globe',       label: 'Global health',emoji: '🌍', free: false },
]

// ── BORDERS ──────────────────────────────────────────────────
// free: none only — paid: all 6
export const AVATAR_BORDERS = [
  { key: 'none',    label: 'None',        free: true,  style: 'none' },
  { key: 'gold',    label: 'Gold',        free: false, style: '3px solid #D4AF37' },
  { key: 'white',   label: 'White',       free: false, style: '3px solid #FFFFFF' },
  { key: 'coral',   label: 'Coral',       free: false, style: '3px solid #D85A30' },
  { key: 'silver',  label: 'Silver',      free: false, style: '3px solid #A0A0A0' },
  { key: 'pulse',   label: 'Pulse',       free: false, style: '3px dashed #1D9E75' },
]

// ── PATTERNS ─────────────────────────────────────────────────
// free: none only — paid: all 5
export const AVATAR_PATTERNS = [
  { key: 'none',  label: 'None',       free: true,  style: null },
  { key: 'dots',  label: 'Dots',       free: false, style: 'radial-gradient(circle, rgba(255,255,255,0.25) 1.5px, transparent 1.5px) 0 0 / 8px 8px' },
  { key: 'lines', label: 'Lines',      free: false, style: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.18) 4px, rgba(255,255,255,0.18) 5px)' },
  { key: 'grid',  label: 'Grid',       free: false, style: 'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.15) 7px, rgba(255,255,255,0.15) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.15) 7px, rgba(255,255,255,0.15) 8px)' },
  { key: 'pulse', label: 'Pulse wave', free: false, style: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.12) 3px, rgba(255,255,255,0.12) 4px)' },
]

// ── DEFAULTS ─────────────────────────────────────────────────
export const AVATAR_DEFAULTS = {
  shape:   'circle',
  color:   'teal',
  icon:    'stethoscope',
  border:  'none',
  pattern: 'none',
}

// ── HELPERS ──────────────────────────────────────────────────

export function getShape(key) {
  return AVATAR_SHAPES.find(function(s) { return s.key === key }) || AVATAR_SHAPES[0]
}

export function getColor(key) {
  return AVATAR_COLORS.find(function(c) { return c.key === key }) || AVATAR_COLORS[0]
}

export function getIcon(key) {
  return AVATAR_ICONS.find(function(i) { return i.key === key }) || AVATAR_ICONS[0]
}

export function getBorder(key) {
  return AVATAR_BORDERS.find(function(b) { return b.key === key }) || AVATAR_BORDERS[0]
}

export function getPattern(key) {
  return AVATAR_PATTERNS.find(function(p) { return p.key === key }) || AVATAR_PATTERNS[0]
}

// Returns only the options a user can access based on membership
export function filterByMembership(arr, isMember) {
  if (isMember) return arr
  return arr.filter(function(item) { return item.free })
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Full avatar config — 50 options, free/paid split
// --- END CHANGE LOG ---
