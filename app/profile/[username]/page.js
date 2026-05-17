// ============================================================
// FILE: app/profile/[username]/page.js
// PURPOSE: Public profile page — shows user info, karma, questions
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Phase 7 — profile page with Real Medico+ cosmetics
// DEPENDENCIES: profile.css, lib/supabaseServer.js, components/QuestionCard.jsx
// ⚠️ DO NOT CHANGE: revalidate = 3600 — never force-dynamic on this page
// ============================================================

import '../profile.css';
import { supabaseServer } from '../../../lib/supabaseServer';
import QuestionCard from '../../../components/QuestionCard';
import { getMilestone } from '../../../lib/karma';
import Link from 'next/link';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { username } = params;
  return {
    title: `${username} — The Real Medico Community`,
    description: `View ${username}'s profile, karma, and questions on The Real Medico Community.`,
  };
}

export default async function ProfilePage({ params }) {
  const { username } = params;
  const db = supabaseServer();

  // Fetch profile by community_username
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, community_username, community_bio, community_joined_at, community_flair, is_member')
    .eq('community_username', username)
    .single();

  if (profileError || !profile) {
    return (
      <div className="profile-page">
        <p className="profile-empty">User not found.</p>
        <p style={{ textAlign: 'center', marginTop: '8px' }}>
          <Link href="/" style={{ color: 'var(--accent-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>Back to feed</Link>
        </p>
      </div>
    );
  }

  // Fetch karma
  const { data: karmaRow } = await db
    .from('community_karma')
    .select('total_karma')
    .eq('user_id', profile.id)
    .single();

  const totalKarma = karmaRow?.total_karma || 0;
  const milestone = getMilestone(totalKarma);

  // Fetch questions by this user
  const { data: questions } = await db
    .from('community_questions')
    .select('id, slug, title, tags, upvotes, answer_count, is_answered, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const isMember = profile.is_member === true;
  const joinedDate = profile.community_joined_at
    ? new Date(profile.community_joined_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  const initial = (profile.community_username || 'U')[0].toUpperCase();

  return (
    <div className="profile-page">

      {/* ── Header ── */}
      <div className="profile-header">

        {/* Avatar */}
        <div className="profile-avatar-wrap">
          <div className={`profile-avatar${isMember ? ' member-avatar' : ''}`}>
            {initial}
          </div>
        </div>

        {/* Info */}
        <div className="profile-info">

          <div className="profile-username-row">
            <span className={`profile-username${isMember ? ' member-username' : ''}`}>
              {isMember && <span className="member-crown" aria-label="Real Medico+ member">👑</span>}
              {' '}{profile.community_username}
            </span>
            {isMember && (
              <span className="member-flair-badge">✦ Real Medico+</span>
            )}
          </div>

          {profile.community_bio && (
            <p className="profile-bio">{profile.community_bio}</p>
          )}

          <div className="profile-meta">
            {joinedDate && (
              <span className="profile-meta-item">
                📅 Joined {joinedDate}
              </span>
            )}
            <span className="profile-meta-item">
              💬 <strong>{questions?.length || 0}</strong> questions
            </span>
          </div>

        </div>
      </div>

      {/* ── Karma Block ── */}
      <div className={`profile-karma-block${isMember ? ' member-karma' : ''}`}>
        <div>
          <div className="profile-karma-score">{totalKarma.toLocaleString()}</div>
          <div className="profile-karma-label">karma</div>
        </div>
        {milestone && (
          <div className="profile-karma-milestone">
            {milestone.badge} {milestone.label}
          </div>
        )}
      </div>

      {/* ── Questions ── */}
      <div className="profile-section-title">Questions</div>

      {questions && questions.length > 0 ? (
        questions.map(q => (
          <QuestionCard key={q.id} question={q} profile={profile} />
        ))
      ) : (
        <p className="profile-empty">No questions yet.</p>
      )}

    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Full profile page with Real Medico+ cosmetics
// REASON: Phase 7 — profile page, gold avatar border, flair badge, karma block
// --- END CHANGE LOG ---
