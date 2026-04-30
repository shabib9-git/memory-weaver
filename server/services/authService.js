/**
 * authService.js — Google OAuth 2.0 flow helpers for MemoryWeaver.
 *
 * Uses the google-auth-library to build the authorization URL,
 * exchange the authorization code for tokens, and decode the ID token
 * to extract user profile information.
 *
 * Required OAuth scopes:
 *   • openid, email, profile       — standard Google login
 *   • https://www.googleapis.com/auth/photoslibrary.readonly
 *                                  — read-only Google Photos access
 */

'use strict';

const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const { logSuccess, logError } = require('./loggingService');

// Google Drive read-only scope — used by the Picker API to download selected photos.
// Less restricted than photoslibrary.readonly and works for unverified apps.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/** Returns a configured OAuth2Client instance. */
function getOAuthClient() {
  return new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
    config.googleCallbackUrl
  );
}

/**
 * Builds the Google authorization URL with required scopes.
 * The user is redirected here to start the OAuth flow.
 *
 * @returns {string} Authorization URL
 */
function buildAuthUrl() {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. ' +
        'Cannot build OAuth URL. See .env.example.'
    );
  }

  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',       // Request refresh token
    prompt: 'consent',            // Always show consent screen so we get refresh_token
    scope: ['openid', 'email', 'profile', DRIVE_SCOPE],
  });
}

/**
 * Exchanges an authorization code for OAuth tokens.
 *
 * @param {string} code - The "code" query param from the OAuth callback URL
 * @returns {Promise<object>} Token object { access_token, refresh_token, id_token, ... }
 */
async function exchangeCodeForTokens(code) {
  const client = getOAuthClient();
  try {
    const { tokens } = await client.getToken(code);
    logSuccess('OAuth_TokenExchange', '/auth/callback', 'unknown');
    return tokens;
  } catch (err) {
    logError('OAuth_TokenExchange', '/auth/callback', 'unknown', err.message);
    throw new Error(`Token exchange failed: ${err.message}`);
  }
}

/**
 * Decodes the Google ID token (JWT) and returns the user's profile fields.
 * Does NOT perform network verification for speed; the token was just
 * returned directly from Google's endpoint so it is trustworthy.
 *
 * @param {string} idToken - The id_token string from exchangeCodeForTokens()
 * @returns {object} User profile { sub, email, name, picture }
 */
function decodeIdToken(idToken) {
  // The ID token is a JWT — base64-decode the payload segment (index 1)
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  return {
    sub: payload.sub,         // Unique, stable Google user ID
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

/**
 * Refreshes an expired access token using the stored refresh token.
 *
 * @param {string} refreshToken
 * @returns {Promise<string>} New access token
 */
async function refreshAccessToken(refreshToken) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  try {
    const { credentials } = await client.refreshAccessToken();
    logSuccess('OAuth_RefreshToken', '/auth/refresh', 'session');
    return credentials.access_token;
  } catch (err) {
    logError('OAuth_RefreshToken', '/auth/refresh', 'session', err.message);
    throw new Error(`Token refresh failed: ${err.message}`);
  }
}

module.exports = { buildAuthUrl, exchangeCodeForTokens, decodeIdToken, refreshAccessToken };
