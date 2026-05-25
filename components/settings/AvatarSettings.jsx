// ============================================================
// FILE: components/settings/AvatarSettings.jsx
// PURPOSE: Avatar customizer in settings page
//          Live preview + pickers for shape, color, icon, border, pattern
//          Free users see locked options with upgrade prompt
// LAST CHANGED: May 22, 2026
// DEPENDENCIES: components/Avatar.jsx, lib/avatarConfig.js,
//               app/api/avatar/route.js, store/authStore.js
// ⚠️ DO NOT CHANGE: Avatar prop is avatarRow — NOT avatar (rule in Avatar.jsx)
// ============================================================

'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import useAuthStore from '@/store/authStore'
import {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Clipboard, FlaskConical,
  Search, Zap, Shield, Star, Sun, Moon, Droplet, Wind,
  Scale, Clock, Lock, Baby, User, Users, Map, Book, Award,
  Camera, Cpu,
} from 'lucide-react'
import {
  AVATAR_SHAPES, AVATAR_COLORS, AVATAR_ICONS,
  AVATAR_BORDERS, AVATAR_PATTERNS, AVATAR_DEFAULTS,
} from '@/lib/avatarConfig'

const LUCIDE_MAP = {
  Stethoscope, Pill, Microscope, Heart, Dna, Bone, Brain, Eye,
  Syringe, Thermometer, Activity, Clipboard, FlaskConical,
  Search, Zap, Shield, Star, Sun, Moon, Droplet, Wind,
  Scale, Clock, Lock, Baby, User, Users, Map, Book, Award,
  Camera, Cpu,
}

const SECTION = { marginBottom: '24px' }
const SEC_TITLE = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }
const GRID = { display: 'flex', gap: '8px', flexWrap: 'wrap' }

function LockBadge() {
  return (
    <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#B8860B', color: '#fff', fontSize: '9px', fontWeight: 700, borderRadius: '6px', padding: '1px 4px', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.4, zIndex: 2 }}>+</span>
  )
}

