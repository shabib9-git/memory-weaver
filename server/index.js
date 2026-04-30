/**
 * index.js — MemoryWeaver Express server entry point.
 *
 * Wires together middleware, routes, and error handling.
 * In production (Cloud Run) this file is the process entrypoint;
 * locally use `npm run dev` which wraps it with nodemon.
 *
 * Architecture:
 *   morgan          — HTTP request logging
 *   helmet          — Security headers
 *   cors            — Cross-Origin Resource Sharing (frontend ↔ backend)
 *   express-session — Server-side sessions for OAuth tokens
 *   routes          — /auth, /api/photos, /api/gemini, /api/journal, /api/admin
 *   errorHandler    — Central JSON error responses
 */

'use strict';

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// ── Route modules ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const photosRoutes = require('./routes/photos');
const geminiRoutes = require('./routes/gemini');
const journalRoutes = require('./routes/journal');
const adminRoutes = require('./routes/admin');
const audioRoutes = require('./routes/audio');

const app = express();

// Trust the Cloud Run / GCP load balancer so req.secure is true on HTTPS
// and session cookies with secure:true are correctly set and sent.
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────────────
// Security & HTTP middleware
// ─────────────────────────────────────────────────────────────────────

// Helmet adds best-practice security headers
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA asset serving

// Request logger — "combined" in production (structured), "dev" locally
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────
// CORS — allow the React dev server and deployed frontend
// ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true, // Required so the session cookie is sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─────────────────────────────────────────────────────────────────────
// Session middleware
// ─────────────────────────────────────────────────────────────────────
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,   // HTTPS-only in production
      sameSite: config.isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day session lifetime
    },
  })
);

// ─────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audio', audioRoutes);

// ─────────────────────────────────────────────────────────────────────
// Health check — used by Cloud Run and load balancers
// ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'memory-weaver-api', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────
// Serve the React SPA in production
// The Vite build output is placed in ../client/dist
// ─────────────────────────────────────────────────────────────────────
if (config.isProduction) {
  const spaPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(spaPath));

  // Catch-all — serve index.html for SPA client-side routes.
  // API and auth paths that reach here (no matching route) fall through to
  // the errorHandler with a 404 JSON response instead of hanging silently.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      // No route matched — return a structured 404 so the caller gets a response
      const err = new Error(`Route not found: ${req.method} ${req.path}`);
      err.statusCode = 404;
      return next(err);
    }
    // All other paths are SPA client routes — send the React shell
    res.sendFile(path.join(spaPath, 'index.html'));
  });
}

// ─────────────────────────────────────────────────────────────────────
// Central error handler — MUST be last
// ─────────────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────
// Global safety net — log unhandled rejections without crashing
// ─────────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (server kept alive):', err.message);
});

// ─────────────────────────────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   MemoryWeaver API Server                      ║
╠════════════════════════════════════════════════╣
║  Port    : ${String(config.port).padEnd(36)}║
║  Env     : ${config.nodeEnv.padEnd(36)}║
║  Gemini  : ${(config.geminiApiKey ? 'configured ✓' : 'NOT SET ✗').padEnd(36)}║
║  OAuth   : ${(config.googleClientId ? 'configured ✓' : 'NOT SET ✗').padEnd(36)}║
║  Firestore: ${(config.gcpProjectId ? 'configured ✓' : 'NOT SET ✗').padEnd(35)}║
╚════════════════════════════════════════════════╝
  `);
});

module.exports = app;
