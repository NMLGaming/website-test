/**
 * api/players.js
 * Xử lý tất cả các operations về players:
 *   GET    /api/players               — lấy danh sách (public)
 *   GET    /api/players?username=<u>  — tìm theo username (public)
 *   POST   /api/players               — tạo mới (admin)
 *   PUT    /api/players?id=<id>       — cập nhật (admin)
 *   DELETE /api/players?id=<id>       — xoá (admin)
 *
 * Gộp từ: players/index.js + players/[id].js
 */

'use strict';

const path  = require('path');
const fs    = require('fs');
const { query }                    = require('./_lib/db');
const { requireAuth, setCorsHeaders } = require('./_lib/auth');

const DB        = !!process.env.DATABASE_URL;
const DATA_FILE = path.join(process.cwd(), 'assets', 'data', 'players.json');

function readJson() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return []; }
}

function rowToObj(r) {
  return {
    id:       r.id,
    username: r.username,
    server:   r.server,
    pvp:      r.pvp,
    king:     r.king,
    pvpRank:  r.pvp_rank,
    kingRank: r.king_rank,
    avatar_url: r.avatar_url || null,
    updated:  r.updated_at ? r.updated_at.toISOString().slice(0, 10) : '',
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, username } = req.query;

  /* ---- GET /api/players — public ---- */
  if (req.method === 'GET') {
    try {
      if (DB) {
        if (username) {
          const result = await query(
            'SELECT * FROM players WHERE LOWER(username)=LOWER($1)',
            [username]
          );
          if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
          return res.status(200).json(rowToObj(result.rows[0]));
        }
        const result = await query('SELECT * FROM players ORDER BY pvp DESC', []);
        return res.status(200).json(result.rows.map(rowToObj));
      }
      // Fallback JSON
      const list = readJson();
      if (username) {
        const found = list.find(function (p) {
          return p.username.toLowerCase() === username.toLowerCase();
        });
        if (!found) return res.status(404).json({ error: 'Player not found' });
        return res.status(200).json(found);
      }
      return res.status(200).json(list);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- POST /api/players — admin only ---- */
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const { username: uname, server, pvp, king, pvpRank, kingRank, avatar_url } = req.body || {};
    if (!uname || !server) return res.status(400).json({ error: 'username và server required' });
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        `INSERT INTO players (username, server, pvp, king, pvp_rank, king_rank, avatar_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [uname, server, pvp || 0, king || 0, pvpRank || 0, kingRank || 0, avatar_url || null]
      );
      return res.status(201).json(rowToObj(result.rows[0]));
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Player username already exists' });
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- PUT /api/players?id=<id> — admin only ---- */
  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { username: uname, server, pvp, king, pvpRank, kingRank, avatar_url } = req.body || {};
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        `UPDATE players SET username=$1, server=$2, pvp=$3, king=$4, pvp_rank=$5, king_rank=$6,
         avatar_url=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [uname, server, pvp || 0, king || 0, pvpRank || 0, kingRank || 0, avatar_url || null, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
      return res.status(200).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ---- DELETE /api/players?id=<id> — admin only ---- */
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query('DELETE FROM players WHERE id=$1 RETURNING id', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
