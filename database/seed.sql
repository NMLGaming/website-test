-- VIELIST — Seed data (run after schema.sql)
-- Optional: inserts demo data so the site is not empty on first deploy.

-- Announcements
INSERT INTO announcements (type, icon, title, content, date, pinned) VALUES
  ('update',      '🚀', 'Update 1.0 — Ra mắt Leaderboard',
   'Hệ thống bảng xếp hạng chính thức ra mắt! Bây giờ bạn có thể xem top PvP và top King cho cả hai server IS7MC.NET và KINGMC.VN.',
   '2026-08-01', true),
  ('event',       '⚡', 'Nhân đôi điểm PvP — Tuần lễ vàng',
   'Từ ngày 01/08 đến 07/08/2026, toàn bộ điểm PvP được nhân đôi trên cả hai server.',
   '2026-08-01', false),
  ('maintenance', '🔧', 'Bảo trì server IS7MC.NET',
   'Server IS7MC.NET sẽ tiến hành bảo trì định kỳ từ 22:00 đến 24:00 ngày 02/08/2026.',
   '2026-07-31', false),
  ('news',        '📢', 'Chào mừng đến VIELIST',
   'VIELIST là hệ thống quản lý bảng xếp hạng cho các server Minecraft Việt Nam.',
   '2026-07-28', false)
ON CONFLICT DO NOTHING;

-- IS7MC Leaderboard
INSERT INTO leaderboard (server, category, username, score, rank) VALUES
  ('is7mc','pvp','xXSteve_KingXx',12480,1),
  ('is7mc','pvp','AlexVN',        10920,2),
  ('is7mc','pvp','Herobrine',      9750,3),
  ('is7mc','pvp','NoobSlayer99',   8640,4),
  ('is7mc','pvp','DragonRider',    7890,5),
  ('is7mc','pvp','ShadowWolf',     6540,6),
  ('is7mc','pvp','IceQueen',       5820,7),
  ('is7mc','pvp','FireLord2K',     4970,8),
  ('is7mc','pvp','NightCrawler',   4120,9),
  ('is7mc','pvp','StarKiller',     3680,10),
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

-- KINGMC Leaderboard
INSERT INTO leaderboard (server, category, username, score, rank) VALUES
  ('kingmc','pvp','PhoenixKing',  15200,1),
  ('kingmc','pvp','ThunderBolt',  13400,2),
  ('kingmc','pvp','BladeRunner',  11800,3),
  ('kingmc','pvp','GhostRecon',   10200,4),
  ('kingmc','pvp','LightningFang', 8900,5),
  ('kingmc','pvp','VoidWalker',    7600,6),
  ('kingmc','pvp','StormBreaker',  6450,7),
  ('kingmc','pvp','CrimsonBlade',  5300,8),
  ('kingmc','pvp','ArcticFox',     4100,9),
  ('kingmc','pvp','DarkMatter',    3050,10),
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

-- Players
INSERT INTO players (username, server, pvp, king, pvp_rank, king_rank) VALUES
  ('xXSteve_KingXx','IS7MC', 12480,9900,1,1),
  ('AlexVN',         'IS7MC', 10920,6830,2,4),
  ('Herobrine',      'IS7MC',  9750,5120,3,6),
  ('NoobSlayer99',   'IS7MC',  8640,2110,4,10),
  ('DragonRider',    'IS7MC',  7890,8740,5,2),
  ('ShadowWolf',     'IS7MC',  6540,4460,6,7),
  ('IceQueen',       'IS7MC',  5820,7560,7,3),
  ('FireLord2K',     'IS7MC',  4970,3780,8,8),
  ('NightCrawler',   'IS7MC',  4120,2940,9,9),
  ('StarKiller',     'IS7MC',  3680,5990,10,5),
  ('PhoenixKing',    'KINGMC',15200,11500,1,1),
  ('ThunderBolt',    'KINGMC',13400,8600,2,3),
  ('BladeRunner',    'KINGMC',11800,6000,3,5),
  ('GhostRecon',     'KINGMC',10200,9800,4,2),
  ('VoidWalker',     'KINGMC', 7600,7200,6,4)
ON CONFLICT (username) DO NOTHING;
