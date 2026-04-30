/**
 * authMiddleware.js — Express middleware to protect API routes.
 *
 * Any route wrapped with requireAuth will return 401 if there is no
 * valid session (i.e. the user has not completed the OAuth flow).
 *
 * The session object is expected to contain:
 *   req.session.user      — { sub, email, name, picture }
 *   req.session.tokens    — { access_token, refresh_token }
 */

'use strict';

const { refreshAccessToken } = require('../services/authService');

/**
 * Middleware — ensures the request comes from an authenticated session.
 * Attaches req.user and req.tokens for downstream route handlers.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be signed in. Please visit /auth/google to authenticate.',
    });
  }

  // Attach user info to the request for convenience
  req.user = req.session.user;
  req.tokens = req.session.tokens || {};

  // ── Proactive access-token refresh ──────────────────────────────
  // If we have a stored expiry and it is within 5 minutes of expiring,
  // refresh the token silently so downstream API calls succeed.
  const expiryMs = req.session.tokenExpiry;
  const fiveMinMs = 5 * 60 * 1000;

  if (expiryMs && Date.now() > expiryMs - fiveMinMs && req.tokens.refresh_token) {
    try {
      const newAccessToken = await refreshAccessToken(req.tokens.refresh_token);
      req.session.tokens.access_token = newAccessToken;
      req.tokens.access_token = newAccessToken;
      // Reset expiry — Google access tokens last 1 hour
      req.session.tokenExpiry = Date.now() + 3600 * 1000;
    } catch (err) {
      console.warn('[authMiddleware] Token refresh failed:', err.message);
      // Don't block the request — let the downstream call fail naturally
    }
  }

  next();
}

module.exports = { requireAuth };
