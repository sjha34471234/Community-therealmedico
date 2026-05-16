// ============================================================
// FILE: app/seed/page.js
// PURPOSE: One-time admin page to seed tags into Supabase — delete after use
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Hoppscotch and local HTML both fail CORS on iPad.
//   Hosting this page on the same domain avoids all CORS issues.
// DEPENDENCIES: app/api/tags/seed/route.js
// ⚠️ DO NOT CHANGE: Delete this file after seeding is confirmed
// ============================================================

'use client'

import { useState } from 'react'

export default function SeedPage() {
  const [secret, setSecret] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runSeed() {
    if (!secret.trim()) {
      alert('Enter your SEED_SECRET first')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/tags/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim() }),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setStatus({ ok: true, message: `✅ Success! ${data.seeded} tags seeded into Supabase.` })
      } else {
        setStatus({ ok: false, message: `❌ Error: ${data.error || 'Something went wrong'}` })
      }
    } catch (err) {
      setStatus({ ok: false, message: `❌ Network error: ${err.message}` })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>🏷️ Seed Tags</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Enter your SEED_SECRET and tap the button.</p>
      <input
        type="text"
        placeholder="Enter SEED_SECRET"
        value={secret}
        onChange={e => setSecret(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, boxSizing: 'border-box' }}
      />
      <button
        onClick={runSeed}
        disabled={loading}
        style={{ width: '100%', padding: 14, fontSize: 16, background: loading ? '#aaa' : '#1D6FA4', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Seeding...' : 'Seed Tags Now'}
      </button>
      {status && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 8, background: status.ok ? '#e8f5e9' : '#ffebee', color: status.ok ? '#2e7d32' : '#c62828', fontSize: 15 }}>
          {status.message}
        </div>
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: One-time seed page — delete after seeding confirmed
// REASON: CORS blocked all other methods on iPad
// --- END CHANGE LOG ---
