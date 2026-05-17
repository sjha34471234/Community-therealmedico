// ============================================================
// FILE: app/profile/[username]/page.js
// PURPOSE: Public profile page — user info, karma, follower/following
//          counts, follow button, and recent questions
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Each user has a public profile at /profile/[username].
//                Updated in Phase 9 to add follower/following counts
//                and FollowButton.
// DEPENDENCIES: components/UserBadge.jsx, components/KarmaTag.jsx,
//               components/FollowButton.jsx, lib/supabaseServer.js,
//               app/profile/profile.css
// ⚠️ DO NOT CHANGE: ISR revalidate = 3600 — never force-dynamic (rule #27).
//                   UserBadge takes a profile object — NOT separate props.
//                   KarmaTag takes karma as a number — NOT an object.
//                   params is { username: string } — NOT a Promise (rule #5).
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import supabaseServer from '@/lib/supabaseServer';
import UserBadge from '@/components/UserBadge';
import KarmaTag from '@/components/KarmaTag';
import FollowButton from '@/components/FollowButton';
import '@/app/profile/profile.css';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { username } = params;
  return {
    title: `${username} — The Real Medico Community`,
    description: `View ${username}'s profile, questions, and answers on The Real Medico Community.`,
  };
}

export default async function ProfilePage({ params }) {
  const { username } = params;
  const supabase = supabaseServer();

  // ─── Fetch profile by username ──────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      community_username,
      community_bio,
      community_joined_at,
      community_flair,
      is_member
    `)
    .eq('community_username', username)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  // ─── Fetch karma ────────────────────────────────────────────
  const { data: karmaRow } = await supabase
    .from('community_karma')
    .select('total_karma')
    .eq('user_id', profile.id)
    .maybeSingle();

  const totalKarma = karmaRow?.total_karma ?? 0;

  // ─── Fetch follower count ───────────────────────────────────
  const { count: followerCount } = await supabase
    .from('community_follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  // ─── Fetch following count ──────────────────────────────────
  const { count: followingCount } = await supabase
    .from('community_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  // ─── Fetch question count ───────────────────────────────────
  const { count: questionCount } = await supabase
    .from('community_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  // ─── Fetch recent questions ─────────────────────────────────
  const { data: recentQuestions } = await supabase
    .from('community_questions')
    .select('id, slug, title, upvotes, answer_count, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const joinedDate = profile.community_joined_at
    ? new Date(profile.community_joined_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const initial = (profile.community_username || '?')[0].toUpperCase();

  return (
    <div className="profile-page">

      {/* ─── Profile header ───────────────────────────────── */}
      <div className="profile-header">

        {/* Avatar circle with initial */}
        <div className="profile-avatar-wrap">
          <div className={`profile-avatar${profile.is_member ? ' member-avatar' : ''}`}>
            {initial}
          </div>
        </div>

        {/* Info: name, bio, meta */}
        <div className="profile-info">
          <div className="profile-username-row">
            <UserBadge profile={profile} showKarma={false} />
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
              💬 <strong>{questionCount ?? 0}</strong> questions
            </span>
          </div>

          {/* Follower / following counts */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">{followerCount ?? 0}</span>
              <span className="profile-stat-label">followers</span>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <span className="profile-stat-value">{followingCount ?? 0}</span>
              <span className="profile-stat-label">following</span>
            </div>
          </div>

          {/* Follow button */}
          <div className="profile-follow-action">
            <FollowButton
              targetUserId={profile.id}
              initialFollowerCount={followerCount ?? 0}
            />
          </div>
        </div>

      </div>

      {/* ─── Karma block ──────────────────────────────────── */}
      <div className={`profile-karma-block${profile.is_member ? ' member-karma' : ''}`}>
        <KarmaTag karma={totalKarma} size="lg" />
      </div>

      {/* ─── Recent questions ──────────────────────────────── */}
      <p className="profile-section-title">Questions</p>

      {recentQuestions && recentQuestions.length > 0 ? (
        <ul className="profile-question-list">
          {recentQuestions.map((q) => (
            <li key={q.id} className="profile-question-item">
              <Link href={`/q/${q.slug}`} className="profile-question-title">
                {q.title}
              </Link>
              <div className="profile-question-meta">
                <span>{q.upvotes ?? 0} upvotes</span>
                <span>·</span>
                <span>{q.answer_count ?? 0} answers</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-empty">No questions yet.</p>
      )}

    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] UPDATED: Phase 9 — fixed prop mismatch crash
// REASON: Previous version passed wrong props to UserBadge and KarmaTag
//         causing server-side crash. UserBadge takes profile object.
//         KarmaTag takes karma as a number. Both corrected.
//         Restored original layout from Phase 7 + added follower/following
//         counts and FollowButton.
// --- END CHANGE LOG ---
