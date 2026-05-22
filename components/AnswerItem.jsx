// ============================================================
// FILE: components/AnswerItem.jsx
// PURPOSE: Single answer card with vote, accept, reply thread toggle
// LAST CHANGED: May 21, 2026
// ============================================================
'use client'
import { useState, useRef, useEffect } from 'react'
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import VoteButton from '@/components/VoteButton'
import ReplyThread from '@/components/ReplyThread'
import Avatar from '@/components/Avatar'
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

export default function AnswerItem({ answer, questionAuthorId, questionId, getScore, getVote, vote, onAccepted }) {
  const { user, accessToken } = useAuthStore()
  const [showReplies, setShowReplies] = useState(false)
  const [replyCount, setReplyCount] = useState(answer.reply_count || 0)
  const [accepting, setAccepting] = useState(false)
  const [autoMention, setAutoMention] = useState(null)
  const [avatarData, setAvatarData] = useState(null)
  const replyThreadRef = useRef(null)
  const isMem = answer.author_is_member
  const isAccepted = answer.is_accepted
  const isQuestionAuthor = user && user.id === questionAuthorId
  const isOwnAnswer = user && user.id === answer.user_id

  useEffect(function() {
    if (!answer.user_id) return
    fetch(window.location.origin + '/api/avatar?user_id=' + answer.user_id, {
      credentials: 'include', cache: 'no-store',
    })
      .then(function(r) { return r.json() })
      .then(function(d) { if (d.avatar) setAvatarData(d.avatar) })
      .catch(function() {})
  }, [answer.user_id])

  async function handleAccept() {
    if (!user || !isQuestionAuthor) return
    setAccepting(true)
    try {
      const res = await fetch(window.location.origin + '/api/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify({ action: 'accept', answer_id: answer.id, question_id: questionId }),
      })
      if (!res.ok) { toast.error('Failed to accept answer'); return }
      toast.success('Answer accepted!')
      if (onAccepted) onAccepted()
    } catch (err) {
      toast.error('Network error')
    } finally {
      setAccepting(false)
    }
  }

  function handleReplyPosted() {
    setReplyCount(function(c) { return c + 1 })
    setAutoMention(null)
  }

  function handleReplyButtonClick() {
    setAutoMention(answer.author_username)
    setShowReplies(true)
  }

  const borderColor = isAccepted ? 'var(--success)' : isMem && !isAccepted ? 'var(--member-border)' : 'transparent'
  const bgColor = isAccepted ? '#F0FFF4' : isMem && !isAccepted ? 'var(--member-bg)' : 'transparent'

  return (
    <div id={'answer-' + answer.id} style={{ borderLeft: '3px solid ' + borderColor, backgroundColor: bgColor, borderRadius: '0 8px 8px 0', padding: '16px 0 16px 16px', marginBottom: '0' }}>

      {isAccepted && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>
          <CheckCircle size={13} /> Accepted Answer
        </div>
      )}

      {/* Author row with avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <a href={'/profile/' + answer.author_username} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Avatar avatar={avatarData} username={answer.author_username} size="sm" />
        </a>
        <div>
          <a href={'/profile/' + answer.author_username} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: isMem ? 'var(--member-gold)' : 'var(--accent-primary)', textDecoration: 'none', display: 'block' }}>
            {isMem ? '👑 ' : ''}{answer.author_username}
          </a>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(answer.created_at)}</span>
        </div>
      </div>

      <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 12px' }}>{answer.body}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <VoteButton score={getScore(answer.id)} userVote={getVote(answer.id)} onUpvote={function() { vote(null, answer.id, 1) }} onDownvote={function() { vote(null, answer.id, -1) }} />
          {isQuestionAuthor && !isOwnAnswer && (
            <button onClick={handleAccept} disabled={accepting} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: isAccepted ? 'var(--success)' : 'none', color: isAccepted ? '#fff' : 'var(--success)', border: '1.5px solid var(--success)', borderRadius: '6px', padding: '4px 10px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', fontWeight: 600, cursor: accepting ? 'not-allowed' : 'pointer', opacity: accepting ? 0.6 : 1 }}>
              <CheckCircle size={12} />{isAccepted ? 'Accepted' : 'Accept'}
            </button>
          )}
        </div>
        {user && (
          <button onClick={handleReplyButtonClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', padding: 0 }}>↩ Reply</button>
        )}
      </div>

      {/* Instagram-style reply toggle */}
      {replyCount > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '24px', height: '2px', background: 'var(--text-muted)', borderRadius: '2px', flexShrink: 0 }} />
          <button
            onClick={function() { setShowReplies(function(v) { return !v }) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}
          >
            {showReplies
              ? <>Hide replies <ChevronUp size={13} /></>
              : <>View {replyCount} {replyCount === 1 ? 'reply' : 'replies'} <ChevronDown size={13} /></>
            }
          </button>
        </div>
      )}

      {showReplies && (
        <ReplyThread
          ref={replyThreadRef}
          questionId={questionId}
          parentAnswerId={answer.id}
          parentAuthorUsername={answer.author_username}
          autoMention={autoMention}
          onReplyPosted={handleReplyPosted}
        />
      )}
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Single answer with vote, accept, reply thread toggle
// [May 21, 2026] UPDATED: Avatar wired in — sm size (36px), fetched per answer
//               Author row moved to top with avatar + username + time
// --- END CHANGE LOG ---
