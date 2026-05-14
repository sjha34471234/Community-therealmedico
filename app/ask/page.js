// ============================================================
// FILE: app/ask/page.js
// PURPOSE: Server wrapper for the Ask a Question page — exports metadata
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: 'use client' pages cannot export metadata in Next.js 14.
//   This thin server component owns the metadata and renders the AskForm
//   client component. Never merge these two into one file.
// DEPENDENCIES: components/AskForm.jsx
// ⚠️ DO NOT CHANGE: Keep this as a server component (no 'use client').
//   Never move metadata into AskForm.jsx.
// ============================================================

import AskForm from '@/components/AskForm'

export const metadata = {
  title: 'Ask a Question — The Real Medico Community',
  description:
    'Ask a medical or nursing question. Get answers from healthcare students and professionals in the Real Medico community.',
  alternates: {
    canonical: 'https://community.therealmedico.store/ask',
  },
}

export default function AskPage() {
  return <AskForm />
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build — Phase 3
// REASON: Ask form needed. Server wrapper pattern required for metadata + client form.
// --- END CHANGE LOG ---
