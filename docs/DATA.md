# Nạp dữ liệu huấn luyện

Có 3 nguồn, dùng cùng lúc được.

## 1. Mèo của bạn, thu hằng ngày (quan trọng nhất)
Thu trong app → chọn "Lúc bé kêu, chuyện gì đang diễn ra?" → chọn kết quả sau khi đáp lại → Lưu.
- Gắn nhãn theo **chuyện xảy ra thật**, không theo cảm giác: bé kêu, bạn đổ hạt, bé im và ăn → "Đói", "Dịu lại".
- Sau 6 mẫu (2 ngữ cảnh trở lên) app bắt đầu dùng mô hình riêng của bé. Tab "Bộ não của bé" hiện độ chính xác ước tính sau 10 mẫu.
- Mục tiêu tốt: 10 mẫu trở lên cho mỗi ngữ cảnh hay gặp.

## 2. Clip/video có sẵn
Xếp file theo thư mục mang tên ngữ cảnh:
```
my-clips/
  doi_an/      Muop__sang-thu-2.mp4   Muop__keu-cho-an.m4a
  ra_vao/      Muop__cua-ban-cong.mp4
  kho_chiu/    Mun__luc-tam.mp4
```
- Tên thư mục: `doi_an, ra_vao, choi, vuot, mot_minh, chao, kho_chiu, san_moi, meo_khac, khac`.
- Đặt `<tên mèo>__` ở đầu tên file để công cụ đánh giá đúng kiểu "đoán một con mèo chưa từng nghe".
- Mỗi clip chỉ nên chứa một ngữ cảnh. Clip dài được tự cắt thành từng đợt kêu.

## 3. Dataset công khai CatMeows
440 tiếng meo của 21 con mèo trong 3 ngữ cảnh: chờ ăn (F), được chải lông (B), ở một mình chỗ lạ (I). Tải `dataset.zip` tại doi:10.5281/zenodo.4007940 và giải nén.

**Giấy phép: chỉ cho nghiên cứu và mục đích phi thương mại.** Nếu Mèo Ngữ thu phí hoặc có quảng cáo, không được đưa CatMeows vào `base-model.json` bản public; dùng nó để đo và so sánh nội bộ thôi.

## Chạy công cụ
Cần Node 18+ và ffmpeg.
```bash
node tools/ingest.mjs --catmeows ./CatMeows/dataset --folders ./my-clips --out base-model.json --source "CatMeows + clip nội bộ"
```
Công cụ in số mẫu theo ngữ cảnh, **độ chính xác khi đoán một con mèo chưa từng nghe**, và bảng nhầm lẫn. Đặt `base-model.json` ở thư mục gốc repo rồi đẩy lên: app tự dùng nó cho những bé chưa đủ mẫu riêng.
