/**
 * VoiceRecordPage.jsx — Screen 3: Voice Recording & Audio Processing.
 *
 * Allows the user to:
 *   1. Record a voice memo using the browser's MediaRecorder API.
 *   2. Optionally link the recording to a photo (from GalleryPage context).
 *   3. Send the audio to the Express backend for Gemini processing.
 *   4. Display the Gemini transcription + summary (YYY).
 *   5. Optionally trigger combined narrative generation (ZZZ).
 *
 * This page receives optional navigation state:
 *   { photo: { id, baseUrl, filename, outputXXX } }
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { processAudio, combineOutputs } from '../services/api.js';
import { trackRecordStart, trackRecordStop, trackAudioProcess, trackCombine } from '../utils/analytics.js';

export default function VoiceRecordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Photo context passed from GalleryPage (optional)
  const linkedPhoto = location.state?.photo || null;

  const [audioBlob, setAudioBlob] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [outputYYY, setOutputYYY] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [combiningNarrative, setCombiningNarrative] = useState(false);
  const [outputZZZ, setOutputZZZ] = useState('');
  const [error, setError] = useState('');

  /** Called by AudioRecorder when the user stops recording. */
  function handleRecordingComplete(blob, mimeType) {
    setAudioBlob(blob);
    setAudioMimeType(mimeType);
    setOutputYYY('');
    setOutputZZZ('');
    setError('');
    trackRecordStop();
  }

  /** Uploads the recorded blob and processes with Gemini. */
  async function handleProcessAudio() {
    if (!audioBlob) return;
    setError('');
    setProcessingAudio(true);
    setUploadProgress(0);

    try {
      const result = await processAudio(
        audioBlob,
        audioMimeType,
        linkedPhoto?.baseUrl || '',
        setUploadProgress
      );
      setOutputYYY(result.outputYYY);
      setAudioUrl(result.audioUrl);
      trackAudioProcess();
    } catch (err) {
      setError(
        err.message ||
        'Audio processing failed. Make sure GEMINI_API_KEY is configured.'
      );
    } finally {
      setProcessingAudio(false);
      setUploadProgress(0);
    }
  }

  /** Generates the combined narrative (ZZZ) from XXX + YYY. */
  async function handleCombine() {
    if (!outputYYY || !linkedPhoto?.outputXXX) return;
    setCombiningNarrative(true);
    setError('');

    try {
      const result = await combineOutputs(
        linkedPhoto.outputXXX,
        outputYYY,
        linkedPhoto?.baseUrl || '',
        audioUrl
      );
      setOutputZZZ(result.outputZZZ);
      trackCombine();
    } catch (err) {
      setError(`Could not generate narrative: ${err.message}`);
    } finally {
      setCombiningNarrative(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* ── Page header ─────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Voice Recording</h1>
          <p style={styles.pageSubtitle}>
            Record a voice memo. Gemini will transcribe and summarise it.
          </p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/gallery')}>
          ← Back to Gallery
        </button>
      </header>

      <div style={styles.layout}>
        {/* ── Left column: linked photo ────────────────────────────── */}
        {linkedPhoto && (
          <aside style={styles.photoPanel}>
            <h2 style={styles.panelTitle}>Linked Photo</h2>
            <img
              src={
                linkedPhoto.source === 'drive' || linkedPhoto.source === 'upload' || linkedPhoto.source === 'picker'
                  ? linkedPhoto.baseUrl
                  : linkedPhoto.thumbnailUrl || `${linkedPhoto.baseUrl}=w480-h360`
              }
              alt="Linked memory photo"
              style={styles.linkedPhoto}
            />
            <p style={styles.photoName}>{linkedPhoto.filename || 'Untitled photo'}</p>
            {linkedPhoto.outputXXX && (
              <div style={styles.xxxPreview}>
                <p style={styles.xxxLabel}>Gemini Photo Analysis (XXX):</p>
                <pre style={styles.xxxText}>{linkedPhoto.outputXXX.slice(0, 400)}…</pre>
              </div>
            )}
          </aside>
        )}

        {/* ── Right column: recorder + results ────────────────────── */}
        <div style={styles.mainColumn}>
          {/* Recorder component */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Step 1 — Record</h2>
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={trackRecordStart}
              linkedPhotoUrl={linkedPhoto?.baseUrl}
              disabled={processingAudio}
            />
          </section>

          {/* Process button */}
          {audioBlob && !outputYYY && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 2 — Process with Gemini</h2>
              {processingAudio ? (
                <div style={styles.processingState}>
                  <LoadingSpinner size={32} />
                  <p style={styles.processingText}>
                    {uploadProgress < 100
                      ? `Uploading… ${uploadProgress}%`
                      : 'Gemini is transcribing your audio…'}
                  </p>
                </div>
              ) : (
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary, width: '100%' }}
                  onClick={handleProcessAudio}
                >
                  🤖 Process with Gemini
                </button>
              )}
            </section>
          )}

          {/* YYY output */}
          {outputYYY && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Gemini Audio Output (YYY)</h2>
              <div style={styles.outputBox}>
                <pre style={styles.outputText}>{outputYYY}</pre>
              </div>

              {/* Combine button — only if linked photo has XXX */}
              {linkedPhoto?.outputXXX && !outputZZZ && (
                <div style={{ marginTop: '16px' }}>
                  <h3 style={styles.sectionTitle}>Step 3 — Generate Memory Narrative (Optional)</h3>
                  {combiningNarrative ? (
                    <LoadingSpinner size={32} message="Gemini is weaving your memory narrative…" />
                  ) : (
                    <button
                      style={{ ...styles.btn, ...styles.btnAccent, width: '100%' }}
                      onClick={handleCombine}
                    >
                      ✨ Generate Combined Narrative (ZZZ)
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ZZZ output */}
          {outputZZZ && (
            <section style={{ ...styles.section, ...styles.narrativeSection }}>
              <h2 style={styles.sectionTitle}>✨ Memory Narrative (ZZZ)</h2>
              <p style={styles.narrativeText}>{outputZZZ}</p>
              <button
                style={{ ...styles.btn, ...styles.btnOutline, marginTop: '16px' }}
                onClick={() => navigate('/journal')}
              >
                📖 View in Journal
              </button>
            </section>
          )}

          {/* Error */}
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

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: '36px 28px',
    maxWidth: '1100px',
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
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
  },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' },
  pageSubtitle: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '3px', letterSpacing: '-0.01em' },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    transition: 'all 0.15s ease',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '28px',
    alignItems: 'start',
  },
  photoPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  panelTitle: { fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  linkedPhoto: {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    objectFit: 'cover',
    maxHeight: '280px',
    display: 'block',
  },
  photoName: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', letterSpacing: '-0.01em' },
  xxxPreview: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
  },
  xxxLabel: { fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  xxxText: { fontSize: '0.8125rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto', lineHeight: 1.65 },
  mainColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  processingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 20px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  processingText: { fontSize: '0.8125rem', color: 'var(--color-text-muted)', letterSpacing: '-0.01em' },
  outputBox: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 18px',
  },
  outputText: {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.75,
  },
  narrativeSection: {
    backgroundColor: 'rgba(109,99,255,0.04)',
    border: '1px solid rgba(109,99,255,0.12)',
    borderRadius: 'var(--radius-md)',
    padding: '22px',
  },
  narrativeText: { fontSize: '0.9375rem', lineHeight: 1.85, color: 'var(--color-text)', whiteSpace: 'pre-wrap' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
  },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: '#fff', boxShadow: '0 1px 8px rgba(109,99,255,0.2)' },
  btnAccent: { backgroundColor: 'rgba(109,40,217,0.08)', color: '#7c3aed', border: '1px solid rgba(109,40,217,0.15)' },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  errorBox: {
    padding: '11px 16px',
    backgroundColor: 'var(--color-error-bg)',
    border: '1px solid rgba(248,113,113,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-error)',
    fontSize: '0.875rem',
  },
};
