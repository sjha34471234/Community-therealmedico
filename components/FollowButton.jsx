// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button on profile page.
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Profile page is ISR — counts are stale after toggle.
//                On own profile: fetches live following count from API on mount.
//                On other profiles: only followerCount updates on toggle.
// DEPENDENCIES: components/FollowButton.jsx, store/authStore.js,
//               app/profile/profile.css
// ⚠️ DO NOT CHANGE: followingCount on other profiles is never updated here —
//                   it belongs to the profile being viewed, not the logged-in user.
//                   On own profile, following count is fetched live from API.
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import FollowButton from '@/components/FollowButton';
export default function ProfileFollowBlock({ targetUserId, initialFollowerCount, followingCount: initialFollowingCount }) {
  const { user } = useAuthStore();
  const isOwnProfile = user?.id === targetUserId;
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  // On own profile, fetch live following count on mount
  // because ISR cache is stale after following someone elsewhere
  useEffect(() => {
    if (!isOwnProfile || !targetUserId) return;
    async function fetchLiveFollowing() {
      try {
        const res = await fetch(
          `${window.location.origin}/api/follows?user_id=${targetUserId}&type=following`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (Array.isArray(data.following)) {
          setFollowingCount(data.following.length);
        }
      } catch (err) {
        console.error('ProfileFollowBlock following fetch error:', err);
      }
    }
    fetchLiveFollowing();
  }, [isOwnProfile, targetUserId]);
  return (
    <>
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{followerCount}</span>
          <span className="profile-stat-label">followers</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{followingCount}</span>
          <span className="profile-stat-label">following</span>
        </div>
      </div>
      <div className="profile-follow-action">
        <FollowButton
          targetUserId={targetUserId}
          initialFollowerCount={initialFollowerCount}
          onCountChange={setFollowerCount}
        />
      </div>
    </>
  );
}
// --- CHANGE LOG ---
// [May 19, 2026] CREATED: Extracted from profile page — live follower count.
// [May 19, 2026] FIXED: followingCount removed from state on other profiles —
//               was incorrectly incrementing their following count on toggle.
// [May 19, 2026] FIXED: Own profile fetches live following count from API on mount —
//               ISR cache meant your following count was stale after following someone.
// --- END CHANGE LOG ---
