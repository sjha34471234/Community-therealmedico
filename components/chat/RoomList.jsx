// --- WHY THIS CODE EXISTS ---
// Renders the list of 12 chat rooms in the left sidebar.
// Shows room name, icon, and last message preview.
// Highlights the currently active room.
// Polls every 15 seconds for last message updates — lightweight, no Realtime needed here.

// --- WHAT THIS MADE WORK ---
// RoomList → used by ChatLayout.jsx
// Reads room definitions from /api/chat/rooms (which merges chatConfig + last message)
// Active room is highlighted with accent background
// Clicking a room calls onSelectRoom(room) — parent manages which room is open

// --- PITFALLS ---
// ⚠️ Icons are resolved dynamically from lucide-react — only v0.303-safe names used
//    If an icon name doesn't exist in v0.303, it silently falls back to Stethoscope
// ⚠️ Polling interval must be cleared on unmount — always return clearInterval in useEffect
// ⚠️ Never use Realtime here — 12 rooms × N users = too many channels. Polling is correct.
// ⚠️ Room list itself never paginates — all 12 rooms load at once (small fixed list)
// ⚠️ Last message preview comes from API — may be null for empty rooms (valid state)

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — room list sidebar component
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope, Pill, Microscope, Heart, Bone, Brain,
  Eye, FlaskConical, Zap, Clipboard, Baby, Activity,
} from 'lucide-react';

// Map icon name strings → actual Lucide components
// Only v0.303-safe icons — matches what was seeded in chatConfig.js
const ICON_MAP = {
  Stethoscope,
  Pill,
  Microscope,
  Heart,
  Bone,
  Brain,
  Eye,
  FlaskConical,
  Zap,
  Clipboard,
  Baby,
  Activity,
};

function RoomIcon({ name, size = 16, color = 'currentColor' }) {
  const Icon = ICON_MAP[name] || Stethoscope;
  return <Icon size={size} color={color} />;
}

// Format last message time as short string — "2m", "1h", "3d"
function shortTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function RoomList({ activeRoomId, onSelectRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/rooms', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch {
      // Silent fail on poll — don't show error on background refresh
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 15 seconds for last message updates
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000);
    // ⚠️ Always clear interval on unmount — memory leak if not cleared
    return () => clearInterval(interval);
  }, [fetchRooms]);

  if (loading) {
    return (
      <div style={{ padding: '16px 12px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: '52px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              marginBottom: '6px',
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Section header */}
      <div
        style={{
          padding: '4px 16px 8px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Chat Rooms
      </div>

      {rooms.map(room => {
        const isActive = room.id === activeRoomId;

        return (
          <button
            key={room.slug}
            onClick={() => onSelectRoom(room)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              margin: '1px 4px',
              width: 'calc(100% - 8px)',
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'background-color 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Room icon in a circle */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s',
              }}
            >
              <RoomIcon
                name={room.icon}
                size={16}
                color={isActive ? '#ffffff' : 'var(--text-secondary)'}
              />
            </div>

            {/* Room name + last message preview */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {room.name}
              </div>

              {room.lastMessage ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'Inter, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '1px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {room.lastMessage.username}:
                  </span>
                  {' '}{room.lastMessage.preview}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'Inter, sans-serif',
                    marginTop: '1px',
                    fontStyle: 'italic',
                  }}
                >
                  No messages yet
                </div>
              )}
            </div>

            {/* Last activity time */}
            {room.lastMessage?.createdAt && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                  flexShrink: 0,
                }}
              >
                {shortTime(room.lastMessage.createdAt)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
