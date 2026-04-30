/**
 * env.js — Central environment variable configuration and validation.
 *
 * Loads .env, defines typed accessors, and validates required variables at
 * startup so the server fails fast with a clear message rather than
 * crashing silently at runtime.
 */

'use strict';

const path = require('path');

// Look for .env in the repo root (one level above server/).
// Falls back to cwd if not found there, which handles edge cases
// such as running `node server/index.js` from the monorepo root.
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
});

// ─────────────────────────────────────────────
// Required variables — the server will not start without these.
// ─────────────────────────────────────────────
const REQUIRED_VARS = [
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
];

// ─────────────────────────────────────────────
// Validation — log warnings for missing vars so callers
// can still import the config during local development
// even if some Google Cloud credentials are absent.
// ─────────────────────────────────────────────
const missingVars = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(
    `[env] WARNING: The following environment variables are not set:\n` +
      missingVars.map((v) => `  • ${v}`).join('\n') +
      `\nSome features will be unavailable until these are configured.\n` +
      `See .env.example for setup instructions.`
  );
}

/**
 * Central config object — import this everywhere instead of
 * reading process.env directly, so you have one place to look.
 */
const config = {
  // ── Server ──────────────────────────────────
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // ── Session ─────────────────────────────────
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',

  // ── Google OAuth ────────────────────────────
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  /** Full callback URL registered in Google Cloud Console */
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || 8080}/auth/callback`,

  // ── Gemini ──────────────────────────────────
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  /** Gemini model to use for all inference calls */
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

  // ── Firestore ───────────────────────────────
  /** GCP project ID — required for Firestore + Logging in production */
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  /** Path to a service-account JSON keyfile (local dev only) */
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  // ── Cloud Storage ───────────────────────────
  /** GCS bucket where user audio recordings are stored */
  gcsBucket: process.env.GCS_BUCKET_NAME || '',

  // ── Frontend ────────────────────────────────
  /** Deployed URL of the React SPA (used for CORS allow-list) */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Google Analytics ────────────────────────
  ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',

  // ── Cloud Logging ───────────────────────────
  /** Name of the log stream written to Cloud Logging */
  cloudLogName: process.env.CLOUD_LOG_NAME || 'memory-weaver',

  // ── Firestore ────────────────────────────────
  // Named database ID — leave blank to use the '(default)' database.
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || '',

  // ── Dev bypass ──────────────────────────────
  // When true (and NODE_ENV !== production), enables GET /auth/dev-login
  // so all screens can be tested without real Google OAuth credentials.
  // Never active in production regardless of this flag.
  devBypassAuth: process.env.DEV_BYPASS_AUTH === 'true',
};

module.exports = config;
