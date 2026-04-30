/**
 * GalleryPage.jsx — Screen 2: Photo Gallery.
 *
 * Fetches the user's photos from Google Drive, annotates them with "processed"
 * flags from Firestore, and displays them in a responsive grid.
 *
 * Actions available per photo:
 *   • Process (single photo) — Gemini analysis → XXX → Firestore
 *   • Add Voice Memo         — Navigate to VoiceRecordPage with photo context
 *   • View Result            — Navigate to PhotoResultsPage
 *
 * Batch actions:
 *   • Sync Photos            — Refreshes the gallery list from Google Drive
 *   • Process All New        — Sends all unprocessed photos to Gemini
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPhotos, analyzePhoto, uploadPhotos } from '../services/api.js';
import PhotoCard from '../components/PhotoCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { trackPhotoSync, trackPhotoProcess } from '../utils/analytics.js';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [error, setError] = useState('');
  const [googlePhotosBlocked, setGooglePhotosBlocked] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // ── Initial photo load ──────────────────────────────────────────
  useEffect(() => {
    loadPhotos();
  }, []);

  /** Fetches photos from the backend (Google Drive + Firestore annotations). */
  async function loadPhotos(pageToken = null) {
    if (pageToken) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await fetchPhotos(pageToken);
      if (pageToken) {
        setPhotos((prev) => [...prev, ...data.photos]);
      } else {
        setPhotos(data.photos || []);
      }
      setNextPageToken(data.nextPageToken || null);
      trackPhotoSync(data.totalFetched || 0);
      setGooglePhotosBlocked(false);
    } catch (err) {
      if (err.code === 'token_expired') {
        setError('Your Google session has expired. Please sign out and sign in again.');
      } else if (err.message?.includes('PHOTOS_FORBIDDEN') || err.message?.includes('Insufficient permissions')) {
        setGooglePhotosBlocked(true);
        setError('');
      } else {
        setError(err.message || 'Could not load photos.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  /**
   * Handles direct file uploads when Google Photos API is unavailable.
   * Files are sent to POST /api/photos/upload which runs Gemini analysis
   * immediately and saves results to Firestore.
   */
  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));
      const data = await uploadPhotos(formData);

      // Convert upload results into the same shape as Google Photos items
      const newPhotos = data.results.map((r) => ({
        id: r.photoId,
        baseUrl: r.photoUrl,
        filename: r.originalName,
        mimeType: 'image/jpeg',
        processed: true,
        outputXXX: r.outputXXX,
        source: 'upload',
      }));

      setPhotos((prev) => [...newPhotos, ...prev]);
      trackPhotoProcess(data.processedCount);
      setSuccessMsg(`${data.processedCount} photo(s) uploaded and analysed by Gemini!`);
      setTimeout(() => setSuccessMsg(''), 5000);

      if (data.errors?.length > 0) {
        setError(`${data.errors.length} file(s) failed: ${data.errors.map((e) => e.file).join(', ')}`);
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      // Reset the file input so the same files can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /** Re-syncs photos from Google Drive. */
  async function handleSync() {
    setSyncing(true);
    setSuccessMsg('');
    try {
      await loadPhotos();
      setSuccessMsg('Photos synced from Google Drive!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSyncing(false);
    }
  }

  /** Processes a single photo with Gemini. */
  const handleProcess = useCallback(async (photo) => {
    setProcessingIds((prev) => new Set([...prev, photo.id]));
    setError('');
    try {
      // Pass driveFileId for Drive-sourced photos so the backend can download via API
      await analyzePhoto(photo.baseUrl, photo.mimeType || 'image/jpeg', photo.source === 'drive' ? photo.id : null);
      // Mark the photo as processed in local state
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, processed: true } : p))
      );
      trackPhotoProcess(1);
      setSuccessMsg(`"${photo.filename || 'Photo'}" analysed and saved.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`Failed to process photo: ${err.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
    }
  }, []);

  /** Processes ALL unprocessed photos. */
  async function handleProcessAll() {
    const newPhotos = photos.filter((p) => !p.processed);
    if (newPhotos.length === 0) {
      setError('No new photos to process.');
      return;
    }
    for (const photo of newPhotos) {
      await handleProcess(photo);
    }
  }

  /** Navigates to the voice-record page with the selected photo pre-set. */
  function handleVoiceMemo(photo) {
    navigate('/record', { state: { photo } });
  }

  /** Navigates to the photo-result page. */
  function handleViewResult(photo) {
    navigate(`/results/${photo.id}`, { state: { photo } });
  }

  const unprocessedCount = photos.filter((p) => !p.processed).length;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Page header ─────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Gallery</h1>
          {photos.length > 0 && (
            <p style={styles.pageSubtitle}>
              {photos.length} photos · {unprocessedCount} unanalysed
            </p>
          )}
        </div>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={handleSync}
            disabled={syncing || loading}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          {/* Upload button — always visible as primary action */}
          <button
            style={{ ...styles.btn, ...styles.btnUpload }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          {unprocessedCount > 0 && (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleProcessAll}
              disabled={processingIds.size > 0}
            >
              Analyse All ({unprocessedCount})
            </button>
          )}
        </div>
      </header>

      {/* Hidden file input for direct upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      {/* Removed Google Photos blocked banner — Drive is now the default */}

      {/* ── Status messages ──────────────────────────────────────── */}
      {successMsg && (
        <div style={styles.successBanner} role="status">{successMsg}</div>
      )}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <strong>⚠ </strong>{error}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner
          fullPage
          message="Fetching your photos from Google Drive…"
          size={48}
        />
      ) : photos.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📷</span>
          <h2 style={styles.emptyTitle}>No photos yet</h2>
          {!error && (
            <p style={styles.emptyDesc}>Sync your Google Drive photos or upload images directly.</p>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync Drive'}
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnOutline }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Photo grid */}
          <div style={styles.grid}>
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onProcess={handleProcess}
                onVoiceMemo={handleVoiceMemo}
                onViewResult={handleViewResult}
                processing={processingIds.has(photo.id)}
              />
            ))}
          </div>

          {/* Load more */}
          {nextPageToken && (
            <div style={styles.loadMoreWrapper}>
              <button
                style={{ ...styles.btn, ...styles.btnOutline }}
                onClick={() => loadPhotos(nextPageToken)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load More Photos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: '36px 28px',
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.03em',
  },
  pageSubtitle: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    marginTop: '3px',
    letterSpacing: '-0.01em',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  },
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    boxShadow: '0 1px 8px rgba(109,99,255,0.2)',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  btnUpload: {
    backgroundColor: 'rgba(109,99,255,0.08)',
    border: '1px solid rgba(109,99,255,0.2)',
    color: 'var(--color-primary)',
  },
  infoBanner: {
    padding: '11px 16px',
    backgroundColor: 'rgba(37,99,235,0.06)',
    border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-info)',
    fontSize: '0.8125rem',
    lineHeight: 1.6,
  },
  successBanner: {
    padding: '11px 16px',
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid rgba(5,150,105,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-success)',
    fontSize: '0.8125rem',
  },
  errorBanner: {
    padding: '11px 16px',
    backgroundColor: 'var(--color-error-bg)',
    border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-error)',
    fontSize: '0.8125rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  loadMoreWrapper: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 24px',
    gap: '14px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    lineHeight: 1,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  emptyDesc: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    maxWidth: '360px',
    lineHeight: 1.7,
  },
};
