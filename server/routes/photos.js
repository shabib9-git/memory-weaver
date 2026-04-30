/**
 * routes/photos.js — Photo retrieval and upload endpoints.
 *
 * Endpoints:
 *   GET  /api/photos           — Lists user's photos from Google Drive (images)
 *   POST /api/photos/process   — Processes a batch with Gemini
 *   POST /api/photos/upload    — Direct file upload fallback
 *   POST /api/photos/sync      — Downloads + analyses selected Drive photos
 *   GET  /api/photos/uploads/:filename — Serves uploaded/cached photo files
 */

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { fetchUserPhotos } = require('../services/photosService');
const { analyzePhoto } = require('../services/geminiService');
const { getProcessedPhotoUrls, savePhotoResult } = require('../services/firestoreService');
const { downloadPhotoBytes } = require('../services/photosService');
const { logSuccess, logError } = require('../services/loggingService');

const router = express.Router();

// ── Multer config: store uploads in server/uploads/ ──────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  },
});

// All photo routes require authentication
router.use(requireAuth);

/**
 * GET /api/photos
 * Lists image files from the user's Google Drive using the session
 * access token (drive.readonly scope).  Returns the same shape as the
 * old Google Photos endpoint so the frontend needs no changes.
 *
 * Query params:
 *   pageToken — Drive API nextPageToken for pagination
 *   pageSize  — number of files to return (default 50)
 */
router.get('/', async (req, res, next) => {
  const { pageToken, pageSize = 50 } = req.query;
  const userId = req.user.sub;
  const accessToken = req.tokens?.access_token;
  const axios = require('axios');

  if (!accessToken) {
    return res.status(401).json({ error: 'token_expired', message: 'No access token.' });
  }

  try {
    // Query Drive for image files (JPEG, PNG, HEIC, WebP, GIF)
    const params = new URLSearchParams({
      q: "mimeType contains 'image/' and trashed = false and 'me' in owners",
      fields: 'nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink)',
      pageSize: Math.min(parseInt(pageSize, 10) || 50, 100),
      orderBy: 'modifiedTime desc',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const driveRes = await axios.get(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const processedUrls = await getProcessedPhotoUrls(userId);

    // Map Drive files to the same shape the frontend already expects
    const photos = (driveRes.data.files || []).map((f) => {
      const baseUrl = `/api/photos/drive/${f.id}`;
      return {
        id: f.id,
        baseUrl,
        filename: f.name,
        mimeType: f.mimeType,
        thumbnailUrl: f.thumbnailLink || baseUrl,
        processed: processedUrls.has(baseUrl),
        source: 'drive',
      };
    });

    logSuccess('Photos_List', '/api/photos', userId, { count: photos.length });
    res.json({
      photos,
      nextPageToken: driveRes.data.nextPageToken || null,
      totalFetched: photos.length,
      processedCount: photos.filter((p) => p.processed).length,
    });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'token_expired', message: 'Drive token expired.' });
    }
    logError('Photos_List', '/api/photos', userId, err.message);
    next(err);
  }
});

/**
 * GET /api/photos/drive/:fileId
 * Proxies a Drive file download so the SPA can display thumbnails
 * without exposing the user's access token to the browser.
 */
router.get('/drive/:fileId', async (req, res, next) => {
  const accessToken = req.tokens?.access_token;
  const axios = require('axios');
  if (!accessToken) return res.status(401).json({ error: 'token_expired' });

  const { thumb } = req.query; // ?thumb=1 → serve Drive thumbnail (fast, low-res)
  try {
    let url;
    if (thumb) {
      // Drive Files.get with fields=thumbnailLink returns a ~220px JPEG — fast for galleries.
      const meta = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${req.params.fileId}?fields=thumbnailLink`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const thumbUrl = meta.data.thumbnailLink;
      if (thumbUrl) {
        // Bump resolution: replace the default size param with a larger one
        url = thumbUrl.replace(/=s\d+$/, '=s400');
      }
    }
    if (!url) {
      url = `https://www.googleapis.com/drive/v3/files/${req.params.fileId}?alt=media`;
    }

    const driveRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });
    res.set('Content-Type', driveRes.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(driveRes.data));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/photos/process
 * Processes a list of photo URLs with Gemini and saves the results to Firestore.
 *
 * Request body:
 *   { photos: [{ id, baseUrl, mimeType }] }
 *
 * Response:
 *   { results: [{ photoId, photoUrl, outputXXX, firestoreId }] }
 */
router.post('/process', async (req, res, next) => {
  const userId = req.user.sub;
  const { photos } = req.body;

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'photos array is required in the request body.' });
  }

  // Cap batch size to avoid very long-running requests
  const MAX_BATCH = 10;
  const batch = photos.slice(0, MAX_BATCH);

  const results = [];
  const errors = [];

  const axios = require('axios');
  const accessToken = req.tokens?.access_token;

  for (const photo of batch) {
    try {
      let imageBytes;
      if (photo.source === 'drive' && photo.id && accessToken) {
        // Download from Google Drive using session token
        const driveRes = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer' }
        );
        imageBytes = Buffer.from(driveRes.data);
      } else {
        imageBytes = await downloadPhotoBytes(photo.baseUrl);
      }

      // Analyse with Gemini → XXX
      const outputXXX = await analyzePhoto(imageBytes, photo.mimeType || 'image/jpeg', userId);

      // Save to Firestore
      const firestoreId = await savePhotoResult({
        userId,
        photoUrl: photo.baseUrl,
        photoId: photo.id,
        outputXXX,
      });

      results.push({
        photoId: photo.id,
        photoUrl: photo.baseUrl,
        outputXXX,
        firestoreId,
      });
    } catch (err) {
      logError('Photos_Process', '/api/photos/process', userId, err.message, { photoId: photo.id });
      errors.push({ photoId: photo.id, error: err.message });
    }
  }

  logSuccess('Photos_Process', '/api/photos/process', userId, {
    processed: results.length,
    failed: errors.length,
  });

  res.json({
    results,
    errors,
    processedCount: results.length,
    errorCount: errors.length,
  });
});

