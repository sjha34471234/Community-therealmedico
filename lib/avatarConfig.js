// ============================================================
// FILE: lib/avatarConfig.js
// PURPOSE: All avatar options — shapes, colors, icons, borders, patterns
//          25 options free, all 50 for Real Medico+ members
// LAST CHANGED: May 22, 2026
// ============================================================

// ── SHAPES ───────────────────────────────────────────────────
export const AVATAR_SHAPES = [
  { key: 'circle',      label: 'Circle',         free: true,  clipPath: null, borderRadius: '50%' },
  { key: 'hexagon',     label: 'Hexagon',        free: true,  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', borderRadius: '0' },
  { key: 'rounded-sq',  label: 'Rounded square', free: true,  clipPath: null, borderRadius: '22%' },
  { key: 'shield',      label: 'Shield',         free: true,  clipPath: 'polygon(50% 0%, 100% 18%, 100% 72%, 50% 100%, 0% 72%, 0% 18%)', borderRadius: '0' },
  { key: 'diamond',     label: 'Diamond',        free: false, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: '0' },
  { key: 'cross',       label: 'Medical cross',  free: false, clipPath: 'polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)', borderRadius: '0' },
  { key: 'pentagon',    label: 'Pentagon',       free: false, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', borderRadius: '0' },
  { key: 'octagon',     label: 'Octagon',        free: false, clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)', borderRadius: '0' },
  { key: 'star',        label: 'Star',           free: false, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', borderRadius: '0' },
  { key: 'teardrop',    label: 'Teardrop',       free: false, clipPath: 'polygon(50% 0%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%)', borderRadius: '0' },
]

// ── COLORS ───────────────────────────────────────────────────
export const AVATAR_COLORS = [
  { key: 'teal',      label: 'Teal',      hex: '#1D9E75', free: true,  dark: true  },
  { key: 'blue',      label: 'Blue',      hex: '#185FA5', free: true,  dark: true  },
  { key: 'coral',     label: 'Coral',     hex: '#D85A30', free: true,  dark: true  },
  { key: 'purple',    label: 'Purple',    hex: '#534AB7', free: true,  dark: true  },
  { key: 'amber',     label: 'Amber',     hex: '#BA7517', free: true,  dark: true  },
  { key: 'pink',      label: 'Pink',      hex: '#D4537E', free: true,  dark: true  },
  { key: 'green',     label: 'Green',     hex: '#3B6D11', free: true,  dark: true  },
  { key: 'navy',      label: 'Navy',      hex: '#042C53', free: true,  dark: true  },
  { key: 'rosegold',  label: 'Rose gold', hex: '#B76E79', free: false, dark: true  },
  { key: 'midnight',  label: 'Midnight',  hex: '#1A1A2E', free: false, dark: true  },
  { key: 'crimson',   label: 'Crimson',   hex: '#A32D2D', free: false, dark: true  },
  { key: 'sage',      label: 'Sage',      hex: '#5F7A61', free: false, dark: true  },
  { key: 'slate',     label: 'Slate',     hex: '#3D5A80', free: false, dark: true  },
  { key: 'maroon',    label: 'Maroon',    hex: '#7B2D42', free: false, dark: true  },
  { key: 'forest',    label: 'Forest',    hex: '#1B4332', free: false, dark: true  },
  { key: 'copper',    label: 'Copper',    hex: '#8B4513', free: false, dark: true  },
]

// ── ICONS — only Lucide v0.303 safe names ────────────────────
export const AVATAR_ICONS = [
  { key: 'stethoscope', label: 'Stethoscope',  lucide: 'Stethoscope',  free: true  },
  { key: 'pill',        label: 'Pill',         lucide: 'Pill',         free: true  },
  { key: 'microscope',  label: 'Microscope',   lucide: 'Microscope',   free: true  },
  { key: 'heart',       label: 'Heart',        lucide: 'Heart',        free: true  },
  { key: 'dna',         label: 'DNA',          lucide: 'Dna',          free: true  },
  { key: 'bone',        label: 'Bone',         free: true,  lucide: 'Bone'          },
  { key: 'brain',       label: 'Brain',        lucide: 'Brain',        free: true  },
  { key: 'eye',         label: 'Eye',          lucide: 'Eye',          free: true  },
  { key: 'syringe',     label: 'Syringe',      lucide: 'Syringe',      free: true  },
  { key: 'thermometer', label: 'Thermometer',  lucide: 'Thermometer',  free: true  },
  { key: 'activity',    label: 'Heartbeat',    lucide: 'Activity',     free: true  },
  { key: 'clipboard',   label: 'Chart',        lucide: 'Clipboard',    free: true  },
  { key: 'flask',       label: 'Flask',        lucide: 'FlaskConical', free: true  },
  { key: 'search',      label: 'Diagnosis',    lucide: 'Search',       free: true  },
  { key: 'zap',         label: 'Emergency',    lucide: 'Zap',          free: true  },
  { key: 'shield',      label: 'Protection',   lucide: 'Shield',       free: true  },
  { key: 'star',        label: 'Excellence',   lucide: 'Star',         free: false },
  { key: 'sun',         label: 'Wellness',     lucide: 'Sun',          free: false },
  { key: 'moon',        label: 'Night shift',  lucide: 'Moon',         free: false },
  { key: 'droplet',     label: 'Blood',        lucide: 'Droplet',      free: false },
  { key: 'wind',        label: 'Respiratory',  lucide: 'Wind',         free: false },
  { key: 'scale',       label: 'Balance',      lucide: 'Scale',        free: false },
  { key: 'clock',       label: 'On-call',      lucide: 'Clock',        free: false },
  { key: 'lock',        label: 'Privacy',      lucide: 'Lock',         free: false },
  { key: 'baby',        label: 'Paediatrics',  lucide: 'Baby',         free: false },
  { key: 'user',        label: 'Patient',      lucide: 'User',         free: false },
  { key: 'users',       label: 'Team',         lucide: 'Users',        free: false },
  { key: 'map',         label: 'Global health',lucide: 'Map',          free: false },
  { key: 'book',        label: 'Knowledge',    lucide: 'Book',         free: false },
  { key: 'award',       label: 'Achievement',  lucide: 'Award',        free: false },
  { key: 'camera',      label: 'Imaging',      lucide: 'Camera',       free: false },
  { key: 'cpu',         label: 'Technology',   lucide: 'Cpu',          free: false },
]

// ── BORDERS ──────────────────────────────────────────────────
export const AVATAR_BORDERS = [
  { key: 'none',   label: 'None',   free: true,  style: 'none' },
  { key: 'gold',   label: 'Gold',   free: false, style: '3px solid #D4AF37' },
  { key: 'white',  label: 'White',  free: false, style: '3px solid #FFFFFF' },
  { key: 'coral',  label: 'Coral',  free: false, style: '3px solid #D85A30' },
  { key: 'silver', label: 'Silver', free: false, style: '3px solid #A0A0A0' },
  { key: 'pulse',  label: 'Pulse',  free: false, style: '3px dashed #1D9E75' },
]

// ── PATTERNS ─────────────────────────────────────────────────
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
export function filterByMembership(arr, isMember) {
  if (isMember) return arr
  return arr.filter(function(item) { return item.free })
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Full avatar config — 50 options, free/paid split
// [May 21, 2026] UPDATED: Replaced emoji with Lucide icon names
// [May 22, 2026] FIXED: All icons replaced with v0.303-safe Lucide names
//               Previous icons (Cross, Hospital, Biohazard etc) didn't exist
//               in lucide-react@0.303 — caused silent fallback to Stethoscope
// --- END CHANGE LOG ---
