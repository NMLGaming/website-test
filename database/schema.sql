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
  author_username TEXT     NOT NULL DEFAULT 'VIELIST Admin',
  author_avatar TEXT       NOT NULL DEFAULT '',
  author_role   TEXT        NOT NULL DEFAULT 'Admin',
  border_color  TEXT        NOT NULL DEFAULT '#00d4ff',
  background_color TEXT    NOT NULL DEFAULT '#101827',
  accent_color TEXT         NOT NULL DEFAULT '#00d4ff',
  scheduled_at TIMESTAMPTZ,                              -- NULL = publish immediately
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_username TEXT NOT NULL DEFAULT 'VIELIST Admin';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_avatar TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_role TEXT NOT NULL DEFAULT 'Admin';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS border_color TEXT NOT NULL DEFAULT '#00d4ff';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#101827';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#00d4ff';

CREATE INDEX IF NOT EXISTS idx_announcements_date   ON announcements (date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements (pinned DESC);

CREATE TABLE IF NOT EXISTS announcement_comments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  username        TEXT NOT NULL,
  avatar          TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Leaderboard (supports unlimited servers & categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server     TEXT        NOT NULL,                      -- is7mc | kingmc | ...
  category   TEXT        NOT NULL DEFAULT 'king',      -- king
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
  ('cta_body',        'Khám phá những nhà vua và các thông báo mới nhất của VIELIST.'),
  ('footer_text',     '© 2026 VIELIST — Minecraft Leaderboard'),
  ('discord_link',    'https://discord.com'),
  ('join_discord_enabled', 'true'),
  ('primary_color',   '#00d4ff'),
  ('effects_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
