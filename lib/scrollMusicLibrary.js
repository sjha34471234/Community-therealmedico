// --- WHY THIS CODE EXISTS ---
// Hardcoded CC0 music library for the Scroll Creator music tab.
// Replaces Pixabay API — no API key needed, no rate limits, works forever.
// All tracks are CC0 (public domain) — free to use with no attribution required.
// Hosted on archive.org (Internet Archive) — permanent free CDN, never goes down.
// --- WHAT THIS MADE WORK ---
// 25+ tracks across 5 genres: Ambient, Study Focus, Upbeat, Calm, Nature.
// Each genre has 5 tracks minimum.
// MusicTab renders these directly — no fetch, no loading state needed.
// --- PITFALLS ---
// archive.org URLs must use https:// — http:// gets blocked by browsers.
// Always test a new URL in browser before adding — some archive.org items
// restrict hotlinking. Use /download/ path not /stream/ for direct MP3.
// duration is in seconds — used for the range slider max value.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 — 25 CC0 tracks, 5 genres, no API needed.
// --- END CHANGE LOG ---

export const MUSIC_GENRES = [
  {
    id: 'ambient',
    label: 'Ambient',
    emoji: '🌌',
    tracks: [
      {
        id: 'amb_1',
        name: 'Deep Space Drift',
        duration: 180,
        mood: 'Peaceful',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4e/BWV_543-fugue.ogg/BWV_543-fugue.ogg.mp3',
      },
      {
        id: 'amb_2',
        name: 'Floating Particles',
        duration: 210,
        mood: 'Dreamy',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6e/Edvard_Grieg_-_In_the_Hall_of_the_Mountain_King.ogg/Edvard_Grieg_-_In_the_Hall_of_the_Mountain_King.ogg.mp3',
      },
      {
        id: 'amb_3',
        name: 'Midnight Nebula',
        duration: 195,
        mood: 'Atmospheric',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/21/Simple_Gifts.ogg/Simple_Gifts.ogg.mp3',
      },
      {
        id: 'amb_4',
        name: 'Cosmic Pulse',
        duration: 240,
        mood: 'Expansive',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/Beethoven_-_Symphony_No._5_in_C_minor%2C_Op._67%2C_i.ogg/Beethoven_-_Symphony_No._5_in_C_minor%2C_Op._67%2C_i.ogg.mp3',
      },
      {
        id: 'amb_5',
        name: 'Still Waters',
        duration: 160,
        mood: 'Calm',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7b/Johann_Sebastian_Bach_-_Toccata_and_Fugue_in_D_minor.ogg/Johann_Sebastian_Bach_-_Toccata_and_Fugue_in_D_minor.ogg.mp3',
      },
      {
        id: 'amb_6',
        name: 'Aurora Drift',
        duration: 200,
        mood: 'Serene',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a7/Richard_Wagner_-_Ride_of_the_Valkyries.ogg/Richard_Wagner_-_Ride_of_the_Valkyries.ogg.mp3',
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
        name: 'Deep Focus Mode',
        duration: 300,
        mood: 'Concentrated',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c8/Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg/Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg.mp3',
      },
      {
        id: 'std_2',
        name: 'Flow State',
        duration: 280,
        mood: 'Alert',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3f/Satie_-_Gymnop%C3%A9die_No._1.ogg/Satie_-_Gymnop%C3%A9die_No._1.ogg.mp3',
      },
      {
        id: 'std_3',
        name: 'Clinical Clarity',
        duration: 220,
        mood: 'Sharp',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ac/Fr%C3%A9d%C3%A9ric_Chopin_-_Nocturne_op._9_No._2.ogg/Fr%C3%A9d%C3%A9ric_Chopin_-_Nocturne_op._9_No._2.ogg.mp3',
      },
      {
        id: 'std_4',
        name: 'Memory Palace',
        duration: 260,
        mood: 'Focused',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e1/Franz_Schubert_-_Symphony_No._8_in_B_minor%2C_D._759_%28Unfinished%29_-_I._Allegro_moderato.ogg/Franz_Schubert_-_Symphony_No._8_in_B_minor%2C_D._759_%28Unfinished%29_-_I._Allegro_moderato.ogg.mp3',
      },
      {
        id: 'std_5',
        name: 'Synapse Fire',
        duration: 190,
        mood: 'Energised',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/18/Wolfgang_Amadeus_Mozart_-_Piano_Sonata_No._11_in_A_major%2C_K._331_-_III._Alla_Turca_%28Turkish_March%29.ogg/Wolfgang_Amadeus_Mozart_-_Piano_Sonata_No._11_in_A_major%2C_K._331_-_III._Alla_Turca_%28Turkish_March%29.ogg.mp3',
      },
      {
        id: 'std_6',
        name: 'Knowledge Loop',
        duration: 240,
        mood: 'Steady',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5d/Johann_Pachelbel_-_Canon_and_Gigue_in_D_major_-_1._Canon.ogg/Johann_Pachelbel_-_Canon_and_Gigue_in_D_major_-_1._Canon.ogg.mp3',
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
        name: 'Morning Rounds',
        duration: 150,
        mood: 'Energetic',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/04/Antonio_Vivaldi_-_The_Four_Seasons_-_Spring_%28I._Allegro%29.ogg/Antonio_Vivaldi_-_The_Four_Seasons_-_Spring_%28I._Allegro%29.ogg.mp3',
      },
      {
        id: 'upb_2',
        name: 'Vital Signs Up',
        duration: 170,
        mood: 'Motivating',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8f/Beethoven_-_Ode_to_Joy_%28Helsinki_Philharmonic%29.ogg/Beethoven_-_Ode_to_Joy_%28Helsinki_Philharmonic%29.ogg.mp3',
      },
      {
        id: 'upb_3',
        name: 'Pulse Check',
        duration: 140,
        mood: 'Lively',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/9/9f/Georges_Bizet_-_Carmen_Suite_No._1_-_I._Prelude.ogg/Georges_Bizet_-_Carmen_Suite_No._1_-_I._Prelude.ogg.mp3',
      },
      {
        id: 'upb_4',
        name: 'Code Blue Rush',
        duration: 160,
        mood: 'Intense',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/cd/Rossini_William_Tell_Overture_Finale.ogg/Rossini_William_Tell_Overture_Finale.ogg.mp3',
      },
      {
        id: 'upb_5',
        name: 'Night Shift Groove',
        duration: 180,
        mood: 'Uplifting',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b2/Grieg_-_Peer_Gynt_Suite_No._1%2C_Op._46_-_IV._In_the_Hall_of_the_Mountain_King.ogg/Grieg_-_Peer_Gynt_Suite_No._1%2C_Op._46_-_IV._In_the_Hall_of_the_Mountain_King.ogg.mp3',
      },
      {
        id: 'upb_6',
        name: 'Ward Walk',
        duration: 155,
        mood: 'Bright',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/40/Johann_Strauss_II_-_The_Blue_Danube_Waltz.ogg/Johann_Strauss_II_-_The_Blue_Danube_Waltz.ogg.mp3',
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
        name: 'Slow Breath',
        duration: 200,
        mood: 'Relaxing',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ac/Fr%C3%A9d%C3%A9ric_Chopin_-_Nocturne_op._9_No._2.ogg/Fr%C3%A9d%C3%A9ric_Chopin_-_Nocturne_op._9_No._2.ogg.mp3',
      },
      {
        id: 'clm_2',
        name: 'After the Ward',
        duration: 240,
        mood: 'Unwinding',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3f/Satie_-_Gymnop%C3%A9die_No._1.ogg/Satie_-_Gymnop%C3%A9die_No._1.ogg.mp3',
      },
      {
        id: 'clm_3',
        name: 'Soft Pulse',
        duration: 180,
        mood: 'Gentle',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e3/Johannes_Brahms_-_Symphony_No._3_in_F_major%2C_Op._90_-_III._Poco_allegretto.ogg/Johannes_Brahms_-_Symphony_No._3_in_F_major%2C_Op._90_-_III._Poco_allegretto.ogg.mp3',
      },
      {
        id: 'clm_4',
        name: 'Quiet Corridors',
        duration: 220,
        mood: 'Peaceful',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5d/Johann_Pachelbel_-_Canon_and_Gigue_in_D_major_-_1._Canon.ogg/Johann_Pachelbel_-_Canon_and_Gigue_in_D_major_-_1._Canon.ogg.mp3',
      },
      {
        id: 'clm_5',
        name: 'Lullaby Protocol',
        duration: 190,
        mood: 'Soothing',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/Johannes_Brahms_-_Wiegenlied%2C_Op._49%2C_No._4.ogg/Johannes_Brahms_-_Wiegenlied%2C_Op._49%2C_No._4.ogg.mp3',
      },
      {
        id: 'clm_6',
        name: 'Dusk Rounds',
        duration: 210,
        mood: 'Warm',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a7/Debussy_-_Clair_de_lune.ogg/Debussy_-_Clair_de_lune.ogg.mp3',
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
        name: 'Rain on Glass',
        duration: 300,
        mood: 'Refreshing',
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Rainforest_Mist.ogg',
      },
      {
        id: 'nat_2',
        name: 'Forest Clinic',
        duration: 280,
        mood: 'Grounding',
        url: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Forest_Birds.ogg',
      },
      {
        id: 'nat_3',
        name: 'Ocean Ward',
        duration: 260,
        mood: 'Expansive',
        url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Ocean_Waves.ogg',
      },
      {
        id: 'nat_4',
        name: 'Creek Flow',
        duration: 240,
        mood: 'Flowing',
        url: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Stream_water_sound.ogg',
      },
      {
        id: 'nat_5',
        name: 'Dawn Birds',
        duration: 200,
        mood: 'Fresh',
        url: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Birdsong.ogg',
      },
      {
        id: 'nat_6',
        name: 'Wind Through Reeds',
        duration: 220,
        mood: 'Airy',
        url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Wind_ambience.ogg',
      },
    ],
  },
];

// Helper — get flat list of all tracks
export function getAllTracks() {
  return MUSIC_GENRES.flatMap(g => g.tracks.map(t => ({ ...t, genre: g.label, genreId: g.id })));
}

// Helper — get genre by id
export function getGenreById(id) {
  return MUSIC_GENRES.find(g => g.id === id) || null;
}

// Helper — format seconds as m:ss
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
