'use strict';

const { query } = require('../../_lib/db');
const { requireAuth, setCorsHeaders } = require('../../_lib/auth');

const DB = !!process.env.DATABASE_URL;

function rowToObj(r) {
  return { id: r.id, server: r.server, category: r.category,
           username: r.username, score: r.score, rank: r.rank };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { server, id } = req.query;

  // PUT — update score/username/rank
  if (req.method === 'PUT') {
    const { username, score, category, rank } = req.body || {};
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      // If score changed, recalculate rank automatically
      let newRank = rank;
      if (score !== undefined && rank === undefined) {
        const rankResult = await query(
          'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE server=$1 AND category=$2 AND score > $3 AND id != $4',
          [server, category, Number(score), id]
        );
        newRank = parseInt(rankResult.rows[0].rank, 10);
      }

      const fields  = [];
      const values  = [];
      let   idx     = 1;

      if (username !== undefined)  { fields.push(`username=$${idx++}`); values.push(username); }
      if (score    !== undefined)  { fields.push(`score=$${idx++}`);    values.push(Number(score)); }
      if (category !== undefined)  { fields.push(`category=$${idx++}`); values.push(category); }
      if (newRank  !== undefined)  { fields.push(`rank=$${idx++}`);     values.push(Number(newRank)); }

      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      fields.push(`updated_at=NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE leaderboard SET ${fields.join(', ')} WHERE id=$${idx} AND server=$${idx+1} RETURNING *`,
        [...values, server]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Entry not found' });
      return res.status(200).json(rowToObj(result.rows[0]));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE
  if (req.method === 'DELETE') {
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      const result = await query(
        'DELETE FROM leaderboard WHERE id=$1 AND server=$2 RETURNING id, rank, category', [id, server]
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
