/**
 * db.js — PostgreSQL connection pool (shared across all API routes).
 *
 * Requires: DATABASE_URL environment variable.
 * If not set, functions fall back to static JSON files.
 *
 * Recommended provider: Neon (neon.tech) — free serverless Postgres.
 */

'use strict';

const { Pool } = require('pg');

let _pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Neon & most cloud Postgres
      max: 5,
      idleTimeoutMillis: 10000,
    });
  }
  return _pool;
}

async function query(sql, params) {
  const pool = getPool();
  if (!pool) throw new Error('DATABASE_URL not configured');
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

module.exports = { getPool, query };
