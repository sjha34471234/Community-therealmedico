// ============================================================
// FILE: postcss.config.js
// PURPOSE: Tells PostCSS to run Tailwind CSS and Autoprefixer
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Without this file Tailwind classes do not work —
//               Next.js uses PostCSS to process all CSS files
// DEPENDENCIES: tailwind.config.js must exist
// ⚠️ DO NOT CHANGE: this file must stay exactly as-is
// ============================================================

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Required glue file between Next.js and Tailwind CSS
// --- END CHANGE LOG ---
