/**
 * api/auth/[action].js
 * Xử lý tất cả các auth routes qua dynamic segment:
 *   GET  /api/auth/discord   — redirect tới Discord OAuth
 *   GET  /api/auth/callback  — Discord OAuth callback
 *   GET  /api/auth/me        — trả về thông tin user hiện tại
 *   POST /api/auth/logout    — xoá session cookie
 *   GET  /api/auth/login     — deprecated, trả về 410
 *
 * Gộp từ: login.js, logout.js, me.js, discord.js, callback.js
 */

'use strict';

const {
  setCorsHeaders,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  parseCookies,
  verifyToken,
  generateState,
  resolveRole,
} = require('../_lib/auth');

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI;
const SCOPES        = 'identify';

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action } = req.query;

  /* ---- GET /api/auth/discord ---- */
  if (action === 'discord') {
    if (!CLIENT_ID || !REDIRECT_URI) {
      return res.status(500).json({
        error: 'Discord OAuth chưa được cấu hình. Cần đặt DISCORD_CLIENT_ID và DISCORD_REDIRECT_URI.',
      });
    }
    const state    = generateState();
    const returnTo = req.query.redirect || '/';
    const params   = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         SCOPES,
      state:         state + ':' + encodeURIComponent(returnTo),
      prompt:        'none',
    });
    setStateCookie(res, state);
    return res.redirect(302, 'https://discord.com/api/oauth2/authorize?' + params.toString());
  }

  /* ---- GET /api/auth/callback ---- */
  if (action === 'callback') {
    const { code, state: stateParam, error: oauthError } = req.query;

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
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type:    'authorization_code',
          code:          code,
          redirect_uri:  REDIRECT_URI,
        }).toString(),
      });

      if (!tokenRes.ok) {
        console.error('Discord token exchange failed:', await tokenRes.text());
        return res.redirect(302, '/?auth_error=token_exchange');
      }

      const tokenData   = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Fetch Discord user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });

      if (!userRes.ok) {
        return res.redirect(302, '/?auth_error=user_fetch');
      }

      const discordUser = await userRes.json();

      // 3. Resolve role SERVER-SIDE
      const role = resolveRole(discordUser.id);

      // 4. Build session payload
      const sessionPayload = {
        username:      discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar:        discordUser.avatar
          ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64'
          : 'https://cdn.discordapp.com/embed/avatars/' + (parseInt(discordUser.discriminator || '0') % 5) + '.png',
        role: role,
        _did: discordUser.id, // stays in httpOnly cookie, never sent to frontend
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
  }

  /* ---- GET /api/auth/me ---- */
  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).end();
    const user = verifyToken(req);
    if (!user) return res.status(200).json({ authenticated: false });
    return res.status(200).json({
      authenticated: true,
      username:      user.username,
      discriminator: user.discriminator,
      avatar:        user.avatar,
      role:          user.role,
      // discord_id (_did) intentionally omitted
    });
  }

  /* ---- POST /api/auth/logout ---- */
  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).end();
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  /* ---- GET /api/auth/login — deprecated ---- */
  if (action === 'login') {
    return res.status(410).json({
      error:    'Username/password login đã bị xóa. Dùng /api/auth/discord để đăng nhập.',
      redirect: '/api/auth/discord',
    });
  }

  return res.status(404).json({ error: 'Action không hợp lệ' });
};
