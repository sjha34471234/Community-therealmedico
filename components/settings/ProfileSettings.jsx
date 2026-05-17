// ============================================================
// FILE: components/settings/ProfileSettings.jsx
// PURPOSE: Profile tab — edit community_username and community_bio
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Users need to edit their profile details.
//                Posts to existing /api/profile endpoint.
// DEPENDENCIES: store/authStore.js, lib/supabase.js, react-hot-toast
// ⚠️ DO NOT CHANGE: Must use Bearer token in Authorization header —
//                   never cookies in API routes (rule #35).
//                   Must call fetchProfile after save to refresh store.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const MAX_BIO = 160;

export default function ProfileSettings() {
  const { profile, accessToken, fetchProfile, user } = useAuthStore();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (profile) {
      setUsername(profile.community_username || '');
      setBio(profile.community_bio || '');
    }
  }, [profile]);

  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  }

  async function handleSave() {
    const trimmedUsername = username.trim();
    const trimmedBio = bio.trim();

    if (!trimmedUsername) {
      showFeedback('error', 'Username cannot be empty.');
      return;
    }

    if (trimmedUsername.length < 3) {
      showFeedback('error', 'Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      showFeedback('error', 'Username can only contain letters, numbers, and underscores.');
      return;
    }

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
          community_username: trimmedUsername,
          community_bio: trimmedBio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showFeedback('error', data.error || 'Could not save. Please try again.');
        return;
      }

      await fetchProfile(user.id, accessToken);
      toast.success('Profile saved.');
      showFeedback('success', 'Your profile has been updated.');
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
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="settings-char-count">{username.length} / 30</p>
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
// REASON: Users need to edit username and bio from settings.
//         POSTs to /api/profile with Bearer token.
//         Calls fetchProfile after save to keep authStore in sync.
// --- END CHANGE LOG ---
