'use strict';

const { verifyToken, setCorsHeaders } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, username: user.username, role: user.role });
};
