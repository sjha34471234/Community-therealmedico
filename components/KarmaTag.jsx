// ============================================================
// FILE: components/KarmaTag.jsx
// PURPOSE: Displays a user's karma score + milestone badge
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Profile page needs a visual karma display
// DEPENDENCIES: lib/karma.js (getMilestone, KARMA_MILESTONES)
// ⚠️ DO NOT CHANGE: No 'use client' — this is a server-safe
//                   display component. Keep it pure display.
// ============================================================

import { getMilestone } from '@/lib/karma'

// ---
// KarmaTag({ karma, size })
// karma — integer, the user's total karma score
// size  — 'sm' | 'md' | 'lg' (default: 'md')
// ---
export default function KarmaTag({ karma = 0, size = 'md' }) {
  const milestone = getMilestone(karma)

  const sizeStyles = {
    sm: { score: 'text-xs', badge: 'text-xs px-2 py-0.5', emoji: 'text-sm' },
    md: { score: 'text-sm', badge: 'text-sm px-2.5 py-1', emoji: 'text-base' },
    lg: { score: 'text-base', badge: 'text-base px-3 py-1.5', emoji: 'text-lg' },
  }

  const s = sizeStyles[size] || sizeStyles.md

  return (
    <div className="flex flex-col items-center gap-1.5">

      {/* Karma score */}
      <div className="flex items-center gap-1">
        <span
          className={`font-bold ${s.score}`}
          style={{ color: 'var(--accent-primary)' }}
        >
          {karma.toLocaleString()}
        </span>
        <span
          className={`${s.score}`}
          style={{ color: 'var(--text-muted)' }}
        >
          karma
        </span>
      </div>

      {/* Milestone badge — only shown if user has at least 1 karma */}
      {milestone && (
        <div
          className={`flex items-center gap-1.5 rounded-full font-medium ${s.badge}`}
          style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)',
          }}
        >
          <span className={s.emoji}>{milestone.emoji}</span>
          <span>{milestone.label}</span>
        </div>
      )}

      {/* No badge yet */}
      {!milestone && (
        <span
          className={`${s.score}`}
          style={{ color: 'var(--text-muted)' }}
        >
          No badge yet
        </span>
      )}

    </div>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Phase 5 — karma display component
// REASON: Profile page needs karma score + milestone badge display
// --- END CHANGE LOG ---
