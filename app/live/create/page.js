// --- WHY THIS CODE EXISTS ---
// Page shell for /live/create — the creator Go Live flow.
// Auth guard: redirects to /auth if not logged in.
// All logic is in LiveCreator component.

// --- WHAT THIS MADE WORK ---
// Phase 18A: /live/create route

// --- PITFALLS ---
// ⚠️ WARNING: 'use client' required — camera and WebRTC are browser APIs
// ⚠️ WARNING: useEffect must be before conditional returns (Rules of Hooks)
// ⚠️ WARNING: loading === true means auth still initialising — NEVER redirect during loading
//             user is null during loading AND when logged out — must check loading first
// ⚠️ WARNING: only redirect when loading === false AND user === null (confirmed logged out)

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh creator page
// [Jun 08, 2026] FIXED: auth guard now waits for loading:false before redirecting
//                REASON: user is null while auth is initialising — premature redirect
//                sent logged-in users back to homepage via /auth
// --- END CHANGE LOG ---

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import LiveCreator from '@/components/live/LiveCreator';
import '@/app/live/live.css';

export default function LiveCreatePage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(function() {
    if (!loading && user === null) {
      router.replace('/auth?next=/live/create');
    }
  }, [user, loading, router]);

  // Auth still initialising — show blank dark screen, never redirect
  if (loading) {
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

  // Confirmed logged out — redirect is already firing via useEffect
  if (!user) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0a0a0a',
      }} />
    );
  }

  return <LiveCreator />;
}
