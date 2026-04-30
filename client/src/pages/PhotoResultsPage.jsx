/**
 * PhotoResultsPage.jsx — Screen 4: Photo Processing Results.
 *
 * Displays the full Gemini analysis (XXX) for a single photo,
 * retrieved from Firestore via the /api/journal endpoint.
 *
 * Layout (matching proposal mockup):
 *   Left : Photo at full quality
 *   Right: Gemini output XXX (description, mood, key elements, title)
 *
 * Navigation state expected:
 *   { photo: { id, baseUrl, filename, processed, outputXXX? } }
 *
 * If the photo is not yet processed, the user is prompted to process it.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchJournal, analyzePhoto } from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { trackPhotoProcess } from '../utils/analytics.js';

export default function PhotoResultsPage() {
  const { photoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedPhoto = location.state?.photo || null;

  const [photo, setPhoto] = useState(passedPhoto);
  const [outputXXX, setOutputXXX] = useState(passedPhoto?.outputXXX || '');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch result from Firestore ─────────────────────────────────────
  // Runs on mount and resolves via two strategies:
  //   1. If navigation state contains a photo, search journal by photoUrl.
  //   2. If navigated directly (deep-link / page refresh), search journal
  //      by Firestore document ID matching the URL :photoId param.
  useEffect(() => {
    // Short-circuit: nav state already has the fully populated output
    if (passedPhoto?.outputXXX) {
      setOutputXXX(passedPhoto.outputXXX);
      setLoading(false);
      return;
    }

    async function fetchResult() {
      setLoading(true);
      try {
        const journal = await fetchJournal();

        // Strategy 1: match by photo baseUrl (most common path from Gallery)
        if (passedPhoto?.baseUrl) {
          const byUrl = journal.photoResults.find(
            (r) => r.photoUrl === passedPhoto.baseUrl
          );
          if (byUrl) {
            setOutputXXX(byUrl.outputXXX);
            setLoading(false);
            return;
          }
        }

        // Strategy 2: match by Firestore document ID (deep-link / refresh)
        if (photoId) {
          const byId = journal.photoResults.find((r) => r.id === photoId);
          if (byId) {
            // Reconstruct the minimal photo object from the Firestore doc
            setPhoto({
              id: photoId,
              baseUrl: byId.photoUrl,
              filename: '',
              mimeType: 'image/jpeg',
            });
            setOutputXXX(byId.outputXXX);
            setLoading(false);
            return;
          }
        }

        // No result found for this photo yet
        setOutputXXX('');
      } catch (err) {
        setError(`Could not fetch result: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  /** Analyses the photo with Gemini if no result exists yet. */
  async function handleProcess() {
    if (!photo) return;
    setProcessing(true);
    setError('');
    try {
      const driveFileId = photo.source === 'drive' ? photo.id : null;
      const result = await analyzePhoto(photo.baseUrl, photo.mimeType || 'image/jpeg', driveFileId);
      setOutputXXX(result.outputXXX);
      trackPhotoProcess(1);
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  // ── Parse XXX output into structured sections ──────────────────────
  const sections = parseXXX(outputXXX);

  // ── Render ──────────────────────────────────────────────────────────
  if (!photo) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <h2>Photo not found</h2>
          <p>Please navigate here from the Gallery.</p>
          <button style={{ ...styles.btn, ...styles.btnPrimary, marginTop: '16px' }} onClick={() => navigate('/gallery')}>
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Analysis Results</h1>
          <p style={styles.pageSubtitle}>{photo.filename || 'Untitled photo'}</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => navigate('/gallery')}>
            ← Gallery
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={() => navigate('/record', { state: { photo: { ...photo, outputXXX } } })}
          >
            🎙️ Add Voice Memo
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div style={styles.layout}>
        {/* Left: Photo */}
        <div style={styles.photoColumn}>
          <img
            src={
              photo.source === 'drive' || photo.source === 'upload' || photo.source === 'picker'
                ? photo.baseUrl
                : photo.thumbnailUrl || `${photo.baseUrl}=w800-h600`
            }
            alt={photo.filename || 'Memory photo'}
            style={styles.photo}
            onError={(e) => { e.target.src = 'https://via.placeholder.com/800x600?text=Photo'; }}
          />
          <p style={styles.photoCaption}>
            {photo.mediaMetadata?.creationTime
              ? new Date(photo.mediaMetadata.creationTime).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })
              : ''}
          </p>
        </div>

        {/* Right: Analysis */}
        <div style={styles.analysisColumn}>
          {loading ? (
            <LoadingSpinner fullPage message="Fetching Gemini analysis…" />
          ) : processing ? (
            <LoadingSpinner fullPage message="Analysing photo with Google Gemini…" />
          ) : outputXXX ? (
            <>
              {/* Memory Title */}
              {sections.title && (
                <div style={styles.memoryTitle}>
                  <span style={styles.memoryTitleLabel}>Memory Title</span>
                  <h2 style={styles.memoryTitleText}>{sections.title}</h2>
                </div>
              )}

              {/* Structured sections */}
              {sections.description && (
                <OutputSection icon="📝" label="Description" text={sections.description} />
              )}
              {sections.mood && (
                <OutputSection icon="💭" label="Mood" text={sections.mood} />
              )}
              {sections.keyElements && (
                <OutputSection icon="🔑" label="Key Elements" text={sections.keyElements} />
              )}

              {/* Raw output fallback */}
              {!sections.description && (
                <div style={styles.rawOutput}>
                  <pre style={styles.rawText}>{outputXXX}</pre>
                </div>
              )}

              {/* Action row */}
              <div style={styles.actionRow}>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={handleProcess}
                  title="Re-analyse with Gemini"
                >
                  🔄 Re-analyse
                </button>
                <button
                  style={{ ...styles.btn, ...styles.btnOutline }}
                  onClick={() => navigate('/journal')}
                >
                  📖 View in Journal
                </button>
              </div>
            </>
          ) : (
            <div style={styles.notProcessed}>
              <p style={styles.notProcessedText}>
                This photo has not been analysed yet. Click below to process it with Google Gemini.
              </p>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleProcess}>
                🤖 Process with Gemini
              </button>
            </div>
          )}

          {error && (
            <div style={styles.errorBox} role="alert">
              <strong>⚠ </strong>{error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper: sectioned output box ─────────────────────────────────────
function OutputSection({ icon, label, text }) {
  return (
    <div style={sectionStyles.wrapper}>
      <h3 style={sectionStyles.label}>
        {icon} {label}
      </h3>
      <div style={sectionStyles.content}>
        <p style={sectionStyles.text}>{text}</p>
      </div>
    </div>
  );
}

const sectionStyles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  content: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
  },
  text: {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
  },
};

/**
 * Parses the structured Gemini XXX output into distinct sections.
 * Falls back gracefully if the output does not follow the expected format.
 */
function parseXXX(text) {
  if (!text) return {};
  const result = {};

  const descMatch = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=\n(?:MOOD:|KEY ELEMENTS:|MEMORY TITLE:)|$)/i);
  const moodMatch = text.match(/MOOD:\s*([\s\S]*?)(?=\n(?:KEY ELEMENTS:|MEMORY TITLE:)|$)/i);
  const keysMatch = text.match(/KEY ELEMENTS:\s*([\s\S]*?)(?=\nMEMORY TITLE:|$)/i);
  const titleMatch = text.match(/MEMORY TITLE:\s*(.+)/i);

  if (descMatch) result.description = descMatch[1].trim();
  if (moodMatch) result.mood = moodMatch[1].trim();
  if (keysMatch) result.keyElements = keysMatch[1].trim();
  if (titleMatch) result.title = titleMatch[1].trim();

  return result;
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: { padding: '36px 28px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' },
  pageSubtitle: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '3px', letterSpacing: '-0.01em' },
  headerBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'start' },
  photoColumn: { display: 'flex', flexDirection: 'column', gap: '8px' },
  photo: { width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', objectFit: 'cover', display: 'block' },
  photoCaption: { fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', letterSpacing: '-0.01em' },
  analysisColumn: { display: 'flex', flexDirection: 'column', gap: '16px' },
  memoryTitle: { display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' },
  memoryTitleLabel: { fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  memoryTitleText: { fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, letterSpacing: '-0.03em' },
  rawOutput: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
  rawText: { fontSize: '0.875rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.75 },
  actionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  notProcessed: { display: 'flex', flexDirection: 'column', gap: '14px', padding: '36px 24px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' },
  notProcessedText: { fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.7 },
  emptyState: { textAlign: 'center', padding: '100px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', letterSpacing: '-0.01em' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: '#fff', boxShadow: '0 1px 8px rgba(109,99,255,0.2)' },
  btnSecondary: { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(5,150,105,0.2)' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' },
  errorBox: { padding: '11px 16px', backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--color-error)', fontSize: '0.875rem' },
};
