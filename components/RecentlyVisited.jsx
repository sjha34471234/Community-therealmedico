// ============================================================
// FILE: components/RecentlyVisited.jsx
// PURPOSE: Sidebar block — last 10 questions visited by logged-in user
//          Shows sign-in prompt for guests.
// LAST CHANGED: May 21, 2026
// WHY IT EXISTS: Homepage sidebar — gives logged-in users quick access
//               to their recently viewed questions.
// DEPENDENCIES: lib/supabase.js, store/authStore.js
// ⚠️ DO NOT CHANGE:
//   - Uses useAuthStore — never separate onAuthStateChange
//   - Queries community_post_views joined with community_questions
//   - Max 10 results, ordered by viewed_at descending
//   - <a> tags must be single line — iPad rule
// ============================================================
'use client'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function RecentlyVisited() {
  const { user, loading: authLoading } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function fetchRecent() {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    async function load() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('community_post_views')
          .select('viewed_at, community_questions(id, slug, title, answer_count, is_answered)')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(10)
        const valid = (data || []).filter(function hasQ(row) { return row.community_questions })
        setPosts(valid)
      } catch (err) {
        console.error('RecentlyVisited fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, authLoading])

  const containerStyle = {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--bg-tertiary)',
    borderRadius: '10px',
    overflow: 'hidden',
  }

  const headerStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--bg-tertiary)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    backgroundColor: 'var(--bg-secondary)',
  }

  // Guest state
  if (!authLoading && !user) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Recently Visited</div>
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>Sign in to see your recently visited questions here.</p>
          <a href="/auth" style={{ display: 'inline-block', backgroundColor: 'var(--accent-primary)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.8rem', padding: '7px 16px', borderRadius: '7px', textDecoration: 'none' }}>Sign In</a>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Recently Visited</div>
        <div style={{ padding: '12px 16px' }}>
          {[1, 2, 3].map(function sk(n) {
            return (
              <div key={n} style={{ height: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '10px', width: n === 2 ? '80%' : '95%' }} />
            )
          })}
        </div>
      </div>
    )
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Recently Visited</div>
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No visited questions yet. Start reading!</p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Recently Visited</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {posts.map(function renderPost(row) {
          const q = row.community_questions
          return (
            <li key={q.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
              <a href={'/q/' + q.slug} style={{ display: 'block', padding: '10px 16px', textDecoration: 'none' }}>
                <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {q.is_answered && <span style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700, marginRight: '4px' }}>✓</span>}
                  {q.title}
                </p>
                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.answer_count || 0} {q.answer_count === 1 ? 'answer' : 'answers'}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Homepage sidebar — recently visited questions
// REASON: Two-column homepage layout. Uses existing community_post_views table.
// --- END CHANGE LOG ---
