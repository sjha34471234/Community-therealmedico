// ============================================================
// FILE: app/profile/[username]/page.js
// PURPOSE: Public profile page — user info, karma, follower/following
//          counts, follow button, and recent questions
// LAST CHANGED: May 22, 2026
// WHY IT EXISTS: Each user has a public profile at /profile/[username].
// DEPENDENCIES: components/UserBadge.jsx, components/KarmaTag.jsx,
//               components/ProfileFollowBlock.jsx, components/Avatar.jsx,
//               lib/supabaseServer.js, app/profile/profile.css
// ⚠️ DO NOT CHANGE: ISR revalidate = 60 — never force-dynamic (rule #27).
//                   UserBadge takes a profile object — NOT separate props.
//                   KarmaTag takes karma as a number — NOT an object.
//                   params is { username: string } — NOT a Promise (rule #5).
//                   ProfileFollowBlock is client — owns live follower count.
//                   Avatar size="lg" = 72px. avatarRow comes from
//                   community_avatars table — falls back to null safely.
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import UserBadge from '@/components/UserBadge';
import KarmaTag from '@/components/KarmaTag';
import ProfileFollowBlock from '@/components/ProfileFollowBlock';
import Avatar from '@/components/Avatar';
import '@/app/profile/profile.css';

export const revalidate = 60;

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

  // --- WHY THIS CODE EXISTS ---
  // Fetch the profile row. is_member MUST be included — missing it breaks
  // avatar tier gating, member gold usernames, and all membership checks.
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

  // --- WHY THIS CODE EXISTS ---
  // Fetch this user's avatar row from community_avatars.
  // Every user has a row (created by trigger on signup, backfilled May 22).
  // avatarRow will be null only if the trigger failed — Avatar handles null safely.
  const { data: avatarRow } = await supabase
    .from('community_avatars')
    .select('shape, color, icon, border, pattern')
    .eq('user_id', profile.id)
    .maybeSingle();

  const { data: karmaRow } = await supabase
    .from('community_karma')
    .select('total_karma')
    .eq('user_id', profile.id)
    .maybeSingle();

  const totalKarma = karmaRow?.total_karma ?? 0;

  const { count: followerCount } = await supabase
    .from('community_follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  const { count: followingCount } = await supabase
    .from('community_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  const { count: questionCount } = await supabase
    .from('community_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

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

      <div className="profile-header">

        {/* --- WHY THIS CODE EXISTS ---
            Replaced the old letter-initial div with the real Avatar component.
            size="lg" = 72px as defined in Avatar.jsx and avatarConfig.js.
            avatarRow passes the 5 stored keys (shape, color, icon, border, pattern).
            isMember passed so Avatar renders member-only options correctly.
            username passed so Avatar can show the fallback initial if avatarRow is null. */}
        <div className="profile-avatar-wrap">
          <Avatar
            avatarRow={avatarRow}
            username={profile.community_username}
            isMember={profile.is_member}
            size="lg"
          />
        </div>

        <div className="profile-info">
          <div className="profile-username-row">
            <UserBadge profile={profile} showKarma={false} />
          </div>

          {profile.community_bio && (
            <p className="profile-bio">{profile.community_bio}</p>
          )}

          <div className="profile-meta">
            {joinedDate && (
              <span className="profile-meta-item">📅 Joined {joinedDate}</span>
            )}
            <span className="profile-meta-item">
              💬 <strong>{questionCount ?? 0}</strong> questions
            </span>
          </div>

          <ProfileFollowBlock
            targetUserId={profile.id}
            initialFollowerCount={followerCount ?? 0}
            followingCount={followingCount ?? 0}
          />
        </div>
      </div>

      <div className={`profile-karma-block${profile.is_member ? ' member-karma' : ''}`}>
        <KarmaTag karma={totalKarma} size="lg" />
      </div>

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
// [May 19, 2026] UPDATED: Replaced inline stats+FollowButton with ProfileFollowBlock.
// REASON: ISR cache meant follower count never updated after a follow/unfollow.
//         ProfileFollowBlock is a client component that owns the live count.
// [May 22, 2026] UPDATED: Avatar system wired in.
// REASON: Profile page was showing a letter-initial placeholder div instead of the
//         real Avatar component. Added community_avatars fetch (avatarRow) and
//         replaced the old div with <Avatar size="lg" />.
//         Removed the old `initial` variable — no longer needed.
// --- END CHANGE LOG ---
