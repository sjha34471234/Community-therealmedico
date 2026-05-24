// ============================================================
// FILE: components/ErrorReporter.jsx
// PURPOSE: Floating "Report a Problem" button that lets users
//          describe what broke. Submits to /api/errors and
//          clusters with other reports of the same issue.
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: JS crashes are auto-captured by ErrorBoundary.
//               But many bugs are visual or logic bugs that
//               don't throw — the page loads but something
//               feels wrong. This gives users a way to report
//               those manually.
// DEPENDENCIES: authStore (for user_id), lucide-react v0.303
// ⚠️ DO NOT CHANGE: lucide-react icons — only use icons from
//                   the v0.303 safe list in the brain dump
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14B — user-initiated error reporting. Complements the
// auto-capture in ErrorBoundary. Users describe the problem in
// plain English and it gets sent to the same error log table.

// --- WHAT THIS MADE WORK ---
// Any user can report a bug without needing the dev's contact
// Multiple users reporting the same page = clustered report
// Developer sees "5 users reported this" not 5 separate tickets

// --- PITFALLS ---
// ⚠️ useEffect must be before conditional returns — Rules of Hooks
// ⚠️ The button must not show on /admin/* pages — no point
// ⚠️ Submission must work even if user is not logged in

'use client';

import { useState, useEffect } from 'react';
import { Flag, X, Send, ChevronDown } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

export default function ErrorReporter() {
  const { user, accessToken } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pageUrl, setPageUrl] = useState('');

  // Get current page URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, []);

  // Don't show on admin pages
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return null;
  }

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error('Please describe what went wrong');
      return;
    }

    setSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/errors', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          error_message: `User report: ${description.slice(0, 200)}`,
          error_source: 'user',
          page_url: pageUrl,
          user_description: description,
          user_id: user?.id || null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setDescription('');
        setTimeout(() => {
          setSubmitted(false);
          setIsOpen(false);
        }, 2500);
      } else {
        toast.error('Could not send report. Try again.');
      }
    } catch (_) {
      toast.error('Could not send report. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger button — bottom right, above BottomNav */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '80px',        // above BottomNav (64px) + gap
          right: '16px',
          zIndex: 900,
          background: '#FFFFFF',
          border: '1px solid #D8DBE2',
          borderRadius: '999px',
          padding: '0.45rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          color: '#5B6474',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        aria-label="Report a problem"
      >
        <Flag size={13} />
        Report issue
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 0 80px 0',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px 16px 0 0',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '1rem', color: '#1A1D23', margin: 0 }}>Report a problem</p>
                <p style={{ fontSize: '0.8rem', color: '#9AA0AE', margin: '2px 0 0' }}>
                  {pageUrl.replace('https://community.therealmedico.store', '') || '/'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AA0AE', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <p style={{ fontWeight: 600, color: '#1A1D23', marginBottom: '0.25rem' }}>Report sent!</p>
                <p style={{ fontSize: '0.875rem', color: '#5B6474' }}>Thank you — the developer has been notified.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What went wrong? e.g. 'The vote button doesn't respond' or 'Page is blank after login'"
                  rows={4}
                  style={{
                    width: '100%',
                    border: '1px solid #D8DBE2',
                    borderRadius: 8,
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    color: '#1A1D23',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '0.75rem',
                  }}
                  maxLength={1000}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9AA0AE' }}>
                    {description.length}/1000
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !description.trim()}
                    style={{
                      background: submitting || !description.trim() ? '#D8DBE2' : '#1D6FA4',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      cursor: submitting || !description.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Send size={14} />
                    {submitting ? 'Sending...' : 'Send report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14B — user-facing error report button
// REASON: Auto-capture only catches JS crashes. Visual/logic bugs
//         need a way for users to report them manually.
// --- END CHANGE LOG ---
