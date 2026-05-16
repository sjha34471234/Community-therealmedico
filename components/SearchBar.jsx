// ============================================================
// FILE: components/SearchBar.jsx
// PURPOSE: Search input with live inline dropdown + navigate to /search on Enter
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Phase 6 — search goes live. Dropdown shows quick results,
//   Enter or "See all" navigates to full /search page.
// DEPENDENCIES: app/api/search/route.js
// ⚠️ DO NOT CHANGE: credentials: 'include' on fetch — iPad drops cookies without it
// ⚠️ DO NOT CHANGE: debounce 300ms — avoid hammering API on every keystroke
// ⚠️ DO NOT CHANGE: window.location.origin prefix on fetch URL
// ============================================================

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function SearchBar({ placeholder = 'Search questions, tags, people…' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ questions: [], tags: [], users: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchResults = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults({ questions: [], tags: [], users: [] })
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `${window.location.origin}/api/search?q=${encodeURIComponent(q)}&limit=5`,
        { credentials: 'include', cache: 'no-store' }
      )
      const data = await res.json()
      setResults({
        questions: data.questions || [],
        tags: data.tags || [],
        users: data.users || [],
      })
      setOpen(true)
    } catch (err) {
      console.error('[SearchBar] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(val), 300)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      setOpen(false)
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function goToSearch() {
    if (query.trim().length >= 2) {
      setOpen(false)
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
    }
  }

  const hasResults =
    results.questions.length > 0 ||
    results.tags.length > 0 ||
    results.users.length > 0

  return (
    <div className="searchbar-wrap" ref={containerRef}>
      <div className="searchbar-input-row">
        <span className="searchbar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="searchbar-input"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && setOpen(true)}
          autoComplete="off"
          aria-label="Search"
        />
        {loading && <span className="searchbar-spinner" aria-hidden="true" />}
      </div>

      {open && hasResults && (
        <div className="searchbar-dropdown">

          {/* Questions */}
          {results.questions.length > 0 && (
            <div className="searchbar-section">
              <p className="searchbar-section-label">Questions</p>
              {results.questions.map((q) => (
                <a key={q.id} href={`/q/${q.slug}`} className="searchbar-item">
                  <span className="searchbar-item-icon">❓</span>
                  <span className="searchbar-item-text">{q.title}</span>
                  <span className="searchbar-item-meta">{q.answer_count} ans</span>
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          {results.tags.length > 0 && (
            <div className="searchbar-section">
              <p className="searchbar-section-label">Tags</p>
              {results.tags.map((t) => (
                <a key={t.id} href={`/tags/${t.slug}`} className="searchbar-item">
                  <span className="searchbar-item-icon">🏷️</span>
                  <span className="searchbar-item-text">{t.name}</span>
                  <span className="searchbar-item-meta">{t.post_count} posts</span>
                </a>
              ))}
            </div>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <div className="searchbar-section">
              <p className="searchbar-section-label">People</p>
              {results.users.map((u) => (
                <a key={u.id} href={`/profile/${u.community_username}`} className="searchbar-item">
                  <span className="searchbar-item-icon">👤</span>
                  <span className="searchbar-item-text">{u.community_username}</span>
                  {u.community_flair && <span className="searchbar-item-meta">{u.community_flair}</span>}
                </a>
              ))}
            </div>
          )}

          {/* See all results */}
          <button onClick={goToSearch} className="searchbar-see-all">
            See all results for &ldquo;{query}&rdquo; →
          </button>
        </div>
      )}

      {open && !hasResults && !loading && query.length >= 2 && (
        <div className="searchbar-dropdown">
          <p className="searchbar-empty">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Search bar with live dropdown for Navbar
// --- END CHANGE LOG ---
