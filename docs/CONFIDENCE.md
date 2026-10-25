# 🗣️ Giao tiếp tự tin (#/confidence) – kế hoạch & cách vận hành

> TL;DR: Lộ trình Giao tiếp tự tin (#/confidence) A1→B2: bài 5-8 phút, bộ công cụ tự tin, thử thách 2 phút/ngày, điểm tự tin. Tái dùng roleplay.js, UI.tts/recognize; AI có ngân sách.
> Đọc khi: sửa/nối tính năng tự tin hoặc video liên quan.

Mục tiêu: lộ trình có hướng dẫn giúp người học **dám nói** trong tình huống thật (A1 → B2), mỗi bài 5–8 phút, ít áp lực.
Tái dùng, không viết trùng: `roleplay.js` (bộ não hội thoại Nano → /api/ai có hạn mức → kịch bản nhánh, chấm điểm), `UI.tts` / `UI.recognize`
(Web Speech + Whisper trên máy), `App.addWord` (SRS), `App.reward` (XP/chuỗi), mẫu ghi âm + từ đệm + tốc độ của `speaking.js`.

## 1. Cấu trúc
| Phần | Ở đâu |
|---|---|
| Nguồn nội dung DUY NHẤT | `content/confidence/units/<id>.json` (12 bài A1–B1), `toolkit.json`, `ui.json` (chuỗi giao diện vi→en), `daily.json` (đề nói 2 phút), `i18n/<lang>.json` (13 ngôn ngữ) |
| Dựng | `node scripts/confidence/build.mjs [--write]` → `web/js/confidence/data.js`, `web/js/i18n/en/confidence.js`, `web/js/i18n/<lang>/confidence.js`, nhãn ngắn → `scripts/i18n-fixed.json`. Không `--write` = cổng kiểm (npm test) |
| Mô-đun | `web/js/confidence.js` (tải lười, bundle `confidence` = i18n en + data + mô-đun; route kéo thêm bundle `roleplay`) |
| Khung app | +0 byte gz (đo bằng size-budget; phần thêm ở app.js/index.html được bù bằng bớt chú thích thừa) |

## 2. Lộ trình & bài học
- Cấp A1: chào hỏi/small talk, quán cà phê, mua sắm, hỏi đường · A2: du lịch (khách sạn/sân bay), khám bệnh, gọi điện, kết bạn · B1: họp, phỏng vấn, khiếu nại, nêu ý kiến · B2 (sau): đàm phán, thuyết trình, tranh luận, xử lý mâu thuẫn.
- Luồng 1 bài (6 bước, thanh tiến độ, luôn có "Bỏ qua"): 1) nghe hội thoại mẫu (chậm 0,75× / bình thường) · 2) gói 7 cụm câu, mỗi cụm có cặp "nói thế này thay vì thế kia" + vì sao · 3) nói theo (shadowing) + phản hồi phát âm trên máy (so khớp từng từ, điểm %) · 4) điền chỗ trống bằng giọng nói · 5) roleplay ngắn qua `RP.chat` của roleplay.js (gợi ý + nút "Giúp tôi nói") · 6) tổng kết, lưu cụm vào SRS, +XP.
- Bài mở khoá theo thứ tự trong cấp; mọi cấp xem trước được (không khoá cứng – giảm áp lực).

## 3. Bộ công cụ tự tin (#/confidence/toolkit)
5 nhóm, dạy tường minh: sửa hiểu lầm (nhờ nhắc lại, hỏi nghĩa) · từ đệm & câu giờ · mở/kết small talk · phản đối lịch sự · "không biết từ đó" (mô tả, so sánh, công dụng).

## 4. Thử thách 2 phút mỗi ngày + điểm tự tin (#/confidence/daily)
- Đề luân phiên theo ngày (`daily.json`), đồng hồ 2 phút, ghi âm bằng MediaRecorder – **âm thanh chỉ ở bộ nhớ trình duyệt, không tải lên, không lưu**. Chữ chuyển từ giọng nói: trình nhận dạng của trình duyệt (hoặc Whisper trên máy nếu bật).
- Đo trên máy: tốc độ (từ/phút), số lần ngập ngừng > 1,2 s (năng lượng âm thanh, Web Audio), từ đệm, số cụm câu đã học được dùng, tự chấm 1–5.
- Điểm tự tin 0–100 = 35 % lưu loát (tốc độ + ngập ngừng) + 25 % cụm câu + 40 % tự chấm; lịch sử 30 lần ở `localStorage` (`vb.conf`), không gửi máy chủ (0 dòng D1). Kỷ lục mới / chuỗi 3 ngày → Kit chúc mừng.

## 5. AI & ngân sách
Thứ tự $0 của roleplay giữ nguyên: Gemini Nano → `/api/ai` (kind `rp`, hạn mức khách 2/ngày) → kịch bản nhánh. Không có endpoint/bảng mới; mất mạng → kịch bản + chấm trên máy. Thử thách ngày không gọi AI.

## 6. Mã ổn định cho video
- Bài: `cf:<unit>` · cụm: `cf:<unit>:<phrase>` · công cụ: `cf:tk:<nhóm>:<phrase>`. Link sâu: `https://lexkite.com/app/#/confidence/<unit>#<phrase>` (cuộn tới + làm nổi cụm).
- `scripts/scriptbank/lib.mjs` lấy điểm từ `content/confidence` (loại `situational` = cụm tình huống, `stop-saying` = "say this instead"), `facts.link` = link sâu. `content/video/ecosystem.json` có khu vực `confidence`.
- Không đổi id đã phát hành (cổng build kiểm id trùng/định dạng; đổi chữ được, đổi id = link video chết).

## 7. Lối vào
Thẻ trang chủ · menu Kỹ năng (Learn) · cuối roleplay (bài tương ứng) · tab mới add-on (chỉ link).

## 8. QA
- `node scripts/confidence/build.mjs` (cổng nội dung: id, 6–8 cụm, cặp say/not khác nhau, gap có trong câu, hướng dẫn tiếng Anh ≤ B1 theo NGSL, đủ 15 ngôn ngữ, giữ biến).
- `node scripts/test/confidence.mjs` (jsdom, app thật): route, deep link, đi hết luồng 1 bài, SRS + XP, offline (kịch bản), i18n-leak (es/ja/ar không chữ Việt), a11y (nhãn nút, vùng chạm 44 px), mobile (không bề rộng cố định), +0 khung.
- Ảnh trước/sau: `scripts/test/confidence-shots.mjs` trên CI (`confidence-shots.yml`) → `out/confidence/`.

## 9. Việc sau
B2 (4 bài) · video "situational phrase"/"say this instead" kéo từ script bank · đồng bộ điểm tự tin qua tài khoản (khi D1 dư).
