// ============================================================
// FILE: components/TagPill.jsx
// PURPOSE: Small coloured tag chip shown on question cards
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Reused on QuestionCard, tag pages, question detail page
// DEPENDENCIES: app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: Must be a server-compatible component —
//                   no 'use client', no event handlers here
// ============================================================

export default function TagPill({ tag }) {
  if (!tag) return null;

  return (
    <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {tag}
    </span>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Question cards and detail pages need reusable tag chips
// --- END CHANGE LOG ---
