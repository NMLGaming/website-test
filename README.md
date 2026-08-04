# VIELIST — Minecraft Leaderboard

Website quản lý bảng xếp hạng Minecraft cho IS7MC.NET và KINGMC.VN.
Xây dựng bằng HTML, CSS và JavaScript thuần — không framework, không CDN.

## Cấu trúc project

```
minecraft-leaderboard/
├── index.html              # Trang Home (thông báo)  →  /
├── style.css               # Toàn bộ CSS dùng chung
├── script.js               # JS dùng chung (nav, transitions, toast)
├── home/
│   └── index.html          # Redirect về /
├── is7mc/
│   └── index.html          # Leaderboard IS7MC.NET  →  /is7mc
├── kingmc/
│   └── index.html          # Leaderboard KINGMC.VN  →  /kingmc
├── player/
│   └── index.html          # Tìm kiếm player       →  /player
├── admin/
│   └── index.html          # Admin panel           →  /admin
├── assets/
│   ├── data/
│   │   ├── announcements.json   # Dữ liệu thông báo mặc định
│   │   ├── leaderboard.json     # Dữ liệu bảng xếp hạng
│   │   └── players.json         # Dữ liệu người chơi
│   └── js/
│       ├── data.js          # Data layer (đổi sang API thật ở đây)
│       ├── announcements.js # Render thông báo
│       ├── leaderboard.js   # Render bảng xếp hạng
│       ├── player.js        # Tìm kiếm player
│       └── admin.js         # CRUD thông báo
├── vercel.json              # Cấu hình clean URLs
└── README.md
```

## Các trang

| URL         | Nội dung                          |
|-------------|-----------------------------------|
| `/`         | Trang chủ — thông báo mới nhất   |
| `/is7mc`    | Leaderboard IS7MC.NET             |
| `/kingmc`   | Leaderboard KINGMC.VN             |
| `/player`   | Tìm kiếm thông tin người chơi    |
| `/admin`    | Quản trị thông báo (đăng/sửa/xóa)|

## Admin Panel

Truy cập `/admin` và đăng nhập:

- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `vielist2026`

Sau khi đăng nhập, bạn có thể:
- ➕ Đăng thông báo mới
- ✏️ Sửa thông báo
- 🗑️ Xóa thông báo

Thông báo được lưu vào `localStorage` của trình duyệt và hiển thị ngay ở trang Home.
Người dùng thường chỉ thấy thông báo ở `/`, không thể vào `/admin`.

> ⚠️ **Lưu ý bảo mật:** Hiện tại mật khẩu được kiểm tra phía client (demo).
> Để dùng thật, hãy thay `assets/js/data.js` để gọi API backend thực sự.

## Chạy trên máy tính

**Cách 1 — VS Code Live Server (khuyên dùng):**
1. Cài extension **Live Server** trong VS Code.
2. Mở thư mục `minecraft-leaderboard` trong VS Code.
3. Nhấp chuột phải `index.html` → **Open with Live Server**.

**Cách 2 — Python:**
```bash
cd minecraft-leaderboard
python -m http.server 8080
# Mở http://localhost:8080
```

**Cách 3 — Node.js:**
```bash
cd minecraft-leaderboard
npx serve .
```

> Cần web server để các đường dẫn `/is7mc`, `/player`… hoạt động đúng.

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

1. Truy cập [vercel.com](https://vercel.com) → **Add New → Project**.
2. Chọn repo GitHub → **Import**.
3. Để nguyên mặc định (Vercel nhận ra static site).
4. Nhấn **Deploy**.

Sau vài giây, các URL sau sẽ hoạt động:
```
https://ten-web.vercel.app/
https://ten-web.vercel.app/is7mc
https://ten-web.vercel.app/kingmc
https://ten-web.vercel.app/player
https://ten-web.vercel.app/admin
```

Clean URLs hoạt động nhờ `"cleanUrls": true` trong `vercel.json`.

## Nâng cấp lên production

### Đổi dữ liệu leaderboard

Sửa file `assets/data/leaderboard.json` — cấu trúc JSON đã có sẵn.

### Kết nối API thật

Mở `assets/js/data.js`, thay các `fetch('/assets/data/...')` bằng URL API backend:

```js
// Ví dụ
async function getLeaderboard(server) {
  const res = await fetch('https://api.vielist.net/leaderboard/' + server);
  return res.json();
}
```

### Xác thực admin thật

Thay phần login trong `assets/js/admin.js` để gọi API:
```js
// Thay bằng POST /api/auth/login
const res = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});
```
