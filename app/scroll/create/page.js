'use client';
// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — wires canvas, toolbar, tabs, confirmation, draft, templates.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1.
// [May 27 2026] FIXED: Canvas clipped — hide site chrome via useEffect.
// [May 27 2026] FIXED: Dynamic available height via toolbarRef/tabsRef.
// [May 28 2026] ADDED: Canvas orientation selector (Portrait/Square/Landscape).
// [May 29 2026] ADDED: Phase 15D —
//   previewMode state — hides toolbar/tabs via creator-chrome-hidden class.
//     Canvas fills full screen. Tap canvas to exit. Eye button in toolbar toggles.
//   Post confirmation — handleShowConfirm captures canvas+content, shows sheet.
//     handleConfirmPost makes the actual API call (was in ScrollCreatorToolbar).
//   Draft save — setInterval every 30s writes canvas to localStorage.
//     Only saves when canvas has elements (don't save empty canvas).
//   Draft restore — on mount, checks localStorage for draft < 24h old.
//     Banner inside toolbarRef div so its height is included in available-height calc.
//     handleRestoreDraft: sets orientation, then after 50ms calls setCanvasState.
//     handleDiscardDraft: clears localStorage, hides banner.
//   effectiveHeight: window.innerHeight in preview mode (fills full screen),
//     canvasAreaHeight otherwise.
// [May 30 2026] ADDED: Phase 15E — Template picker.
//   showTemplatePicker: starts true. Hidden when a valid draft is found (setShowTemplatePicker(false)).
//   Stays visible until user picks a template or clicks "Start blank →".
//   handleSelectTemplate: sets orientation, syncs shadow state, regenerates element IDs
//     (to avoid ID conflicts if same template loaded twice), then after 50ms calls
//     canvasRef.current.setCanvasState() — same 50ms pattern as handleRestoreDraft.
//   handleStartBlank: just hides picker, canvas stays blank.
//   Draft check useEffect modified: if valid draft found → setShowTemplatePicker(false)
//     so picker is skipped and the draft banner is shown instead.
// --- END CHANGE LOG ---

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './creator.css';
import { ScrollCreatorCanvasWithRef } from '@/components/scroll/creator/ScrollCreatorCanvas';
import ScrollCreatorToolbar          from '@/components/scroll/creator/ScrollCreatorToolbar';
import ScrollCreatorTabs             from '@/components/scroll/creator/ScrollCreatorTabs';
import ScrollPostConfirmSheet        from '@/components/scroll/creator/ScrollPostConfirmSheet';
import ScrollCreatorTemplates        from '@/components/scroll/creator/ScrollCreatorTemplates';
import useAuthStore                  from '@/store/authStore';
import toast                         from 'react-hot-toast';

const DRAFT_KEY = 'scroll_creator_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const ORIENTATION_OPTIONS = [
  { key: 'portrait',  label: '9:16', ariaLabel: 'Portrait'  },
  { key: 'square',    label: '1:1',  ariaLabel: 'Square'    },
  { key: 'landscape', label: '16:9', ariaLabel: 'Landscape' },
];

