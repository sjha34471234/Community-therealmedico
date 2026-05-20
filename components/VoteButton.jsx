// ============================================================
// FILE: components/VoteButton.jsx
// PURPOSE: Upvote/downvote button pair for questions and answers
// LAST CHANGED: May 20, 2026
// ============================================================
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

export default function VoteButton({
  targetId,
  targetType,
  initialCount,
  userVote,
  onVoteChange,
}) {
  const { user, accessToken } = useAuthStore()
  const [count, setCount] = useState(initialCount || 0)
  const [currentVote, setCurrentVote] = useState(userVote ?? null)
  const [loading, setLoading] = useState(false)

  // Sync when parent fetches live vote state after mount
  useEffect(function syncProps() {
    setCount(initialCount || 0)
  }, [initialCount])

  useEffect(function syncVote() {
    setCurrentVote(userVote ?? null)
  }, [userVote])

  async function handleVote(voteType) {
    if (!user) {
      toast.error('Sign in to vote')
      return
    }
    if (loading) return

    const newVoteType = currentVote === voteType ? 0 : voteType

    const body = { vote_type: newVoteType }
    if (targetType === 'question') {
      body.question_id = targetId
    } else {
      body.answer_id = targetId
    }

    // Snapshot current state for revert
    const prevCount = count
    const prevVote = currentVote

    // Optimistic update
    const delta = newVoteType - (currentVote || 0)
    setCount(function c(prev) { return prev + delta })
    setCurrentVote(newVoteType === 0 ? null : newVoteType)

    setLoading(true)
    try {
      const res = await fetch(window.location.origin + '/api/votes', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.status === 429) {
        setCount(prevCount)
        setCurrentVote(prevVote)
        toast.error('You are voting too quickly. Please slow down.')
        return
      }
      if (!res.ok) {
        setCount(prevCount)
        setCurrentVote(prevVote)
        toast.error(data.error || 'Vote failed. Please try again.')
        return
      }

      // Confirm with server truth
      setCount(data.upvotes)
      setCurrentVote(newVoteType === 0 ? null : newVoteType)

      if (onVoteChange) {
        onVoteChange(data.upvotes, newVoteType === 0 ? null : newVoteType)
      }

    } catch (err) {
      setCount(prevCount)
      setCurrentVote(prevVote)
      console.error('VoteButton fetch error:', err)
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleUpvote() { handleVote(1) }
  function handleDownvote() { handleVote(-1) }

  const upActive = currentVote === 1
  const downActive = currentVote === -1

  return (
    <div className="vb-wrap">
      <button
        type="button"
        className={upActive ? 'vb-btn vb-btn-active-up' : 'vb-btn'}
        onClick={handleUpvote}
        disabled={loading}
        aria-label="Upvote"
        aria-pressed={upActive}
      >
        <ChevronUp size={18} />
      </button>

      <span className="vb-count" aria-label={count + ' votes'}>
        {count}
      </span>

      <button
        type="button"
        className={downActive ? 'vb-btn vb-btn-active-down' : 'vb-btn'}
        onClick={handleDownvote}
        disabled={loading}
        aria-label="Downvote"
        aria-pressed={downActive}
      >
        <ChevronDown size={18} />
      </button>

      <style>{`
        .vb-wrap { display:inline-flex; align-items:center; gap:4px; }
        .vb-btn { background:var(--bg-secondary); border:1px solid var(--bg-tertiary); border-radius:6px; padding:4px 6px; cursor:pointer; display:inline-flex; align-items:center; color:var(--text-muted); transition:background 0.15s,color 0.15s,border-color 0.15s; line-height:1; }
        .vb-btn:hover:not(:disabled) { background:var(--accent-light); color:var(--accent-primary); border-color:var(--accent-primary); }
        .vb-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .vb-btn-active-up { background:var(--accent-light); color:var(--accent-primary); border-color:var(--accent-primary); }
        .vb-btn-active-down { background:#FEF2F2; color:var(--danger); border-color:var(--danger); }
        .vb-count { font-family:'Inter',system-ui,sans-serif; font-size:0.9rem; font-weight:700; color:var(--text-primary); min-width:24px; text-align:center; }
      `}</style>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// [May 20, 2026] FIXED: useEffect syncs initialCount + userVote from parent
//               after live fetch. useState ignores prop changes — this fixes it.
//               Removed router.refresh() — ISR not reliable. Live fetch handles refresh.
// --- END CHANGE LOG ---
