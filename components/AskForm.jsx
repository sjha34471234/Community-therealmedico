// ============================================================
// FILE: components/AskForm.jsx
// PURPOSE: Client component — Ask a Question form with auth gate
// LAST CHANGED: May 19, 2026
// WHY IT EXISTS: The ask form needs client-side auth state and form interactivity.
//                Separated from app/ask/page.js so that page.js can export metadata.
// DEPENDENCIES: store/authStore.js, react-hot-toast, lucide-react
// ⚠️ DO NOT CHANGE:
//   - useAuthStore for auth — never separate onAuthStateChange here
//   - credentials: 'include' must be on all fetch calls
//   - Authorization: Bearer token must be on POST — never cookies only
//   - window.location.origin must be used for API URL — never relative paths
//   - All <a> tags must be single line — iPad clipboard rule
//   - Named handler functions only — no arrow functions in JSX props
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Send, Tag, X, AlertCircle, LogIn } from 'lucide-react'
import useAuthStore from '@/store/authStore'

const TITLE_MAX = 200
const BODY_MAX = 5000
const TAG_MAX = 5

export default function AskForm() {
  const router = useRouter()
  const { user, loading: authLoading, accessToken } = useAuthStore()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // ── Tag helpers ─────────────────────────────────────────
  function addTag(raw) {
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!cleaned) return
    if (tags.length >= TAG_MAX) {
      toast.error('Maximum 5 tags allowed')
      return
    }
    if (tags.includes(cleaned)) {
      setTagInput('')
      return
    }
    setTags(Array.from(new Set([...tags, cleaned])))
    setTagInput('')
  }

  function removeTag(tag) {
    setTags(tags.filter(function filterTag(t) { return t !== tag }))
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  function handleTagBlur() {
    if (tagInput.trim()) addTag(tagInput)
  }

  // ── Validation ──────────────────────────────────────────
  function validate() {
    const errs = {}
    if (!title.trim()) errs.title = 'Question title is required'
    else if (title.trim().length < 15) errs.title = 'Title must be at least 15 characters'
    else if (title.trim().length > TITLE_MAX) errs.title = `Title must be under ${TITLE_MAX} characters`
    if (!body.trim()) errs.body = 'Please describe your question in detail'
    else if (body.trim().length < 30) errs.body = 'Body must be at least 30 characters'
    else if (body.trim().length > BODY_MAX) errs.body = `Body must be under ${BODY_MAX} characters`
    return errs
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const res = await fetch(window.location.origin + '/api/questions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), tags }),
      })
      const data = await res.json()
      if (res.status === 429) {
        toast.error('You\'ve posted too many questions recently. Please wait a while.')
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong. Please try again.')
        return
      }
      toast.success('Question posted!')
      router.push('/q/' + data.slug)
    } catch (err) {
      console.error('Ask submit error:', err)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    if (errors.title) setErrors(function prev(p) { return { ...p, title: undefined } })
  }

  function handleBodyChange(e) {
    setBody(e.target.value)
    if (errors.body) setErrors(function prev(p) { return { ...p, body: undefined } })
  }

  // ── Render: loading ──────────────────────────────────────
  if (authLoading) {
    return (
      <main style={{ maxWidth: '768px', margin: '0 auto', padding: '40px 16px' }}>
        <div className="ask-skeleton" />
      </main>
    )
  }

  // ── Render: guest gate ───────────────────────────────────
  if (!user) {
    return (
      <main style={{ maxWidth: '768px', margin: '0 auto', padding: '40px 16px' }}>
        <div className="ask-gate">
          <LogIn size={32} color="var(--accent-primary)" strokeWidth={1.5} />
          <h1 className="ask-gate-title">Sign in to ask a question</h1>
          <p className="ask-gate-body">Join the Real Medico community — free to sign up, and your questions help thousands of other healthcare students.</p>
          <a href="/auth" className="ask-gate-btn">Sign in to continue</a>
        </div>
      </main>
    )
  }

  // ── Render: form ─────────────────────────────────────────
  return (
    <main style={{ maxWidth: '768px', margin: '0 auto', padding: '40px 16px' }}>
      <div className="ask-header">
        <h1 className="ask-page-title">Ask a Question</h1>
        <p className="ask-page-subtitle">Be specific. A good question title and enough context in the body gets faster, better answers.</p>
      </div>

      <div className="ask-form-card">

        <div className="ask-field">
          <label className="ask-label" htmlFor="ask-title">Question title <span className="ask-required">*</span></label>
          <p className="ask-hint">Imagine you&apos;re asking a senior colleague in one sentence.</p>
          <input
            id="ask-title"
            type="text"
            className={errors.title ? 'ask-input ask-input-error' : 'ask-input'}
            placeholder="e.g. What is the mechanism of action of furosemide?"
            value={title}
            onChange={handleTitleChange}
            maxLength={TITLE_MAX}
            disabled={submitting}
          />
          <div className="ask-field-footer">
            {errors.title ? <span className="ask-error"><AlertCircle size={13} /> {errors.title}</span> : <span />}
            <span className="ask-char-count">{title.length}/{TITLE_MAX}</span>
          </div>
        </div>

        <div className="ask-field">
          <label className="ask-label" htmlFor="ask-body">Details <span className="ask-required">*</span></label>
          <p className="ask-hint">Include what you already know, where you&apos;re stuck, and any relevant context (patient scenario, exam question, clinical placement, etc.)</p>
          <textarea
            id="ask-body"
            className={errors.body ? 'ask-textarea ask-input-error' : 'ask-textarea'}
            placeholder="Describe your question in detail..."
            value={body}
            onChange={handleBodyChange}
            maxLength={BODY_MAX}
            disabled={submitting}
            rows={10}
          />
          <div className="ask-field-footer">
            {errors.body ? <span className="ask-error"><AlertCircle size={13} /> {errors.body}</span> : <span />}
            <span className="ask-char-count">{body.length}/{BODY_MAX}</span>
          </div>
        </div>

        <div className="ask-field">
          <label className="ask-label" htmlFor="ask-tags">Tags <span className="ask-optional">(optional, up to 5)</span></label>
          <p className="ask-hint">Add topics like <strong>pharmacology</strong>, <strong>anatomy</strong>, <strong>paediatrics</strong>. Press Enter or comma to add.</p>
          <div className={tags.length >= TAG_MAX ? 'ask-tag-input-wrap ask-tag-input-full' : 'ask-tag-input-wrap'}>
            {tags.map(function renderTag(tag) {
              return (
                <span key={tag} className="ask-tag-chip">
                  <Tag size={11} />
                  {tag}
                  <button type="button" className="ask-tag-remove" onClick={function handleRemove() { removeTag(tag) }} aria-label={'Remove tag ' + tag} disabled={submitting}>
                    <X size={11} />
                  </button>
                </span>
              )
            })}
            {tags.length < TAG_MAX && (
              <input
                id="ask-tags"
                type="text"
                className="ask-tag-text-input"
                placeholder={tags.length === 0 ? 'Type a tag and press Enter' : 'Add another...'}
                value={tagInput}
                onChange={function handleTagInputChange(e) { setTagInput(e.target.value) }}
                onKeyDown={handleTagKeyDown}
                onBlur={handleTagBlur}
                disabled={submitting}
              />
            )}
          </div>
          <p className="ask-tag-count">{tags.length}/{TAG_MAX} tags added</p>
        </div>

        <div className="ask-submit-row">
          <a href="/" className="ask-cancel-btn">Cancel</a>
          <button type="button" className="ask-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <span className="ask-submitting">Posting...</span> : <><Send size={15} /> Post Question</>}
          </button>
        </div>

      </div>

      <style>{`
        .ask-skeleton { height:400px; background:linear-gradient(90deg,var(--bg-secondary) 25%,var(--bg-tertiary) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:askSkeleton 1.4s ease infinite; border-radius:12px; }
        @keyframes askSkeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .ask-gate { display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; padding:60px 24px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--bg-tertiary); }
        .ask-gate-title { font-family:'Merriweather',Georgia,serif; font-size:1.4rem; font-weight:700; color:var(--text-primary); margin:0; }
        .ask-gate-body { font-family:'Inter',system-ui,sans-serif; font-size:0.95rem; color:var(--text-secondary); max-width:420px; margin:0; line-height:1.6; }
        .ask-gate-btn { display:inline-block; background:var(--accent-primary); color:#fff; font-family:'Inter',system-ui,sans-serif; font-size:0.9rem; font-weight:600; padding:10px 24px; border-radius:8px; text-decoration:none; margin-top:8px; transition:background 0.15s; }
        .ask-gate-btn:hover { background:var(--accent-hover); }
        .ask-header { margin-bottom:28px; }
        .ask-page-title { font-family:'Merriweather',Georgia,serif; font-size:1.75rem; font-weight:700; color:var(--text-primary); margin:0 0 8px; }
        .ask-page-subtitle { font-family:'Inter',system-ui,sans-serif; font-size:0.95rem; color:var(--text-secondary); margin:0; line-height:1.6; }
        .ask-form-card { background:var(--bg-primary); border:1px solid var(--bg-tertiary); border-radius:12px; padding:32px; display:flex; flex-direction:column; gap:28px; }
        @media(max-width:600px){.ask-form-card{padding:20px 16px;}}
        .ask-field { display:flex; flex-direction:column; gap:6px; }
        .ask-label { font-family:'Inter',system-ui,sans-serif; font-size:0.875rem; font-weight:600; color:var(--text-primary); }
        .ask-required { color:var(--danger); margin-left:2px; }
        .ask-optional { font-weight:400; color:var(--text-muted); font-size:0.8rem; }
        .ask-hint { font-family:'Inter',system-ui,sans-serif; font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5; }
        .ask-input,.ask-textarea { font-family:'Inter',system-ui,sans-serif; font-size:0.9rem; color:var(--text-primary); background:var(--bg-secondary); border:1.5px solid var(--bg-tertiary); border-radius:8px; padding:10px 14px; width:100%; box-sizing:border-box; transition:border-color 0.15s; outline:none; }
        .ask-input:focus,.ask-textarea:focus { border-color:var(--accent-primary); background:var(--bg-primary); }
        .ask-input-error { border-color:var(--danger)!important; }
        .ask-textarea { resize:vertical; min-height:200px; line-height:1.6; white-space:pre-wrap; }
        .ask-input:disabled,.ask-textarea:disabled { opacity:0.6; cursor:not-allowed; }
        .ask-field-footer { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .ask-error { display:flex; align-items:center; gap:4px; font-family:'Inter',system-ui,sans-serif; font-size:0.78rem; color:var(--danger); }
        .ask-char-count { font-family:'Inter',system-ui,sans-serif; font-size:0.75rem; color:var(--text-muted); white-space:nowrap; }
        .ask-tag-input-wrap { display:flex; flex-wrap:wrap; gap:6px; align-items:center; background:var(--bg-secondary); border:1.5px solid var(--bg-tertiary); border-radius:8px; padding:8px 10px; min-height:44px; cursor:text; transition:border-color 0.15s; }
        .ask-tag-input-wrap:focus-within { border-color:var(--accent-primary); background:var(--bg-primary); }
        .ask-tag-chip { display:inline-flex; align-items:center; gap:4px; background:var(--accent-light); color:var(--accent-primary); font-family:'Inter',system-ui,sans-serif; font-size:0.78rem; font-weight:500; padding:3px 8px 3px 7px; border-radius:20px; }
        .ask-tag-remove { background:none; border:none; cursor:pointer; color:var(--accent-primary); display:inline-flex; align-items:center; padding:0; opacity:0.7; transition:opacity 0.1s; }
        .ask-tag-remove:hover { opacity:1; }
        .ask-tag-text-input { border:none; outline:none; background:transparent; font-family:'Inter',system-ui,sans-serif; font-size:0.875rem; color:var(--text-primary); flex:1; min-width:140px; }
        .ask-tag-count { font-family:'Inter',system-ui,sans-serif; font-size:0.75rem; color:var(--text-muted); margin:0; }
        .ask-submit-row { display:flex; justify-content:flex-end; align-items:center; gap:12px; padding-top:4px; border-top:1px solid var(--bg-tertiary); }
        .ask-cancel-btn { font-family:'Inter',system-ui,sans-serif; font-size:0.875rem; font-weight:500; color:var(--text-secondary); text-decoration:none; padding:9px 18px; border-radius:8px; transition:background 0.15s,color 0.15s; }
        .ask-cancel-btn:hover { background:var(--bg-secondary); color:var(--text-primary); }
        .ask-submit-btn { display:inline-flex; align-items:center; gap:7px; background:var(--accent-primary); color:#fff; font-family:'Inter',system-ui,sans-serif; font-size:0.875rem; font-weight:600; padding:9px 22px; border-radius:8px; border:none; cursor:pointer; transition:background 0.15s; }
        .ask-submit-btn:hover:not(:disabled) { background:var(--accent-hover); }
        .ask-submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .ask-submitting { font-family:'Inter',system-ui,sans-serif; font-size:0.875rem; }
      `}</style>
    </main>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build — Phase 3
// [May 19, 2026] FIXED: Replaced separate onAuthStateChange with useAuthStore.
//               Added Authorization: Bearer token to POST request.
//               REASON: API route requires Bearer token — cookies alone were being
//               rejected, causing "You must be signed in" error for logged-in users.
// --- END CHANGE LOG ---
