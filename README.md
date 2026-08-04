# Website Test

Website tĩnh đơn giản dùng HTML, CSS và JavaScript thuần — không có framework, không có CDN.

## Cấu trúc thư mục

```
website-test/
├── index.html   # Cấu trúc trang
├── style.css    # Giao diện & animation
├── script.js    # Logic tương tác
└── README.md    # Tài liệu này
```

## Chạy trên máy tính

Không cần cài đặt gì cả. Chỉ cần mở file `index.html` bằng trình duyệt:

**Cách 1 — Mở trực tiếp:**
```
Nhấp đôi vào file index.html
```

**Cách 2 — Dùng VS Code Live Server (khuyên dùng):**
1. Cài extension **Live Server** trong VS Code.
2. Mở thư mục `website-test` trong VS Code.
3. Nhấp chuột phải vào `index.html` → **Open with Live Server**.

**Cách 3 — Dùng Python (nếu đã cài Python):**
```bash
cd website-test
python -m http.server 8080
# Mở trình duyệt tại http://localhost:8080
```

## Deploy lên Vercel

### Bước 1 — Đưa code lên GitHub

1. Tạo repository mới trên [github.com](https://github.com).
2. Chạy các lệnh sau trong terminal:

```bash
cd website-test
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<tên-của-bạn>/<tên-repo>.git
git push -u origin main
```

### Bước 2 — Import vào Vercel

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập (hoặc tạo tài khoản miễn phí).
2. Nhấn **"Add New… → Project"**.
3. Chọn repository GitHub vừa tạo → nhấn **"Import"**.
4. Để nguyên tất cả cài đặt mặc định (Vercel tự nhận ra đây là website tĩnh).
5. Nhấn **"Deploy"**.

Sau vài giây, Vercel sẽ cấp cho bạn một URL dạng `https://ten-du-an.vercel.app` — chia sẻ ngay được!

### Lưu ý

- Mỗi lần bạn `git push` lên `main`, Vercel sẽ tự động deploy lại.
- Không cần `vercel.json` hay bất kỳ file cấu hình nào thêm.
