/**
 * api/auth/[action].js — Toàn bộ luồng Discord OAuth + session
 *
 * Routes:
 *   GET  /api/auth/discord   — redirect tới Discord OAuth
 *   GET  /api/auth/callback  — Discord OAuth callback (set JWT cookie)
 *   GET  /api/auth/me        — trả về thông tin user từ JWT cookie
 *   POST /api/auth/logout    — xoá session cookie
 *   GET  /api/auth/login     — deprecated → 410
 *
 * Env vars bắt buộc:
 *   JWT_SECRET              — chuỗi bí mật bất kỳ (tối thiểu 32 ký tự)
 *   DISCORD_CLIENT_ID       — Discord application Client ID
 *   DISCORD_CLIENT_SECRET   — Discord application Client Secret
 *   DISCORD_REDIRECT_URI    — ví dụ: https://your-domain.vercel.app/api/auth/callback
 *   OWNER_DISCORD_ID        — Discord User ID của owner (1223927653455757383)
 */

'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET      = process.env.JWT_SECRET;
const CLIENT_ID       = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET   = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI    = process.env.DISCORD_REDIRECT_URI;
const OWNER_ID        = process.env.OWNER_DISCORD_ID;
const COOKIE_NAME     = 'vielist_session';
const STATE_COOKIE    = 'oauth_state';
const SCOPES          = 'identify';
const isVercel        = !!process.env.VERCEL;

/* ── helpers ── */
function parseCookies(req) {
  const map = {};
  (req.headers.cookie || '').split(';').forEach(function (part) {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) map[k] = decodeURIComponent(v);
  });
  return map;
}

function setCORSHeaders(res) {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function secureSuffix() {
  return isVercel ? '; Secure' : '';
}

function setSessionCookie(res, payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  // HttpOnly prevents JS access; SameSite=Lax allows redirect from Discord
  const cookie =
    COOKIE_NAME + '=' + token +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800' +
    secureSuffix();
  return cookie;
}

function clearSessionCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

function setStateCookie(state) {
  return STATE_COOKIE + '=' + state +
    '; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=300' +
    secureSuffix();
}

function clearStateCookie() {
  return STATE_COOKIE + '=; Path=/api/auth; HttpOnly; Max-Age=0';
}

function verifyToken(req) {
  if (!JWT_SECRET) return null;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch (_) { return null; }
}

function resolveRole(discordId) {
  return OWNER_ID && discordId === OWNER_ID ? 'OWNER' : 'USER';
}

/* ── main handler ── */
module.exports = async function handler(req, res) {
  setCORSHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action } = req.query;

  /* ──────────────────────────────
     GET /api/auth/discord
     Bắt đầu Discord OAuth, redirect tới Discord
  ────────────────────────────── */
  if (action === 'discord') {
    if (!CLIENT_ID || !REDIRECT_URI) {
      return res.status(500).json({
        error: 'Discord OAuth chưa cấu hình. Cần đặt DISCORD_CLIENT_ID và DISCORD_REDIRECT_URI trong Vercel.',
      });
    }

    const state    = crypto.randomBytes(16).toString('hex');
    const returnTo = req.query.redirect || '/';

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         SCOPES,
      state:         state + ':' + encodeURIComponent(returnTo),
      prompt:        'none',
    });

    // Set state cookie BEFORE redirect
    res.setHeader('Set-Cookie', [setStateCookie(state)]);
    return res.redirect(302,
      'https://discord.com/api/oauth2/authorize?' + params.toString());
  }

  /* ──────────────────────────────
     GET /api/auth/callback
     Discord redirect về đây sau khi user authorize
  ────────────────────────────── */
  if (action === 'callback') {
    const { code, state: stateParam, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(302, '/?auth_error=' + encodeURIComponent(oauthError));
    }
    if (!code || !stateParam) {
      return res.redirect(302, '/?auth_error=missing_params');
    }

    // Verify CSRF state
    const cookies     = parseCookies(req);
    const storedState = cookies[STATE_COOKIE];
    const colonIdx    = stateParam.indexOf(':');
    const stateValue  = colonIdx >= 0 ? stateParam.slice(0, colonIdx) : stateParam;
    const returnToEnc = colonIdx >= 0 ? stateParam.slice(colonIdx + 1) : '';

    if (!storedState || storedState !== stateValue) {
      return res.redirect(302, '/?auth_error=invalid_state');
    }

    const returnTo = returnToEnc ? decodeURIComponent(returnToEnc) : '/';

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      return res.redirect(302, '/?auth_error=not_configured');
    }
    if (!JWT_SECRET) {
      return res.redirect(302, '/?auth_error=jwt_not_configured');
    }

    try {
      // 1. Exchange authorization code → access token
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
        const errText = await tokenRes.text().catch(() => '');
        console.error('[auth/callback] Token exchange failed:', errText);
        return res.redirect(302, '/?auth_error=token_exchange');
      }

      const tokenData   = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return res.redirect(302, '/?auth_error=no_access_token');
      }

      // 2. Fetch Discord user
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });

      if (!userRes.ok) {
        return res.redirect(302, '/?auth_error=user_fetch');
      }

      const discordUser = await userRes.json();

      // 3. Resolve role server-side (OWNER_DISCORD_ID never exposed to client)
      const role = resolveRole(discordUser.id);

      // 4. Build session payload — discord_id stored in httpOnly cookie only
      const disc = parseInt(discordUser.discriminator || '0', 10);
      const sessionPayload = {
        username:      discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar:        discordUser.avatar
          ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64'
          : 'https://cdn.discordapp.com/embed/avatars/' + (disc % 5) + '.png',
        role:          role,
        _did:          discordUser.id, // stays in JWT / httpOnly cookie; never returned to frontend
      };

      // 5. Build all Set-Cookie headers at once
      const sessionCookieStr = setSessionCookie(res, sessionPayload);
      const clearStateCookieStr = clearStateCookie();

      res.setHeader('Set-Cookie', [sessionCookieStr, clearStateCookieStr]);

      // 6. Redirect to safe return destination
      const safe = returnTo && returnTo.startsWith('/') ? returnTo : '/';
      return res.redirect(302, safe);

    } catch (err) {
      console.error('[auth/callback] Unhandled error:', err);
      return res.redirect(302, '/?auth_error=server_error');
    }
  }

  /* ──────────────────────────────
     GET /api/auth/me
     Trả về thông tin user từ JWT cookie (không bao giờ trả discord_id)
  ────────────────────────────── */
  if (action === 'me') {
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
      // _did intentionally omitted — stays server-side only
    });
  }

  /* ──────────────────────────────
     POST /api/auth/logout
     Xoá session cookie
  ────────────────────────────── */
  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).end();
    res.setHeader('Set-Cookie', [clearSessionCookie()]);
    return res.status(200).json({ ok: true });
  }

  /* ──────────────────────────────
     GET /api/auth/login — deprecated (username/password đã xóa)
  ────────────────────────────── */
  if (action === 'login') {
    return res.status(410).json({
      error:    'Username/password login đã bị xóa. Dùng /api/auth/discord để đăng nhập.',
      redirect: '/api/auth/discord',
    });
  }

  return res.status(404).json({ error: 'Action không hợp lệ: ' + action });
};
