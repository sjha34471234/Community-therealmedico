// ============================================================
// FILE: lib/votes.js
// PURPOSE: Pure functions for fetching and casting votes
// LAST CHANGED: May 20, 2026
// ============================================================

// Fetch current vote state for a single target
export async function fetchVote({ targetType, targetId, accessToken }) {
  const param = targetType === 'question'
    ? 'question_id=' + targetId
    : 'answer_id=' + targetId

  const res = await fetch(
    window.location.origin + '/api/votes?' + param,
    {
      headers: { Authorization: 'Bearer ' + accessToken },
      credentials: 'include',
      cache: 'no-store',
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return {
    upvotes: data.upvotes ?? 0,
    downvotes: data.downvotes ?? 0,
    netScore: (data.upvotes ?? 0) - (data.downvotes ?? 0),
    userVote: data.userVote ?? null,
  }
}

// Cast or remove a vote
export async function castVote({ targetType, targetId, voteType, accessToken }) {
  const body = { vote_type: voteType }
  if (targetType === 'question') {
    body.question_id = targetId
  } else {
    body.answer_id = targetId
  }

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
  if (!res.ok) return { error: data.error || 'Vote failed', status: res.status }

  return {
    upvotes: data.upvotes ?? 0,
    downvotes: data.downvotes ?? 0,
    netScore: (data.upvotes ?? 0) - (data.downvotes ?? 0),
    userVote: data.userVote ?? 0,
  }
}
