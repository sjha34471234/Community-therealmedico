// ============================================================
// FILE: components/AuthProvider.jsx
// PURPOSE: Starts the global auth listener once at app level
//   and renders UsernameModal for users without a username
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: layout.js is a server component and cannot call
//   useEffect. This thin client wrapper calls authStore.init()
//   exactly once when the app loads.
// DEPENDENCIES: store/authStore.js, components/UsernameModal.jsx
// ⚠️ DO NOT CHANGE: Must be 'use client'. Must render children
//   so layout content still shows. Do not add any UI here
//   other than UsernameModal.
// ============================================================

'use client'

import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import UsernameModal from '@/components/UsernameModal'

export default function AuthProvider({ children }) {
  const init = useAuthStore((state) => state.init)

  useEffect(() => {
    const unsubscribe = init()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return (
    <>
      {children}
      <UsernameModal />
    </>
  )
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — app-level auth initialiser
// REASON: Server layout cannot run useEffect; this wrapper can
// [May 15, 2026] UPDATED: Added UsernameModal
// REASON: Modal needs to be available on every page, AuthProvider
//   is the right place since it already has auth state wired
// --- END CHANGE LOG ---
