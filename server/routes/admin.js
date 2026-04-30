/**
 * routes/admin.js — Admin / database-view endpoints (Screen 6).
 *
 * Provides a demo-safe read of raw Firestore data to satisfy the
 * "Google Database" assignment requirement and Screen 6 (DB View).
 *
 * Endpoints:
 *   GET /api/admin/database  — Returns a sample of each Firestore collection
 *   GET /api/admin/health    — Quick health check / service status
 */

'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getAdminSample } = require('../services/firestoreService');
const { logSuccess, logError } = require('../services/loggingService');
const config = require('../config/env');

const router = express.Router();

// Admin routes require authentication
router.use(requireAuth);

/**
 * GET /api/admin/database
 * Returns a sample of data from each Firestore collection so the
 * Database View (Screen 6) can render the stored document structure.
 *
 * Limited to 20 docs per collection to prevent large payloads.
 */
router.get('/database', async (req, res, next) => {
  const userId = req.user.sub;
  try {
    const sample = await getAdminSample();
    logSuccess('Admin_DBView', '/api/admin/database', userId);
    res.json({
      collections: {
        photoResults: {
          description: 'Gemini photo analysis results (XXX)',
          count: sample.photoResults.length,
          schema: { userId: 'string', photoUrl: 'string', outputXXX: 'string', processedAt: 'ISO timestamp' },
          documents: sample.photoResults,
        },
        audioResults: {
          description: 'Gemini audio transcription/summary results (YYY)',
          count: sample.audioResults.length,
          schema: { userId: 'string', audioUrl: 'string', outputYYY: 'string', linkedPhotoUrl: 'string', processedAt: 'ISO timestamp' },
          documents: sample.audioResults,
        },
        combinedResults: {
          description: 'Gemini combined memory narrative results (ZZZ)',
          count: sample.combinedResults.length,
          schema: { userId: 'string', photoUrl: 'string', audioUrl: 'string', outputXXX: 'string', outputYYY: 'string', outputZZZ: 'string', processedAt: 'ISO timestamp' },
          documents: sample.combinedResults,
        },
      },
      note: sample.note || null,
    });
  } catch (err) {
    logError('Admin_DBView', '/api/admin/database', userId, err.message);
    next(err);
  }
});

/**
 * GET /api/admin/health
 * Returns the health/status of all dependent services.
 * Useful for CI / deployment readiness checks.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: config.geminiApiKey ? 'configured' : 'NOT CONFIGURED — set GEMINI_API_KEY',
      googleOAuth:
        config.googleClientId && config.googleClientSecret
          ? 'configured'
          : 'NOT CONFIGURED — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
      firestore: config.gcpProjectId ? 'configured' : 'NOT CONFIGURED — set GCP_PROJECT_ID',
      cloudStorage: config.gcsBucket ? 'configured' : 'NOT CONFIGURED — set GCS_BUCKET_NAME',
      cloudLogging: config.gcpProjectId && config.isProduction ? 'enabled' : 'console-only (dev)',
    },
  });
});

module.exports = router;
