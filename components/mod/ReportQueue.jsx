// --- WHY THIS CODE EXISTS ---
// The main mod queue panel inside ModSettings.
// Shows all pending reports, paginated 20 at a time.
// Lets mods filter by content type and status.
// Each report renders as a ReportCard with action buttons.

// --- WHAT THIS MADE WORK ---
// Mod queue inside /settings — visible only to mods and admin
// Filter by status: pending / resolved / dismissed
// Filter by content type: all / question / answer / reply / room_message / dm_message

// --- PITFALLS ---
// ⚠️ WARNING: This component only renders for mods/admin — parent must gate it
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: Pagination resets to page 1 whenever filters change
// ⚠️ WARNING: After a mod action in ReportCard, call handleActionTaken()
//             to remove that report from the list without a full reload

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ReportCard from './ReportCard';

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending' },
  { value: 'resolved',  label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const TYPE_OPTIONS = [
  { value: '',             label: 'All types' },
  { value: 'question',     label: 'Questions' },
  { value: 'answer',       label: 'Answers' },
  { value: 'reply',        label: 'Replies' },
  { value: 'room_message', label: 'Chat messages' },
  { value: 'dm_message',   label: 'DMs' },
];

export default function ReportQueue() {
  const { accessToken } = useAuthStore();

  const [reports, setReports]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter]     = useState('');

  const LIMIT = 20;

  // ── Fetch reports ──
  const fetchReports = useCallback(async (pageNum, status, type) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      let url = '/api/mod/reports?status=' + status + '&page=' + pageNum + '&limit=' + LIMIT;
      if (type) url += '&type=' + type;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + accessToken },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load reports');
        return;
      }

      setReports(data.reports || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);

    } catch {
      setError('Something went wrong loading the report queue.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch on mount and whenever filters or page change
  useEffect(() => {
    fetchReports(page, statusFilter, typeFilter);
  }, [page, statusFilter, typeFilter, fetchReports]);

  // Reset to page 1 when filters change
  function handleStatusChange(val) {
    setStatusFilter(val);
    setPage(1);
  }

  function handleTypeChange(val) {
    setTypeFilter(val);
    setPage(1);
  }

  // Called by ReportCard after a successful mod action
  // Removes the acted-on report from the list immediately
  function handleActionTaken(reportId) {
    setReports(prev => prev.filter(r => r.id !== reportId));
    setTotal(prev => Math.max(0, prev - 1));
  }

  function handleRefresh() {
    fetchReports(page, statusFilter, typeFilter);
  }

  return (
    <div>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '16px',
        flexWrap:       'wrap',
        gap:            '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="var(--accent-primary)" />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize:   '16px',
            color:      'var(--text-primary)',
          }}>
            Report Queue
          </span>
          {total > 0 && (
            <span style={{
              background:   'var(--danger)',
              color:        '#fff',
              borderRadius: '20px',
              padding:      '1px 8px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   700,
              fontSize:     '12px',
            }}>
              {total}
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh queue"
          style={{
            background:   'none',
            border:       '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
            padding:      '6px 10px',
            cursor:       loading ? 'not-allowed' : 'pointer',
            color:        'var(--text-muted)',
            display:      'flex',
            alignItems:   'center',
            gap:          '5px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '13px',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display:      'flex',
        gap:          '10px',
        marginBottom: '16px',
        flexWrap:     'wrap',
      }}>

        {/* Status filter tabs */}
        <div style={{
          display:      'flex',
          background:   'var(--bg-secondary)',
          borderRadius: '8px',
          padding:      '3px',
          gap:          '2px',
        }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              style={{
                background:   statusFilter === opt.value ? 'var(--bg-primary)' : 'none',
                color:        statusFilter === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                border:       'none',
                borderRadius: '6px',
                padding:      '5px 12px',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   statusFilter === opt.value ? 600 : 400,
                fontSize:     '13px',
                cursor:       'pointer',
                transition:   'all 0.15s',
                boxShadow:    statusFilter === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter dropdown */}
        <select
          value={typeFilter}
          onChange={e => handleTypeChange(e.target.value)}
          style={{
            background:   'var(--bg-secondary)',
            border:       '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
            padding:      '6px 12px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '13px',
            color:        'var(--text-primary)',
            cursor:       'pointer',
            outline:      'none',
          }}
        >
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{
          padding:    '40px 0',
          textAlign:  'center',
          fontFamily: 'Inter, sans-serif',
          fontSize:   '14px',
          color:      'var(--text-muted)',
        }}>
          Loading reports…
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div style={{
          padding:      '16px',
          background:   '#FEF2F2',
          borderRadius: '8px',
          fontFamily:   'Inter, sans-serif',
          fontSize:     '14px',
          color:        'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && reports.length === 0 && (
        <div style={{
          padding:    '48px 0',
          textAlign:  'center',
        }}>
          <ShieldAlert size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize:   '15px',
            color:      'var(--text-primary)',
            margin:     '0 0 4px',
          }}>
            {statusFilter === 'pending' ? 'No pending reports' : 'Nothing here'}
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-muted)',
            margin:     0,
          }}>
            {statusFilter === 'pending'
              ? 'The community is behaving. Check back later.'
              : 'No ' + statusFilter + ' reports found' + (typeFilter ? ' for this content type' : '') + '.'}
          </p>
        </div>
      )}

      {/* ── Report list ── */}
      {!loading && !error && reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onActionTaken={handleActionTaken}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && total > LIMIT && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginTop:      '20px',
          padding:        '12px 0',
          borderTop:      '1px solid var(--bg-secondary)',
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-muted)',
          }}>
            Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background:   'var(--bg-secondary)',
                border:       'none',
                borderRadius: '8px',
                padding:      '7px 12px',
                cursor:       page === 1 ? 'not-allowed' : 'pointer',
                color:        page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                display:      'flex',
                alignItems:   'center',
                gap:          '4px',
                fontFamily:   'Inter, sans-serif',
                fontSize:     '13px',
                fontWeight:   600,
              }}
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              style={{
                background:   'var(--bg-secondary)',
                border:       'none',
                borderRadius: '8px',
                padding:      '7px 12px',
                cursor:       !hasMore ? 'not-allowed' : 'pointer',
                color:        !hasMore ? 'var(--text-muted)' : 'var(--text-primary)',
                display:      'flex',
                alignItems:   'center',
                gap:          '4px',
                fontFamily:   'Inter, sans-serif',
                fontSize:     '13px',
                fontWeight:   600,
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Spin animation for refresh icon ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
