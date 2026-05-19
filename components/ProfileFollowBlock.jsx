// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button on profile page.
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Profile page is ISR — counts are stale on refresh.
//                Fetches live follower + following counts from API on mount.
// DEPENDENCIES: components/FollowButton.jsx, store/authStore.js,
//               app/profile/profile.css
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import FollowButton from '@/components/FollowButton';
export default function ProfileFollowBlock({ targetUserId, initialFollowerCount, initialFollowingCount }) {
  const { user } = useAuthStore();
  const isOwnProfile = user?.id === targetUserId;
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  // Fetch live counts on mount — ISR cache is always stale
  useEffect(() => {
    if (!targetUserId) return;
    async function fetchLiveCounts() {
      try {
        const [followersRes, followingRes] = await Promise.all([
          fetch(`${window.location.origin}/api/follows?user_id=${targetUserId}&type=followers`, { credentials: 'include' }),
          fetch(`${window.location.origin}/api/follows?user_id=${targetUserId}&type=following`, { credentials: 'include' }),
        ]);
        const followersData = await followersRes.json();
        const followingData = await followingRes.json();
        if (Array.isArray(followersData.followers)) {
          setFollowerCount(followersData.followers.length);
        }
        if (Array.isArray(followingData.following)) {
          setFollowingCount(followingData.following.length);
        }
      } catch (err) {
        console.error('ProfileFollowBlock live counts error:', err);
      }
    }
    fetchLiveCounts();
  }, [targetUserId]);
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
// [May 19, 2026] FIXED: Both follower and following counts fetched live on mount.
//               ISR cache was causing stale counts after refresh.
//               Both counts update on every page load regardless of who is viewing.
// --- END CHANGE LOG ---
