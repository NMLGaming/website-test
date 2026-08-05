/**
 * api/settings.js
 * Xử lý settings công khai và admin:
 *   GET /api/settings — lấy settings (public, chỉ các key an toàn)
 *   PUT /api/settings — cập nhật settings (admin)
 *
 * Di chuyển từ: settings/index.js
 */

'use strict';

const { query }                    = require('./_lib/db');
const { requireAuth, setCorsHeaders } = require('./_lib/auth');

const DB = !!process.env.DATABASE_URL;

const DEFAULTS = {
  site_name:       'VIELIST',
  site_logo:       'VIELIST',
  logo_url:        '',
  hero_logo_url:   '',
  avatar_url:      '',
  hero_banner_url: '',
  hero_title:      'Những người chơi',
  hero_highlight:  'được nhớ tên.',
  hero_lead:       'VIELIST lưu lại từng cuộc chiến, từng lần lên hạng và những cái tên làm nên lịch sử của cộng đồng Minecraft Việt Nam.',
  intro_title:     'Một mạng lưới dành cho những cái tên đáng nhớ.',
  intro_body:      'Theo dõi các server, khám phá những câu chuyện phía sau bảng xếp hạng và cùng xây dựng lịch sử Minecraft Việt Nam.',
  story_title:     'Mỗi trận đấu đều để lại dấu ấn.',
  story_body:      'Từ khoảnh khắc đầu tiên bước vào server đến ngày được xướng tên, VIELIST biến hành trình của người chơi thành một phần ký ức có thể tìm lại.',
  cta_title:       'Không chỉ là một con số.',
  cta_body:        'Tra cứu hồ sơ, xem thứ hạng và tìm hiểu câu chuyện phía sau mỗi player.',
  footer_text:     '© 2026 VIELIST — Minecraft Leaderboard',
  primary_color:   '#00d4ff',
  effects_enabled: 'true',
};

const PUBLIC_KEYS = [
  'site_name', 'site_logo', 'logo_url', 'hero_logo_url', 'avatar_url',
  'hero_banner_url', 'hero_title', 'hero_highlight', 'hero_lead',
  'intro_title', 'intro_body', 'story_title', 'story_body',
  'cta_title', 'cta_body', 'footer_text', 'primary_color', 'effects_enabled'
];

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ---- GET /api/settings — public ---- */
  if (req.method === 'GET') {
    if (!DB) return res.status(200).json(DEFAULTS);
    try {
      const result = await query(
        'SELECT key, value FROM settings WHERE key = ANY($1)',
        [PUBLIC_KEYS]
      );
      const obj = Object.assign({}, DEFAULTS);
      result.rows.forEach(function (r) { obj[r.key] = r.value; });
      return res.status(200).json(obj);
    } catch (e) {
      return res.status(200).json(DEFAULTS); // graceful fallback
    }
  }

  /* ---- PUT /api/settings — admin only ---- */
  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    const updates = req.body || {};
    try {
      for (const [key, value] of Object.entries(updates)) {
        if (!PUBLIC_KEYS.includes(key)) continue;
        await query(
          'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
          [key, String(value)]
        );
      }
      const result = await query(
        'SELECT key, value FROM settings WHERE key = ANY($1)',
        [PUBLIC_KEYS]
      );
      const obj = Object.assign({}, DEFAULTS);
      result.rows.forEach(function (r) { obj[r.key] = r.value; });
      return res.status(200).json(obj);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
