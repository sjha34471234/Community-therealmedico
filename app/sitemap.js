// ============================================================
// FILE: app/sitemap.js
// PURPOSE: Auto-generates /sitemap.xml with all question slugs
//          pulled live from Supabase — tells Google every page
//          that exists on the community site
// LAST CHANGED: May 24, 2026
// WHY IT EXISTS: Without a sitemap Google discovers pages slowly
//               via links. A sitemap guarantees every question
//               gets indexed quickly after it's posted.
// DEPENDENCIES: lib/supabaseServer.js
// ⚠️ DO NOT CHANGE: revalidate must stay at 3600 (1 hour) —
//                   sitemap regenerates hourly so new questions
//                   appear in Google within hours not days
// ⚠️ DO NOT CHANGE: is_hidden filter — hidden questions must
//                   never appear in the sitemap
// ⚠️ DO NOT CHANGE: Static routes list — if you add a new page
//                   add it to the staticRoutes array below
// ============================================================

// --- WHY THIS CODE EXISTS ---
// Phase 14A SEO requirement. Next.js 14 App Router supports
// sitemap.js as a special file — it auto-serves at /sitemap.xml
// No package needed. Just export a default async function.

// --- WHAT THIS MADE WORK ---
// /sitemap.xml now returns all static pages + every question slug
// Google Search Console can import this URL directly
// New questions appear in sitemap within 1 hour of posting

// --- PITFALLS ---
// ⚠️ supabaseServer() must be called inside the function —
//    never at module level (SSR constraint)
// ⚠️ If Supabase query fails, fall back to static routes only —
//    never let sitemap.js throw — it breaks the build
// ⚠️ changeFrequency and priority are hints only — Google may
//    ignore them — but they help signal importance

import { supabaseServer } from '@/lib/supabaseServer';

export const revalidate = 3600; // regenerate sitemap every 1 hour

const BASE_URL = 'https://community.therealmedico.store';

// Static routes that always exist
const staticRoutes = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/tags`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/search`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.5,
  },
];

export default async function sitemap() {
  try {
    const supabase = supabaseServer();

    // Fetch all visible, non-hidden question slugs
    // Only select the columns we need — slug + updated_at for lastModified
    const { data: questions, error } = await supabase
      .from('community_questions')
      .select('slug, updated_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      // If DB fails, return static routes only — never crash sitemap
      console.error('[sitemap] Supabase error:', error.message);
      return staticRoutes;
    }

    // Build dynamic question routes
    const questionRoutes = (questions || []).map((q) => ({
      url: `${BASE_URL}/q/${q.slug}`,
      lastModified: new Date(q.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...questionRoutes];
  } catch (err) {
    // Safety net — never let sitemap crash the build
    console.error('[sitemap] Unexpected error:', err.message);
    return staticRoutes;
  }
}

// --- CHANGE LOG ---
// [May 24, 2026] CREATED: Phase 14A SEO — dynamic sitemap with all question slugs
// REASON: Google needs a sitemap to discover and index all Q&A pages quickly
// --- END CHANGE LOG ---
