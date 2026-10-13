# Đưa backend lên Cloudflare

Frontend đã chạy trên GitHub Pages. Phần này bật đồng bộ dữ liệu và chuyên gia hành vi (agent).

Bạn cần: tài khoản Cloudflare (gói miễn phí đủ dùng) và một API key Claude từ https://console.anthropic.com.

## 1. Tạo cơ sở dữ liệu D1
1. Cloudflare dashboard → **Storage & Databases → D1** → **Create database**, tên `meo-ngu`.
2. Mở database vừa tạo → tab **Console** → dán toàn bộ nội dung `worker/schema.sql` → **Execute**.
3. Sao chép **Database ID** và điền vào `worker/wrangler.toml` (dòng `database_id`). ID này không phải bí mật.

## 2. Tạo Worker từ GitHub
1. **Workers & Pages → Create → Import a repository** → chọn `hieunguyen1312/meo-ngu`.
2. **Root directory**: `worker`. **Deploy command**: `npx wrangler deploy`.
3. Deploy. Ghi lại địa chỉ dạng `https://meo-ngu.<tên-bạn>.workers.dev`.

## 3. Thêm API key Claude (tự làm, không gửi key cho ai)
Worker → **Settings → Variables and Secrets → Add** → loại **Secret**, tên `ANTHROPIC_API_KEY`, giá trị là key của bạn → Deploy.

Kiểm tra: mở `https://<địa-chỉ-worker>/api/health` phải thấy `{"ok":true,"agent":true,...}`.

## 4. Nối frontend với backend
Sửa `assets/config.js`:
```js
window.MEONGU_API = 'https://meo-ngu.<tên-bạn>.workers.dev';
```
Đẩy lên GitHub, khoảng 1 phút sau link GitHub Pages sẽ dùng backend mới.

## 5. (Tuỳ chọn) Lưu bản ghi âm gốc
R2 → tạo bucket `meo-ngu-audio`, bỏ comment khối `[[r2_buckets]]` trong `wrangler.toml`, deploy lại. Chỉ người dùng bật "Chia sẻ bản ghi âm" mới gửi âm thanh.

## Cấu hình
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ALLOWED_ORIGINS` | GitHub Pages + localhost | Trang nào được gọi API |
| `AGENT_MODEL` | `claude-sonnet-5-5` | Model cho agent. Đổi sang model nhỏ hơn để giảm chi phí khi có nhiều người dùng |
| `AGENT_DAILY_LIMIT` | `30` | Số câu hỏi mỗi thiết bị mỗi ngày |

## Chạy thử trên máy
```bash
cd worker && npm install
npm run db:init:local
echo "ANTHROPIC_API_KEY=sk-..." > .dev.vars
npm run dev            # http://localhost:8787
```
