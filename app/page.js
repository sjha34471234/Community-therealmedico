// ============================================================
// FILE: app/page.js
// PURPOSE: Homepage — live question feed with sort tabs
//          Hottest first by default, filters viewed posts
//          for logged-in users, resurfaces on new activity
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Main entry point for the community
// DEPENDENCIES: components/QuestionCard.jsx, components/SortBar.jsx,
//               app/api/questions/route.js, lib/supabase.js
// ⚠️ DO NOT CHANGE: revalidate stays at 300 — do not force-dynamic
//                   userId is read client-side via onAuthStateChange
//                   Never call getUser() or getSession() on mount
//                   All <a> tags must stay on single lines — iPad rule
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import SortBar from '@/components/SortBar';
import QuestionCard from '@/components/QuestionCard';
import supabase from '@/lib/supabase';

export default function HomePage() {
  const [sort, setSort] = useState('hot');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ─── Auth state — never getUser() on mount ───────────────
  useEffect(function() {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(function(event, session) {
      setUserId(session ? session.user.id : null);
    });
    return function() { subscription.unsubscribe(); };
  }, []);

  // ─── Fetch questions when sort or userId changes ─────────
  useEffect(function() {
    setPage(1);
    setQuestions([]);
    fetchQuestions(sort, 1, userId, false);
  }, [sort, userId]);

  function buildUrl(sortKey, pageNum, uid) {
    const base = window.location.origin + '/api/questions';
    const params = new URLSearchParams();
    params.set('sort', sortKey);
    params.set('page', String(pageNum));
    if (uid) params.set('userId', uid);
    return base + '?' + params.toString();
  }

  async function fetchQuestions(sortKey, pageNum, uid, append) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const res = await fetch(buildUrl(sortKey, pageNum, uid), {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Failed to load questions');

      const data = await res.json();

      if (append) {
        setQuestions(function(prev) { return prev.concat(data.questions || []); });
      } else {
        setQuestions(data.questions || []);
      }

      setHasMore(data.hasMore === true);

    } catch (err) {
      console.error('Feed fetch error:', err);
      setError('Could not load questions. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSortChange(newSort) {
    setSort(newSort);
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuestions(sort, nextPage, userId, true);
  }

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
          Questions
        </h1>
        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Browse questions from the healthcare community
        </p>
      </div>

      {/* Top bar — sort + ask button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <SortBar activeSort={sort} onSortChange={handleSortChange} />
        <a href="/ask" style={{ backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.875rem', padding: '7px 18px', borderRadius: '7px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Ask a Question
        </a>
      </div>

      {/* Feed states */}

      {/* Loading skeleton */}
      {loading && (
        <div>
          {[1, 2, 3, 4, 5].map(function(n) {
            return (
              <div key={n} style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem', border: '1px solid var(--bg-tertiary)' }}>
                <div style={{ height: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '0.75rem', width: '70%' }} />
                <div style={{ height: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '0.5rem', width: '90%' }} />
                <div style={{ height: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', width: '50%' }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--bg-tertiary)' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--danger)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{error}</p>
          <button onClick={function() { fetchQuestions(sort, 1, userId, false); }} style={{ backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.875rem', padding: '7px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && questions.length === 0 && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--bg-tertiary)' }}>
          <p style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>No questions yet</p>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>Be the first to ask something.</p>
          <a href="/ask" style={{ backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.875rem', padding: '8px 20px', borderRadius: '7px', textDecoration: 'none' }}>
            Ask the first question
          </a>
        </div>
      )}

      {/* Question cards */}
      {!loading && !error && questions.length > 0 && (
        <div>
          {questions.map(function(q) {
            return <QuestionCard key={q.id} question={q} />;
          })}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button onClick={handleLoadMore} disabled={loadingMore} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.875rem', padding: '9px 28px', borderRadius: '7px', border: '1px solid var(--accent-primary)', cursor: loadingMore ? 'not-allowed' : 'pointer', opacity: loadingMore ? 0.6 : 1 }}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}

          {/* End of feed */}
          {!hasMore && (
            <p style={{ textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
              You have reached the end
            </p>
          )}
        </div>
      )}

      {/* Sign in prompt for guests — shown below feed */}
      {!userId && !loading && (
        <div style={{ marginTop: '2rem', padding: '1.25rem', backgroundColor: 'var(--accent-light)', borderRadius: '10px', border: '1px solid var(--accent-primary)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0 0 0.4rem 0' }}>Want to join the discussion?</p>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Sign in to ask questions, post answers, and vote.</p>
          <a href="https://therealmedico.store/login?ref=community" style={{ backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.875rem', padding: '8px 20px', borderRadius: '7px', textDecoration: 'none' }}>
            Sign In
          </a>
        </div>
      )}

    </div>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build — replaces Phase 1 placeholder
// REASON: Phase 2 live question feed with sort, pagination,
//         viewed-post filtering, and guest sign-in prompt
// --- END CHANGE LOG ---
