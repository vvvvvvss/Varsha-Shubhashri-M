'use strict';

const crypto = require('crypto');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_FAILED_LOGINS = 10; // per IP ...
const LOCK_WINDOW_MS = 15 * 60 * 1000; // ... per 15 minutes

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

/**
 * Minimal admin auth, enough to keep strangers from editing a public site:
 *   POST /api/auth/login  { password }  ->  { token }
 *   then send  Authorization: Bearer <token>  on every write request.
 * Tokens live in memory (they vanish on restart, which simply logs you out).
 */
function createAuth({ password }) {
  const sessions = new Map(); // token -> expiry timestamp
  const failures = new Map(); // ip -> { count, resetAt }

  function pruneSessions() {
    const t = Date.now();
    for (const [token, expires] of sessions) if (expires <= t) sessions.delete(token);
  }

  function isLocked(ip) {
    const f = failures.get(ip);
    if (!f) return false;
    if (f.resetAt <= Date.now()) {
      failures.delete(ip);
      return false;
    }
    return f.count >= MAX_FAILED_LOGINS;
  }

  function recordFailure(ip) {
    const f = failures.get(ip);
    if (!f || f.resetAt <= Date.now()) failures.set(ip, { count: 1, resetAt: Date.now() + LOCK_WINDOW_MS });
    else f.count += 1;
  }

  function login(ip, attempt) {
    if (isLocked(ip)) return { status: 429, message: 'Too many failed attempts. Try again in a few minutes.' };
    if (typeof attempt !== 'string' || !safeEqual(attempt, password)) {
      recordFailure(ip);
      return { status: 401, message: 'Incorrect password' };
    }
    failures.delete(ip);
    pruneSessions();
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    return { status: 200, token, expiresIn: SESSION_TTL_MS / 1000 };
  }

  function tokenFrom(req) {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    return match ? match[1] : null;
  }

  function isValid(token) {
    if (!token) return false;
    const expires = sessions.get(token);
    if (!expires) return false;
    if (expires <= Date.now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  /** Express middleware: 401 unless a valid Bearer token is supplied. */
  function requireAuth(req, res, next) {
    if (isValid(tokenFrom(req))) return next();
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: { status: 401, message: 'Authentication required. Log in at /admin or POST /api/auth/login.' } });
  }

  function logout(req) {
    const token = tokenFrom(req);
    if (token) sessions.delete(token);
  }

  return { login, logout, requireAuth, isValid, tokenFrom };
}

module.exports = { createAuth };
