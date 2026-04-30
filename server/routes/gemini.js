/**
 * routes/gemini.js — Gemini API processing endpoints.
 *
 * Endpoints:
 *   POST /api/gemini/photo   — Analyze a single photo with Gemini → XXX
 *   POST /api/gemini/audio   — Process audio with Gemini → YYY
 *   POST /api/gemini/combine — Combine XXX + YYY into narrative ZZZ
 */

'use strict';

const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { analyzePhoto, processAudio, combineOutputs } = require('../services/geminiService');
const {
  savePhotoResult,
  saveAudioResult,
  saveCombinedResult,
} = require('../services/firestoreService');
const { uploadAudio } = require('../services/storageService');
const { downloadPhotoBytes } = require('../services/photosService');
const { logSuccess, logError } = require('../services/loggingService');

const router = express.Router();

// Multer configuration — stores uploaded audio in memory (max 20 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// All Gemini routes require authentication
router.use(requireAuth);

/**
 * POST /api/gemini/photo
 * Analyzes a single Google Photos image with Gemini.
 *
 * Request body (JSON):
 *   { photoUrl: string, imageData?: string (base64), mimeType?: string }
 *
 * Response:
 *   { outputXXX: string, firestoreId: string }
 */
router.post('/photo', async (req, res, next) => {
  const userId = req.user.sub;
  const { photoUrl, imageData, mimeType, driveFileId } = req.body;
  const axios = require('axios');

  if (!photoUrl) {
    return res.status(400).json({ error: 'photoUrl is required.' });
  }

  try {
    let imageBytes;

    if (imageData) {
      // Caller supplied base64-encoded image data directly
      imageBytes = Buffer.from(imageData, 'base64');
    } else if (driveFileId) {
      // Download from Google Drive using the session access token
      const accessToken = req.tokens?.access_token;
      if (!accessToken) throw new Error('No access token for Drive download.');
      const driveRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer' }
      );
      imageBytes = Buffer.from(driveRes.data);
    } else {
      // Download the image from a plain URL (uploaded files served by our own server)
      imageBytes = await downloadPhotoBytes(photoUrl);
    }

    // Analyse with Gemini → XXX
    const outputXXX = await analyzePhoto(imageBytes, mimeType || 'image/jpeg', userId);

    // Persist to Firestore
    const firestoreId = await savePhotoResult({ userId, photoUrl, outputXXX });

    logSuccess('API_Gemini_Photo', '/api/gemini/photo', userId);
    res.json({ outputXXX, firestoreId });
  } catch (err) {
    logError('API_Gemini_Photo', '/api/gemini/photo', userId, err.message);
    next(err);
  }
});

/**
 * POST /api/gemini/audio
 * Processes an audio recording with Gemini.
 *
 * Accepts multipart/form-data with field:
 *   audio — the audio file blob (webm, ogg, wav, mp4)
 *
 * Optional form fields:
 *   linkedPhotoUrl — URL of the photo this audio memo is paired with
 *
 * Response:
 *   { outputYYY: string, audioUrl: string, firestoreId: string }
 */
router.post('/audio', upload.single('audio'), async (req, res, next) => {
  const userId = req.user.sub;

  if (!req.file) {
    return res.status(400).json({ error: 'An audio file is required (field name: "audio").' });
  }

  const { linkedPhotoUrl } = req.body;
  const { buffer, mimetype } = req.file;

  try {
    // Upload to Cloud Storage (or get data-URI fallback)
    const audioUrl = await uploadAudio(buffer, mimetype, userId);

    // Process with Gemini → YYY
    const outputYYY = await processAudio(buffer, mimetype, userId);

    // Persist to Firestore
    const firestoreId = await saveAudioResult({
      userId,
      audioUrl,
      outputYYY,
      linkedPhotoUrl: linkedPhotoUrl || '',
    });

    logSuccess('API_Gemini_Audio', '/api/gemini/audio', userId);
    res.json({ outputYYY, audioUrl, firestoreId });
  } catch (err) {
    logError('API_Gemini_Audio', '/api/gemini/audio', userId, err.message);
    next(err);
  }
});

/**
 * POST /api/gemini/combine
 * Combines a photo analysis (XXX) and audio summary (YYY) into
 * a cohesive memory narrative (ZZZ).
 *
 * Request body (JSON):
 *   {
 *     outputXXX: string,
 *     outputYYY: string,
 *     photoUrl:  string,
 *     audioUrl:  string
 *   }
 *
 * Response:
 *   { outputZZZ: string, firestoreId: string }
 */
router.post('/combine', async (req, res, next) => {
  const userId = req.user.sub;
  const { outputXXX, outputYYY, photoUrl, audioUrl } = req.body;

  if (!outputXXX || !outputYYY) {
    return res.status(400).json({ error: 'outputXXX and outputYYY are required.' });
  }

  try {
    // Generate combined narrative → ZZZ
    const outputZZZ = await combineOutputs(outputXXX, outputYYY, userId);

    // Persist to Firestore
    const firestoreId = await saveCombinedResult({
      userId,
      photoUrl: photoUrl || '',
      audioUrl: audioUrl || '',
      outputXXX,
      outputYYY,
      outputZZZ,
    });

    logSuccess('API_Gemini_Combine', '/api/gemini/combine', userId);
    res.json({ outputZZZ, firestoreId });
  } catch (err) {
    logError('API_Gemini_Combine', '/api/gemini/combine', userId, err.message);
    next(err);
  }
});

module.exports = router;
