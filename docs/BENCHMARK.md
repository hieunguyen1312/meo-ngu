# Đo độ chính xác bằng CatMeows

Ngày đo: 14/10/2026. Bộ dữ liệu: CatMeows (Ludovico và cộng sự, 2020, doi:10.5281/zenodo.4007940), md5 `b5fa911bcd6514e39dfef6876f747df4`.

**Dữ liệu CatMeows chỉ dùng để đo nội bộ** (giấy phép nghiên cứu, phi thương mại). Không đưa vào `base-model.json` của bản public, và repo này không chứa file âm thanh nào của bộ dữ liệu.

## Dữ liệu

| | |
|---|---|
| File âm thanh | 440 |
| Dùng được | 409 (31 file quá nhỏ tiếng, bộ đo không thấy tiếng kêu) |
| Số mèo | 20 |
| Ngữ cảnh | Chờ ăn 78 · Được chải lông (`vuot`) 114 · Một mình chỗ lạ 217 |

Vì ngữ cảnh "một mình" chiếm 53%, luôn đoán "một mình" đã đúng 53%. Do đó báo cáo dùng **độ chính xác cân bằng**: trung bình tỉ lệ đúng của từng ngữ cảnh. Đoán bừa giữa 3 ngữ cảnh thì độ chính xác cân bằng là 33%.

## Kết quả

| Cách đo | Đúng (thô) | Cân bằng | Chờ ăn | Chải lông | Một mình |
|---|---|---|---|---|---|
| Mô hình chung, đoán **một con mèo chưa từng nghe** | 55% | 40% | 6% | 25% | 88% |
| Như trên, có cân bằng trọng số ngữ cảnh | 52% | 45% | 41% | 24% | 71% |
| **Mô hình riêng từng con** (15 con đủ dữ liệu, bỏ-một-mẫu) | 72% | **69%** | 74% | 51% | 82% |

Mô hình riêng học được bao nhiêu sau bao nhiêu mẫu (mỗi ngữ cảnh):

| Mẫu đã gắn nhãn / ngữ cảnh | 1 | 2 | 3 | 5 |
|---|---|---|---|---|
| Độ chính xác cân bằng | 54% | 62% | 69% | 70% |

## Kết luận cho sản phẩm

1. **Đoán một con mèo lạ gần như không làm được** với đặc trưng hiện tại: 40–45%, chỉ hơn đoán bừa (33%) một chút. Kết quả này khớp với nhận định rằng mỗi con mèo có cách kêu riêng với chủ.
2. **Học riêng từng con thì có tác dụng thật**: lên 69% cân bằng. Phần lớn mức tăng đến trong 3 mẫu đầu tiên của mỗi ngữ cảnh.
3. Vì vậy app đặt trọng tâm vào việc gắn nhãn. Mô hình riêng bật khi có ≥ 6 mẫu thuộc ≥ 2 ngữ cảnh, và app khuyên chủ gắn khoảng 3 mẫu cho mỗi ngữ cảnh.
4. Cân bằng trọng số ngữ cảnh giúp tránh việc app nghiêng về ngữ cảnh hay gặp nhất. Đã áp dụng cho cả mô hình riêng lẫn `tools/ingest.mjs`.

## Giới hạn

- CatMeows chỉ có 3 ngữ cảnh, ghi trong điều kiện có kiểm soát, gồm 2 giống mèo (Maine Coon, European Shorthair). Tiếng mèo thật ở nhà, với 10 ngữ cảnh của app và tiếng ồn xung quanh, sẽ khó hơn.
- Ước lượng dùng k-NN trên 12 đặc trưng âm học. Bước tiếp theo đáng thử là đặc trưng học sẵn (embedding âm thanh) chạy trong trình duyệt.

## Chạy lại

```bash
node tools/ingest.mjs --catmeows ./CatMeows/dataset --out /tmp/catmeows-model.json
```
