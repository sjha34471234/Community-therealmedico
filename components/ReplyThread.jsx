// ============================================================
// FILE: components/ReplyThread.jsx
// PURPOSE: Lazy-loaded reply thread under an answer.
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

function renderBody(text) {
  if (!text) return null
  const parts = text.split(/(@\w+)/g)
  return parts.map(function renderPart(part, i) {
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return <a key={i} href={'/profile/' + username} style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>{part}</a>
    }
    return part
  })
}

export default function ReplyThread({ questionId, parentAnswerId, parentAuthorUsername, autoMention, onReplyPosted }) {
  const { user, accessToken } = useAuthStore()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const sentinelRef = useRef(null)
  const hasMoreRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const pageRef = useRef(1)
  const textareaRef = useRef(null)

  useEffect(function loadFirst() {
    fetchReplies(1, false)
  }, [])

  useEffect(function setupObserver() {
    if (loading) return
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

  function openReplyTo(username) {
    const mention = '@' + username + ' '
    setReplyBody(mention)
    setReplyOpen(true)
    setTimeout(function() {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(mention.length, mention.length)
      }
    }, 50)
  }

  function openBlankReply() {
    setReplyBody('')
    setReplyOpen(true)
    setTimeout(function() {
      if (textareaRef.current) textareaRef.current.focus()
    }, 50)
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
      setReplyOpen(false)
      pageRef.current = 1
      fetchReplies(1, false)
      if (onReplyPosted) onReplyPosted()
    } catch (err) {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
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
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.6, wordBreak: 'break-word' }}>{renderBody(reply.body)}</p>
            {user && (
              <button onClick={function() { openReplyTo(reply.author_username) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)', padding: 0 }}>↩ Reply</button>
            )}
          </div>
        )
      })}

      <div ref={sentinelRef} style={{ height: '1px' }} />
      {loadingMore && <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 0' }}>Loading…</p>}

      {user && (
        <div style={{ marginTop: '10px' }}>
          {!replyOpen && (
            <button onClick={function() { openReplyTo(parentAuthorUsername || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, padding: '4px 0' }}>+ Add a reply</button>
          )}
          {replyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <textarea
                ref={textareaRef}
                value={replyBody}
                onChange={function(e) { setReplyBody(e.target.value) }}
                rows={2}
                disabled={submitting}
                placeholder={'Reply to this answer...'}
                style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1.5px solid var(--bg-tertiary)', borderRadius: '8px', padding: '8px 12px', resize: 'vertical', outline: 'none', lineHeight: 1.5, width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={function() { setReplyOpen(false); setReplyBody('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 8px' }}>Cancel</button>
                <button onClick={handleReplySubmit} disabled={submitting} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>{submitting ? '…' : 'Post'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Reply thread component
// [May 21, 2026] FIXED: Auto-mention fills correctly, mention links clickable,
//               reply box focuses on open, parentAuthorUsername prop added
// --- END CHANGE LOG ---
