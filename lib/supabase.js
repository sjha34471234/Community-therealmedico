// ============================================================
// FILE: lib/supabase.js
// PURPOSE: Creates and exports the Supabase browser client
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Single shared Supabase instance — never create
//               a new client inside components or useEffect
// DEPENDENCIES: NEXT_PUBLIC_SUPABASE_URL and
//               NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars
// ⚠️ DO NOT CHANGE: Client must be declared outside any function
//                   Never import from '@supabase/ssr' here —
//                   that is for server components only
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Shared Supabase client for all community features
// --- END CHANGE LOG ---
