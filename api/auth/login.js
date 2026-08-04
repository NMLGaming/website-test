'use strict';

const { checkCredentials, setTokenCookie, setCorsHeaders } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    if (!checkCredentials(username, password)) {
      // Artificial delay to slow brute-force attempts
      await new Promise(function (r) { setTimeout(r, 500); });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server misconfiguration: ' + e.message });
  }

  try {
    setTokenCookie(res, { username, role: 'admin' });
  } catch (e) {
    return res.status(500).json({ error: 'Server misconfiguration: ' + e.message });
  }

  return res.status(200).json({ ok: true, username });
};
