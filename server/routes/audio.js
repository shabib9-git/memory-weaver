'use strict';

/**
 * audio.js — Routes for audio file streaming from Google Cloud Storage.
 *
 * GET /api/audio/stream?file=<gcsPath>
 *   Proxies a private GCS audio file to the authenticated browser.
 *   Requires the user to be logged in (session-checked by requireAuth).
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const config = require('../config/env');

router.get('/stream', requireAuth, async (req, res, next) => {
  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'file parameter required' });

  // Basic path traversal guard
  if (file.includes('..') || file.startsWith('/')) {
    return res.status(400).json({ error: 'invalid file path' });
  }

  if (!config.gcsBucket) {
    return res.status(503).json({ error: 'Cloud Storage not configured' });
  }

  try {
    const { Storage } = require('@google-cloud/storage');
    const storageOptions = {};
    if (config.gcpProjectId) storageOptions.projectId = config.gcpProjectId;
    if (config.googleApplicationCredentials) storageOptions.keyFilename = config.googleApplicationCredentials;

    const storage = new Storage(storageOptions);
    const gcsFile = storage.bucket(config.gcsBucket).file(file);

    const [metadata] = await gcsFile.getMetadata();
    res.set('Content-Type', metadata.contentType || 'audio/webm');
    res.set('Cache-Control', 'private, max-age=3600');

    gcsFile.createReadStream()
      .on('error', next)
      .pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
