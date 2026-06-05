'use client';
// --- WHY THIS CODE EXISTS ---
// Bottom tab switcher for the Scroll Creator.
// Sits just above the bottom nav — renders 4 tabs: Text, Background, Icons, Music.
// Each tab shows its content panel below the tab nav buttons.
// Wires onAdd, onBackground, onMusic callbacks to the correct child components.
// --- WHAT THIS MADE WORK ---
// Tab switching between Text / Background / Icons / Music panels.
// currentBackground + currentMusic passed down for selected state.
// Auto-switches to Text tab when a text element is selected on the canvas.
// Passes selectedElement + onUpdateElement to ScrollCreatorText for live editing.
// --- PITFALLS ---
// This component must NOT manage canvas state itself — only passes callbacks down.
// Tab content has max-height + overflow-y: auto to stay within the fixed bottom panel.
// Auto-switch only goes TO text tab (on text element selection).
// Does NOT auto-switch away on deselect — user stays on current tab.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 tab switcher.
// [Jun 05 2026] ADDED: Edit-in-place support.
//   - selectedElement prop: currently selected canvas element (or null) from page.js.
//   - onUpdateElement prop: (id, patch) → calls canvasRef.current.updateElementById.
//   - useEffect auto-switches to 'text' tab when a text element is tapped on canvas.
//     Keyed on selectedElement?.id so it fires only on selection change, not data change.
//   - Both props forwarded to ScrollCreatorText.
// --- END CHANGE LOG ---

import { useState, useEffect } from 'react';
import { Type, Image, Sparkles, Music } from 'lucide-react';
import ScrollCreatorText       from './ScrollCreatorText';
import ScrollCreatorBackground from './ScrollCreatorBackground';
import ScrollCreatorIcons      from './ScrollCreatorIcons';
import ScrollCreatorMusic      from './ScrollCreatorMusic';

const TABS = [
  { id: 'text',       label: 'Text',       Icon: Type     },
  { id: 'background', label: 'Background', Icon: Image    },
  { id: 'icons',      label: 'Icons',      Icon: Sparkles },
  { id: 'music',      label: 'Music',      Icon: Music    },
];

export default function ScrollCreatorTabs({
  onAddElement,
  onBackground,
  onMusic,
  currentBackground,
  currentMusic,
  selectedElement,   // NEW Jun 05: currently selected canvas element (or null)
  onUpdateElement,   // NEW Jun 05: (id, patch) → update element on canvas live
}) {
  const [activeTab, setActiveTab] = useState('text');

  // ── AUTO-SWITCH TO TEXT TAB ON TEXT ELEMENT SELECTION ────
  // When user taps a text element on canvas, immediately jump to Text tab so
  // the edit form is visible without any extra tap.
  // Keyed on selectedElement?.id — only fires when selection CHANGES.
  // Does NOT auto-switch away when user deselects (stays on current tab).
  useEffect(function() {
    if (selectedElement && selectedElement.type === 'text') {
      setActiveTab('text');
    }
  }, [selectedElement?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="creator-tabs">

      {/* ── TAB NAV ── */}
      <div className="creator-tabs__nav">
        {TABS.map(function(tab) {
          var id    = tab.id;
          var label = tab.label;
          var Icon  = tab.Icon;
          return (
            <button
              key={id}
              className={'creator-tabs__nav-btn' + (activeTab === id ? ' creator-tabs__nav-btn--active' : '')}
              onClick={function() { setActiveTab(id); }}
              aria-label={label}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="creator-tabs__content">
        {activeTab === 'text' && (
          <ScrollCreatorText
            onAdd={onAddElement}
            selectedElement={selectedElement}
            onUpdate={onUpdateElement}
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
