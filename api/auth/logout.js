/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */

'use strict';

const { setCorsHeaders, clearSessionCookie } = require('../_lib/auth');

module.exports = function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
};
