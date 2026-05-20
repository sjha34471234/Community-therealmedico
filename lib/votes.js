// ============================================================
// FILE: lib/votes.js
// LAST CHANGED: May 20, 2026
// ============================================================

export async function fetchVotesForPage(questionId, answerIds, accessToken) {
  const base = window.location.origin + '/api/votes'
  const headers = { Authorization: 'Bearer ' + accessToken }
  const opts = { headers: headers, credentials: 'include', cache: 'no-store' }
  const allIds = [{ type: 'question', id: questionId }]
  for (const id of answerIds) { allIds.push({ type: 'answer', id: id }) }
  const scores = {}
  const userVotes = {}
  await Promise.all(allIds.map(async function loadOne(target) {
    try {
      const param = target.type === 'question' ? '?question_id=' + target.id : '?answer_id=' + target.id
      const res = await fetch(base + param, opts)
      if (!res.ok) return
      const d = await res.json()
      scores[target.id] = (d.upvotes || 0) - (d.downvotes || 0)
      userVotes[target.id] = d.userVote ?? null
    } catch (_) {}
  }))
  return { scores: scores, userVotes: userVotes }
}

export async function postVote(questionId, answerId, voteType, accessToken) {
  const payload = { vote_type: voteType }
  if (questionId && questionId !== 'null' && questionId !== 'undefined') {
    payload.question_id = questionId
  }
  if (answerId && answerId !== 'null' && answerId !== 'undefined') {
    payload.answer_id = answerId
  }
  if (!payload.question_id && !payload.answer_id) {
    console.error('postVote called with no valid id', { questionId, answerId })
    return { error: 'No valid target ID', status: 400 }
  }
  const res = await fetch(window.location.origin + '/api/votes', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error || 'Vote failed', status: res.status }
  return { netScore: (data.upvotes || 0) - (data.downvotes || 0), userVote: data.userVote ?? null }
}
