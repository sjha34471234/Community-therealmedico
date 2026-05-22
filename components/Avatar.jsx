// ============================================================
// FILE: components/Avatar.jsx
// PURPOSE: Renders a user avatar — shape, color, icon, border, pattern
//          Uses Lucide icons — no emoji
//          Icon color: white on dark bg, dark on light bg
// LAST CHANGED: May 21, 2026
// DEPENDENCIES: lib/avatarConfig.js, lucide-react
// ============================================================

import {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Cross, Hospital, FlaskConical,
  Biohazard, ClipboardList, Baby, Accessibility, Radiation,
  FlaskRound, HeartPulse, Bandage, ScanLine, Ambulance,
  BedDouble, ShieldPlus, TestTube, Scale, Wind, Virus,
} from 'lucide-react'

import { getShape, getColor, getIcon, getBorder, getPattern, AVATAR_DEFAULTS } from '@/lib/avatarConfig'

// Map lucide name string → component
const LUCIDE_MAP = {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Cross, Hospital, FlaskConical,
  Biohazard, ClipboardList, Baby, Accessibility, Radiation,
  FlaskRound, HeartPulse, Bandage, ScanLine, Ambulance,
  BedDouble, ShieldPlus, TestTube, Scale, Wind, Virus,
  Tablets: Pill, // fallback — Tablets may not exist in v0.303
  PillBottle: Pill, // fallback
}

const SIZES = {
  xs: 28, sm: 36, md: 48, lg: 72, xl: 96,
}

const ICON_SIZES = {
  xs: 13, sm: 17, md: 23, lg: 34, xl: 46,
}

const INITIAL_SIZES = {
  xs: 10, sm: 13, md: 17, lg: 26, xl: 34,
}

export default function Avatar({ avatar, username, size = 'md', style = {} }) {
  const px         = SIZES[size]         || SIZES.md
  const iconPx     = ICON_SIZES[size]    || ICON_SIZES.md
  const initialPx  = INITIAL_SIZES[size] || INITIAL_SIZES.md

  const shapeKey   = (avatar && avatar.shape)   || AVATAR_DEFAULTS.shape
  const colorKey   = (avatar && avatar.color)   || AVATAR_DEFAULTS.color
  const iconKey    = (avatar && avatar.icon)    || AVATAR_DEFAULTS.icon
  const borderKey  = (avatar && avatar.border)  || AVATAR_DEFAULTS.border
  const patternKey = (avatar && avatar.pattern) || AVATAR_DEFAULTS.pattern

  const shapeObj   = getShape(shapeKey)
  const colorObj   = getColor(colorKey)
  const iconObj    = getIcon(iconKey)
  const borderObj  = getBorder(borderKey)
  const patternObj = getPattern(patternKey)

  // Icon color — white on dark backgrounds, near-black on light
  const iconColor = colorObj.dark ? '#FFFFFF' : '#1A1D23'

  // Initials fallback
  const initials = username ? username.slice(0, 2).toUpperCase() : '?'

  // Background — color + optional pattern
  const backgroundStyle = patternObj.style
    ? { background: patternObj.style + ', ' + colorObj.hex }
    : { backgroundColor: colorObj.hex }

  // Border
  const borderStyle = borderObj.style !== 'none'
    ? { outline: borderObj.style, outlineOffset: '1px' }
    : {}

  // Shape
  const shapeStyle = shapeObj.clipPath
    ? { clipPath: shapeObj.clipPath, borderRadius: '0' }
    : { borderRadius: shapeObj.borderRadius }

  const containerStyle = {
    width: px + 'px',
    height: px + 'px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    ...backgroundStyle,
    ...shapeStyle,
    ...borderStyle,
    ...style,
  }

  // Resolve Lucide component
  const LucideIcon = iconObj ? LUCIDE_MAP[iconObj.lucide] : null

  return (
    <div style={containerStyle} aria-label={(username || 'User') + ' avatar'}>
      {LucideIcon
        ? (
          <LucideIcon
            size={iconPx}
            color={iconColor}
            strokeWidth={1.75}
            style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
          />
        )
        : (
          <span style={{
            fontSize: initialPx + 'px',
            fontWeight: 500,
            color: iconColor,
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
            letterSpacing: '0.03em',
            userSelect: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            {initials}
          </span>
        )
      }
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Avatar renderer
// [May 21, 2026] UPDATED: Replaced emoji with Lucide icons
//               Icon color auto-switches: white on dark bg, dark on light bg
//               LUCIDE_MAP resolves string name → component reference
//               Fallbacks for icons not in lucide-react v0.303
// --- END CHANGE LOG ---
