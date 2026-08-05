/**
 * api/stats.js
 * GET /api/stats — trả về thống kê tổng hợp (admin only).
 *
 * Di chuyển từ: stats/index.js
 */

'use strict';

const path  = require('path');
const fs    = require('fs');
const { query }                    = require('./_lib/db');
const { requireAuth, setCorsHeaders } = require('./_lib/auth');

const DB = !!process.env.DATABASE_URL;

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets', 'data', file), 'utf8')); }
  catch (_) { return []; }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  try {
    if (DB) {
      const [players, announcements, leaderboard] = await Promise.all([
        query('SELECT COUNT(*) AS count FROM players', []),
        query('SELECT COUNT(*) AS count FROM announcements', []),
        query('SELECT COUNT(*) AS count FROM leaderboard', []),
      ]);
      return res.status(200).json({
        players:       parseInt(players.rows[0].count, 10),
        announcements: parseInt(announcements.rows[0].count, 10),
        leaderboard:   parseInt(leaderboard.rows[0].count, 10),
        db_connected:  true,
        updated_at:    new Date().toISOString(),
      });
    }

    // Fallback to JSON files (demo mode)
    const pList = readJson('players.json');
    const aList = readJson('announcements.json');
    const lData = readJson('leaderboard.json');
    const lCount = Object.values(lData).reduce(function (acc, srv) {
      return acc + (srv.pvp || []).length + (srv.king || []).length;
    }, 0);

    return res.status(200).json({
      players:       pList.length,
      announcements: aList.length,
      leaderboard:   lCount,
      db_connected:  false,
      updated_at:    new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
