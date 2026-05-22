// ============================================================
// FILE: components/Avatar.jsx
// PURPOSE: Renders a user avatar — shape, color, icon, border, pattern
//          Falls back to initials if no avatar set
//          Used everywhere: answers, replies, profile, notifications
// LAST CHANGED: May 21, 2026
// DEPENDENCIES: lib/avatarConfig.js
// ============================================================

import { getShape, getColor, getIcon, getBorder, getPattern, AVATAR_DEFAULTS } from '@/lib/avatarConfig'

// size variants in px
const SIZES = {
  xs:  28,
  sm:  36,
  md:  48,
  lg:  72,
  xl:  96,
}

// icon font sizes matched to avatar size
const ICON_SIZES = {
  xs:  12,
  sm:  16,
  md:  22,
  lg:  34,
  xl:  46,
}

// initials font sizes matched to avatar size
const INITIAL_SIZES = {
  xs:  10,
  sm:  13,
  md:  17,
  lg:  26,
  xl:  34,
}

export default function Avatar({ avatar, username, size = 'md', style = {} }) {
  const px = SIZES[size] || SIZES.md
  const iconPx = ICON_SIZES[size] || ICON_SIZES.md
  const initialPx = INITIAL_SIZES[size] || INITIAL_SIZES.md

  // resolve each option — fall back to defaults if missing
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

  // initials fallback — first 2 letters of username
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '?'

  // build background — color + optional pattern on top
  const backgroundStyle = patternObj.style
    ? {
        background: patternObj.style + ', ' + colorObj.hex,
      }
    : {
        backgroundColor: colorObj.hex,
      }

  // build border
  const borderStyle = borderObj.style !== 'none'
    ? { outline: borderObj.style, outlineOffset: '1px' }
    : {}

  // build shape
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

  return (
    <div style={containerStyle} aria-label={(username || 'User') + ' avatar'}>
      {iconObj
        ? (
          <span style={{
            fontSize: iconPx + 'px',
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
            userSelect: 'none',
          }}>
            {iconObj.emoji}
          </span>
        )
        : (
          <span style={{
            fontSize: initialPx + 'px',
            fontWeight: 500,
            color: '#FFFFFF',
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
// [May 21, 2026] CREATED: Avatar renderer — shape, color, icon, border, pattern
//               Size variants: xs(28) sm(36) md(48) lg(72) xl(96)
//               Falls back to initials if no avatar data passed
// --- END CHANGE LOG ---
