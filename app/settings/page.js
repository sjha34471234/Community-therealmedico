// ============================================================
// FILE: app/settings/page.js
// LAST CHANGED: May 2026
// ============================================================
// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 8 — settings page shell
// [May 21, 2026] UPDATED: Added Avatar tab
// [May 2026]     UPDATED: Phase 13 — ModSettings added above tabs
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import ProfileSettings from '@/components/settings/ProfileSettings';
import MembershipSettings from '@/components/settings/MembershipSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AccountSettings from '@/components/settings/AccountSettings';
import AvatarSettings from '@/components/settings/AvatarSettings';
import ModSettings from '@/components/settings/ModSettings';
import '@/app/settings/settings.css';

const TABS = [
  { id: 'avatar',        label: 'Avatar' },
  { id: 'profile',       label: 'Profile' },
  { id: 'membership',    label: 'Membership' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account',       label: 'Account' },
];

export default function SettingsPage() {
  const { user, loading, profile, accessToken } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('avatar');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  // ── Admin check via GET /api/mod/promote ──
  // ⚠️ WARNING: ADMIN_USER_ID is server-only — cannot read client-side
  // 200 = admin, 403 = not admin
  useEffect(() => {
    if (!accessToken || !profile) return;
    async function checkAdmin() {
      try {
        const res = await fetch('/api/mod/promote', {
          credentials: 'include',
          headers: { 'Authorization': 'Bearer ' + accessToken },
        });
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, [accessToken, profile]);

  if (loading) {
    return (
      <div className="settings-page">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  function renderTab() {
    if (activeTab === 'avatar')        return <AvatarSettings />;
    if (activeTab === 'profile')       return <ProfileSettings />;
    if (activeTab === 'membership')    return <MembershipSettings />;
    if (activeTab === 'notifications') return <NotificationSettings />;
    if (activeTab === 'account')       return <AccountSettings />;
    return null;
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* ── Mod panel — RIGHT after heading, before everything else ── */}
      {/* Only renders for mods and admin — invisible to regular users  */}
      {(profile && (profile.is_mod || isAdmin)) && (
        <ModSettings isAdmin={isAdmin} />
      )}

      {/* ── Main settings tabs ── */}
      <nav className="settings-tabs" aria-label="Settings tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={'settings-tab-btn' + (activeTab === tab.id ? ' active' : '')}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={'settings-panel' + (activeTab === tab.id ? ' active' : '')}
            role="tabpanel"
          >
            {activeTab === tab.id && renderTab()}
          </div>
        ))}
      </div>

    </div>
  );
}
