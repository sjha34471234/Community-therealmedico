// --- WHY THIS CODE EXISTS ---
// Manages the auto-flag word list stored in community_flagged_words.
// GET  — returns the full list of flagged words (mod/admin only)
// POST — adds a new word to the list (mod/admin only)
// DELETE — removes a word from the list (mod/admin only)
//
// When any post or message body contains a flagged word,
// checkFlaggedWords() in modConfig.js auto-creates a report with
// moderation_source = 'auto' so it appears in the mod queue immediately.

// --- WHAT THIS MADE WORK ---
// FlaggedWords.jsx panel in ModSettings — add/remove words in real time

// --- PITFALLS ---
// ⚠️ WARNING: All three methods are mod/admin only — never expose to regular users
// ⚠️ WARNING: Words are stored lowercase — always .toLowerCase() before insert
// ⚠️ WARNING: Word matching uses word boundaries in modConfig.js — 'ass' won't flag 'class'
// ⚠️ WARNING: There is no pagination — keep this list short (under 200 words)
//             A very long list will slow down every single post and message write
// ⚠️ WARNING: DELETE uses the word string as the key, not the UUID row id

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MOD_ACTIONS, isModerator } from '@/lib/modConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// ─────────────────────────────────────────
// HELPER — extract and verify bearer token
// ─────────────────────────────────────────

async function getAuthedUser(request, supabase) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}


// ─────────────────────────────────────────
// HELPER — verify mod/admin and return profile
// Returns null if not authorised
// ─────────────────────────────────────────

async function getModProfile(request, supabase) {
  const user = await getAuthedUser(request, supabase);
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_mod, is_banned')
    .eq('id', user.id)
    .single();

  if (!isModerator(profile)) return null;
  return { user, profile };
}


// ─────────────────────────────────────────
// GET — Return full flagged words list
// No pagination — full list always returned
// ─────────────────────────────────────────

export async function GET(request) {
  const supabase = supabaseServer();

  const auth = await getModProfile(request, supabase);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: words, error } = await supabase
    .from('community_flagged_words')
    .select('id, word, created_at')
    .order('word', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load flagged words' }, { status: 500 });
  }

  return NextResponse.json(
    { words: words || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}


// ─────────────────────────────────────────
// POST — Add a new flagged word
// Body: { word: string }
// ─────────────────────────────────────────

export async function POST(request) {
  const supabase = supabaseServer();

  const auth = await getModProfile(request, supabase);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawWord = body.word;

  // Validate — must be a non-empty string
  if (!rawWord || typeof rawWord !== 'string') {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  // Clean — lowercase, strip spaces from both ends, remove non-alphanumeric except hyphen
  // ⚠️ WARNING: Only single words or hyphenated terms — no phrases with spaces
  const cleanWord = rawWord
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-]/g, '');

  if (!cleanWord || cleanWord.length < 2) {
    return NextResponse.json(
      { error: 'Word must be at least 2 characters and contain only letters, numbers, or hyphens' },
      { status: 400 }
    );
  }

  if (cleanWord.length > 50) {
    return NextResponse.json(
      { error: 'Word must be 50 characters or less' },
      { status: 400 }
    );
  }

  // Insert — UNIQUE constraint on word column handles duplicates
  const { data: inserted, error: insertError } = await supabase
    .from('community_flagged_words')
    .insert({
      word:       cleanWord,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (insertError) {
    // Unique constraint violation — word already exists
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: '"' + cleanWord + '" is already in the flagged words list' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
  }

  // Log to mod actions audit trail
  try {
    await supabase
      .from('community_mod_actions')
      .insert({
        mod_id:      auth.user.id,
        action_type: MOD_ACTIONS.ADD_WORD,
        note:        'Added flagged word: ' + cleanWord,
      });
  } catch {
    // Audit log failure should never block the main action
  }

  return NextResponse.json(
    { success: true, word: inserted },
    { status: 201 }
  );
}


// ─────────────────────────────────────────
// DELETE — Remove a flagged word
// Body: { word: string }
// Uses the word string as the key — not the UUID
// This makes it easier to call from the UI without storing IDs
// ─────────────────────────────────────────

export async function DELETE(request) {
  const supabase = supabaseServer();

  const auth = await getModProfile(request, supabase);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawWord = body.word;

  if (!rawWord || typeof rawWord !== 'string') {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  const cleanWord = rawWord.toLowerCase().trim();

  // Check it exists first — gives a clear error if already removed
  const { data: existing } = await supabase
    .from('community_flagged_words')
    .select('id, word')
    .eq('word', cleanWord)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: '"' + cleanWord + '" was not found in the flagged words list' },
      { status: 404 }
    );
  }

  const { error: deleteError } = await supabase
    .from('community_flagged_words')
    .delete()
    .eq('word', cleanWord);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove word' }, { status: 500 });
  }

  // Log to mod actions audit trail
  try {
    await supabase
      .from('community_mod_actions')
      .insert({
        mod_id:      auth.user.id,
        action_type: MOD_ACTIONS.DELETE_WORD,
        note:        'Removed flagged word: ' + cleanWord,
      });
  } catch {
    // Audit log failure should never block the main action
  }

  return NextResponse.json({ success: true, removed: cleanWord });
}
