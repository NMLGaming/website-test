-- VIELIST Minecraft Leaderboard — Database Schema
-- Run this once on your PostgreSQL database (e.g. Neon.tech).
-- Compatible with PostgreSQL 14+.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type         TEXT        NOT NULL DEFAULT 'news',      -- news | update | maintenance | event
  icon         TEXT        NOT NULL DEFAULT '📢',
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  date         TEXT        NOT NULL,                     -- YYYY-MM-DD display date
  pinned       BOOLEAN     NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,                              -- NULL = publish immediately
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_date   ON announcements (date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements (pinned DESC);

-- ============================================================
-- Leaderboard (supports unlimited servers & categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server     TEXT        NOT NULL,                      -- is7mc | kingmc | ...
  category   TEXT        NOT NULL,                      -- pvp | king | ...
  username   TEXT        NOT NULL,
  score      INTEGER     NOT NULL DEFAULT 0,
  rank       INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (server, category, username)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_server   ON leaderboard (server, category, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_username ON leaderboard (username);

-- ============================================================
-- Players (global player registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username    TEXT        NOT NULL UNIQUE,
  server      TEXT        NOT NULL DEFAULT 'IS7MC',
  pvp         INTEGER     NOT NULL DEFAULT 0,
  king        INTEGER     NOT NULL DEFAULT 0,
  pvp_rank    INTEGER     NOT NULL DEFAULT 0,
  king_rank   INTEGER     NOT NULL DEFAULT 0,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_username ON players (LOWER(username));

-- ============================================================
-- Site Settings (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('site_name',       'VIELIST'),
  ('site_logo',       'VIELIST'),
  ('logo_url',        ''),
  ('hero_logo_url',   ''),
  ('avatar_url',      ''),
  ('hero_banner_url', ''),
  ('hero_title',      'Những người chơi'),
  ('hero_highlight',  'được nhớ tên.'),
  ('hero_lead',       'VIELIST lưu lại từng cuộc chiến, từng lần lên hạng và những cái tên làm nên lịch sử của cộng đồng Minecraft Việt Nam.'),
  ('intro_title',     'Một mạng lưới dành cho những cái tên đáng nhớ.'),
  ('intro_body',      'Theo dõi các server, khám phá những câu chuyện phía sau bảng xếp hạng và cùng xây dựng lịch sử Minecraft Việt Nam.'),
  ('story_title',     'Mỗi trận đấu đều để lại dấu ấn.'),
  ('story_body',      'Từ khoảnh khắc đầu tiên bước vào server đến ngày được xướng tên, VIELIST biến hành trình của người chơi thành một phần ký ức có thể tìm lại.'),
  ('cta_title',       'Không chỉ là một con số.'),
  ('cta_body',        'Tra cứu hồ sơ, xem thứ hạng và tìm hiểu câu chuyện phía sau mỗi player.'),
  ('footer_text',     '© 2026 VIELIST — Minecraft Leaderboard'),
  ('primary_color',   '#00d4ff'),
  ('effects_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
