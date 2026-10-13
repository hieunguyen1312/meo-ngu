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

## 3. Thêm key AI (tự làm, không gửi key cho ai)
Agent thử lần lượt: **Gemini (miễn phí)** → **Workers AI của Cloudflare (miễn phí, không cần key)** → Claude (trả phí, tuỳ chọn).
1. Lấy key Gemini miễn phí: https://aistudio.google.com/apikey
2. Worker → **Settings → Variables and Secrets → Add** → loại **Secret**, tên `GEMINI_API_KEY`, dán key → Deploy.
3. (Tuỳ chọn) thêm Secret `ANTHROPIC_API_KEY` để có tầng dự phòng trả phí.

Lưu ý gói miễn phí của Gemini: Google được dùng nội dung để cải thiện sản phẩm và người duyệt có thể đọc; không dùng cho người dùng ở EU/UK/Thuỵ Sĩ; người dùng phải từ 18 tuổi. Hạn mức miễn phí khoảng vài trăm câu hỏi mỗi ngày và Google có thể thay đổi.

Kiểm tra: mở `https://<địa-chỉ-worker>/api/health`, phải thấy `"agent":true` và danh sách `providers`.

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
| `AGENT_PROVIDERS` | `gemini,workersai,anthropic` | Thứ tự thử các nhà cung cấp AI |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Model Gemini (gói miễn phí) |
| `WORKERS_AI_MODEL` | `@cf/google/gemma-4-26b-a4b-it` | Model Workers AI |
| `AGENT_MODEL` | `claude-haiku-5-5` | Model Claude cho tầng trả phí |
| `AGENT_DAILY_LIMIT` | `10` | Số câu hỏi mỗi thiết bị mỗi ngày |

## Chạy thử trên máy
```bash
cd worker && npm install
npm run db:init:local
echo "ANTHROPIC_API_KEY=sk-..." > .dev.vars
npm run dev            # http://localhost:8787
```
