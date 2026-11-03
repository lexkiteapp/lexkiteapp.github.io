# Dễ học – dễ nhớ (P0-H): nguyên lý → luật máy đo, tầng 0

> TL;DR: thước đo sư phạm 12 tiêu chí (truy hồi chủ động, lặp giãn cách, tải nhận thức, i+1…) chấm từng bài bằng máy, 0 token; điểm gộp vào content:score mảng "Dễ học – dễ nhớ", chỉ được tăng.

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

**Lô 2 (02/11)**: hai điểm yếu sư phạm lớn nhất. (1) Ngữ pháp j = 40 → 100: dạng drill `own` (tự đặt câu thật về bản thân, `web/js/grammar/drills-own.js`, 143 câu cho 80 bài) – `grammar.js` chấm bằng mẫu nhận diện `GRAMMAR_CHECK` của bài + VBStruct, sai thì hiện công thức + gợi ý + câu mẫu. Lỗi ngầm đã sửa: 15 mẫu `GRAMMAR_CHECK` chê oan câu đúng (vd "60%" không bao giờ khớp vì `\b` sau `%`; "Everyone in my family likes…", "I usually drink…", "We are not allowed to…") – ảnh hưởng cả Thử thách tự đặt câu. (2) Bài lộ trình g = 0 → 100: mọi câu hỏi hiểu (`stories.json` q) có `why` = câu thoại làm bằng chứng + "→ đáp án", `engine.js storyItems` truyền sang, tấm phản hồi (v1 + Stitch v2) hiện ở khối "Vì sao?". Kết quả: ngữ pháp 91,6 → 96,5 · lộ trình 78,3 → 95,4 · tổng 84,3 → 89,8. Đánh đổi có chủ ý: l ngữ pháp 84,5 → ~77 (mỗi bài thêm ~1,4′ đầu ra tự do) – bù bằng việc tách bài dài (> 15′) ở lô sau, không bỏ đầu ra. Test: `scripts/test/learnability.mjs` mục 6–7. Sau khi gộp main (chương nền A1 starter + 3 bộ từ xw-*): thêm `own` cho 3 bài starter, 2 câu viết lại cho prepositions-time-place-basic, sửa 10 lời giải quá ngắn, bước xếp câu (tap) cho 2 bài radio (j lộ trình 60 → 100) → ngữ pháp 96,4 · lộ trình 100 · tổng 90,7 (sàn 90,7). Bộ từ xw-* mới (e/f/k thấp) để lô bộ từ.
