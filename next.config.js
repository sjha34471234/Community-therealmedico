// ============================================================
// FILE: next.config.js
// PURPOSE: Next.js build configuration for community site
// LAST CHANGED: May 14, 2026
// WHY IT EXISTS: Required by Next.js to configure image domains,
//               headers, and build behaviour
// DEPENDENCIES: None
// ⚠️ DO NOT CHANGE: never upgrade next to v15, never remove
//                   the images config or builds will fail
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
// --- END CHANGE LOG ---
