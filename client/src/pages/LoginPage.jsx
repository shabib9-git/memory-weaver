/**
 * LoginPage.jsx — Screen 1: Login / Landing page.
 *
 * Shown to unauthenticated users.  Displays the MemoryWeaver brand,
 * a brief description, feature list, and the "Sign in with Google" CTA.
 *
 * The sign-in button redirects to GET /auth/google on the Express
 * backend which initiates the Google OAuth 2.0 consent flow.
 *
 * If the URL contains ?auth_error=... (set by the backend callback on
 * OAuth denial), a friendly error message is displayed.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDevStatus } from '../services/api.js';

// Features displayed on the landing page
const FEATURES = [
  {
    icon: '📷',
    title: 'Google Drive Sync',
    desc: 'Connect your Google account and import photos from your Google Drive automatically.',
  },
  {
    icon: '🤖',
    title: 'Gemini AI Analysis',
    desc: 'Each photo is analysed by Google Gemini for content, mood, and key visual elements.',
  },
  {
    icon: '🎙️',
    title: 'Voice Memos',
    desc: 'Record voice notes directly in the app. Gemini transcribes and summarises them.',
  },
  {
    icon: '✨',
    title: 'Memory Narratives',
    desc: 'Gemini weaves your photo analysis and voice memo into a rich, personal journal entry.',
  },
];

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('auth_error');
  const [devMode, setDevMode] = useState(false);

  // If already authenticated, redirect to gallery
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/gallery', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Check whether the server has dev-bypass enabled
  useEffect(() => {
    getDevStatus()
      .then(({ devMode: dm }) => setDevMode(dm))
      .catch(() => {}); // Safe to ignore — devMode stays false
  }, []);

  /** Initiates the Google OAuth flow by redirecting to the backend. */
  function handleSignIn() {
    // Full page redirect — the backend handles the OAuth dance
    window.location.href = '/auth/google';
  }

  /**
   * Dev-only: bypasses OAuth by hitting /auth/dev-login which creates a
   * fake session.  Only shown when DEV_BYPASS_AUTH=true on the server.
   */
  function handleDevLogin() {
    window.location.href = '/auth/dev-login';
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Hero section ─────────────────────────────────────────────── */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          {/* Brand */}
          <div style={styles.brandWrapper}>
            <span style={styles.logo}>🧵</span>
            <h1 className="gradient-text" style={styles.heroTitle}>MemoryWeaver</h1>
          </div>
          <p style={styles.heroTagline}>AI-Powered Photo & Voice Memory Journal</p>
          <p style={styles.heroDesc}>
            Import photos from Google Drive, record voice memos, and let Google Gemini weave your
            memories into beautiful, AI-enhanced journal entries — stored securely in the cloud.
          </p>

          {/* OAuth error alert */}
          {authError && (
            <div style={styles.errorAlert} role="alert">
              <strong>Sign-in error:</strong> {decodeURIComponent(authError)}.{' '}
              Please try again or contact support.
            </div>
          )}

          {/* Sign-in CTA */}
          <button onClick={handleSignIn} style={styles.signInBtn}>
            <svg style={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* Dev bypass — only shown when DEV_BYPASS_AUTH=true on server */}
          {devMode && (
            <div style={styles.devBanner}>
              <p style={styles.devBannerLabel}>⚙️ Dev Mode</p>
              <button onClick={handleDevLogin} style={styles.devBtn}>
                Skip OAuth → Dev Login
              </button>
              <p style={styles.devBannerNote}>
                Creates a fake session. Photos/Gemini calls won't work without
                real credentials, but all screens are navigable.
              </p>
            </div>
          )}

          <p style={styles.privacyNote}>Read-only Drive access · Data stored in Firestore</p>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────── */}
      <section style={styles.featuresSection}>
        <h2 style={styles.featuresTitle}>How it works</h2>
        <div style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureCardTitle}>{f.title}</h3>
              <p style={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <p>CS651 Web Systems — Group 4 | Sarmad Habib · Anas Niaz · Muhammad Sufiyan</p>
        <p style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
          Powered by Google Gemini · Google Drive · Google Firestore · Google Cloud Run
        </p>
        {/* Project 1 back-link — replace # with your deployed Project 1 URL */}
        <p style={{ marginTop: '8px', fontSize: '0.75rem' }}>
          <a
            href="#"
            style={{ color: 'var(--color-primary-light)', textDecoration: 'underline' }}
            title="Back to Project 1 static site"
          >
            ← Back to Project 1
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-bg)',
  },
  loadingScreen: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '2px solid rgba(255,255,255,0.08)',
    borderTop: '2px solid var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 24px 72px',
    flex: 1,
  },
  heroInner: {
    maxWidth: '520px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  logo: {
    fontSize: '36px',
    lineHeight: 1,
    filter: 'drop-shadow(0 0 20px rgba(124,114,255,0.5))',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.25rem)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1.1,
  },
  heroTagline: {
    fontSize: '1rem',
    fontWeight: 400,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.01em',
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  heroDesc: { display: 'none' },
  errorAlert: {
    width: '100%',
    padding: '11px 16px',
    backgroundColor: 'var(--color-error-bg)',
    border: '1px solid rgba(248,113,113,0.18)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-error)',
    fontSize: '0.875rem',
    textAlign: 'left',
  },
  signInBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 16px rgba(109,99,255,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    letterSpacing: '-0.01em',
  },
  googleIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  privacyNote: {
    fontSize: '0.75rem',
    color: 'var(--color-text-faint)',
    maxWidth: '340px',
    lineHeight: 1.6,
    letterSpacing: '0',
  },
  featuresSection: {
    padding: '0 24px 80px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
  },
  featuresTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    marginBottom: '24px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1px',
    backgroundColor: 'var(--color-border)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  featureCard: {
    backgroundColor: 'var(--color-surface)',
    padding: '24px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  featureIcon: {
    fontSize: '1.375rem',
    lineHeight: 1,
    marginBottom: '2px',
  },
  featureCardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  featureCardDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.65,
  },
  footer: {
    textAlign: 'center',
    padding: '20px 24px',
    color: 'var(--color-text-faint)',
    fontSize: '0.75rem',
    borderTop: '1px solid var(--color-border)',
    letterSpacing: '-0.01em',
  },
  devBanner: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(251,191,36,0.07)',
    border: '1px solid rgba(251,191,36,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  devBannerLabel: {
    margin: 0,
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#fbbf24',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  devBtn: {
    padding: '9px 22px',
    backgroundColor: '#fbbf24',
    color: '#111',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  devBannerNote: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'rgba(251,191,36,0.5)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
};
