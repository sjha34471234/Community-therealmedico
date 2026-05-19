// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button on profile page.
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Profile page is ISR — follower count is stale after toggle.
//                This client component owns the live follower count.
// DEPENDENCIES: components/FollowButton.jsx, app/profile/profile.css
// ⚠️ DO NOT CHANGE: followingCount is NEVER updated here — it belongs to
//                   the profile being viewed, not the logged-in user.
//                   Only followerCount updates when someone follows/unfollows.
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
// [May 19, 2026] CREATED: Extracted from profile page — live follower count.
// [May 19, 2026] FIXED: Removed followingCount from state entirely.
//               followingCount shown here belongs to the profile being viewed —
//               it never changes when the logged-in user clicks Follow.
//               Only followerCount updates on toggle.
// --- END CHANGE LOG ---
