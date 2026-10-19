# Mèo Ngữ

Ứng dụng web thu tiếng mèo, đoán ý của bé, **học riêng từng con mèo** qua những lần chủ gắn nhãn, và có **chuyên gia hành vi (agent Claude)** đọc dữ liệu của bé để giải thích và hướng dẫn chủ cách đáp lại.

Bản chạy: https://hieunguyen1312.github.io/meo-ngu/

## Cài như app (PWA)

Mở link trên điện thoại:
- **Android (Chrome):** bấm "Cài app" trên thanh gợi ý, hoặc menu ⋮ → "Cài đặt ứng dụng".
- **iPhone (Safari):** nút Chia sẻ → "Thêm vào MH chính". Thông báo trên iPhone chỉ chạy khi mở app từ icon này (iOS 16.4 trở lên).

App dùng được khi mất mạng (thu âm, gắn nhãn, mô hình riêng). Đồng bộ và chuyên gia cần mạng.

## Nhắc gắn nhãn

Mô hình riêng của bé chỉ học khi chủ gắn nhãn, nên app giảm công gắn nhãn bằng 3 cách:
1. **Một chạm:** sau khi thu, app hỏi "App đoán bé đang: Đói. Đúng không?".
2. **Chờ gắn nhãn:** tab Nhật ký liệt kê các tiếng kêu 3 ngày gần nhất chưa có nhãn, chọn bằng một chạm.
3. **Thông báo:** bật trong Cài đặt; 5 phút sau mỗi lần thu, nếu chưa gắn nhãn, máy chủ gửi Web Push (VAPID + mã hoá aes128gcm, cron mỗi phút). Chạm vào thông báo mở đúng tiếng kêu đó.

## Cách app "học"

```
Thu âm / tải file ──► đo 12 đặc trưng âm học (cao độ, độ dài, xu hướng giọng, độ rè, phổ…)
        │
        ├─► Đoán ngữ cảnh, theo thứ tự ưu tiên:
        │     1. Mô hình riêng của bé (k-NN trên các mẫu chủ đã gắn nhãn, cần ≥ 6 mẫu, ≥ 2 ngữ cảnh)
        │     2. Mô hình chung base-model.json (dựng bằng tools/ingest.mjs)
        │     3. Quy tắc âm học cơ bản
        │
        └─► Chủ gắn nhãn: "lúc đó bé đang…" + "đáp lại xong bé thế nào"
              → mẫu mới vào bộ nhớ của bé → lần sau đoán sát hơn
```

Không có "ngôn ngữ mèo" chung: mèo trưởng thành kêu meo chủ yếu để nói với người, và mỗi con có cách kêu riêng với chủ. Vì vậy mô hình riêng từng con là trọng tâm; mô hình chung chỉ là điểm khởi đầu.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `index.html`, `assets/` | Ứng dụng web (GitHub Pages). Chạy được ngoại tuyến, lưu trên máy. |
| `assets/core.js` | Phân tích âm thanh, đặc trưng, k-NN. Dùng chung cho trình duyệt và `tools/ingest.mjs`. |
| `assets/config.js` | Địa chỉ API. Để trống = ngoại tuyến. |
| `worker/` | API Cloudflare Worker + D1 (+ R2 tuỳ chọn) + agent Claude có tools. |
| `tools/ingest.mjs` | Nạp dữ liệu: CatMeows và clip của bạn → `base-model.json`. |
| `docs/DEPLOY.md` | Các bước đưa backend lên Cloudflare. |
| `docs/DATA.md` | Cách chuẩn bị và nạp dữ liệu huấn luyện. |
| `docs/BENCHMARK.md` | Kết quả đo bằng CatMeows: mô hình riêng từng con 69% so với 40–45% khi đoán mèo lạ. |

## Agent

`POST /api/agent` gọi AI theo thứ tự Gemini (miễn phí) → Workers AI (miễn phí) → Claude (trả phí, tuỳ chọn), với 5 tools: `get_cat_profile`, `get_sound_stats`, `get_recent_sounds`, `get_observations`, `save_observation`. Agent luôn xem dữ liệu thật của bé trước khi nhận định, không chẩn đoán bệnh, không khuyên phạt mèo, và nhắc đi thú y khi có dấu hiệu nguy hiểm. Giới hạn mặc định 10 câu hỏi mỗi thiết bị mỗi ngày (`AGENT_DAILY_LIMIT`).

## Quyền riêng tư

Chi tiết cho người dùng: [privacy.html](privacy.html). Lần đầu mở app, người dùng phải xác nhận từ 18 tuổi và đồng ý điều khoản thì mới đồng bộ; nếu không, app chạy ở chế độ chỉ lưu trên máy. Máy chủ từ chối mọi thao tác ghi dữ liệu khi chưa có đồng ý (`consent_required`). Việc dùng dữ liệu để cải thiện mô hình chung là đồng ý riêng (`share_model`), mặc định tắt. Người dùng ở EU/UK/Thuỵ Sĩ không được chuyển tới gói Gemini miễn phí.


- Không cần tài khoản: mỗi thiết bị có một mã ngẫu nhiên; máy chủ chỉ lưu bản băm SHA-256 của mã.
- Mặc định chỉ gửi các con số đo được, **không gửi âm thanh**. Gửi bản ghi gốc là tuỳ chọn, phải bật trong Cài đặt.
- Người dùng xem và xoá toàn bộ dữ liệu của mình ngay trong app (`DELETE /api/me`).

## Nguồn tham khảo

- Ludovico và cộng sự (2020). CatMeows: A Publicly-Available Dataset of Cat Vocalizations. Zenodo, doi:10.5281/zenodo.4007940. Chỉ dùng cho nghiên cứu, phi thương mại.
- Litchfield và cộng sự (2017). The 'Feline Five': An exploration of personality in pet cats. PLOS ONE.
