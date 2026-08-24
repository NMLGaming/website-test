-- VIELIST — Seed data (run after schema.sql)
-- Optional: inserts demo data so the site is not empty on first deploy.

-- Announcements
INSERT INTO announcements (type, icon, title, content, date, pinned) VALUES
  ('update',      '🚀', 'Update 1.0 — Ra mắt Leaderboard',
   'Hệ thống bảng xếp hạng King chính thức ra mắt cho cả hai server IS7MC.NET và KINGMC.VN.',
   '2026-08-01', true),
  ('event',       '⚡', 'Tuần lễ vàng KINGMC',
   'Sự kiện đặc biệt dành cho những nhà vua của cộng đồng Minecraft Việt Nam.',
   '2026-08-01', false),
  ('maintenance', '🔧', 'Bảo trì server IS7MC.NET',
   'Server IS7MC.NET sẽ tiến hành bảo trì định kỳ từ 22:00 đến 24:00 ngày 02/08/2026.',
   '2026-07-31', false),
  ('news',        '📢', 'Chào mừng đến VIELIST',
   'VIELIST là hệ thống quản lý bảng xếp hạng cho các server Minecraft Việt Nam.',
   '2026-07-28', false)
ON CONFLICT DO NOTHING;

-- IS7MC King leaderboard
INSERT INTO leaderboard (server, category, username, score, rank) VALUES
  ('is7mc','king','xXSteve_KingXx',9900,1),
  ('is7mc','king','DragonRider',   8740,2),
  ('is7mc','king','IceQueen',      7560,3),
  ('is7mc','king','AlexVN',        6830,4),
  ('is7mc','king','StarKiller',    5990,5),
  ('is7mc','king','Herobrine',     5120,6),
  ('is7mc','king','ShadowWolf',    4460,7),
  ('is7mc','king','FireLord2K',    3780,8),
  ('is7mc','king','NightCrawler',  2940,9),
  ('is7mc','king','NoobSlayer99',  2110,10)
ON CONFLICT (server, category, username) DO NOTHING;

-- KINGMC King leaderboard
INSERT INTO leaderboard (server, category, username, score, rank) VALUES
  ('kingmc','king','PhoenixKing', 11500,1),
  ('kingmc','king','GhostRecon',   9800,2),
  ('kingmc','king','ThunderBolt',  8600,3),
  ('kingmc','king','VoidWalker',   7200,4),
  ('kingmc','king','BladeRunner',  6000,5),
  ('kingmc','king','StormBreaker', 5100,6),
  ('kingmc','king','CrimsonBlade', 4200,7),
  ('kingmc','king','LightningFang',3400,8),
  ('kingmc','king','DarkMatter',   2600,9),
  ('kingmc','king','ArcticFox',    1900,10)
ON CONFLICT (server, category, username) DO NOTHING;
