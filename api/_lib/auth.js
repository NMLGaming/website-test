/**
 * api/_lib/auth.js
 * Session helpers — Discord OAuth2, JWT cookie, owner check.
 * Owner ID is read from env var ONLY — never exposed to frontend.
 */

'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET   = process.env.JWT_SECRET;
const COOKIE_NAME  = 'vielist_session';
const STATE_COOKIE = 'oauth_state';
const JWT_EXP      = '7d';

/* ---- CORS ---- */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/* ---- Cookie helpers ---- */
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const map = {};
  raw.split(';').forEach(function (part) {
    const [k, ...v] = part.trim().split('=');
    if (k) map[k.trim()] = decodeURIComponent(v.join('='));
  });
  return map;
}

function setSessionCookie(res, payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET env var not set');
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP });
  res.setHeader('Set-Cookie', [
    COOKIE_NAME + '=' + token +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800' +
    (process.env.VERCEL ? '; Secure' : '')
  ]);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [
    COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  ]);
}

function setStateCookie(res, state) {
  res.setHeader('Set-Cookie', [
    STATE_COOKIE + '=' + state +
    '; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=300' +
    (process.env.VERCEL ? '; Secure' : '')
  ]);
}

/* ---- Token verify ---- */
function verifyToken(req) {
  if (!JWT_SECRET) return null;
  const cookies = parseCookies(req);
  const token   = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

/* ---- State helpers (CSRF) ---- */
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function verifyState(req, stateParam) {
  const cookies = parseCookies(req);
  return stateParam && cookies[STATE_COOKIE] === stateParam;
}

/* ---- Role check — Owner ID lives in env var ONLY ---- */
function resolveRole(discordId) {
  return discordId === process.env.OWNER_DISCORD_ID ? 'OWNER' : 'USER';
}

/* ---- Auth middleware — returns user or sends 401 ---- */
function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return null;
  }
  return user;
}

/* ---- Owner middleware — returns user or sends 403 ---- */
function requireOwner(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return null;
  }
  if (user.role !== 'OWNER') {
    res.status(403).json({ error: 'Không có quyền truy cập' });
    return null;
  }
  return user;
}

module.exports = {
  setCorsHeaders,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  verifyToken,
  generateState,
  verifyState,
  resolveRole,
  requireAuth,
  requireOwner,
};
