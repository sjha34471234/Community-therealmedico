// ============================================================
// FILE: store/authStore.js
// PURPOSE: Global Zustand store for auth state + community profile
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: Centralises auth so every component reads from
//   one place — avoids each component running its own
//   onAuthStateChange and getting out of sync
// DEPENDENCIES: lib/supabase.js (browser client), Zustand
// ⚠️ DO NOT CHANGE: Always use onAuthStateChange — never
//   getUser() or getSession() on mount. Never move the
//   supabase client inside the store function.
// ============================================================

import { create } from 'zustand'
import supabase from '@/lib/supabase'

const useAuthStore = create((set, get) => ({

  // --- STATE ---
  user: null,          // Supabase auth user object (or null if logged out)
  profile: null,       // Row from profiles table (includes community_username)
  loading: true,       // true until first auth event fires

  // --- ACTIONS ---

  // Call once at app level (in layout.js or a top-level client component)
  // Sets up the listener that keeps auth state fresh forever
  init: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        set({ user, loading: false })

        if (user) {
          await get().fetchProfile(user.id)
        } else {
          set({ profile: null })
        }
      }
    )

    // Return unsubscribe so layout can clean up on unmount
    return () => subscription.unsubscribe()
  },

  // Fetch (or re-fetch) the user's profile row from Supabase
  // Call this after username is set so modal can trigger a refresh
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

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — central auth store
// REASON: Components need shared auth + profile state without
//   each running their own listener
// --- END CHANGE LOG ---
