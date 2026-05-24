// ============================================================
// FILE: components/ErrorBoundary.jsx
// PURPOSE: React class component that catches any JS crash in
//          its children tree, shows a friendly fallback UI,
//          and automatically reports the error to /api/errors
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Without an ErrorBoundary, any unhandled JS
//               error in a page component causes the entire
//               site to show a blank white screen with no
//               explanation. This catches the crash, shows a
//               helpful message, and logs it for the developer.
// DEPENDENCIES: app/api/errors/route.js
// ⚠️ DO NOT CHANGE: This MUST be a class component — React
//                   hooks cannot implement componentDidCatch
//                   This is a React architectural constraint.
// ⚠️ DO NOT CHANGE: The auto-report fetch — it fires silently
//                   and never throws (wrapped in try/catch)
//                   so a broken API route doesn't cause a
//                   second crash on top of the first one
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14B — auto error capture. Wraps all page children in
// layout.js. If any page component throws, this boundary catches
// it, shows a recovery UI, and POSTs to /api/errors silently.

// --- WHAT THIS MADE WORK ---
// Users see a friendly error message instead of white screen
// Errors are automatically logged and clustered in the DB
// Developer can see which pages crash most at /admin/errors

// --- PITFALLS ---
// ⚠️ Must be a CLASS component — function components cannot
//    use componentDidCatch — this is a React constraint
// ⚠️ The fallback UI must not use any component that might
//    also crash — keep it pure HTML/inline styles
// ⚠️ auto-report fires without auth token — that's correct —
//    crashes can happen before auth loads

'use client';

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack || '',
    };
  }

  componentDidCatch(error, errorInfo) {
    // Auto-report to /api/errors — fire and forget
    // Never await — never throw — crash logging must not crash
    try {
      const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_message: error?.message || 'Unknown error',
          error_stack: error?.stack || '',
          error_source: 'auto',
          page_url: pageUrl,
          component: errorInfo?.componentStack
            ? errorInfo.componentStack.trim().split('\n')[1]?.trim() || null
            : null,
        }),
      }).catch(() => {
        // Silently ignore — if the API is down we don't want a second error
      });
    } catch (_) {
      // Never throw from componentDidCatch
    }
  }

  handleReset() {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Fallback UI — pure HTML/inline styles only
    // Never use any component here — it might also be broken
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '2rem',
        }}>
          ⚠️
        </div>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1A1D23',
          marginBottom: '0.5rem',
        }}>
          Something went wrong
        </h2>
        <p style={{
          color: '#5B6474',
          fontSize: '0.95rem',
          maxWidth: 380,
          marginBottom: '1.5rem',
          lineHeight: 1.6,
        }}>
          This page ran into an unexpected error. It has been automatically reported to the developer.
        </p>
        <button
          onClick={() => this.handleReset()}
          style={{
            background: '#1D6FA4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '0.65rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14B — auto-capture JS crashes
// REASON: Users were seeing white screens on any unhandled JS error
//         Now they see a friendly fallback and errors are auto-logged
// --- END CHANGE LOG ---
