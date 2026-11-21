# Bảng World – Lexkite vs Duolingo (tự sinh – `node scripts/world-scorecard.mjs --write`, đừng sửa tay)

Cách đo, nguồn, luật sàn: `docs/WORLD-SCORECARD.md` · trục & mốc Duolingo: `content/pipeline/world.axes.json` · sàn chỉ tăng: `content/pipeline/world.budget.json`.

**Tổng Lexkite: 74.3 / 100** (mọi trục đo được) · **Trên 10 trục chung: Lexkite 81.9 vs Duolingo 29.7**

- Lõi (5 trục chung): Lexkite 90.2 vs Duolingo 62.6
- Lợi thế khác biệt (5 trục chung): Lexkite 75.7 vs Duolingo 5

| Trục | Nhóm | Lexkite | Duolingo | Mục tiêu | Khoảng cách | Sàn | Đo |
|---|---|---|---|---|---|---|---|
| Độ phủ nội dung (content:score) | lõi | **76.7** | – | 90 | 13.3 | 66 | content/pipeline/SCORE.md |
| Dễ học – dễ nhớ (learnability, LEARN.md) | lõi | **91.8** | – | 90 | -1.8 | 91.6 | content/pipeline/LEARN.md |
| Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | lõi | **77.8** | – | 100 | 22.2 | 72.8 | 5.9 s · 9 chạm (probe 2026-11-20) |
| Số chạm từ /app/ tới bài hôm nay (người quay lại) | lõi | **0** | – | 100 | 100 | 50 | probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/day/1 |
| Vòng thói quen: chuỗi · nhắc học · mục tiêu ngày · đóng băng chuỗi | lõi | **100** | 100 | 100 | 0 | 100 | ✓chuỗi ✓đóng băng ✓mục tiêu ngày ✓nhắc học |
| Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | lõi | **60** | 50* | 100 | 40 | 53.3 | ✓ FSRS theo người · lỗi L1 3/15 ngôn ngữ (≥100 mục) |
| Học khi mất mạng (SW shell · điều hướng dự phòng · gói từ offline) | lõi | **100** | 33* | 100 | 0 | 100 | ✓shell ✓điều hướng dự phòng ✓gói từ offline |
| Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | lõi | **23** | – | 100 | 77 | 10.7 | 357.0 / 374.0 KB gz (đích 300) |
| Tốc độ trang chủ di động (Lighthouse performance) | lõi | **97** | 33 | 98 | 1 | 97 | trang chủ di động: LCP 2.1 s, CLS 0.048, TBT 30 ms (2026-11-20) |
| Truy cập (Lighthouse accessibility trang chủ + app) | lõi | **99** | 82 | 100 | 1 | 99 | Lighthouse trang chủ + /app/ (axe/a11y tĩnh chạy trong npm test) |
| Màn theo Lexkite Kit/Stitch (stitch-coverage) | lõi | **31.4** | – | 100 | 68.6 | 24.6 | 22 Stitch / 70 màn (ref 45, tay 0) |
| Chất lượng 15 ngôn ngữ giao diện (i18n-qa --strict) | lõi | **100** | – | 100 | 0 | 100 | 0 lỗi, 14 ngôn ngữ ngoài vi |
| Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | lõi | **55.6** | – | 100 | 44.4 | 68.9 | ✓npm-test ✗visual-qa ∅new-ui-qa ✓mobile-qa ✓journey-e2e ✓stitch-quality-qc ✗ext-e2e ✓native-auth-e2e ∅qa-bot · mobile-qa LCP 6820 ms, CLS 0.0112, INP 96 ms |
| Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | **khác biệt** | **25.2** | 20* | 100 | 74.8 | 6.7 | 1/15 ngôn ngữ đạt đích; có "vì sao" (en 521, ar 7, de 11, es 12, fr 11, hi 193, id 85, ja 8, ko 7, pt 10, ru 8, th 9, tr 7, vi 179, zh 9; đích 200/ngôn ngữ) |
| Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | **khác biệt** | **77.5** | 0 | 100 | 22.5 | 55 | IELTS 10 · TOEIC 10 · TOEFL 11 · Cambridge 1 đề (đích 10/kỳ) |
| Tra từ ngay trong trình duyệt (add-on: chọn chữ → nghĩa) | **khác biệt** | **100** | 0* | 100 | 0 | 100 | ✓ chọn chữ → nghĩa · ✓ test ext-selection |
| AI trên máy miễn phí (Chrome built-in AI / Gemini Nano, không gửi dữ liệu) | **khác biệt** | **100** | 0 | 100 | 0 | 100 | 7/7 API trình duyệt · ✓ plugin app gốc (Gemini Nano / Foundation Models) |
| Không tim/không năng lượng – không chặn học | **khác biệt** | **100** | 0 | 100 | 0 | 100 | 0 cổng tim/năng lượng trong web/js |

