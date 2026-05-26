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
// [May 27 2026] FIXED v1: setPendingTrack moved before audio.play().
// [May 27 2026] FIXED v2: Switched to CSS classes from creator.css.
//   Genre row uses .creator-music-genre-row + .creator-music-genre-btn.
//   Action buttons use .creator-music-use-btn + .creator-music-remove-btn.
//   Inline styles removed — all styling via creator.css now.
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
    if (pendingTrack && pendingTrack.id === track.id) {
      if (previewingId === track.id) {
        stopPreview();
      } else {
        tryPlay(track, startSec);
      }
      return;
    }
    stopPreview();
    setPendingTrack(track);
    setStartSec(0);
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
      setFailedIds(function markFailed(p) {
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
      <div className="creator-music-genre-row">
        {MUSIC_GENRES.map(function renderGenre(g) {
          return (
            <button
              key={g.id}
              className={'creator-music-genre-btn' + (activeGenre === g.id ? ' creator-music-genre-btn--active' : '')}
              onClick={function() {
                setActiveGenre(g.id);
                stopPreview();
                setPendingTrack(null);
                setStartSec(0);
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
              <button
                className="creator-music-track__play"
                aria-label={isPreviewing ? 'Stop preview' : 'Preview track'}
              >
                {isFailed
                  ? <AlertCircle size={15} color="#ef4444" />
                  : isSelected
                    ? <Check size={15} color="#1D6FA4" />
                    : isPreviewing
                      ? <Pause size={15} />
                      : <Play size={15} />
                }
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="creator-music-track__name">{track.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
                  {isFailed ? 'Unavailable' : track.mood}
                </div>
              </div>

              <span className="creator-music-track__dur">{formatDuration(track.duration)}</span>
            </div>
          );
        })}
      </div>

      {/* ── START POINT SLIDER — shown as soon as track is tapped ── */}
      {pendingTrack && (
        <div className="creator-music-selected-bar">
          <div className="creator-music-selected-bar__label">
            {previewingId === pendingTrack.id ? '🎵 Previewing — ' : ''}Start point
          </div>
          <div className="creator-music-selected-bar__name">
            <Music size={12} />
            {pendingTrack.name}
          </div>

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
                Starts at {formatDuration(startSec)} · drag slider to pick start point
              </div>
              <button className="creator-music-use-btn" onClick={handleSelect}>
                ✓ Use this track
              </button>
              {selected && (
                <button className="creator-music-remove-btn" onClick={handleRemoveMusic}>
                  Remove current track
                </button>
              )}
            </>
          ) : (
            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
              This track could not load. Tap another one.
            </div>
          )}
        </div>
      )}

      {/* ── SELECTED TRACK DISPLAY (when nothing pending) ── */}
      {selected && !pendingTrack && (
        <div className="creator-music-selected-bar">
          <div className="creator-music-selected-bar__label">Selected track</div>
          <div className="creator-music-selected-bar__name">
            <Music size={12} />
            {selected.trackName}
          </div>
          <div className="creator-music-selected-bar__hint">
            Starts at {formatDuration(selected.startSec || 0)}
          </div>
          <button className="creator-music-remove-btn" onClick={handleRemoveMusic}>
            Remove music
          </button>
        </div>
      )}

    </div>
  );
}
