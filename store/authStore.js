// ============================================================
// FILE: store/authStore.js
// PURPOSE: Global Zustand store for auth state + community profile
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Centralises auth so every component reads from
//   one place — avoids each component running its own
//   onAuthStateChange and getting out of sync
// DEPENDENCIES: lib/supabase.js (browser client), Zustand
// ⚠️ DO NOT CHANGE: Always use onAuthStateChange — never
//   getUser() or getSession() on mount. Never move the
//   supabase client inside the store function.
//   accessToken must be stored here — getSession() fails on
//   Safari/iPad so we capture the token from onAuthStateChange.
// ============================================================

import { create } from 'zustand'
import supabase from '@/lib/supabase'

const useAuthStore = create((set, get) => ({
  // --- STATE ---
  user: null,          // Supabase auth user object (or null if logged out)
  profile: null,       // Row from profiles table (includes community_username)
  loading: true,       // true until first auth event fires
  accessToken: null,   // JWT access token — captured from session on auth change

  // --- ACTIONS ---
  init: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        const accessToken = session?.access_token ?? null
        set({ user, accessToken, loading: false })
        if (user) {
          await get().fetchProfile(user.id)
        } else {
          set({ profile: null, accessToken: null })
        }
      }
    )
    return () => subscription.unsubscribe()
  },

  fetchProfile: async (userId) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, community_username, community_bio, community_joined_at, community_flair')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[authStore] fetchProfile error:', error.message)
      set({ profile: null })
      return
    }
    set({ profile: data })
  },
}))

export default useAuthStore
export { useAuthStore }

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — central auth store
// [May 16, 2026] UPDATED: Added accessToken to state
// REASON: Safari/iPad blocks getSession() — token must be
//   captured from onAuthStateChange and stored in Zustand
// --- END CHANGE LOG ---
