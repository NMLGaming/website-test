/**
 * VIELIST API: Discord authentication, announcements and the King system.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query, ensureSchema } = require('../../lib/db');
const {
  parseCookies, setSessionCookie, clearSessionCookie, setStateCookie,
  clearStateCookie, verifyToken, resolveRole, requireAuth, requireOwner,
} = require('../../lib/auth');

const DB = !!process.env.DATABASE_URL;
const DATA_DIR = path.join(process.cwd(), 'assets', 'data');
const SERVERS = ['is7mc', 'kingmc'];
const SETTING_DEFAULTS = {
  site_name: 'VIELIST', site_logo: 'VIELIST', logo_url: '', hero_logo_url: '',
  avatar_url: '', hero_banner_url: '', hero_title: 'Những người chơi',
  hero_highlight: 'được nhớ tên.',
  hero_lead: 'VIELIST lưu lại những nhà vua, những triều đại và câu chuyện của cộng đồng Minecraft Việt Nam.',
  intro_title: 'Một mạng lưới dành cho những cái tên đáng nhớ.',
  intro_body: 'Mỗi server có một ngai vàng. Mỗi triều đại đều có một câu chuyện để nhớ lại.',
  story_title: 'Một cái tên. Một triều đại. Một di sản.',
  story_body: 'VIELIST giúp cộng đồng đề cử, vinh danh và lưu giữ lịch sử những người từng đứng trên ngai vàng.',
  cta_title: 'Ai sẽ là vị vua tiếp theo?',
  cta_body: 'Đăng nhập Discord, khám phá các server và tham gia đề cử khi một đợt bình chọn mở.',
  footer_text: '© 2026 VIELIST — The home of Kings',
  discord_link: 'https://discord.com', join_discord_enabled: 'true',
  primary_color: '#00d4ff', effects_enabled: 'true',
};
const SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

function error(res, status, message) { return res.status(status).json({ success: false, error: message }); }
function jsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (_) { return {}; }
}
function readData(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch (_) { return fallback; }
}
function serverOf(req) { return String(req.query.server || '').toLowerCase(); }
function validServer(server) { return SERVERS.includes(server); }
function dateValue(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function announcementObject(row) {
  return {
    id: row.id, type: row.type, icon: row.icon, title: row.title, content: row.content,
    date: row.date, pinned: row.pinned,
    author: { username: row.author_username || 'VIELIST Admin', avatar: row.author_avatar || '', role: row.author_role || 'Admin' },
    border_color: row.border_color || '#00d4ff', background_color: row.background_color || '#101827',
    accent_color: row.accent_color || '#00d4ff', scheduled_at: row.scheduled_at || null,
  };
}
function kingObject(row) {
  if (!row) return null;
  return {
    id: row.id, server: row.server, display_name: row.display_name,
    avatar_url: row.avatar_url || '', reign_title: row.reign_title || 'Nhà vua',
    description: row.description || '', banner_url: row.banner_url || '',
    logo_url: row.logo_url || '', crowned_at: row.crowned_at,
    ended_at: row.ended_at || null, end_reason: row.end_reason || '',
  };
}
function candidateObject(row) {
  return {
    id: row.id, campaign_id: row.campaign_id, display_name: row.display_name,
    avatar_url: row.avatar_url || '', description: row.description || '',
    votes: Number(row.votes || 0),
  };
}
async function getPublicSettings() {
  if (!DB) return Object.assign({}, SETTING_DEFAULTS);
  const settings = Object.assign({}, SETTING_DEFAULTS);
  const result = await query('SELECT key,value FROM settings WHERE key = ANY($1)', [SETTING_KEYS]);
  result.rows.forEach((row) => { settings[row.key] = row.value; });
  return settings;
}

async function resolveExpiredCampaign(server) {
  if (!DB || !validServer(server)) return;
  await query(
    `UPDATE nomination_campaigns SET status='open', updated_at=NOW()
     WHERE server=$1 AND status='scheduled' AND starts_at <= NOW() AND ends_at > NOW()`,
    [server]);
  const expired = await query(
    `SELECT * FROM nomination_campaigns
     WHERE server=$1 AND status IN ('open','scheduled') AND ends_at <= NOW()
     ORDER BY ends_at ASC`, [server]);
  for (const campaign of expired.rows) {
    const winner = await query(
      `SELECT c.*, COUNT(v.id)::int AS votes
       FROM nomination_candidates c LEFT JOIN nomination_votes v ON v.candidate_id=c.id
       WHERE c.campaign_id=$1 GROUP BY c.id ORDER BY COUNT(v.id) DESC, c.created_at ASC LIMIT 1`,
      [campaign.id]);
    await query('UPDATE nomination_campaigns SET status=$1, updated_at=NOW() WHERE id=$2', ['resolved', campaign.id]);
    if (winner.rows[0]) {
      const existing = await query('SELECT id FROM kings WHERE server=$1 AND ended_at IS NULL', [server]);
      if (!existing.rows.length) {
        const c = winner.rows[0];
        await query(
          `INSERT INTO kings(server,display_name,avatar_url,description,crowned_at)
           VALUES($1,$2,$3,$4,NOW())`, [server, c.display_name, c.avatar_url || '', c.description || '']);
      }
    }
  }
}

async function handleAnnouncements(req, res) {
  const id = req.query.id;
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({ success: true, data: readData('announcements.json', []) });
    const result = await query(
      'SELECT * FROM announcements WHERE (scheduled_at IS NULL OR scheduled_at <= NOW()) ORDER BY pinned DESC,date DESC', []);
    return res.status(200).json({ success: true, data: result.rows.map(announcementObject) });
  }
  if (!requireOwner(req, res)) return;
  const body = jsonBody(req);
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!body.title || !body.content || !body.date) return error(res, 400, 'title, content, date required');
    if (!DB) return error(res, 503, 'Database not configured');
    if (req.method === 'POST') {
      const user = verifyToken(req) || {};
      const result = await query(
        `INSERT INTO announcements(type,icon,title,content,date,pinned,author_username,author_avatar,author_role,
         border_color,background_color,accent_color,scheduled_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,'Admin',$9,$10,$11,$12) RETURNING *`,
        [body.type || 'news', body.icon || '📢', body.title, body.content, body.date, !!body.pinned,
          user.username || 'VIELIST Admin', user.avatar || '', body.border_color || '#00d4ff',
          body.background_color || '#101827', body.accent_color || '#00d4ff', body.scheduled_at || null]);
      return res.status(201).json(Object.assign({ success: true }, announcementObject(result.rows[0])));
    }
    if (!id) return error(res, 400, 'id required');
    const result = await query(
      `UPDATE announcements SET type=$1,icon=$2,title=$3,content=$4,date=$5,pinned=$6,
       border_color=$7,background_color=$8,accent_color=$9,scheduled_at=$10,updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [body.type || 'news', body.icon || '📢', body.title, body.content, body.date, !!body.pinned,
        body.border_color || '#00d4ff', body.background_color || '#101827', body.accent_color || '#00d4ff',
        body.scheduled_at || null, id]);
    return result.rows[0] ? res.status(200).json(Object.assign({ success: true }, announcementObject(result.rows[0]))) : error(res, 404, 'Not found');
  }
  if (req.method === 'DELETE') {
    if (!DB) return error(res, 503, 'Database not configured');
    const result = await query('DELETE FROM announcements WHERE id=$1 RETURNING id', [id]);
    return result.rows[0] ? res.status(200).json({ success: true }) : error(res, 404, 'Not found');
  }
  return error(res, 405, 'Method not allowed');
}

async function handleComments(req, res) {
  const id = String(req.query.announcement_id || '');
  if (!id) return error(res, 400, 'announcement_id required');
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({ success: true, data: [] });
    const result = await query('SELECT id,announcement_id,username,avatar,content,created_at FROM announcement_comments WHERE announcement_id=$1 ORDER BY created_at ASC', [id]);
    return res.status(200).json({ success: true, data: result.rows });
  }
  if (req.method !== 'POST') return error(res, 405, 'Method not allowed');
  const user = requireAuth(req, res);
  if (!user) return;
  const content = String(jsonBody(req).content || '').trim();
  if (!content) return error(res, 400, 'Nội dung bình luận không được để trống');
  if (!DB) return error(res, 503, 'Database not configured');
  const result = await query(
    'INSERT INTO announcement_comments(announcement_id,username,avatar,content) VALUES($1,$2,$3,$4) RETURNING *',
    [id, user.username || 'Discord user', user.avatar || '', content]);
  return res.status(201).json(Object.assign({ success: true }, result.rows[0]));
}

async function getCurrentKing(server) {
  await resolveExpiredCampaign(server);
  if (!DB) return null;
  const result = await query('SELECT * FROM kings WHERE server=$1 AND ended_at IS NULL ORDER BY crowned_at DESC LIMIT 1', [server]);
  return kingObject(result.rows[0]);
}
async function getCampaign(server, includeAdmin) {
  await resolveExpiredCampaign(server);
  if (!DB) return null;
  const result = await query(
    `SELECT * FROM nomination_campaigns
     WHERE server=$1 AND status IN ('scheduled','open') AND ends_at > NOW()
     ORDER BY starts_at DESC LIMIT 1`, [server]);
  if (!result.rows[0]) return null;
  const campaign = result.rows[0];
  const candidates = await query(
    `SELECT c.*,COUNT(v.id)::int AS votes FROM nomination_candidates c
     LEFT JOIN nomination_votes v ON v.candidate_id=c.id
     WHERE c.campaign_id=$1 GROUP BY c.id ORDER BY votes DESC,c.created_at ASC`, [campaign.id]);
  let myVote = null;
  const user = verifyToken({ headers: { cookie: '' } });
  if (!includeAdmin && user) myVote = null;
  return {
    id: campaign.id, server: campaign.server, title: campaign.title,
    description: campaign.description, starts_at: campaign.starts_at, ends_at: campaign.ends_at,
    status: campaign.status, candidates: candidates.rows.map(candidateObject), my_vote: myVote,
  };
}
async function handleKing(req, res) {
  const server = serverOf(req);
  if (!validServer(server)) return error(res, 400, 'server không hợp lệ');
  if (req.method === 'GET') {
    const king = await getCurrentKing(server);
    return res.status(200).json({ success: true, server, king });
  }
  if (!requireOwner(req, res)) return;
  const body = jsonBody(req);
  if (!DB) return error(res, 503, 'Database not configured');
  if (req.method === 'POST') {
    if (!body.display_name) return error(res, 400, 'display_name required');
    const active = await query('SELECT id FROM kings WHERE server=$1 AND ended_at IS NULL', [server]);
    if (active.rows.length) return error(res, 409, 'Server đã có một nhà vua');
    const result = await query(
      `INSERT INTO kings(server,display_name,avatar_url,reign_title,description,banner_url,logo_url,crowned_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [server, body.display_name, body.avatar_url || '', body.reign_title || 'Nhà vua',
        body.description || '', body.banner_url || '', body.logo_url || '', body.crowned_at || new Date().toISOString()]);
    return res.status(201).json(Object.assign({ success: true }, kingObject(result.rows[0])));
  }
  if (req.method === 'PUT') {
    if (!body.id || !body.display_name) return error(res, 400, 'id, display_name required');
    const result = await query(
      `UPDATE kings SET display_name=$1,avatar_url=$2,reign_title=$3,description=$4,banner_url=$5,
       logo_url=$6,crowned_at=$7,updated_at=NOW() WHERE id=$8 AND server=$9 RETURNING *`,
      [body.display_name, body.avatar_url || '', body.reign_title || 'Nhà vua', body.description || '',
        body.banner_url || '', body.logo_url || '', body.crowned_at || new Date().toISOString(), body.id, server]);
    return result.rows[0] ? res.status(200).json(Object.assign({ success: true }, kingObject(result.rows[0]))) : error(res, 404, 'King not found');
  }
  return error(res, 405, 'Method not allowed');
}
async function handleHistory(req, res) {
  const server = serverOf(req);
  if (!validServer(server)) return error(res, 400, 'server không hợp lệ');
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({ success: true, server, data: [] });
    const result = await query('SELECT * FROM kings WHERE server=$1 ORDER BY crowned_at DESC', [server]);
    return res.status(200).json({ success: true, server, data: result.rows.map(kingObject) });
  }
  if (!requireOwner(req, res)) return;
  if (!DB) return error(res, 503, 'Database not configured');
  const body = jsonBody(req);
  if (req.method === 'POST') {
    if (!body.id || !body.reason) return error(res, 400, 'id và lý do kết thúc là bắt buộc');
    const result = await query(
      'UPDATE kings SET ended_at=NOW(),end_reason=$1,updated_at=NOW() WHERE id=$2 AND server=$3 AND ended_at IS NULL RETURNING *',
      [body.reason.trim(), body.id, server]);
    return result.rows[0] ? res.status(200).json(Object.assign({ success: true }, kingObject(result.rows[0]))) : error(res, 404, 'King not found');
  }
  if (req.method === 'DELETE') {
    if (!body.id || !body.reason) return error(res, 400, 'id và lý do xóa là bắt buộc');
    const result = await query('DELETE FROM kings WHERE id=$1 AND server=$2 RETURNING id', [body.id, server]);
    return result.rows[0] ? res.status(200).json({ success: true }) : error(res, 404, 'King not found');
  }
  return error(res, 405, 'Method not allowed');
}
async function campaignPayload(campaign) {
  if (!campaign) return null;
  const candidates = await query(
    `SELECT c.*,COUNT(v.id)::int AS votes FROM nomination_candidates c
     LEFT JOIN nomination_votes v ON v.candidate_id=c.id
     WHERE c.campaign_id=$1 GROUP BY c.id ORDER BY votes DESC,c.created_at ASC`, [campaign.id]);
  return Object.assign({}, campaign, {
    candidates: candidates.rows.map(candidateObject),
  });
}
async function handleNomination(req, res) {
  const server = serverOf(req);
  if (!validServer(server)) return error(res, 400, 'server không hợp lệ');
  await resolveExpiredCampaign(server);
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json({ success: true, data: null });
    const result = await query(
      `SELECT * FROM nomination_campaigns WHERE server=$1 AND status IN ('scheduled','open')
       ORDER BY starts_at DESC LIMIT 1`, [server]);
    const data = await campaignPayload(result.rows[0]);
    const user = verifyToken(req);
    if (data && user) {
      const vote = await query('SELECT candidate_id FROM nomination_votes WHERE campaign_id=$1 AND user_id=$2', [data.id, user._did]);
      data.my_vote = vote.rows[0] ? vote.rows[0].candidate_id : null;
    } else if (data) data.my_vote = null;
    return res.status(200).json({ success: true, data });
  }
  const user = requireAuth(req, res);
  if (!user) return;
  if (!DB) return error(res, 503, 'Database not configured');
  const body = jsonBody(req);
  const campaignResult = await query(
    `SELECT c.* FROM nomination_campaigns c JOIN nomination_candidates n ON n.campaign_id=c.id
     WHERE c.server=$1 AND c.status='open' AND c.starts_at <= NOW() AND c.ends_at > NOW() AND n.id=$2 LIMIT 1`,
    [server, body.candidate_id]);
  const campaign = campaignResult.rows[0];
  if (!campaign) return error(res, 400, 'Đợt đề cử không còn mở hoặc ứng viên không hợp lệ');
  if (req.method === 'POST') {
    try {
      const result = await query(
        'INSERT INTO nomination_votes(campaign_id,candidate_id,user_id,user_name) VALUES($1,$2,$3,$4) RETURNING id',
        [campaign.id, body.candidate_id, user._did, user.username || 'Discord user']);
      return res.status(201).json({ success: true, vote_id: result.rows[0].id });
    } catch (e) {
      if (String(e.message).includes('nomination_votes_campaign_id_user_id_key')) return error(res, 409, 'Bạn đã đề cử một ứng viên. Hãy hủy đề cử trước khi đổi.');
      throw e;
    }
  }
  if (req.method === 'DELETE') {
    const result = await query('DELETE FROM nomination_votes WHERE campaign_id=$1 AND user_id=$2 RETURNING id', [campaign.id, user._did]);
    return result.rows[0] ? res.status(200).json({ success: true }) : error(res, 404, 'Bạn chưa có đề cử để hủy');
  }
  return error(res, 405, 'Method not allowed');
}
async function handleCampaigns(req, res) {
  const server = serverOf(req);
  if (!validServer(server)) return error(res, 400, 'server không hợp lệ');
  if (!requireOwner(req, res)) return;
  if (!DB) return error(res, 503, 'Database not configured');
  const body = jsonBody(req);
  if (req.method === 'GET') {
    const result = await query('SELECT * FROM nomination_campaigns WHERE server=$1 ORDER BY starts_at DESC', [server]);
    const data = [];
    for (const campaign of result.rows) data.push(await campaignPayload(campaign));
    return res.status(200).json({ success: true, data });
  }
  if (req.method === 'POST') {
    if (!body.title || !body.starts_at || !body.ends_at) return error(res, 400, 'title, starts_at, ends_at required');
    const starts = dateValue(body.starts_at); const ends = dateValue(body.ends_at);
    if (!starts || !ends || new Date(ends) <= new Date(starts)) return error(res, 400, 'Thời gian đề cử không hợp lệ');
    const status = new Date(starts) > new Date() ? 'scheduled' : 'open';
    const result = await query(
      'INSERT INTO nomination_campaigns(server,title,description,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [server, body.title, body.description || '', starts, ends, status]);
    return res.status(201).json(Object.assign({ success: true }, await campaignPayload(result.rows[0])));
  }
  if (req.method === 'PUT') {
    if (!body.id || !body.title || !body.starts_at || !body.ends_at) return error(res, 400, 'id, title, starts_at, ends_at required');
    const result = await query(
      `UPDATE nomination_campaigns SET title=$1,description=$2,starts_at=$3,ends_at=$4,
       status=CASE WHEN $4::timestamptz <= NOW() THEN 'resolved' WHEN $3::timestamptz > NOW() THEN 'scheduled' ELSE 'open' END,
       updated_at=NOW() WHERE id=$5 AND server=$6 RETURNING *`,
      [body.title, body.description || '', dateValue(body.starts_at), dateValue(body.ends_at), body.id, server]);
    return result.rows[0] ? res.status(200).json(Object.assign({ success: true }, await campaignPayload(result.rows[0]))) : error(res, 404, 'Campaign not found');
  }
  if (req.method === 'DELETE') {
    if (!body.id) return error(res, 400, 'id required');
    const result = await query('DELETE FROM nomination_campaigns WHERE id=$1 AND server=$2 RETURNING id', [body.id, server]);
    return result.rows[0] ? res.status(200).json({ success: true }) : error(res, 404, 'Campaign not found');
  }
  return error(res, 405, 'Method not allowed');
}
async function handleCandidates(req, res) {
  if (!requireOwner(req, res)) return;
  if (!DB) return error(res, 503, 'Database not configured');
  const body = jsonBody(req); const campaignId = String(req.query.campaign_id || '');
  if (!campaignId) return error(res, 400, 'campaign_id required');
  if (req.method === 'POST') {
    if (!body.display_name) return error(res, 400, 'display_name required');
    const result = await query(
      'INSERT INTO nomination_candidates(campaign_id,display_name,avatar_url,description) VALUES($1,$2,$3,$4) RETURNING *',
      [campaignId, body.display_name, body.avatar_url || '', body.description || '']);
    return res.status(201).json(Object.assign({ success: true }, candidateObject(result.rows[0])));
  }
  if (req.method === 'PUT') {
    if (!body.id || !body.display_name) return error(res, 400, 'id, display_name required');
    const result = await query(
      'UPDATE nomination_candidates SET display_name=$1,avatar_url=$2,description=$3 WHERE id=$4 AND campaign_id=$5 RETURNING *',
      [body.display_name, body.avatar_url || '', body.description || '', body.id, campaignId]);
    return result.rows[0] ? res.status(200).json(Object.assign({ success: true }, candidateObject(result.rows[0]))) : error(res, 404, 'Candidate not found');
  }
  if (req.method === 'DELETE') {
    if (!body.id) return error(res, 400, 'id required');
    const result = await query('DELETE FROM nomination_candidates WHERE id=$1 AND campaign_id=$2 RETURNING id', [body.id, campaignId]);
    return result.rows[0] ? res.status(200).json({ success: true }) : error(res, 404, 'Candidate not found');
  }
  return error(res, 405, 'Method not allowed');
}
async function handleSettings(req, res) {
  if (req.method === 'GET') return res.status(200).json(Object.assign({ success: true }, await getPublicSettings()));
  if (req.method !== 'PUT') return error(res, 405, 'Method not allowed');
  if (!requireOwner(req, res)) return;
  if (!DB) return error(res, 503, 'Database not configured');
  for (const key of Object.keys(jsonBody(req))) if (SETTING_KEYS.includes(key)) {
    await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2', [key, String(jsonBody(req)[key])]);
  }
  return res.status(200).json(Object.assign({ success: true }, await getPublicSettings()));
}
async function handleStats(req, res) {
  if (req.method !== 'GET') return error(res, 405, 'Method not allowed');
  if (!requireOwner(req, res)) return;
  if (!DB) return res.status(200).json({ success: true, announcements: 0, kings: 0, campaigns: 0, db_connected: false, updated_at: new Date().toISOString() });
  const result = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM announcements', []),
    query('SELECT COUNT(*)::int AS count FROM kings WHERE ended_at IS NULL', []),
    query(`SELECT COUNT(*)::int AS count FROM nomination_campaigns WHERE status IN ('scheduled','open')`, []),
  ]);
  return res.status(200).json({ success: true, announcements: result[0].rows[0].count, kings: result[1].rows[0].count, campaigns: result[2].rows[0].count, db_connected: true, updated_at: new Date().toISOString() });
}
async function handleData(req, res) {
  try {
    if (DB) await ensureSchema();
    const resource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource;
    if (resource === 'announcements') return await handleAnnouncements(req, res);
    if (resource === 'announcement-comments') return await handleComments(req, res);
    if (resource === 'king') return await handleKing(req, res);
    if (resource === 'history') return await handleHistory(req, res);
    if (resource === 'nomination') return await handleNomination(req, res);
    if (resource === 'campaigns') return await handleCampaigns(req, res);
    if (resource === 'candidates') return await handleCandidates(req, res);
    if (resource === 'settings') return await handleSettings(req, res);
    if (resource === 'stats') return await handleStats(req, res);
    return error(res, 404, 'Resource không hợp lệ');
  } catch (e) {
    console.error('[data] API error:', e && e.stack ? e.stack : e);
    return error(res, 500, e.message || 'Server error');
  }
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
async function handleRequest(req, res) {
  cors(res); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  if (action === 'data') return handleData(req, res);
  if (action === 'discord') {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) return error(res, 500, 'Discord OAuth chưa cấu hình');
    const state = crypto.randomBytes(16).toString('hex');
    const returnTo = String(req.query.redirect || '/');
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code', scope: 'identify', state: state + ':' + encodeURIComponent(returnTo), prompt: 'none',
    });
    res.setHeader('Set-Cookie', [setStateCookie(state)]);
    return res.redirect(302, 'https://discord.com/api/oauth2/authorize?' + params.toString());
  }
  if (action === 'callback') {
    const { code, state: stateParam, error: oauthError } = req.query;
    if (oauthError) return res.redirect(302, '/?auth_error=' + encodeURIComponent(oauthError));
    if (!code || !stateParam) return res.redirect(302, '/?auth_error=missing_params');
    const cookies = parseCookies(req); const colon = String(stateParam).indexOf(':');
    const state = colon >= 0 ? String(stateParam).slice(0, colon) : String(stateParam);
    const encodedReturn = colon >= 0 ? String(stateParam).slice(colon + 1) : '';
    if (!cookies.oauth_state || cookies.oauth_state !== state) return res.redirect(302, '/?auth_error=invalid_state');
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.DISCORD_REDIRECT_URI) return res.redirect(302, '/?auth_error=not_configured');
    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: String(code), redirect_uri: process.env.DISCORD_REDIRECT_URI }).toString(),
      });
      if (!tokenResponse.ok) return res.redirect(302, '/?auth_error=token_exchange');
      const token = await tokenResponse.json();
      const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + token.access_token } });
      if (!userResponse.ok) return res.redirect(302, '/?auth_error=user_fetch');
      const discordUser = await userResponse.json();
      const discriminator = parseInt(discordUser.discriminator || '0', 10);
      const session = {
        username: discordUser.username, discriminator: discordUser.discriminator || '0',
        avatar: discordUser.avatar ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64' : 'https://cdn.discordapp.com/embed/avatars/' + (discriminator % 5) + '.png',
        role: resolveRole(discordUser.id), _did: discordUser.id,
      };
      res.setHeader('Set-Cookie', [setSessionCookie(session), clearStateCookie()]);
      const safe = decodeURIComponent(encodedReturn || '/');
      return res.redirect(302, safe.startsWith('/') ? safe : '/');
    } catch (e) {
      console.error('[auth/callback] error:', e);
      return res.redirect(302, '/?auth_error=server_error');
    }
  }
  if (action === 'me') {
    if (req.method !== 'GET') return error(res, 405, 'Method not allowed');
    const user = verifyToken(req);
    if (!user) return res.status(200).json({ success: true, authenticated: false });
    return res.status(200).json({ success: true, authenticated: true, username: user.username, discriminator: user.discriminator, avatar: user.avatar, role: user.role });
  }
  if (action === 'logout') {
    if (req.method !== 'POST') return error(res, 405, 'Method not allowed');
    res.setHeader('Set-Cookie', [clearSessionCookie()]);
    return res.status(200).json({ success: true });
  }
  return error(res, 404, 'Action không hợp lệ: ' + action);
}
module.exports = async function handler(req, res) {
  try { return await handleRequest(req, res); }
  catch (e) { console.error('[handler] error:', e); return error(res, 500, e.message || 'Server error'); }
};