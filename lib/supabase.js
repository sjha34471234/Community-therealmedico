// ============================================================
// FILE: lib/supabase.js
// PURPOSE: Browser-side Supabase client — default export + named createClient
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Shared Supabase browser client for all 'use client' components.
//   Phase 2 used a default export only. Phase 3 components import { createClient }
//   so this file now exports both to stay backward compatible.
// DEPENDENCIES: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
// ⚠️ DO NOT CHANGE:
//   - Client is declared at module level — never inside a component or useEffect.
//   - Never import this file in server components or API routes — use supabaseServer.js.
//   - Both the default export AND the named createClient export must stay.
//   - auth.persistSession must stay true — required for session to survive refresh.
//   - storageKey must stay as 'community-supabase-auth' — changing it will log
//     all users out by making the stored session unreadable.
// ============================================================

import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
  )
}

const supabaseOptions = {
  auth: {
    persistSession: true,
    storageKey: 'community-supabase-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}

// Default export — single shared instance (used by Phase 2 components)
const supabase = supabaseCreateClient(url, key, supabaseOptions)
export default supabase

// Named export — factory function (used by Phase 3+ components)
// Returns the SAME shared instance — never creates a new one.
// This is critical — multiple instances cause session conflicts.
export function createClient() {
  return supabase
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 2 — default export only
// [May 14, 2026] UPDATED: Phase 3 — added named createClient export
// [May 16, 2026] FIXED: Added auth persistence options
// REASON: Session was not surviving page refresh — Chrome on iPad
//   needs explicit persistSession + localStorage config to restore
//   the session after reload. createClient now returns the shared
//   instance instead of creating a new one — prevents session conflicts.
// --- END CHANGE LOG ---
