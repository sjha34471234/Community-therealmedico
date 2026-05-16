// ============================================================
// FILE: components/AuthPageClient.jsx
// PURPOSE: Client wrapper for the auth form on the /auth page
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: app/auth/page.js is a server component so it
//               cannot hold useState. This client component owns
//               the form state and reuses AuthModal's exact UI.
// DEPENDENCIES: lib/supabase.js, react-hot-toast
// ⚠️ DO NOT CHANGE: After sign in, redirect to / not to /auth
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AuthPageClient() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailAuth(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account created! Check your email to confirm.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
        router.push('/')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      toast.error(err.message || 'Google sign in failed.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '14px',
        padding: '2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--bg-tertiary)',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontSize: '1.25rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}
      >
        {mode === 'signin' ? 'Welcome back' : 'Join the community'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {mode === 'signin'
          ? 'Sign in to ask questions, answer, and vote.'
          : 'Create a free account to get started.'}
      </p>

      {/* Google button */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.625rem',
          padding: '0.75rem',
          border: '1px solid var(--bg-tertiary)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '1rem',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--bg-tertiary)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--bg-tertiary)' }} />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '0.65rem 0.875rem',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            style={{
              width: '100%',
              padding: '0.65rem 0.875rem',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading ? 'var(--text-muted)' : 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '0.25rem',
          }}
        >
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {/* Toggle mode */}
      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.25rem', marginBottom: 0 }}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Auth page client component
// REASON: /auth page needs a client form in a server component page
// --- END CHANGE LOG ---
