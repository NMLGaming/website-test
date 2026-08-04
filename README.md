# Website Test

Website tĩnh nhiều trang dùng HTML, CSS và JavaScript thuần — không framework, không CDN.

## Cấu trúc thư mục

```
vercel-website/
├── index.html          # Trang chủ  →  /
├── style.css           # CSS dùng chung cho tất cả trang
├── script.js           # JS dùng chung (menu, active link, fade transition)
├── home/
│   └── index.html      # Trang Home  →  /home
├── leaderboard/
│   └── index.html      # Trang Leaderboard  →  /leaderboard
├── profile/
│   └── index.html      # Trang Profile  →  /profile
├── vercel.json         # Cấu hình Vercel (clean URLs)
└── README.md
```

## Các trang

| URL             | Nội dung                        |
|-----------------|---------------------------------|
| `/`             | Trang chủ, điều hướng chính     |
| `/home`         | Lời chào                        |
| `/leaderboard`  | Bảng xếp hạng người chơi        |
| `/profile`      | Thông tin nhân vật               |

## Chạy trên máy tính

**Cách 1 — VS Code Live Server (khuyên dùng):**
1. Cài extension **Live Server** trong VS Code.
2. Mở thư mục `vercel-website` trong VS Code.
3. Nhấp chuột phải vào `index.html` → **Open with Live Server**.

> ⚠️ Mở `index.html` bằng cách nhấp đôi trực tiếp sẽ không truy cập được `/home`, `/leaderboard`, `/profile` vì trình duyệt cần một web server để xử lý đường dẫn. Hãy dùng Live Server hoặc Python.

**Cách 2 — Python:**
```bash
cd vercel-website
python -m http.server 8080
# Mở trình duyệt tại http://localhost:8080
```

**Cách 3 — Node.js (npx):**
```bash
cd vercel-website
npx serve .
```

## Deploy lên Vercel

### Bước 1 — Đưa code lên GitHub

```bash
cd vercel-website
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Bước 2 — Import vào Vercel

1. Truy cập [vercel.com](https://vercel.com) → Đăng nhập.
2. Nhấn **"Add New… → Project"**.
3. Chọn repository vừa tạo → **"Import"**.
4. Để nguyên mọi cài đặt mặc định (Vercel tự nhận ra static site).
5. Nhấn **"Deploy"**.

Sau vài giây, các URL sau sẽ hoạt động ngay:

```
https://ten-web.vercel.app/
https://ten-web.vercel.app/home
https://ten-web.vercel.app/leaderboard
https://ten-web.vercel.app/profile
```

### Tại sao `/home` hoạt động mà không cần `.html`?

File `vercel.json` có `"cleanUrls": true` — Vercel tự động map:
- `/home` → `home/index.html`
- `/leaderboard` → `leaderboard/index.html`
- `/profile` → `profile/index.html`

Không cần cấu hình gì thêm.

### Cập nhật sau này

Mỗi lần bạn `git push` lên nhánh `main`, Vercel sẽ tự động deploy lại.
