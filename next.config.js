// ============================================================
// FILE: next.config.js
// PURPOSE: Next.js build configuration for community site
// LAST CHANGED: May 23, 2026
// WHY IT EXISTS: Required by Next.js to configure image domains,
//               headers, and build behaviour
// DEPENDENCIES: None
// ⚠️ DO NOT CHANGE: never upgrade next to v15, never remove
//                   the images config or builds will fail
//                   Do NOT add generateBuildId back — it was a
//                   temporary cache-busting hack that is no longer needed
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows next/image to load images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Security headers on every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

// --- CHANGE LOG ---
// [May 14, 2026] CREATED: Initial build
// REASON: Required config file for Next.js 14 project
// [May 23, 2026] REMOVED: generateBuildId hack
// REASON: Was added as a temporary workaround to force cache busting during
//         early development. No longer needed — Vercel handles build IDs correctly.
//         Keeping it caused a new unique build ID on every deploy unnecessarily.
// --- END CHANGE LOG ---
