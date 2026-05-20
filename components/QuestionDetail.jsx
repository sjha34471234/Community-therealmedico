// ============================================================
// FILE: components/QuestionDetail.jsx
// PURPOSE: Renders question + answers. Vote logic via useVotes hook.
// LAST CHANGED: May 20, 2026
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import { useVotes } from '@/hooks/useVotes'
import TagPill from '@/components/TagPill'
import VoteButton from '@/components/VoteButton'
import toast from 'react-hot-toast'
import { CheckCircle, MessageSquare, Eye, Clock, User, Send, AlertCircle, LogIn } from 'lucide-react'

const supabase = createClient()
const ANSWER_MAX = 5000

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getUsername(p) { return p?.community_username || 'Anonymous User' }
function isMember(p) { return p?.is_member === true }

export default function QuestionDetail({ question, answers, authorProfile, answerProfiles }) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { getScore, getVote, vote } = useVotes(question, answers)

  const [answerBody, setAnswerBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [answerError, setAnswerError] = useState('')

  const profileMap = {}
  answerProfiles.forEach(function map(p) { profileMap[p.id] = p })

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

  return (
    <main style={{ maxWidth:'768px', margin:'0 auto', padding:'32px 16px 64px' }}>

      <article className="qd-question-card">
        {question.is_pinned && <div className="qd-pinned-badge">📌 Pinned</div>}
        <h1 className="qd-title">{question.title}</h1>

        <div className="qd-meta-row">
          <span className="qd-meta-item"><User size={13} />
            <span style={{ color: isMember(authorProfile) ? 'var(--member-gold)' : 'inherit', fontWeight: isMember(authorProfile) ? 600 : 400 }}>
              {isMember(authorProfile) ? '👑 ' : ''}{getUsername(authorProfile)}
            </span>
          </span>
          <span className="qd-meta-item"><Clock size={13} />{formatDate(question.created_at)}</span>
          <span className="qd-meta-item"><Eye size={13} />{question.view_count || 0} views</span>
          <span className="qd-meta-item"><MessageSquare size={13} />{question.answer_count || 0} {question.answer_count === 1 ? 'answer' : 'answers'}</span>
        </div>

        {question.tags && question.tags.length > 0 && (
          <div className="qd-tags-row">
            {question.tags.map(function renderTag(tag) { return <TagPill key={tag} tag={tag} /> })}
          </div>
        )}

        <div className="qd-body">{question.body}</div>

        <div className="qd-vote-row">
          <VoteButton
            score={getScore(question.id)}
            userVote={getVote(question.id)}
            onUpvote={function up() { vote(question.id, null, 1) }}
            onDownvote={function down() { vote(question.id, null, -1) }}
          />
          {question.is_answered && <span className="qd-answered-badge"><CheckCircle size={14} /> Answered</span>}
        </div>
      </article>

      <section className="qd-answers-section">
        <h2 className="qd-answers-heading">
          {answers.length === 0 ? 'No answers yet' : answers.length === 1 ? '1 Answer' : answers.length + ' Answers'}
        </h2>

        {answers.map(function renderAnswer(answer) {
          const aProfile = profileMap[answer.user_id] || null
          const mem = isMember(aProfile)
          return (
            <div key={answer.id} id={'answer-' + answer.id}
              className={answer.is_accepted ? 'qd-answer-card qd-answer-accepted' : 'qd-answer-card'}
              style={{ borderLeft: mem && !answer.is_accepted ? '4px solid var(--member-border)' : undefined, backgroundColor: mem && !answer.is_accepted ? 'var(--member-bg)' : undefined }}
            >
              {answer.is_accepted && <div className="qd-accepted-banner"><CheckCircle size={14} /> Accepted Answer</div>}
              <div className="qd-answer-body">{answer.body}</div>
              <div className="qd-answer-footer">
                <VoteButton
                  score={getScore(answer.id)}
                  userVote={getVote(answer.id)}
                  onUpvote={function up() { vote(null, answer.id, 1) }}
                  onDownvote={function down() { vote(null, answer.id, -1) }}
                />
                <div className="qd-answer-meta">
                  <span className="qd-meta-item"><User size={12} />
                    <span style={{ color: mem ? 'var(--member-gold)' : 'inherit', fontWeight: mem ? 600 : 400 }}>
                      {mem ? '👑 ' : ''}{getUsername(aProfile)}
                    </span>
                  </span>
                  <span className="qd-meta-item"><Clock size={12} />{formatDate(answer.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="qd-answer-form-section">
        <h2 className="qd-answers-heading">Your Answer</h2>
        {!user ? (
          <div className="qd-auth-gate">
            <LogIn size={20} color="var(--accent-primary)" strokeWidth={1.5} />
            <p className="qd-auth-gate-text"><a href="/auth" className="qd-auth-link">Sign in</a> to post an answer and help the community.</p>
          </div>
        ) : (
          <div className="qd-answer-form-card">
            <textarea
              className={answerError ? 'qd-answer-textarea qd-textarea-error' : 'qd-answer-textarea'}
              placeholder="Write your answer here. Be clear, specific, and cite sources where relevant..."
              value={answerBody}
              onChange={handleAnswerChange}
              maxLength={ANSWER_MAX}
              disabled={submitting}
              rows={8}
            />
            <div className="qd-answer-form-footer">
              {answerError
                ? <span className="qd-form-error"><AlertCircle size={13} /> {answerError}</span>
                : <span className="qd-char-count">{answerBody.length}/{ANSWER_MAX}</span>
              }
              <button type="button" className="qd-post-answer-btn" onClick={handleAnswerSubmit} disabled={submitting}>
                {submitting ? 'Posting...' : <><Send size={14} /> Post Answer</>}
              </button>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .qd-question-card{background:var(--bg-primary);border:1px solid var(--bg-tertiary);border-radius:12px;padding:28px;margin-bottom:32px;}
        @media(max-width:600px){.qd-question-card{padding:18px 16px;}}
        .qd-pinned-badge{display:inline-block;font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:600;color:var(--warning);background:#FEF3C7;border-radius:20px;padding:3px 10px;margin-bottom:12px;}
        .qd-title{font-family:'Merriweather',Georgia,serif;font-size:1.5rem;font-weight:700;color:var(--text-primary);line-height:1.4;margin:0 0 16px;}
        @media(max-width:600px){.qd-title{font-size:1.2rem;}}
        .qd-meta-row{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:14px;}
        .qd-meta-item{display:inline-flex;align-items:center;gap:4px;font-family:'Inter',system-ui,sans-serif;font-size:0.78rem;color:var(--text-muted);}
        .qd-tags-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;}
        .qd-body{font-family:'Inter',system-ui,sans-serif;font-size:0.95rem;color:var(--text-primary);line-height:1.75;white-space:pre-wrap;word-break:break-word;margin-bottom:24px;}
        .qd-vote-row{display:flex;align-items:center;gap:6px;padding-top:16px;border-top:1px solid var(--bg-tertiary);}
        .qd-answered-badge{display:inline-flex;align-items:center;gap:5px;margin-left:12px;font-family:'Inter',system-ui,sans-serif;font-size:0.78rem;font-weight:600;color:var(--success);background:#E8F5E9;border-radius:20px;padding:3px 10px;}
        .qd-answers-section{margin-bottom:40px;}
        .qd-answers-heading{font-family:'Inter',system-ui,sans-serif;font-size:1rem;font-weight:700;color:var(--text-primary);margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid var(--bg-tertiary);}
        .qd-answer-card{background:var(--bg-primary);border:1px solid var(--bg-tertiary);border-radius:10px;padding:22px;margin-bottom:16px;}
        .qd-answer-accepted{border-color:var(--success)!important;background:#F9FFF9!important;}
        .qd-accepted-banner{display:inline-flex;align-items:center;gap:5px;font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;font-weight:700;color:var(--success);margin-bottom:12px;}
        .qd-answer-body{font-family:'Inter',system-ui,sans-serif;font-size:0.9rem;color:var(--text-primary);line-height:1.75;white-space:pre-wrap;word-break:break-word;margin-bottom:16px;}
        .qd-answer-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-top:12px;border-top:1px solid var(--bg-tertiary);}
        .qd-answer-meta{display:flex;gap:12px;flex-wrap:wrap;}
        .qd-auth-gate{display:flex;align-items:center;gap:10px;background:var(--bg-secondary);border:1px solid var(--bg-tertiary);border-radius:10px;padding:18px 20px;}
        .qd-auth-gate-text{font-family:'Inter',system-ui,sans-serif;font-size:0.9rem;color:var(--text-secondary);margin:0;}
        .qd-auth-link{color:var(--accent-primary);font-weight:600;text-decoration:none;}
        .qd-auth-link:hover{text-decoration:underline;}
        .qd-answer-form-card{background:var(--bg-primary);border:1px solid var(--bg-tertiary);border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:10px;}
        .qd-answer-textarea{font-family:'Inter',system-ui,sans-serif;font-size:0.9rem;color:var(--text-primary);background:var(--bg-secondary);border:1.5px solid var(--bg-tertiary);border-radius:8px;padding:10px 14px;width:100%;box-sizing:border-box;resize:vertical;min-height:160px;outline:none;line-height:1.6;white-space:pre-wrap;transition:border-color 0.15s;}
        .qd-answer-textarea:focus{border-color:var(--accent-primary);background:var(--bg-primary);}
        .qd-answer-textarea:disabled{opacity:0.6;cursor:not-allowed;}
        .qd-textarea-error{border-color:var(--danger)!important;}
        .qd-answer-form-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
        .qd-form-error{display:flex;align-items:center;gap:4px;font-family:'Inter',system-ui,sans-serif;font-size:0.78rem;color:var(--danger);}
        .qd-char-count{font-family:'Inter',system-ui,sans-serif;font-size:0.75rem;color:var(--text-muted);}
        .qd-post-answer-btn{display:inline-flex;align-items:center;gap:6px;background:var(--accent-primary);color:#fff;font-family:'Inter',system-ui,sans-serif;font-size:0.875rem;font-weight:600;padding:9px 20px;border-radius:8px;border:none;cursor:pointer;transition:background 0.15s;white-space:nowrap;}
        .qd-post-answer-btn:hover:not(:disabled){background:var(--accent-hover);}
        .qd-post-answer-btn:disabled{opacity:0.6;cursor:not-allowed;}
      `}</style>
    </main>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// [May 20, 2026] FIXED: Updated to use getScore/getVote/vote from useVotes hook
//               VoteButton now uses score/onUpvote/onDownvote props
// --- END CHANGE LOG ---
