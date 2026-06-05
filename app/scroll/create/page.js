'use client';
// --- WHY THIS CODE EXISTS ---
// Scroll Creator page — wires canvas, toolbar, tabs, confirmation, draft, templates.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1.
// [May 27 2026] FIXED: Canvas clipped — hide site chrome via useEffect.
// [May 27 2026] FIXED: Dynamic available height via toolbarRef/tabsRef.
// [May 28 2026] ADDED: Canvas orientation selector (Portrait/Square/Landscape).
// [May 29 2026] ADDED: Phase 15D — previewMode, post confirmation, draft save/restore.
// [May 30 2026] ADDED: Phase 15E — Template picker.
// [Jun 03 2026] ADDED + FIXED:
//   ADD — fullscreenEdit mode. Button in orientation row (pushed to right end).
//     Hides all chrome (toolbar, orientation row, tabs). Canvas fills window.innerHeight.
//     Canvas stays fully interactive (NOT isPreview) — elements can be dragged/selected.
//     Floating "Done" pill button at bottom-center exits fullscreen edit.
//     z-index 610 — above creator (600), below confirm sheet (700).
//   FIX — "Size change clears canvas" hint removed. No longer accurate — orientation
//     change now scales elements instead of clearing them (fixed in ScrollCreatorCanvas).
//   FIX — effectiveHeight now covers previewMode OR fullscreenEdit.
//   FIX — height calculation effects include fullscreenEdit in condition + deps.
// [Jun 05 2026] ADDED: Text element edit-in-place wiring.
//   selectedElement state — tracks the full element object for the selected canvas element.
//   handleSelectElement — useCallback passed to canvas as onSelectElement prop.
//     Canvas fires it whenever selectedId changes (tap element, tap canvas, delete, etc.).
//   handleUpdateElement — useCallback passed to tabs as onUpdateElement prop.
//     Calls canvasRef.current.updateElementById(id, patch). Safe for non-positional
//     patches (text, font, color, size, bold, italic, align, letterSpacing) — canvas
//     updateElement only converts x/y/w/h which are absent in text property patches.
//   Both wired through ScrollCreatorTabs → ScrollCreatorText for live editing.
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

