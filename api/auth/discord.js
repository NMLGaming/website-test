/**
 * GET /api/auth/discord
 * Redirects user to Discord OAuth2 authorization page.
 * Accepts ?redirect= to return user to a specific page after login.
 */

'use strict';

const { setCorsHeaders, setStateCookie, generateState } = require('../_lib/auth');

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI;
const SCOPES        = 'identify';

module.exports = function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(500).json({
      error: 'Discord OAuth chưa được cấu hình. Cần đặt DISCORD_CLIENT_ID và DISCORD_REDIRECT_URI.'
    });
  }

  // CSRF state
  const state = generateState();

  // Save where to redirect after login
  const returnTo = req.query.redirect || '/';

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    state:         state + ':' + encodeURIComponent(returnTo),
    prompt:        'none', // skip consent screen if already authorized
  });

  setStateCookie(res, state);

  return res.redirect(302, 'https://discord.com/api/oauth2/authorize?' + params.toString());
};
