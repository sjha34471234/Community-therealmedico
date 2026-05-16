// ============================================================
// FILE: components/AuthProvider.jsx
// PURPOSE: Starts the global auth listener once at app level,
//   renders UsernameModal, and listens for open-auth-modal event
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: layout.js is a server component and cannot call
//   useEffect. This thin client wrapper calls authStore.init()
//   exactly once when the app loads.
// DEPENDENCIES: store/authStore.js, components/UsernameModal.jsx,
//               components/AuthModal.jsx
// ⚠️ DO NOT CHANGE: Must be 'use client'. Must render children
//   so layout content still shows.
//   open-auth-modal custom event is fired by the feed sign in
//   button — this is the only way to open the modal from a
//   component that doesn't own modal state.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import useAuthStore from '@/store/authStore'
import UsernameModal from '@/components/UsernameModal'
import AuthModal from '@/components/AuthModal'

export default function AuthProvider({ children }) {
  const init = useAuthStore((state) => state.init)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = init()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Listen for open-auth-modal event fired by feed sign in button
  useEffect(() => {
    function handleOpenModal() {
      setAuthModalOpen(true)
    }
    window.addEventListener('open-auth-modal', handleOpenModal)
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenModal)
    }
  }, [])

  function handleCloseModal() {
    setAuthModalOpen(false)
  }

  return (
    <>
      {children}
      <UsernameModal />
      {authModalOpen && <AuthModal onClose={handleCloseModal} />}
    </>
  )
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — app-level auth initialiser
// REASON: Server layout cannot run useEffect; this wrapper can
// [May 15, 2026] UPDATED: Added UsernameModal
// REASON: Modal needs to be available on every page
// [May 16, 2026] UPDATED: Added open-auth-modal event listener
// REASON: Feed sign in button needs to open AuthModal without
//   owning modal state — custom event is the clean solution
// --- END CHANGE LOG ---
