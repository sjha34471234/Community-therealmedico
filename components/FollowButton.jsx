// ============================================================
// FILE: components/FollowButton.jsx
// PURPOSE: Follow/unfollow toggle button for profile pages
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Phase 9 — users can follow each other.
// DEPENDENCIES: store/authStore.js, app/api/follows/route.js
// ⚠️ DO NOT CHANGE: Button hidden on own profile — never show to self.
//                   Optimistic UI updates instantly, reverts on error.
//                   Auth-gated — shows sign in prompt if not logged in.
//                   Always uses window.location.origin in fetch (rule #22).
//                   credentials: 'include' required on all fetches (rule #22).
//                   onCountChange callback — called with server-confirmed count.
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
export default function FollowButton({ targetUserId, initialFollowerCount = 0, onCountChange }) {
  const { user, accessToken } = useAuthStore();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isOwnProfile = user?.id === targetUserId;
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
  if (isOwnProfile) return null;
  if (!user) {
    return (
      <a href="/auth" className="follow-btn follow-btn--guest">Sign in to follow</a>
    );
  }
  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const wasFollowing = following;
    const prevCount = followerCount;
    setFollowing(!wasFollowing);
    setFollowerCount(wasFollowing ? prevCount - 1 : prevCount + 1);
    if (onCountChange) onCountChange(wasFollowing ? prevCount - 1 : prevCount + 1, wasFollowing ? -1 : 1);
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
        setFollowing(wasFollowing);
        setFollowerCount(prevCount);
        if (onCountChange) onCountChange(prevCount);
        console.error('Follow toggle error:', data.error);
        return;
      }
      setFollowing(data.following);
      setFollowerCount(data.follower_count);
      if (onCountChange) onCountChange(data.follower_count, data.following ? 1 : -1);
    } catch (err) {
      setFollowing(wasFollowing);
      setFollowerCount(prevCount);
      if (onCountChange) onCountChange(prevCount, 0);
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
// [May 19, 2026] UPDATED: Added onCountChange callback prop.
// REASON: ProfileFollowBlock needs to receive the server-confirmed
//         follower count after each toggle to update the stats row live.
// --- END CHANGE LOG ---
