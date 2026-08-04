# VIELIST — Minecraft Leaderboard

Website quản lý bảng xếp hạng Minecraft với hệ thống admin đầy đủ.
HTML/CSS/JS thuần + Vercel Serverless Functions + PostgreSQL backend.

## Cấu trúc project

```
minecraft-leaderboard/
├── index.html              # Trang Home (thông báo)
├── style.css               # CSS dùng chung
├── script.js               # JS dùng chung
├── home/index.html         # Redirect → /
├── is7mc/index.html        # IS7MC Leaderboard
├── kingmc/index.html       # KINGMC Leaderboard
├── player/index.html       # Tìm kiếm player
├── admin/index.html        # 🔒 Admin SPA
│
├── api/                    # ← Vercel Serverless Functions
│   ├── _lib/
│   │   ├── auth.js         # JWT + cookie utilities
│   │   └── db.js           # PostgreSQL pool
│   ├── auth/
│   │   ├── login.js        # POST /api/auth/login
│   │   ├── logout.js       # POST /api/auth/logout
│   │   └── me.js           # GET  /api/auth/me
│   ├── announcements/
│   │   ├── index.js        # GET (public) / POST (admin)
│   │   └── [id].js         # PUT / DELETE (admin)
│   ├── leaderboard/
│   │   ├── [server].js     # GET (public) / POST (admin)
│   │   └── [server]/[id].js# PUT / DELETE (admin)
│   ├── players/
│   │   ├── index.js        # GET / POST
│   │   └── [id].js         # PUT / DELETE
│   ├── settings/index.js   # GET (public) / PUT (admin)
│   └── stats/index.js      # GET (admin)
│
├── assets/
│   ├── css/admin.css       # Admin-specific styles
│   ├── js/
│   │   ├── data.js         # Public data layer (calls API)
│   │   ├── admin-api.js    # Admin API client
│   │   ├── admin.js        # Admin SPA logic
│   │   ├── announcements.js
│   │   ├── leaderboard.js
│   │   └── player.js
│   └── data/               # Fallback JSON (used when no DB)
│       ├── announcements.json
│       ├── leaderboard.json
│       └── players.json
│
├── database/
│   ├── schema.sql          # Run once to create tables
│   └── seed.sql            # Optional demo data
│
├── package.json            # Vercel Functions deps (pg, jsonwebtoken)
├── vercel.json             # cleanUrls config
└── README.md
```

## Bảo mật

| Nơi lưu | Thông tin |
|---------|-----------|
| Env var `ADMIN_USERNAME` | Tên đăng nhập admin |
| Env var `ADMIN_PASSWORD` | Mật khẩu admin (plaintext trong env var) |
| Env var `JWT_SECRET` | Khóa ký JWT (min 32 ký tự ngẫu nhiên) |
| Env var `DATABASE_URL` | Connection string PostgreSQL |
| **Không bao giờ** | Trong HTML / CSS / JavaScript frontend |

Admin login kiểm tra credentials **phía server** — không thể đọc password từ source code frontend.

## Setup Database (Neon — khuyên dùng, miễn phí)

1. Truy cập [neon.tech](https://neon.tech) → Tạo tài khoản → **New Project**
2. Copy **Connection string** (dạng `postgresql://user:pass@host/db?sslmode=require`)
3. Mở **SQL Editor** → chạy `database/schema.sql`
4. (Tùy chọn) chạy `database/seed.sql` để có dữ liệu mẫu

## Deploy lên Vercel

### Bước 1 — Push lên GitHub

```bash
cd minecraft-leaderboard
git init
git add .
git commit -m "init: VIELIST Minecraft Leaderboard"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Bước 2 — Import vào Vercel

1. Truy cập [vercel.com](https://vercel.com) → **Add New → Project**
2. Chọn repo → **Import**
3. Framework Preset: **Other** (giữ mặc định)
4. Nhấn **Deploy** (lần đầu chưa có env vars, chạy thử trước)

### Bước 3 — Cài Environment Variables

Vào **Settings → Environment Variables** trong Vercel dashboard:

| Key | Giá trị ví dụ | Ghi chú |
|-----|---------------|---------|
| `ADMIN_USERNAME` | `admin` | Tên đăng nhập |
| `ADMIN_PASSWORD` | `MatKhauManhCuaBan!` | Mật khẩu admin |
| `JWT_SECRET` | (chuỗi ngẫu nhiên 32+ ký tự) | Tạo tại [generate-secret.vercel.app](https://generate-secret.vercel.app/32) |
| `DATABASE_URL` | `postgresql://...` | Connection string từ Neon |

Sau khi đặt env vars → **Redeploy** (Settings → Deployments → Redeploy).

### Kết quả

```
https://ten-web.vercel.app/              ← Trang Home
https://ten-web.vercel.app/is7mc         ← IS7MC Leaderboard
https://ten-web.vercel.app/kingmc        ← KINGMC Leaderboard
https://ten-web.vercel.app/player        ← Tìm kiếm player
https://ten-web.vercel.app/admin         ← 🔒 Admin Panel
https://ten-web.vercel.app/api/...       ← API endpoints
```

## Chế độ Demo (không có Database)

Nếu chưa cài `DATABASE_URL`:
- Trang public vẫn hoạt động (đọc từ `assets/data/*.json`)
- Admin vẫn đăng nhập được (cần ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET)
- Các thao tác viết (thêm/sửa/xóa) sẽ trả về lỗi 503

## Chạy trên máy tính (dev)

Cần cài [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
cd minecraft-leaderboard
```

Tạo file `.env.local`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=test123
JWT_SECRET=dev-secret-change-in-production-32chars
DATABASE_URL=postgresql://...   # (tùy chọn)
```

Chạy:
```bash
vercel dev
# Mở http://localhost:3000
```

Hoặc chạy web tĩnh không có backend (chỉ xem giao diện):
```bash
python -m http.server 8080
# Mở http://localhost:8080 — API calls sẽ báo lỗi
```

## Admin Panel — Tính năng

| Section | Chức năng |
|---------|-----------|
| Dashboard | Tổng số player, thông báo, leaderboard entries, trạng thái DB |
| Thông báo | Đăng / sửa / xóa / ghim / đặt lịch thông báo |
| IS7MC | Thêm/sửa/xóa player PvP và King cho IS7MC |
| KINGMC | Thêm/sửa/xóa player PvP và King cho KINGMC |
| Players | Quản lý danh sách player toàn cục |
| Settings | Đổi tên web, màu, footer, bật/tắt hiệu ứng |

## Mở rộng thêm server

Để thêm server mới (VD: `newserver`):
1. Thêm `api/leaderboard/[server].js` đã hỗ trợ bất kỳ tên server nào
2. Tạo `newserver/index.html` (copy từ `is7mc/index.html`, đổi `LB_SERVER`)
3. Thêm nav link trong các trang HTML
4. Thêm seed data vào `database/seed.sql` nếu cần

Không cần sửa code backend — API route `[server]` là dynamic.
