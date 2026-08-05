# VIELIST — Minecraft Leaderboard

Website quản lý bảng xếp hạng Minecraft với đăng nhập Discord OAuth2 và admin panel đầy đủ.
HTML/CSS/JS thuần + Vercel Serverless Functions + PostgreSQL backend.

## Giao diện

Bản hiện tại dùng giao diện dark glassmorphism với Home hub, server cards, live data rail,
leaderboard responsive và trang KINGMC có khu vực “Current King” riêng. Code vẫn là HTML/CSS/JS
thuần để có thể upload trực tiếp lên GitHub và deploy trên Vercel, không cần build step.

## Cấu trúc project

```
minecraft-leaderboard/
├── index.html              # Home (thông báo)
├── style.css               # CSS dùng chung
├── script.js               # JS dùng chung
├── is7mc/index.html        # IS7MC Leaderboard
├── kingmc/index.html       # KINGMC Leaderboard
├── player/index.html       # Tìm kiếm player
├── admin/index.html        # 🔒 Admin SPA (chỉ Owner)
│
├── api/
│   ├── _lib/
│   │   ├── auth.js         # JWT cookie + owner check (server-side)
│   │   └── db.js           # PostgreSQL pool
│   ├── auth/
│   │   ├── discord.js      # GET  /api/auth/discord → redirect Discord
│   │   ├── callback.js     # GET  /api/auth/callback ← Discord returns here
│   │   ├── me.js           # GET  /api/auth/me → current user info
│   │   └── logout.js       # POST /api/auth/logout → clear session
│   ├── announcements/
│   │   ├── index.js        # GET (public) / POST (owner only)
│   │   └── [id].js         # PUT / DELETE (owner only)
│   ├── leaderboard/
│   │   ├── [server].js     # GET (public) / POST (owner only)
│   │   └── [server]/[id].js
│   ├── players/
│   │   ├── index.js
│   │   └── [id].js
│   ├── settings/index.js
│   └── stats/index.js
│
├── assets/
│   ├── css/admin.css
│   ├── js/
│   │   ├── auth-nav.js     # Discord login/user menu trong navbar
│   │   ├── data.js         # Public data layer
│   │   ├── admin-api.js    # Admin API client
│   │   ├── admin.js        # Admin SPA
│   │   ├── announcements.js
│   │   ├── leaderboard.js
│   │   └── player.js
│   └── data/               # Fallback JSON (khi không có DB)
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── package.json
├── vercel.json
└── README.md
```

## Bảo mật

| Thông tin | Nơi lưu | Ghi chú |
|-----------|---------|---------|
| Discord Client ID | Env var `DISCORD_CLIENT_ID` | Public trong OAuth URL nhưng vẫn nên để env var |
| Discord Client Secret | Env var `DISCORD_CLIENT_SECRET` | **Không bao giờ để trong code** |
| Owner Discord ID | Env var `OWNER_DISCORD_ID` | Check server-side, không bao giờ gửi frontend |
| JWT Secret | Env var `JWT_SECRET` | Ký session cookie |
| Database URL | Env var `DATABASE_URL` | Connection string PostgreSQL |
| Redirect URI | Env var `DISCORD_REDIRECT_URI` | Phải khớp Discord Developer Portal |

**Nguyên tắc bảo mật:**
- Owner ID chỉ tồn tại trong env var phía server — frontend không thể biết giá trị này
- Discord Client Secret chỉ dùng server-side để exchange code
- Session dùng JWT trong httpOnly cookie — JavaScript frontend không đọc được
- Tất cả API write endpoint đều verify role=OWNER ở phía server

## Setup Database (Neon — miễn phí)

