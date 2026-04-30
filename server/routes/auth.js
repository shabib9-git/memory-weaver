/**
 * routes/auth.js — OAuth 2.0 authentication routes for MemoryWeaver.
 *
 * Endpoints:
 *   GET /auth/google      — Redirects user to Google's OAuth consent page
 *   GET /auth/callback    — Handles OAuth code exchange; creates session
 *   GET /auth/me          — Returns current session user profile
 *   POST /auth/logout     — Destroys the session
 *   GET /auth/dev-login   — DEV ONLY: creates a fake session (no OAuth required)
 *                           Only active when DEV_BYPASS_AUTH=true in .env
 *                           and NODE_ENV !== production.
 */

'use strict';

const express = require('express');
const {
  buildAuthUrl,
  exchangeCodeForTokens,
  decodeIdToken,
} = require('../services/authService');
const { logSuccess, logError } = require('../services/loggingService');
const config = require('../config/env');

const router = express.Router();

/**
 * GET /auth/google
 * Initiates the Google OAuth 2.0 flow.
 * Redirects the user to Google's authorization page.
 */
router.get('/google', (req, res, next) => {
  try {
    const authUrl = buildAuthUrl();
    logSuccess('OAuth_Initiate', '/auth/google', 'anonymous');
    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/callback
 * Called by Google after the user grants (or denies) consent.
 *
 * On success:
 *   - Exchanges the code for tokens
 *   - Decodes the ID token for user profile
 *   - Stores user + tokens in the session
 *   - Redirects to the React SPA
 *
 * On error:
 *   - Redirects to the SPA with an error query param
 */
router.get('/callback', async (req, res, next) => {
  const { code, error: oauthError } = req.query;

  // User denied consent
  if (oauthError) {
    logError('OAuth_Callback', '/auth/callback', 'unknown', oauthError);
    return res.redirect(`${config.frontendUrl}?auth_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code.' });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = decodeIdToken(tokens.id_token);

    // Persist user and tokens in the server-side session
    req.session.user = profile;
    req.session.tokens = tokens;
    // Store expiry so authMiddleware can refresh proactively
    req.session.tokenExpiry = Date.now() + 3600 * 1000; // 1 hour

    logSuccess('OAuth_Callback', '/auth/callback', profile.sub, { email: profile.email });

    // Redirect back to the React SPA (root or a post-login route)
    res.redirect(`${config.frontendUrl}/gallery`);
  } catch (err) {
    logError('OAuth_Callback', '/auth/callback', 'unknown', err.message);
    next(err);
  }
});

/**
 * GET /auth/me
 * Returns the current session user's profile.
 * Returns 401 if not authenticated.
 */
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ authenticated: false, user: null });
  }
  res.json({ authenticated: true, user: req.session.user });
});

/**
 * POST /auth/logout
 * Destroys the current session and clears the session cookie.
 */
router.post('/logout', (req, res, next) => {
  const userId = req.session?.user?.sub || 'unknown';
  req.session.destroy((err) => {
    if (err) {
      logError('Auth_Logout', '/auth/logout', userId, err.message);
      return next(err);
    }
    logSuccess('Auth_Logout', '/auth/logout', userId);
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// DEV-ONLY: bypass auth endpoint
// Disabled automatically in production regardless of env var.
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /auth/dev-login
 *
 * Creates a fake session so all protected routes can be tested without
 * completing real Google OAuth.  The fake user has:
 *   - sub: 'dev-user-001'
 *   - A placeholder access_token so photosService won't crash on null check
 *
 * Activated only when:
 *   - DEV_BYPASS_AUTH=true in .env  AND
 *   - NODE_ENV !== 'production'
 *
 * The SPA reads this flag from GET /auth/me's `devMode: true` field and
 * shows a "Dev Login" button on the login page instead of Google OAuth.
 */
if (config.devBypassAuth && !config.isProduction) {
  router.get('/dev-login', (req, res) => {
    // Synthetic user profile that mirrors the real Google OAuth shape
    req.session.user = {
      sub: 'dev-user-001',
      email: 'dev@memoryweaver.local',
      name: 'Dev User',
      picture: '',
      isDev: true,
    };
    // Placeholder tokens — Photos/Gemini calls will still fail with clear
    // errors, but every screen and UI component will be fully navigable.
    req.session.tokens = { access_token: 'dev-placeholder-token' };
    req.session.tokenExpiry = Date.now() + 7 * 24 * 3600 * 1000;

    console.log('[auth] DEV LOGIN — fake session created for dev-user-001');

    // Redirect to the gallery just like a real OAuth callback
    res.redirect(`${config.frontendUrl}/gallery`);
  });
}

/**
 * GET /auth/dev-status
 * Tells the SPA whether dev-bypass mode is active.
 * Always safe to call — returns { devMode: false } in production.
 */
router.get('/dev-status', (_req, res) => {
  res.json({
    devMode: !!(config.devBypassAuth && !config.isProduction),
  });
});

module.exports = router;
