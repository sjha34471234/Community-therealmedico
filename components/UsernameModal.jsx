// ============================================================
// FILE: components/UsernameModal.jsx
// PURPOSE: Forces logged-in users without a community_username
//   to pick one before they can interact
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: community_username is required for posting,
//   answering, and voting. Without this modal, a user could
//   submit content with no display name, breaking AnswerCard
//   and QuestionCard rendering.
// DEPENDENCIES: store/authStore.js, lib/supabase.js,
//   react-hot-toast, lucide-react
// ⚠️ DO NOT CHANGE: Modal must be undismissable — no close
//   button, no backdrop click to close. fetchProfile() must be
//   called after save so authStore updates immediately.
//   Username validation must match the rules below exactly.
// ============================================================

'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import supabase from '@/lib/supabase'

// Username rules:
// 3–20 characters, letters/numbers/underscores only, no spaces
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export default function UsernameModal() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const fetchProfile = useAuthStore((state) => state.fetchProfile)

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  // Only show if logged in and no username set yet
  // Also hide while profile is still loading (profile === null and user exists)
  const shouldShow = user && profile && !profile.community_username

  if (!shouldShow) return null

  function handleChange(e) {
    // Strip spaces immediately as user types
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
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('community_username', trimmed)
        .maybeSingle()

      if (existing) {
        toast.error('That username is already taken. Try another.')
        setSaving(false)
        return
      }

      // Save username + set joined_at
      const { error } = await supabase
        .from('profiles')
        .update({
          community_username: trimmed,
          community_joined_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        toast.error('Could not save username. Please try again.')
        setSaving(false)
        return
      }

      // Refresh authStore profile so modal hides and rest of app updates
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

        {/* Header */}
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

        {/* Input */}
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

        {/* Hint */}
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          margin: '0 0 24px 0',
        }}>
          3–20 characters. Letters, numbers, and underscores only.
        </p>

        {/* Save button */}
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
// REASON: Users need a community_username before interacting.
//   Modal is undismissable to enforce this soft gate.
// --- END CHANGE LOG ---
