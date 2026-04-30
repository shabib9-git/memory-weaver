/**
 * AudioRecorder.jsx — Browser-based voice recording component.
 *
 * Uses the Web MediaRecorder API to capture microphone audio as a
 * Blob (webm or ogg depending on browser support).
 *
 * Props:
 *   onRecordingComplete(blob, mimeType) — called with the recorded audio
 *   linkedPhotoUrl                      — optional photo this memo is for
 *   disabled                            — disables controls (e.g. during upload)
 */

import React, { useState, useRef, useEffect } from 'react';

// Preferred MIME types in priority order
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];

/** Returns the best supported MIME type for MediaRecorder in this browser. */
function getSupportedMimeType() {
  for (const type of PREFERRED_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export default function AudioRecorder({ onRecordingComplete, onRecordingStart, linkedPhotoUrl, disabled = false }) {
  const [state, setState] = useState('idle'); // idle | requesting | recording | stopped
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');
  const [waveAmplitudes, setWaveAmplitudes] = useState(new Array(20).fill(0.2));

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const mimeTypeRef = useRef('');

  // ── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ── Waveform animation during recording ──────────────────────────
  function startWaveformAnimation() {
    function animate() {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        // Sample 20 evenly-spaced frequency bins for the visualisation
        const amplitudes = Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor((i / 20) * data.length);
          return data[idx] / 255;
        });
        setWaveAmplitudes(amplitudes);
      }
      animationRef.current = requestAnimationFrame(animate);
    }
    animate();
  }

  /** Starts microphone capture and recording. */
  async function startRecording() {
    setError('');
    setState('requesting');
    setAudioUrl(null);
    chunksRef.current = [];
    setSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API analyser for waveform visualisation
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine best MIME type
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Collect data chunks
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // When recording stops, assemble the final Blob
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete && onRecordingComplete(blob, mimeTypeRef.current || 'audio/webm');
        cancelAnimationFrame(animationRef.current);
        setWaveAmplitudes(new Array(20).fill(0.1));
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      onRecordingStart && onRecordingStart();

      // Timer
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Waveform
      startWaveformAnimation();
    } catch (err) {
      setState('idle');
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Could not start recording: ${err.message}`);
      }
    }
  }

  /** Stops the active recording. */
  function stopRecording() {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      setState('stopped');
    }
  }

  /** Resets the recorder to idle so a new recording can be made. */
  function resetRecording() {
    setAudioUrl(null);
    setSeconds(0);
    setError('');
    setState('idle');
    setWaveAmplitudes(new Array(20).fill(0.2));
    chunksRef.current = [];
  }

  // ── Format seconds as mm:ss ───────────────────────────────────────
  const timeDisplay = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div style={styles.wrapper}>
      {/* ── Waveform visualiser ─────────────────────────────────────── */}
      <div style={styles.waveform} aria-hidden="true">
        {waveAmplitudes.map((amp, i) => (
          <div
            key={i}
            style={{
              ...styles.waveBar,
              height: `${Math.max(4, amp * 64)}px`,
              backgroundColor: state === 'recording'
                ? `rgba(239,68,68,${0.4 + amp * 0.6})`
                : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* ── Timer ───────────────────────────────────────────────────── */}
      <div style={styles.timer}>
        <span style={{ color: state === 'recording' ? '#ef4444' : 'var(--color-text-muted)' }}>
          {state === 'recording' && '● '}
        </span>
        {timeDisplay}
      </div>

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div style={styles.controls}>
        {state === 'idle' && (
          <button
            style={{ ...styles.btn, ...styles.btnRecord }}
            onClick={startRecording}
            disabled={disabled}
            title="Start recording"
          >
            🎙️ Start Recording
          </button>
        )}
        {state === 'requesting' && (
          <button style={{ ...styles.btn, ...styles.btnRecord }} disabled>
            Requesting microphone…
          </button>
        )}
        {state === 'recording' && (
          <button
            style={{ ...styles.btn, ...styles.btnStop }}
            onClick={stopRecording}
            title="Stop recording"
          >
            ⏹ Stop Recording
          </button>
        )}
        {state === 'stopped' && (
          <button
            style={{ ...styles.btn, ...styles.btnReset }}
            onClick={resetRecording}
            disabled={disabled}
            title="Record again"
          >
            🔄 Record Again
          </button>
        )}
      </div>

      {/* ── Audio playback ──────────────────────────────────────────── */}
      {audioUrl && (
        <div style={styles.playbackWrapper}>
          <p style={styles.playbackLabel}>Recording preview:</p>
          <audio controls src={audioUrl} style={styles.audioPlayer} />
        </div>
      )}

      {/* ── Error message ───────────────────────────────────────────── */}
      {error && (
        <div style={styles.errorBox} role="alert">
          <strong>⚠ </strong>{error}
        </div>
      )}

      {/* ── Browser support warning ─────────────────────────────────── */}
      {typeof MediaRecorder === 'undefined' && (
        <div style={styles.errorBox}>
          ⚠ MediaRecorder is not supported in this browser. Please use Chrome, Firefox, or Safari 14+.
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '28px 24px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  waveform: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    height: '56px',
    width: '100%',
    justifyContent: 'center',
  },
  waveBar: {
    width: '4px',
    borderRadius: '2px',
    transition: 'height 0.08s ease, background-color 0.2s',
  },
  timer: {
    fontSize: '2.25rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    color: 'var(--color-text)',
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  btn: {
    padding: '11px 28px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
  },
  btnRecord: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    boxShadow: '0 1px 10px rgba(109,99,255,0.25)',
  },
  btnStop: {
    backgroundColor: 'var(--color-error)',
    color: '#fff',
    animation: 'recordPulse 1.5s infinite',
  },
  btnReset: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
  playbackWrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  playbackLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  audioPlayer: {
    width: '100%',
    borderRadius: 'var(--radius-sm)',
  },
  errorBox: {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: 'var(--color-error-bg)',
    border: '1px solid rgba(248,113,113,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-error)',
    fontSize: '0.8125rem',
  },
};
