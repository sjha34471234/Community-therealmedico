// ============================================================
// FILE: app/q/[slug]/page.js
// PURPOSE: Question detail page — full question + answers, ISR, SEO
// LAST CHANGED: May 17, 2026
// WHY IT EXISTS: Each question needs its own URL for SEO and sharing.
//   Server component so it can use ISR revalidation and generateMetadata.
//   Renders QuestionDetail (client) for interactivity.
// DEPENDENCIES: lib/supabaseServer.js, components/QuestionDetail.jsx
// ⚠️ DO NOT CHANGE:
//   - revalidate must stay 3600 — never use force-dynamic on this page.
//   - params is { slug: string } — NOT a Promise (Next.js 14 rule).
//   - generateMetadata must stay in this file — never move to QuestionDetail.
//   - QAPage JSON-LD must stay on this page for SEO.
// ============================================================

import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'
import QuestionDetail from '@/components/QuestionDetail'

export const revalidate = 3600

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { slug } = params
  const supabase = supabaseServer()

  const { data: question } = await supabase
    .from('community_questions')
    .select('title, body, tags, created_at')
    .eq('slug', slug)
    .single()

  if (!question) {
    return {
      title: 'Question not found — The Real Medico Community',
    }
  }

  const description = question.body
    ? question.body.slice(0, 160).replace(/\s+/g, ' ').trim()
    : question.title

  return {
    title: question.title + ' — The Real Medico Community',
    description,
    alternates: {
      canonical: 'https://community.therealmedico.store/q/' + slug,
    },
    openGraph: {
      title: question.title,
      description,
      url: 'https://community.therealmedico.store/q/' + slug,
      siteName: 'The Real Medico Community',
      type: 'article',
      publishedTime: question.created_at,
    },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function QuestionPage({ params }) {
  const { slug } = params
  const supabase = createServerClient()

  // Fetch question
  const { data: question, error: qError } = await supabase
    .from('community_questions')
    .select(`
      id,
      slug,
      title,
      body,
      tags,
      upvotes,
      downvotes,
      view_count,
      answer_count,
      is_answered,
      is_pinned,
      last_activity_at,
      created_at,
      user_id
    `)
    .eq('slug', slug)
    .single()

  if (qError || !question) {
    notFound()
  }

  // Fetch answers
  const { data: answers } = await supabase
    .from('community_answers')
    .select('id, body, upvotes, downvotes, is_accepted, created_at, user_id')
    .eq('question_id', question.id)
    .order('is_accepted', { ascending: false })
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true })

  // Fetch author profile — include is_member for Phase 7 cosmetics
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('community_username, community_flair, is_member')
    .eq('id', question.user_id)
    .single()

  // Fetch answer author profiles — include is_member for Phase 7 cosmetics
  const answerUserIds = answers
    ? Array.from(new Set(answers.map(function getId(a) { return a.user_id }).filter(Boolean)))
    : []

  let answerProfiles = []
  if (answerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, community_username, community_flair, is_member')
      .in('id', answerUserIds)
    answerProfiles = profiles || []
  }

  // Increment view count (fire and forget — doesn't block render)
  supabase
    .from('community_questions')
    .update({ view_count: (question.view_count || 0) + 1 })
    .eq('id', question.id)
    .then(function noop() {})

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  const acceptedAnswer = answers
    ? answers.find(function findAccepted(a) { return a.is_accepted })
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: question.body,
      dateCreated: question.created_at,
      answerCount: question.answer_count || 0,
      upvoteCount: question.upvotes || 0,
      url: 'https://community.therealmedico.store/q/' + slug,
      ...(acceptedAnswer && {
        acceptedAnswer: {
          '@type': 'Answer',
          text: acceptedAnswer.body,
          dateCreated: acceptedAnswer.created_at,
          upvoteCount: acceptedAnswer.upvotes || 0,
          url: 'https://community.therealmedico.store/q/' + slug + '#answer-' + acceptedAnswer.id,
        },
      }),
    },
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <QuestionDetail
        question={question}
        answers={answers || []}
        authorProfile={authorProfile || null}
        answerProfiles={answerProfiles}
      />
    </>
  )
}

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Phase 3
// REASON: Question detail page with ISR, generateMetadata, QAPage JSON-LD.
// [May 17, 2026] UPDATED: profiles SELECT now includes is_member — Phase 7
// REASON: Pass member status to QuestionDetail for gold author cosmetics
// --- END CHANGE LOG ---
