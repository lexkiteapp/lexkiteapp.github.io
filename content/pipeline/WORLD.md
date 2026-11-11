# Bảng World – Lexkite vs Duolingo (tự sinh – `node scripts/world-scorecard.mjs --write`, đừng sửa tay)

Cách đo, nguồn, luật sàn: `docs/WORLD-SCORECARD.md` · trục & mốc Duolingo: `content/pipeline/world.axes.json` · sàn chỉ tăng: `content/pipeline/world.budget.json`.

**Tổng Lexkite: 72.5 / 100** (mọi trục đo được) · **Trên 10 trục chung: Lexkite 75.2 vs Duolingo 29.9**

- Lõi (5 trục chung): Lexkite 88.3 vs Duolingo 63
- Lợi thế khác biệt (5 trục chung): Lexkite 65.4 vs Duolingo 5

| Trục | Nhóm | Lexkite | Duolingo | Mục tiêu | Khoảng cách | Sàn | Đo |
|---|---|---|---|---|---|---|---|
| Độ phủ nội dung (content:score) | lõi | **66** | – | 90 | 24 | 47.3 | content/pipeline/SCORE.md |
| Dễ học – dễ nhớ (learnability, LEARN.md) | lõi | **91.6** | – | 90 | -1.6 | – | content/pipeline/LEARN.md |
| Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | lõi | **77.8** | – | 100 | 22.2 | – | 5.7 s · 9 chạm (probe 2026-11-11) |
| Số chạm từ /app/ tới bài hôm nay (người quay lại) | lõi | **50** | – | 100 | 50 | – | 2 chạm |
| Vòng thói quen: chuỗi · nhắc học · mục tiêu ngày · đóng băng chuỗi | lõi | **100** | 100 | 100 | 0 | 100 | ✓chuỗi ✓đóng băng ✓mục tiêu ngày ✓nhắc học |
| Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | lõi | **53.3** | 50* | 100 | 46.7 | 53.3 | ✓ FSRS theo người · lỗi L1 1/15 ngôn ngữ |
| Học khi mất mạng (SW shell · điều hướng dự phòng · gói từ offline) | lõi | **100** | 33* | 100 | 0 | 100 | ✓shell ✓điều hướng dự phòng ✓gói từ offline |
| Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | lõi | **10.9** | – | 100 | 89.1 | 10.7 | 365.9 / 374.0 KB gz (đích 300) |
| Tốc độ trang chủ di động (Lighthouse performance) | lõi | **95** | 35 | 98 | 3 | 97 | trang chủ di động: LCP 2.5 s, CLS 0.014, TBT 0 ms (2026-11-11) |
| Truy cập (Lighthouse accessibility trang chủ + app) | lõi | **99** | 82 | 100 | 1 | 99 | Lighthouse trang chủ + /app/ (axe/a11y tĩnh chạy trong npm test) |
| Màn theo Lexkite Kit/Stitch (stitch-coverage) | lõi | **24.6** | – | 100 | 75.4 | 22.1 | 17 Stitch / 69 màn (ref 49, tay 0) |
| Chất lượng 15 ngôn ngữ giao diện (i18n-qa --strict) | lõi | **100** | – | 100 | 0 | 100 | 0 lỗi, 14 ngôn ngữ ngoài vi |
| Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | lõi | **66.7** | – | 100 | 33.3 | – | ✓npm-test ✓visual-qa ∅new-ui-qa ✗mobile-qa ✓journey-e2e ✓stitch-quality-qc ✓ext-e2e ✓native-auth-e2e ✗qa-bot · mobile-qa LCP 6759 ms, CLS 0.0757, INP 160 ms |
| Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | **khác biệt** | **6.7** | 20* | 100 | 93.3 | 6.7 | 1/15 ngôn ngữ có "vì sao" (en 321; đích 200/ngôn ngữ) |
| Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | **khác biệt** | **55** | 0 | 100 | 45 | 52.5 | IELTS 10 · TOEIC 7 · TOEFL 4 · Cambridge 1 đề (đích 10/kỳ) |
| Tra từ ngay trong trình duyệt (add-on: chọn chữ → nghĩa) | **khác biệt** | **100** | 0* | 100 | 0 | 100 | ✓ chọn chữ → nghĩa · ✓ test ext-selection |
| AI trên máy miễn phí (Chrome built-in AI / Gemini Nano, không gửi dữ liệu) | **khác biệt** | **100** | 0 | 100 | 0 | 100 | 7/7 API trình duyệt · ✓ plugin app gốc (Gemini Nano / Foundation Models) |
| Không tim/không năng lượng – không chặn học | **khác biệt** | **100** | 0 | 100 | 0 | 100 | 0 cổng tim/năng lượng trong web/js |

