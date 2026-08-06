-- VIELIST database schema
-- The site intentionally stores one current King per server.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remove retired ranking storage when this schema is applied to an existing
-- installation. This is intentional: VIELIST now stores Kings only.
DROP TABLE IF EXISTS leaderboard CASCADE;

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

CREATE TABLE IF NOT EXISTS announcement_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server TEXT NOT NULL CHECK (server IN ('is7mc', 'kingmc')),
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  reign_title TEXT NOT NULL DEFAULT 'Nhà vua',
  description TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  crowned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_king_per_server
  ON kings(server) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS kings_history_by_server
  ON kings(server, crowned_at DESC);

CREATE TABLE IF NOT EXISTS nomination_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server TEXT NOT NULL CHECK (server IN ('is7mc', 'kingmc')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('scheduled', 'open', 'closed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS campaigns_by_server ON nomination_campaigns(server, starts_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_campaign_per_server
  ON nomination_campaigns(server) WHERE status IN ('scheduled', 'open');

CREATE TABLE IF NOT EXISTS nomination_candidates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES nomination_campaigns(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS candidates_by_campaign ON nomination_candidates(campaign_id, created_at);

CREATE TABLE IF NOT EXISTS nomination_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES nomination_campaigns(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES nomination_candidates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS votes_by_candidate ON nomination_votes(candidate_id);

INSERT INTO settings (key, value) VALUES
  ('site_name', 'VIELIST'),
  ('site_logo', 'VIELIST'),
  ('logo_url', ''),
  ('hero_logo_url', ''),
  ('avatar_url', ''),
  ('hero_banner_url', ''),
  ('hero_title', 'Những người chơi'),
  ('hero_highlight', 'được nhớ tên.'),
  ('hero_lead', 'VIELIST lưu lại những nhà vua, những triều đại và câu chuyện của cộng đồng Minecraft Việt Nam.'),
  ('intro_title', 'Một mạng lưới dành cho những cái tên đáng nhớ.'),
  ('intro_body', 'Mỗi server có một ngai vàng. Mỗi triều đại đều có một câu chuyện để nhớ lại.'),
  ('story_title', 'Một cái tên. Một triều đại. Một di sản.'),
  ('story_body', 'VIELIST giúp cộng đồng đề cử, vinh danh và lưu giữ lịch sử những người từng đứng trên ngai vàng.'),
  ('cta_title', 'Ai sẽ là vị vua tiếp theo?'),
  ('cta_body', 'Đăng nhập Discord, khám phá các server và tham gia đề cử khi một đợt bình chọn mở.'),
  ('footer_text', '© 2026 VIELIST — The home of Kings'),
  ('discord_link', 'https://discord.com'),
  ('join_discord_enabled', 'true'),
  ('primary_color', '#00d4ff'),
  ('effects_enabled', 'true')
ON CONFLICT (key) DO NOTHING;