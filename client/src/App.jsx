/**
 * App.jsx — Root component for the MemoryWeaver SPA.
 *
 * Sets up:
 *   • React Router v6 client-side routing
 *   • AuthProvider context wrapper
 *   • GA4 initialisation and page-view tracking
 *   • Route definitions for all 6 screens
 *   • ProtectedRoute wrapper (redirects to login if unauthenticated)
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { initAnalytics, trackPageView } from './utils/analytics.js';

// ── Screen / Page imports ────────────────────────────────────────────
import LoginPage from './pages/LoginPage.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import VoiceRecordPage from './pages/VoiceRecordPage.jsx';
import PhotoResultsPage from './pages/PhotoResultsPage.jsx';
import JournalPage from './pages/JournalPage.jsx';
import DatabasePage from './pages/DatabasePage.jsx';
import Navbar from './components/Navbar.jsx';

// ── Initialise GA4 once at module level ─────────────────────────────
initAnalytics();

// ─────────────────────────────────────────────────────────────────────
// Page-view tracker — fires on every route change
// ─────────────────────────────────────────────────────────────────────
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// ProtectedRoute — wraps routes that require authentication.
// Shows a loading spinner while the session check is in flight;
// redirects to "/" (login) if not authenticated.
// ─────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.centeredLoader}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>Loading…</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// ─────────────────────────────────────────────────────────────────────
// CatchAllRedirect — avoids the double-flash that happens when the generic
// "go to /" redirect triggers LoginPage, which then useEffect-redirects to
// /gallery.  Instead: authenticated → /gallery directly; otherwise → /.
// ─────────────────────────────────────────────────────────────────────
function CatchAllRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; // Wait for session check before redirecting
  return <Navigate to={isAuthenticated ? '/gallery' : '/'} replace />;
}

// ─────────────────────────────────────────────────────────────────────
// App layout — renders Navbar for authenticated pages
// ─────────────────────────────────────────────────────────────────────
function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Show Navbar on all pages except the login screen
  const showNav = isAuthenticated && location.pathname !== '/';

  return (
    <div style={styles.appShell}>
      {showNav && <Navbar />}
      <main style={showNav ? styles.mainWithNav : styles.mainFull}>
        <Routes>
          {/* Screen 1 — Login / Landing */}
          <Route path="/" element={<LoginPage />} />

          {/* Screen 2 — Photo Gallery */}
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <GalleryPage />
              </ProtectedRoute>
            }
          />

          {/* Screen 3 — Voice Recording */}
          <Route
            path="/record"
            element={
              <ProtectedRoute>
                <VoiceRecordPage />
              </ProtectedRoute>
            }
          />

          {/* Screen 4 — Photo Processing Results */}
          <Route
            path="/results/:photoId"
            element={
              <ProtectedRoute>
                <PhotoResultsPage />
              </ProtectedRoute>
            }
          />

          {/* Screen 5 — Journal / Timeline */}
          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <JournalPage />
              </ProtectedRoute>
            }
          />

          {/* Screen 6 — Database View */}
          <Route
            path="/database"
            element={
              <ProtectedRoute>
                <DatabasePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — authenticated users go to gallery; others go to login */}
          <Route
            path="*"
            element={<CatchAllRedirect />}
          />
        </Routes>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Root App component
// ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageTracker />
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

// ── Inline styles ────────────────────────────────────────────────────
const styles = {
  appShell: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  mainWithNav: {
    flex: 1,
    paddingTop: '52px',
  },
  mainFull: {
    flex: 1,
  },
  centeredLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--color-border)',
    borderTop: '3px solid var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
