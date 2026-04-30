/**
 * firestoreService.js — Firestore data-access layer for MemoryWeaver.
 *
 * All reads/writes to Cloud Firestore go through this module.
 * Collections:
 *   • photoResults   — Gemini image-analysis output (XXX)
 *   • audioResults   — Gemini audio transcription/summary (YYY)
 *   • combinedResults— Gemini combined narrative (ZZZ)
 *
 * Document key convention: SHA-256 of the photoUrl / audioUrl ensures
 * idempotent writes and easy deduplication.
 */

'use strict';

const crypto = require('crypto');
const config = require('../config/env');
const { logSuccess, logError } = require('./loggingService');

// ── Initialise Firestore client ──────────────────────────────────────
let db = null;

/** Returns a hash-based safe Firestore document ID from any URL string. */
function urlToDocId(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Lazily initialises the Firestore client on first call.
 * Returns null if credentials are not available (dev / CI).
 */
function getDb() {
  if (db) return db;

  try {
    const { Firestore } = require('@google-cloud/firestore');
    const options = {};
    if (config.gcpProjectId) options.projectId = config.gcpProjectId;
    // Use the named database if specified; otherwise falls back to '(default)'
    if (config.firestoreDatabaseId) options.databaseId = config.firestoreDatabaseId;
    if (config.googleApplicationCredentials) {
      options.keyFilename = config.googleApplicationCredentials;
    }
    db = new Firestore(options);
    console.log('[firestoreService] Firestore client initialised.');
  } catch (err) {
    console.warn('[firestoreService] Firestore init failed — running in stub mode.', err.message);
  }
  return db;
}

// ─────────────────────────────────────────────────────────────────────
// Photo Results  (XXX)
// ─────────────────────────────────────────────────────────────────────

/**
 * Saves a Gemini photo-analysis result to Firestore.
 *
 * @param {object} data
 * @param {string} data.userId    - Authenticated user's Google sub/ID
 * @param {string} data.photoUrl  - Original Google Photos media URL
 * @param {string} data.outputXXX - Gemini image-analysis text
 * @param {string} [data.photoId] - Google Photos media item ID
 * @returns {Promise<string>} The Firestore document ID written
 */
async function savePhotoResult(data) {
  const firestore = getDb();
  const docId = urlToDocId(data.photoUrl);

  if (!firestore) {
    console.warn('[firestoreService] savePhotoResult called but Firestore is not available.');
    return docId;
  }

  const doc = {
    userId: data.userId,
    photoUrl: data.photoUrl,
    photoId: data.photoId || '',
    source: data.source || 'unknown',
    originalName: data.originalName || '',
    outputXXX: data.outputXXX,
    processedAt: new Date().toISOString(),
  };

  await firestore.collection('photoResults').doc(docId).set(doc, { merge: true });
  logSuccess('Firestore_Add', 'photoResults', data.userId, { docId });
  return docId;
}

/**
 * Returns the set of photoUrls that already have a stored result for
 * a given user.  Used in Step 3a (deduplication).
 *
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
async function getProcessedPhotoUrls(userId) {
  const firestore = getDb();
  if (!firestore) return new Set();

  const snapshot = await firestore
    .collection('photoResults')
    .where('userId', '==', userId)
    .select('photoUrl')
    .get();

  const urls = new Set();
  snapshot.forEach((doc) => urls.add(doc.data().photoUrl));
  logSuccess('Firestore_Query', 'photoResults', userId, { count: urls.size });
  return urls;
}

/**
 * Returns all photoResult documents for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function getPhotoResults(userId) {
  const firestore = getDb();
  if (!firestore) return [];

  const snapshot = await firestore
    .collection('photoResults')
    .where('userId', '==', userId)
    .orderBy('processedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────────────────────────────────
// Audio Results  (YYY)
// ─────────────────────────────────────────────────────────────────────

/**
 * Saves a Gemini audio-processing result to Firestore.
 *
 * @param {object} data
 * @param {string} data.userId    - Authenticated user's Google sub/ID
 * @param {string} data.audioUrl  - Cloud Storage URL of the audio file
 * @param {string} data.outputYYY - Gemini transcription + summary text
 * @param {string} [data.linkedPhotoUrl] - Optional photo this audio is paired with
 * @returns {Promise<string>} Firestore document ID
 */
async function saveAudioResult(data) {
  const firestore = getDb();
  const docId = urlToDocId(data.audioUrl);

  if (!firestore) {
    console.warn('[firestoreService] saveAudioResult called but Firestore is not available.');
    return docId;
  }

  const doc = {
    userId: data.userId,
    audioUrl: data.audioUrl,
    outputYYY: data.outputYYY,
    linkedPhotoUrl: data.linkedPhotoUrl || '',
    processedAt: new Date().toISOString(),
  };

  await firestore.collection('audioResults').doc(docId).set(doc, { merge: true });
  logSuccess('Firestore_Add', 'audioResults', data.userId, { docId });
  return docId;
}

/**
 * Returns all audioResult documents for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function getAudioResults(userId) {
  const firestore = getDb();
  if (!firestore) return [];

  const snapshot = await firestore
    .collection('audioResults')
    .where('userId', '==', userId)
    .orderBy('processedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────────────────────────────────
// Combined Results  (ZZZ)
// ─────────────────────────────────────────────────────────────────────

/**
 * Saves a combined narrative (ZZZ) to Firestore.
 *
 * @param {object} data
 * @param {string} data.userId       - Authenticated user's ID
 * @param {string} data.photoUrl     - Source photo URL
 * @param {string} data.audioUrl     - Source audio URL
 * @param {string} data.outputXXX    - Photo-analysis output used
 * @param {string} data.outputYYY    - Audio-analysis output used
 * @param {string} data.outputZZZ    - Combined narrative
 * @returns {Promise<string>} Firestore document ID
 */
async function saveCombinedResult(data) {
  const firestore = getDb();
  const docId = urlToDocId(`${data.photoUrl}::${data.audioUrl}`);

  if (!firestore) {
    console.warn('[firestoreService] saveCombinedResult called but Firestore is not available.');
    return docId;
  }

  const doc = {
    userId: data.userId,
    photoUrl: data.photoUrl,
    audioUrl: data.audioUrl,
    outputXXX: data.outputXXX,
    outputYYY: data.outputYYY,
    outputZZZ: data.outputZZZ,
    processedAt: new Date().toISOString(),
  };

  await firestore.collection('combinedResults').doc(docId).set(doc, { merge: true });
  logSuccess('Firestore_Add', 'combinedResults', data.userId, { docId });
  return docId;
}

/**
 * Returns all combinedResult documents for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function getCombinedResults(userId) {
  const firestore = getDb();
  if (!firestore) return [];

  const snapshot = await firestore
    .collection('combinedResults')
    .where('userId', '==', userId)
    .orderBy('processedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────────────────────────────────
// Admin / Demo query — returns raw collection data for the DB view
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns a sample of each collection for the admin/database-view screen.
 * Limited to 20 docs per collection to avoid large payloads.
 *
 * @returns {Promise<object>}
 */
async function getAdminSample() {
  const firestore = getDb();
  if (!firestore) {
    return { photoResults: [], audioResults: [], combinedResults: [], note: 'Firestore not configured' };
  }

  const [photoSnap, audioSnap, combinedSnap] = await Promise.all([
    firestore.collection('photoResults').limit(20).get(),
    firestore.collection('audioResults').limit(20).get(),
    firestore.collection('combinedResults').limit(20).get(),
  ]);

  return {
    photoResults: photoSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    audioResults: audioSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    combinedResults: combinedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

/**
 * Deletes a photoResult document by Firestore document ID.
 * Verifies ownership before deleting to prevent IDOR.
 *
 * @param {string} docId   - Firestore document ID
 * @param {string} userId  - Must match the document's userId field
 */
async function deletePhotoResult(docId, userId) {
  const firestore = getDb();
  if (!firestore) return;
  const ref = firestore.collection('photoResults').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Entry not found.'), { statusCode: 404 });
  if (snap.data().userId !== userId) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
  await ref.delete();
}

/**
 * Deletes an audioResult document by Firestore document ID.
 * Verifies ownership before deleting.
 */
async function deleteAudioResult(docId, userId) {
  const firestore = getDb();
  if (!firestore) return;
  const ref = firestore.collection('audioResults').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Entry not found.'), { statusCode: 404 });
  if (snap.data().userId !== userId) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
  await ref.delete();
}

/**
 * Updates the outputZZZ (narrative) field of a combinedResult document.
 * Verifies ownership before writing.
 *
 * @param {string} docId      - Firestore document ID
 * @param {string} userId     - Must match the document's userId
 * @param {string} newNarrative - Updated narrative text
 */
async function updateCombinedNarrative(docId, userId, newNarrative) {
  const firestore = getDb();
  if (!firestore) return;
  const ref = firestore.collection('combinedResults').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Entry not found.'), { statusCode: 404 });
  if (snap.data().userId !== userId) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
  await ref.update({ outputZZZ: newNarrative, updatedAt: new Date().toISOString() });
  logSuccess('Firestore_Update', 'combinedResults', userId, { docId });
}

/**
 * Deletes a combinedResult document by Firestore document ID.
 * Verifies ownership before deleting.
 */
async function deleteCombinedResult(docId, userId) {
  const firestore = getDb();
  if (!firestore) return;
  const ref = firestore.collection('combinedResults').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Entry not found.'), { statusCode: 404 });
  if (snap.data().userId !== userId) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
  await ref.delete();
}

module.exports = {
  savePhotoResult,
  getProcessedPhotoUrls,
  getPhotoResults,
  saveAudioResult,
  getAudioResults,
  saveCombinedResult,
  getCombinedResults,
  getAdminSample,
  deletePhotoResult,
  deleteAudioResult,
  deleteCombinedResult,
  updateCombinedNarrative,
};
