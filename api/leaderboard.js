/**
 * api/leaderboard.js
 * Xử lý tất cả các operations về leaderboard:
 *   GET    /api/leaderboard?server=<s>        — lấy bảng xếp hạng (public)
 *   POST   /api/leaderboard?server=<s>        — thêm entry (admin)
 *   PUT    /api/leaderboard?server=<s>&id=<i> — cập nhật entry (admin)
 *   DELETE /api/leaderboard?server=<s>&id=<i> — xoá entry (admin)
 *
 * Gộp từ: leaderboard/[server].js + leaderboard/[server]/[id].js
 */

'use strict';

const path  = require('path');
const fs    = require('fs');
const { query }                    = require('./_lib/db');
const { requireAuth, setCorsHeaders } = require('./_lib/auth');

const DB       = !!process.env.DATABASE_URL;
const SERVERS  = ['is7mc', 'kingmc'];
const DATA_FILE = path.join(process.cwd(), 'assets', 'data', 'leaderboard.json');

function readJson(server) {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))[server] || { pvp: [], king: [] }; }
  catch (_) { return { pvp: [], king: [] }; }
}

function rowToObj(r) {
  return {
    id:       r.id,
    server:   r.server,
    category: r.category,
    username: r.username,
    score:    r.score,
    rank:     r.rank,
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { server, id } = req.query;

  if (!server || !SERVERS.includes(server)) {
    return res.status(400).json({ error: 'server không hợp lệ. Dùng: ' + SERVERS.join(', ') });
  }

  /* ---- GET /api/leaderboard?server=<s> — public ---- */
  if (req.method === 'GET') {
    try {
      if (DB) {
        const result = await query(
          'SELECT * FROM leaderboard WHERE server=$1 ORDER BY category, rank ASC',
          [server]
        );
        const pvp  = result.rows.filter(function (r) { return r.category === 'pvp'; }).map(rowToObj);
        const king = result.rows.filter(function (r) { return r.category === 'king'; }).map(rowToObj);
        return res.status(200).json({ pvp: pvp, king: king });
      }
      return res.status(200).json(readJson(server));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- POST /api/leaderboard?server=<s> — admin only ---- */
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const { category, username, score } = req.body || {};
    if (!category || !username || score === undefined) {
      return res.status(400).json({ error: 'category, username, score required' });
    }
    if (!['pvp', 'king'].includes(category)) {
      return res.status(400).json({ error: 'category phải là pvp hoặc king' });
    }
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      // Auto-calculate rank
      const rankResult = await query(
        'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE server=$1 AND category=$2 AND score > $3',
        [server, category, Number(score)]
      );
      const rank = parseInt(rankResult.rows[0].rank, 10);

      // Shift lower-ranked entries down
      await query(
        'UPDATE leaderboard SET rank = rank + 1 WHERE server=$1 AND category=$2 AND rank >= $3',
        [server, category, rank]
      );

      const result = await query(
        'INSERT INTO leaderboard (server, category, username, score, rank) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [server, category, username, Number(score), rank]
      );
      return res.status(201).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- PUT /api/leaderboard?server=<s>&id=<i> — admin only ---- */
  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { username, score, category, rank } = req.body || {};
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      let newRank = rank;
      if (score !== undefined && rank === undefined) {
        const rankResult = await query(
          'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE server=$1 AND category=$2 AND score > $3 AND id != $4',
          [server, category, Number(score), id]
        );
        newRank = parseInt(rankResult.rows[0].rank, 10);
      }

      const fields = [];
      const values = [];
      let   idx    = 1;

      if (username !== undefined) { fields.push('username=$' + idx++); values.push(username); }
      if (score    !== undefined) { fields.push('score=$'    + idx++); values.push(Number(score)); }
      if (category !== undefined) { fields.push('category=$' + idx++); values.push(category); }
      if (newRank  !== undefined) { fields.push('rank=$'     + idx++); values.push(Number(newRank)); }

      if (!fields.length) return res.status(400).json({ error: 'Không có trường nào để cập nhật' });

      fields.push('updated_at=NOW()');
      values.push(id);
      values.push(server);

      const result = await query(
        'UPDATE leaderboard SET ' + fields.join(', ') + ' WHERE id=$' + idx + ' AND server=$' + (idx + 1) + ' RETURNING *',
        values
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Entry not found' });
      return res.status(200).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- DELETE /api/leaderboard?server=<s>&id=<i> — admin only ---- */
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        'DELETE FROM leaderboard WHERE id=$1 AND server=$2 RETURNING id, rank, category',
        [id, server]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      // Compact ranks after deletion
      const { rank, category } = result.rows[0];
      await query(
        'UPDATE leaderboard SET rank = rank - 1 WHERE server=$1 AND category=$2 AND rank > $3',
        [server, category, rank]
      );
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
