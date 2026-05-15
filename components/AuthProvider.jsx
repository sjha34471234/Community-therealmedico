// ============================================================
// FILE: components/AuthProvider.jsx
// PURPOSE: Starts the global auth listener once at app level
// LAST CHANGED: May 15, 2026
// WHY IT EXISTS: layout.js is a server component and cannot call
//   useEffect. This thin client wrapper calls authStore.init()
//   exactly once when the app loads.
// DEPENDENCIES: store/authStore.js
// ⚠️ DO NOT CHANGE: Must be 'use client'. Must render children
//   so layout content still shows. Do not add any UI here.
// ============================================================

'use client'

import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'

export default function AuthProvider({ children }) {
  const init = useAuthStore((state) => state.init)

  useEffect(() => {
    const unsubscribe = init()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return children
}

// --- CHANGE LOG ---
// [May 15, 2026] CREATED: Phase 4 — app-level auth initialiser
// REASON: Server layout cannot run useEffect; this wrapper can
// --- END CHANGE LOG ---
