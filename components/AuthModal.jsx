// ============================================================
// FILE: store/authStore.js
// PURPOSE: Global Zustand store for auth state + community profile
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Centralises auth so every component reads from
//   one place — avoids each component running its own
//   onAuthStateChange and getting out of sync
// DEPENDENCIES: lib/supabase.js (browser client), Zustand
// ⚠️ DO NOT CHANGE: onAuthStateChange is the primary listener.
//   getSession() is called ONCE on init as a Safari fallback —
//   Safari sometimes doesn't fire INITIAL_SESSION event on refresh.
//   Never call getUser() or getSession() anywhere else.
//   Never move the supabase client inside the store function.
//   accessToken must be stored here — getSession() fails on
//   Safari in individual components.
// ============================================================

import { create } from 'zustand'
import supabase from '@/lib/supabase'

const useAuthStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  profile: null,
  loading: true,
  accessToken: null,

  // --- ACTIONS ---
  init: () => {
    // Safari fallback — check existing session immediately on load
    // onAuthStateChange alone sometimes misses the session on refresh
    supabase.auth.getSession().then(function(result) {
      const session = result.data?.session
      if (session?.user) {
        set({
          user: session.user,
          accessToken: session.access_token,
          loading: false,
        })
        get().fetchProfile(session.user.id)
      }
    })

    // Primary listener — keeps auth fresh for all future events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async function(event, session) {
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

    return function() { subscription.unsubscribe() }
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
// REASON: Safari blocks getSession() in components — store it here
// [May 16, 2026] FIXED: Added getSession() call on init
// REASON: Safari sometimes doesn't fire INITIAL_SESSION on refresh
//   causing the store to stay logged out after page reload
// --- END CHANGE LOG ---
