// ============================================================
// FILE: hooks/useVotes.js
// LAST CHANGED: May 20, 2026
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { fetchVotesForPage, postVote } from '@/lib/votes'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export function useVotes(question, answers) {
  const { user, accessToken } = useAuthStore()

  const [scores, setScores] = useState(function init() {
    const m = {}
    if (question?.id) m[question.id] = (question.upvotes || 0) - (question.downvotes || 0)
    for (const a of (answers || [])) { if (a?.id) m[a.id] = (a.upvotes || 0) - (a.downvotes || 0) }
    return m
  })
  const [userVotes, setUserVotes] = useState({})

  useEffect(function loadLiveVotes() {
    if (!user || !accessToken || !question?.id) return
    const answerIds = (answers || []).map(function getId(a) { return a.id }).filter(Boolean)
    fetchVotesForPage(question.id, answerIds, accessToken).then(function apply(result) {
      setScores(function prev(s) { return Object.assign({}, s, result.scores) })
      setUserVotes(result.userVotes)
    })
  }, [user, accessToken, question?.id])

  async function vote(questionId, answerId, voteType) {
    if (!user) { toast.error('Sign in to vote'); return }
    const targetId = questionId || answerId
    const prevScore = scores[targetId] ?? 0
    const prevVote = userVotes[targetId] ?? null
    const newVote = prevVote === voteType ? 0 : voteType
    const delta = newVote - (prevVote || 0)
    setScores(function s(p) { return Object.assign({}, p, { [targetId]: prevScore + delta }) })
    setUserVotes(function v(p) { return Object.assign({}, p, { [targetId]: newVote === 0 ? null : newVote }) })
    const result = await postVote(questionId, answerId, newVote, accessToken)
    if (result.error) {
      setScores(function s(p) { return Object.assign({}, p, { [targetId]: prevScore }) })
      setUserVotes(function v(p) { return Object.assign({}, p, { [targetId]: prevVote }) })
      toast.error(result.status === 429 ? 'Voting too quickly.' : result.error)
      return
    }
    setScores(function s(p) { return Object.assign({}, p, { [targetId]: result.netScore }) })
    setUserVotes(function v(p) { return Object.assign({}, p, { [targetId]: result.userVote === 0 ? null : result.userVote }) })
  }

  function getScore(id) { return scores[id] ?? 0 }
  function getVote(id) { return userVotes[id] ?? null }
  return { getScore: getScore, getVote: getVote, vote: vote }
}
