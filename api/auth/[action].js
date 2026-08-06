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
 *   SESSION_SECRET          — chuỗi bí mật bất kỳ (khuyên dùng tên này)
 *   JWT_SECRET              — alias của SESSION_SECRET (code chấp nhận cả hai)
 *   DISCORD_CLIENT_ID       — Discord application Client ID
 *   DISCORD_CLIENT_SECRET   — Discord application Client Secret
 *   DISCORD_REDIRECT_URI    — ví dụ: https://your-domain.vercel.app/api/auth/callback
 *   OWNER_DISCORD_ID        — Discord User ID của owner (1223927653455757383)
 *
 * Chỉ cần đặt MỘT trong hai: SESSION_SECRET hoặc JWT_SECRET trên Vercel.
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { query, ensureSchema } = require('../../lib/db');
const {
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  clearStateCookie,
  verifyToken,
  resolveRole,
  requireOwner,
} = require('../../lib/auth');

// Chấp nhận SESSION_SECRET (ưu tiên) hoặc JWT_SECRET
const JWT_SECRET      = process.env.SESSION_SECRET || process.env.JWT_SECRET;
const CLIENT_ID       = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET   = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI    = process.env.DISCORD_REDIRECT_URI;
const COOKIE_NAME     = 'vielist_session';
const STATE_COOKIE    = 'oauth_state';
const SCOPES          = 'identify';
const DB              = !!process.env.DATABASE_URL;
const DATA_DIR        = path.join(process.cwd(), 'assets', 'data');
const SERVERS         = ['is7mc', 'kingmc'];
const SETTING_DEFAULTS = {
  site_name: 'VIELIST', site_logo: 'VIELIST', logo_url: '', hero_logo_url: '',
  avatar_url: '', hero_banner_url: '', hero_title: 'Những người chơi',
  hero_highlight: 'được nhớ tên.',
  hero_lead: 'VIELIST lưu lại từng cuộc chiến, từng lần lên hạng và những cái tên làm nên lịch sử của cộng đồng Minecraft Việt Nam.',
  intro_title: 'Một mạng lưới dành cho những cái tên đáng nhớ.',
  intro_body: 'Theo dõi các server, khám phá những câu chuyện phía sau bảng xếp hạng và cùng xây dựng lịch sử Minecraft Việt Nam.',
  story_title: 'Mỗi trận đấu đều để lại dấu ấn.',
  story_body: 'Từ khoảnh khắc đầu tiên bước vào server đến ngày được xướng tên, VIELIST biến hành trình của người chơi thành một phần ký ức có thể tìm lại.',
  cta_title: 'Không chỉ là một con số.',
  cta_body: 'Khám phá những nhà vua và các thông báo mới nhất của VIELIST.',
  footer_text: '© 2026 VIELIST — Minecraft Leaderboard',
  discord_link: 'https://discord.com',
  join_discord_enabled: 'true',
  primary_color: '#00d4ff', effects_enabled: 'true',
};
const SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

function sendServerError(res, scope, error) {
  const detail = error && error.message ? error.message : String(error || 'Unknown error');
  console.error(error);
  console.error('[' + scope + '] API error:', error && error.stack ? error.stack : detail);
  return res.status(500).json({
    success: false,
    error: scope + ': ' + detail,
  });
}

function sendApiError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function readData(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch (_) { return fallback; }
}

function announcementObject(row) {
  return {
    id: row.id, type: row.type, icon: row.icon, title: row.title,
    content: row.content, date: row.date, pinned: row.pinned,
    author: {
      username: row.author_username || 'VIELIST Admin',
      avatar: row.author_avatar || '',
      role: row.author_role || 'Admin',
    },
    border_color: row.border_color || '#00d4ff',
    background_color: row.background_color || '#101827',
    accent_color: row.accent_color || '#00d4ff',
    scheduled_at: row.scheduled_at || null,
  };
}

function kingObject(row) {
  return {
    id: row.id, server: row.server, category: 'king',
    username: row.username, score: row.score, rank: row.rank,
  };
}

