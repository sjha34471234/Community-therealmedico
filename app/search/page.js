// ============================================================
// FILE: app/search/page.js
// PURPOSE: Full search results page — questions, tags, users with filter tabs
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Phase 6 — /search?q=... shows full paginated results
// DEPENDENCIES: app/api/search/route.js, components/TagBadge.jsx
// ⚠️ DO NOT CHANGE: force-dynamic — results must always be fresh
// ⚠️ DO NOT CHANGE: searchParams accessed directly (Next.js 14 pattern)
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import TagBadge from '@/components/TagBadge'

export default function SearchPage({ searchParams }) {
  const q = searchParams?.q || ''
  const [filter, setFilter] = useState('all')
  const [results, setResults] = useState({ questions: [], tags: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!q || q.length < 2) return
    setLoading(true)
    setSearched(false)

    fetch(
      `${window.location.origin}/api/search?q=${encodeURIComponent(q)}&filter=${filter}&limit=20`,
      { credentials: 'include', cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((data) => {
        setResults({
          questions: data.questions || [],
          tags: data.tags || [],
          users: data.users || [],
        })
      })
      .catch((err) => console.error('[SearchPage] fetch error:', err))
      .finally(() => {
        setLoading(false)
        setSearched(true)
      })
  }, [q, filter])

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'questions', label: 'Questions' },
    { id: 'tags', label: 'Tags' },
    { id: 'users', label: 'People' },
  ]

  const total =
    results.questions.length + results.tags.length + results.users.length

  return (
    <main className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">
          {q ? <>Results for &ldquo;<span className="search-page__query">{q}</span>&rdquo;</> : 'Search'}
        </h1>
        {searched && !loading && (
          <p className="search-page__count">
            {total === 0 ? 'No results found' : `${total} result${total !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="search-page__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`search-filter-tab${filter === f.id ? ' search-filter-tab--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="search-page__loading">
          <span className="spinner" />
          <p>Searching…</p>
        </div>
      )}

      {!loading && searched && total === 0 && (
        <div className="search-page__empty">
          <p>Nothing matched &ldquo;{q}&rdquo;. Try different keywords.</p>
        </div>
      )}

      {!loading && (
        <div className="search-page__results">

          {/* Questions */}
          {(filter === 'all' || filter === 'questions') && results.questions.length > 0 && (
            <section className="search-section">
              {filter === 'all' && <h2 className="search-section__label">Questions</h2>}
              {results.questions.map((q) => (
                <a key={q.id} href={`/q/${q.slug}`} className="search-question-card">
                  <h3 className="search-question-card__title">{q.title}</h3>
                  <p className="search-question-card__body">
                    {q.body?.slice(0, 140)}{q.body?.length > 140 ? '…' : ''}
                  </p>
                  <div className="search-question-card__meta">
                    {Array.isArray(q.tags) && q.tags.slice(0, 3).map((tag) => (
                      <TagBadge key={tag} tag={tag} size="sm" />
                    ))}
                    <span className="search-question-card__stats">
                      ▲ {q.upvotes ?? 0} &middot; {q.answer_count ?? 0} answers
                    </span>
                  </div>
                </a>
              ))}
            </section>
          )}

          {/* Tags */}
          {(filter === 'all' || filter === 'tags') && results.tags.length > 0 && (
            <section className="search-section">
              {filter === 'all' && <h2 className="search-section__label">Tags</h2>}
              <div className="search-tags-grid">
                {results.tags.map((t) => (
                  <a key={t.id} href={`/tags/${t.slug}`} className="search-tag-card">
                    <span className="search-tag-card__name">{t.name}</span>
                    <span className="search-tag-card__count">{t.post_count ?? 0} posts</span>
                    <span className="search-tag-card__category">{t.category}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Users */}
          {(filter === 'all' || filter === 'users') && results.users.length > 0 && (
            <section className="search-section">
              {filter === 'all' && <h2 className="search-section__label">People</h2>}
              {results.users.map((u) => (
                <a key={u.id} href={`/profile/${u.community_username}`} className="search-user-card">
                  <div className="search-user-card__avatar" aria-hidden="true">
                    {u.community_username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="search-user-card__info">
                    <p className="search-user-card__name">{u.community_username}</p>
                    {u.community_bio && (
                      <p className="search-user-card__bio">
                        {u.community_bio.slice(0, 100)}{u.community_bio.length > 100 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  {u.community_flair && (
                    <span className="search-user-card__flair">{u.community_flair}</span>
                  )}
                </a>
              ))}
            </section>
          )}

        </div>
      )}
    </main>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Full search results page with filter tabs
// --- END CHANGE LOG ---
