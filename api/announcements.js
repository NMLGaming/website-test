/**
 * api/announcements.js
 * Xử lý tất cả các operations về announcements:
 *   GET  /api/announcements           — lấy danh sách (public)
 *   POST /api/announcements           — tạo mới (admin)
 *   PUT  /api/announcements?id=<id>   — cập nhật (admin)
 *   DELETE /api/announcements?id=<id> — xoá (admin)
 *
 * Gộp từ: announcements/index.js + announcements/[id].js
 */

'use strict';

const path  = require('path');
const fs    = require('fs');
const { query }                    = require('./_lib/db');
const { requireAuth, setCorsHeaders } = require('./_lib/auth');

const DB        = !!process.env.DATABASE_URL;
const DATA_FILE = path.join(process.cwd(), 'assets', 'data', 'announcements.json');

function readJson() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return []; }
}

function rowToObj(r) {
  return {
    id:           r.id,
    type:         r.type,
    icon:         r.icon,
    title:        r.title,
    content:      r.content,
    date:         r.date,
    pinned:       r.pinned,
    scheduled_at: r.scheduled_at || null,
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  /* ---- GET /api/announcements — public ---- */
  if (req.method === 'GET') {
    try {
      if (DB) {
        const result = await query(
          'SELECT * FROM announcements WHERE (scheduled_at IS NULL OR scheduled_at <= NOW()) ORDER BY pinned DESC, date DESC',
          []
        );
        return res.status(200).json(result.rows.map(rowToObj));
      }
      return res.status(200).json(readJson());
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- POST /api/announcements — admin only ---- */
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const { type, icon, title, content, date, pinned, scheduled_at } = req.body || {};
    if (!title || !content || !date) {
      return res.status(400).json({ error: 'title, content, date required' });
    }
    if (!DB) return res.status(503).json({ error: 'Database not configured. Set DATABASE_URL to persist data.' });
    try {
      const result = await query(
        `INSERT INTO announcements (type, icon, title, content, date, pinned, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [type || 'news', icon || '📢', title, content, date, !!pinned, scheduled_at || null]
      );
      return res.status(201).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- PUT /api/announcements?id=<id> — admin only ---- */
  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { type, icon, title, content, date, pinned, scheduled_at } = req.body || {};
    if (!title || !content || !date) {
      return res.status(400).json({ error: 'title, content, date required' });
    }
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        `UPDATE announcements SET type=$1, icon=$2, title=$3, content=$4, date=$5, pinned=$6,
         scheduled_at=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [type || 'news', icon || '📢', title, content, date, !!pinned, scheduled_at || null, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- DELETE /api/announcements?id=<id> — admin only ---- */
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query('DELETE FROM announcements WHERE id=$1 RETURNING id', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
