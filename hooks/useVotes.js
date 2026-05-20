// ============================================================
// FILE: hooks/useVotes.js
// PURPOSE: Hook — manages vote state for a question + its answers
// LAST CHANGED: May 20, 2026
// Usage:
//   const { getCount, getVote, loadVotes, handleVote } = useVotes(question, answers)
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import { fetchVote, castVote } from '@/lib/votes'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export function useVotes(question, answers) {
  const { user, accessToken } = useAuthStore()

  // scores: { [id]: netScore }
  const [scores, setScores] = useState(function initScores() {
    const map = {}
    map[question.id] = (question.upvotes || 0) - (question.downvotes || 0)
    for (const a of (answers || [])) {
      map[a.id] = (a.upvotes || 0) - (a.downvotes || 0)
    }
    return map
  })

  // votes: { [id]: 1 | -1 | null }
  const [votes, setVotes] = useState({})

  // Fetch live state for all targets on mount
  useEffect(function loadVotes() {
    if (!user || !accessToken) return

    async function run() {
      const targets = [
        { targetType: 'question', targetId: question.id },
        ...(answers || []).map(function makeTarget(a) {
          return { targetType: 'answer', targetId: a.id }
        }),
      ]

      for (const target of targets) {
        const result = await fetchVote({ ...target, accessToken })
        if (!result) continue
        setScores(function prev(s) { return Object.assign({}, s, { [target.targetId]: result.netScore }) })
        setVotes(function prev(v) { return Object.assign({}, v, { [target.targetId]: result.userVote }) })
      }
    }
    run()
  }, [user, accessToken, question.id])

  // Cast a vote
  async function handleVote(targetType, targetId, voteType) {
    if (!user) {
      toast.error('Sign in to vote')
      return
    }

    const prevScore = scores[targetId] ?? 0
    const prevVote = votes[targetId] ?? null
    const newVoteType = prevVote === voteType ? 0 : voteType

    // Optimistic update
    const delta = newVoteType - (prevVote || 0)
    setScores(function prev(s) { return Object.assign({}, s, { [targetId]: prevScore + delta }) })
    setVotes(function prev(v) { return Object.assign({}, v, { [targetId]: newVoteType === 0 ? null : newVoteType }) })

    const result = await castVote({ targetType, targetId, voteType: newVoteType, accessToken })

    if (result.error) {
      // Revert on failure
      setScores(function prev(s) { return Object.assign({}, s, { [targetId]: prevScore }) })
      setVotes(function prev(v) { return Object.assign({}, v, { [targetId]: prevVote }) })
      if (result.status === 429) {
        toast.error('Voting too quickly. Please slow down.')
      } else {
        toast.error(result.error)
      }
      return
    }

    // Confirm server truth
    setScores(function prev(s) { return Object.assign({}, s, { [targetId]: result.netScore }) })
    setVotes(function prev(v) { return Object.assign({}, v, { [targetId]: result.userVote === 0 ? null : result.userVote }) })
  }

  function getCount(id) { return scores[id] ?? 0 }
  function getVote(id) { return votes[id] ?? null }

  return { getCount, getVote, handleVote }
}
