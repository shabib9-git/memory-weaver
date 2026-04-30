/**
 * analytics.js — Google Analytics 4 integration for MemoryWeaver.
 *
 * Uses react-ga4 which wraps the GA4 gtag.js measurement protocol.
 * All major user interactions send custom events so the GA4 dashboard
 * shows meaningful engagement data.
 *
 * Setup:
 *   1. Create a GA4 property at analytics.google.com.
 *   2. Copy the Measurement ID (G-XXXXXXXXXX).
 *   3. Set VITE_GA4_MEASUREMENT_ID in client/.env.local.
 */

import ReactGA from 'react-ga4';

// ── Measurement ID from environment ─────────────────────────────────
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

/**
 * Initialises GA4.  Safe to call multiple times — react-ga4 de-dupes.
 * Call once from App.jsx on mount.
 */
export function initAnalytics() {
  if (!GA4_ID) {
    console.warn('[analytics] VITE_GA4_MEASUREMENT_ID not set — analytics disabled.');
    return;
  }
  ReactGA.initialize(GA4_ID, {
    gaOptions: { send_page_view: false }, // We send page views manually
  });
  console.log('[analytics] GA4 initialised with ID:', GA4_ID);
}

/**
 * Sends a page-view event to GA4.
 * Call from React Router's useEffect on route change.
 *
 * @param {string} path   - Current pathname, e.g. "/gallery"
 * @param {string} title  - Page title
 */
export function trackPageView(path, title) {
  if (!GA4_ID) return;
  ReactGA.send({ hitType: 'pageview', page: path, title });
}

/**
 * Sends a custom event to GA4.
 *
 * @param {string} category - Event category (e.g. "Photos", "Audio")
 * @param {string} action   - Event action (e.g. "Sync", "Record")
 * @param {string} [label]  - Optional descriptive label
 * @param {number} [value]  - Optional numeric value
 */
export function trackEvent(category, action, label = '', value = undefined) {
  if (!GA4_ID) return;
  ReactGA.event({ category, action, label, value });
}

// ── Pre-defined event helpers ────────────────────────────────────────

/** User completed Google OAuth login. */
export const trackLogin = () => trackEvent('Auth', 'Login', 'Google OAuth');

/** User logged out. */
export const trackLogout = () => trackEvent('Auth', 'Logout');

/** User triggered a Google Photos sync. */
export const trackPhotoSync = (count) => trackEvent('Photos', 'Sync', 'Google Photos', count);

/** User initiated Gemini photo processing. */
export const trackPhotoProcess = (count) => trackEvent('Gemini', 'Photo_Process', 'batch', count);

/** User started an audio recording. */
export const trackRecordStart = () => trackEvent('Audio', 'Record_Start');

/** User stopped recording and sent to Gemini. */
export const trackRecordStop = () => trackEvent('Audio', 'Record_Stop');

/** Audio successfully processed by Gemini. */
export const trackAudioProcess = () => trackEvent('Gemini', 'Audio_Process');

/** Combined narrative generated. */
export const trackCombine = () => trackEvent('Gemini', 'Combine');

/** User viewed the journal. */
export const trackJournalView = (entryCount) =>
  trackEvent('Journal', 'View', 'entries', entryCount);

/** User viewed the database admin screen. */
export const trackDatabaseView = () => trackEvent('Admin', 'Database_View');
