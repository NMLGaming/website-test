'use strict';

const { query } = require('../_lib/db');
const { requireAuth, setCorsHeaders } = require('../_lib/auth');

const DB = !!process.env.DATABASE_URL;

function rowToObj(r) {
  return { id: r.id, username: r.username, server: r.server, pvp: r.pvp, king: r.king,
           pvpRank: r.pvp_rank, kingRank: r.king_rank, avatar_url: r.avatar_url || null,
           updated: r.updated_at ? r.updated_at.toISOString().slice(0, 10) : '' };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { id } = req.query;

  // PUT /api/players/[id]
  if (req.method === 'PUT') {
    const { username, server, pvp, king, pvpRank, kingRank, avatar_url } = req.body || {};
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        `UPDATE players SET username=$1, server=$2, pvp=$3, king=$4, pvp_rank=$5, king_rank=$6,
         avatar_url=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [username, server, pvp || 0, king || 0, pvpRank || 0, kingRank || 0, avatar_url || null, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
      return res.status(200).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE /api/players/[id]
  if (req.method === 'DELETE') {
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
