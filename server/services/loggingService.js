/**
 * loggingService.js — Unified logging layer for MemoryWeaver.
 *
 * Wraps @google-cloud/logging so that every API call (Google Photos,
 * Gemini, Firestore, Cloud Storage) is recorded with a consistent
 * schema: { action, endpoint, success, timestamp, userId?, meta? }.
 *
 * Falls back to console.log when Cloud Logging is not configured
 * (e.g. local development without GCP credentials), so the app
 * always runs.
 */

'use strict';

const config = require('../config/env');

// ── Try to initialise the Google Cloud Logging client ───────────────
let cloudLogger = null;

if (config.gcpProjectId && config.isProduction) {
  try {
    const { Logging } = require('@google-cloud/logging');
    const loggingClient = new Logging({ projectId: config.gcpProjectId });
    cloudLogger = loggingClient.log(config.cloudLogName);
    console.log('[loggingService] Google Cloud Logging initialised.');
  } catch (err) {
    console.warn('[loggingService] Cloud Logging init failed — using console fallback.', err.message);
  }
} else {
  console.log('[loggingService] Cloud Logging disabled (dev mode or no GCP_PROJECT_ID). Using console.');
}

/**
 * Writes a structured log entry.
 *
 * @param {object} params
 * @param {string} params.action    - Human label, e.g. "Gemini_Photo_Process"
 * @param {string} params.endpoint  - API endpoint or service URL called
 * @param {boolean} params.success  - Whether the call succeeded
 * @param {string} [params.userId]  - Authenticated user identifier
 * @param {object} [params.meta]    - Any extra key/value pairs to include
 * @param {'INFO'|'WARNING'|'ERROR'} [params.severity] - Log severity
 */
async function logEvent({ action, endpoint, success, userId = 'anonymous', meta = {}, severity = 'INFO' }) {
  const entry = {
    action,
    endpoint,
    success,
    userId,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // ── Console log (always) ─────────────────────────────────────────
  const label = success ? '✓' : '✗';
  console.log(`[${severity}] ${label} ${action} | ${endpoint} | user:${userId}`, meta);

  // ── Cloud Logging (production) ───────────────────────────────────
  if (cloudLogger) {
    try {
      const metadata = { severity, resource: { type: 'global' } };
      const cloudEntry = cloudLogger.entry(metadata, entry);
      await cloudLogger.write(cloudEntry);
    } catch (err) {
      console.error('[loggingService] Failed to write to Cloud Logging:', err.message);
    }
  }
}

/**
 * Convenience: log a successful event.
 */
function logSuccess(action, endpoint, userId, meta) {
  return logEvent({ action, endpoint, success: true, userId, meta, severity: 'INFO' });
}

/**
 * Convenience: log a failed event.
 */
function logError(action, endpoint, userId, errorMsg, meta = {}) {
  return logEvent({
    action,
    endpoint,
    success: false,
    userId,
    meta: { error: errorMsg, ...meta },
    severity: 'ERROR',
  });
}

module.exports = { logEvent, logSuccess, logError };
