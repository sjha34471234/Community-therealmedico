// ============================================================
// FILE: components/settings/MembershipSettings.jsx
// PURPOSE: Membership tab — join flow for non-members,
//          status + cancel flow for existing members
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Users need to see membership status and join/cancel
//                from within the community settings page.
// DEPENDENCIES: store/authStore.js, react-hot-toast
// ⚠️ DO NOT CHANGE: Join button MUST save community_redirect to
//                   localStorage before redirecting — store uses it
//                   to send the user back after payment.
//                   Cancel calls store API cross-domain with Bearer token.
//                   External links use <a> tag — NOT Next.js <Link>.
// ============================================================

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const STORE_ACCOUNT_URL = 'https://therealmedico.store/account';
const STORE_CANCEL_URL = 'https://therealmedico.store/api/razorpay/cancel-membership';

const BENEFITS = [
  { icon: '👑', text: 'Gold username colour and crown icon next to your name' },
  { icon: '🏅', text: 'Exclusive Real Medico+ flair badge on your profile' },
  { icon: '🖼️', text: 'Custom gold border on your profile avatar' },
  { icon: '✨', text: 'Subtle gold highlight on your posts and answers' },
  { icon: '🎁', text: 'Access to seasonal and limited cosmetic badge drops' },
  { icon: '🛒', text: '15% discount on all store orders' },
  { icon: '📦', text: 'Free shipping on every order' },
  { icon: '🚀', text: 'Early access to new features and products' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function MembershipSettings() {
  const { profile, accessToken, fetchProfile, user } = useAuthStore();

  const isMember = profile?.is_member === true;
  const expiryDate = profile?.membership_expires_at || null;
  const joinedDate = profile?.community_joined_at || null;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function handleJoin() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('community_redirect', window.location.href);
    }
    window.location.href = STORE_ACCOUNT_URL;
  }

  async function handleCancelConfirm() {
    setCancelling(true);
    try {
      const res = await fetch(STORE_CANCEL_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Could not cancel membership. Please try again.');
        return;
      }

      await fetchProfile(user.id, accessToken);
      setShowCancelModal(false);
      toast.success('Your membership has been cancelled.');
    } catch (err) {
      console.error('Cancel membership error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  if (isMember) {
    return (
      <div>
        <p className="settings-section-title">Your membership</p>

        <div className="settings-member-card">
          <div className="settings-member-card-header">
            <span className="settings-member-crown">👑</span>
            <span className="settings-member-name">Real Medico+ Member</span>
          </div>
          <div className="settings-member-meta">
            <p><strong>Status:</strong> Active ✓</p>
            {expiryDate && (
              <p><strong>Renews:</strong> {formatDate(expiryDate)}</p>
            )}
            {joinedDate && (
              <p><strong>Member since:</strong> {formatDate(joinedDate)}</p>
            )}
          </div>
        </div>

        <div className="settings-info-box">
          <p>
            Your membership gives you gold cosmetics across the community, discounts on the store, and early access to new features.
          </p>
        </div>

        <button
          className="settings-btn-danger"
          onClick={() => setShowCancelModal(true)}
        >
          Cancel membership
        </button>

        {showCancelModal && (
          <div className="settings-modal-overlay">
            <div className="settings-modal">
              <h2>Cancel your membership?</h2>
              <p>
                Your Real Medico+ perks — including gold cosmetics, store discounts, and early access — will be removed at the end of your current billing period.
              </p>
              <div className="settings-modal-actions">
                <button
                  className="settings-btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                >
                  Keep membership
                </button>
                <button
                  className="settings-btn-danger"
                  onClick={handleCancelConfirm}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="settings-section-title">Join Real Medico+</p>

      <div className="settings-info-box">
        <p>
          Real Medico+ gives you cosmetic perks across the community and benefits on the store. No functional advantage — purely for those who want to support the project and stand out.
        </p>
      </div>

      <ul className="settings-benefits-list">
        {BENEFITS.map((b, i) => (
          <li key={i}>
            <span className="settings-benefit-icon">{b.icon}</span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      <button className="settings-btn-primary" onClick={handleJoin}>
        Join Real Medico+
      </button>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 17, 2026] CREATED: Phase 8 — membership tab
// REASON: Community needs a way to show membership status and
//         handle join/cancel flows without touching payment logic.
//         Payment lives on the store — this tab is the community wrapper.
// --- END CHANGE LOG ---
