/**
 * GET /api/auth/callback
 * Discord OAuth2 callback. Exchanges code for token, fetches user,
 * determines role server-side, sets session cookie, redirects.
 */

'use strict';

const {
  setCorsHeaders,
  setSessionCookie,
  parseCookies,
  resolveRole,
} = require('../_lib/auth');

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI;

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { code, state: stateParam, error: oauthError } = req.query;

  // Discord returned an error (user denied, etc.)
  if (oauthError) {
    return res.redirect(302, '/?auth_error=' + encodeURIComponent(oauthError));
  }

  if (!code || !stateParam) {
    return res.redirect(302, '/?auth_error=missing_params');
  }

  // Verify CSRF state
  const cookies   = parseCookies(req);
  const stateCookie = cookies['oauth_state'];
  const [stateValue, returnToEncoded] = stateParam.split(':');

  if (!stateCookie || stateCookie !== stateValue) {
    return res.redirect(302, '/?auth_error=invalid_state');
  }

  const returnTo = returnToEncoded ? decodeURIComponent(returnToEncoded) : '/';

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return res.redirect(302, '/?auth_error=not_configured');
  }

  try {
    // 1. Exchange code → access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code:          code,
        redirect_uri:  REDIRECT_URI,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Discord token exchange failed:', err);
      return res.redirect(302, '/?auth_error=token_exchange');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!userRes.ok) {
      return res.redirect(302, '/?auth_error=user_fetch');
    }

    const discordUser = await userRes.json();

    // 3. Resolve role SERVER-SIDE (Owner ID never goes to frontend)
    const role = resolveRole(discordUser.id);

    // 4. Build session payload (no discord_id, no access_token sent to client)
    const sessionPayload = {
      username:       discordUser.username,
      discriminator:  discordUser.discriminator || '0',
      avatar:         discordUser.avatar
        ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64'
        : 'https://cdn.discordapp.com/embed/avatars/' + (parseInt(discordUser.discriminator || '0') % 5) + '.png',
      role:           role,
      // Store discord_id in JWT for owner re-check on sensitive routes
      // This stays in the httpOnly cookie, never returned to frontend
      _did:           discordUser.id,
    };

    // 5. Set httpOnly session cookie
    setSessionCookie(res, sessionPayload);

    // 6. Clear the state cookie
    res.setHeader('Set-Cookie', [
      ...([res.getHeader('Set-Cookie')].flat()),
      'oauth_state=; Path=/api/auth; HttpOnly; Max-Age=0',
    ]);

    // 7. Redirect to return destination
    const safe = returnTo.startsWith('/') ? returnTo : '/';
    return res.redirect(302, safe);

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(302, '/?auth_error=server_error');
  }
};
