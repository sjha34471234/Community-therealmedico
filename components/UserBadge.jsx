// ============================================================
// FILE: components/UserBadge.jsx
// PURPOSE: Displays a user's community username + flair badge
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: Username display is needed in AnswerCard,
//   QuestionCard, and future profile pages. Centralising it
//   here means member gold styling is applied consistently
//   everywhere from one place.
// DEPENDENCIES: None — pure display component
// ⚠️ DO NOT CHANGE: Member gold colour must use --member-gold
//   CSS variable. Anonymous fallback must always show safely.
//   Never add 'use client' — this is a server-safe display component.
// ============================================================

export default function UserBadge({ username, flair, isMember = false, size = 'md' }) {

  // Fallback if no username set yet
  const displayName = username ?? 'Anonymous User'

  const sizeStyles = {
    sm: { fontSize: '0.78rem', flairSize: '0.65rem' },
    md: { fontSize: '0.88rem', flairSize: '0.72rem' },
    lg: { fontSize: '1.05rem', flairSize: '0.78rem' },
  }

  const { fontSize, flairSize } = sizeStyles[size] ?? sizeStyles.md

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

      {/* Username */}
      <span style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        fontSize,
        color: isMember ? 'var(--member-gold)' : 'var(--text-primary)',
        letterSpacing: '-0.01em',
      }}>
        {isMember && (
          <span style={{ marginRight: '3px' }} aria-label="Real Medico+ member">👑</span>
        )}
        {displayName}
      </span>

      {/* Flair badge — only shown if flair is set */}
      {flair && (
        <span style={{
          display: 'inline-block',
          fontSize: flairSize,
          fontWeight: 500,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: isMember ? 'var(--member-gold)' : 'var(--accent-primary)',
          background: isMember ? 'var(--member-bg)' : 'var(--accent-light)',
          border: `1px solid ${isMember ? 'var(--member-border)' : 'var(--accent-primary)'}`,
          borderRadius: '4px',
          padding: '1px 6px',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        }}>
          {flair}
        </span>
      )}

    </span>
  )
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — username + flair display
// REASON: Consistent username rendering across all cards and pages
// --- END CHANGE LOG ---
