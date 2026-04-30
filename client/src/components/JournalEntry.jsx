/**
 * JournalEntry.jsx — Renders a single combined journal entry in the timeline.
 *
 * A combined entry shows:
 *   • Photo thumbnail
 *   • outputXXX (Gemini photo analysis)
 *   • outputYYY (Gemini audio summary), if present
 *   • outputZZZ (Combined narrative), if present
 *   • processedAt timestamp
 *   • Delete action
 *
 * Props:
 *   entry        — combinedResult or photoResult document from Firestore
 *   onDelete     — callback(docId) to remove the entry
 */

import React, { useState } from 'react';
import { updateNarrative } from '../services/api.js';
import { extractMemoryTitle, extractMood, extractLocation } from '../utils/parseGeminiOutput.js';

export default function JournalEntry({ entry, onDelete, onNarrativeUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState(entry.outputZZZ || '');
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [narrativeError, setNarrativeError] = useState('');

  const mood = extractMood(entry.outputXXX);
  const location = extractLocation(entry.outputXXX);

  const date = entry.processedAt
    ? new Date(entry.processedAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  async function handleDelete() {
    if (!window.confirm('Delete this journal entry?')) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } catch (err) {
      console.error('[JournalEntry] delete failed:', err.message);
      setDeleting(false);
    }
  }

  async function handleNarrativeSave() {
    if (!narrativeDraft.trim()) return;
    setSavingNarrative(true);
    setNarrativeError('');
    try {
      await updateNarrative(entry.id, narrativeDraft.trim());
      setEditingNarrative(false);
      if (onNarrativeUpdate) onNarrativeUpdate(entry.id, narrativeDraft.trim());
    } catch (err) {
      setNarrativeError(err.message || 'Save failed.');
    } finally {
      setSavingNarrative(false);
    }
  }

  function handleNarrativeCancel() {
    setNarrativeDraft(entry.outputZZZ || '');
    setEditingNarrative(false);
    setNarrativeError('');
  }

  return (
    <article style={styles.card} className="fade-in">
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div style={styles.header}>
        {/* Photo thumbnail */}
        {entry.photoUrl && (
          <img
            src={
              // Drive proxy and upload paths must not have Google Photos size params appended
              entry.photoUrl.startsWith('/api/') || entry.photoUrl.startsWith('data:')
                ? entry.photoUrl
                : `${entry.photoUrl}=w120-h90`
            }
            alt="Memory photo"
            style={styles.thumbnail}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <div style={styles.headerMeta}>
          {/* Memory title extracted from XXX if available */}
          <h3 style={styles.title}>
            {extractMemoryTitle(entry.outputXXX) || 'Memory Entry'}
          </h3>
          <p style={styles.dateText}>{date}</p>

          {/* Badges */}
          <div style={styles.badges}>
            {entry.outputXXX && <span style={{ ...styles.badge, ...styles.badgeBlue }}>📷 Photo</span>}
            {entry.outputYYY && <span style={{ ...styles.badge, ...styles.badgeGreen }}>🎙️ Voice</span>}
            {entry.outputZZZ && <span style={{ ...styles.badge, ...styles.badgePurple }}>✨ Narrative</span>}
            {mood     && <span style={{ ...styles.badge, ...styles.badgeMood }}>{mood}</span>}
            {location && <span style={{ ...styles.badge, ...styles.badgeLocation }}>📍 {location}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.headerActions}>
          <button
            style={styles.expandBtn}
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            style={styles.deleteBtn}
            onClick={handleDelete}
            disabled={deleting}
            title="Delete entry"
          >
            {deleting ? '…' : '🗑'}
          </button>
        </div>
      </div>

      {/* ── Expandable body ─────────────────────────────────────────── */}
      {expanded && (
        <div style={styles.body}>
          {/* XXX — Photo Analysis */}
          {entry.outputXXX && (
            <section style={styles.section}>
              <h4 style={styles.sectionTitle}>📷 Photo Analysis (XXX)</h4>
              <pre style={styles.outputText}>{entry.outputXXX}</pre>
            </section>
          )}

          {/* YYY — Audio Summary */}
          {entry.outputYYY && (
            <section style={styles.section}>
              <h4 style={styles.sectionTitle}>🎙️ Voice Memo (YYY)</h4>
              <pre style={styles.outputText}>{entry.outputYYY}</pre>
              {entry.audioUrl && (
                <audio controls src={entry.audioUrl} style={{ marginTop: '8px', width: '100%' }} />
              )}
            </section>
          )}

          {/* ZZZ — Combined Narrative (editable) */}
          {(entry.outputZZZ || entry._type === 'combined') && (
            <section style={{ ...styles.section, ...styles.narrativeSection }}>
              <div style={styles.narrativeHeader}>
                <h4 style={styles.sectionTitle}>✨ Memory Narrative</h4>
                {!editingNarrative ? (
                  <button
                    style={styles.editBtn}
                    onClick={() => { setNarrativeDraft(entry.outputZZZ || ''); setEditingNarrative(true); }}
                    title="Edit narrative"
                  >
                    Edit
                  </button>
                ) : (
                  <div style={styles.editActions}>
                    <button
                      style={{ ...styles.editBtn, ...styles.editBtnSave }}
                      onClick={handleNarrativeSave}
                      disabled={savingNarrative}
                    >
                      {savingNarrative ? 'Saving…' : 'Save'}
                    </button>
                    <button style={styles.editBtn} onClick={handleNarrativeCancel}>Cancel</button>
                  </div>
                )}
              </div>

              {editingNarrative ? (
                <>
                  <textarea
                    value={narrativeDraft}
                    onChange={(e) => setNarrativeDraft(e.target.value)}
                    style={styles.narrativeTextarea}
                    rows={6}
                    autoFocus
                  />
                  {narrativeError && <p style={styles.narrativeErr}>{narrativeError}</p>}
                </>
              ) : (
                <p style={styles.narrativeText}>{entry.outputZZZ}</p>
              )}
            </section>
          )}
        </div>
      )}
    </article>
  );
}


// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '14px 16px',
  },
  thumbnail: {
    width: '72px',
    height: '54px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-xs)',
    flexShrink: 0,
    border: '1px solid var(--color-border)',
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.02em',
  },
  dateText: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '-0.01em',
  },
  badges: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    marginTop: '5px',
  },
  badge: {
    fontSize: '0.625rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  badgeBlue: {
    backgroundColor: 'rgba(109,99,255,0.1)',
    color: 'var(--color-primary)',
  },
  badgeGreen: {
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
  },
  badgePurple: {
    backgroundColor: 'rgba(109,40,217,0.08)',
    color: '#7c3aed',
  },
  badgeMood: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    color: '#92400e',
  },
  badgeLocation: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    color: '#065f46',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  expandBtn: {
    width: '30px',
    height: '30px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '0.6875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    width: '30px',
    height: '30px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-text-faint)',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  body: {
    borderTop: '1px solid var(--color-border)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  outputText: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '0.8125rem',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '280px',
    overflowY: 'auto',
    lineHeight: 1.7,
  },
  narrativeSection: {
    backgroundColor: 'rgba(109,99,255,0.04)',
    border: '1px solid rgba(109,99,255,0.12)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
  },
  narrativeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  narrativeText: {
    fontSize: '0.9rem',
    lineHeight: 1.85,
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
  },
  narrativeTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(109,99,255,0.3)',
    backgroundColor: 'var(--color-surface)',
    fontSize: '0.875rem',
    lineHeight: 1.75,
    color: 'var(--color-text)',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  narrativeErr: {
    fontSize: '0.75rem',
    color: 'var(--color-error)',
    marginTop: '4px',
  },
  editBtn: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  editBtnSave: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
  },
  editActions: {
    display: 'flex',
    gap: '6px',
  },
};
