// --- WHY THIS CODE EXISTS ---
// UI panel for managing the auto-flag word list.
// Mods can see all current flagged words, add new ones, and remove existing ones.
// Any post or message containing a flagged word automatically creates a report
// in the mod queue with moderation_source = 'auto'.

// --- WHAT THIS MADE WORK ---
// Flagged words panel inside ModSettings
// Add word form + live word list with remove buttons

// --- PITFALLS ---
// ⚠️ WARNING: Only mods and admin can see this panel — parent must gate it
// ⚠️ WARNING: Words are stored lowercase — display them as-is from API
// ⚠️ WARNING: Keep this list short — every post write checks against it
// ⚠️ WARNING: Uses accessToken from authStore — never session
// ⚠️ WARNING: DELETE sends body as JSON — some fetch implementations drop
//             body on DELETE. Our API route uses request.json() which handles this.

// --- CHANGE LOG ---
// [May 2026] CREATED: Phase 13 moderation system
// --- END CHANGE LOG ---

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function FlaggedWords() {
  const { accessToken } = useAuthStore();

  const [words, setWords]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [newWord, setNewWord]   = useState('');
  const [adding, setAdding]     = useState(false);
  const [removing, setRemoving] = useState(null); // stores word being removed

  // ── Fetch words ──
  const fetchWords = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mod/words', {
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + accessToken },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load flagged words');
        return;
      }

      setWords(data.words || []);

    } catch {
      setError('Something went wrong loading flagged words.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // ── Add word ──
  async function handleAdd() {
    const trimmed = newWord.trim();
    if (!trimmed) {
      toast.error('Please enter a word');
      return;
    }

    setAdding(true);

    try {
      const res = await fetch('/api/mod/words', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ word: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to add word');
        return;
      }

      // Add to local list immediately — no need to refetch
      setWords(prev => {
        const updated = [...prev, data.word];
        return updated.sort((a, b) => a.word.localeCompare(b.word));
      });
      setNewWord('');
      toast.success('"' + data.word.word + '" added to flagged words');

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  // Allow adding with Enter key
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !adding) {
      handleAdd();
    }
  }

  // ── Remove word ──
  async function handleRemove(word) {
    setRemoving(word);

    try {
      const res = await fetch('/api/mod/words', {
        method:      'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ word }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to remove word');
        return;
      }

      setWords(prev => prev.filter(w => w.word !== word));
      toast.success('"' + word + '" removed from flagged words');

    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--warning)" />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize:   '16px',
            color:      'var(--text-primary)',
          }}>
            Flagged Words
          </span>
          {words.length > 0 && (
            <span style={{
              background:   'var(--bg-secondary)',
              color:        'var(--text-secondary)',
              borderRadius: '20px',
              padding:      '1px 8px',
              fontFamily:   'Inter, sans-serif',
              fontWeight:   700,
              fontSize:     '12px',
            }}>
              {words.length}
            </span>
          )}
        </div>

        <button
          onClick={fetchWords}
          disabled={loading}
          title="Refresh list"
          style={{
            background:   'none',
            border:       '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
            padding:      '6px 10px',
            cursor:       loading ? 'not-allowed' : 'pointer',
            color:        'var(--text-muted)',
            display:      'flex',
            alignItems:   'center',
            gap:          '5px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '13px',
          }}
        >
          <RefreshCw
            size={13}
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          />
          Refresh
        </button>
      </div>

      {/* ── Description ── */}
      <div style={{
        background:   '#FFFBEB',
        border:       '1px solid #FDE68A',
        borderRadius: '8px',
        padding:      '10px 14px',
        marginBottom: '16px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '8px',
      }}>
        <AlertTriangle size={14} color="var(--warning)" style={{ marginTop: '1px', flexShrink: 0 }} />
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '13px',
          color:      'var(--warning)',
          margin:     0,
          lineHeight: 1.5,
        }}>
          Any post, answer, reply, or chat message containing these words will automatically appear in the mod queue. Word matching ignores case and uses whole-word boundaries — adding "ass" will not flag "class".
        </p>
      </div>

      {/* ── Add word form ── */}
      <div style={{
        display:      'flex',
        gap:          '8px',
        marginBottom: '20px',
        flexWrap:     'wrap',
      }}>
        <input
          type="text"
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={50}
          placeholder="Type a word to flag…"
          style={{
            flex:         1,
            minWidth:     '180px',
            background:   'var(--bg-secondary)',
            border:       '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
            padding:      '9px 12px',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '14px',
            color:        'var(--text-primary)',
            outline:      'none',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newWord.trim()}
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          '5px',
            background:   adding || !newWord.trim() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
            color:        adding || !newWord.trim() ? 'var(--text-muted)' : '#fff',
            border:       'none',
            borderRadius: '8px',
            padding:      '9px 18px',
            fontFamily:   'Inter, sans-serif',
            fontWeight:   600,
            fontSize:     '14px',
            cursor:       adding || !newWord.trim() ? 'not-allowed' : 'pointer',
            transition:   'background 0.15s',
            whiteSpace:   'nowrap',
          }}
        >
          <Plus size={15} />
          {adding ? 'Adding…' : 'Add Word'}
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          padding:    '32px 0',
          textAlign:  'center',
          fontFamily: 'Inter, sans-serif',
          fontSize:   '14px',
          color:      'var(--text-muted)',
        }}>
          Loading flagged words…
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{
          padding:      '14px',
          background:   '#FEF2F2',
          borderRadius: '8px',
          fontFamily:   'Inter, sans-serif',
          fontSize:     '14px',
          color:        'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && words.length === 0 && (
        <div style={{
          padding:      '32px 0',
          textAlign:    'center',
        }}>
          <AlertTriangle size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize:   '14px',
            color:      'var(--text-primary)',
            margin:     '0 0 4px',
          }}>
            No flagged words yet
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '13px',
            color:      'var(--text-muted)',
            margin:     0,
          }}>
            Add words above to automatically flag content for review.
          </p>
        </div>
      )}

      {/* ── Word list ── */}
      {!loading && !error && words.length > 0 && (
        <div style={{
          display:   'flex',
          flexWrap:  'wrap',
          gap:       '8px',
        }}>
          {words.map(row => (
            <div
              key={row.id}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '6px',
                background:   '#FFF7ED',
                border:       '1px solid #FDE68A',
                borderRadius: '20px',
                padding:      '5px 10px 5px 14px',
                fontFamily:   'Inter, sans-serif',
                fontWeight:   600,
                fontSize:     '13px',
                color:        'var(--warning)',
              }}
            >
              {row.word}
              <button
                onClick={() => handleRemove(row.word)}
                disabled={removing === row.word}
                title={'Remove "' + row.word + '"'}
                style={{
                  background:   'none',
                  border:       'none',
                  cursor:       removing === row.word ? 'not-allowed' : 'pointer',
                  padding:      '1px',
                  display:      'flex',
                  alignItems:   'center',
                  color:        removing === row.word ? 'var(--text-muted)' : 'var(--warning)',
                  opacity:      removing === row.word ? 0.5 : 1,
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Word count warning ── */}
      {words.length >= 100 && (
        <p style={{
          fontFamily:  'Inter, sans-serif',
          fontSize:    '12px',
          color:       'var(--warning)',
          marginTop:   '12px',
          display:     'flex',
          alignItems:  'center',
          gap:         '5px',
        }}>
          <AlertTriangle size={12} />
          You have {words.length} flagged words. A very long list slows down every post write. Consider keeping it under 100.
        </p>
      )}

      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
