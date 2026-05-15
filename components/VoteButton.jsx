// ============================================================
// FILE: components/VoteButton.jsx
// PURPOSE: Upvote/downvote button pair for questions and answers
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Voting UI is shared between question detail and answer cards.
//   Extracted into its own component so vote logic lives in one place.
//   Vote state is always server truth — never optimistically updated.
// DEPENDENCIES: lucide-react, react-hot-toast
// ⚠️ DO NOT CHANGE:
//   - Vote count must never be optimistically updated — always reflects server value.
//   - credentials: 'include' on ALL fetch calls.
//   - window.location.origin for API URL — never relative paths.
//   - Named handler functions only — no arrow functions in JSX props.
//   - 'use client' required — has onClick handlers.
// ============================================================

'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VoteButton({
  targetId,        // question id or answer id
  targetType,      // 'question' or 'answer'
  initialCount,    // upvotes count from server
  userVote,        // 1, -1, or null — current user's vote (null if guest)
  userId,          // null if guest
  onVoteChange,    // optional callback(newCount, newVote) after successful vote
}) {
  const [count, setCount] = useState(initialCount || 0)
  const [currentVote, setCurrentVote] = useState(userVote || null)
  const [loading, setLoading] = useState(false)

  async function handleVote(voteType) {
    if (!userId) {
      toast.error('Sign in to vote')
      return
    }
    if (loading) return

    // If clicking the same vote type — remove the vote (toggle off)
    const newVoteType = currentVote === voteType ? 0 : voteType

    setLoading(true)
    try {
      const res = await fetch(window.location.origin + '/api/votes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: targetId,
          target_type: targetType,
          vote_type: newVoteType,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        toast.error('You are voting too quickly. Please slow down.')
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Vote failed. Please try again.')
        return
      }

      // Use server-returned count — never calculate locally
      setCount(data.new_count)
      setCurrentVote(newVoteType === 0 ? null : newVoteType)

      if (onVoteChange) {
        onVoteChange(data.new_count, newVoteType === 0 ? null : newVoteType)
      }
    } catch (err) {
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
        .vb-wrap {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .vb-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: 6px;
          padding: 4px 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          color: var(--text-muted);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          line-height: 1;
        }
        .vb-btn:hover:not(:disabled) {
          background: var(--accent-light);
          color: var(--accent-primary);
          border-color: var(--accent-primary);
        }
        .vb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .vb-btn-active-up {
          background: var(--accent-light);
          color: var(--accent-primary);
          border-color: var(--accent-primary);
        }
        .vb-btn-active-down {
          background: #FEF2F2;
          color: var(--danger);
          border-color: var(--danger);
        }
        .vb-count {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 24px;
          text-align: center;
        }
      `}</style>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// REASON: Shared vote button for questions and answers.
//   Vote count is always server truth. Wired to /api/votes (Phase 4).
//   Toggle off supported (clicking active vote type removes it).
// --- END CHANGE LOG ---