1. Truy cập [neon.tech](https://neon.tech) → Tạo account → **New Project**
2. Copy **Connection string** (`postgresql://user:pass@host/db?sslmode=require`)
3. Mở **SQL Editor** → chạy nội dung `database/schema.sql`
4. (Tùy chọn) chạy `database/seed.sql` để có dữ liệu mẫu

## Setup Discord OAuth2

### Bước 1 — Tạo Discord App

1. Vào [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → đặt tên
3. Vào tab **OAuth2**
4. Copy **Client ID** (công khai, OK)
5. **Reset Secret** → Copy **Client Secret** (giữ bí mật!)

### Bước 2 — Thêm Redirect URI

Trong tab **OAuth2 → Redirects**, thêm:
```
https://ten-web-cua-ban.vercel.app/api/auth/callback
```
*(Thêm cả `http://localhost:3000/api/auth/callback` để dev local)*

### Bước 3 — Tìm Owner Discord ID

1. Discord → Settings → Advanced → bật **Developer Mode**
2. Click chuột phải vào user của bạn → **Copy User ID**

## Deploy lên Vercel

### Push lên GitHub

```bash
cd minecraft-leaderboard
git init && git add . && git commit -m "init"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Import vào Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → chọn repo
2. Framework Preset: **Other** → **Deploy**

### Cài Environment Variables

Vào **Settings → Environment Variables**:

| Key | Giá trị |
|-----|---------|
| `DISCORD_CLIENT_ID` | Client ID từ Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Client Secret (đã reset nếu bị lộ) |
| `DISCORD_REDIRECT_URI` | `https://ten-web.vercel.app/api/auth/callback` |
| `OWNER_DISCORD_ID` | Discord User ID của bạn |
| `JWT_SECRET` | Chuỗi ngẫu nhiên 32+ ký tự ([tạo tại đây](https://generate-secret.vercel.app/32)) |
| `DATABASE_URL` | Connection string Neon PostgreSQL |

Sau khi đặt → **Redeploy**.

### Kết quả

```
https://ten-web.vercel.app/         ← Home (thông báo)
https://ten-web.vercel.app/is7mc    ← IS7MC Leaderboard
https://ten-web.vercel.app/kingmc   ← KINGMC Leaderboard
https://ten-web.vercel.app/player   ← Tìm kiếm player
https://ten-web.vercel.app/admin    ← 🔒 Admin (Owner only)
```

## Luồng đăng nhập

```
User click "Login with Discord"
        ↓
GET /api/auth/discord
  → Tạo CSRF state
  → Set state cookie (httpOnly, 5 phút)
  → Redirect → discord.com/oauth2/authorize
        ↓
Discord xác thực user → Redirect về
GET /api/auth/callback?code=...&state=...
  → Verify state cookie (CSRF check)
  → Exchange code → access token (server-side, secret không lộ)
  → Fetch discord user info
  → Check discord_id === OWNER_DISCORD_ID (server-side)
  → Tạo JWT: { username, avatar, role } — KHÔNG có discord_id
  → Set session cookie (httpOnly, 7 ngày)
  → Redirect → /admin hoặc /
        ↓
GET /api/auth/me → { authenticated, username, avatar, role }
  → Frontend biết username, avatar, role
  → Không bao giờ biết discord_id hay owner_id
```

## Dev local

Cài [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
cd minecraft-leaderboard
```

Tạo `.env.local`:
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
OWNER_DISCORD_ID=1223927653455757383
JWT_SECRET=dev-secret-min-32-chars-change-this
DATABASE_URL=postgresql://...
```

Chạy:
```bash
vercel dev
# Mở http://localhost:3000
```

## Admin Panel

Truy cập `/admin` → nếu chưa đăng nhập sẽ hiện nút "Đăng nhập với Discord".
Sau khi đăng nhập:
- **OWNER**: thấy full admin dashboard
- **USER thường**: thấy trang 403

| Section | Chức năng |
|---------|-----------|
| Dashboard | Tổng quan stats, trạng thái database |
| Thông báo | Đăng / sửa / xóa / ghim / lên lịch |
| IS7MC | PvP & King: thêm/sửa/xóa player, đổi điểm/rank |
| KINGMC | Giống IS7MC |
| Players | Quản lý danh sách player toàn cục |
| Settings | Upload logo Home/logo menu/avatar, đổi ảnh nền, nội dung Home, màu, footer, hiệu ứng |

Quyền Owner được kiểm tra ở server-side qua `OWNER_DISCORD_ID`. Người đã đăng nhập nhưng
không phải Owner sẽ nhận `403 Forbidden` khi truy cập Admin API và màn hình Admin không được mở.

### Đổi logo, avatar và nội dung Home

Vào `/admin` → `Settings`:

- **Logo chữ V ở Home**: chọn ảnh PNG/JPG/GIF. Ảnh được đặt vào vòng tròn phát sáng và có hiệu ứng hover.
- **Logo trên thanh menu**: chọn ảnh logo; nếu bỏ trống, website dùng logo chữ.
- **Avatar tuỳ chỉnh**: chọn ảnh; khi hiển thị sẽ luôn là hình tròn và nổi lên nhẹ khi di chuột.
- **Nội dung trang chủ**: chỉnh tiêu đề, mô tả, các đoạn nội dung dài và footer ngay trong form.
- **Hiệu ứng animation**: bật/tắt hiệu ứng xuất hiện khi cuộn trang.

Ảnh được nén nhẹ trước khi lưu. Trong bản demo chưa nối PostgreSQL, các cài đặt vẫn được lưu
trong trình duyệt để có thể xem ngay. Khi deploy cùng Neon và chạy `database/schema.sql`,
settings sẽ được lưu trong bảng `settings`.

## Deploy nhanh lên Vercel

1. Giải nén file ZIP và upload **nội dung bên trong thư mục `vielist2`** lên một repository GitHub mới.
2. Vào Vercel → **Add New Project** → chọn repository → giữ Framework là **Other**.
3. Không cần Build Command và Output Directory; Vercel sẽ phục vụ các file HTML tĩnh và thư mục `api/`.
4. Thêm các Environment Variables: `SESSION_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `DISCORD_REDIRECT_URI`, `OWNER_DISCORD_ID`, và `DATABASE_URL` nếu dùng PostgreSQL.
5. Sau khi deploy, thêm chính xác URL
   `https://<domain-cua-ban>/api/auth/callback` vào Discord Developer Portal → OAuth2 → Redirects.

Nếu chưa nối database, website vẫn chạy chế độ demo với dữ liệu trong `assets/data/`.
File `.env.example` chỉ là mẫu an toàn. Không commit secret thật vào GitHub; `.gitignore`
đã chặn các file `.env` khỏi repository. Nếu đổi domain Vercel, nhớ cập nhật đồng thời
`DISCORD_REDIRECT_URI` trên Vercel và Redirect URI trong Discord Developer Portal.

## Chế độ Demo (không có DB)

Nếu `DATABASE_URL` chưa được đặt:
- Trang public hoạt động bình thường (đọc từ `assets/data/*.json`)
- Đăng nhập Discord vẫn hoạt động (cần đủ Discord + JWT env vars)
- Các thao tác write (thêm/sửa/xóa) trả về lỗi 503
