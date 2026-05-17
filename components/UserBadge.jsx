// ============================================================
// FILE: components/UserBadge.jsx
// PURPOSE: Displays username + karma tag + Real Medico+ gold colour and crown
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Single place to control how usernames render everywhere
// DEPENDENCIES: components/KarmaTag.jsx, app/profile/profile.css
// ⚠️ DO NOT CHANGE: member-username and member-crown class names — used in profile.css
// ============================================================

import Link from 'next/link';
import KarmaTag from './KarmaTag';
import '../app/profile/profile.css';

export default function UserBadge({ profile, showKarma = false }) {
  if (!profile) return null;

  const username = profile.community_username || 'Anonymous';
  const isMember = profile.is_member === true;

  return (
    <span className="user-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <Link
        href={`/profile/${username}`}
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '0.9rem',
          color: isMember ? 'var(--member-gold)' : 'var(--accent-primary)',
          textDecoration: 'none',
        }}
      >
        {isMember && <span className="member-crown" aria-label="Real Medico+ member">👑</span>}
        {' '}{username}
      </Link>

      {isMember && (
        <span className="member-flair-badge">
          ✦ Real Medico+
        </span>
      )}

      {showKarma && profile.karma !== undefined && (
        <KarmaTag karma={profile.karma} />
      )}
    </span>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] UPDATED: Added Real Medico+ gold colour, crown icon, flair badge
// REASON: Phase 7 — member cosmetics
// --- END CHANGE LOG ---
