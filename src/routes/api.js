'use strict';

const express = require('express');
const { collections, profile: profileSchema } = require('../schemas');
const { validate } = require('../validate');
const { COLLECTION_NAMES } = require('../store');

const MAX_ITEMS_PER_COLLECTION = 200;
const HIDDEN_FIELDS = ['id', 'createdAt', 'updatedAt'];

function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

const validationError = (details) => httpError(400, 'Validation failed', details);

function createApiRouter({ store, auth }) {
  const router = express.Router();

  // API responses must never be cached: the portfolio should show edits instantly.
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // ---- misc ---------------------------------------------------------------

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // Field definitions: the admin dashboard builds its forms from this.
  router.get('/meta', (req, res) => {
    res.json({ collections, profile: profileSchema });
  });

  // ---- auth ---------------------------------------------------------------

  router.post('/auth/login', (req, res) => {
    const result = auth.login(req.ip, req.body && req.body.password);
    if (result.status !== 200) throw httpError(result.status, result.message);
    res.json({ token: result.token, expiresIn: result.expiresIn });
  });

  router.post('/auth/logout', (req, res) => {
    auth.logout(req);
    res.status(204).end();
  });

  router.get('/auth/me', auth.requireAuth, (req, res) => {
    res.json({ authenticated: true });
  });

  // ---- public aggregate (one request fills the whole portfolio page) ------

  router.get('/portfolio', (req, res) => {
    const out = { profile: store.getProfile() };
    for (const name of COLLECTION_NAMES) out[name] = store.list(name);
    res.json(out);
  });

  // ---- profile (single object, not a list) ---------------------------------

  router.get('/profile', (req, res) => {
    res.json(store.getProfile());
  });

  router.put('/profile', auth.requireAuth, (req, res) => {
    const { value, errors } = validate(profileSchema.fields, req.body);
    if (errors) throw validationError(errors);
    res.json(store.setProfile(value));
  });

  router.patch('/profile', auth.requireAuth, (req, res) => {
    const { value, errors } = validate(profileSchema.fields, req.body, { partial: true });
    if (errors) throw validationError(errors);
    if (Object.keys(value).length === 0) throw httpError(400, 'Provide at least one profile field to update');
    res.json(store.setProfile(value));
  });

  // ---- admin utilities: backup / restore / reset ----------------------------

  router.get('/admin/export', auth.requireAuth, (req, res) => {
    res.set('Content-Disposition', 'attachment; filename="portfolio-backup.json"');
    res.json(store.snapshot());
  });

  router.post('/admin/import', auth.requireAuth, (req, res) => {
    const body = req.body;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw httpError(400, 'Backup must be a JSON object');
    }

    const clean = {};
    const errors = {};
    let found = false;

    if (body.profile !== undefined) {
      found = true;
      const r = validate(profileSchema.fields, body.profile);
      if (r.errors) for (const [k, msg] of Object.entries(r.errors)) errors[`profile.${k}`] = msg;
      else clean.profile = r.value;
    }

    for (const name of COLLECTION_NAMES) {
      if (body[name] === undefined) continue;
      found = true;
      if (!Array.isArray(body[name])) {
        errors[name] = 'must be an array';
        continue;
      }
      if (body[name].length > MAX_ITEMS_PER_COLLECTION) {
        errors[name] = `too many items (max ${MAX_ITEMS_PER_COLLECTION})`;
        continue;
      }
      clean[name] = [];
      body[name].forEach((item, i) => {
        const r = validate(collections[name].fields, item);
        if (r.errors) for (const [k, msg] of Object.entries(r.errors)) errors[`${name}[${i}].${k}`] = msg;
        else clean[name].push(r.value);
      });
    }

    if (!found) throw httpError(400, `Nothing to import. Expected "profile" and/or: ${COLLECTION_NAMES.join(', ')}`);
    if (Object.keys(errors).length) throw httpError(400, 'Backup file failed validation', errors);

    store.load(clean); // only reached when everything is valid, so an import is all-or-nothing
    res.json({ message: 'Import complete', imported: Object.keys(clean) });
  });

  router.post('/admin/reset', auth.requireAuth, (req, res) => {
    store.reset();
    res.json({ message: 'Content reset to the default data' });
  });

  // ---- generic CRUD for projects, skills, achievements, certifications, models

  router.param('collection', (req, res, next, name) => {
    if (!store.has(name)) {
      return next(httpError(404, `Unknown collection "${name}". Available: ${COLLECTION_NAMES.join(', ')}`));
    }
    req.collectionName = name;
    return next();
  });

  router.param('id', (req, res, next, raw) => {
    if (!/^\d+$/.test(raw)) return next(httpError(400, 'id must be a positive integer'));
    req.itemId = Number(raw);
    return next();
  });

  const notFound = (name, id) => httpError(404, `${collections[name].label} with id ${id} not found`);

  // READ (list, optional ?q=search)
  router.get('/:collection', (req, res) => {
    const name = req.collectionName;
    let items = store.list(name);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    if (q) {
      items = items.filter((item) => {
        const text = Object.entries(item)
          .filter(([key]) => !HIDDEN_FIELDS.includes(key))
          .map(([, v]) => (Array.isArray(v) ? v.join(' ') : String(v)))
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }
    res.json({ count: items.length, items });
  });

  // READ (one)
  router.get('/:collection/:id', (req, res) => {
    const item = store.get(req.collectionName, req.itemId);
    if (!item) throw notFound(req.collectionName, req.itemId);
    res.json(item);
  });

  // CREATE
  router.post('/:collection', auth.requireAuth, (req, res) => {
    const name = req.collectionName;
    const { value, errors } = validate(collections[name].fields, req.body);
    if (errors) throw validationError(errors);
    if (store.items[name].length >= MAX_ITEMS_PER_COLLECTION) {
      throw httpError(409, `This collection is full (max ${MAX_ITEMS_PER_COLLECTION} items). Delete something first.`);
    }
    const item = store.create(name, value);
    res.status(201).location(`/api/${name}/${item.id}`).json(item);
  });

  // UPDATE (replace all fields)
  router.put('/:collection/:id', auth.requireAuth, (req, res) => {
    const name = req.collectionName;
    if (!store.find(name, req.itemId)) throw notFound(name, req.itemId);
    const { value, errors } = validate(collections[name].fields, req.body);
    if (errors) throw validationError(errors);
    res.json(store.replace(name, req.itemId, value));
  });

  // UPDATE (only the fields you send)
  router.patch('/:collection/:id', auth.requireAuth, (req, res) => {
    const name = req.collectionName;
    if (!store.find(name, req.itemId)) throw notFound(name, req.itemId);
    const { value, errors } = validate(collections[name].fields, req.body, { partial: true });
    if (errors) throw validationError(errors);
    if (Object.keys(value).length === 0) {
      throw httpError(400, `Provide at least one field to update (${Object.keys(collections[name].fields).join(', ')})`);
    }
    res.json(store.update(name, req.itemId, value));
  });

  // DELETE
  router.delete('/:collection/:id', auth.requireAuth, (req, res) => {
    const removed = store.remove(req.collectionName, req.itemId);
    if (!removed) throw notFound(req.collectionName, req.itemId);
    res.status(204).end();
  });

  // REORDER: POST /api/projects/3/move  { "direction": "up" | "down" }
  router.post('/:collection/:id/move', auth.requireAuth, (req, res) => {
    const name = req.collectionName;
    const direction = req.body && req.body.direction;
    if (direction !== 'up' && direction !== 'down') {
      throw httpError(400, 'direction must be "up" or "down"', { direction: 'must be "up" or "down"' });
    }
    if (!store.move(name, req.itemId, direction)) throw notFound(name, req.itemId);
    const items = store.list(name);
    res.json({ count: items.length, items });
  });

  // Anything else under /api
  router.use((req, res, next) => {
    next(httpError(404, `No such API route: ${req.method} ${req.originalUrl.split('?')[0]}`));
  });

  return router;
}

module.exports = { createApiRouter };
