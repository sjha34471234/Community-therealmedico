'use client';

// --- WHY THIS CODE EXISTS ---
// Animated icons tab for the Scroll Creator.
// All icons are pure CSS-animated SVGs — no Lottie, no external libraries.
// Each icon is self-contained with its own <style> @keyframes block.
// Tapping an icon calls onAdd(element) which adds it to the canvas.
// --- WHAT THIS MADE WORK ---
// 8 medical animated icons: heartbeat pulse, DNA helix, spinning pill,
// brain wave, blood drop pulse, stethoscope swing, syringe fill, microscope scan.
// Each renders as a live preview in the tab grid before adding to canvas.
// --- PITFALLS ---
// dangerouslySetInnerHTML is used in ScrollCreatorCanvas IconElementContent
// to render the stored SVG string — this is safe since SVGs are hardcoded here,
// never from user input.
// Each SVG must be self-contained with unique animation class names to avoid
// conflicts when multiple icons are on the same canvas.
// --- CHANGE LOG ---
// [May 26 2026] CREATED: Phase 15B-1 animated icons tab.
// --- END CHANGE LOG ---

const ICONS = [
  {
    id: 'heartbeat',
    label: 'Heartbeat',
    defaultW: 180,
    defaultH: 80,
    svg: `<svg viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .hb-line { stroke-dasharray: 300; stroke-dashoffset: 300; animation: hbDraw 1.8s ease-in-out infinite; }
    @keyframes hbDraw { 0%{stroke-dashoffset:300;opacity:1} 70%{stroke-dashoffset:0;opacity:1} 100%{stroke-dashoffset:0;opacity:0} }
  </style>
  <polyline class="hb-line" points="0,40 30,40 45,10 60,70 75,40 90,40 100,20 110,60 120,40 180,40" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  },
  {
    id: 'dna',
    label: 'DNA Helix',
    defaultW: 80,
    defaultH: 140,
    svg: `<svg viewBox="0 0 80 140" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .dna-wrap { animation: dnaRot 3s linear infinite; transform-origin: 40px 70px; }
    @keyframes dnaRot { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
    .dna-rung { animation: dnaFade 3s linear infinite; }
    @keyframes dnaFade { 0%,100%{opacity:0.2} 50%{opacity:1} }
  </style>
  <g class="dna-wrap">
    <path d="M20,10 Q60,35 20,70 Q60,105 20,130" fill="none" stroke="#1D6FA4" stroke-width="3" stroke-linecap="round"/>
    <path d="M60,10 Q20,35 60,70 Q20,105 60,130" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    <line class="dna-rung" x1="20" y1="25" x2="60" y2="25" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <line class="dna-rung" x1="38" y1="45" x2="42" y2="45" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <line class="dna-rung" x1="20" y1="70" x2="60" y2="70" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <line class="dna-rung" x1="38" y1="95" x2="42" y2="95" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <line class="dna-rung" x1="20" y1="115" x2="60" y2="115" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
  </g>
</svg>`,
  },
  {
    id: 'pill',
    label: 'Pill Spin',
    defaultW: 100,
    defaultH: 100,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .pill-spin { animation: pillRot 2s linear infinite; transform-origin: 50px 50px; }
    @keyframes pillRot { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  </style>
  <g class="pill-spin">
    <rect x="28" y="15" width="44" height="70" rx="22" ry="22" fill="none" stroke="#a78bfa" stroke-width="3"/>
    <line x1="28" y1="50" x2="72" y2="50" stroke="#a78bfa" stroke-width="3"/>
    <rect x="28" y="15" width="44" height="35" rx="22" ry="22" fill="#a78bfa" opacity="0.3"/>
  </g>
</svg>`,
  },
  {
    id: 'brainwave',
    label: 'Brain Wave',
    defaultW: 180,
    defaultH: 80,
    svg: `<svg viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .bw-path { stroke-dasharray: 400; animation: bwScroll 2.5s linear infinite; }
    @keyframes bwScroll { from{stroke-dashoffset:400} to{stroke-dashoffset:0} }
  </style>
  <path class="bw-path" d="M0,40 Q15,40 20,30 Q25,20 30,40 Q35,60 40,40 Q50,10 60,40 Q65,55 70,40 Q80,15 90,40 Q95,52 100,40 Q110,20 120,40 Q125,50 130,40 Q140,25 150,40 Q155,48 160,40 Q165,35 180,40" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
  },
  {
    id: 'blooddrop',
    label: 'Blood Drop',
    defaultW: 80,
    defaultH: 110,
    svg: `<svg viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .bd-drop { animation: bdPulse 1.5s ease-in-out infinite; transform-origin: 40px 70px; }
    @keyframes bdPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    .bd-shine { animation: bdShine 1.5s ease-in-out infinite; }
    @keyframes bdShine { 0%,100%{opacity:0.6} 50%{opacity:1} }
  </style>
  <g class="bd-drop">
    <path d="M40,10 Q70,45 70,65 A30,30 0 0,1 10,65 Q10,45 40,10 Z" fill="#ef4444" opacity="0.85"/>
    <ellipse class="bd-shine" cx="30" cy="50" rx="6" ry="10" fill="rgba(255,255,255,0.3)" transform="rotate(-20,30,50)"/>
  </g>
</svg>`,
  },
  {
    id: 'stethoscope',
    label: 'Stethoscope',
    defaultW: 110,
    defaultH: 110,
    svg: `<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .sth-swing { animation: sthSwing 2s ease-in-out infinite; transform-origin: 55px 20px; }
    @keyframes sthSwing { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
  </style>
  <g class="sth-swing">
    <path d="M30,15 Q30,50 55,60 Q80,50 80,15" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
    <circle cx="55" cy="72" r="14" fill="none" stroke="#94a3b8" stroke-width="4"/>
    <circle cx="55" cy="72" r="6" fill="#1D6FA4"/>
    <circle cx="26" cy="15" r="5" fill="#94a3b8"/>
    <circle cx="84" cy="15" r="5" fill="#94a3b8"/>
  </g>
</svg>`,
  },
  {
    id: 'syringe',
    label: 'Syringe',
    defaultW: 160,
    defaultH: 60,
    svg: `<svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .syr-fill { animation: syrFill 2s ease-in-out infinite; }
    @keyframes syrFill { 0%{width:0} 60%{width:60px} 100%{width:60px} }
    .syr-drop { animation: syrDrop 2s ease-in-out infinite; opacity:0; }
    @keyframes syrDrop { 0%,59%{opacity:0;transform:translateY(0)} 70%{opacity:1;transform:translateY(8px)} 100%{opacity:0;transform:translateY(16px)} }
  </style>
  <rect x="30" y="20" width="90" height="20" rx="4" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
  <rect x="30" y="22" width="0" height="16" rx="3" fill="#1D6FA4" opacity="0.7">
    <animate attributeName="width" values="0;60;60;0" dur="2s" repeatCount="indefinite"/>
  </rect>
  <line x1="120" y1="30" x2="150" y2="30" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="148" y1="30" x2="160" y2="30" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="22" y="16" width="10" height="28" rx="2" fill="#475569"/>
  <line x1="55" y1="20" x2="55" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  <line x1="75" y1="20" x2="75" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  <line x1="95" y1="20" x2="95" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  <circle class="syr-drop" cx="156" cy="38" r="3" fill="#38bdf8"/>
</svg>`,
  },
  {
    id: 'microscope',
    label: 'Microscope',
    defaultW: 100,
    defaultH: 120,
    svg: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <style>
    .mic-scan { animation: micScan 2s ease-in-out infinite; }
    @keyframes micScan { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(12px);opacity:1} }
    .mic-glow { animation: micGlow 2s ease-in-out infinite; }
    @keyframes micGlow { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
  </style>
  <rect x="42" y="10" width="16" height="35" rx="4" fill="none" stroke="#94a3b8" stroke-width="2.5"/>
  <rect x="38" y="42" width="24" height="12" rx="3" fill="#475569"/>
  <line x1="50" y1="54" x2="50" y2="72" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
  <line x1="50" y1="72" x2="35" y2="90" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="35" y1="90" x2="65" y2="90" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="90" rx="20" ry="4" fill="#1D6FA4" opacity="0.2"/>
  <ellipse class="mic-glow" cx="50" cy="90" rx="12" ry="2.5" fill="#1D6FA4"/>
  <line class="mic-scan" x1="30" y1="80" x2="70" y2="80" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <circle cx="50" cy="18" r="5" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
</svg>`,
  },
];

export default function ScrollCreatorIcons({ onAdd }) {
  const handleAdd = (icon) => {
    onAdd({
      type: 'icon',
      svg: icon.svg,
      w: icon.defaultW,
      h: icon.defaultH,
      x: Math.round((390 - icon.defaultW) / 2),
      y: Math.round((680 - icon.defaultH) / 2),
      opacity: 1,
      iconId: icon.id,
    });
  };

  return (
    <div>
      <div className="creator-bg-section-label" style={{ marginBottom: 8 }}>
        Tap an icon to add it to your canvas
      </div>
      <div className="creator-icons-grid">
        {ICONS.map((icon) => (
          <div
            key={icon.id}
            className="creator-icon-item"
            onClick={() => handleAdd(icon)}
          >
            <div className="creator-icon-item__preview">
              <div
                style={{ width: 40, height: 40 }}
                dangerouslySetInnerHTML={{ __html: icon.svg }}
              />
            </div>
            <span className="creator-icon-item__label">{icon.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
