// ============================================================
// FILE: app/profile/[username]/page.js
// PURPOSE: Public profile page — shows user info, karma, posts
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Phase 5 — users need a public profile page
// DEPENDENCIES: lib/supabaseServer.js, lib/karma.js,
//               components/KarmaTag.jsx, components/UserBadge.jsx,
//               components/TagPill.jsx
// ⚠️ DO NOT CHANGE: revalidate = 3600 — never force-dynamic here
//                   params is NOT a Promise in Next.js 14
//                   supabaseServer() must be called as a function
//                   inside the handler — never at module level
// ============================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabaseServer'
import { getMilestone } from '@/lib/karma'
import KarmaTag from '@/components/KarmaTag'
import UserBadge from '@/components/UserBadge'
import TagPill from '@/components/TagPill'

export const revalidate = 3600

// --- Metadata ---
export async function generateMetadata({ params }) {
  const username = params.username
  const db = supabaseServer()

  const { data: profile } = await db
    .from('profiles')
    .select('community_username, community_bio')
    .eq('community_username', username)
    .single()

  if (!profile) {
    return {
      title: 'User not found — The Real Medico Community',
    }
  }

  return {
    title: `${profile.community_username} — The Real Medico Community`,
    description: profile.community_bio || `View ${profile.community_username}'s profile, questions, and answers on The Real Medico Community.`,
    alternates: {
      canonical: `https://community.therealmedico.store/profile/${username}`,
    },
    openGraph: {
      title: `${profile.community_username} — The Real Medico Community`,
      description: profile.community_bio || `View ${profile.community_username}'s profile on The Real Medico Community.`,
      url: `https://community.therealmedico.store/profile/${username}`,
    },
  }
}

// --- Page ---
export default async function ProfilePage({ params }) {
  const username = params.username
  const db = supabaseServer()

  // Fetch profile
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, community_username, community_bio, community_joined_at, community_flair, is_member')
    .eq('community_username', username)
    .single()

  if (profileError || !profile) notFound()

  // Fetch karma
  const { data: karmaRow } = await db
    .from('community_karma')
    .select('total_karma')
    .eq('user_id', profile.id)
    .single()

  const karma = karmaRow?.total_karma || 0
  const milestone = getMilestone(karma)

  // Fetch this user's questions (latest 10)
  const { data: questions } = await db
    .from('community_questions')
    .select('id, slug, title, tags, upvotes, answer_count, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch this user's answers (latest 10)
  const { data: answers } = await db
    .from('community_answers')
    .select('id, body, upvotes, is_accepted, created_at, question_id, community_questions(slug, title)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const joinedDate = profile.community_joined_at
    ? new Date(profile.community_joined_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
      })
    : null

  return (
    <main
      style={{
        maxWidth: '768px',
        margin: '0 auto',
        padding: '2rem 1rem',
      }}
    >

      {/* Profile header */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--bg-tertiary)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            border: profile.is_member
              ? '3px solid var(--member-border)'
              : '3px solid var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'var(--accent-primary)',
          }}
        >
          {profile.community_username?.charAt(0).toUpperCase()}
        </div>

        {/* Username + flair */}
        <UserBadge
          username={profile.community_username}
          flair={profile.community_flair}
          isMember={profile.is_member}
          size="lg"
        />

        {/* Bio */}
        {profile.community_bio && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              maxWidth: '480px',
              lineHeight: '1.6',
              margin: '0',
            }}
          >
            {profile.community_bio}
          </p>
        )}

        {/* Joined date */}
        {joinedDate && (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              margin: '0',
            }}
          >
            Joined {joinedDate}
          </p>
        )}

        {/* Karma */}
        <KarmaTag karma={karma} size="lg" />

      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Questions', value: questions?.length ?? 0 },
          { label: 'Answers', value: answers?.length ?? 0 },
          { label: 'Karma', value: karma.toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'var(--accent-primary)',
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '0.25rem',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Questions section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            fontFamily: 'Merriweather, Georgia, serif',
          }}
        >
          Questions
        </h2>

        {!questions || questions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No questions yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q) => (
              <Link
                key={q.id}
                href={`/q/${q.slug}`}
                style={{
                  display: 'block',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--bg-tertiary)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                <p
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    margin: '0 0 0.5rem 0',
                    fontFamily: 'Merriweather, Georgia, serif',
                  }}
                >
                  {q.title}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {Array.from(new Set(q.tags || [])).slice(0, 3).map((tag) => (
                    <TagPill key={tag} tag={tag} />
                  ))}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {q.upvotes} upvotes · {q.answer_count} answers
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Answers section */}
      <section>
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            fontFamily: 'Merriweather, Georgia, serif',
          }}
        >
          Answers
        </h2>

        {!answers || answers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No answers yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {answers.map((a) => (
              <Link
                key={a.id}
                href={`/q/${a.community_questions?.slug}`}
                style={{
                  display: 'block',
                  backgroundColor: a.is_accepted ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  border: a.is_accepted ? '1px solid var(--accent-primary)' : '1px solid var(--bg-tertiary)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  textDecoration: 'none',
                }}
              >
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    margin: '0 0 0.4rem 0',
                  }}
                >
                  on: {a.community_questions?.title}
                </p>

                <p
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    margin: '0 0 0.5rem 0',
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {a.body}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {a.is_accepted && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--success)',
                        backgroundColor: '#E8F5E9',
                        borderRadius: '999px',
                        padding: '0.2rem 0.6rem',
                      }}
                    >
                      ✓ Accepted
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {a.upvotes} upvotes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Phase 5 — public profile page
// [May 16, 2026] FIXED: supabaseServer() called as function via db variable
// REASON: Proxy broke chained Supabase calls — now uses direct function call
// --- END CHANGE LOG ---
