// --- WHY THIS CODE EXISTS ---
// Page shell for /live/create — the creator Go Live flow.
// Auth guard: redirects to /auth if not logged in.
// All logic is in LiveCreator component.

// --- WHAT THIS MADE WORK ---
// Phase 18A: /live/create route

// --- PITFALLS ---
// ⚠️ WARNING: 'use client' required — camera and WebRTC are browser APIs
// ⚠️ WARNING: useEffect must be before conditional returns (Rules of Hooks)
// ⚠️ WARNING: user === undefined means auth still loading — show loading, do not redirect yet
// ⚠️ WARNING: user === null means logged out — redirect to /auth

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh creator page
// --- END CHANGE LOG ---

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import LiveCreator from '@/components/live/LiveCreator';
import '@/app/live/live.css';

export default function LiveCreatePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(function() {
    if (user === null) {
      router.replace('/auth?next=/live/create');
    }
  }, [user, router]);

  // user === undefined → auth still loading
  if (!user) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#444', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return <LiveCreator />;
}
