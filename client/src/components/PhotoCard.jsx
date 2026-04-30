/**
 * PhotoCard.jsx — Displays a single Google Photos thumbnail in the gallery.
 *
 * Props:
 *   photo       — { id, baseUrl, mimeType, mediaMetadata, processed }
 *   onProcess   — callback(photo) to trigger Gemini analysis
 *   onVoiceMemo — callback(photo) to navigate to the voice-record screen
 *   onViewResult— callback(photo) to navigate to the results screen
 *   processing  — boolean: shows a spinner overlay while processing
 */

import React from 'react';

export default function PhotoCard({ photo, onProcess, onVoiceMemo, onViewResult, processing = false }) {
  // Drive photos: use ?thumb=1 for a fast low-res thumbnail (avoids downloading the full file).
  // Uploaded / picker photos: use the proxy directly.
  // Legacy Google Photos: append size params.
  const thumbnailUrl =
    photo.source === 'drive'
      ? `${photo.baseUrl}?thumb=1`
      : photo.source === 'upload' || photo.source === 'picker'
        ? photo.baseUrl
        : photo.thumbnailUrl || `${photo.baseUrl}=w320-h240`;

  // Format creation date for display
  const creationDate = photo.mediaMetadata?.creationTime
    ? new Date(photo.mediaMetadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div style={styles.card} className="fade-in">
      {/* ── Thumbnail image ───────────────────────────────────────── */}
      <div style={styles.imageWrapper}>
        <img
          src={thumbnailUrl}
          alt={photo.filename || 'Photo'}
          style={styles.image}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/320x240?text=Photo'; }}
        />

        {/* Processing overlay spinner */}
        {processing && (
          <div style={styles.processingOverlay}>
            <div style={styles.overlaySpinner} />
            <span style={styles.overlayText}>Processing…</span>
          </div>
        )}

        {/* Processed badge */}
        {photo.processed && !processing && (
          <span style={styles.processedBadge} title="Already analysed by Gemini">
            ✓ Analysed
          </span>
        )}
      </div>

      {/* ── Card metadata ─────────────────────────────────────────── */}
      <div style={styles.cardBody}>
        <p style={styles.filename} title={photo.filename}>
          {photo.filename || 'Untitled photo'}
        </p>
        {creationDate && <p style={styles.date}>{creationDate}</p>}

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div style={styles.actions}>
          {photo.processed ? (
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => onViewResult && onViewResult(photo)}
              title="View Gemini analysis result"
            >
              📄 View Result
            </button>
          ) : (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => onProcess && onProcess(photo)}
              disabled={processing}
              title="Analyse this photo with Google Gemini"
            >
              🤖 Process
            </button>
          )}
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={() => onVoiceMemo && onVoiceMemo(photo)}
            title="Record a voice memo for this photo"
          >
            🎙️ Voice Memo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  },
  imageWrapper: {
    position: 'relative',
    aspectRatio: '4/3',
    backgroundColor: 'var(--color-surface-2)',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.3s ease',
  },
  processingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  overlaySpinner: {
    width: 28,
    height: 28,
    border: '2px solid rgba(255,255,255,0.15)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  overlayText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  processedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: 'rgba(52,211,153,0.9)',
    backdropFilter: 'blur(8px)',
    color: '#022c22',
    fontSize: '0.625rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: '12px 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  filename: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  },
  date: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '-0.01em',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    marginTop: '10px',
  },
  btn: {
    flex: 1,
    minWidth: 0,
    padding: '7px 10px',
    borderRadius: 'var(--radius-xs)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  },
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  },
  btnSecondary: {
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid rgba(52,211,153,0.2)',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
};
