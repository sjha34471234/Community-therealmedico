// ============================================================
// FILE: app/tags/page.js
// PURPOSE: Browse all tags grouped by category with post counts
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Phase 6 — tags discovery page
// DEPENDENCIES: app/api/tags/route.js, components/TagBadge.jsx
// ⚠️ DO NOT CHANGE: revalidate = 3600 — tag post_counts change slowly
// ============================================================

import '@/app/tags/tags.css'
import TagBadge from '@/components/TagBadge'

export const revalidate = 3600

export const metadata = {
  title: 'Browse Tags — The Real Medico Community',
  description:
    'Explore topics across medical subjects, clinical specialties, exams, and more. Find questions tagged with your area of interest.',
}

async function getTags() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/tags`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.grouped || []
  } catch {
    return []
  }
}

export default async function TagsPage() {
  const grouped = await getTags()

  return (
    <main className="tags-page">
      <div className="tags-page__header">
        <h1 className="tags-page__title">Browse Tags</h1>
        <p className="tags-page__subtitle">
          Every question is tagged with up to 5 topics. Browse by category to
          find what interests you.
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="tags-page__empty">
          <p>Tags are being set up. Check back shortly.</p>
        </div>
      ) : (
        <div className="tags-page__body">
          {grouped.map((cat) => (
            <section key={cat.id} className="tags-category">
              <div className="tags-category__header">
                <h2 className="tags-category__label">{cat.label}</h2>
                <p className="tags-category__desc">{cat.description}</p>
              </div>
              <div className="tags-category__grid">
                {cat.tags.map((tag) => (
                  <div key={tag.id} className="tags-category__card">
                    <TagBadge tag={tag} size="md" showCount={false} />
                    <span className="tags-category__count">
                      {tag.post_count ?? 0}{' '}
                      {tag.post_count === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Tags discovery page grouped by category
// --- END CHANGE LOG ---