async function getPublicSettings() {
  if (!DB) return SETTING_DEFAULTS;
  try {
    const result = await query(
      'SELECT key, value FROM settings WHERE key = ANY($1)', [SETTING_KEYS]);
    const settings = Object.assign({}, SETTING_DEFAULTS);
    result.rows.forEach(function (row) { settings[row.key] = row.value; });
    return settings;
  } catch (error) {
    console.error('[settings/get] API error:', error && error.stack ? error.stack : error);
    return SETTING_DEFAULTS;
  }
}

async function handleAnnouncements(req, res) {
  const id = req.query.id;
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({
      success: true,
      data: readData('announcements.json', []),
    });
    const result = await query(
      'SELECT * FROM announcements WHERE (scheduled_at IS NULL OR scheduled_at <= NOW()) ORDER BY pinned DESC, date DESC',
      []);
    return res.status(200).json({
      success: true,
      data: result.rows.map(announcementObject),
    });
  }
  if (!requireOwner(req, res)) return;
  if (req.method === 'POST' || req.method === 'PUT') {
    const body = req.body || {};
    if (!body.title || !body.content || !body.date)
      return sendApiError(res, 400, 'title, content, date required');
    if (!DB) return sendApiError(res, 503, 'Database not configured');
    if (req.method === 'POST') {
      const user = verifyToken(req) || {};
      const author = body.author || {};
      const result = await query(
        `INSERT INTO announcements
         (type, icon, title, content, date, pinned, author_username, author_avatar, author_role,
          border_color, background_color, accent_color, scheduled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [body.type || 'news', body.icon || '📢', body.title, body.content, body.date,
          !!body.pinned, user.username || author.username || 'VIELIST Admin',
          user.avatar || author.avatar || '', 'Admin',
          body.border_color || '#00d4ff', body.background_color || '#101827',
          body.accent_color || '#00d4ff', body.scheduled_at || null]);
      return res.status(201).json(Object.assign({ success: true }, announcementObject(result.rows[0])));
    }
    if (!id) return sendApiError(res, 400, 'id required');
    const result = await query(
      `UPDATE announcements SET type=$1, icon=$2, title=$3, content=$4, date=$5,
       pinned=$6, border_color=$7, background_color=$8, accent_color=$9,
       scheduled_at=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
      [body.type || 'news', body.icon || '📢', body.title, body.content, body.date,
        !!body.pinned, body.border_color || '#00d4ff', body.background_color || '#101827',
        body.accent_color || '#00d4ff', body.scheduled_at || null, id]);
    return result.rows.length
      ? res.status(200).json(Object.assign({ success: true }, announcementObject(result.rows[0])))
      : sendApiError(res, 404, 'Not found');
  }
  if (req.method === 'DELETE') {
    if (!id) return sendApiError(res, 400, 'id required');
    if (!DB) return sendApiError(res, 503, 'Database not configured');
    const result = await query(
      'DELETE FROM announcements WHERE id=$1 RETURNING id', [id]);
    return result.rows.length
      ? res.status(200).json({ success: true, ok: true })
      : sendApiError(res, 404, 'Not found');
  }
  return sendApiError(res, 405, 'Method not allowed');
}

async function handleAnnouncementComments(req, res) {
  const announcementId = String(req.query.announcement_id || '');
  if (!announcementId) return sendApiError(res, 400, 'announcement_id required');
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({ success: true, data: [] });
    const result = await query(
      'SELECT id, announcement_id, username, avatar, content, created_at FROM announcement_comments WHERE announcement_id=$1 ORDER BY created_at ASC',
      [announcementId]);
    return res.status(200).json({ success: true, data: result.rows });
  }
  if (req.method !== 'POST') return sendApiError(res, 405, 'Method not allowed');
  const user = verifyToken(req);
  if (!user) return sendApiError(res, 401, 'Đăng nhập Discord để bình luận');
  const content = String((req.body || {}).content || '').trim();
  if (!content) return sendApiError(res, 400, 'Nội dung bình luận không được để trống');
  if (!DB) return sendApiError(res, 503, 'Database not configured');
  const result = await query(
    `INSERT INTO announcement_comments (announcement_id, username, avatar, content)
     VALUES ($1,$2,$3,$4)
     RETURNING id, announcement_id, username, avatar, content, created_at`,
    [announcementId, user.username || 'Discord user', user.avatar || '', content]);
  return res.status(201).json(Object.assign({ success: true }, result.rows[0]));
}

