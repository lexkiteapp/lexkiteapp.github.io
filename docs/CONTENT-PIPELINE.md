# Pipeline sản xuất nội dung học (chuẩn bắt buộc)

Quy tắc chất lượng: `docs/CONTENT-RULES.md`. File này là **quy trình** để mọi lô nội dung đạt chuẩn mà không phải đọc tay toàn bộ.

## 0. Vai trò
- **Người viết**: phiên Claude được giao lô (hoặc Antigravity khi là nội dung kèm giao diện).
- **Người nghiệm thu**: phiên chính (Claude) – không ai tự nghiệm thu lô của mình.

## 1. Chọn việc – hàng đợi tự động
`npm run content:queue` → `content/pipeline/QUEUE.md`: so số thật với chỉ tiêu `content/pipeline/targets.json`, xếp loại thiếu nhiều & ưu tiên cao lên đầu, có sẵn cỡ lô. **Chỉ lấy lô đầu hàng** (trừ khi phiên chính giao lô khác).

## 2. Brief lô (phiên chính viết, ≤ 15 dòng)
Loại · số lượng · cấp CEFR/Part · file đích · mẫu định dạng (trỏ 1 mục có sẵn) · chủ đề phải tránh trùng · **tiêu chí nghiệm thu** (mục 5).

## 3. Viết
- Theo đúng định dạng file sẵn có; tự biên soạn 100% (không chép đề/sách, không bịa "đề thật").
- Lô ≤ cỡ ghi trong QUEUE. Một lô = một commit.
- Lời giải tiếng Việt (khóa gốc): vì sao đúng **và** vì sao từng phương án khác sai; câu trích căn cứ nguyên văn từ bài đọc/kịch bản.
- Dịch 13 ngôn ngữ: KHÔNG làm tay – pipeline đêm `i18n.yml` (gen-explain, gen-content-i18n) tự làm.

## 4. Cổng tự động (phải xanh trước khi đẩy)
`npm run content:gate` = `content-check` (0 lỗi: đáp án/phương án/căn cứ/lỗi tiếng Anh) + `size-budget` (dung lượng, cảnh báo nội dung chỉ được giảm) + `vi-lint` + `brand-check` + `infra-check`; rồi `npm test` đầy đủ.
`explain-check` (bản dịch lời giải ≥ 98%) được phép tạm đỏ tối đa 1 đêm sau lô mới.

## 5. Nghiệm thu (phiên chính)
1. Diff đúng phạm vi file trong brief; đếm đúng số lượng.
2. **Đọc mẫu ngẫu nhiên 10%** (tối thiểu 5 mục): `node scripts/content-sample.mjs <commit> 5` – đáp án đúng, lời giải đúng & đủ, tiếng Anh tự nhiên, cấp độ đúng, không trùng chủ đề.
3. Mở trang thật trên lexkite.com (`?sandbox=1`) ở 1 ngôn ngữ ≠ vi: nạp được, không lỗi, không lẫn tiếng.
4. Đạt → ghi 1 dòng vào `content/pipeline/LOG.md` (ngày, loại, số lượng, commit, người viết, người nghiệm thu). Không đạt → trả lô kèm danh sách mục sai cụ thể.

## 6. Sau mỗi lô
`npm run content:queue` cập nhật hàng đợi. Đạt chỉ tiêu một loại → nâng chỉ tiêu trong `targets.json` (có lý do trong commit).
