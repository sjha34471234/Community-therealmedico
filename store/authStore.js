// ============================================================
// FILE: store/authStore.js
// PURPOSE: Global Zustand store for auth state + community profile
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Centralises auth so every component reads from
//   one place — avoids each component running its own
//   onAuthStateChange and getting out of sync
// DEPENDENCIES: lib/supabase.js (browser client), Zustand
// ⚠️ DO NOT CHANGE: onAuthStateChange is the primary listener.
//   getSession() fallback has a 500ms delay — this is intentional.
//   Without the delay, auth.uid() isn't set in RLS context yet
//   and fetchProfile returns nothing on refresh.
//   Never call getUser() or getSession() in individual components.
//   accessToken must stay in state — Safari blocks getSession().
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
    // Primary listener — handles all auth events including refresh
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

    // Safari/Chrome fallback — getSession() catches existing session
    // on refresh when onAuthStateChange fires late or not at all.
    // 500ms delay gives RLS auth.uid() time to initialize.
    setTimeout(function() {
      supabase.auth.getSession().then(function(result) {
        const session = result.data?.session
        const currentUser = get().user
        // Only act if onAuthStateChange hasn't already set the user
        if (session?.user && !currentUser) {
          set({
            user: session.user,
            accessToken: session.access_token,
            loading: false,
          })
          get().fetchProfile(session.user.id)
        } else if (!session?.user && !currentUser) {
          // No session anywhere — confirm logged out
          set({ loading: false })
        }
      })
    }, 500)

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
// [May 16, 2026] FIXED: Added getSession() fallback with 500ms delay
// REASON: RLS auth.uid() not ready immediately on refresh —
//   delay gives Supabase time to initialize before profile fetch
// --- END CHANGE LOG ---
