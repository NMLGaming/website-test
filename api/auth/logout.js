'use strict';

const { clearTokenCookie, setCorsHeaders } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  clearTokenCookie(res);
  return res.status(200).json({ ok: true });
};
