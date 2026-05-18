// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button on profile page.
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Profile page is ISR — counts are stale after toggle.
//                This client component owns both counts live.
// DEPENDENCIES: components/FollowButton.jsx, app/profile/profile.css
// ============================================================
'use client';
import { useState } from 'react';
import FollowButton from '@/components/FollowButton';
export default function ProfileFollowBlock({ targetUserId, initialFollowerCount, followingCount: initialFollowingCount }) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  function handleCountChange(newFollowerCount, delta) {
    setFollowerCount(newFollowerCount);
    setFollowingCount((prev) => prev + delta);
  }
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
          onCountChange={handleCountChange}
        />
      </div>
    </>
  );
}
// --- CHANGE LOG ---
// [May 19, 2026] CREATED: Extracted from profile page — live follower count.
// [May 19, 2026] UPDATED: followingCount also put in state — was stale after toggle.
// --- END CHANGE LOG ---
