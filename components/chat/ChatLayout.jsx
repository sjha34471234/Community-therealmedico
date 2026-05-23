// --- WHY THIS CODE EXISTS ---
// Master layout component for the /chat page.
// Renders the two-column layout: left sidebar (rooms + DMs) + right panel (active view).
// Manages which room or DM is currently open.
// Handles mobile: sidebar and view panel never show at the same time on small screens.
// Opens UserSearchModal when + is clicked in DMList.

// --- WHAT THIS MADE WORK ---
// ChatLayout → used by app/chat/page.js
// Wires together: RoomList, DMList, RoomView, DMView, UserSearchModal
// Mobile: shows sidebar OR chat panel — never both at once
// Desktop: shows sidebar (260px fixed) + chat panel (flex: 1) side by side

// --- PITFALLS ---
// ⚠️ activeView can be 'room', 'dm', or null (nothing selected)
// ⚠️ On mobile, showSidebar state controls which panel is visible
//    When a room/DM is selected on mobile, sidebar hides and chat panel shows
//    Back button in DMView / room header calls setShowSidebar(true)
// ⚠️ UserSearchModal must be unmounted when closed — not just hidden
//    Use conditional render: {showSearch && <UserSearchModal />}
// ⚠️ When a DM is selected from UserSearchModal, switch to DM view immediately
// ⚠️ Never render RoomView and DMView at the same time
// ⚠️ Supabase Realtime channel in RoomView/DMView is tied to the component mount
//    Switching rooms unmounts old RoomView and mounts new one — subscription resets correctly

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — master layout, sidebar + view wiring
// --- END CHANGE LOG ---

'use client';

import { useState, useCallback, useEffect } from 'react';
import RoomList from './RoomList';
import DMList from './DMList';
import RoomView from './RoomView';
import DMView from './DMView';
import UserSearchModal from './UserSearchModal';
import { useAuthStore } from '@/store/authStore';

// Breakpoint below which we go single-column (mobile)
const MOBILE_BREAKPOINT = 720;

export default function ChatLayout() {
  const { session } = useAuthStore();

  // What is currently open in the right panel
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeView, setActiveView] = useState(null); // 'room' | 'dm' | null

  // Mobile: show sidebar or chat panel
  const [showSidebar, setShowSidebar] = useState(true);

  // User search modal for new DMs
  const [showSearch, setShowSearch] = useState(false);

  // Track window width for responsive layout
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Select a room ─────────────────────────────────────────
  const handleSelectRoom = useCallback((room) => {
    setActiveRoom(room);
    setActiveConvo(null);
    setActiveView('room');
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  // ── Select a DM conversation ──────────────────────────────
  const handleSelectConvo = useCallback((convo) => {
    setActiveConvo(convo);
    setActiveRoom(null);
    setActiveView('dm');
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  // ── Back button (mobile) ──────────────────────────────────
  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  // ── New DM — open search modal ────────────────────────────
  const handleNewDM = useCallback(() => {
    setShowSearch(true);
  }, []);

  // ── User selected from search modal ──────────────────────
  const handleSearchSelect = useCallback((convo) => {
    setShowSearch(false);
    handleSelectConvo(convo);
  }, [handleSelectConvo]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <div
        style={{
          width: isMobile ? '100%' : '260px',
          flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid var(--bg-secondary)',
          display: isMobile
            ? (showSidebar ? 'flex' : 'none')
            : 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--bg-secondary)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Chat
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
              marginTop: '2px',
            }}
          >
            12 rooms · medical community
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Room list */}
          <RoomList
            activeRoomId={activeRoom?.id}
            onSelectRoom={handleSelectRoom}
          />

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--bg-secondary)',
              margin: '4px 0',
            }}
          />

          {/* DM list */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <DMList
              activeConvoId={activeConvo?.id}
              onSelectConvo={handleSelectConvo}
              onNewDM={handleNewDM}
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: isMobile
            ? (showSidebar ? 'none' : 'flex')
            : 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {/* Nothing selected — empty state */}
        {activeView === null && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px' }}>💬</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Welcome to The Real Medico Chat
            </div>
            <div style={{ fontSize: '13px', maxWidth: '300px', lineHeight: 1.6 }}>
              Pick a room to join a discussion, or start a direct message with someone.
            </div>
            {!session && (
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                
                  href="/auth"
                  style={{
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Sign in
                </a>
                {' '}to send messages
              </div>
            )}
          </div>
        )}

        {/* Room view */}
        {activeView === 'room' && activeRoom && (
          <RoomView
            key={activeRoom.id}
            room={activeRoom}
            onBack={handleBack}
          />
        )}

        {/* DM view */}
        {activeView === 'dm' && activeConvo && (
          <DMView
            key={activeConvo.id}
            convo={activeConvo}
            onBack={handleBack}
          />
        )}
      </div>

      {/* ── USER SEARCH MODAL ─────────────────────────────── */}
      {showSearch && (
        <UserSearchModal
          onSelectConvo={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
