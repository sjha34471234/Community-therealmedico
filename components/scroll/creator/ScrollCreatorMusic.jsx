'use client';

// --- WHY THIS CODE EXISTS ---
// Music tab for the Scroll Creator.
// Uses hardcoded scrollMusicLibrary — no API, no key needed.
// --- WHAT THIS MADE WORK ---
// Genre tabs, track list, preview playback, start-point slider,
// selected track confirmation.
// --- PITFALLS ---
// setPendingTrack must happen BEFORE audio.play() — not inside .then().
// If play() fails (autoplay block or bad URL), slider still shows.
// Single Audio ref — always pause + reset before playing new track.
// preview auto-stops after 10 seconds via setTimeout.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 music tab.
// [May 27 2026] FIXED: setPendingTrack moved before audio.play() so slider
//   always appears on tap. Added error state for failed URLs.
//   Replaced unreliable Wikipedia URLs in library with archive.org links.
// --- END CHANGE LOG ---

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Check, Music, AlertCircle } from 'lucide-react';
import { MUSIC_GENRES, formatDuration } from '@/lib/scrollMusicLibrary';

export default function ScrollCreatorMusic({ selected, onSelect }) {
  const [activeGenre, setActiveGenre] = useState(MUSIC_GENRES[0].id);
  const [previewingId, setPreviewingId] = useState(null);
  const [failedIds, setFailedIds] = useState({});
  const [startSec, setStartSec] = useState(0);
  const [pendingTrack, setPendingTrack] = useState(null);
  const audioRef = useRef(null);
  const previewTimerRef = useRef(null);

  const genre = MUSIC_GENRES.find(function findG(g) { return g.id === activeGenre; });

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setPreviewingId(null);
  };

  const handleTrackTap = (track) => {
    // If already pending this track — just toggle preview
    if (pendingTrack && pendingTrack.id === track.id) {
      if (previewingId === track.id) {
        stopPreview();
      } else {
        tryPlay(track, startSec);
      }
      return;
    }

    // New track tapped — set pending immediately so slider appears
    stopPreview();
    setPendingTrack(track);
    setStartSec(0);

    // Try to play preview
    tryPlay(track, 0);
  };

  const tryPlay = (track, fromSec) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

    const audio = new Audio(track.url);
    audio.currentTime = fromSec;
    audioRef.current = audio;

    audio.play().then(function onPlay() {
      setPreviewingId(track.id);
      previewTimerRef.current = setTimeout(function stopAfter10() {
        stopPreview();
      }, 10000);
    }).catch(function onFail() {
      // Mark this track as failed — show error icon
      setFailedIds(function prev(p) {
        const next = { ...p };
        next[track.id] = true;
        return next;
      });
      setPreviewingId(null);
    });
  };

  const handleStartSecChange = (val) => {
    const sec = Number(val);
    setStartSec(sec);
    if (audioRef.current && pendingTrack) {
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
        {MUSIC_GENRES.map(function renderGenre(g) {
          return (
            <button
              key={g.id}
              onClick={function() {
                setActiveGenre(g.id);
                stopPreview();
                setPendingTrack(null);
                setStartSec(0);
              }}
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
          );
        })}
      </div>

      {/* ── TRACK LIST ── */}
      <div className="creator-music-results">
        {genre && genre.tracks.map(function renderTrack(track) {
          const isSelected = selected && selected.trackId === track.id;
          const isPreviewing = previewingId === track.id;
          const isPending = pendingTrack && pendingTrack.id === track.id;
          const isFailed = failedIds[track.id];

          return (
            <div
              key={track.id}
              className={'creator-music-track' + (isPending ? ' creator-music-track--selected' : '')}
              onClick={function() { handleTrackTap(track); }}
            >
              <button className="creator-music-track__play" aria-label={isPreviewing ? 'Stop preview' : 'Preview track'}>
                {isFailed
                  ? <AlertCircle size={14} color="#ef4444" />
                  : isSelected
                    ? <Check size={14} color="#1D6FA4" />
                    : isPreviewing
                      ? <Pause size={14} />
                      : <Play size={14} />
                }
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="creator-music-track__name">{track.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                  {isFailed ? 'Unavailable' : track.mood}
                </div>
              </div>

              <span className="creator-music-track__dur">{formatDuration(track.duration)}</span>
            </div>
          );
        })}
      </div>

      {/* ── START POINT SLIDER — always shown when pendingTrack set ── */}
      {pendingTrack && (
        <div className="creator-music-selected-bar">
          <div className="creator-music-selected-bar__label">
            {previewingId === pendingTrack.id ? '🎵 Previewing — ' : ''}Start point
          </div>
          <div className="creator-music-selected-bar__name">
            <Music size={11} style={{ marginRight: 4, opacity: 0.6 }} />
            {pendingTrack.name}
          </div>

          {/* Only show slider if track is not failed */}
          {!failedIds[pendingTrack.id] ? (
            <>
              <input
                type="range"
                min={0}
                max={maxStart}
                step={5}
                value={startSec}
                onChange={function(e) { handleStartSecChange(e.target.value); }}
              />
              <div className="creator-music-selected-bar__hint">
                Starts at {formatDuration(startSec)} · drag to choose start point
              </div>
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
            </>
          ) : (
            <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
              This track could not be loaded. Try another one.
            </div>
          )}
        </div>
      )}

      {/* ── CURRENTLY SELECTED TRACK (when no pending) ── */}
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
