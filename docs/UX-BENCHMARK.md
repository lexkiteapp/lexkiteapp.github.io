# UX benchmark – Lexkite vs Duolingo (đo bằng máy)

> TL;DR: So sánh với Duolingo nay là SỐ ĐO trên CI (bảng World, `WORLD-SCORECARD.md` → `content/pipeline/WORLD.md`). File này giữ bảng Top 10 khoảng cách tự sinh và việc nên làm cho từng mục. Bản so sánh bằng lời 25/10 (scorecard theo luồng, UX v3, UX1) nằm ở `archive/UX-BENCHMARK-2026-10.md`.
> Đọc khi: chọn việc UX/sản phẩm tiếp theo; sau mỗi lượt world-scorecard.yml.

Luật giữ nguyên: chất lượng chỉ tăng, không bỏ tính năng/nội dung để "gọn" (no-cuts). Lịch sử so sánh UX trước đây: [archive/UX-BENCHMARK-2026-10.md](archive/UX-BENCHMARK-2026-10.md). Kiểm hình đang dùng: `ux-shots.yml`, `ux-cards.yml`, visual-qa, new-ui-qa, journey-e2e (`QUALITY-SWEEP.md`).

## Top 10 khoảng cách theo tác động ÷ chi phí (tự sinh, đừng sửa tay)
<!-- auto:world-gaps:start -->
_Tự sinh từ `content/pipeline/WORLD.md` (2026-11-13)._

| # | Trục | Lexkite → mục tiêu | Tác động | Chi phí | Ưu tiên | Hiện trạng |
|---|---|---|---|---|---|---|
| 1 | Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 13.5 → 100 | 5 | 3 | 144.2 | 1/15 ngôn ngữ đạt đích; có "vì sao" (en 321, ar 7, de 11, es 12, fr 11, hi 8, id 85, ja 8, ko 7, pt 10, ru 8, th 9, tr 7, vi 12, zh 9; đích 200/ngôn ngữ) |
| 2 | Số chạm từ /app/ tới bài hôm nay (người quay lại) | 50 → 100 | 4 | 2 | 100 | 2 chạm |
| 3 | Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | 4.3 → 100 | 3 | 3 | 95.7 | 370.8 / 374.0 KB gz (đích 300) |
| 4 | Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | 53.3 → 100 | 5 | 3 | 77.8 | ✓ FSRS theo người · lỗi L1 1/15 ngôn ngữ (≥100 mục) |
| 5 | Màn theo Lexkite Kit/Stitch (stitch-coverage) | 24.6 → 100 | 3 | 4 | 56.6 | 17 Stitch / 69 màn (ref 49, tay 0) |
| 6 | Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | 77.8 → 100 | 5 | 2 | 55.5 | 5.8 s · 9 chạm (probe 2026-11-13) |
| 7 | Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 62.5 → 100 | 5 | 4 | 46.9 | IELTS 10 · TOEIC 7 · TOEFL 7 · Cambridge 1 đề (đích 10/kỳ) |
| 8 | Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | 77.8 → 100 | 4 | 2 | 44.4 | ✓npm-test ✓visual-qa ∅new-ui-qa ✓mobile-qa ✗journey-e2e ✓stitch-quality-qc ✓ext-e2e ✓native-auth-e2e ✓qa-bot · mobile-qa LCP 6441 ms, CLS 0.0757, INP 192 ms |
| 9 | Độ phủ nội dung (content:score) | 66.2 → 90 | 5 | 4 | 29.8 | content/pipeline/SCORE.md |
| 10 | Truy cập (Lighthouse accessibility trang chủ + app) | 99 → 100 | 3 | 1 | 3 | Lighthouse trang chủ + /app/ (axe/a11y tĩnh chạy trong npm test) |
<!-- auto:world-gaps:end -->

## Việc nên làm theo trục (người viết; số đo ở bảng trên)
- **whyL1 – vì sao theo 15 tiếng mẹ đẻ (lợi thế PHẢI thắng).** Hiện đã commit chỉ có `en`; 14 tiếng mẹ đẻ còn lại = 0. Chạy `explain.yml` (Gemini miễn phí) cho grammar/usage/review, mỗi ngôn ngữ ≥ 200 mục, rồi đưa vào `web/js/explain/<bộ>/<lang>.json`. Đây là khoảng cách lớn nhất trong các lợi thế. Chủ sở hữu: `EXPLAIN.md`.
- **exam – Cambridge 0 đề, TOEFL 4, TOEIC 7.** Đặc tả đã có (`content/exams/spec/cam-*.json`). Viết đề chạy được theo xưởng nội dung (`CONTENT-WORLD-PLAN.md`), đích 10 đề cho mỗi kỳ.
- **content / learn.** Đi theo `CONTENT-WORLD-PLAN.md` và learnability (PR #427/#430). Bảng World chỉ đọc điểm của các PR này.
- **stitch – 15/68 màn theo Kit.** 27 màn đã có ref và chỉ chờ port (xem `STITCH-COVERAGE.md`).
- **shell – 358,7/374 KB gz.** Muốn tới đích 300 KB thì chuyển module chưa cần lúc mở app sang tải lười. `shell-size.mjs` cho biết module nào nặng.
- **firstRun / todayTaps.** Probe đo trên CI. Nếu vượt 5 chạm hoặc 30 s: rút bớt bước thiết lập (giữ đủ lựa chọn, đặt mặc định thông minh), hoặc mở thẳng bài đầu sau `#go`.
- **offline / personal.** Đã có shell, điều hướng dự phòng, gói từ offline, FSRS. Phần thiếu là lỗi L1 (cùng gốc với whyL1).
