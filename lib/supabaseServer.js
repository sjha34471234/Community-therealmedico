// ============================================================
// FILE: lib/supabaseServer.js
// PURPOSE: Server-side Supabase client — service role, bypasses RLS
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: API routes and server components need a Supabase client
//   that runs on the server. The browser client (lib/supabase.js) cannot
//   be used in server components. This uses the service role key so it
//   can read/write without RLS restrictions — use carefully.
// DEPENDENCIES: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
// ⚠️ DO NOT CHANGE:
//   - Never import this file in a 'use client' component.
//   - Always use SUPABASE_SERVICE_ROLE_KEY here, never NEXT_PUBLIC_ keys.
//   - supabaseServer is a getter function — call it as supabaseServer()
//     inside route handlers and server components, never at module level.
// ============================================================

import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase server env vars. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// supabaseServer is a function — call it inside your route handlers:
// const db = supabaseServer()
// const { data } = await db.from('profiles').select('*')
export const supabaseServer = createServerClient

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// [May 16, 2026] FIXED: Removed Proxy — chained Supabase calls broke silently
// REASON: Proxy only intercepts first method call, breaking .from().select().eq()
//         Now exports createServerClient directly as supabaseServer
// --- END CHANGE LOG ---
