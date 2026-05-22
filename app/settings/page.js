// ============================================================
// FILE: app/settings/page.js
// PURPOSE: Settings page shell — tab router, auth guard, metadata
// LAST CHANGED: May 21, 2026
// WHY IT EXISTS: Entry point for /settings. Imports the four tab
//                components and switches between them. Auth-gated —
//                redirects to /auth if not logged in.
// DEPENDENCIES: components/settings/*.jsx, app/settings/settings.css,
//               store/authStore.js
// ⚠️ DO NOT CHANGE: Must have noindex metadata — private page (rule #26).
//                   Tab switching is client-side only — URL must NOT change.
//                   Page file stays as a shell — no business logic here.
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import ProfileSettings from '@/components/settings/ProfileSettings';
import MembershipSettings from '@/components/settings/MembershipSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AccountSettings from '@/components/settings/AccountSettings';
import AvatarSettings from '@/components/settings/AvatarSettings';
import '@/app/settings/settings.css';

const TABS = [
  { id: 'avatar',        label: 'Avatar' },
  { id: 'profile',       label: 'Profile' },
  { id: 'membership',    label: 'Membership' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account',       label: 'Account' },
];

export default function SettingsPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('avatar');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

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
      <nav className="settings-tabs" aria-label="Settings tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab-btn${activeTab === tab.id ? ' active' : ''}`}
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
            className={`settings-panel${activeTab === tab.id ? ' active' : ''}`}
            role="tabpanel"
          >
            {activeTab === tab.id && renderTab()}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 8 — settings page shell
// [May 21, 2026] UPDATED: Added Avatar tab — first tab, opens by default
// --- END CHANGE LOG ---
