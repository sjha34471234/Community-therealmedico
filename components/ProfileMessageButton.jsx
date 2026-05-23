// --- WHY THIS CODE EXISTS ---
// Client component that renders a "Message" button on profile pages.
// When clicked, creates or retrieves a DM conversation then navigates to /chat.
// Must be a client component — needs session + router.
// Kept separate from the server-rendered profile page — follows modular architecture rule.

// --- WHAT THIS MADE WORK ---
// Message button on /profile/[username] → opens DM with that user in /chat
// Uses POST /api/chat/dm to create or retrieve conversation
// Stores the conversation id in sessionStorage so ChatLayout can auto-open it

// --- PITFALLS ---
// ⚠️ Never show this button on your own profile — check currentUserId vs targetUserId
// ⚠️ Bearer token required for POST /api/chat/dm
// ⚠️ sessionStorage key is 'chat_open_convo' — ChatLayout reads this on mount
// ⚠️ Guests see nothing — button only renders when session exists

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — Message button for profile pages
// --- END CHANGE LOG ---

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import useAuthStore from '@/store/authStore';

export default function ProfileMessageButton({ targetUserId }) {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Don't show if not signed in
  if (!session) return null;

  // Don't show on your own profile
  if (session?.user?.id === targetUserId) return null;

  async function handleMessage() {
    if (!session?.access_token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        credentials: 'include',
        body: JSON.stringify({ other_user_id: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Store conversation id so ChatLayout auto-opens it on mount
      try {
        sessionStorage.setItem('chat_open_convo', JSON.stringify(data.conversation));
      } catch {
        // sessionStorage may be unavailable — still navigate, user can find the DM manually
      }
      router.push('/chat');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <button
        onClick={handleMessage}
        disabled={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--accent-primary)', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'background-color 0.15s, color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
      >
        <MessageCircle size={14} />
        {loading ? 'Opening…' : 'Message'}
      </button>
      {error && <span style={{ fontSize: '11px', color: 'var(--danger)', fontFamily: 'Inter, sans-serif' }}>{error}</span>}
    </div>
  );
}
