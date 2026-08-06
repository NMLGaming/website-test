# VIELIST — The home of Kings

VIELIST là website lưu giữ các vị vua và lịch sử triều đại cho hai server Minecraft Việt Nam: **IS7MC.NET** và **KINGMC.VN**.

## Tính năng

- Home là trang giới thiệu dài, không hiển thị Thông báo.
- Mỗi server có đúng một nhà vua đang trị vì.
- Mỗi trang server có đúng ba mục: **King**, **Đề cử**, **Lịch sử vua**.
- Khi chưa có vua, trang hiển thị lời mời tham gia đề cử thay vì ảnh lỗi.
- Admin có thể chỉnh avatar, tên, triều đại, ngày lên ngôi, mô tả, banner và logo của vua.
- Admin có thể tạo đợt đề cử với tiêu đề, mô tả, ngày giờ bắt đầu và kết thúc.
- Admin thêm được không giới hạn ứng viên; mỗi ứng viên có avatar, tên và mô tả.
- Người dùng chỉ cần đăng nhập Discord. Mỗi server, mỗi người chỉ có một đề cử; muốn đổi phải bấm **Hủy đề cử** trước.
- Khi hết thời gian, hệ thống tự khóa đợt đề cử, ẩn nút đề cử và đưa người có nhiều phiếu nhất lên ngôi.
- Lịch sử lưu avatar, tên, triều đại, ngày lên ngôi, ngày kết thúc và lý do kết thúc.
- Admin phải nhập lý do khi kết thúc triều đại hoặc xóa một dòng khỏi lịch sử.
- Admin có thể thêm vua trực tiếp, không cần qua đề cử.
- Không còn hệ thống PvP, bảng xếp hạng, ranking, tìm kiếm người chơi hay hồ sơ người chơi.
- Giao diện giữ phong cách dark, glass, neon và animation.

## Cấu trúc

```text
index.html                 Home giới thiệu
announcements/index.html   Trang Thông báo riêng
is7mc/index.html           King / Đề cử / Lịch sử vua của IS7MC
kingmc/index.html          King / Đề cử / Lịch sử vua của KINGMC
admin/index.html           Dashboard Admin
api/auth/[action].js       Discord OAuth và API King
assets/js/king.js          Giao diện King công khai
assets/js/admin-api.js     API client cho Admin
assets/js/admin.js         Dashboard Admin
assets/js/data.js          API client công khai
database/schema.sql        Schema PostgreSQL
database/seed.sql          Dữ liệu thông báo mẫu
lib/auth.js                JWT httpOnly cookie và phân quyền Owner
lib/db.js                  PostgreSQL pool và bootstrap schema
```

## API chính

```text
/api/auth/data?resource=king&server=is7mc|kingmc
/api/auth/data?resource=nomination&server=is7mc|kingmc
/api/auth/data?resource=history&server=is7mc|kingmc
/api/auth/data?resource=campaigns&server=is7mc|kingmc
/api/auth/data?resource=candidates&campaign_id=<id>
/api/auth/data?resource=announcements
/api/auth/data?resource=settings
/api/auth/data?resource=stats
```

## Cài đặt PostgreSQL

1. Tạo một PostgreSQL database.
2. Chạy toàn bộ `database/schema.sql`.
3. Có thể chạy thêm `database/seed.sql` để có Thông báo mẫu.

Schema sẽ chủ động xóa bảng dữ liệu cũ `leaderboard` khi chạy trên cài đặt cũ, vì hệ thống này không còn sử dụng dữ liệu đó.

## Discord OAuth

Tạo Discord Application tại [Discord Developer Portal](https://discord.com/developers/applications), thêm Redirect URI:

```text
https://<domain-cua-ban>/api/auth/callback
```

Thiết lập các biến môi trường sau trên Vercel:

| Biến | Mục đích |
| --- | --- |
| `DISCORD_CLIENT_ID` | Client ID của Discord Application |
| `DISCORD_CLIENT_SECRET` | Client Secret, chỉ dùng server-side |
| `DISCORD_REDIRECT_URI` | URL callback đúng với Discord Developer Portal |
| `OWNER_DISCORD_ID` | Discord User ID của Admin/Owner |
| `SESSION_SECRET` | Chuỗi bí mật để ký session |
| `DATABASE_URL` | Connection string PostgreSQL |

`JWT_SECRET` vẫn được hỗ trợ như alias của `SESSION_SECRET`. Không commit secret thật vào GitHub; `.gitignore` đã chặn file `.env`.

## Deploy lên Vercel

1. Giải nén ZIP và upload nội dung bên trong lên repository GitHub mới.
2. Import repository vào Vercel với Framework Preset **Other**.
3. Không cần Build Command hay Output Directory.
4. Thêm các biến môi trường ở trên.
5. Redeploy sau khi cấu hình xong.

Các URL:

```text
/                 Home
/announcements    Thông báo
/is7mc            King IS7MC
/kingmc           King KINGMC
/admin            Dashboard Admin
```

## Chế độ chưa nối database

Các trang giới thiệu, thông báo và giao diện công khai vẫn có thể mở. Những thao tác tạo/sửa/xóa dữ liệu King, đề cử và lịch sử cần `DATABASE_URL` vì đây là dữ liệu phải lưu an toàn trên server.