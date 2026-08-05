/**
 * GET /api/auth/me
 * Returns the currently logged-in user's public info.
 * Never returns discord_id or other sensitive session fields.
 */

'use strict';

const { setCorsHeaders, verifyToken } = require('../_lib/auth');

module.exports = function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const user = verifyToken(req);

  if (!user) {
    return res.status(200).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    username:      user.username,
    discriminator: user.discriminator,
    avatar:        user.avatar,
    role:          user.role,
    // NOTE: discord_id (_did) is intentionally omitted here
  });
};
