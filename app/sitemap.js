// ============================================================
// FILE: app/sitemap.js
// PURPOSE: Dynamic sitemap — tells Google every question URL
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Google needs to discover /q/[slug] pages
//               Without this, question pages won't get indexed
// DEPENDENCIES: community_questions table in Supabase
// ⚠️ DO NOT CHANGE: revalidate stays at 86400 (24 hours)
//                   Never include /api/ routes in sitemap
//                   Never include /ask or /profile/*/edit
// ============================================================

import { createClient } from '@supabase/supabase-js';

export const revalidate = 86400;

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const baseUrl = 'https://community.therealmedico.store';

  // ─── Static pages ────────────────────────────────────────

  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: baseUrl + '/ask',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: baseUrl + '/tags',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];

  // ─── Dynamic question pages ──────────────────────────────

  let questionPages = [];

  try {
    const { data: questions, error } = await supabase
      .from('community_questions')
      .select('slug, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && questions && questions.length > 0) {
      questionPages = questions.map(function(q) {
        return {
          url: baseUrl + '/q/' + q.slug,
          lastModified: new Date(q.updated_at),
          changeFrequency: 'daily',
          priority: 0.8,
        };
      });
    }
  } catch (err) {
    console.error('Sitemap fetch error:', err);
  }

  return staticPages.concat(questionPages);
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Google needs a sitemap to discover question pages
// --- END CHANGE LOG ---
