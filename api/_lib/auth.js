/**
 * auth.js — JWT auth utilities for Vercel serverless functions.
 *
 * Admin credentials come from environment variables ONLY:
 *   ADMIN_USERNAME  — admin login name
 *   ADMIN_PASSWORD  — admin login password (plaintext in env var, never in code)
 *   JWT_SECRET      — random secret for signing tokens (min 32 chars recommended)
 *
 * Never expose these values to the frontend.
 */

'use strict';

const jwt = require('jsonwebtoken');

const COOKIE_NAME  = 'vielist_token';
const TOKEN_TTL    = '24h';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day in seconds

/* ---- Cookie helpers ---- */

function parseCookies(req) {
  const cookies = {};
  const header  = req.headers.cookie || '';
  header.split(';').forEach(function (part) {
    const eq = part.indexOf('=');
    if (eq < 0) return;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    try { cookies[key] = decodeURIComponent(val); }
    catch (_) { cookies[key] = val; }
  });
  return cookies;
}

function setTokenCookie(res, payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var not set');
  const token = jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Strict${secure}`
  );
  return token;
}

function clearTokenCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
}

/* ---- Token verification ---- */

function verifyToken(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookies = parseCookies(req);
  const token   = cookies[COOKIE_NAME];
  if (!token) return null;
  try { return jwt.verify(token, secret); }
  catch (_) { return null; }
}

/**
 * Validates the request. Returns the decoded payload or sends 401 and returns null.
 */
function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized — please log in at /admin' });
    return null;
  }
  return user;
}

/* ---- Credential check (against env vars, never against code) ---- */

function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new Error('ADMIN_USERNAME or ADMIN_PASSWORD env var not set');
  }
  return username === expectedUser && password === expectedPass;
}

/* ---- CORS helper ---- */

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin',      req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = { verifyToken, requireAuth, setTokenCookie, clearTokenCookie, checkCredentials, setCorsHeaders, parseCookies };
