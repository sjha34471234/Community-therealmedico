// ============================================================
// FILE: tailwind.config.js
// PURPOSE: Tailwind CSS configuration with community colour tokens
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Extends Tailwind with The Real Medico Community
//               colour palette so components can use class names
//               like bg-accent-primary instead of raw hex values
// DEPENDENCIES: postcss.config.js must exist for Tailwind to work
// ⚠️ DO NOT CHANGE: colour names must match CSS variables in
//                   globals.css exactly — they are the same system
// ============================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],

  theme: {
    extend: {

      colors: {
        // Backgrounds
        'bg-primary':    '#FFFFFF',
        'bg-secondary':  '#F7F8FA',
        'bg-tertiary':   '#EFF1F3',

        // Text
        'text-primary':   '#1A1D23',
        'text-secondary': '#5B6474',
        'text-muted':     '#9AA0AE',

        // Accent — medical blue
        'accent-primary': '#1D6FA4',
        'accent-hover':   '#155A87',
        'accent-light':   '#EBF4FB',

        // Status
        'success': '#2E7D32',
        'warning': '#B45309',
        'danger':  '#C62828',

        // Real Medico+ member cosmetics
        'member-gold':   '#B8860B',
        'member-border': '#D4AF37',
        'member-bg':     '#FFFBEB',
      },

      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },

      maxWidth: {
        'content': '768px',
        'sidebar': '280px',
      },

    },
  },

  plugins: [],
};

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Tailwind needs content paths + colour tokens for community design system
// --- END CHANGE LOG ---
