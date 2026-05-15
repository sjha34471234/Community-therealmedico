// ============================================================
// FILE: components/AnswerCard.jsx
// PURPOSE: Renders a single answer — body, author, date, votes, accepted badge
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Answer display is reused on the question detail page for every
//   answer in the list. Extracted so QuestionDetail stays clean.
//   Uses VoteButton for vote interactions.
// DEPENDENCIES: components/VoteButton.jsx, lucide-react
// ⚠️ DO NOT CHANGE:
//   - white-space: pre-wrap on answer body — no markdown rendering yet.
//   - 'use client' required — contains VoteButton which is interactive.
//   - Named handler functions only — no arrow functions in JSX props.
//   - All <a> tags must be single line — iPad clipboard rule.
// ============================================================

'use client'

import { CheckCircle, User, Clock } from 'lucide-react'
import VoteButton from '@/components/VoteButton'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AnswerCard({
  answer,           // answer object from server
  authorUsername,   // resolved username string
  userId,           // current logged-in user id (null if guest)
  userVote,         // 1, -1, or null — this user's existing vote on this answer
  isQuestionOwner,  // boolean — can this user accept the answer?
  onAccept,         // callback(answerId) — called when owner clicks Accept
}) {
  function handleAccept() {
    if (onAccept) onAccept(answer.id)
  }

  return (
    <div
      id={'answer-' + answer.id}
      className={answer.is_accepted ? 'ac-card ac-card-accepted' : 'ac-card'}
    >
      {/* Accepted banner */}
      {answer.is_accepted && (
        <div className="ac-accepted-banner">
          <CheckCircle size={14} />
          Accepted Answer
        </div>
      )}

      {/* Body */}
      <p className="ac-body">{answer.body}</p>

      {/* Footer */}
      <div className="ac-footer">
        <div className="ac-footer-left">
          <VoteButton
            targetId={answer.id}
            targetType="answer"
            initialCount={answer.upvotes || 0}
            userVote={userVote || null}
            userId={userId}
          />

          {/* Accept button — only for question owner, only if not already accepted */}
          {isQuestionOwner && !answer.is_accepted && (
            <button
              type="button"
              className="ac-accept-btn"
              onClick={handleAccept}
              aria-label="Accept this answer"
            >
              <CheckCircle size={14} />
              Accept
            </button>
          )}
        </div>

        <div className="ac-meta">
          <span className="ac-meta-item">
            <User size={12} />
            {authorUsername || 'Anonymous User'}
          </span>
          <span className="ac-meta-item">
            <Clock size={12} />
            {formatDate(answer.created_at)}
          </span>
        </div>
      </div>

      <style>{`
        .ac-card {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: 10px;
          padding: 22px;
          margin-bottom: 16px;
        }
        .ac-card-accepted {
          border-color: var(--success);
          background: #F9FFF9;
        }
        .ac-accepted-banner {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--success);
          margin-bottom: 12px;
        }
        .ac-body {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.9rem;
          color: var(--text-primary);
          line-height: 1.75;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0 0 18px;
        }
        .ac-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid var(--bg-tertiary);
        }
        .ac-footer-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ac-accept-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: 1px solid var(--success);
          color: var(--success);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .ac-accept-btn:hover {
          background: var(--success);
          color: #fff;
        }
        .ac-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ac-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// REASON: Answer card for question detail page. Accepted answer styling,
//   VoteButton integration, Accept button for question owners (Phase 4 wires this up).
// --- END CHANGE LOG ---
