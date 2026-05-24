// ============================================================
// FILE: app/admin/errors/page.js
// PURPOSE: Developer console showing all error logs, sorted by
//          frequency. Admin can mark errors as resolved/ignored.
//          Only accessible to the admin (ADMIN_USER_ID).
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Without a console, errors logged to the DB
//               are invisible. The developer needs one place
//               to see all errors sorted by impact.
// DEPENDENCIES: authStore, app/api/errors/route.js
// ⚠️ DO NOT CHANGE: Admin check — if profile.id !== ADMIN_USER_ID
//                   the GET /api/errors returns 403. The page
//                   handles this gracefully by showing "Access denied"
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14B developer console. Reads from GET /api/errors.
// Sorted by occurrence_count by default — most common errors first.
// Admin can filter by status (open/resolved/ignored).

// --- WHAT THIS MADE WORK ---
// Developer can see: which errors happened, how many times,
// how many unique users affected, which page, when last seen.
// Can mark as resolved or ignored.

// --- PITFALLS ---
// ⚠️ This page is NOT in the Navbar — URL-only access
// ⚠️ accessToken from authStore — never from body
// ⚠️ Must redirect or show access denied if not admin
//    Do NOT expose error details to non-admins

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, EyeOff, RefreshCw, Filter } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import './admin-errors.css';

export default function AdminErrorsPage() {
  const { accessToken, loading } = useAuthStore();
  const [errors, setErrors] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [sortBy, setSortBy] = useState('occurrence_count');
  const [fetching, setFetching] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    if (!loading && accessToken) {
      fetchErrors();
    }
  }, [accessToken, loading, status, sortBy, page]);

  async function fetchErrors() {
    setFetching(true);
    try {
      const res = await fetch(
        `/api/errors?status=${status}&sort=${sortBy}&page=${page}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        }
      );
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json();
      setErrors(data.errors || []);
      setCount(data.count || 0);
    } catch (_) {
      toast.error('Failed to load error logs');
    } finally {
      setFetching(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const res = await fetch('/api/errors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ id, status: newStatus, resolution_note: resolutionNote }),
      });
      if (res.ok) {
        toast.success(`Marked as ${newStatus}`);
        setResolutionNote('');
        setExpandedId(null);
        fetchErrors();
      } else {
        toast.error('Failed to update status');
      }
    } catch (_) {
      toast.error('Failed to update status');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function statusBadge(s) {
    const map = {
      open: { bg: '#FEF2F2', color: '#C62828', label: 'Open' },
      resolved: { bg: '#F0FDF4', color: '#2E7D32', label: 'Resolved' },
      ignored: { bg: '#F5F5F5', color: '#5B6474', label: 'Ignored' },
    };
    const style = map[s] || map.open;
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}>
        {style.label}
      </span>
    );
  }

  if (loading) return <div className="admin-errors-loading">Loading...</div>;

  if (!accessToken) return (
    <div className="admin-errors-denied">
      <AlertTriangle size={32} color="#C62828" />
      <p>You must be logged in to access this page.</p>
    </div>
  );

  if (accessDenied) return (
    <div className="admin-errors-denied">
      <AlertTriangle size={32} color="#C62828" />
      <p>Access denied — admin only.</p>
    </div>
  );

  return (
    <div className="admin-errors-page">
      <div className="admin-errors-header">
        <div>
          <h1>Error Console</h1>
          <p>{count} {status === 'all' ? 'total' : status} error{count !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-refresh-btn" onClick={fetchErrors} disabled={fetching}>
          <RefreshCw size={16} className={fetching ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="admin-errors-filters">
        <div className="admin-filter-group">
          <Filter size={14} />
          <label>Status</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Sort by</label>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="occurrence_count">Most frequent</option>
            <option value="affected_users">Most users affected</option>
            <option value="last_seen_at">Most recent</option>
            <option value="first_seen_at">Oldest</option>
          </select>
        </div>
      </div>

      {/* Error list */}
      {fetching ? (
        <div className="admin-errors-loading">Loading errors...</div>
      ) : errors.length === 0 ? (
        <div className="admin-errors-empty">
          <CheckCircle size={32} color="#2E7D32" />
          <p>No {status === 'all' ? '' : status} errors. 🎉</p>
        </div>
      ) : (
        <div className="admin-errors-list">
          {errors.map((err) => (
            <div key={err.id} className="admin-error-card">
              {/* Card header */}
              <div className="admin-error-card-header">
                <div className="admin-error-meta">
                  <span className="admin-error-source">{err.error_source === 'user' ? '👤 User report' : '🤖 Auto-captured'}</span>
                  {statusBadge(err.status)}
                </div>
                <div className="admin-error-stats">
                  <span title="Times occurred">🔁 {err.occurrence_count}</span>
                  <span title="Users affected">👥 {err.affected_users}</span>
                </div>
              </div>

              {/* Error message */}
              <p className="admin-error-message">{err.error_message}</p>

              {/* Page */}
              {err.page_url && (
                <p className="admin-error-url">{err.page_url.replace('https://community.therealmedico.store', '')}</p>
              )}

              {/* User description */}
              {err.user_description && (
                <div className="admin-error-user-desc">
                  <strong>User said:</strong> {err.user_description}
                </div>
              )}

              {/* Timestamps */}
              <div className="admin-error-times">
                <span>First: {formatDate(err.first_seen_at)}</span>
                <span>Last: {formatDate(err.last_seen_at)}</span>
              </div>

              {/* Stack trace toggle */}
              {err.error_stack && (
                <button
                  className="admin-stack-toggle"
                  onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                >
                  {expandedId === err.id ? 'Hide' : 'Show'} stack trace
                </button>
              )}
              {expandedId === err.id && err.error_stack && (
                <pre className="admin-error-stack">{err.error_stack}</pre>
              )}

              {/* Actions */}
              {err.status === 'open' && (
                <div className="admin-error-actions">
                  <input
                    type="text"
                    placeholder="Resolution note (optional)"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="admin-resolution-input"
                  />
                  <button className="admin-btn-resolve" onClick={() => updateStatus(err.id, 'resolved')}>
                    <CheckCircle size={14} /> Resolve
                  </button>
                  <button className="admin-btn-ignore" onClick={() => updateStatus(err.id, 'ignored')}>
                    <EyeOff size={14} /> Ignore
                  </button>
                </div>
              )}
              {err.status !== 'open' && (
                <button className="admin-btn-reopen" onClick={() => updateStatus(err.id, 'open')}>
                  Reopen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {count > 20 && (
        <div className="admin-errors-pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page} of {Math.ceil(count / 20)}</span>
          <button disabled={page >= Math.ceil(count / 20)} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14B — admin error console
// REASON: Developer needs one place to see all errors sorted by impact
// --- END CHANGE LOG ---
