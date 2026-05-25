// ============================================================
// FILE: components/AuthModal.jsx
// PURPOSE: Auth modal — Google OAuth + email/password sign in and sign up
// LAST CHANGED: May 25, 2026
// WHY IT EXISTS: Central auth entry point for all sign in/sign up flows.
//   Triggered from any page. Redirects back to the page the user was on.
// DEPENDENCIES: lib/supabase.js, zustand authStore, react-hot-toast
// ⚠️ DO NOT CHANGE:
//   - redirectTo must point to /auth/callback — not /auth/confirm directly.
//   - Never hardcode the origin — use window.location.origin.
//   - Never import authStore here for sign in — supabase.auth handles it.
//   - onAuthStateChange in authStore picks up the session automatically.
// ============================================================
'use client'

import { useState } from 'react'
import supabase from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function getRedirectTo() {
    return window.location.origin + '/auth/callback?next=' + encodeURIComponent(window.location.pathname)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectTo(),
      },
    })
    if (error) {
      toast.error('Google sign in failed. Please try again.')
      setLoading(false)
    }
    // No need to close modal — page will redirect to Google
  }

  async function handleEmail() {
    if (!email || !password) {
      toast.error('Please enter your email and password.')
      return
    }
    setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectTo(),
        },
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Check your email to confirm your account.')
      onClose()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Signed in!')
      onClose()
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }} onClick={function(e) { e.stopPropagation() }}>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          {mode === 'signin' ? 'Sign in to The Real Medico' : 'Create your account'}
        </h2>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1.5px solid var(--bg-tertiary)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--bg-tertiary)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--bg-tertiary)' }} />
        </div>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={function(e) { setEmail(e.target.value) }}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1.5px solid var(--bg-tertiary)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }} />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={function(e) { setPassword(e.target.value) }}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1.5px solid var(--bg-tertiary)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }} />

        {/* Submit */}
        <button
          onClick={handleEmail}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent-primary)',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {/* Toggle mode */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={function() { setMode(mode === 'signin' ? 'signup' : 'signin') }}
            style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </span>
        </p>

        {/* Close */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: 0, cursor: 'pointer' }} onClick={onClose}>
          Cancel
        </p>

      </div>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Auth modal with Google + email/password
// [May 25, 2026] FIXED: Complete rewrite — previous file was corrupted
//   (iPad clipboard had pasted authStore.js contents into this file by mistake)
//   causing all new user sign-ins to silently fail.
// REASON: Google OAuth redirectTo now correctly points to /auth/callback
//   which hands the code to /auth/confirm (client page) for session exchange.
//   Redirect returns user to the exact page they were on when they signed in.
// --- END CHANGE LOG ---
