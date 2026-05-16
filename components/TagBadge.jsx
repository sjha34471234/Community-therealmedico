// ============================================================
// FILE: components/TagBadge.jsx
// PURPOSE: Reusable tag pill — links to /tags/[slug]
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Tags appear on question cards, question detail, search results,
//   and the tags page. One component keeps styling consistent everywhere.
// DEPENDENCIES: None
// ⚠️ DO NOT CHANGE: Uses <a> not <Link> — tags page is on same domain but
//   keeping consistent with rule #23 for external-style hrefs
// ============================================================

export default function TagBadge({ tag, size = 'md', showCount = false }) {
  // tag can be a string (name only) or object { name, slug, post_count }
  const name = typeof tag === 'string' ? tag : tag.name
  const slug =
    typeof tag === 'string'
      ? tag.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
      : tag.slug
  const count = typeof tag === 'object' ? tag.post_count : null

  const sizeClass = {
    sm: 'tag-badge tag-badge--sm',
    md: 'tag-badge tag-badge--md',
    lg: 'tag-badge tag-badge--lg',
  }[size] || 'tag-badge tag-badge--md'

  return (
    <a href={`/tags/${slug}`} className={sizeClass}>
      <span className="tag-badge__name">{name}</span>
      {showCount && count != null && (
        <span className="tag-badge__count">{count}</span>
      )}
    </a>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Consistent tag pill across all pages
// --- END CHANGE LOG ---
