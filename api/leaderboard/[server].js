'use strict';

const path  = require('path');
const fs    = require('fs');
const { query } = require('../_lib/db');
const { requireAuth, setCorsHeaders } = require('../_lib/auth');

const DB       = !!process.env.DATABASE_URL;
const SERVERS  = ['is7mc', 'kingmc'];
const DATA_FILE= path.join(process.cwd(), 'assets', 'data', 'leaderboard.json');

function readJson(server) {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))[server] || { pvp: [], king: [] }; }
  catch (_) { return { pvp: [], king: [] }; }
}

function rowToObj(r) {
  return { id: r.id, server: r.server, category: r.category,
           username: r.username, score: r.score, rank: r.rank };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { server } = req.query;
  if (!SERVERS.includes(server)) return res.status(400).json({ error: 'Invalid server. Use: ' + SERVERS.join(', ') });

  // GET /api/leaderboard/[server] — public
  if (req.method === 'GET') {
    try {
      if (DB) {
        const result = await query(
          'SELECT * FROM leaderboard WHERE server=$1 ORDER BY category, rank ASC', [server]
        );
        const pvp  = result.rows.filter(r => r.category === 'pvp').map(rowToObj);
        const king = result.rows.filter(r => r.category === 'king').map(rowToObj);
        return res.status(200).json({ pvp, king });
      }
      return res.status(200).json(readJson(server));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST /api/leaderboard/[server] — admin only
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const { category, username, score } = req.body || {};
    if (!category || !username || score === undefined) {
      return res.status(400).json({ error: 'category, username, score required' });
    }
    if (!['pvp', 'king'].includes(category)) return res.status(400).json({ error: 'category must be pvp or king' });
    if (!DB) return res.status(503).json({ error: 'Database not configured' });
    try {
      // Auto-calculate rank based on score
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

  return res.status(405).json({ error: 'Method not allowed' });
};