const DRAFT_KEY        = 'scroll_creator_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

  // ── Canvas shadow state ───────────────────────────────────
  const [shadowBg,    setShadowBg]    = useState({ type: 'solid', value: '#1a1a2e' });
  const [shadowMusic, setShadowMusic] = useState(null);

  // ── Layout ────────────────────────────────────────────────
  const [orientation,      setOrientation]      = useState('portrait');
  const [canvasAreaHeight, setCanvasAreaHeight] = useState(null);

  // ── Preview mode (viewer perspective, tap to exit) ────────
  const [previewMode, setPreviewMode] = useState(false);

  // ── Full-screen edit mode (editor stays active, chrome hidden) ──
  const [fullscreenEdit, setFullscreenEdit] = useState(false);

  // ── Post confirmation ─────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [posting,     setPosting]     = useState(false);

  // ── Draft banner ──────────────────────────────────────────
  const [draftBanner, setDraftBanner] = useState(null);

  // ── Template picker ───────────────────────────────────────
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);

  // ── Selected element (for text edit-in-place) ────────────
  // Full element object from canvas.elements, or null when nothing is selected.
  // Populated by handleSelectElement which canvas fires on every selection change.
  const [selectedElement, setSelectedElement] = useState(null);

  // ── Hide site chrome on mount ─────────────────────────────
  useEffect(function() {
    var navbar     = document.querySelector('nav');
    var bottomNav  = document.querySelector('.bottom-nav');
    var pageScroll = document.getElementById('page-scroll-container');
    if (navbar)     navbar.style.display      = 'none';
    if (bottomNav)  bottomNav.style.display   = 'none';
    if (pageScroll) pageScroll.style.overflow = 'hidden';
    return function() {
      if (navbar)     navbar.style.display      = '';
      if (bottomNav)  bottomNav.style.display   = '';
      if (pageScroll) pageScroll.style.overflow = '';
    };
  }, []);

  // ── Draft check on mount ──────────────────────────────────
  useEffect(function() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      var age   = Date.now() - (draft.timestamp || 0);
      if (age < DRAFT_MAX_AGE_MS && draft.canvas && (draft.canvas.elements || []).length > 0) {
        setDraftBanner(draft);
        setShowTemplatePicker(false);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {}
  }, []);

  // ── Auto-save draft every 30s ─────────────────────────────
  useEffect(function() {
    var interval = setInterval(function() {
      if (!canvasRef.current) return;
      var canvas = canvasRef.current.getCanvas();
      if (!canvas || (canvas.elements || []).length === 0) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ canvas, orientation, timestamp: Date.now() }));
      } catch (e) {}
    }, 30000);
    return function() { clearInterval(interval); };
  }, [orientation]);

  // ── Height calculation ────────────────────────────────────
  useEffect(function() {
    function measure() {
      if (previewMode || fullscreenEdit) {
        setCanvasAreaHeight(window.innerHeight);
        return;
      }
      var totalH   = window.innerHeight;
      var toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 80;
      var tabsH    = tabsRef.current    ? tabsRef.current.offsetHeight    : 260;
      setCanvasAreaHeight(Math.max(totalH - toolbarH - tabsH, 100));
    }
    measure();
    window.addEventListener('resize', measure);
    var t = setTimeout(measure, 300);
    return function() { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [previewMode, fullscreenEdit]);

  useEffect(function() {
    var t = setTimeout(function() {
      if (previewMode || fullscreenEdit) return;
      var totalH   = window.innerHeight;
      var toolbarH = toolbarRef.current ? toolbarRef.current.offsetHeight : 80;
      var tabsH    = tabsRef.current    ? tabsRef.current.offsetHeight    : 260;
      setCanvasAreaHeight(Math.max(totalH - toolbarH - tabsH, 100));
    }, 100);
    return function() { clearTimeout(t); };
  }, [draftBanner, previewMode, fullscreenEdit]);

  // ── Draft handlers ────────────────────────────────────────
  const handleRestoreDraft = useCallback(function() {
    var draft = draftBanner;
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
    if (!draft) return;
    setOrientation(draft.orientation || 'portrait');
    setShadowBg(draft.canvas.background || { type: 'solid', value: '#1a1a2e' });
    setShadowMusic(draft.canvas.music   || null);
    setTimeout(function() {
      if (canvasRef.current) canvasRef.current.setCanvasState(draft.canvas);
    }, 50);
  }, [draftBanner]);

  const handleDiscardDraft = useCallback(function() {
    setDraftBanner(null);
    localStorage.removeItem(DRAFT_KEY);
    setShowTemplatePicker(true);
  }, []);

  // ── Template picker handlers ──────────────────────────────
  const handleSelectTemplate = useCallback(function(template) {
    setShowTemplatePicker(false);
    setOrientation(template.orientation || 'portrait');
    setShadowBg(template.background);
    setShadowMusic(null);
    var freshElements = template.elements.map(function(el) {
      return Object.assign({}, el, { id: 'el_' + Math.random().toString(36).slice(2, 7) });
    });
    setTimeout(function() {
      if (canvasRef.current) {
        canvasRef.current.setCanvasState({ background: template.background, elements: freshElements, music: null });
      }
    }, 50);
  }, []);

  const handleStartBlank = useCallback(function() { setShowTemplatePicker(false); }, []);

  // ── Preview mode ──────────────────────────────────────────
  const handlePreview     = useCallback(function() { setPreviewMode(true);  }, []);
  const handlePreviewExit = useCallback(function() { setPreviewMode(false); }, []);

  // ── Full-screen edit mode ─────────────────────────────────
  const handleFullscreenEdit     = useCallback(function() { setFullscreenEdit(true);  }, []);
  const handleFullscreenEditExit = useCallback(function() { setFullscreenEdit(false); }, []);

  // ── Selected element callbacks (Jun 05 — text edit-in-place) ─
  // handleSelectElement: canvas fires this whenever selectedId changes.
  //   Receives the full element object (or null). Stored in selectedElement state.
  //   Flows down to ScrollCreatorTabs → ScrollCreatorText to populate the form.
  const handleSelectElement = useCallback(function(el) {
    setSelectedElement(el);
  }, []);

  // handleUpdateElement: ScrollCreatorText calls this on every change in edit mode.
  //   Calls canvasRef.current.updateElementById(id, patch) — exposed via useImperativeHandle.
  //   patch contains only non-positional fields (text, font, color, size, bold, italic,
  //   align, letterSpacing) — canvas updateElement skips coordinate conversion for these.
  const handleUpdateElement = useCallback(function(id, patch) {
    if (canvasRef.current) canvasRef.current.updateElementById(id, patch);
  }, []);

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
    if (!user || !accessToken) { router.push('/auth?next=/scroll/create'); return; }
    setPosting(true);
    try {
      var res = await fetch('/api/scrolls', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body:        JSON.stringify({ content: confirmData.content, canvas_data: JSON.stringify(confirmData.canvas) }),
      });
      var data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to post scroll.'); return; }
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
    return canvasRef.current ? canvasRef.current.getCanvas() : null;
  }, []);

  // ── Effective canvas height ───────────────────────────────
  var effectiveHeight = (previewMode || fullscreenEdit)
    ? (typeof window !== 'undefined' ? window.innerHeight : 600)
    : canvasAreaHeight;

  var chromeHidden = previewMode || fullscreenEdit;

  return (
    <div className="creator-page">

      {/* Toolbar + orientation row + draft banner */}
      <div ref={toolbarRef} className={chromeHidden ? 'creator-chrome-hidden' : ''}>
        <ScrollCreatorToolbar
          canvasRef={canvasRef}
          getCanvas={getCanvas}
          onShowConfirm={handleShowConfirm}
          onPreview={handlePreview}
        />

        {/* Orientation selector + fullscreen button */}
        <div className="creator-orientation-row">
          {ORIENTATION_OPTIONS.map(function(opt) {
            var isActive = orientation === opt.key;
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

          <button
            className="creator-orientation-btn creator-orientation-btn--fs"
            onClick={handleFullscreenEdit}
            aria-label="Edit canvas in full screen"
          >
            <div className="creator-fullscreen-icon" />
            <span className="creator-orientation-label">Full</span>
          </button>
        </div>

        {/* Draft restore banner */}
        {draftBanner && (
          <div className="creator-draft-banner">
            <span className="creator-draft-banner__text">
              <strong>Saved draft found.</strong> Continue where you left off?
            </span>
            <button className="creator-draft-banner__yes" onClick={handleRestoreDraft}>Continue</button>
            <button className="creator-draft-banner__no"  onClick={handleDiscardDraft}>Discard</button>
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
        onSelectElement={handleSelectElement}
        onChange={function(canvas) {
          if (canvas.background) setShadowBg(canvas.background);
          if (canvas.music !== undefined) setShadowMusic(canvas.music);
        }}
      />

      {/* Tabs */}
      <div ref={tabsRef} className={chromeHidden ? 'creator-chrome-hidden' : ''}>
        <ScrollCreatorTabs
          onAddElement={handleAddElement}
          onBackground={handleBackground}
          onMusic={handleMusic}
          currentBackground={shadowBg}
          currentMusic={shadowMusic}
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
        />
      </div>

      {/* Full-screen edit: floating Done button */}
      {fullscreenEdit && (
        <button
          className="creator-fullscreen-done-btn"
          onClick={handleFullscreenEditExit}
          aria-label="Exit full screen editing"
        >
          Done
        </button>
      )}

      {/* Post confirmation sheet — z-index 700 */}
      <ScrollPostConfirmSheet
        isOpen={showConfirm}
        canvas={confirmData ? confirmData.canvas : null}
        orientation={orientation}
        posting={posting}
        onConfirm={handleConfirmPost}
        onCancel={handleCancelConfirm}
      />

      {/* Template picker — z-index 650 */}
      <ScrollCreatorTemplates
        isOpen={showTemplatePicker}
        onSelectTemplate={handleSelectTemplate}
        onStartBlank={handleStartBlank}
      />

    </div>
  );
}
