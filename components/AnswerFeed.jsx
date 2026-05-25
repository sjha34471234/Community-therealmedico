// ============================================================
// FILE: components/AnswerFeed.jsx
// PURPOSE: Infinite scroll answer feed with sort tabs
//          Loads 10 top-level answers at a time automatically
//          Realtime — new answers appear instantly without refresh
// LAST CHANGED: May 25, 2026
// ============================================================
'use client'
import { useState, useEffect, useRef } from 'react'
import AnswerItem from '@/components/AnswerItem'
import { useVotes } from '@/hooks/useVotes'
import supabase from '@/lib/supabase'

const SORT_TABS = [
  { key: 'best', label: '⭐ Best' },
  { key: 'newest', label: '🆕 Newest' },
  { key: 'oldest', label: '🕰 Oldest' },
]

export default function AnswerFeed({ question, questionAuthorId, initialAnswers, initialHasMore, onAnswerAccepted }) {
  const [sort, setSort] = useState('best')
  const [answers, setAnswers] = useState(initialAnswers || [])
  const [hasMore, setHasMore] = useState(initialHasMore || false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const hasMoreRef = useRef(initialHasMore || false)
  const loadingMoreRef = useRef(false)
  const pageRef = useRef(1)
  const sortRef = useRef('best')

  const { getScore, getVote, vote } = useVotes(question, answers)

  const mountedRef = useRef(false)
  useEffect(function() {
    if (!mountedRef.current) { mountedRef.current = true; return }
    sortRef.current = sort
    pageRef.current = 1
    setAnswers([])
    setHasMore(false)
    hasMoreRef.current = false
    fetchAnswers(sort, 1, false)
  }, [sort])

  // ── Realtime — prepend new answers instantly ──────────────
  useEffect(function() {
    if (!question?.id) return

    const channel = supabase
      .channel('answers-' + question.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_answers',
          filter: 'question_id=eq.' + question.id,
        },
        function(payload) {
          const newAnswer = payload.new
          if (!newAnswer) return
          // Only top-level answers — ignore replies
          if (newAnswer.parent_id !== null) return
          // Ignore hidden answers
          if (newAnswer.is_hidden) return
          // On 'best' sort prepend doesn't make sense (sorted by votes)
          // On 'newest' prepend is correct
          // On 'oldest' append is correct but complex — just prepend for now
          if (sortRef.current === 'oldest') return
          setAnswers(function(prev) {
            const alreadyExists = prev.some(function(a) { return a.id === newAnswer.id })
            if (alreadyExists) return prev
            if (sortRef.current === 'newest') return [newAnswer, ...prev]
            return [newAnswer, ...prev]
          })
        }
      )
      .subscribe()

    return function() { supabase.removeChannel(channel) }
  }, [question?.id])

  useEffect(function setupObserver() {
    const observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        const next = pageRef.current + 1
        pageRef.current = next
        fetchAnswers(sortRef.current, next, true)
      }
    }, { rootMargin: '200px' })
    const sentinel = sentinelRef.current
    if (sentinel) observer.observe(sentinel)
    return function() { if (sentinel) observer.unobserve(sentinel) }
  }, [loading])

  async function fetchAnswers(sortKey, pageNum, append) {
    try {
      if (append) { setLoadingMore(true); loadingMoreRef.current = true }
      else setLoading(true)
      const url = window.location.origin + '/api/answers?question_id=' + question.id + '&sort=' + sortKey + '&page=' + pageNum
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (append) {
        setAnswers(function(prev) { return prev.concat(data.answers || []) })
      } else {
        setAnswers(data.answers || [])
      }
      const more = data.hasMore === true
      setHasMore(more)
      hasMoreRef.current = more
    } catch (err) {
      console.error('AnswerFeed fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }

  function handleAccepted() {
    fetchAnswers(sort, 1, false)
    pageRef.current = 1
    if (onAnswerAccepted) onAnswerAccepted()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {answers.length === 0 && !loading ? 'No answers yet' : answers.length === 1 ? '1 Answer' : answers.length + '+ Answers'}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {SORT_TABS.map(function(tab) {
            return (
              <button key={tab.key} onClick={function() { setSort(tab.key) }} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', fontWeight: sort === tab.key ? 700 : 500, color: sort === tab.key ? 'var(--accent-primary)' : 'var(--text-muted)', background: sort === tab.key ? 'var(--accent-light)' : 'none', border: '1px solid ' + (sort === tab.key ? 'var(--accent-primary)' : 'var(--bg-tertiary)'), borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s' }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div>
          {[1, 2, 3].map(function sk(n) {
            return (
              <div key={n} style={{ padding: '16px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
                <div style={{ height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '8px', width: '90%' }} />
                <div style={{ height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '8px', width: '75%' }} />
                <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '4px', width: '40%' }} />
              </div>
            )
          })}
        </div>
      )}

      {!loading && answers.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>No answers yet. Be the first to help!</p>
        </div>
      )}

      {!loading && answers.length > 0 && (
        <div>
          {answers.map(function(answer, idx) {
            return (
              <div key={answer.id}>
                <AnswerItem
                  answer={answer}
                  questionAuthorId={questionAuthorId}
                  questionId={question.id}
                  getScore={getScore}
                  getVote={getVote}
                  vote={vote}
                  onAccepted={handleAccepted}
                />
                {idx < answers.length - 1 && (
                  <div style={{ height: '1px', background: 'var(--bg-tertiary)', margin: '0 0 0 16px' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: '1px' }} />
      {loadingMore && (
        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Loading more answers…</p>
      )}
      {!hasMore && !loading && answers.length > 0 && (
        <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>All answers loaded</p>
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Infinite scroll answer feed with sort tabs
// [May 25, 2026] ADDED: Supabase realtime subscription for new answers
// REASON: New answers only appeared after manual page refresh.
// FIX: postgres_changes INSERT listener on community_answers filtered by
//   question_id prepends new top-level answers instantly.
//   Skips replies (parent_id !== null), hidden answers, and 'oldest' sort.
//   Duplicate guard prevents double render if poster's own submit already added it.
//   Channel name is unique per question — answers-{question.id}.
//   Channel cleaned up on unmount via supabase.removeChannel().
// --- END CHANGE LOG ---
