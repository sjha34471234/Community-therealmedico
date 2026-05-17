// ============================================================
// FILE: components/FollowButton.jsx
// PURPOSE: Follow/unfollow toggle button for profile pages
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Phase 9 — users can follow each other.
//                Encapsulates follow state, optimistic UI, and API call.
// DEPENDENCIES: store/authStore.js, app/api/follows/route.js
// ⚠️ DO NOT CHANGE: Button is hidden on own profile — never show to self.
//                   Optimistic UI updates instantly, reverts on error.
//                   Auth-gated — shows sign in prompt if not logged in.
//                   Always uses window.location.origin in fetch (rule #22).
//                   credentials: 'include' required on all fetches (rule #22).
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';

export default function FollowButton({ targetUserId, initialFollowerCount = 0 }) {
  const { user, accessToken } = useAuthStore();

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isOwnProfile = user?.id === targetUserId;

  // Check current follow status on mount
  useEffect(() => {
    if (!user || isOwnProfile || !targetUserId) {
      setLoading(false);
      return;
    }

    async function checkFollowStatus() {
      try {
        const res = await fetch(
          `${window.location.origin}/api/follows?follower_id=${user.id}&following_id=${targetUserId}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        setFollowing(data.following ?? false);
      } catch (err) {
        console.error('FollowButton status check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkFollowStatus();
  }, [user, targetUserId, isOwnProfile]);

  // Don't render anything on own profile
  if (isOwnProfile) return null;

  // Not logged in — show prompt
  if (!user) {
    return (
      <a href="/auth" className="follow-btn follow-btn--guest">
        Sign in to follow
      </a>
    );
  }

  async function handleToggle() {
    if (busy) return;
    setBusy(true);

    // Optimistic update
    const wasFollowing = following;
    const prevCount = followerCount;
    setFollowing(!wasFollowing);
    setFollowerCount(wasFollowing ? prevCount - 1 : prevCount + 1);

    try {
      const res = await fetch(`${window.location.origin}/api/follows`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ following_id: targetUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert on error
        setFollowing(wasFollowing);
        setFollowerCount(prevCount);
        console.error('Follow toggle error:', data.error);
        return;
      }

      // Sync with server truth
      setFollowing(data.following);
      setFollowerCount(data.follower_count);

    } catch (err) {
      // Revert on network error
      setFollowing(wasFollowing);
      setFollowerCount(prevCount);
      console.error('FollowButton toggle error:', err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <button className="follow-btn follow-btn--loading" disabled>…</button>;
  }

  return (
    <button
      className={`follow-btn ${following ? 'follow-btn--following' : 'follow-btn--follow'}`}
      onClick={handleToggle}
      disabled={busy}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 9 — follow/unfollow button
// REASON: Profile pages need a follow toggle. Optimistic UI gives
//         instant feedback. Hidden on own profile. Auth-gated.
// --- END CHANGE LOG ---
