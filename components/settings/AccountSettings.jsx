// ============================================================
// FILE: components/settings/AccountSettings.jsx
// PURPOSE: Account tab — sign out button (only place sign out lives)
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Sign out was removed from Navbar in Phase 8.
//                It lives here and ONLY here. Never add sign out
//                to any other component.
// DEPENDENCIES: lib/supabase.js, react-hot-toast
// ⚠️ DO NOT CHANGE: Sign out must call supabase.auth.signOut()
//                   then window.location.href = '/' — never router.push
// ============================================================

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import supabase from '@/lib/supabase';

export default function AccountSettings() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      toast.error('Something went wrong. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <div>
      <div className="settings-account-section">
        <p className="settings-account-label">
          Signing out will end your current session on this device.
        </p>
        <button
          className="settings-btn-danger"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 8 — sign out moved from Navbar to here
// REASON: Architectural rule — sign out lives in AccountSettings only.
//         Navbar now has gear icon instead of sign out button.
// --- END CHANGE LOG ---
