/**
 * PostgreSQL access and idempotent schema bootstrap for VIELIST.
 * The schema deliberately models Kings, campaigns and votes. Public reads
 * can still run in demo mode without a database.
 */
'use strict';

const { Pool } = require('pg');

let pool = null;
let schemaPromise = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function query(sql, params) {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL not configured');
  const client = await db.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS leaderboard CASCADE;
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL DEFAULT 'news', icon TEXT NOT NULL DEFAULT '📢',
  title TEXT NOT NULL, content TEXT NOT NULL, date TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  author_username TEXT NOT NULL DEFAULT 'VIELIST Admin',
  author_avatar TEXT NOT NULL DEFAULT '', author_role TEXT NOT NULL DEFAULT 'Admin',
  border_color TEXT NOT NULL DEFAULT '#00d4ff',
  background_color TEXT NOT NULL DEFAULT '#101827',
  accent_color TEXT NOT NULL DEFAULT '#00d4ff',
  scheduled_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS announcement_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  username TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '', content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server TEXT NOT NULL CHECK (server IN ('is7mc', 'kingmc')),
  display_name TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT '',
  reign_title TEXT NOT NULL DEFAULT 'Nhà vua', description TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '',
  crowned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ended_at TIMESTAMPTZ,
  end_reason TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_king_per_server ON kings(server) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS kings_history_by_server ON kings(server, crowned_at DESC);
CREATE TABLE IF NOT EXISTS nomination_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server TEXT NOT NULL CHECK (server IN ('is7mc', 'kingmc')),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('scheduled', 'open', 'closed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS campaigns_by_server ON nomination_campaigns(server, starts_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_campaign_per_server
  ON nomination_campaigns(server) WHERE status IN ('scheduled', 'open');
CREATE TABLE IF NOT EXISTS nomination_candidates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES nomination_campaigns(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS candidates_by_campaign ON nomination_candidates(campaign_id, created_at);
CREATE TABLE IF NOT EXISTS nomination_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES nomination_campaigns(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES nomination_candidates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, user_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS votes_by_candidate ON nomination_votes(candidate_id);
`;

function ensureSchema() {
  if (!getPool()) return Promise.resolve();
  if (!schemaPromise) schemaPromise = query(SCHEMA_SQL, []);
  return schemaPromise;
}

module.exports = { getPool, query, ensureSchema };