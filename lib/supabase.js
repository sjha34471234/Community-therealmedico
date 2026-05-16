// ============================================================
// FILE: lib/supabase.js
// PURPOSE: Browser-side Supabase client — default export + named createClient
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Shared Supabase browser client for all 'use client' components.
// DEPENDENCIES: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
// ⚠️ DO NOT CHANGE:
//   - Client declared at module level — never inside a component or useEffect.
//   - Never import in server components or API routes — use supabaseServer.js.
//   - Both default AND named createClient export must stay.
//   - createClient() returns the shared instance — never creates a new one.
//   - Do NOT add custom storageKey — breaks existing sessions.
//   - Do NOT add storage: window.localStorage — crashes SSR.
// ============================================================

import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
  )
}

// Single shared instance — session persists across refreshes by default
const supabase = supabaseCreateClient(url, key)

export default supabase

// Named export — returns the SAME shared instance
// Never creates a new client — multiple instances cause session conflicts
export function createClient() {
  return supabase
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 2 — default export only
// [May 14, 2026] UPDATED: Phase 3 — added named createClient export
// [May 16, 2026] FIXED: createClient() now returns shared instance
// REASON: Multiple instances caused session conflicts on sign out
// [May 16, 2026] REVERTED: Removed custom auth options
// REASON: Custom storageKey broke existing sessions, window.localStorage
//   crashed SSR. Supabase default config handles persistence correctly.
// --- END CHANGE LOG ---
