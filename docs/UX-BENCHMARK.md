# UX benchmark – Lexkite vs Duolingo (đo bằng máy)

> TL;DR: So sánh với Duolingo nay là SỐ ĐO trên CI (bảng World, `WORLD-SCORECARD.md` → `content/pipeline/WORLD.md`). File này giữ bảng Top 10 khoảng cách tự sinh và việc nên làm cho từng mục. Bản so sánh bằng lời 25/10 (scorecard theo luồng, UX v3, UX1) nằm ở `archive/UX-BENCHMARK-2026-10.md`.
> Đọc khi: chọn việc UX/sản phẩm tiếp theo; sau mỗi lượt world-scorecard.yml.

Luật giữ nguyên: chất lượng chỉ tăng, không bỏ tính năng/nội dung để "gọn" (no-cuts). Lịch sử so sánh UX trước đây: [archive/UX-BENCHMARK-2026-10.md](archive/UX-BENCHMARK-2026-10.md). Kiểm hình đang dùng: `ux-shots.yml`, `ux-cards.yml`, visual-qa, new-ui-qa, journey-e2e (`QUALITY-SWEEP.md`).

## Top 10 khoảng cách theo tác động ÷ chi phí (tự sinh, đừng sửa tay)
<!-- auto:world-gaps:start -->
_Tự sinh từ `content/pipeline/WORLD.md` (2026-11-23)._

| # | Trục | Lexkite → mục tiêu | Tác động | Chi phí | Ưu tiên | Hiện trạng |
|---|---|---|---|---|---|---|
| 1 | Số chạm từ /app/ tới bài hôm nay (người quay lại) | 0 → 100 | 4 | 2 | 200 | probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/home |
| 2 | Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | 33.3 → 100 | 4 | 2 | 133.4 | ✓npm-test ✗visual-qa ∅new-ui-qa ✗mobile-qa ✓journey-e2e ✓stitch-quality-qc ✗ext-e2e ✗native-auth-e2e ✗qa-bot · mobile-qa LCP 6532 ms, CLS 0.0025, INP 104 ms |
| 3 | Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 25.2 → 100 | 5 | 3 | 124.7 | 1/15 ngôn ngữ đạt đích; có "vì sao" (en 521, ar 7, de 11, es 12, fr 11, hi 193, id 85, ja 8, ko 7, pt 10, ru 8, th 9, tr 7, vi 179, zh 9; đích 200/ngôn ngữ) |
| 4 | Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | 15.7 → 100 | 3 | 3 | 84.3 | 362.4 / 374.0 KB gz (đích 300) |
| 5 | Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | 60 → 100 | 5 | 3 | 66.7 | ✓ FSRS theo người · lỗi L1 3/15 ngôn ngữ (≥100 mục) |
| 6 | Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | 77.8 → 100 | 5 | 2 | 55.5 | 5.9 s · 9 chạm (probe 2026-11-23) |
| 7 | Màn theo Lexkite Kit/Stitch (stitch-coverage) | 31.4 → 100 | 3 | 4 | 51.5 | 22 Stitch / 70 màn (ref 45, tay 0) |
| 8 | Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 77.5 → 100 | 5 | 4 | 28.1 | IELTS 10 · TOEIC 10 · TOEFL 11 · Cambridge 1 đề (đích 10/kỳ) |
| 9 | Độ phủ nội dung (content:score) | 78.1 → 90 | 5 | 4 | 14.9 | content/pipeline/SCORE.md |
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
