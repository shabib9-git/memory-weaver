/**
 * JournalPage.jsx — Screen 5: Journal / Timeline View.
 *
 * Displays a chronological list of all processed entries for the
 * authenticated user, fetched from Firestore via /api/journal.
 *
 * Each entry can show:
 *   • Photo thumbnail + Gemini analysis (XXX)
 *   • Voice memo + Gemini transcription/summary (YYY)
 *   • Combined narrative (ZZZ)
 *
 * Features:
 *   • Text search across all output fields
 *   • Filter tabs: All / Photos / Audio / Narratives
 *   • Entry deletion (CRUD demo for assignment)
 *   • Pagination (client-side — all data is fetched at once)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJournal, deleteJournalEntry } from '../services/api.js';
import JournalEntry from '../components/JournalEntry.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { trackJournalView } from '../utils/analytics.js';
import { extractMood, extractLocation } from '../utils/parseGeminiOutput.js';

const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'photos',     label: '📷 Photos' },
  { id: 'audio',      label: '🎙️ Audio' },
  { id: 'narratives', label: '✨ Narratives' },
];

export default function JournalPage() {
  const navigate = useNavigate();
  const [journalData, setJournalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDir, setSortDir] = useState('desc'); // 'desc' | 'asc'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [hasVoice, setHasVoice] = useState(false);
  const [hasNarrative, setHasNarrative] = useState(false);

  // ── Fetch journal data ─────────────────────────────────────────
  useEffect(() => {
    async function loadJournal() {
      setLoading(true);
      try {
        const data = await fetchJournal();
        setJournalData(data);
        trackJournalView(data.totalEntries || 0);
      } catch (err) {
        setError(err.message || 'Could not load journal entries.');
      } finally {
        setLoading(false);
      }
    }
    loadJournal();
  }, []);

  /** Updates the ZZZ narrative in local state after a successful save. */
  function handleNarrativeUpdate(docId, newText) {
    setJournalData((prev) => ({
      ...prev,
      combinedResults: prev.combinedResults.map((e) =>
        e.id === docId ? { ...e, outputZZZ: newText } : e
      ),
    }));
  }

  /** Handles deletion of any journal entry by id and type. */
  async function handleDelete(docId, type = 'photo') {
    try {
      await deleteJournalEntry(docId, type);
      setJournalData((prev) => {
        const key =
          type === 'audio' ? 'audioResults' :
          type === 'combined' ? 'combinedResults' : 'photoResults';
        return {
          ...prev,
          [key]: prev[key].filter((e) => e.id !== docId),
          totalEntries: prev.totalEntries - 1,
        };
      });
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }

  // ── Derive available moods + locations from all entries ────────
  const { availableMoods, availableLocations } = useMemo(() => {
    if (!journalData) return { availableMoods: [], availableLocations: [] };
    const allEntries = [
      ...(journalData.photoResults || []),
      ...(journalData.combinedResults || []),
    ];
    const moodSet = new Set();
    const locSet = new Set();
    allEntries.forEach((e) => {
      const m = extractMood(e.outputXXX);
      const l = extractLocation(e.outputXXX);
      if (m) moodSet.add(m);
      if (l) locSet.add(l);
    });
    return {
      availableMoods: [...moodSet].sort(),
      availableLocations: [...locSet].sort(),
    };
  }, [journalData]);

  // ── Build unified + filtered entry list ───────────────────────
  const entries = useMemo(() => {
    if (!journalData) return [];

    const allEntries = [
      ...(journalData.photoResults || []).map((e) => ({ ...e, _type: 'photo' })),
      ...(journalData.audioResults || []).map((e) => ({ ...e, _type: 'audio' })),
      ...(journalData.combinedResults || []).map((e) => ({ ...e, _type: 'combined' })),
    ];

    // Sort
    allEntries.sort((a, b) => {
      const da = new Date(a.processedAt || 0);
      const db = new Date(b.processedAt || 0);
      return sortDir === 'desc' ? db - da : da - db;
    });

    // Type tab filter
    let filtered = allEntries;
    if (activeFilter === 'photos')     filtered = allEntries.filter((e) => e._type === 'photo');
    if (activeFilter === 'audio')      filtered = allEntries.filter((e) => e._type === 'audio');
    if (activeFilter === 'narratives') filtered = allEntries.filter((e) => e._type === 'combined');

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((e) => new Date(e.processedAt || 0) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.processedAt || 0) <= to);
    }

    // Mood filter
    if (selectedMood) {
      filtered = filtered.filter((e) => extractMood(e.outputXXX) === selectedMood);
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter((e) => {
        const loc = extractLocation(e.outputXXX);
        return loc && loc.toLowerCase().includes(selectedLocation.toLowerCase());
      });
    }

    // Has voice / narrative toggles
    if (hasVoice)     filtered = filtered.filter((e) => !!e.outputYYY || e._type === 'audio' || e._type === 'combined');
    if (hasNarrative) filtered = filtered.filter((e) => !!e.outputZZZ || e._type === 'combined');

    // Text search across all output fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        (e.outputXXX || '').toLowerCase().includes(q) ||
        (e.outputYYY || '').toLowerCase().includes(q) ||
        (e.outputZZZ || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [journalData, activeFilter, searchQuery, dateFrom, dateTo, sortDir, selectedMood, selectedLocation, hasVoice, hasNarrative]);

  const activeFilterCount = [dateFrom, dateTo, selectedMood, selectedLocation, hasVoice && 'v', hasNarrative && 'n'].filter(Boolean).length;

  function clearAllFilters() {
    setDateFrom(''); setDateTo('');
    setSelectedMood(''); setSelectedLocation('');
    setHasVoice(false); setHasNarrative(false);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Page header ─────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Journal</h1>
          <p style={styles.pageSubtitle}>
            {journalData
              ? `${journalData.totalEntries} entries total`
              : 'Your AI-enhanced memory journal'}
          </p>
        </div>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => navigate('/gallery')}
        >
          + Add Memories
        </button>
      </header>

      {/* ── Search + filter controls ─────────────────────────────── */}
      <div style={styles.controls}>
        {/* Top row: search + sort + filter toggle */}
        <div style={styles.controlsRow}>
          <input
            type="text"
            placeholder="Search entries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            aria-label="Search journal entries"
          />
          <button
            style={{ ...styles.iconBtn, ...(sortDir === 'asc' ? styles.iconBtnActive : {}) }}
            onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? 'Newest first — click for oldest first' : 'Oldest first — click for newest first'}
          >
            {sortDir === 'desc' ? '↓ Newest' : '↑ Oldest'}
          </button>
          <button
            style={{ ...styles.iconBtn, ...(showFilters ? styles.iconBtnActive : {}) }}
            onClick={() => setShowFilters((v) => !v)}
            title="Date filter"
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div style={styles.filterPanel}>
            {/* Date range */}
            <div style={styles.filterGroup}>
              <span style={styles.filterGroupLabel}>Date range</span>
              <div style={styles.filterGroupRow}>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.dateInput} />
                <span style={styles.dateLabel}>to</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.dateInput} />
              </div>
            </div>

            {/* Mood chips */}
            {availableMoods.length > 0 && (
              <div style={styles.filterGroup}>
                <span style={styles.filterGroupLabel}>Mood</span>
                <div style={styles.chipRow}>
                  {availableMoods.map((m) => (
                    <button
                      key={m}
                      style={{ ...styles.chip, ...(selectedMood === m ? styles.chipActive : {}) }}
                      onClick={() => setSelectedMood(selectedMood === m ? '' : m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location chips */}
            {availableLocations.length > 0 && (
              <div style={styles.filterGroup}>
                <span style={styles.filterGroupLabel}>Location</span>
                <div style={styles.chipRow}>
                  {availableLocations.map((l) => (
                    <button
                      key={l}
                      style={{ ...styles.chip, ...(selectedLocation === l ? styles.chipActive : {}) }}
                      onClick={() => setSelectedLocation(selectedLocation === l ? '' : l)}
                    >
                      📍 {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Has voice / narrative toggles */}
            <div style={styles.filterGroup}>
              <span style={styles.filterGroupLabel}>Contains</span>
              <div style={styles.chipRow}>
                <button
                  style={{ ...styles.chip, ...(hasVoice ? styles.chipActive : {}) }}
                  onClick={() => setHasVoice((v) => !v)}
                >
                  🎙️ Voice memo
                </button>
                <button
                  style={{ ...styles.chip, ...(hasNarrative ? styles.chipActive : {}) }}
                  onClick={() => setHasNarrative((v) => !v)}
                >
                  ✨ Narrative
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button style={styles.clearAllBtn} onClick={clearAllFilters}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Type tabs */}
        <div style={styles.filterTabs} role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={activeFilter === f.id}
              style={{
                ...styles.filterTab,
                ...(activeFilter === f.id ? styles.filterTabActive : {}),
              }}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span style={styles.entryCount}>{entries.length} shown</span>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner fullPage message="Loading your journal from Firestore…" />
      ) : error ? (
        <div style={styles.errorBanner} role="alert">
          <strong>⚠ </strong>{error}
        </div>
      ) : entries.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📖</span>
          <h2 style={styles.emptyTitle}>
            {searchQuery ? 'No entries match your search' : 'Your journal is empty'}
          </h2>
          <p style={styles.emptyDesc}>
            {searchQuery
              ? 'Try a different search term.'
              : 'Process photos and record voice memos in the Gallery to start building your journal.'}
          </p>
          {!searchQuery && (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary, marginTop: '16px' }}
              onClick={() => navigate('/gallery')}
            >
              Go to Gallery
            </button>
          )}
        </div>
      ) : (
        <div style={styles.entryList}>
          {entries.map((entry) => (
            <JournalEntry
              key={entry.id}
              entry={entry}
              onDelete={(id) => handleDelete(id, entry._type)}
              onNarrativeUpdate={handleNarrativeUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: { padding: '36px 28px', maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' },
  pageSubtitle: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '3px', letterSpacing: '-0.01em' },
  controls: { display: 'flex', flexDirection: 'column', gap: '10px' },
  controlsRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  searchInput: { flex: 1, padding: '9px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minWidth: 0 },
  iconBtn: {
    flexShrink: 0,
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
    transition: 'all 0.15s ease',
  },
  iconBtnActive: {
    backgroundColor: 'var(--color-surface-2)',
    borderColor: 'var(--color-border-strong)',
    color: 'var(--color-text)',
  },
  filterPanel: { display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px 16px', backgroundColor: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '7px' },
  filterGroupLabel: { fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' },
  filterGroupRow: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  chipRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  chip: { padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', transition: 'all 0.15s ease', letterSpacing: '-0.01em' },
  chipActive: { backgroundColor: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
  dateLabel: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', letterSpacing: '-0.01em' },
  dateInput: { padding: '5px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)', fontSize: '0.8125rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' },
  clearAllBtn: { alignSelf: 'flex-start', padding: '5px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-text-muted)' },
  filterTabs: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' },
  filterTab: {
    padding: '5px 14px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
  },
  filterTabActive: {
    backgroundColor: 'var(--color-surface-2)',
    borderColor: 'var(--color-border-strong)',
    color: 'var(--color-text)',
  },
  entryCount: { marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-faint)', letterSpacing: '-0.01em' },
  entryList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  errorBanner: { padding: '11px 16px', backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--color-error)', fontSize: '0.8125rem' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 24px', gap: '14px', textAlign: 'center' },
  emptyIcon: { fontSize: '3rem', lineHeight: 1, opacity: 0.35 },
  emptyTitle: { fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' },
  emptyDesc: { fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '360px', lineHeight: 1.7 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', letterSpacing: '-0.01em' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: '#fff', boxShadow: '0 1px 8px rgba(109,99,255,0.2)' },
};
