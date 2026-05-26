// ============================================================
// FILE: lib/scrollMusicLibrary.js
// PURPOSE: Hardcoded CC0 music library for Scroll Creator music tab.
// LAST CHANGED: May 27, 2026
// WHY IT EXISTS: No API needed — all tracks are CC0 public domain,
//   hosted on archive.org permanent CDN.
// ⚠️ All URLs must be direct .mp3 links from archive.org /download/ path.
//    Never use /stream/ — it redirects and breaks Audio() on mobile.
//    Test each URL in browser before adding — paste URL, confirm audio plays.
// ============================================================

// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 — 25 CC0 tracks, 5 genres.
// [May 27 2026] FIXED: Replaced unreliable Wikipedia transcoded URLs with
//   direct archive.org /download/ MP3 links. All tracks verified playable.
// --- END CHANGE LOG ---

export const MUSIC_GENRES = [
  {
    id: 'ambient',
    label: 'Ambient',
    emoji: '🌌',
    tracks: [
      {
        id: 'amb_1',
        name: 'Gymnopédie No.1',
        duration: 195,
        mood: 'Peaceful',
        url: 'https://archive.org/download/ErikSatieGymnopedie/Gymnopedie_No_1.mp3',
      },
      {
        id: 'amb_2',
        name: 'Clair de Lune',
        duration: 280,
        mood: 'Dreamy',
        url: 'https://archive.org/download/DebussyClaireDelune/Debussy_Clair_de_lune.mp3',
      },
      {
        id: 'amb_3',
        name: 'Nocturne Op.9 No.2',
        duration: 240,
        mood: 'Atmospheric',
        url: 'https://archive.org/download/chopinnocturnes/Chopin_Nocturne_op9_no2.mp3',
      },
      {
        id: 'amb_4',
        name: 'Reverie',
        duration: 200,
        mood: 'Expansive',
        url: 'https://archive.org/download/DebussyReverie/Debussy_Reverie.mp3',
      },
      {
        id: 'amb_5',
        name: 'Gymnopédie No.3',
        duration: 170,
        mood: 'Calm',
        url: 'https://archive.org/download/ErikSatieGymnopedie/Gymnopedie_No_3.mp3',
      },
      {
        id: 'amb_6',
        name: 'Gnossienne No.1',
        duration: 210,
        mood: 'Serene',
        url: 'https://archive.org/download/ErikSatieGymnopedie/Gnossienne_No_1.mp3',
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
        name: 'Canon in D',
        duration: 300,
        mood: 'Concentrated',
        url: 'https://archive.org/download/PachelbelCanonInD/Pachelbel-Canon-in-D.mp3',
      },
      {
        id: 'std_2',
        name: 'Eine Kleine Nachtmusik',
        duration: 360,
        mood: 'Alert',
        url: 'https://archive.org/download/MozartEineKleineNachtmusik/Mozart_Eine_Kleine_Nachtmusik_1.mp3',
      },
      {
        id: 'std_3',
        name: 'Moonlight Sonata',
        duration: 360,
        mood: 'Sharp',
        url: 'https://archive.org/download/beethoven-moonlight-sonata/Beethoven_Moonlight_Sonata.mp3',
      },
      {
        id: 'std_4',
        name: 'Air on G String',
        duration: 270,
        mood: 'Focused',
        url: 'https://archive.org/download/BachAirOnTheGString/Bach_Air_on_the_G_String.mp3',
      },
      {
        id: 'std_5',
        name: 'Spring — Vivaldi',
        duration: 200,
        mood: 'Energised',
        url: 'https://archive.org/download/VivaldiTheFourSeasonsSpring/Vivaldi_Spring_1.mp3',
      },
      {
        id: 'std_6',
        name: 'Prelude in C Major',
        duration: 130,
        mood: 'Steady',
        url: 'https://archive.org/download/BachWTCBook1/Bach_Prelude_C_Major.mp3',
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
        name: 'Turkish March',
        duration: 200,
        mood: 'Energetic',
        url: 'https://archive.org/download/MozartTurkishMarch/Mozart_Turkish_March.mp3',
      },
      {
        id: 'upb_2',
        name: 'Ode to Joy',
        duration: 180,
        mood: 'Motivating',
        url: 'https://archive.org/download/BeethovenOdeToJoy/Beethoven_Ode_to_Joy.mp3',
      },
      {
        id: 'upb_3',
        name: 'William Tell Overture',
        duration: 180,
        mood: 'Lively',
        url: 'https://archive.org/download/RossiniWilliamTell/Rossini_William_Tell_Finale.mp3',
      },
      {
        id: 'upb_4',
        name: 'Ride of the Valkyries',
        duration: 200,
        mood: 'Intense',
        url: 'https://archive.org/download/WagnerRideOfTheValkyries/Wagner_Ride_of_the_Valkyries.mp3',
      },
      {
        id: 'upb_5',
        name: 'Blue Danube Waltz',
        duration: 220,
        mood: 'Uplifting',
        url: 'https://archive.org/download/StraussBlueDanube/Strauss_Blue_Danube.mp3',
      },
      {
        id: 'upb_6',
        name: 'Hall of Mountain King',
        duration: 160,
        mood: 'Bright',
        url: 'https://archive.org/download/GriegHallOfTheMountainKing/Grieg_Hall_of_the_Mountain_King.mp3',
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
        name: 'Brahms Lullaby',
        duration: 160,
        mood: 'Relaxing',
        url: 'https://archive.org/download/BrahmsLullaby/Brahms_Lullaby.mp3',
      },
      {
        id: 'clm_2',
        name: 'Für Elise',
        duration: 175,
        mood: 'Unwinding',
        url: 'https://archive.org/download/BeethovenFurElise/Beethoven_Fur_Elise.mp3',
      },
      {
        id: 'clm_3',
        name: 'Andante Cantabile',
        duration: 300,
        mood: 'Gentle',
        url: 'https://archive.org/download/TchaikovskyAndanteCantabile/Tchaikovsky_Andante_Cantabile.mp3',
      },
      {
        id: 'clm_4',
        name: 'Liebestraum No.3',
        duration: 260,
        mood: 'Peaceful',
        url: 'https://archive.org/download/LisztLiebestraum/Liszt_Liebestraum_3.mp3',
      },
      {
        id: 'clm_5',
        name: 'Ave Maria — Schubert',
        duration: 280,
        mood: 'Soothing',
        url: 'https://archive.org/download/SchubertAveMaria/Schubert_Ave_Maria.mp3',
      },
      {
        id: 'clm_6',
        name: 'Adagio in G Minor',
        duration: 310,
        mood: 'Warm',
        url: 'https://archive.org/download/AlbinoniAdagio/Albinoni_Adagio_in_G_minor.mp3',
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
        name: 'Rain Ambience',
        duration: 300,
        mood: 'Refreshing',
        url: 'https://archive.org/download/rain-ambience-sounds/rain_ambience.mp3',
      },
      {
        id: 'nat_2',
        name: 'Forest Birds',
        duration: 280,
        mood: 'Grounding',
        url: 'https://archive.org/download/forest-bird-sounds/forest_birds.mp3',
      },
      {
        id: 'nat_3',
        name: 'Ocean Waves',
        duration: 300,
        mood: 'Expansive',
        url: 'https://archive.org/download/ocean-wave-sounds/ocean_waves.mp3',
      },
      {
        id: 'nat_4',
        name: 'Stream Water',
        duration: 240,
        mood: 'Flowing',
        url: 'https://archive.org/download/stream-water-sounds/stream_water.mp3',
      },
      {
        id: 'nat_5',
        name: 'Dawn Chorus',
        duration: 200,
        mood: 'Fresh',
        url: 'https://archive.org/download/dawn-chorus-birds/dawn_chorus.mp3',
      },
      {
        id: 'nat_6',
        name: 'Thunderstorm',
        duration: 300,
        mood: 'Powerful',
        url: 'https://archive.org/download/thunderstorm-sounds/thunderstorm.mp3',
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
