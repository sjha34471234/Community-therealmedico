// ============================================================
// FILE: components/settings/ProfileSettings.jsx
// PURPOSE: Profile tab — view username (locked) + edit community_bio
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: Users need to edit their profile bio.
//                Username is locked after creation — cannot be changed.
// DEPENDENCIES: store/authStore.js, react-hot-toast
// ⚠️ DO NOT CHANGE: Must use Bearer token in Authorization header.
//                   Must call fetchProfile after save to refresh store.
//                   Username field is intentionally disabled — never re-enable.
//                   Optimistic update applied before fetchProfile for instant UI feel.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const MAX_BIO = 160;

export default function ProfileSettings() {
  const { profile, accessToken, fetchProfile, user } = useAuthStore();

  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (profile) {
      setBio(profile.community_bio || '');
    }
  }, [profile]);

  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  }

  async function handleSave() {
    const trimmedBio = bio.trim();

    if (trimmedBio.length > MAX_BIO) {
      showFeedback('error', `Bio must be ${MAX_BIO} characters or fewer.`);
      return;
    }

    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch(`${window.location.origin}/api/profile`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          community_bio: trimmedBio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showFeedback('error', data.error || 'Could not save. Please try again.');
        return;
      }

      // Optimistic update — patch store immediately so UI reflects change instantly
      useAuthStore.setState(function(state) {
        return { profile: { ...state.profile, community_bio: trimmedBio } };
      });

      toast.success('Profile saved.');
      showFeedback('success', 'Your profile has been updated.');

      // Background sync to keep store fully in sync with DB
      fetchProfile(user.id);

    } catch (err) {
      console.error('ProfileSettings save error:', err);
      showFeedback('error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="settings-section-title">Edit profile</p>

      <div className="settings-field">
        <label className="settings-label" htmlFor="settings-username">
          Username
        </label>
        <input
          id="settings-username"
          type="text"
          className="settings-input"
          value={profile?.community_username || ''}
          disabled
          style={{ opacity: 0.6, cursor: 'not-allowed', background: 'var(--bg-secondary)' }}
        />
        <p className="settings-char-count">Username cannot be changed.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label" htmlFor="settings-bio">
          Bio
        </label>
        <textarea
          id="settings-bio"
          className="settings-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={MAX_BIO}
          placeholder="Tell the community a little about yourself…"
        />
        <p className="settings-char-count">{bio.length} / {MAX_BIO}</p>
      </div>

      <button
        className="settings-btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <div className={`settings-feedback ${feedback.type} ${feedback.message ? 'show' : ''}`}>
        {feedback.message}
      </div>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 8 — profile editing tab
// [May 19, 2026] UPDATED: Username field locked — disabled + not-allowed cursor.
// REASON: Username should be permanent after creation. Only bio is editable.
// [May 25, 2026] FIXED: Bio change now reflects immediately in UI.
// REASON: fetchProfile(user.id, accessToken) was passing wrong args and lagging.
// FIX: Optimistic store patch via useAuthStore.setState applied instantly after
//   successful save. Background fetchProfile still runs to keep DB in sync.
//   Also removed community_username from POST body — API only needs community_bio.
// --- END CHANGE LOG ---