\* ghi tay, nguồn thứ cấp/mâu thuẫn – kiểm lại khi có nguồn chính thức.

## Lợi thế phải thắng rõ (Lexkite − Duolingo ≥ 30)

| Trục | Lexkite | Duolingo | Thắng? | Nguồn Duolingo (kiểm 2026-11-02) |
|---|---|---|---|---|
| Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 6.7 | 20 | ❌ chưa | Explain My Answer: chỉ một số cặp khoá (nguồn mâu thuẫn), không phải 15 tiếng mẹ đẻ cho người học tiếng Anh – https://www.streetinsider.com/Investing/Duolingo+makes+Explain+My+Answer+feature+free+for+all+users/25788462.html |
| Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 55 | 0 | ✅ thắng | không luyện các kỳ này; có kỳ thi riêng Duolingo English Test – https://englishtest.duolingo.com/ |
| Tra từ ngay trong trình duyệt (add-on: chọn chữ → nghĩa) | 100 | 0 | ✅ thắng | chưa thấy add-on tra từ chính thức (kiểm tay lại Chrome Web Store) |
| AI trên máy miễn phí (Chrome built-in AI / Gemini Nano, không gửi dữ liệu) | 100 | 0 | ✅ thắng | AI = GPT-4 trên đám mây, gói Max trả phí – https://www.engadget.com/duolingos-max-plan-offers-ai-tutoring-for-30-per-month-203625446.html |
| Không tim/không năng lượng – không chặn học | 100 | 0 | ✅ thắng | Energy (7/2025) chặn người dùng miễn phí khi cạn – https://blog.duolingo.com/duolingo-energy/ |

## Top 10 khoảng cách theo tác động ÷ chi phí

| # | Trục | Lexkite → mục tiêu | Tác động | Chi phí | Ưu tiên | Hiện trạng |
|---|---|---|---|---|---|---|
| 1 | Giải thích "vì sao" + lỗi theo tiếng mẹ đẻ (15 ngôn ngữ) | 6.7 → 100 | 5 | 3 | 155.5 | 1/15 ngôn ngữ có "vì sao" (en 321; đích 200/ngôn ngữ) |
| 2 | Số chạm từ /app/ tới bài hôm nay (người quay lại) | 50 → 100 | 4 | 2 | 100 | 2 chạm |
| 3 | Cỡ tải khung app (KB gz; 100 khi ≤ 300, 0 ở trần 374) | 10.9 → 100 | 3 | 3 | 89.1 | 365.9 / 374.0 KB gz (đích 300) |
| 4 | Cá nhân hoá: SRS theo người (FSRS) + lỗi theo tiếng mẹ đẻ | 53.3 → 100 | 5 | 3 | 77.8 | ✓ FSRS theo người · lỗi L1 1/15 ngôn ngữ |
| 5 | Cổng QA máy xanh trên main (visual-qa, new-ui-qa, mobile-qa, journey-e2e, npm test) | 66.7 → 100 | 4 | 2 | 66.6 | ✓npm-test ✓visual-qa ∅new-ui-qa ✗mobile-qa ✓journey-e2e ✓stitch-quality-qc ✓ext-e2e ✓native-auth-e2e ✗qa-bot · mobile-qa LCP 6759 ms, CLS 0.0757, INP 160 ms |
| 6 | Màn theo Lexkite Kit/Stitch (stitch-coverage) | 24.6 → 100 | 3 | 4 | 56.6 | 17 Stitch / 69 màn (ref 49, tay 0) |
| 7 | Luyện thi thật IELTS · TOEIC · TOEFL · Cambridge (đề chạy được, mục tiêu 10/kỳ) | 55 → 100 | 5 | 4 | 56.3 | IELTS 10 · TOEIC 7 · TOEFL 4 · Cambridge 1 đề (đích 10/kỳ) |
| 8 | Tới câu đúng đầu tiên từ màn đầu (giây máy, số chạm) | 77.8 → 100 | 5 | 2 | 55.5 | 5.7 s · 9 chạm (probe 2026-11-11) |
| 9 | Độ phủ nội dung (content:score) | 66 → 90 | 5 | 4 | 30 | content/pipeline/SCORE.md |
| 10 | Tốc độ trang chủ di động (Lighthouse performance) | 95 → 98 | 4 | 2 | 6 | trang chủ di động: LCP 2.5 s, CLS 0.014, TBT 0 ms (2026-11-11) |
