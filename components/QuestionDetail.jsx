// ============================================================
// FILE: components/QuestionDetail.jsx
// PURPOSE: Question detail page — two column layout.
//          Left: question hero + answer feed.
//          Right: sticky answer write box.
// LAST CHANGED: May 21, 2026
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import { useVotes } from '@/hooks/useVotes'
import TagPill from '@/components/TagPill'
import VoteButton from '@/components/VoteButton'
import AnswerFeed from '@/components/AnswerFeed'
import toast from 'react-hot-toast'
import { CheckCircle, Eye, Clock, User, Send, AlertCircle, LogIn, MessageSquare } from 'lucide-react'

const supabase = createClient()
const ANSWER_MAX = 5000

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getUsername(p) { return p?.community_username || 'Anonymous User' }
function isMember(p) { return p?.is_member === true }

export default function QuestionDetail({ question, answers: initialAnswers, authorProfile, answerProfiles }) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { getScore, getVote, vote } = useVotes(question, initialAnswers)

  const [answerBody, setAnswerBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [answerError, setAnswerError] = useState('')
  const [answered, setAnswered] = useState(question.is_answered)

  useEffect(function upsertView() {
    if (!user || !question?.id || !question?.last_activity_at) return
    supabase.from('community_post_views').upsert(
      { user_id: user.id, question_id: question.id, viewed_at: new Date().toISOString(), activity_snapshot: question.last_activity_at },
      { onConflict: 'user_id,question_id' }
    ).then(function done({ error }) { if (error) console.error('View upsert:', error) })
  }, [user, question?.id, question?.last_activity_at])

  async function handleAnswerSubmit() {
    if (!answerBody.trim()) { setAnswerError('Please write your answer before posting.'); return }
    if (answerBody.trim().length < 30) { setAnswerError('Answer must be at least 30 characters.'); return }
    setAnswerError('')
    setSubmitting(true)
    try {
      const res = await fetch(window.location.origin + '/api/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify({ question_id: question.id, body: answerBody.trim() }),
      })
      const data = await res.json()
      if (res.status === 429) { toast.error('Too many answers. Please wait.'); return }
      if (!res.ok) { toast.error(data.error || 'Something went wrong.'); return }
      toast.success('Answer posted!')
      setAnswerBody('')
      router.refresh()
    } catch (err) {
      toast.error('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnswerChange(e) { setAnswerBody(e.target.value); if (answerError) setAnswerError('') }

  const mem = isMember(authorProfile)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 64px' }}>
      <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

        {/* ── Left column ── */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

          {/* Question hero */}
          <article style={{ background: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', borderRadius: '14px', padding: '28px', marginBottom: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {question.is_pinned && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'var(--warning)', background: '#FEF3C7', borderRadius: '20px', padding: '3px 10px' }}>📌 Pinned</span>
              </div>
            )}

            <h1 style={{ fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 16px', textTransform: 'uppercase' }}>{question.title}</h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
              <a href={'/profile/' + getUsername(authorProfile)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: mem ? 'var(--member-gold)' : 'var(--accent-primary)', textDecoration: 'none' }}>
                <User size={13} />{mem ? '👑 ' : ''}{getUsername(authorProfile)}
              </a>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}><Clock size={13} />{formatDate(question.created_at)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}><Eye size={13} />{question.view_count || 0} views</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--text-muted)' }}><MessageSquare size={13} />{question.answer_count || 0} {question.answer_count === 1 ? 'answer' : 'answers'}</span>
              {answered && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', background: '#E8F5E9', borderRadius: '20px', padding: '3px 10px' }}><CheckCircle size={13} /> Answered</span>
              )}
            </div>

            {question.tags && question.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {question.tags.map(function(tag) { return <TagPill key={tag} tag={tag} /> })}
              </div>
            )}

            <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--bg-tertiary)' }}>{question.body}</div>

            <VoteButton
              score={getScore(question.id)}
              userVote={getVote(question.id)}
              onUpvote={function() { vote(question.id, null, 1) }}
              onDownvote={function() { vote(question.id, null, -1) }}
            />
          </article>

          {/* Answer feed */}
          <AnswerFeed
            question={question}
            questionAuthorId={question.user_id}
            initialAnswers={initialAnswers}
            initialHasMore={initialAnswers.length >= 10}
            onAnswerAccepted={function() { setAnswered(true) }}
          />

        </div>

        {/* ── Right column — sticky answer box ── */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '16px' }} className="qd-sidebar">
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>Your Answer</h3>

            {!user ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <LogIn size={24} color="var(--accent-primary)" strokeWidth={1.5} />
                <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 12px', lineHeight: 1.5 }}>Sign in to post an answer and help the community.</p>
                <a href="/auth" style={{ display: 'inline-block', background: 'var(--accent-primary)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', fontWeight: 600, padding: '8px 20px', borderRadius: '8px', textDecoration: 'none' }}>Sign In</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: answerError ? '1.5px solid var(--danger)' : '1.5px solid var(--bg-tertiary)', borderRadius: '8px', padding: '10px 14px', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '160px', outline: 'none', lineHeight: 1.6, whiteSpace: 'pre-wrap', transition: 'border-color 0.15s' }}
                  placeholder="Write your answer here. Be clear, specific, and cite sources where relevant..."
                  value={answerBody}
                  onChange={handleAnswerChange}
                  maxLength={ANSWER_MAX}
                  disabled={submitting}
                  rows={7}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {answerError
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--danger)' }}><AlertCircle size={13} />{answerError}</span>
                    : <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{answerBody.length}/{ANSWER_MAX}</span>
                  }
                  <button type="button" onClick={handleAnswerSubmit} disabled={submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-primary)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 600, padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, transition: 'background 0.15s', whiteSpace: 'nowrap' }}>
                    {submitting ? 'Posting...' : <><Send size={14} /> Post Answer</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 720px) {
          .qd-sidebar { display: none; }
        }
      `}</style>

    </div>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// [May 20, 2026] FIXED: useVotes hook integration
// [May 21, 2026] REWRITTEN: Two column layout, AnswerFeed component,
//               clickable usernames, bigger question hero
// --- END CHANGE LOG ---
