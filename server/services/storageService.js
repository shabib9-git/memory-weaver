/**
 * storageService.js — Google Cloud Storage integration for MemoryWeaver.
 *
 * Handles upload of user-recorded audio blobs to a GCS bucket so they
 * have a persistent URL that can be stored in Firestore and replayed
 * in the journal view.
 *
 * Setup:
 *   1. Create a GCS bucket in your GCP project.
 *   2. Set GCS_BUCKET_NAME in .env.
 *   3. Grant the service account "Storage Object Admin" on the bucket.
 */

'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { logSuccess, logError } = require('./loggingService');

// ── Lazily initialise Cloud Storage client ───────────────────────────
let storageBucket = null;

function getBucket() {
  if (storageBucket) return storageBucket;

  if (!config.gcsBucket) {
    console.warn('[storageService] GCS_BUCKET_NAME not set — audio will not be persisted to Cloud Storage.');
    return null;
  }

  try {
    const { Storage } = require('@google-cloud/storage');
    const storageOptions = {};
    if (config.gcpProjectId) storageOptions.projectId = config.gcpProjectId;
    if (config.googleApplicationCredentials) storageOptions.keyFilename = config.googleApplicationCredentials;

    const storageClient = new Storage(storageOptions);
    storageBucket = storageClient.bucket(config.gcsBucket);
    console.log(`[storageService] Cloud Storage bucket "${config.gcsBucket}" ready.`);
  } catch (err) {
    console.warn('[storageService] Cloud Storage init failed:', err.message);
  }

  return storageBucket;
}

/**
 * Uploads an audio buffer to Cloud Storage and returns the public URL.
 *
 * Files are stored under: audio/<userId>/<uuid>.<ext>
 *
 * @param {Buffer} audioBuffer   - Raw audio bytes
 * @param {string} mimeType      - MIME type, e.g. "audio/webm"
 * @param {string} userId        - User identifier for path namespacing
 * @returns {Promise<string>}    - Public HTTPS URL of the uploaded file
 */
async function uploadAudio(audioBuffer, mimeType, userId) {
  const bucket = getBucket();

  // ── Fallback: return a data-URI when GCS is not configured ──────
  if (!bucket) {
    console.warn('[storageService] Returning data-URI as GCS fallback.');
    const dataUri = `data:${mimeType};base64,${audioBuffer.toString('base64')}`;
    return dataUri;
  }

  // Derive a file extension from MIME type
  const extMap = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  const ext = extMap[mimeType] || 'bin';
  const fileName = `audio/${userId}/${uuidv4()}.${ext}`;

  try {
    const file = bucket.file(fileName);
    await file.save(audioBuffer, {
      metadata: { contentType: mimeType },
      resumable: false,
    });

    // Return a backend proxy path — the bucket uses uniform IAM access control
    // so per-object ACLs (makePublic) are not allowed. Audio is served via
    // GET /api/audio/stream?file=<fileName> which fetches from GCS server-side.
    const proxyUrl = `/api/audio/stream?file=${encodeURIComponent(fileName)}`;
    logSuccess('CloudStorage_Upload', 'audio', userId, { fileName });
    return proxyUrl;
  } catch (err) {
    logError('CloudStorage_Upload', 'audio', userId, err.message);
    throw new Error(`Audio upload failed: ${err.message}`);
  }
}

module.exports = { uploadAudio };