\* ghi tay, nguồn thứ cấp/mâu thuẫn – kiểm lại khi có nguồn chính thức.

## Lợi thế phải thắng rõ (Lexkite − Duolingo ≥ 30)

| Trục | Lexkite | Duolingo | Thắng? | Nguồn Duolingo (kiểm 2026-11-02) |
|---|---|---|---|---|
| Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 25.2 | 20 | ❌ chưa | Explain My Answer: chỉ một số cặp khoá (nguồn mâu thuẫn), không phải 15 tiếng mẹ đẻ cho người học tiếng Anh – https://www.streetinsider.com/Investing/Duolingo+makes+Explain+My+Answer+feature+free+for+all+users/25788462.html |
| Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 77.5 | 0 | ✅ thắng | không luyện các kỳ này; có kỳ thi riêng Duolingo English Test – https://englishtest.duolingo.com/ |
| Tra từ ngay trong trình duyệt (add-on: chọn chữ → nghĩa) | 100 | 0 | ✅ thắng | chưa thấy add-on tra từ chính thức (kiểm tay lại Chrome Web Store) |
| AI trên máy miễn phí (Chrome built-in AI / Gemini Nano, không gửi dữ liệu) | 100 | 0 | ✅ thắng | AI = GPT-4 trên đám mây, gói Max trả phí – https://www.engadget.com/duolingos-max-plan-offers-ai-tutoring-for-30-per-month-203625446.html |
| Không tim/không năng lượng – không chặn học | 100 | 0 | ✅ thắng | Energy (7/2025) chặn người dùng miễn phí khi cạn – https://blog.duolingo.com/duolingo-energy/ |

## Top 10 khoảng cách theo tác động ÷ chi phí

| # | Trục | Lexkite → mục tiêu | Tác động | Chi phí | Ưu tiên | Hiện trạng |
|---|---|---|---|---|---|---|
| 1 | Số chạm từ /app/ tới bài hôm nay (người quay lại) | 0 → 100 | 4 | 2 | 200 | probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/day/1 |
| 2 | Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 25.2 → 100 | 5 | 3 | 124.7 | 1/15 ngôn ngữ đạt đích; có "vì sao" (en 521, ar 7, de 11, es 12, fr 11, hi 193, id 85, ja 8, ko 7, pt 10, ru 8, th 9, tr 7, vi 179, zh 9; đích 200/ngôn ngữ) |
| 3 | Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | 55.6 → 100 | 4 | 2 | 88.8 | ✓npm-test ✗visual-qa ∅new-ui-qa ✓mobile-qa ✓journey-e2e ✓stitch-quality-qc ✗ext-e2e ✓native-auth-e2e ∅qa-bot · mobile-qa LCP 6820 ms, CLS 0.0112, INP 96 ms |
| 4 | Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | 23 → 100 | 3 | 3 | 77 | 357.0 / 374.0 KB gz (đích 300) |
| 5 | Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | 60 → 100 | 5 | 3 | 66.7 | ✓ FSRS theo người · lỗi L1 3/15 ngôn ngữ (≥100 mục) |
| 6 | Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | 77.8 → 100 | 5 | 2 | 55.5 | 5.9 s · 9 chạm (probe 2026-11-20) |
| 7 | Màn theo Lexkite Kit/Stitch (stitch-coverage) | 31.4 → 100 | 3 | 4 | 51.5 | 22 Stitch / 70 màn (ref 45, tay 0) |
| 8 | Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 77.5 → 100 | 5 | 4 | 28.1 | IELTS 10 · TOEIC 10 · TOEFL 11 · Cambridge 1 đề (đích 10/kỳ) |
| 9 | Độ phủ nội dung (content:score) | 76.7 → 90 | 5 | 4 | 16.6 | content/pipeline/SCORE.md |
| 10 | Truy cập (Lighthouse accessibility trang chủ + app) | 99 → 100 | 3 | 1 | 3 | Lighthouse trang chủ + /app/ (axe/a11y tĩnh chạy trong npm test) |
