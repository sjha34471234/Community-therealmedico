// ============================================================
// FILE: components/VoteButton.jsx
// LAST CHANGED: May 20, 2026
// ============================================================
'use client'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function VoteButton({ score, userVote, onUpvote, onDownvote }) {
  return (
    <div className="vb-wrap">
      <button type="button" onClick={onUpvote} aria-label="Upvote" className={userVote === 1 ? 'vb-btn vb-active-up' : 'vb-btn'}>
        <ChevronUp size={18} />
      </button>
      <span className="vb-score">{score}</span>
      <button type="button" onClick={onDownvote} aria-label="Downvote" className={userVote === -1 ? 'vb-btn vb-active-down' : 'vb-btn'}>
        <ChevronDown size={18} />
      </button>
      <style>{`
        .vb-wrap{display:inline-flex;align-items:center;gap:4px;}
        .vb-btn{background:var(--bg-secondary);border:1px solid var(--bg-tertiary);border-radius:6px;padding:4px 6px;cursor:pointer;display:inline-flex;align-items:center;color:var(--text-muted);transition:background 0.15s,color 0.15s,border-color 0.15s;line-height:1;}
        .vb-btn:hover{background:var(--accent-light);color:var(--accent-primary);}
        .vb-active-up{background:var(--accent-light) !important;color:var(--accent-primary) !important;border-color:var(--accent-primary) !important;}
        .vb-active-down{background:#FEF2F2 !important;color:var(--danger) !important;border-color:var(--danger) !important;}
        .vb-score{font-family:'Inter',system-ui,sans-serif;font-size:0.9rem;font-weight:700;color:var(--text-primary);min-width:20px;text-align:center;}
      `}</style>
    </div>
  )
}
