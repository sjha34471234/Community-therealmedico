// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button on profile page.
//          Client component — updates follower count immediately after toggle.
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Profile page is a server component (ISR). The follower
//                count it renders is cached and stale after a follow/unfollow.
//                This client component owns the live count so it updates instantly.
// DEPENDENCIES: components/FollowButton.jsx, app/profile/profile.css
// ============================================================
'use client';
import { useState } from 'react';
import FollowButton from '@/components/FollowButton';
export default function ProfileFollowBlock({ targetUserId, initialFollowerCount, followingCount }) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
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
// [May 19, 2026] CREATED: Extracted from profile page to fix stale follower count.
// REASON: ISR server component can't reflect live follow state.
//         This client wrapper owns the count and updates on toggle.
// --- END CHANGE LOG ---
