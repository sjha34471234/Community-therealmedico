// ============================================================
// FILE: app/scroll/page.js
// PURPOSE: Scroll feed page shell
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 — Scroll feature
// ============================================================
import ScrollFeed from '@/components/scroll/ScrollFeed';

export const metadata = {
  title: 'Scroll — The Real Medico Community',
  description: 'Swipe through medical questions in a quick-scroll feed',
};

export default function ScrollPage() {
  return <ScrollFeed />;
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: Scroll page shell — delegates to ScrollFeed client component.
// --- END CHANGE LOG ---
