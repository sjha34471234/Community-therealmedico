// ============================================================
// FILE: lib/supabase.js
// PURPOSE: Browser-side Supabase client — default export + named createClient
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Shared Supabase browser client for all 'use client' components.
//   Phase 2 used a default export only. Phase 3 components import { createClient }
//   so this file now exports both to stay backward compatible.
// DEPENDENCIES: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
// ⚠️ DO NOT CHANGE:
//   - Client is declared at module level — never inside a component or useEffect.
//   - Never import this file in server components or API routes — use supabaseServer.js.
//   - Both the default export AND the named createClient export must stay.
//     Removing either will break components that depend on it.
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
const supabase = supabaseCreateClient(url, key)
export default supabase

// Named export — factory function (used by Phase 3+ components)
export function createClient() {
  return supabaseCreateClient(url, key)
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 2 — default export only
// [May 14, 2026] UPDATED: Phase 3 — added named createClient export
// REASON: AskForm.jsx and QuestionDetail.jsx import { createClient }.
//   Added named export to fix build error without breaking Phase 2 components.
// --- END CHANGE LOG ---