export default function AvatarSettings() {
  const { user, accessToken, profile } = useAuthStore()
  const isMember = profile?.is_member || false

  const [avatar, setAvatar] = useState(AVATAR_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    if (!user) return
    async function load() {
      try {
        const res = await fetch(window.location.origin + '/api/avatar?user_id=' + user.id, {
          credentials: 'include', cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.avatar) setAvatar(data.avatar)
      } catch (err) {
        console.error('AvatarSettings load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  function pick(field, value, free) {
    if (!free && !isMember) {
      toast.error('Upgrade to Real Medico+ to unlock this option')
      return
    }
    setAvatar(function(prev) { return { ...prev, [field]: value } })
  }

  async function handleSave() {
    if (!accessToken) { toast.error('Please sign in'); return }
    setSaving(true)
    try {
      const res = await fetch(window.location.origin + '/api/avatar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify(avatar),
      })
      const data = await res.json()
if (!res.ok) { toast.error(data.error || 'Failed to save'); return }

// Optimistic update — patch store immediately so avatar reflects everywhere instantly
useAuthStore.setState(function(state) {
  return { profile: { ...state.profile, avatar: avatar } };
});

toast.success('Avatar saved!')
    } catch (err) {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading avatar…</div>
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Live preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
        {/* --- WHY THIS CODE EXISTS ---
            avatarRow={avatar} — NOT avatar={avatar}.
            Avatar.jsx expects the prop named avatarRow.
            Using avatar= here caused the preview to always show defaults. */}
        <Avatar avatarRow={avatar} username={profile?.community_username || user?.email} size="xl" />
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>{profile?.community_username || 'Your username'}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Live preview</p>
          {!isMember && (
            <p style={{ fontSize: '0.75rem', color: '#B8860B', margin: '6px 0 0', fontWeight: 600 }}>⭐ Upgrade to unlock borders, patterns + 25 more options</p>
          )}
        </div>
      </div>

      {/* Shape picker */}
      <div style={SECTION}>
        <p style={SEC_TITLE}>Shape</p>
        <div style={GRID}>
          {AVATAR_SHAPES.map(function(s) {
            const active = avatar.shape === s.key
            const locked = !s.free && !isMember
            return (
              <div key={s.key} onClick={function() { pick('shape', s.key, s.free) }} style={{ position: 'relative', cursor: locked ? 'not-allowed' : 'pointer' }}>
                {locked && <LockBadge />}
                <div style={{
                  width: '48px', height: '48px',
                  background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  clipPath: s.clipPath || undefined,
                  borderRadius: s.clipPath ? '0' : s.borderRadius,
                  border: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  opacity: locked ? 0.45 : 1,
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }} />
                <p style={{ fontSize: '10px', color: active ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', fontWeight: active ? 700 : 400 }}>{s.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Color picker */}
      <div style={SECTION}>
        <p style={SEC_TITLE}>Background color</p>
        <div style={GRID}>
          {AVATAR_COLORS.map(function(c) {
            const active = avatar.color === c.key
            const locked = !c.free && !isMember
            return (
              <div key={c.key} onClick={function() { pick('color', c.key, c.free) }} style={{ position: 'relative', cursor: locked ? 'not-allowed' : 'pointer' }} title={c.label}>
                {locked && <LockBadge />}
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: c.hex,
                  border: active ? '3px solid var(--text-primary)' : '3px solid transparent',
                  outline: active ? '2px solid var(--bg-primary)' : 'none',
                  outlineOffset: '-4px',
                  opacity: locked ? 0.45 : 1,
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Icon picker */}
      <div style={SECTION}>
        <p style={SEC_TITLE}>Icon</p>
        <div style={GRID}>
          {AVATAR_ICONS.map(function(ic) {
            const active = avatar.icon === ic.key
            const locked = !ic.free && !isMember
            const LucideIcon = LUCIDE_MAP[ic.lucide] || Stethoscope
            const currentColor = AVATAR_COLORS.find(function(c) { return c.key === avatar.color }) || AVATAR_COLORS[0]
            return (
              <div key={ic.key} onClick={function() { pick('icon', ic.key, ic.free) }} title={ic.label} style={{ position: 'relative', cursor: locked ? 'not-allowed' : 'pointer' }}>
                {locked && <LockBadge />}
                <div style={{
                  width: '44px', height: '44px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? currentColor.hex : 'var(--bg-secondary)',
                  border: active ? '2px solid ' + currentColor.hex : '1px solid var(--bg-tertiary)',
                  borderRadius: '10px',
                  opacity: locked ? 0.45 : 1,
                  transition: 'all 0.15s',
                }}>
                  <LucideIcon size={20} color={active ? '#FFFFFF' : 'var(--text-secondary)'} strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: '10px', color: active ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', maxWidth: '44px', fontWeight: active ? 700 : 400 }}>{ic.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Border picker */}
      <div style={SECTION}>
        <p style={SEC_TITLE}>Border {!isMember && <span style={{ color: '#B8860B', fontSize: '0.72rem' }}>— Real Medico+ only</span>}</p>
        <div style={GRID}>
          {AVATAR_BORDERS.map(function(b) {
            const active = avatar.border === b.key
            const locked = !b.free && !isMember
            return (
              <div key={b.key} onClick={function() { pick('border', b.key, b.free) }} style={{ position: 'relative', cursor: locked ? 'not-allowed' : 'pointer' }}>
                {locked && <LockBadge />}
                <div style={{
                  width: '44px', height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: b.style !== 'none' ? b.style : '1px solid var(--bg-tertiary)',
                  outline: active ? '2px solid var(--accent-primary)' : 'none',
                  outlineOffset: '2px',
                  opacity: locked ? 0.45 : 1,
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }} />
                <p style={{ fontSize: '10px', color: active ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', fontWeight: active ? 700 : 400 }}>{b.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pattern picker */}
      <div style={SECTION}>
        <p style={SEC_TITLE}>Pattern {!isMember && <span style={{ color: '#B8860B', fontSize: '0.72rem' }}>— Real Medico+ only</span>}</p>
        <div style={GRID}>
          {AVATAR_PATTERNS.map(function(pt) {
            const active = avatar.pattern === pt.key
            const locked = !pt.free && !isMember
            return (
              <div key={pt.key} onClick={function() { pick('pattern', pt.key, pt.free) }} style={{ position: 'relative', cursor: locked ? 'not-allowed' : 'pointer' }}>
                {locked && <LockBadge />}
                <div style={{
                  width: '44px', height: '44px',
                  borderRadius: '10px',
                  background: pt.style ? pt.style + ', #1D9E75' : 'var(--bg-tertiary)',
                  border: active ? '2px solid var(--accent-primary)' : '1px solid var(--bg-tertiary)',
                  opacity: locked ? 0.45 : 1,
                  transition: 'all 0.15s',
                  boxSizing: 'border-box',
                }} />
                <p style={{ fontSize: '10px', color: active ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', fontWeight: active ? 700 : 400 }}>{pt.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 28px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, marginTop: '8px' }}
      >
        {saving ? 'Saving…' : 'Save avatar'}
      </button>

    </div>
  )
}

// --- CHANGE LOG ---
// [May 21, 2026] CREATED: Avatar customizer — live preview + all pickers
// [May 21, 2026] UPDATED: Icon picker uses real Lucide icons
// [May 22, 2026] FIXED: Replaced broken Lucide imports with v0.303-safe names
//               Removed Cross, Hospital, Biohazard, ClipboardList, Accessibility,
//               Radiation, FlaskRound, HeartPulse, Bandage, ScanLine, Ambulance,
//               BedDouble, ShieldPlus, TestTube, Virus — none exist in v0.303
// [May 22, 2026] FIXED: Live preview prop renamed from avatar= to avatarRow=
//               CAUSE: Avatar.jsx expects avatarRow — using avatar= passed undefined,
//               so preview always showed default stethoscope regardless of selection.
// [May 25, 2026] FIXED: Avatar change now reflects immediately everywhere.
// REASON: handleSave had no store update after save — avatar only updated on page reload.
// FIX: Optimistic useAuthStore.setState patches profile.avatar instantly after save.
// --- END CHANGE LOG ---
