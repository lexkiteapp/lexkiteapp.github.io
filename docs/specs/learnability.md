# Dễ học – dễ nhớ (P0-H): nguyên lý → luật máy đo, tầng 0

Đo **sư phạm** của từng bài, khác cổng QA (độ đúng, [CONTENT-QA.md](../CONTENT-QA.md)) và `content:score` (độ phủ). Mã: `scripts/content-qa/learnability.mjs` (0 token, < 1 s) → `content/pipeline/LEARN.md` + `reports/learnability.json`; mảng "Dễ học – dễ nhớ" trong `SCORE.md`, sàn chỉ tăng (`score.budget.json` khoá `learn`). Test: `scripts/test/learnability.mjs` (job `score` của `content-qa.yml`).

Đơn vị chấm: 77 bài ngữ pháp · bài lộ trình (truyện/radio `content/lesson/stories.json`) · bộ từ (mỗi `set` của kho từ; bộ < 10 từ gộp) · kỹ năng (phần nghe, bài đọc, chủ đề nói, bài mẫu viết). Mỗi tiêu chí 0–1, không áp dụng = "–"; điểm bài = trung bình có trọng số.

| | Nguyên lý (nghiên cứu) | Luật đo (tầng 0) | Trọng số |
|---|---|---|---|
| a | Truy hồi chủ động – Roediger & Karpicke 2006 | câu tự làm / (tự làm + mục chỉ đọc) ≥ 60 %; ngữ pháp ≥ 10 trắc nghiệm + 10 tự luận; đọc ≥ 8 câu; truyện ≥ 30 % câu kiểm | 14 |
| b | Lặp lại giãn cách – Cepeda và cs. 2006 | cấu trúc của bài (máy nhận diện `GRAMMAR_CHECK`) xuất hiện lại trong ≥ 3 bài khác; từ vựng: FSRS lo (không chấm nội dung) | 10 |
| c | Tải nhận thức – Sweller 1988, Miller 1956 | ≤ 7 cách dùng/bài; giải thích ≤ 160–300 ký tự theo cấp A1→C2; ≤ 8 câu/nhóm nghe | 8 |
| d | Đầu vào i+1 – Krashen 1985, Nation 2006 (98 %) | token có cấp CEFR (kho từ) vượt cấp bài > 1 bậc ≤ 2 % = 1, ≥ 10 % = 0 | 10 |
| e | Ví dụ + đối chiếu – Atkinson 2000 | ≥ 3 câu ví dụ + ≥ 2 cặp ✗/✓; từ: collocation + đồng nghĩa; nói: câu trả lời mẫu; viết: ≥ 6 cụm chú nghĩa | 10 |
| f | Mã hoá kép – Paivio 1971, Mayer 2009 | hình (timeline/sơ đồ/bảng/ảnh theo nghĩa) + audio Kokoro dựng sẵn (`audio-index.js`) | 8 |
| g | Phản hồi cụ thể – Hattie & Timperley 2007 | mọi đáp án có "vì sao" ≥ 25 ký tự, có lý do hoặc nhắc đáp án (không chỉ "Đúng là B") | 12 |
| h | Xen kẽ – Rohrer & Taylor 2007 | câu hỏi/tự luận chứa ≥ 2 cấu trúc của bài cũ (cấp ≤) | 6 |
| i | Ngữ cảnh – Nation 2013 | ví dụ là câu ≥ 5 từ có chứa từ đang học | 6 |
| j | Đầu ra – Swain 1985 | ≥ 5 câu viết lại/ghép + nhiệm vụ TỰ DO cuối bài (tự đặt câu/nói: drill `own`/`say`/`free`/`write` hoặc khối `task`) | 8 |
| k | Mẹo nhớ – Atkinson & Raugh 1975 | từ thuộc nhóm dễ nhầm (cùng loại, khác ≤ 2 ký tự, không cùng họ/biến thể chính tả) có gold "why" + mẹo | 4 |
| l | Vừa vòng 30′/ngày (`web/js/method.js`) | ngữ pháp 6–15′ · đọc 5–20′ · nghe 4–15′ · truyện 2–6′ (ước tính theo độ dài + số câu) | 4 |

**Hàng sửa**: `node scripts/content-qa/learnability.mjs --queue` → `content/pipeline/targets.json` "Dễ học – lô" = 25 bài yếu nhất của mảng thấp nhất. Sửa theo thang tầng có sẵn (tầng 0 luật/soạn tay có nguồn → tầng 1 ai-pool → tầng 2 hai giám khảo, $0), qua cổng QA, chạy lại để thấy điểm tăng. Không hạ ngưỡng, không xoá tiêu chí (no-cuts); đổi luật đo → ghi lý do ở đây.

**Lô 1 (02/11)**: mảng thấp nhất = Bộ từ. 25 cặp dễ nhầm có thật trong 25 bộ yếu nhất (country/county, staff/stuff, adapt/adopt, altitude/attitude…) → `content/video/scripts/bank/mixups.jsonl` → `gold.js`; sửa lỗi ngầm `build-gold.mjs` bỏ sót pid `c:mixup:` (9 cặp cũ chưa từng vào nút "Giải thích"). Việc còn lại theo tiêu chí: xem `LEARN.md` § Lỗi theo tiêu chí.
