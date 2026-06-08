// --- WHY THIS CODE EXISTS ---
// Receives a navigator.sendBeacon() POST from the creator when they navigate away.
// sendBeacon cannot send auth headers — stream_key acts as the secret instead.
// This is the ONLY reliable way to end a broadcast when the creator's tab closes or
// they navigate away without tapping End Stream.
// Called from LiveCreator.jsx pagehide event listener.

// --- WHAT THIS MADE WORK ---
// Phase 18A: broadcast status set to 'ended' in DB when creator navigates away
// Viewers polling /api/live see status=ended and show ended screen

// --- PITFALLS ---
// ⚠️ WARNING: No auth header — stream_key is the only secret. Always verify BOTH
//             broadcast_id AND stream_key together. One alone is not enough.
// ⚠️ WARNING: Must return 200 quickly — sendBeacon does not wait for response
// ⚠️ WARNING: sendBeacon sends Content-Type: text/plain — must read as text then parse
// ⚠️ WARNING: Do not throw — return 200 even on error to avoid beacon retries

// --- CHANGE LOG ---
// [Jun 08, 2026] CREATED: Phase 18A — pagehide beacon endpoint for creator stream end
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  const supabase = supabaseServer();

  let body = {};
  try {
    // sendBeacon sends text/plain — must read as text first
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { broadcast_id, stream_key } = body;

  if (broadcast_id && stream_key) {
    // Verify both broadcast_id AND stream_key — stream_key is the secret
    await supabase
      .from('live_broadcasts')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', broadcast_id)
      .eq('stream_key', stream_key)
      .eq('status', 'live');
  }

  // Always 200 — sendBeacon does not retry on success
  return NextResponse.json({ ok: true }, { status: 200 });
}
