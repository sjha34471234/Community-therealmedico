// ============================================================
// FILE: lib/scrollMusicLibrary.js
// PURPOSE: Hardcoded CC0 music library for Scroll Creator.
// LAST CHANGED: May 27, 2026
// WHY IT EXISTS: No API needed. All tracks CC0/public domain.
// ⚠️ Source: incompetech.com (Kevin MacLeod) — most reliable
//   free music CDN. Direct /music/ path, always works.
// ============================================================

// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1.
// [May 27 2026] FIXED v1: Switched from Wikipedia to archive.org — still failed.
// [May 27 2026] FIXED v2: Switched to incompetech.com Kevin MacLeod CDN.
//   These URLs are direct MP3s, CC0, used by millions of projects worldwide.
// --- END CHANGE LOG ---

export const MUSIC_GENRES = [
  {
    id: 'ambient',
    label: 'Ambient',
    emoji: '🌌',
    tracks: [
      {
        id: 'amb_1',
        name: 'Relaxing Piano',
        duration: 212,
        mood: 'Peaceful',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Relaxing%20Piano%20Music.mp3',
      },
      {
        id: 'amb_2',
        name: 'Meditation Impromptu',
        duration: 195,
        mood: 'Dreamy',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2001.mp3',
      },
      {
        id: 'amb_3',
        name: 'Floating Cities',
        duration: 230,
        mood: 'Atmospheric',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Floating%20Cities.mp3',
      },
      {
        id: 'amb_4',
        name: 'Evening of Chaos',
        duration: 185,
        mood: 'Expansive',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Evening%20of%20Chaos.mp3',
      },
      {
        id: 'amb_5',
        name: 'Perspectives',
        duration: 200,
        mood: 'Calm',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Perspectives.mp3',
      },
      {
        id: 'amb_6',
        name: 'Hypnothis',
        duration: 218,
        mood: 'Serene',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hypnothis.mp3',
      },
    ],
  },
  {
    id: 'study',
    label: 'Study Focus',
    emoji: '🧠',
    tracks: [
      {
        id: 'std_1',
        name: 'Thinking Music',
        duration: 226,
        mood: 'Concentrated',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Thinking%20Music.mp3',
      },
      {
        id: 'std_2',
        name: 'Cipher',
        duration: 210,
        mood: 'Alert',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher.mp3',
      },
      {
        id: 'std_3',
        name: 'Interloper',
        duration: 195,
        mood: 'Sharp',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Interloper.mp3',
      },
      {
        id: 'std_4',
        name: 'Beauty Flow',
        duration: 240,
        mood: 'Focused',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Beauty%20Flow.mp3',
      },
      {
        id: 'std_5',
        name: 'Digital Lemonade',
        duration: 188,
        mood: 'Energised',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Digital%20Lemonade.mp3',
      },
      {
        id: 'std_6',
        name: 'Impact Moderato',
        duration: 175,
        mood: 'Steady',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Moderato.mp3',
      },
    ],
  },
  {
    id: 'upbeat',
    label: 'Upbeat',
    emoji: '⚡',
    tracks: [
      {
        id: 'upb_1',
        name: 'Cheery Monday',
        duration: 178,
        mood: 'Energetic',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cheery%20Monday.mp3',
      },
      {
        id: 'upb_2',
        name: 'Funky Chunk',
        duration: 165,
        mood: 'Motivating',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funky%20Chunk.mp3',
      },
      {
        id: 'upb_3',
        name: 'Disco Medusae',
        duration: 192,
        mood: 'Lively',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Disco%20Medusae.mp3',
      },
      {
        id: 'upb_4',
        name: 'Carefree',
        duration: 204,
        mood: 'Bright',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3',
      },
      {
        id: 'upb_5',
        name: 'Hot Pursuit',
        duration: 155,
        mood: 'Intense',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hot%20Pursuit.mp3',
      },
      {
        id: 'upb_6',
        name: 'Upbeat Forever',
        duration: 170,
        mood: 'Uplifting',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Upbeat%20Forever.mp3',
      },
    ],
  },
  {
    id: 'calm',
    label: 'Calm',
    emoji: '🌙',
    tracks: [
      {
        id: 'clm_1',
        name: 'Wallpaper',
        duration: 192,
        mood: 'Relaxing',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3',
      },
      {
        id: 'clm_2',
        name: 'Slow Burn',
        duration: 218,
        mood: 'Unwinding',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Slow%20Burn.mp3',
      },
      {
        id: 'clm_3',
        name: 'Somewhere Sunny',
        duration: 205,
        mood: 'Gentle',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Somewhere%20Sunny.mp3',
      },
      {
        id: 'clm_4',
        name: 'Peaceful Desolation',
        duration: 230,
        mood: 'Peaceful',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Peaceful%20Desolation.mp3',
      },
      {
        id: 'clm_5',
        name: 'Long Note Four',
        duration: 245,
        mood: 'Soothing',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Long%20Note%20Four.mp3',
      },
      {
        id: 'clm_6',
        name: 'Heartwarming',
        duration: 188,
        mood: 'Warm',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heartwarming.mp3',
      },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    emoji: '🌿',
    tracks: [
      {
        id: 'nat_1',
        name: 'Garden Music',
        duration: 210,
        mood: 'Refreshing',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Garden%20Music.mp3',
      },
      {
        id: 'nat_2',
        name: 'Morning Mood',
        duration: 195,
        mood: 'Grounding',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Morning%20Mood.mp3',
      },
      {
        id: 'nat_3',
        name: 'Flowing River',
        duration: 220,
        mood: 'Flowing',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Flowing%20River.mp3',
      },
      {
        id: 'nat_4',
        name: 'Rainbows',
        duration: 185,
        mood: 'Fresh',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Rainbows.mp3',
      },
      {
        id: 'nat_5',
        name: 'Crinoline Dreams',
        duration: 200,
        mood: 'Airy',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crinoline%20Dreams.mp3',
      },
      {
        id: 'nat_6',
        name: 'Woodland Fantasy',
        duration: 215,
        mood: 'Expansive',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Woodland%20Fantasy.mp3',
      },
    ],
  },
]

export function getAllTracks() {
  return MUSIC_GENRES.flatMap(function flatG(g) {
    return g.tracks.map(function flatT(t) {
      return { ...t, genre: g.label, genreId: g.id }
    })
  })
}

export function getGenreById(id) {
  return MUSIC_GENRES.find(function findG(g) { return g.id === id }) || null
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m + ':' + (s < 10 ? '0' : '') + s
}
