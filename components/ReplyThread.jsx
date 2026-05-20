// ============================================================
// FILE: components/ReplyThread.jsx
// PURPOSE: Lazy-loaded reply thread under an answer.
//          Only renders when user taps "View X replies".
//          Loads 5 replies at a time, infinite scroll within thread.
// LAST CHANGED: May 21, 2026
// ============================================================
'use client'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24)
  if (d < 30) return d + 'd ago'
  return Math.floor(d / 30) + 'mo ago'
}

export default function ReplyThread({ questionId, parentAnswerId, onReplyPosted }) {
  const { user, accessToken } = useAuthStore()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const sentinelRef = useRef(null)
  const hasMoreRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const pageRef = useRef(1)

  useEffect(function loadFirst() {
    fetchReplies(1, false)
  }, [])

  useEffect(function setupObserver() {
    const observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        const next = pageRef.current + 1
        pageRef.current = next
        fetchReplies(next, true)
      }
    }, { rootMargin: '100px' })
    const sentinel = sentinelRef.current
    if (sentinel) observer.observe(sentinel)
    return function() { if (sentinel) observer.unobserve(sentinel) }
  }, [loading])

  async function fetchReplies(pageNum, append) {
    try {
      if (append) { setLoadingMore(true); loadingMoreRef.current = true }
      else setLoading(true)
      const url = window.location.origin + '/api/answers?question_id=' + questionId + '&parent_id=' + parentAnswerId + '&sort=oldest&page=' + pageNum
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (append) {
        setReplies(function(prev) { return prev.concat(data.answers || []) })
      } else {
        setReplies(data.answers || [])
      }
      const more = data.hasMore === true
      setHasMore(more)
      hasMoreRef.current = more
    } catch (err) {
      console.error('ReplyThread fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }

  function handleReplyClick(username) {
    setReplyingTo(username)
    setReplyBody('@' + username + ' ')
  }

  async function handleReplySubmit() {
    if (!replyBody.trim() || replyBody.trim().length < 10) {
      toast.error('Reply must be at least 10 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(window.location.origin + '/api/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify({ question_id: questionId, parent_id: parentAnswerId, body: replyBody.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to post reply'); return }
      toast.success('Reply posted!')
      setReplyBody('')
      setReplyingTo(null)
      pageRef.current = 1
      fetchReplies(1, false)
      if (onReplyPosted) onReplyPosted()
    } catch (err) {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancelReply() {
    setReplyingTo(null)
    setReplyBody('')
  }

  if (loading) {
    return (
      <div style={{ paddingLeft: '20px', marginTop: '8px' }}>
        {[1, 2].map(function sk(n) {
          return <div key={n} style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '8px', width: n === 1 ? '80%' : '60%' }} />
        })}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '8px', paddingLeft: '20px', borderLeft: '2px solid var(--bg-tertiary)' }}>

      {replies.map(function renderReply(reply) {
        const isMem = reply.author_is_member
        return (
          <div key={reply.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <a href={'/profile/' + reply.author_username} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: isMem ? 'var(--member-gold)' : 'var(--accent-primary)', textDecoration: 'none' }}>{isMem ? '👑 ' : ''}{reply.author_username}</a>
              <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(reply.created_at)}</span>
            </div>
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.body}</p>
            {user && (
              <button onClick={function() { handleReplyClick(reply.author_username) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0' }}>↩ Reply</button>
            )}
          </div>
        )
      })}

      <div ref={sentinelRef} style={{ height: '1px' }} />
      {loadingMore && <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 0' }}>Loading…</p>}

      {user && (
        <div style={{ marginTop: '10px' }}>
          {replyingTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Replying to @{replyingTo}</span>
              <button onClick={handleCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--danger)', padding: 0 }}>Cancel</button>
            </div>
          )}
          {!replyingTo && (
            <button onClick={function() { handleReplyClick('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, padding: '4px 0' }}>+ Add a reply</button>
          )}
          {replyingTo !== null && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea value={replyBody} onChange={function(e) { setReplyBody(e.target.value) }} rows={2} disabled={submitting} placeholder="Write your reply..." style={{ flex: 1, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1.5px solid var(--bg-tertiary)', borderRadius: '8px', padding: '8px 12px', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
              <button onClick={handleReplySubmit} disabled={submitting} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, whiteSpace: 'nowrap' }}>{submitting ? '…' : 'Post'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Reply thread component
// REASON: Thread system for answers — lazy loaded on demand
// --- END CHANGE LOG ---
