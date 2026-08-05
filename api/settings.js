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
  footer_text:     '© 2026 VIELIST — Minecraft Leaderboard',
  primary_color:   '#00d4ff',
  effects_enabled: 'true',
};

const PUBLIC_KEYS = ['site_name', 'site_logo', 'footer_text', 'primary_color', 'effects_enabled'];

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