export default function ScrollCreatePage() {
  const router     = useRouter();
  const canvasRef  = useRef(null);
  const toolbarRef = useRef(null);
  const tabsRef    = useRef(null);

  const { user, accessToken } = useAuthStore();

  // ── Canvas shadow state (mirrors canvas for toolbar/tabs) ──
  const [shadowBg,    setShadowBg]    = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic] = useState(null);

  // ── Layout ────────────────────────────────────────────────
  const [orientation,      setOrientation]      = useState('portrait');
  const [canvasAreaHeight, setCanvasAreaHeight] = useState(null);

  // ── Preview mode ──────────────────────────────────────────
  const [previewMode, setPreviewMode] = useState(false);

  // ── Post confirmation ─────────────────────────────────────
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmData,  setConfirmData]  = useState(null); // { canvas, content }
  const [posting,      setPosting]      = useState(false);

  // ── Draft banner ──────────────────────────────────────────
  const [draftBanner, setDraftBanner] = useState(null); // null or draft object

  // ── Template picker (Phase 15E) ───────────────────────────
  // Starts true — shown immediately on creator open.
  // Set to false when a valid draft is found (draft takes priority over template picker).
  // Set to false when user picks a template or clicks "Start blank →".
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);

  // ── Hide site chrome ──────────────────────────────────────
  useEffect(function() {
    const navbar     = document.querySelector('nav');
    const bottomNav  = document.querySelector('.bottom-nav');
    const pageScroll = document.getElementById('page-scroll-container');
    if (navbar)     navbar.style.display      = 'none';
    if (bottomNav)  bottomNav.style.display   = 'none';
    if (pageScroll) pageScroll.style.overflow = 'hidden';
    return function() {
      if (navbar)     navbar.style.display      = '';
      if (bottomNav)  bottomNav.style.display   = '';
      if (pageScroll) pageScroll.style.overflow = '';
    };
  }, []);

  // ── Check for saved draft on mount (Phase 15E: also controls template picker) ──
  // If a valid draft exists → show draft banner, hide template picker.
  // If no draft (or expired) → template picker stays visible (default true).
  useEffect(function() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return; // No draft — template picker stays shown
      const draft = JSON.parse(raw);
      const age   = Date.now() - (draft.timestamp || 0);
      if (age < DRAFT_MAX_AGE_MS && draft.canvas && (draft.canvas.elements || []).length > 0) {
        setDraftBanner(draft);
        setShowTemplatePicker(false); // Draft takes priority — skip template picker
      } else {
        localStorage.removeItem(DRAFT_KEY); // Expired draft — template picker stays shown
      }
    } catch (e) {
      // Corrupt draft — template picker stays shown (default true is already set)
    }
  }, []);

  // ── Auto-save draft every 30s ─────────────────────────────
  useEffect(function() {
    const interval = setInterval(function() {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current.getCanvas();
      if (!canvas || (canvas.elements || []).length === 0) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          canvas,
          orientation,
          timestamp: Date.now(),
        }));
      } catch (e) {
        // localStorage full — ignore
      }
    }, 30000);
    return function() { clearInterval(interval); };
  }, [orientation]);

  // ── Height calculation ────────────────────────────────────
  // toolbarRef wraps toolbar + orientation row + draft banner — all heights subtracted.
  useEffect(function() {
    function measure() {
      if (previewMode) {
        setCanvasAreaHeight(window.innerHeight);
        return;
      }
      const totalH   = window.innerHeight;
      const toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 80;
      const tabsH    = tabsRef.current    ? tabsRef.current.offsetHeight    : 260;
      setCanvasAreaHeight(Math.max(totalH - toolbarH - tabsH, 100));
    }
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 300);
    return function() {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [previewMode]);

  // Re-measure when draft banner appears/disappears (it's inside toolbarRef)
  useEffect(function() {
    const t = setTimeout(function() {
      if (previewMode) return;
      const totalH   = window.innerHeight;
      const toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 80;
      const tabsH    = tabsRef.current    ? tabsRef.current.offsetHeight    : 260;
      setCanvasAreaHeight(Math.max(totalH - toolbarH - tabsH, 100));
    }, 100);
    return function() { clearTimeout(t); };
  }, [draftBanner, previewMode]);

  // ── Draft handlers ────────────────────────────────────────
  const handleRestoreDraft = useCallback(function() {
    const draft = draftBanner;
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
    if (!draft) return;

    // Set orientation first (may trigger canvas reset if different),
    // then restore canvas state after 50ms so reset completes first.
    setOrientation(draft.orientation || 'portrait');
    setShadowBg(draft.canvas.background    || { type: 'solid', value: '#1a1a2e' });
    setShadowMusic(draft.canvas.music      || null);

    setTimeout(function() {
      if (canvasRef.current) {
        canvasRef.current.setCanvasState(draft.canvas);
      }
    }, 50);
  }, [draftBanner]);

  const handleDiscardDraft = useCallback(function() {
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
    // After discarding draft, show template picker so user isn't left with blank canvas
    setShowTemplatePicker(true);
  }, []);

  // ── Template picker handlers (Phase 15E) ──────────────────
  const handleSelectTemplate = useCallback(function(template) {
    setShowTemplatePicker(false);

    // Set orientation first (same 50ms pattern as draft restore).
    // All Phase 15E templates are portrait, so this is typically a no-op.
    setOrientation(template.orientation || 'portrait');

    // Sync shadow state so tabs show correct background/music immediately.
    setShadowBg(template.background);
    setShadowMusic(null);

    // Regenerate element IDs — template uses short static IDs ('e1','e2','e3').
    // Fresh random IDs prevent any conflict if the same template is loaded twice.
    const freshElements = template.elements.map(function(el) {
      return Object.assign({}, el, { id: 'el_' + Math.random().toString(36).slice(2, 7) });
    });

    // 50ms lets the orientation state settle before canvas state is set.
    // Without this timeout, a canvas orientation reset could overwrite the elements.
    // (Same guard pattern as handleRestoreDraft.)
    setTimeout(function() {
      if (canvasRef.current) {
        canvasRef.current.setCanvasState({
          background: template.background,
          elements:   freshElements,
          music:      null,
        });
      }
    }, 50);
  }, []);

  const handleStartBlank = useCallback(function() {
    // Just close the picker — canvas stays at default blank state.
    setShowTemplatePicker(false);
  }, []);

  // ── Preview mode ──────────────────────────────────────────
  const handlePreview     = useCallback(function() { setPreviewMode(true); },  []);
  const handlePreviewExit = useCallback(function() { setPreviewMode(false); }, []);

  // ── Post confirmation ─────────────────────────────────────
  const handleShowConfirm = useCallback(function(canvas, content) {
    setConfirmData({ canvas, content });
    setShowConfirm(true);
  }, []);

  const handleCancelConfirm = useCallback(function() {
    if (posting) return;
    setShowConfirm(false);
    setConfirmData(null);
  }, [posting]);

  const handleConfirmPost = useCallback(async function() {
    if (!confirmData) return;
    if (!user || !accessToken) {
      router.push('/auth?next=/scroll/create');
      return;
    }

    setPosting(true);
    try {
      const res = await fetch('/api/scrolls', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          content:     confirmData.content,
          canvas_data: JSON.stringify(confirmData.canvas),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to post scroll.');
        return;
      }

      // Success — clear draft and navigate
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      toast.success('Scroll posted!');
      router.push('/scroll');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [confirmData, user, accessToken, router]);

  // ── Canvas callbacks ──────────────────────────────────────
  const handleAddElement = useCallback(function(el) {
    if (canvasRef.current) canvasRef.current.addElement(el);
  }, []);

  const handleBackground = useCallback(function(bg) {
    if (canvasRef.current) { canvasRef.current.setBackground(bg); setShadowBg(bg); }
  }, []);

  const handleMusic = useCallback(function(music) {
    if (canvasRef.current) { canvasRef.current.setMusic(music); setShadowMusic(music); }
  }, []);

  const getCanvas = useCallback(function() {
    if (canvasRef.current) return canvasRef.current.getCanvas();
    return null;
  }, []);

  // ── Effective height for canvas ───────────────────────────
  const effectiveHeight = previewMode
    ? (typeof window !== 'undefined' ? window.innerHeight : 600)
    : canvasAreaHeight;

  return (
    <div className="creator-page">

      {/* Toolbar + orientation row + draft banner
          All inside toolbarRef — all heights subtracted from canvas area */}
      <div ref={toolbarRef} className={previewMode ? 'creator-chrome-hidden' : ''}>
        <ScrollCreatorToolbar
          canvasRef={canvasRef}
          getCanvas={getCanvas}
          onShowConfirm={handleShowConfirm}
          onPreview={handlePreview}
        />

        {/* Canvas size / orientation selector */}
        <div className="creator-orientation-row">
          {ORIENTATION_OPTIONS.map(function(opt) {
            const isActive = orientation === opt.key;
            return (
              <button
                key={opt.key}
                className={'creator-orientation-btn' + (isActive ? ' creator-orientation-btn--active' : '')}
                onClick={function() { setOrientation(opt.key); }}
                aria-label={'Set canvas to ' + opt.ariaLabel}
                aria-pressed={isActive}
              >
                <div className={'creator-orientation-icon creator-orientation-icon--' + opt.key} />
                <span className="creator-orientation-label">{opt.label}</span>
              </button>
            );
          })}
          <span className="creator-orientation-hint">Size change clears canvas</span>
        </div>

        {/* Draft restore banner */}
        {draftBanner && (
          <div className="creator-draft-banner">
            <span className="creator-draft-banner__text">
              <strong>Saved draft found.</strong> Continue where you left off?
            </span>
            <button className="creator-draft-banner__yes"  onClick={handleRestoreDraft}>Continue</button>
            <button className="creator-draft-banner__no"   onClick={handleDiscardDraft}>Discard</button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <ScrollCreatorCanvasWithRef
        ref={canvasRef}
        orientation={orientation}
        availableHeight={effectiveHeight}
        isPreview={previewMode}
        onPreviewExit={handlePreviewExit}
        onChange={function(canvas) {
          if (canvas.background) setShadowBg(canvas.background);
          if (canvas.music !== undefined) setShadowMusic(canvas.music);
        }}
      />

      {/* Tabs — hidden in preview mode */}
      <div ref={tabsRef} className={previewMode ? 'creator-chrome-hidden' : ''}>
        <ScrollCreatorTabs
          onAddElement={handleAddElement}
          onBackground={handleBackground}
          onMusic={handleMusic}
          currentBackground={shadowBg}
          currentMusic={shadowMusic}
        />
      </div>

      {/* Post confirmation sheet — z-index 700 */}
      <ScrollPostConfirmSheet
        isOpen={showConfirm}
        canvas={confirmData ? confirmData.canvas : null}
        orientation={orientation}
        posting={posting}
        onConfirm={handleConfirmPost}
        onCancel={handleCancelConfirm}
      />

      {/* Template picker — z-index 650, shown on first open when no draft exists.
          Mounts immediately (showTemplatePicker starts true).
          Hidden by draft check useEffect if a valid draft is found. */}
      <ScrollCreatorTemplates
        isOpen={showTemplatePicker}
        onSelectTemplate={handleSelectTemplate}
        onStartBlank={handleStartBlank}
      />

    </div>
  );
}
