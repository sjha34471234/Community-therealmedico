// --- WHY THIS CODE EXISTS ---
// Viewer page for a live broadcast.
// Renders LivePlayer with the broadcastId from the URL.
// URL is /live/[broadcastId] — the UUID returned from POST /api/live.

// --- WHAT THIS MADE WORK ---
// Phase 18A: /live/[broadcastId] viewer route

// --- PITFALLS ---
// ⚠️ WARNING: params is { streamId: string } NOT a Promise — Next.js 14 App Router (not 15)
// ⚠️ WARNING: 'use client' required — LivePlayer uses Supabase Realtime + RTCPeerConnection
// ⚠️ WARNING: streamId in the URL IS the broadcast UUID from POST /api/live response

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — LiveMesh viewer page
// --- END CHANGE LOG ---

'use client';

import LivePlayer from '@/components/live/LivePlayer';
import '@/app/live/live.css';

export default function LiveViewerPage({ params }) {
  const { streamId } = params;
  return <LivePlayer broadcastId={streamId} />;
}