async function handleLeaderboard(req, res) {
  const server = String(req.query.server || '').toLowerCase();
  const id = req.query.id;
  if (!SERVERS.includes(server))
    return sendApiError(res, 400, 'server không hợp lệ');
  if (req.method === 'GET') {
    if (!DB) {
      const data = readData('leaderboard.json', {});
      return res.status(200).json({
        success: true,
        king: (data[server] || {}).king || [],
      });
    }
    const result = await query(
      'SELECT * FROM leaderboard WHERE server=$1 AND category=$2 ORDER BY rank ASC',
      [server, 'king']);
    return res.status(200).json({
      success: true,
      king: result.rows.map(kingObject),
    });
  }
  if (!requireOwner(req, res)) return;
  if (req.method === 'POST') {
    if (!DB) return sendApiError(res, 503, 'Database not configured');
    const body = req.body || {};
    if (!body.username || body.score === undefined)
      return sendApiError(res, 400, 'username, score required');
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0)
      return sendApiError(res, 400, 'score phải là số nguyên không âm');
    const rankResult = await query(
      'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE server=$1 AND category=$2 AND score > $3',
      [server, 'king', score]);
    const rank = Number(rankResult.rows[0].rank);
    await query(
      'UPDATE leaderboard SET rank=rank+1 WHERE server=$1 AND category=$2 AND rank >= $3',
      [server, 'king', rank]);
    const result = await query(
      'INSERT INTO leaderboard (server, category, username, score, rank) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [server, 'king', body.username, score, rank]);
    return res.status(201).json(Object.assign({ success: true }, kingObject(result.rows[0])));
  }
  if (!DB) return sendApiError(res, 503, 'Database not configured');
  if (!id) return sendApiError(res, 400, 'id required');
  if (req.method === 'PUT') {
    const body = req.body || {};
    const fields = [];
    const values = [];
    if (body.username !== undefined) {
      fields.push('username=$' + (values.length + 1)); values.push(body.username);
    }
    if (body.score !== undefined) {
      const score = Number(body.score);
      if (!Number.isInteger(score) || score < 0)
        return sendApiError(res, 400, 'score phải là số nguyên không âm');
      fields.push('score=$' + (values.length + 1)); values.push(score);
    }
    if (body.rank !== undefined) {
      const rank = Number(body.rank);
      if (!Number.isInteger(rank) || rank < 1)
        return sendApiError(res, 400, 'rank phải là số nguyên dương');
      fields.push('rank=$' + (values.length + 1)); values.push(rank);
    }
    if (!fields.length)
      return sendApiError(res, 400, 'Không có trường nào để cập nhật');
    const idPosition = values.length + 1;
    values.push(id, server);
    const serverPosition = values.length;
    const result = await query(
      'UPDATE leaderboard SET ' + fields.join(', ') +
      ', updated_at=NOW() WHERE id=$' + idPosition +
      ' AND server=$' + serverPosition + ' RETURNING *', values);
    return result.rows.length
      ? res.status(200).json(Object.assign({ success: true }, kingObject(result.rows[0])))
      : sendApiError(res, 404, 'Entry not found');
  }
  if (req.method === 'DELETE') {
    const result = await query(
      'DELETE FROM leaderboard WHERE id=$1 AND server=$2 AND category=$3 RETURNING rank',
      [id, server, 'king']);
    if (!result.rows.length) return sendApiError(res, 404, 'Not found');
    await query(
      'UPDATE leaderboard SET rank=rank-1 WHERE server=$1 AND category=$2 AND rank>$3',
      [server, 'king', result.rows[0].rank]);
    return res.status(200).json({ success: true, ok: true });
  }
  return sendApiError(res, 405, 'Method not allowed');
}

