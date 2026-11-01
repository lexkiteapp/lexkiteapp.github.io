# Phương pháp "làm 1 lần ăn ngay" cho nội dung sinh tự động (ảnh, kho từ)

> TL;DR: Mọi pipeline nội dung (ảnh từ vựng, kho từ 20k, …) đi đúng 6 bước: thước đo trước → nhánh riêng → pilot mẫu KHÓ cố định chấm tự động → đạt mới gộp + chạy hàng loạt → tự dừng khi sản lượng/chất lượng tụt → mỗi lỗi một test chặn. Không chạy hàng loạt rồi mới sửa.
> Đọc khi: bắt đầu hoặc đổi một pipeline sinh nội dung (prompt, mô hình, giám khảo, nguồn dữ liệu).

## 6 bước bắt buộc
1. **Thước đo trước khi làm.** Ghi rõ chỉ số + ngưỡng đạt, đo được trên CI: ảnh = tỉ lệ ảnh qua giám khảo/ảnh vẽ và tỉ lệ ảnh SAI nghĩa trong ảnh nhận (≤ 1/20); kho từ = mục sai/50 mẫu ngẫu nhiên (≤ 1/50, tách LÕI và DỊCH) + cổng IPA.
2. **Nhánh riêng.** Thay đổi đẩy lên nhánh, main không đổi cho tới khi pilot đạt (workflow_dispatch chạy được trên nhánh).
3. **Pilot trên mẫu KHÓ cố định** (ảnh: 40 nghĩa trượt nhiều nhất `content/visual/pilot-hard-*.json`; kho từ: lô pilot 300–400 từ), chấm tự động + MỘT tờ soát cho mắt người. Cùng mẫu cho mọi lần đo → so được trước/sau.
4. **Đạt → gộp main + hàng loạt** (tự nối lượt, ≤ 5 máy GitHub, kho CF chia theo `LX_PILOT`). **Trượt → phân lớp lỗi** (đếm theo lý do), sửa GỐC của lớp lớn nhất (prompt/nguồn/cổng), không sửa từng mục, rồi pilot lại CÙNG mẫu.
5. **Hàng loạt tự giám sát:** mỗi lượt ghi sản lượng (ảnh đạt/ảnh vẽ, mục đạt/mục) vào log; tụt dưới ngưỡng pilot một nửa → dừng chuỗi, không đốt tài nguyên.
6. **Mỗi lỗi đã gặp = một test chặn** trong `npm test` + một dòng bài học trong doc của pipeline (`VOCAB-IMG-STYLE.md` §11, `LEXICON.md`).

## Nguyên nhân hay gặp (đã trả giá)
- Prompt dài (~1.000 ký tự) + chọn câu không vẽ được → 2–7 % ảnh đạt (sửa: thẻ e4 câu cảnh ≤ 20 từ + `draw` ≥ 4, 29/10).
- Giám khảo chấm câu khác với thứ đã vẽ/viết → trượt oan; chấm đúng đối tượng.
- Ước tính thay cho đo (neuron/ảnh 60 → thật 110; hạn mức "00:00 UTC" → thật 24 giờ trượt).
- Dịch máy lệch nghĩa khoá → dịch ngược + từ điển nguồn trước khi nhận.