/**
 * POST /api/photos/upload
 *
 * Direct file-upload fallback — used when the Google Photos Library API is
 * unavailable (e.g. unverified apps).  Accepts up to 10 image files,
 * stores them locally, and immediately runs Gemini analysis on each one.
 *
 * Form field name: "photos"  (multipart/form-data)
 *
 * Response: same shape as /api/photos/process
 */
router.post('/upload', upload.array('photos', 10), async (req, res, next) => {
  const userId = req.user.sub;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files received.' });
  }

  // Process all files in parallel for speed (max 10 enforced by multer above)
  const settled = await Promise.allSettled(
    req.files.map(async (file) => {
      const imageBytes = fs.readFileSync(file.path);
      const localUrl = `/api/photos/uploads/${file.filename}`;
      const outputXXX = await analyzePhoto(imageBytes, file.mimetype, userId);
      const firestoreId = await savePhotoResult({
        userId,
        photoUrl: localUrl,
        photoId: file.filename,
        outputXXX,
        source: 'upload',
        originalName: file.originalname,
      });
      logSuccess('Photos_Upload', '/api/photos/upload', userId, { filename: file.filename });
      return { photoId: file.filename, photoUrl: localUrl, originalName: file.originalname, outputXXX, firestoreId };
    })
  );

  const results = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const errors = settled
    .filter((r) => r.status === 'rejected')
    .map((r, i) => ({ file: req.files[i]?.originalname, error: r.reason?.message }));

  if (errors.length) logError('Photos_Upload', '/api/photos/upload', userId, `${errors.length} files failed`);

  res.json({ results, errors, processedCount: results.length, errorCount: errors.length });
});

/**
 * GET /api/photos/uploads/:filename
 * Serves locally-uploaded photo files so the SPA can display them.
 */
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
  res.sendFile(filePath);
});

/**
 * POST /api/photos/picker
 *
 * Called after the user selects photos via the Google Picker API (client-side).
 * Receives an array of Drive file objects, downloads each via the Drive API
 * using the user's access token, runs Gemini analysis, and saves to Firestore.
 *
 * Request body:
 *   { files: [{ id, name, mimeType }] }
 *
 * Response: same shape as /api/photos/upload
 */
router.post('/picker', async (req, res, next) => {
  const userId = req.user.sub;
  const { files } = req.body;
  const axios = require('axios');

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required.' });
  }

  // Prefer the short-lived Picker token from the request body (fresher),
  // fall back to the session OAuth token
  const accessToken = req.body.accessToken || req.tokens?.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: 'token_expired', message: 'No access token. Please sign in again.' });
  }

  const settled = await Promise.allSettled(
    files.slice(0, 10).map(async (file) => {
      // Download file bytes from Google Drive
      const driveRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer' }
      );
      const imageBytes = Buffer.from(driveRes.data);
      const localUrl = `/api/photos/uploads/picker-${file.id}-${file.name}`;

      // Analyse with Gemini → XXX
      const outputXXX = await analyzePhoto(imageBytes, file.mimeType || 'image/jpeg', userId);

      // Save to Firestore
      const firestoreId = await savePhotoResult({
        userId,
        photoUrl: localUrl,
        photoId: file.id,
        outputXXX,
        source: 'picker',
        originalName: file.name,
      });

      // Cache the file locally so the gallery thumbnail works
      const cachePath = path.join(UPLOADS_DIR, `picker-${file.id}-${file.name}`);
      fs.writeFileSync(cachePath, imageBytes);

      logSuccess('Photos_Picker', '/api/photos/picker', userId, { name: file.name });
      return { photoId: file.id, photoUrl: localUrl, originalName: file.name, outputXXX, firestoreId };
    })
  );

  const results = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const errors = settled
    .filter((r) => r.status === 'rejected')
    .map((r, i) => ({ file: files[i]?.name, error: r.reason?.message }));

  res.json({ results, errors, processedCount: results.length, errorCount: errors.length });
});

module.exports = router;
