'use strict';

const { query } = require('../_lib/db');
const { requireAuth, setCorsHeaders } = require('../_lib/auth');

const DB = !!process.env.DATABASE_URL;

function rowToObj(r) {
  return { id: r.id, type: r.type, icon: r.icon, title: r.title, content: r.content,
           date: r.date, pinned: r.pinned, scheduled_at: r.scheduled_at || null };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!requireAuth(req, res)) return;

  // PUT /api/announcements/[id]
  if (req.method === 'PUT') {
    const { type, icon, title, content, date, pinned, scheduled_at } = req.body || {};
    if (!title || !content || !date) return res.status(400).json({ error: 'title, content, date required' });
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

  // DELETE /api/announcements/[id]
  if (req.method === 'DELETE') {
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
