// ============================================================
// FILE: app/notifications/page.js
// PURPOSE: Server shell — exports metadata, renders client component
// LAST CHANGED: May 18, 2026
// WHY IT EXISTS: Next.js 14 cannot export metadata from use client files.
//               Shell is server-only, client logic lives in NotificationsClient.
// DEPENDENCIES: components/NotificationsClient.jsx
// ⚠️ DO NOT CHANGE: This file must stay server component (no 'use client')
// ============================================================

import NotificationsClient from '@/components/NotificationsClient';
import '@/app/notifications/notifications.css';

export const metadata = {
  title: 'Notifications — The Real Medico Community',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}

// --- CHANGE LOG ---
// [May 18, 2026] CREATED: Phase 10
// [May 18, 2026] FIXED: Moved metadata to server shell, client logic to NotificationsClient
// REASON: Cannot export metadata from use client component
// --- END CHANGE LOG ---
