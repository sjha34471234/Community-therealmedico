// ============================================================
// FILE: components/SortBar.jsx
// PURPOSE: Hot / New / Top sort tabs for the question feed
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Users need to switch feed sorting without
//               changing the URL (client-side state only)
// DEPENDENCIES: app/globals.css CSS variables
// ⚠️ DO NOT CHANGE: Sorting must NEVER update the URL —
//                   URL changes break ISR and cause full reloads
//                   Active tab uses accent-primary, not a border trick
// ============================================================

'use client';

const TABS = [
  { key: 'hot', label: '🔥 Hot' },
  { key: 'new', label: '✨ New' },
  { key: 'top', label: '⬆ Top' },
];

export default function SortBar({ activeSort, onSortChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px', marginBottom: '1rem', width: 'fit-content' }}>
      {TABS.map(function(tab) {
        const isActive = activeSort === tab.key;
        return (
          <button
            key={tab.key}
            onClick={function() { onSortChange(tab.key); }}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.85rem',
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Feed needs client-side sort switching without URL changes
// --- END CHANGE LOG ---
