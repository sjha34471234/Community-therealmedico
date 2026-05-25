'use client';

// ============================================================
// FILE: components/scroll/ScrollMusicPlayer.jsx
// PURPOSE: Background ambient music toggle for scroll feed
// LAST CHANGED: May 26, 2026
// WHY IT EXISTS: Phase 15 Scroll — free royalty-free ambient music
// SOURCE: Pixabay CC0 license — no attribution required
// ⚠️ PITFALLS:
//   - Audio created ONCE in useEffect — never inside render
//   - Autoplay blocked by browsers until first user gesture
//   - Cleanup pauses + resets audio on unmount
//   - volume 0.25 — ambient, not intrusive
// ============================================================

import { useEffect, useRef } from 'react';
import { Music, MusicOff } from 'lucide-react';

const MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb06c8139.mp3';

export default function ScrollMusicPlayer({ playing, onToggle }) {
  const audioRef = useRef(null);

  useEffect(function() {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.25;
    return function() {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(function() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.play().catch(function() {});
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  return (
    <div className="scroll-music-bar">
      <button className="scroll-music-btn" onClick={onToggle} aria-label={playing ? 'Mute music' : 'Play music'}>
        {playing ? <Music size={13} /> : <MusicOff size={13} />}
        <span>{playing ? 'Music on' : 'Music off'}</span>
      </button>
    </div>
  );
}

// --- CHANGE LOG ---
// [May 26, 2026] CREATED: ScrollMusicPlayer — CC0 ambient track, toggle,
//   volume 25%, loop, pauses on unmount, only plays after user gesture.
// --- END CHANGE LOG ---
