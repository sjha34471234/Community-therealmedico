// ============================================================
// FILE: app/search/page.js
// PURPOSE: Full search results page — questions, tags, users with filter tabs
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: Phase 6 — /search shows a search input + results
// DEPENDENCIES: app/api/search/route.js, components/TagBadge.jsx
// ⚠️ DO NOT CHANGE: force-dynamic — results must always be fresh
// ⚠️ DO NOT CHANGE: searchParams accessed directly (Next.js 14 pattern)
// ⚠️ DO NOT CHANGE: input updates URL via router.replace — keeps back button working
// ============================================================

'use client'

import '@/app/search/search.css'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import TagBadge from '@/components/TagBadge'

export default function SearchPage({ searchParams }) {
  const router = useRouter()
  const initialQ = searchParams?.q || ''
  const [inputValue, setInputValue] = useState(initialQ)
  const [q, setQ] = useState(initialQ)
  const [filter, setFilter] = useState('all')
  const [results, setResults] = useState({ questions: [], tags: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  // Debounce input → update q + URL
  function handleInputChange(e) {
    const val = e.target.value
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(function doSearch() {
      setQ(val)
      const url = val.trim().length > 0
        ? `/search?q=${encodeURIComponent(val.trim())}`
        : '/search'
      router.replace(url)
    }, 350)
  }

  // Fetch results when q or filter changes
  useEffect(function fetchResults() {
    if (!q || q.trim().length < 2) {
      setResults({ questions: [], tags: [], users: [] })
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(false)

    fetch(
      `${window.location.origin}/api/search?q=${encodeURIComponent(q.trim())}&filter=${filter}&limit=20`,
      { credentials: 'include', cache: 'no-store' }
    )
      .then(function parseJson(r) { return r.json() })
      .then(function setData(data) {
        setResults({
          questions: data.questions || [],
          tags: data.tags || [],
          users: data.users || [],
        })
      })
      .catch(function handleErr(err) { console.error('[SearchPage] fetch error:', err) })
      .finally(function done() {
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

  const total = results.questions.length + results.tags.length + results.users.length

  return (
    <main className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">Search</h1>
      </div>

      {/* Search input */}
      <div className="search-page__input-wrap">
        <Search size={18} className="search-page__input-icon" />
        <input
          type="text"
          className="search-page__input"
          placeholder="Search questions, tags, people…"
          value={inputValue}
          onChange={handleInputChange}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Result count */}
      {searched && !loading && q.trim().length >= 2 && (
        <p className="search-page__count">
          {total === 0
            ? `No results for "${q}"`
            : `${total} result${total !== 1 ? 's' : ''} for "${q}"`}
        </p>
      )}

      {/* Filter tabs */}
      <div className="search-page__filters">
        {FILTERS.map(function renderFilter(f) {
          return (
            <button
              key={f.id}
              className={`search-filter-tab${filter === f.id ? ' search-filter-tab--active' : ''}`}
              onClick={function setF() { setFilter(f.id) }}
            >
              {f.label}
            </button>
          )
        })}
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
              {results.questions.map(function renderQ(item) {
                return (
                  <a key={item.id} href={`/q/${item.slug}`} className="search-question-card">
                    <h3 className="search-question-card__title">{item.title}</h3>
                    <p className="search-question-card__body">
                      {item.body?.slice(0, 140)}{item.body?.length > 140 ? '…' : ''}
                    </p>
                    <div className="search-question-card__meta">
                      {Array.isArray(item.tags) && item.tags.slice(0, 3).map(function renderTag(tag) {
                        return <TagBadge key={tag} tag={tag} size="sm" />
                      })}
                      <span className="search-question-card__stats">
                        ▲ {item.upvotes ?? 0} &middot; {item.answer_count ?? 0} answers
                      </span>
                    </div>
                  </a>
                )
              })}
            </section>
          )}

          {/* Tags */}
          {(filter === 'all' || filter === 'tags') && results.tags.length > 0 && (
            <section className="search-section">
              {filter === 'all' && <h2 className="search-section__label">Tags</h2>}
              <div className="search-tags-grid">
                {results.tags.map(function renderTag(t) {
                  return (
                    <a key={t.id} href={`/tags/${t.slug}`} className="search-tag-card">
                      <span className="search-tag-card__name">{t.name}</span>
                      <span className="search-tag-card__count">{t.post_count ?? 0} posts</span>
                      <span className="search-tag-card__category">{t.category}</span>
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {/* Users */}
          {(filter === 'all' || filter === 'users') && results.users.length > 0 && (
            <section className="search-section">
              {filter === 'all' && <h2 className="search-section__label">People</h2>}
              {results.users.map(function renderUser(u) {
                return (
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
                )
              })}
            </section>
          )}

        </div>
      )}
    </main>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// [May 19, 2026] FIXED: Added search input field — page had no way to type a query.
//               Input debounces 350ms then updates q state + URL via router.replace.
//               Pre-fills from ?q= URL param if arriving from an external link.
// --- END CHANGE LOG ---
