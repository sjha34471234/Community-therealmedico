// --- WHY THIS CODE EXISTS ---
// Client component that renders a "Message" button on profile pages.
// When clicked, creates or retrieves a DM conversation then navigates to /chat.
// --- PITFALLS ---
// ⚠️ Never show this button on your own profile — check user?.id vs targetUserId
// ⚠️ Bearer token required for POST /api/chat/dm — read from accessToken not session
// ⚠️ sessionStorage key is 'chat_open_convo' — ChatLayout reads this on mount
// ⚠️ Guests see nothing — button only renders when user exists
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — Message button for profile pages
// [May 23, 2026] FIXED: session replaced with user + accessToken from authStore
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

  if (!user) return null;
  if (user?.id === targetUserId) return null;

  async function handleMessage() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ other_user_id: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      try {
        sessionStorage.setItem('chat_open_convo', JSON.stringify(data.conversation));
      } catch {
        // sessionStorage unavailable — navigate anyway
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
