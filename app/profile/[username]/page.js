// ============================================================
// FILE: app/profile/[username]/page.js
// PURPOSE: Public profile page — shows user info, karma, stats,
//          follower/following counts, follow button, and recent posts
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Each user has a public profile at /profile/[username].
//                Updated in Phase 9 to add follower/following counts
//                and FollowButton.
// DEPENDENCIES: components/UserBadge.jsx, components/KarmaTag.jsx,
//               components/FollowButton.jsx, lib/supabaseServer.js,
//               app/profile/profile.css
// ⚠️ DO NOT CHANGE: ISR revalidate = 3600 — never force-dynamic (rule #27).
//                   Follower/following counts fetched server-side for SEO.
//                   FollowButton is client-side only — hydrates after load.
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

  return (
    <div className="profile-page">

      {/* ─── Profile card ─────────────────────────────────── */}
      <div className={`profile-card ${profile.is_member ? 'profile-card--member' : ''}`}>

        {/* Avatar */}
        <div className={`profile-avatar ${profile.is_member ? 'profile-avatar--member' : ''}`}>
          {(profile.community_username || '?')[0].toUpperCase()}
        </div>

        {/* Name + flair */}
        <div className="profile-identity">
          <UserBadge
            username={profile.community_username}
            isMember={profile.is_member}
            flair={profile.community_flair}
            size="large"
          />
          {profile.community_bio && (
            <p className="profile-bio">{profile.community_bio}</p>
          )}
        </div>

        {/* Follow button — client component, hydrates after load */}
        <div className="profile-follow-action">
          <FollowButton
            targetUserId={profile.id}
            initialFollowerCount={followerCount ?? 0}
          />
        </div>

        {/* Stats row */}
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
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <span className="profile-stat-value">{questionCount ?? 0}</span>
            <span className="profile-stat-label">questions</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <KarmaTag karma={totalKarma} />
          </div>
        </div>

        {/* Joined date */}
        {joinedDate && (
          <p className="profile-joined">Joined {joinedDate}</p>
        )}

      </div>

      {/* ─── Recent questions ──────────────────────────────── */}
      {recentQuestions && recentQuestions.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title">Recent questions</h2>
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
        </div>
      )}

    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] UPDATED: Phase 9 — added follower/following counts + FollowButton
// REASON: Phase 9 follow system requires counts on profile page.
//         Counts fetched server-side for SEO. FollowButton hydrates client-side.
// --- END CHANGE LOG ---
