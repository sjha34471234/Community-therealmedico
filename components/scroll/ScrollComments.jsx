'use client';

// ============================================================
// FILE: components/scroll/ScrollComments.jsx
// PURPOSE: Inline comments + replies drawer for a scroll card
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll — comments without leaving the scroll feed
// ⚠️ PITFALLS:
//   - Reuses /api/answers — answers ARE comments here
//   - parent_id IS NULL for top-level answers (per brain dump rule)
//   - accessToken in Authorization header — never in body
//   - stopPropagation on drawer — prevents double-tap firing through overlay
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/Avatar';

export default function ScrollComments({ question, onClose }) {
  const { user, accessToken } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyInputOpen, setReplyInputOpen] = useState({});
  const [replyTexts, setReplyTexts] = useState({});

  useEffect(function() {
    async function load() {
      try {
        const res = await fetch('/api/answers?question_id=' + question.id, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
        setComments(data.answers || []);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [question.id]);

  async function postComment() {
    if (!inputText.trim() || !user || !accessToken) return;
    setPosting(true);
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ question_id: question.id, body: inputText.trim() }),
      });
      const data = await res.json();
      if (data.answer) {
        setComments(function(c) { return [data.answer, ...c]; });
        setInputText('');
      }
    } catch (_) {}
    setPosting(false);
  }

  async function postReply(commentId) {
    const text = replyTexts[commentId];
    if (!text || !text.trim() || !user || !accessToken) return;
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        credentials: 'include',
        body: JSON.stringify({ question_id: question.id, body: text.trim(), parent_id: commentId }),
      });
      const data = await res.json();
      if (data.answer) {
        setComments(function(prev) {
          return prev.map(function(c) {
            if (c.id !== commentId) return c;
            return { ...c, replies: [data.answer, ...(c.replies || [])] };
          });
        });
        setReplyTexts(function(r) { return { ...r, [commentId]: '' }; });
        setReplyInputOpen(function(r) { return { ...r, [commentId]: false }; });
        setExpandedReplies(function(r) { return { ...r, [commentId]: true }; });
      }
    } catch (_) {}
  }

  return (
    <div
      className="scroll-comments-overlay"
      onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}
      onTouchEnd={function(e) { e.stopPropagation(); }}
    >
      <div className="scroll-comments-drawer" onClick={function(e) { e.stopPropagation(); }}>
        <div className="scroll-comments-header">
          <span className="scroll-comments-title">Comments ({comments.length})</span>
          <button className="scroll-comments-close" onClick={onClose}>×</button>
        </div>

        <div className="scroll-comments-list">
          {loading && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Loading…</span>
          )}
          {!loading && comments.length === 0 && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>No comments yet. Be first!</span>
          )}
          {comments.map(function(comment) {
            const replies = comment.replies || [];
            return (
              <div key={comment.id} className="scroll-comment-item">
                <div className="scroll-comment-row">
                  <Avatar avatarRow={comment.avatar} username={comment.community_username} size="sm" />
                  <div className="scroll-comment-body">
                    <div className="scroll-comment-username">@{comment.community_username || 'anon'}</div>
                    <div className="scroll-comment-text">{comment.body}</div>
                    <div className="scroll-comment-actions">
                      <button
                        className="scroll-comment-action-btn"
                        onClick={function() { setReplyInputOpen(function(r) { return { ...r, [comment.id]: !r[comment.id] }; }); }}
                      >
                        Reply
                      </button>
                      {replies.length > 0 && (
                        <button
                          className="scroll-comment-action-btn"
                          onClick={function() { setExpandedReplies(function(r) { return { ...r, [comment.id]: !r[comment.id] }; }); }}
                        >
                          {expandedReplies[comment.id]
                            ? '▲ Hide replies'
                            : '▼ ' + replies.length + (replies.length === 1 ? ' reply' : ' replies')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {replyInputOpen[comment.id] && (
                  <div className="scroll-reply-input-row">
                    <input
                      className="scroll-comments-input"
                      placeholder="Write a reply…"
                      value={replyTexts[comment.id] || ''}
                      onChange={function(e) { setReplyTexts(function(r) { return { ...r, [comment.id]: e.target.value }; }); }}
                      onKeyDown={function(e) { if (e.key === 'Enter') postReply(comment.id); }}
                    />
                    <button className="scroll-comments-send" onClick={function() { postReply(comment.id); }}>
                      <Send size={15} color="#fff" />
                    </button>
                  </div>
                )}

                {expandedReplies[comment.id] && replies.length > 0 && (
                  <div className="scroll-replies">
                    {replies.map(function(reply) {
                      return (
                        <div key={reply.id} className="scroll-reply-item">
  <Avatar avatarRow={reply.avatar} username={reply.community_username} size="xs" />
                          <div className="scroll-comment-body">
                            <div className="scroll-comment-username">@{reply.community_username || 'anon'}</div>
                            <div className="scroll-comment-text">{reply.body}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="scroll-comments-input-row">
          <input
            className="scroll-comments-input"
            placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
            value={inputText}
            disabled={!user}
            onChange={function(e) { setInputText(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter') postComment(); }}
          />
          <button className="scroll-comments-send" onClick={postComment} disabled={posting || !user}>
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollComments — bottom drawer, inline replies,
//   post comment + reply, reuses /api/answers endpoint.
// --- END CHANGE LOG ---
