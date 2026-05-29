'use client';

// --- WHY THIS CODE EXISTS ---
// Top toolbar for the Scroll Creator.
// Contains: back (left) | title (left) | undo + preview + post (right).
// Handles auth check and canvas validation, then hands off to page.js
// via onShowConfirm(canvas, content) — page.js owns the actual API call.
// --- WHAT THIS MADE WORK ---
// Auth redirect, canvas validation, post request flow.
// --- PITFALLS ---
// accessToken from authStore — never session (session does not exist).
// canvas_data must be JSON.stringify'd before sending — done in page.js.
// content field = joined text from all text elements (5–300 chars).
// canvasRef.current.stopMusic() called before showing confirm sheet
//   so music doesn't play behind the sheet.
// onUndo returns true/false — toast "Nothing to undo" if false.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 toolbar with full post flow.
// [May 29 2026] UPDATED: Phase 15D —
//   Post API call moved to page.js. Toolbar validates only, then calls onShowConfirm.
//   Added ↩ Undo button — calls canvasRef.current.undo(), toasts if nothing to undo.
//   Added Eye preview button — calls onPreview prop.
//   Added onShowConfirm, onUndo (unused — handled via canvasRef), onPreview props.
//   Removed useRouter (navigation handled by page.js after post).
//   Kept useRouter for /auth redirect only.
// --- END CHANGE LOG ---

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function ScrollCreatorToolbar({
  canvasRef,
  getCanvas,
  onShowConfirm,
  onPreview,
}) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [validating, setValidating] = useState(false);

  const handleBack = function() {
    router.push('/scroll');
  };

  // ── Undo — calls canvas imperative method ──
  const handleUndo = function() {
    if (!canvasRef || !canvasRef.current) return;
    const didUndo = canvasRef.current.undo();
    if (!didUndo) toast('Nothing to undo.', { icon: '↩' });
  };

  // ── Post request — validates, then hands off to page.js ──
  const handlePostRequest = async function() {
    if (!user || !accessToken) {
      router.push('/auth?next=/scroll/create');
      return;
    }

    if (!getCanvas) { toast.error('Canvas not ready.'); return; }

    // Stop music before showing confirmation sheet
    if (canvasRef && canvasRef.current && canvasRef.current.stopMusic) {
      canvasRef.current.stopMusic();
    }

    const canvas = getCanvas();
    if (!canvas) { toast.error('Canvas not ready. Please try again.'); return; }

    // Extract content from text elements
    const textElements = (canvas.elements || []).filter(function(el) { return el.type === 'text'; });
    const content      = textElements.map(function(el) { return el.text || ''; }).join(' ').trim();

    if (!content || content.length < 5) {
      toast.error('Add at least one text block with 5+ characters to post.');
      return;
    }
    if (content.length > 300) {
      toast.error('Text content is too long. Keep it under 300 characters.');
      return;
    }

    // Hand off to page.js which shows the confirmation sheet
    if (onShowConfirm) onShowConfirm(canvas, content);
  };

  return (
    <div className="creator-toolbar">
      {/* Left: back + title */}
      <div className="creator-toolbar__left">
        <button
          className="creator-toolbar__btn"
          onClick={handleBack}
          aria-label="Back to scroll feed"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="creator-toolbar__title">Create Scroll</span>
      </div>

      {/* Right: undo + preview + post */}
      <div className="creator-toolbar__right">
        <button
          className="creator-toolbar__btn"
          onClick={handleUndo}
          aria-label="Undo last added element"
          title="Undo"
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>↩</span>
        </button>

        <button
          className="creator-toolbar__btn"
          onClick={onPreview}
          aria-label="Preview scroll"
          title="Preview"
        >
          <Eye size={17} />
        </button>

        <button
          className="creator-toolbar__post-btn"
          onClick={handlePostRequest}
          disabled={validating}
          aria-label="Post this scroll"
        >
          Post
        </button>
      </div>
    </div>
  );
}
