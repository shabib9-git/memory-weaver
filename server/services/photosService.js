/**
 * photosService.js — Google Photos API integration for MemoryWeaver.
 *
 * Fetches a user's media items using the Google Photos Library API
 * via the access token obtained during the OAuth flow.
 *
 * Reference: https://developers.google.com/photos/library/reference/rest
 *
 * IMPORTANT — Google Photos API setup:
 *   1. Enable the "Photos Library API" in your GCP project.
 *   2. Request the OAuth scope: https://www.googleapis.com/auth/photoslibrary.readonly
 *   3. Your app must be in "testing" mode or published; add test users in
 *      the Google Cloud Console → OAuth consent screen.
 *   4. A business / verified website is required for production publishing.
 */

'use strict';

const axios = require('axios');
const { logSuccess, logError } = require('./loggingService');

// ── Google Photos API base URL ───────────────────────────────────────
const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

/**
 * Fetches a page of media items from the authenticated user's Google Photos
 * library.  Returns photo-type items only.
 *
 * @param {string} accessToken  - OAuth access token for the user
 * @param {string} userId       - User identifier (for logging)
 * @param {string} [pageToken]  - Pagination token from a previous call
 * @param {number} [pageSize]   - Number of items per page (max 100)
 * @returns {Promise<{ photos: Array<object>, nextPageToken: string|null }>}
 */
async function fetchUserPhotos(accessToken, userId, pageToken = null, pageSize = 50) {
  const endpoint = `${PHOTOS_API_BASE}/mediaItems`;

  // Guard: reject immediately with a clear error if no access token is available.
  // This prevents a confusing 400/401 from Google with no context.
  if (!accessToken) {
    throw new Error(
      'PHOTOS_AUTH_EXPIRED: No access token available. ' +
      'Please sign out and sign in again to grant Google Photos access.'
    );
  }

  try {
    const params = { pageSize };
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    const mediaItems = response.data.mediaItems || [];

    // Filter to photo-type items only (exclude videos)
    const photos = mediaItems.filter(
      (item) => item.mimeType && item.mimeType.startsWith('image/')
    );

    logSuccess('GooglePhotos_Fetch', 'mediaItems.list', userId, {
      count: photos.length,
      pageToken: !!pageToken,
    });

    return {
      photos,
      nextPageToken: response.data.nextPageToken || null,
    };
  } catch (err) {
    logError('GooglePhotos_Fetch', endpoint, userId, err.message);
    const statusCode = err.response?.status;

    // Surface a user-friendly error message
    if (statusCode === 401) {
      throw new Error('PHOTOS_AUTH_EXPIRED: Access token expired. Please re-authenticate.');
    }
    if (statusCode === 403) {
      throw new Error('PHOTOS_FORBIDDEN: Insufficient permissions for Google Photos Library API.');
    }
    throw new Error(`Google Photos API error: ${err.message}`);
  }
}

/**
 * Fetches a single media item by its Google Photos item ID.
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} itemId      - Google Photos mediaItem ID
 * @param {string} userId      - User identifier (for logging)
 * @returns {Promise<object>}  - Full mediaItem object
 */
async function fetchPhotoById(accessToken, itemId, userId) {
  const endpoint = `${PHOTOS_API_BASE}/mediaItems/${itemId}`;

  try {
    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    logSuccess('GooglePhotos_FetchById', endpoint, userId);
    return response.data;
  } catch (err) {
    logError('GooglePhotos_FetchById', endpoint, userId, err.message);
    throw new Error(`Could not fetch photo ${itemId}: ${err.message}`);
  }
}

/**
 * Downloads raw image bytes from a Google Photos baseUrl.
 * Google Photos baseUrls expire after ~60 minutes; fetch promptly.
 *
 * Appends "=d" to force download of the full-resolution image,
 * "=w800-h600" for a 800×600 version.
 *
 * @param {string} baseUrl  - The baseUrl field from a mediaItem
 * @returns {Promise<Buffer>} - Image bytes as a Node Buffer
 */
async function downloadPhotoBytes(baseUrl) {
  // Only append size suffix for real Google Photos baseUrls (not Drive proxy or upload paths)
  const downloadUrl = baseUrl.startsWith('/api/') ? baseUrl : `${baseUrl}=w1024-h768`;

  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

module.exports = { fetchUserPhotos, fetchPhotoById, downloadPhotoBytes };