async function handleSettings(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(Object.assign({ success: true }, await getPublicSettings()));
  }
  if (req.method !== 'PUT') return sendApiError(res, 405, 'Method not allowed');
  if (!requireOwner(req, res)) return;
  if (!DB) return sendApiError(res, 503, 'Database not configured');
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    return sendApiError(res, 400, 'Dữ liệu settings không hợp lệ');
  for (const key in (req.body || {})) {
    if (SETTING_KEYS.includes(key)) {
      await query(
        'INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
        [key, String(req.body[key])]);
    }
  }
  return res.status(200).json(Object.assign({ success: true }, await getPublicSettings()));
}

async function handleStats(req, res) {
  if (req.method !== 'GET') return sendApiError(res, 405, 'Method not allowed');
  if (!requireOwner(req, res)) return;
  if (!DB) {
    const announcements = readData('announcements.json', []);
    const data = readData('leaderboard.json', {});
    const kingCount = SERVERS.reduce(function (count, server) {
      return count + (((data[server] || {}).king || []).length);
    }, 0);
    return res.status(200).json({
      success: true,
      announcements: announcements.length, leaderboard: kingCount,
      db_connected: false, updated_at: new Date().toISOString(),
    });
  }
  const results = await Promise.all([
    query('SELECT COUNT(*) AS count FROM announcements', []),
    query("SELECT COUNT(*) AS count FROM leaderboard WHERE category='king'", []),
  ]);
  return res.status(200).json({
    success: true,
    announcements: Number(results[0].rows[0].count),
    leaderboard: Number(results[1].rows[0].count),
    db_connected: true, updated_at: new Date().toISOString(),
  });
}

async function handleData(req, res) {
  try {
    if (DB) await ensureSchema();
    const resource = Array.isArray(req.query.resource)
      ? req.query.resource[0] : req.query.resource;
    if (resource === 'announcements') return await handleAnnouncements(req, res);
    if (resource === 'announcement-comments') return await handleAnnouncementComments(req, res);
    if (resource === 'leaderboard') return await handleLeaderboard(req, res);
    if (resource === 'settings') return await handleSettings(req, res);
    if (resource === 'stats') return await handleStats(req, res);
    return res.status(404).json({ success: false, error: 'Resource không hợp lệ' });
  } catch (error) {
    return sendServerError(res, 'data', error);
  }
}

function setCORSHeaders(res) {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* ── main handler ── */
async function handleRequest(req, res) {
  setCORSHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const { action } = req.query;
  if (action === 'data') return handleData(req, res);

  /* ──────────────────────────────
     GET /api/auth/discord
     Bắt đầu Discord OAuth, redirect tới Discord
  ────────────────────────────── */
  if (action === 'discord') {
    if (!CLIENT_ID || !REDIRECT_URI) {
      return res.status(500).json({
        success: false,
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
      const sessionCookieStr = setSessionCookie(sessionPayload);
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
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const user = verifyToken(req);
    if (!user) {
      return res.status(200).json({ success: true, authenticated: false });
    }
    return res.status(200).json({
      success: true,
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
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    res.setHeader('Set-Cookie', [clearSessionCookie()]);
    return res.status(200).json({ success: true, ok: true });
  }

  /* ──────────────────────────────
     GET /api/auth/login — deprecated (username/password đã xóa)
  ────────────────────────────── */
  if (action === 'login') {
    return res.status(410).json({
      success: false,
      error:    'Username/password login đã bị xóa. Dùng /api/auth/discord để đăng nhập.',
      redirect: '/api/auth/discord',
    });
  }

  return sendApiError(res, 404, 'Action không hợp lệ: ' + action);
}

module.exports = async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (error) {
    return sendServerError(res, 'handler', error);
  }
};
