/**
 * api.js — Centralised HTTP service layer for the MemoryWeaver SPA.
 *
 * All fetch calls to the Express backend go through this module so
 * error handling, base URL configuration, and request shaping live
 * in one place.
 *
 * Uses axios with credentials: 'include' so the session cookie is
 * sent on every cross-origin request (required for auth middleware).
 */

import axios from 'axios';

// ── Axios instance ───────────────────────────────────────────────────
// In development, Vite proxies /api → localhost:8080 so the base URL
// is just empty string.  In production the SPA is served by Express
// on the same origin, so /api paths work directly.
const api = axios.create({
  baseURL: '',
  withCredentials: true,         // Send session cookies on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,                // 60 s timeout for Gemini inference calls
});

// ── Response interceptor — normalise errors ──────────────────────────
// Preserves the server's machine-readable `error` code on the thrown Error
// object as `err.code` so callers can detect specific conditions like
// "token_expired" without fragile string-matching on the human message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverError = error.response?.data?.error || '';
    const message =
      error.response?.data?.message ||
      serverError ||
      error.message ||
      'An unknown error occurred.';
    const err = new Error(message);
    // Attach the raw server error code for programmatic checks in callers
    err.code = serverError;
    return Promise.reject(err);
  }
);

// ─────────────────────────────────────────────────────────────────────
// Auth endpoints
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the current session user from the server.
 * Returns { authenticated: boolean, user: object|null }
 */
export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

/**
 * Logs the user out by destroying the server session.
 */
export async function logout() {
  const res = await api.post('/auth/logout');
  return res.data;
}

/**
 * Checks whether the server has DEV_BYPASS_AUTH enabled.
 * Returns { devMode: boolean }.
 */
export async function getDevStatus() {
  const res = await api.get('/auth/dev-status');
  return res.data;
}

/**
 * Uploads image files directly for Gemini analysis.
 *
 * @param {FormData} formData - FormData with 'photos' field containing files
 */
export async function uploadPhotos(formData) {
  // Use native fetch instead of Axios so the browser sets the correct
  // multipart/form-data Content-Type with boundary automatically.
  // Axios's default application/json header cannot be fully suppressed
  // per-request without removing it from the shared instance.
  const res = await fetch('/api/photos/upload', {
    method: 'POST',
    credentials: 'include',  // Send session cookie
    body: formData,           // Browser sets Content-Type + boundary
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.message || data.error || `Upload failed (${res.status})`);
    err.code = data.error || '';
    throw err;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────
// Photos endpoints
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's synced photos (from Google Drive).
 *
 * @param {string} [pageToken] - Pagination token for the next page
 * @param {number} [pageSize]  - Items per page (default 50)
 */
export async function fetchPhotos(pageToken = null, pageSize = 50) {
  const params = { pageSize };
  if (pageToken) params.pageToken = pageToken;
  const res = await api.get('/api/photos', { params });
  return res.data;
}

/**
 * Sends a batch of photos for Gemini processing.
 *
 * @param {Array<{id, baseUrl, mimeType}>} photos
 */
export async function processPhotos(photos) {
  const res = await api.post('/api/photos/process', { photos });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────
// Gemini endpoints
// ─────────────────────────────────────────────────────────────────────

/**
 * Processes a single photo with Gemini → returns outputXXX.
 *
 * @param {string} photoUrl   - Photo URL or Drive proxy path
 * @param {string} [mimeType]
 */
export async function analyzePhoto(photoUrl, mimeType = 'image/jpeg', driveFileId = null) {
  const res = await api.post('/api/gemini/photo', { photoUrl, mimeType, driveFileId });
  return res.data;
}

/**
 * Uploads audio and processes it with Gemini → returns outputYYY.
 *
 * @param {Blob}   audioBlob      - Raw audio blob from MediaRecorder
 * @param {string} mimeType       - e.g. "audio/webm"
 * @param {string} [linkedPhotoUrl] - Optional paired photo URL
 * @param {Function} [onProgress]   - Upload progress callback
 */
export async function processAudio(audioBlob, mimeType, linkedPhotoUrl = '', onProgress = null) {
  const formData = new FormData();
  // Multer expects the field named "audio"
  formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1] || 'webm'}`);
  if (linkedPhotoUrl) formData.append('linkedPhotoUrl', linkedPhotoUrl);

  const res = await api.post('/api/gemini/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (evt) => onProgress(Math.round((evt.loaded * 100) / evt.total))
      : undefined,
  });
  return res.data;
}

/**
 * Sends XXX + YYY to Gemini for combined narrative → returns outputZZZ.
 *
 * @param {string} outputXXX  - Photo analysis text
 * @param {string} outputYYY  - Audio analysis text
 * @param {string} [photoUrl]
 * @param {string} [audioUrl]
 */
export async function combineOutputs(outputXXX, outputYYY, photoUrl = '', audioUrl = '') {
  const res = await api.post('/api/gemini/combine', { outputXXX, outputYYY, photoUrl, audioUrl });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────
// Journal endpoints
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all journal entries (photoResults, audioResults, combinedResults).
 */
export async function fetchJournal() {
  const res = await api.get('/api/journal');
  return res.data;
}

/**
 * Deletes a journal entry from the correct Firestore collection.
 *
 * @param {string} docId  - Firestore document ID
 * @param {'photo'|'audio'|'combined'} type - Entry type
 */
export async function deleteJournalEntry(docId, type = 'photo') {
  const collection = type === 'audio' ? 'audio' : type === 'combined' ? 'combined' : 'photo';
  const res = await api.delete(`/api/journal/${collection}/${docId}`);
  return res.data;
}

/**
 * Updates the ZZZ narrative of a combined journal entry.
 *
 * @param {string} docId     - Firestore document ID
 * @param {string} narrative - New narrative text
 */
export async function updateNarrative(docId, narrative) {
  const res = await api.put(`/api/journal/combined/${docId}`, { narrative });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────
// Admin endpoints
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a raw sample of each Firestore collection for the DB View screen.
 */
export async function fetchDatabaseSample() {
  const res = await api.get('/api/admin/database');
  return res.data;
}

/**
 * Fetches service health status.
 */
export async function fetchHealth() {
  const res = await api.get('/api/admin/health');
  return res.data;
}

export default api;
