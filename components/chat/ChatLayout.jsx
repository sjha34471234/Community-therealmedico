// --- WHY THIS CODE EXISTS ---
// Master layout component for the /chat page.
// Renders the two-column layout: left sidebar (rooms + DMs) + right panel (active view).
// Sidebar has a tab switcher — "Rooms" tab and "Messages" tab.
// --- PITFALLS ---
// ⚠️ activeView can be 'room', 'dm', or null
// ⚠️ On mobile, showSidebar controls which panel is visible
// ⚠️ UserSearchModal must be unmounted when closed — not just hidden
// ⚠️ Never render RoomView and DMView at the same time
// ⚠️ All anchor tags single line — iPad clipboard rule
// ⚠️ Use user from authStore — never session
// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — master layout
// [May 23, 2026] FIXED: session → user + accessToken
// [May 23, 2026] UPDATED: Sidebar tab switcher — Rooms vs Messages tabs
// --- END CHANGE LOG ---

'use client';

import { useState, useCallback, useEffect } from 'react';
import RoomList from './RoomList';
import DMList from './DMList';
import RoomView from './RoomView';
import DMView from './DMView';
import UserSearchModal from './UserSearchModal';
import useAuthStore from '@/store/authStore';

const MOBILE_BREAKPOINT = 720;

export default function ChatLayout() {
  const { user } = useAuthStore();
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Tab switcher — 'rooms' or 'dms'
  const [sidebarTab, setSidebarTab] = useState('rooms');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelectRoom = useCallback((room) => {
    setActiveRoom(room);
    setActiveConvo(null);
    setActiveView('room');
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  const handleSelectConvo = useCallback((convo) => {
    setActiveConvo(convo);
    setActiveRoom(null);
    setActiveView('dm');
    // Switch to DMs tab when a convo is opened
    setSidebarTab('dms');
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const handleNewDM = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleSearchSelect = useCallback((convo) => {
    setShowSearch(false);
    handleSelectConvo(convo);
  }, [handleSelectConvo]);

  // Auto-open a conversation passed from profile Message button
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('chat_open_convo');
      if (stored) {
        const convo = JSON.parse(stored);
        sessionStorage.removeItem('chat_open_convo');
        if (convo?.id) handleSelectConvo(convo);
      }
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, []);

  // Tab button style helper
  function tabStyle(isActive) {
    return {
      flex: 1,
      padding: '8px 0',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
      backgroundColor: 'transparent',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
      fontSize: '13px',
      fontWeight: isActive ? 700 : 500,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      transition: 'color 0.15s, border-color 0.15s',
    };
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-primary)', overflow: 'hidden', position: 'relative' }}>

      {/* LEFT SIDEBAR */}
      <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--bg-secondary)', display: isMobile ? (showSidebar ? 'flex' : 'none') : 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>

        {/* Sidebar header */}
        <div style={{ padding: '14px 16px 0', borderBottom: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: '10px' }}>Chat</div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0' }}>
            <button style={tabStyle(sidebarTab === 'rooms')} onClick={() => setSidebarTab('rooms')}>
              Chat Rooms
            </button>
            <button style={tabStyle(sidebarTab === 'dms')} onClick={() => setSidebarTab('dms')}>
              Messages
            </button>
          </div>
        </div>

        {/* Scrollable content — only active tab visible */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {/* Rooms tab */}
          <div style={{ display: sidebarTab === 'rooms' ? 'block' : 'none' }}>
            <RoomList
              activeRoomId={activeRoom?.id}
              onSelectRoom={handleSelectRoom}
            />
          </div>

          {/* DMs tab */}
          <div style={{ display: sidebarTab === 'dms' ? 'block' : 'none', height: '100%' }}>
            <DMList
              activeConvoId={activeConvo?.id}
              onSelectConvo={handleSelectConvo}
              onNewDM={handleNewDM}
            />
          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: isMobile ? (showSidebar ? 'none' : 'flex') : 'flex', flexDirection: 'column', height: '100%', minWidth: 0, backgroundColor: 'var(--bg-primary)' }}>

        {activeView === null && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Welcome to The Real Medico Chat</div>
            <div style={{ fontSize: '13px', maxWidth: '300px', lineHeight: 1.6 }}>Pick a room to join a discussion, or start a direct message with someone.</div>
            {!user && (
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <a href="/auth" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
                {' '}to send messages
              </div>
            )}
          </div>
        )}

        {activeView === 'room' && activeRoom && (
          <RoomView key={activeRoom.id} room={activeRoom} onBack={handleBack} />
        )}

        {activeView === 'dm' && activeConvo && (
          <DMView key={activeConvo.id} convo={activeConvo} onBack={handleBack} />
        )}
      </div>

      {showSearch && (
        <UserSearchModal onSelectConvo={handleSearchSelect} onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
}
