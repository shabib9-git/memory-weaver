/**
 * errorHandler.js — Central Express error-handling middleware.
 *
 * Must be registered LAST (after all routes) with four parameters so
 * Express recognises it as an error handler.
 *
 * Returns a consistent JSON error envelope:
 *   { error: string, message: string, [stack]: string }
 */

'use strict';

const config = require('../config/env');

/**
 * Express error handler.
 *
 * @param {Error}                      err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   _next - Required signature; unused
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected error occurred.';

  console.error(`[errorHandler] ${req.method} ${req.path} → ${statusCode}: ${message}`);
  if (err.stack && !config.isProduction) console.error(err.stack);

  const body = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message,
  };

  // Expose stack trace only in development
  if (!config.isProduction && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { errorHandler };
