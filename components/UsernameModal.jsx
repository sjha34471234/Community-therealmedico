// ============================================================
// FILE: components/UsernameModal.jsx
// PURPOSE: Forces logged-in users without a community_username
//   to pick one before they can interact
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: community_username is required for posting,
//   answering, and voting. Without this modal, a user could
//   submit content with no display name, breaking AnswerCard
//   and QuestionCard rendering.
// DEPENDENCIES: store/authStore.js, lib/supabase.js,
//   react-hot-toast, app/api/profile/route.js
// ⚠️ DO NOT CHANGE: Modal must be undismissable — no close
//   button, no backdrop click to close. fetchProfile() must be
//   called after save so authStore updates immediately.
//   Save must go through /api/profile with accessToken.
//   Never use direct Supabase browser client update — RLS blocks it.
// ============================================================

'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export default function UsernameModal() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const fetchProfile = useAuthStore((state) => state.fetchProfile)

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  const shouldShow = user && profile && !profile.community_username

  if (!shouldShow) return null

  function handleChange(e) {
    setUsername(e.target.value.replace(/\s/g, ''))
  }

  async function handleSave() {
    const trimmed = username.trim()

    if (!USERNAME_REGEX.test(trimmed)) {
      toast.error('3–20 characters. Letters, numbers, underscores only.')
      return
    }

    setSaving(true)

    try {
      // Get the current session access token
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error('Session expired. Please sign in again.')
        setSaving(false)
        return
      }

      const res = await fetch(`${window.location.origin}/api/profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmed,
          accessToken: session.access_token,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Could not save username. Please try again.')
        setSaving(false)
        return
      }

      await fetchProfile(user.id)
      toast.success(`Welcome to the community, ${trimmed}!`)

    } catch (err) {
      console.error('[UsernameModal] Unexpected error:', err)
      toast.error('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(26, 29, 35, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '36px 32px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>

        <h2 style={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--text-primary)',
          margin: '0 0 8px 0',
        }}>
          Pick your community name
        </h2>
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          margin: '0 0 28px 0',
          lineHeight: 1.6,
        }}>
          This is how other members will see you. You can only set this once, so choose carefully.
        </p>

        <input
          type="text"
          value={username}
          onChange={handleChange}
          placeholder="e.g. nurse_sushant"
          maxLength={20}
          disabled={saving}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '0.95rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1.5px solid var(--bg-tertiary)',
            borderRadius: '8px',
            outline: 'none',
            color: 'var(--text-primary)',
            background: 'var(--bg-secondary)',
            boxSizing: 'border-box',
            marginBottom: '8px',
          }}
        />

        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          margin: '0 0 24px 0',
        }}>
          3–20 characters. Letters, numbers, and underscores only.
        </p>

        <button
          onClick={handleSave}
          disabled={saving || username.length < 3}
          style={{
            width: '100%',
            padding: '11px',
            fontSize: '0.95rem',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            background: saving || username.length < 3 ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
            color: saving || username.length < 3 ? 'var(--text-muted)' : '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: saving || username.length < 3 ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Set username'}
        </button>

      </div>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — username picker modal
// [May 16, 2026] UPDATED: Save goes through /api/profile route
// [May 16, 2026] FIXED: Now sends accessToken in request body
// REASON: Safari/iPad drops cookies — token auth is reliable
// --- END CHANGE LOG ---
