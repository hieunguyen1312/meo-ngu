# Mèo Ngữ

Ứng dụng web thu tiếng mèo, đoán ý của bé, **học riêng từng con mèo** qua những lần chủ gắn nhãn, và có **chuyên gia hành vi (agent Claude)** đọc dữ liệu của bé để giải thích và hướng dẫn chủ cách đáp lại.

Bản chạy: https://hieunguyen1312.github.io/meo-ngu/

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

## Agent

`POST /api/agent` gọi Claude với 5 tools: `get_cat_profile`, `get_sound_stats`, `get_recent_sounds`, `get_observations`, `save_observation`. Agent luôn xem dữ liệu thật của bé trước khi nhận định, không chẩn đoán bệnh, không khuyên phạt mèo, và nhắc đi thú y khi có dấu hiệu nguy hiểm. Giới hạn mặc định 30 câu hỏi mỗi thiết bị mỗi ngày (`AGENT_DAILY_LIMIT`).

## Quyền riêng tư

- Không cần tài khoản: mỗi thiết bị có một mã ngẫu nhiên; máy chủ chỉ lưu bản băm SHA-256 của mã.
- Mặc định chỉ gửi các con số đo được, **không gửi âm thanh**. Gửi bản ghi gốc là tuỳ chọn, phải bật trong Cài đặt.
- Người dùng xem và xoá toàn bộ dữ liệu của mình ngay trong app (`DELETE /api/me`).

## Nguồn tham khảo

- Ludovico và cộng sự (2020). CatMeows: A Publicly-Available Dataset of Cat Vocalizations. Zenodo, doi:10.5281/zenodo.4007940. Chỉ dùng cho nghiên cứu, phi thương mại.
- Litchfield và cộng sự (2017). The 'Feline Five': An exploration of personality in pet cats. PLOS ONE.
