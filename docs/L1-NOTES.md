# L1-NOTES – ghi chú lỗi tiếng Anh theo tiếng mẹ đẻ (trục whyL1 của WORLD.md)

> TL;DR: `web/cpack/grammar-l1/<lang>.js` = `notes[idBài] = [[câu sai, câu đúng, vì sao, l1Form]]` (+ `because` = nhãn dòng l1Form), ≥200 mục/ngôn ngữ, viết tay bằng chính ngôn ngữ đó. Hiện ở đầu bài và ngay dưới câu trả lời sai (`grammar.js`: `l1Wrong`). Test `scripts/test/l1-notes.mjs` (khuôn + sàn chỉ tăng `l1-floors.json`). Quy trình viết/chấm bên dưới.
> Đọc khi: thêm/sửa ghi chú L1, thêm ngôn ngữ.

**Checklist từng mục (judge chấm đạt/trượt, mọi ý đều phải đạt):**
1. Câu "sai" thật sự sai với người bản xứ chuẩn (không phải biến thể chấp nhận được), và là lỗi người nói L1 đó thật sự hay mắc.
2. Chỉ MỘT lỗi trong câu sai.
3. Câu đúng là bản sửa tối thiểu, đúng và tự nhiên (khác câu sai đúng chỗ lỗi).
4. `l1Form` = câu/cấu trúc tiếng mẹ đẻ thật sự gây lỗi, đúng dạng `<câu L1> → "<dịch sát>"` (UI hiện dòng "Vì bạn nghĩ theo tiếng …"); gloss khớp cấu trúc câu sai; lời giải dẫn tới l1Form. Lời giải đúng sự thật về cả L1 lẫn tiếng Anh và NÊU cách cấu trúc L1 (dẫn dạng L1 cụ thể) gây lỗi.
5. Lời giải bằng L1 tự nhiên, ≤ 2 câu, không lẫn ngôn ngữ khác; không bịa quy tắc.
6. Hợp với bài (khoá); không trùng câu sai với mục khác.

**Quy trình mỗi ngôn ngữ:** (1) viết ≥200 mục theo checklist (đưa checklist vào prompt viết); (2) judge Sonnet chấm TỪNG mục, song song theo lô; mục trượt viết lại, trượt 2 lần thì thay mục mới; (3) grader độc lập chấm mẫu 50 mục, cần ≥90; (4) nâng sàn `l1-floors.json`.

**Cổng chuẩn (đã chốt 13/11):** Opus kiểm sự thật L1 + gloss từng mục (không xác nhận được → BỎ, không viết lại; thang Opus rất khắt khe, ≥90 gần như không ai đạt nên dùng ngưỡng ≥86) → 3 grader Sonnet độc lập chấm TOÀN BỘ mục, lấy trung vị điểm trung bình → ≥90 mới ship; ra 89.x thì chỉ bỏ mục mà ≥2/3 grader chấm <85 rồi tính lại, không lặp vòng. Mỗi mẫu lỗi chỉ giữ 1 mục tốt nhất (kiểm máy trùng mẫu: PR sau). Sàn `l1-floors.json` = số mục đã ship. Đợt 1: id 85 mục, trung vị 91.5; vi (121, 87.4) và hi (113, 87.4) chờ gỡ mục trùng mẫu rồi chấm lại.
