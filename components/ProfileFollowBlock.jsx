// ============================================================
// FILE: components/ProfileFollowBlock.jsx
// PURPOSE: Live follower/following counts + follow button + clickable dropdowns
// LAST CHANGED: May 19, 2026
// ============================================================
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import FollowButton from '@/components/FollowButton';

const BATCH_SIZE = 10;

export default function ProfileFollowBlock({ targetUserId, initialFollowerCount, initialFollowingCount }) {
  const { user } = useAuthStore();
  const isOwnProfile = user?.id === targetUserId;

  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);

  // All users fetched from API (full arrays)
  const [allFollowers, setAllFollowers] = useState([]);
  const [allFollowing, setAllFollowing] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Dropdown state
  const [openPanel, setOpenPanel] = useState(null); // 'followers' | 'following' | null
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);

  // Fetch live counts + full lists on mount
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
          setAllFollowers(followersData.followers);
          setFollowerCount(followersData.followers.length);
        }
        if (Array.isArray(followingData.following)) {
          setAllFollowing(followingData.following);
          setFollowingCount(followingData.following.length);
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('ProfileFollowBlock error:', err);
      }
    }
    fetchLiveCounts();
  }, [targetUserId]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenPanel(null);
      }
    }
    if (openPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPanel]);

  // Infinite scroll inside dropdown
  function handleDropdownScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (!nearBottom) return;
    const list = openPanel === 'followers' ? allFollowers : allFollowing;
    if (visibleCount < list.length) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, list.length));
    }
  }

  function openDropdown(panel) {
    if (openPanel === panel) { setOpenPanel(null); return; }
    setOpenPanel(panel);
    setVisibleCount(BATCH_SIZE);
  }

  const activeList = openPanel === 'followers' ? allFollowers : allFollowing;
  const visibleList = activeList.slice(0, visibleCount);
  const hasMore = visibleCount < activeList.length;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Counts row */}
      <div className="profile-stats">
        <button
          className={`profile-stat profile-stat--btn${openPanel === 'followers' ? ' profile-stat--active' : ''}`}
          onClick={() => openDropdown('followers')}
        >
          <span className="profile-stat-value">{followerCount}</span>
          <span className="profile-stat-label">followers</span>
        </button>

        <div className="profile-stat-divider" />

        <button
          className={`profile-stat profile-stat--btn${openPanel === 'following' ? ' profile-stat--active' : ''}`}
          onClick={() => openDropdown('following')}
        >
          <span className="profile-stat-value">{followingCount}</span>
          <span className="profile-stat-label">following</span>
        </button>
      </div>

      {/* Follow button */}
      {!isOwnProfile && (
        <div className="profile-follow-action">
          <FollowButton
            targetUserId={targetUserId}
            initialFollowerCount={followerCount}
            onCountChange={setFollowerCount}
          />
        </div>
      )}

      {/* Dropdown panel */}
      {openPanel && (
        <div className="follow-dropdown">
          {/* Header */}
          <div className="follow-dropdown-header">
            <span className="follow-dropdown-title">
              {openPanel === 'followers' ? 'Followers' : 'Following'}
            </span>
            <button className="follow-dropdown-close" onClick={() => setOpenPanel(null)}>✕</button>
          </div>

          {/* List */}
          <div
            className="follow-dropdown-body"
            ref={scrollRef}
            onScroll={handleDropdownScroll}
          >
            {!dataLoaded && (
              <div className="follow-dropdown-loading">Loading…</div>
            )}

            {dataLoaded && activeList.length === 0 && (
              <div className="follow-dropdown-empty">
                {openPanel === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </div>
            )}

            {dataLoaded && visibleList.map((person) => {
  const profile = person;
  if (!profile?.community_username) return null;
  const initial = (profile.community_username || '?')[0].toUpperCase();
              return (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.community_username}`}
                  className="follow-dropdown-item"
                  onClick={() => setOpenPanel(null)}
                >
                  <div className="follow-dropdown-avatar">{initial}</div>
                  <div className="follow-dropdown-info">
                    <span className={`follow-dropdown-name${profile.is_member ? ' follow-dropdown-name--member' : ''}`}>
                      {profile.is_member && '👑 '}{profile.community_username}
                    </span>
                    {profile.community_bio && (
                      <span className="follow-dropdown-bio">{profile.community_bio}</span>
                    )}
                  </div>
                </Link>
              );
            })}

            {hasMore && (
              <div className="follow-dropdown-more">Scroll for more…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 19, 2026] CREATED: Extracted from profile page — live follower count.
// [May 19, 2026] FIXED: Both follower and following counts fetched live on mount.
// [May 19, 2026] ADDED: Clickable dropdowns with batch scroll loading (10 per batch).
// --- END CHANGE LOG ---
