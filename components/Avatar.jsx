// ============================================================
// FILE: components/Avatar.jsx
// PURPOSE: Renders a user avatar — shape, color, icon, border, pattern
//          Uses Lucide icons — v0.303 safe imports only
// LAST CHANGED: May 22, 2026
// DEPENDENCIES: lib/avatarConfig.js, lucide-react
// ⚠️ DO NOT CHANGE: prop name is avatarRow — NOT avatar. All callers pass avatarRow.
//                   LUCIDE_MAP must only contain v0.303-safe icon names.
//                   Fallback to AVATAR_DEFAULTS when avatarRow is null/undefined.
// ============================================================

import {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Clipboard, FlaskConical,
  Search, Zap, Shield, Star, Sun, Moon, Droplet, Wind,
  Scale, Clock, Lock, Baby, User, Users, Map, Book, Award,
  Camera, Cpu,
} from 'lucide-react'

import { getShape, getColor, getIcon, getBorder, getPattern, AVATAR_DEFAULTS } from '@/lib/avatarConfig'

const LUCIDE_MAP = {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Clipboard, FlaskConical,
  Search, Zap, Shield, Star, Sun, Moon, Droplet, Wind,
  Scale, Clock, Lock, Baby, User, Users, Map, Book, Award,
  Camera, Cpu,
}

const SIZES      = { xs: 28,  sm: 36,  md: 48,  lg: 72,  xl: 96  }
const ICON_SIZES = { xs: 13,  sm: 17,  md: 23,  lg: 34,  xl: 46  }
const INIT_SIZES = { xs: 10,  sm: 13,  md: 17,  lg: 26,  xl: 34  }

// --- WHY THIS CODE EXISTS ---
// Prop is avatarRow — NOT avatar. Every caller (AnswerItem, ReplyThread,
// QuestionCard, ProfilePage, NotificationBell, AvatarSettings) passes avatarRow.
// If this is ever renamed back to `avatar`, all avatars silently fall back to
// defaults and everyone gets the stethoscope icon regardless of their settings.
// ⚠️ WARNING: Do not rename avatarRow to avatar — it breaks all callers silently.
export default function Avatar({ avatarRow, username, size = 'md', style = {} }) {
  const px        = SIZES[size]      || SIZES.md
  const iconPx    = ICON_SIZES[size] || ICON_SIZES.md
  const initialPx = INIT_SIZES[size] || INIT_SIZES.md

  const shapeObj   = getShape(  (avatarRow && avatarRow.shape)   || AVATAR_DEFAULTS.shape   )
  const colorObj   = getColor(  (avatarRow && avatarRow.color)   || AVATAR_DEFAULTS.color   )
  const iconObj    = getIcon(   (avatarRow && avatarRow.icon)    || AVATAR_DEFAULTS.icon    )
  const borderObj  = getBorder( (avatarRow && avatarRow.border)  || AVATAR_DEFAULTS.border  )
  const patternObj = getPattern((avatarRow && avatarRow.pattern) || AVATAR_DEFAULTS.pattern )

  const iconColor  = colorObj.dark ? '#FFFFFF' : '#1A1D23'
  const initials   = username ? username.slice(0, 2).toUpperCase() : '?'

  const backgroundStyle = patternObj.style
    ? { background: patternObj.style + ', ' + colorObj.hex }
    : { backgroundColor: colorObj.hex }

  const borderStyle = borderObj.style !== 'none'
    ? { outline: borderObj.style, outlineOffset: '1px' }
    : {}

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

  const LucideIcon = iconObj ? (LUCIDE_MAP[iconObj.lucide] || null) : null

  return (
    <div style={containerStyle} aria-label={(username || 'User') + ' avatar'}>
      {LucideIcon ? (
        <LucideIcon
          size={iconPx}
          color={iconColor}
          strokeWidth={1.75}
          style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
        />
      ) : (
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
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Avatar renderer
// [May 21, 2026] UPDATED: Lucide icons, white/dark contrast logic
// [May 22, 2026] FIXED: Only v0.303-safe Lucide imports
//               Removed Cross, Hospital, Biohazard, ScanLine, Ambulance,
//               BedDouble, ShieldPlus, TestTube, Virus, FlaskRound, HeartPulse
//               — none exist in lucide-react@0.303, caused all icons to fail
// [May 22, 2026] FIXED: Prop renamed from `avatar` to `avatarRow`.
//               CAUSE: All callers pass avatarRow — the old prop name `avatar`
//               never matched, so avatarRow was always undefined, falling back
//               to AVATAR_DEFAULTS and showing stethoscope for everyone.
//               FIX: One-line change to function signature. All callers unchanged.
// --- END CHANGE LOG ---
