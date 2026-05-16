// ============================================================
// FILE: store/authStore.js
// PURPOSE: Global Zustand store for auth state + community profile
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Centralises auth so every component reads from
//   one place — avoids each component running its own
//   onAuthStateChange and getting out of sync
// DEPENDENCIES: lib/supabase.js (browser client), Zustand
// ⚠️ DO NOT CHANGE: onAuthStateChange is the primary listener.
//   fetchProfile calls /api/profile — never Supabase directly.
//   This bypasses RLS timing issues on refresh.
//   accessToken must stay in state and be passed to fetchProfile.
//   Never call getUser() or getSession() in individual components.
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
        if (user && accessToken) {
          await get().fetchProfile(user.id, accessToken)
        } else {
          set({ profile: null, accessToken: null })
        }
      }
    )

    // Fallback — catches existing session on refresh
    // when onAuthStateChange fires late
    setTimeout(function() {
      supabase.auth.getSession().then(function(result) {
        const session = result.data?.session
        const currentUser = get().user
        if (session?.user && !currentUser) {
          set({
            user: session.user,
            accessToken: session.access_token,
            loading: false,
          })
          get().fetchProfile(session.user.id, session.access_token)
        } else if (!session?.user && !currentUser) {
          set({ loading: false })
        }
      })
    }, 500)

    return function() { subscription.unsubscribe() }
  },

  // fetchProfile calls /api/profile via Bearer token
  // — never queries Supabase directly to avoid RLS timing issues
  fetchProfile: async (userId, accessToken) => {
    if (!userId || !accessToken) return

    try {
      const res = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        console.error('[authStore] fetchProfile failed:', res.status)
        set({ profile: null })
        return
      }

      const data = await res.json()
      set({ profile: data.profile })

    } catch (err) {
      console.error('[authStore] fetchProfile error:', err.message)
      set({ profile: null })
    }
  },
}))

export default useAuthStore
export { useAuthStore }

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — central auth store
// [May 16, 2026] UPDATED: Added accessToken to state
// [May 16, 2026] FIXED: fetchProfile now calls /api/profile
// REASON: Direct Supabase query with RLS caused race condition on
//   refresh — auth.uid() not ready in time, profile returned null.
//   API route uses service role, bypasses RLS entirely.
// --- END CHANGE LOG ---
