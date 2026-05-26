'use client';

// --- WHY THIS CODE EXISTS ---
// Bottom tab switcher for the Scroll Creator.
// Sits just above the bottom nav — renders 4 tabs: Text, Background, Icons, Music.
// Each tab shows its content panel below the tab nav buttons.
// Wires onAdd, onBackground, onMusic callbacks to the correct child components.
// --- WHAT THIS MADE WORK ---
// Tab switching between Text / Background / Icons / Music panels,
// passing canvasMusic (selected track) down to ScrollCreatorMusic,
// passing currentBackground down to ScrollCreatorBackground for selected state.
// --- PITFALLS ---
// This component must NOT manage canvas state itself — it only passes
// callbacks down. All state lives in ScrollCreatorCanvas (via canvasRef).
// Tab content has max-height + overflow-y: auto to stay within the
// fixed bottom panel — never expands to push the canvas up.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 tab switcher.
// --- END CHANGE LOG ---

import { useState } from 'react';
import { Type, Image, Sparkles, Music } from 'lucide-react';
import ScrollCreatorText from './ScrollCreatorText';
import ScrollCreatorBackground from './ScrollCreatorBackground';
import ScrollCreatorIcons from './ScrollCreatorIcons';
import ScrollCreatorMusic from './ScrollCreatorMusic';

const TABS = [
  { id: 'text',       label: 'Text',       Icon: Type },
  { id: 'background', label: 'Background', Icon: Image },
  { id: 'icons',      label: 'Icons',      Icon: Sparkles },
  { id: 'music',      label: 'Music',      Icon: Music },
];

export default function ScrollCreatorTabs({
  onAddElement,
  onBackground,
  onMusic,
  currentBackground,
  currentMusic,
}) {
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="creator-tabs">

      {/* ── TAB NAV ── */}
      <div className="creator-tabs__nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`creator-tabs__nav-btn${activeTab === id ? ' creator-tabs__nav-btn--active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-label={label}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="creator-tabs__content">

        {activeTab === 'text' && (
          <ScrollCreatorText
            onAdd={onAddElement}
          />
        )}

        {activeTab === 'background' && (
          <ScrollCreatorBackground
            current={currentBackground}
            onSelect={onBackground}
          />
        )}

        {activeTab === 'icons' && (
          <ScrollCreatorIcons
            onAdd={onAddElement}
          />
        )}

        {activeTab === 'music' && (
          <ScrollCreatorMusic
            selected={currentMusic}
            onSelect={onMusic}
          />
        )}

      </div>
    </div>
  );
}
