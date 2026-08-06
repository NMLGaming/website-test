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
let _schemaPromise = null;

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

const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL DEFAULT 'news',
    icon TEXT NOT NULL DEFAULT '📢',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT false,
    author_username TEXT NOT NULL DEFAULT 'VIELIST Admin',
    author_avatar TEXT NOT NULL DEFAULT '',
    author_role TEXT NOT NULL DEFAULT 'Admin',
    border_color TEXT NOT NULL DEFAULT '#00d4ff',
    background_color TEXT NOT NULL DEFAULT '#101827',
    accent_color TEXT NOT NULL DEFAULT '#00d4ff',
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    server TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'king',
    username TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (server, category, username)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcement_comments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'news';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '📢';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS date TEXT NOT NULL DEFAULT '';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_username TEXT NOT NULL DEFAULT 'VIELIST Admin';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_avatar TEXT NOT NULL DEFAULT '';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_role TEXT NOT NULL DEFAULT 'Admin';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS border_color TEXT NOT NULL DEFAULT '#00d4ff';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#101827';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#00d4ff';
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS server TEXT NOT NULL DEFAULT 'is7mc';
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'king';
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS rank INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  ALTER TABLE settings ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';

  CREATE INDEX IF NOT EXISTS idx_announcements_date
    ON announcements (date DESC);
  CREATE INDEX IF NOT EXISTS idx_announcements_pinned
    ON announcements (pinned DESC);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_server
    ON leaderboard (server, category, rank);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_username
    ON leaderboard (username);

  INSERT INTO settings (key, value) VALUES
    ('site_name', 'VIELIST'),
    ('site_logo', 'VIELIST'),
    ('logo_url', ''),
    ('hero_logo_url', ''),
    ('avatar_url', ''),
    ('hero_banner_url', ''),
    ('hero_title', 'Những người chơi'),
    ('hero_highlight', 'được nhớ tên.'),
    ('hero_lead', 'VIELIST lưu lại từng cuộc chiến, từng lần lên hạng và những cái tên làm nên lịch sử của cộng đồng Minecraft Việt Nam.'),
    ('intro_title', 'Một mạng lưới dành cho những cái tên đáng nhớ.'),
    ('intro_body', 'Theo dõi các server, khám phá những câu chuyện phía sau bảng xếp hạng và cùng xây dựng lịch sử Minecraft Việt Nam.'),
    ('story_title', 'Mỗi trận đấu đều để lại dấu ấn.'),
    ('story_body', 'Từ khoảnh khắc đầu tiên bước vào server đến ngày được xướng tên, VIELIST biến hành trình của người chơi thành một phần ký ức có thể tìm lại.'),
    ('cta_title', 'Không chỉ là một con số.'),
    ('cta_body', 'Khám phá những nhà vua và các thông báo mới nhất của VIELIST.'),
    ('footer_text', '© 2026 VIELIST — Minecraft Leaderboard'),
    ('discord_link', 'https://discord.com'),
    ('join_discord_enabled', 'true'),
    ('primary_color', '#00d4ff'),
    ('effects_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;
`;

async function ensureSchema() {
  if (!getPool()) throw new Error('DATABASE_URL not configured');
  if (!_schemaPromise) {
    _schemaPromise = query(SCHEMA_SQL).catch(function (error) {
      _schemaPromise = null;
      throw error;
    });
  }
  return _schemaPromise;
}

module.exports = { getPool, query, ensureSchema };
