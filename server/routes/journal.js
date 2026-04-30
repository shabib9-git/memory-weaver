/**
 * routes/journal.js — Journal / timeline retrieval endpoints.
 *
 * Endpoints:
 *   GET /api/journal         — Returns all entries for the authenticated user
 *   GET /api/journal/:id     — Returns a single combined entry by docId
 *   DELETE /api/journal/:id  — Removes a photo-result entry (CRUD demo)
 */

'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getPhotoResults,
  getAudioResults,
  getCombinedResults,
  deletePhotoResult,
  deleteAudioResult,
  deleteCombinedResult,
  updateCombinedNarrative,
} = require('../services/firestoreService');
const { logSuccess, logError } = require('../services/loggingService');

const router = express.Router();

// All journal routes require authentication
router.use(requireAuth);

/**
 * GET /api/journal
 * Returns all photo, audio, and combined results for the signed-in user,
 * merged into a unified timeline sorted by processedAt (newest first).
 *
 * Response shape:
 * {
 *   photoResults:    [...],
 *   audioResults:    [...],
 *   combinedResults: [...],
 *   totalEntries: number
 * }
 */
router.get('/', async (req, res, next) => {
  const userId = req.user.sub;
  try {
    // Fetch all three collections in parallel
    const [photoResults, audioResults, combinedResults] = await Promise.all([
      getPhotoResults(userId),
      getAudioResults(userId),
      getCombinedResults(userId),
    ]);

    logSuccess('Firestore_Query', '/api/journal', userId, {
      photos: photoResults.length,
      audio: audioResults.length,
      combined: combinedResults.length,
    });

    res.json({
      photoResults,
      audioResults,
      combinedResults,
      totalEntries: photoResults.length + audioResults.length + combinedResults.length,
    });
  } catch (err) {
    logError('Firestore_Query', '/api/journal', userId, err.message);
    next(err);
  }
});

/**
 * DELETE /api/journal/photo/:docId
 * Deletes a photo-result entry. Ownership is verified in the service layer.
 */
router.delete('/photo/:docId', async (req, res, next) => {
  const userId = req.user.sub;
  const { docId } = req.params;
  try {
    await deletePhotoResult(docId, userId);
    logSuccess('Firestore_Delete', '/api/journal/photo', userId, { docId });
    res.json({ success: true, deletedId: docId });
  } catch (err) {
    logError('Firestore_Delete', '/api/journal/photo', userId, err.message);
    next(err);
  }
});

/**
 * DELETE /api/journal/audio/:docId
 * Deletes an audio-result entry. Ownership is verified in the service layer.
 */
router.delete('/audio/:docId', async (req, res, next) => {
  const userId = req.user.sub;
  const { docId } = req.params;
  try {
    await deleteAudioResult(docId, userId);
    logSuccess('Firestore_Delete', '/api/journal/audio', userId, { docId });
    res.json({ success: true, deletedId: docId });
  } catch (err) {
    logError('Firestore_Delete', '/api/journal/audio', userId, err.message);
    next(err);
  }
});

/**
 * DELETE /api/journal/combined/:docId
 * Deletes a combined-result entry. Ownership is verified in the service layer.
 */
router.delete('/combined/:docId', async (req, res, next) => {
  const userId = req.user.sub;
  const { docId } = req.params;
  try {
    await deleteCombinedResult(docId, userId);
    logSuccess('Firestore_Delete', '/api/journal/combined', userId, { docId });
    res.json({ success: true, deletedId: docId });
  } catch (err) {
    logError('Firestore_Delete', '/api/journal/combined', userId, err.message);
    next(err);
  }
});

/**
 * PUT /api/journal/combined/:docId
 * Updates the outputZZZ narrative of a combined entry.
 * Body: { narrative: string }
 */
router.put('/combined/:docId', async (req, res, next) => {
  const userId = req.user.sub;
  const { docId } = req.params;
  const { narrative } = req.body;
  if (typeof narrative !== 'string' || !narrative.trim()) {
    return res.status(400).json({ error: 'narrative must be a non-empty string' });
  }
  try {
    await updateCombinedNarrative(docId, userId, narrative.trim());
    logSuccess('Firestore_Update', '/api/journal/combined', userId, { docId });
    res.json({ success: true, docId, narrative: narrative.trim() });
  } catch (err) {
    logError('Firestore_Update', '/api/journal/combined', userId, err.message);
    next(err);
  }
});

module.exports = router;
