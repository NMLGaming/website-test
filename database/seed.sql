-- Optional starter content. A new installation starts with no King, so the
-- public pages correctly show the nomination call to action.
INSERT INTO announcements (type, icon, title, content, date, pinned)
VALUES
  ('update', '✦', 'VIELIST đã mở cửa', 'Nơi lưu giữ các vị vua và triều đại của IS7MC và KINGMC.', CURRENT_DATE::text, true),
  ('event', '◈', 'Đợt đề cử đầu tiên sắp bắt đầu', 'Theo dõi server của bạn để không bỏ lỡ thời gian đề cử.', CURRENT_DATE::text, false)
ON CONFLICT DO NOTHING;