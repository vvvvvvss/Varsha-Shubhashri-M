'use strict';

const path = require('path');
const express = require('express');
const { Store } = require('./store');
const { createAuth } = require('./auth');
const { createApiRouter } = require('./routes/api');

const DEFAULT_PASSWORD = 'admin123';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function requireJsonBody(req, res, next) {
  const hasBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding');
  if (hasBody && !req.is('application/json')) {
    const err = new Error('Content-Type must be application/json');
    err.status = 415;
    return next(err);
  }
  return next();
}

// Final error handler: every failure becomes a small JSON object for API calls.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  }

  if (status >= 500) {
    console.error(err);
    message = 'Something went wrong on the server';
  }

  if (req.originalUrl.startsWith('/api')) {
    const error = { status, message };
    if (err.details) error.details = err.details;
    return res.status(status).json({ error });
  }
  return res.status(status).type('text').send(message);
}

function createApp(options = {}) {
  const password = options.adminPassword || process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const store = new Store();
  const auth = createAuth({ password });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct client IPs behind Render / Railway proxies

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    next();
  });

  // REST API
  app.use('/api', express.json({ limit: '200kb' }), requireJsonBody, createApiRouter({ store, auth }));

  // Public portfolio (public/index.html) and admin dashboard (public/admin/ -> /admin)
  app.use(express.static(PUBLIC_DIR));

  app.use((req, res) => res.status(404).type('text').send('404 — page not found'));
  app.use(errorHandler);

  app.locals.store = store;
  app.locals.usingDefaultPassword = password === DEFAULT_PASSWORD;
  return app;
}

module.exports = { createApp };
