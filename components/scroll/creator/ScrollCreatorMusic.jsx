'use client';

// --- WHY THIS CODE EXISTS ---
// Music tab for the Scroll Creator.
// Uses the hardcoded scrollMusicLibrary — no API, no key needed.
// Shows 5 genre tabs, track list per genre, preview playback,
// start-point range slider, and selected track confirmation.
// --- WHAT THIS MADE WORK ---
// Genre switching, track preview (plays 10s from start point),
// start point slider (drag to pick where music begins),
// selected track stored in canvas state via onSelect callback.
// --- PITFALLS ---
// Audio autoplay is blocked by browsers until a user gesture.
// We use a single Audio ref — always pause + reset before playing new track.
// preview plays only 10 seconds then auto-stops (setTimeout).
// onSelect must be called with the full track object + startSec.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 music tab using local library.
// --- END CHANGE LOG ---

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Check, Music } from 'lucide-react';
import { MUSIC_GENRES, formatDuration } from '@/lib/scrollMusicLibrary';

export default function ScrollCreatorMusic({ selected, onSelect }) {
  const [activeGenre, setActiveGenre] = useState(MUSIC_GENRES[0].id);
  const [previewingId, setPreviewingId] = useState(null);
  const [startSec, setStartSec] = useState(0);
  const [pendingTrack, setPendingTrack] = useState(null);
  const audioRef = useRef(null);
  const previewTimerRef = useRef(null);

  const genre = MUSIC_GENRES.find(g => g.id === activeGenre);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // Stop preview when genre changes
  useEffect(() => {
    stopPreview();
  }, [activeGenre]);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setPreviewingId(null);
  };

  const handlePreview = (track) => {
    // If already previewing this track — stop it
    if (previewingId === track.id) {
      stopPreview();
      return;
    }

    // Stop any existing preview
    stopPreview();

    // Set pending track for slider
    setPendingTrack(track);
    setStartSec(0);

    // Create new Audio instance
    const audio = new Audio(track.url);
    audio.currentTime = 0;
    audioRef.current = audio;

    audio.play().then(() => {
      setPreviewingId(track.id);
      // Auto-stop after 10 seconds
      previewTimerRef.current = setTimeout(() => {
        stopPreview();
      }, 10000);
    }).catch(() => {
      // Autoplay blocked — still set pending so slider works
      setPendingTrack(track);
      setPreviewingId(null);
    });
  };

  const handleStartSecChange = (val) => {
    const sec = Number(val);
    setStartSec(sec);
    // Seek audio if previewing
    if (audioRef.current && previewingId === pendingTrack?.id) {
      audioRef.current.currentTime = sec;
    }
  };

  const handleSelect = () => {
    if (!pendingTrack) return;
    onSelect({
      trackId: pendingTrack.id,
      trackUrl: pendingTrack.url,
      trackName: pendingTrack.name,
      startSec,
    });
    stopPreview();
  };

  const handleRemoveMusic = () => {
    onSelect(null);
    stopPreview();
    setPendingTrack(null);
    setStartSec(0);
  };

  const maxStart = pendingTrack ? Math.max(0, pendingTrack.duration - 60) : 0;

  return (
    <div className="creator-music-tab">

      {/* ── GENRE TABS ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {MUSIC_GENRES.map(g => (
          <button
            key={g.id}
            onClick={() => setActiveGenre(g.id)}
            style={{
              flexShrink: 0,
              padding: '5px 10px',
              borderRadius: 20,
              border: 'none',
              background: activeGenre === g.id ? '#1D6FA4' : 'rgba(255,255,255,0.08)',
              color: activeGenre === g.id ? '#ffffff' : 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {/* ── TRACK LIST ── */}
      <div className="creator-music-results">
        {genre && genre.tracks.map(track => {
          const isSelected = selected?.trackId === track.id;
          const isPreviewing = previewingId === track.id;
          const isPending = pendingTrack?.id === track.id;

          return (
            <div
              key={track.id}
              className={`creator-music-track${isSelected ? ' creator-music-track--selected' : ''}`}
              onClick={() => handlePreview(track)}
            >
              {/* Play / Pause / Check icon */}
              <button className="creator-music-track__play" aria-label={isPreviewing ? 'Stop preview' : 'Preview track'}>
                {isSelected
                  ? <Check size={14} color="#1D6FA4" />
                  : isPreviewing
                    ? <Pause size={14} />
                    : <Play size={14} />
                }
              </button>

              {/* Track name + mood */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="creator-music-track__name">{track.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{track.mood}</div>
              </div>

              {/* Duration */}
              <span className="creator-music-track__dur">{formatDuration(track.duration)}</span>
            </div>
          );
        })}
      </div>

      {/* ── START POINT SLIDER — shown when a track is pending ── */}
      {pendingTrack && (
        <div className="creator-music-selected-bar">
          <div className="creator-music-selected-bar__label">Start point</div>
          <div className="creator-music-selected-bar__name">
            <Music size={11} style={{ marginRight: 4, opacity: 0.6 }} />
            {pendingTrack.name}
          </div>
          <input
            type="range"
            min={0}
            max={maxStart}
            step={5}
            value={startSec}
            onChange={e => handleStartSecChange(e.target.value)}
          />
          <div className="creator-music-selected-bar__hint">
            Starts at {formatDuration(startSec)} · max 60s plays
          </div>

          {/* Confirm + Remove buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={handleSelect}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: 'none',
                background: '#1D6FA4',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ Use this track
            </button>
            {selected && (
              <button
                onClick={handleRemoveMusic}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CURRENTLY SELECTED TRACK (if any, and no pending) ── */}
      {selected && !pendingTrack && (
        <div className="creator-music-selected-bar" style={{ marginTop: 8 }}>
          <div className="creator-music-selected-bar__label">Selected track</div>
          <div className="creator-music-selected-bar__name">
            <Music size={11} style={{ marginRight: 4, opacity: 0.6 }} />
            {selected.trackName}
          </div>
          <div className="creator-music-selected-bar__hint">
            Starts at {formatDuration(selected.startSec || 0)}
          </div>
          <button
            onClick={handleRemoveMusic}
            style={{
              marginTop: 6,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Remove music
          </button>
        </div>
      )}

    </div>
  );
}
