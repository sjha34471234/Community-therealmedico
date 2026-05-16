// ============================================================
// FILE: lib/supabase.js
// PURPOSE: Browser-side Supabase client — default export + named createClient
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Shared Supabase browser client for all 'use client' components.
// DEPENDENCIES: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
// ⚠️ DO NOT CHANGE:
//   - Client is declared at module level — never inside a component or useEffect.
//   - Never import this file in server components or API routes — use supabaseServer.js.
//   - Both the default export AND the named createClient export must stay.
//   - createClient() returns the shared instance — never creates a new one.
//   - Do NOT add storage: window.localStorage — window is undefined during SSR.
// ============================================================

import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
  )
}

// Default export — single shared instance (used by Phase 2 components)
const supabase = supabaseCreateClient(url, key, {
  auth: {
    persistSession: true,
    storageKey: 'community-supabase-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
export default supabase

// Named export — returns the SAME shared instance
// Never creates a new client — multiple instances cause session conflicts
export function createClient() {
  return supabase
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 2 — default export only
// [May 14, 2026] UPDATED: Phase 3 — added named createClient export
// [May 16, 2026] FIXED: Added auth persistence options
// [May 16, 2026] FIXED: Removed storage: window.localStorage — crashes SSR
// REASON: window is undefined during server-side rendering — Supabase
//   uses localStorage by default, explicit storage line not needed
// --- END CHANGE LOG ---
