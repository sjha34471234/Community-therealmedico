// ============================================================
// FILE: app/scroll/create/page.js
// PURPOSE: Scroll creator page — placeholder for Phase 15B
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: "Create a Scroll" from + popup menu lands here.
//   Full creator (text + music picker) built in Phase 15B.
// ============================================================

export default function ScrollCreatePage() {
  return (
    <div style={{ minHeight: '80dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px 24px' }}>
      <span style={{ fontSize: '48px' }}>📜</span>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1D23', textAlign: 'center', fontFamily: 'Merriweather, Georgia, serif', margin: 0 }}>Scroll Creator</h1>
      <p style={{ fontSize: '14px', color: '#5B6474', textAlign: 'center', maxWidth: '280px', lineHeight: 1.7, margin: 0, fontFamily: 'Inter, sans-serif' }}>
        Create short medical knowledge scrolls with background music. Coming soon in Phase 15B!
      </p>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: Placeholder for Scroll creator — Phase 15B will build this.
// --- END CHANGE LOG ---
