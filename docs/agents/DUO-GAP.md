# Học từ UX bài học kiểu Duolingo – bảng khoảng trống (21/10/2026, @claude)

Nguồn: ảnh chụp anh chủ gửi (giao diện tiếng Việt, học tiếng Đức). Chỉ học **mẫu tương tác**; không chép tài sản, tên, câu chữ của Duolingo. Linh vật chỉ dùng Kit (`web/js/kit.js`).
Phạm vi của thẻ này **không trùng** kế hoạch UI/UX GĐ1–GĐ3 của Antigravity (CBT highlighter, vuốt thẻ, Kit theo ngữ cảnh, UI đóng băng chuỗi, Sfx, flame, shimmer).

| # | Mẫu | Đã có (ở đâu) | Còn thiếu → trạng thái |
|---|---|---|---|
| 1 | Chuỗi đúng liền + "hoàn hảo" trên thanh tiến độ | Thanh tiến độ `head()` trong `study.js`; bộ đếm ✅ đúng | **Đã làm (a):** chip 🔥 "N đúng liền" phía trên thanh, ✨ Hoàn hảo khi chưa sai, thanh tiến độ gradient phát sáng (teal → vàng cam; hoàn hảo: cam → vàng) – `lesson-fx.js` `decorate()` |
| 2 | Độ khó thích ứng | `placement.js` (đầu vào thích ứng), lộ trình ngày DỄ → KHÓ (`path-day.js`), ngày đầu chỉ nhận diện | **Đã làm (f):** 8 câu đúng liền → màn mời có Kit (cheer); đồng ý → câu còn lại gõ thay vì chọn, bỏ gợi ý chữ đầu/độ dài, nhãn "Câu khó · +6 XP" (thay +3). Không áp cho bài Kiểm tra (giữ ý nghĩa điểm). |
| 3 | Chấp nhận lỗi chính tả nhỏ | `UI.similarity` (Levenshtein, `ui.js`); câu gõ gần đúng ≥ 80% → cho thử lại 1 lần | **Đã làm (b):** ≤ 1 sửa/từ ≥ 4 chữ cái → vẫn đúng, giữ chuỗi, bảng phản hồi gạch chân từ cần sửa. Không áp cho: bài chính tả (`type-spell`), điền từ đã chia khác từ gốc, từ ngữ pháp người học phải tự tạo (không có trong đề – `grammar.js` drill), gõ thành 1 từ có thật khác. Test: `unit.mjs` + `learn-flow.mjs` |
| 4 | Nhiều dạng bài trong 1 lượt ngắn | Nghe & chép + nút 🐢 chậm, ghép thẻ (chữ ↔ nghĩa), trắc nghiệm 2 chiều, điền từ, luyện phát âm (mic), bài Kiểm tra trộn 5 dạng | **Đã làm (e):** "🔇 Tắt âm thanh 15 phút" (câu nghe đổi sang gõ nghĩa, dải thông báo + Bật lại) và "🎙️ Tắt micro 15 phút" (bài nói → trắc nghiệm nghĩa, vẫn tính bước nói). **Còn thiếu:** dịch câu bằng ô chữ + phương án nhiễu; ghép cặp âm thanh ↔ nghĩa; nghe & điền bằng ngân hàng từ. |
| 5 | Bảng phản hồi sau mỗi câu | `.sheet` đúng/sai (study.js), nghe lại, dịch câu ví dụ; nút ⚑ báo lỗi toàn cục (`report-pill.js`) | **Đã làm (c):** nút 💡 Giải thích khi sai/sai chính tả – mở khối "Hiểu sâu" (`js/notes/*.json` + `wordcard.js`), **ẩn nếu từ không có ghi chú**. Ngữ pháp drill đã hiện lời giải sẵn. **Còn thiếu:** báo lỗi theo từng câu ngay trong bảng. |
| 6 | Màn cuối lượt | Kit theo điểm, vòng %, XP, từ cần ôn, `path-reward.js` (bước tiếp theo, chuỗi ngày), `share-card.js` | **Đã làm (d):** 3 thẻ số liệu (Tổng XP · Chuỗi dài nhất · Thời gian), lời chào theo độ chính xác (100 / ≥ 80 / ≥ 50 / < 50 %), nút 📤 Khoe kết quả → `ShareCard.open(%)` sẵn có |

Ghi chú thêm: đuôi thanh tiến độ trong `style.css` dùng emoji 🦉 (gợi linh vật của app khác) → đổi sang 🪁 (diều – Lexkite).
Chưa áp cho Học thông minh (`runLearn`) và Ghép thẻ (`runMatch`) – các luồng này có nhịp riêng; nếu cần thì gọi `LessonFx.combo/hit/decorate` tương tự `runQuiz`.

Kỹ thuật: toàn bộ trong gói lười `lfx` (`web/js/lesson-fx.js` + `web/js/i18n/en/lfx.js`, nạp cùng route `#/practice` và `#/grammar`) → khung app gần như không tăng (376 → 377 KB gz). 23 khóa mới đủ 15 ngôn ngữ (7 nhãn ngắn dịch tay trong `scripts/i18n-fixed.json`). `hi.js` vượt 160 KB gz → tạm `allowBig` như `ru.js`, gỡ khi xong GĐ 0.
