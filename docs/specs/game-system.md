# Spec: Hệ thống game hoá chung (game-system) – 22/11/2026

> TL;DR: MỘT luật thưởng (`Game.xpFor`, GAME-FEEL §6) + MỘT bộ thành phần UI game (Stitch Kit) + MỘT engine âm/rung cho mọi dạng bài, mini-game, add-on, iOS/Android. Thưởng gắn kết quả học (đúng, tự tạo, nói đạt ngưỡng), không ép, không dark pattern.
> Đọc khi: sửa XP/chuỗi/giải/huy hiệu/combo/màn hoàn thành/mini-game. Chi tiết game: `play-learn.md`, âm/chuyển động: `../GAME-FEEL.md`, nhắc: `notifications.md`.

## Kiểm kê 22/11 (đọc code)
| Mảng | Có | Lệch / mâu thuẫn | Áp lực |
|---|---|---|---|
| XP | 76 chỗ gọi `App.reward` | mỗi màn một công thức (10+2r / 10+3r / 15+4s / 5+2r…), ghép thẻ thưởng TỐC ĐỘ, native chép cứng hằng số | – |
| Chuỗi ngày | `activeDays` (có XP hoặc ôn thẻ), freeze +1/7 ngày (≤ 2), `.st-fl` | trợ giúp ghi "≥ 1 bài", mục tiêu ngày = N lượt ôn, quest `xp100` → 3 định nghĩa "ngày tốt" | "Chấp nhận bắt đầu lại", cứu chuỗi bằng video quảng cáo (native) |
| Giải tuần | D1 thật, top 7 lên / 5 xuống (> 12 người), server ≤ 3 XP/phút | copy "30 người" khi nhóm nhỏ hơn | chip "Nguy cơ", "hãy cố gắng hơn" |
| Mini-game | blitz, nhịp, ghép thẻ, nói từ | nhịp tự phát âm ngoài `Sfx.answer`; chưa có ô chữ/ghép tranh/cờ | – |
| Âm/rung | `Sfx.*`, gói mp3 −16 LUFS | 2 engine (mp3 + tone), `lesson/ui.js` rung bỏ qua công tắc, `teacher-bubble` pop ngoài Sfx | – |
| Chuyển động | `st-pop/burst/fade` | exam.css, wordcard.css, st-v2-onb-ready.css, st-v2-today-rail.css không guard reduced-motion | – |
| Thẻ nói 30 s | `#/score` | không XP, không streak | – |

## Các phần (mỗi phần 1 PR, base main mới nhất)
1. **Luật thưởng một nguồn** ✅ PR này: `Game.xpFor` + chống cày `src` + vectors `rewards.json` + Swift/Kotlin `RewardRules`; ratchet `reward-rules.mjs` (danh sách chờ: app.js, path-day.js, lesson/ui.js – đang bị #1840/#1830/#1814 giữ).
2. **Một định nghĩa "ngày học"**: chuỗi = ngày có ≥ 1 bước học thật (XP > 0 từ `set/answer/say/talk/card`, không tính `step`); trợ giúp + mục tiêu ngày + quest nói cùng một câu; thẻ nói 30 s được tính. Bỏ chữ ép (“Chấp nhận bắt đầu lại” → “Bắt đầu chuỗi mới”, "Nguy cơ" → "Cần thêm {n} XP để giữ hạng"); cứu chuỗi luôn có đường miễn phí.
3. **Bộ UI game Stitch** (`web/js/st/game-kit.js`, lười): thanh tiến độ, chip combo, dải đúng/sai, màn hoàn thành, hoạt ảnh nhận thưởng; ref Stitch sáng + tối từ "Lexkite Kit", port trung thành, cổng font/màu + contrast + frame-consistency. Native: SwiftUI/Compose cùng token.
4. **Một engine âm/rung**: mọi âm qua `Sfx` (gộp `tone` làm dự phòng của `feel.js`), rung qua `Sfx.haptic` (sửa lesson/ui.js, teacher-bubble, nhịp), guard reduced-motion cho 4 file CSS.
5. **Áp vào mọi dạng bài + mini-game** và thêm 3 game còn thiếu (ô chữ → ghép tranh → cờ câu đố) theo `play-community-1211.md`, mỗi game nạp lười < 30 KB.

## Luật không đổi
Không tim/năng lượng; không đếm ngược ép; không khoá sau quảng cáo; nhắc ≤ 1/ngày, giờ yên 22–08, backoff 3 (notifications.md); i18n 15 ngôn ngữ; khung app ≤ 374 KB gz (phần game lười); không cắt tính năng/test/ngưỡng.

## Đo (sau 14 ngày mỗi phần)
XP/phút theo dạng bài lệch ≤ 2× (trước: ghép thẻ 60 s ≈ 20 XP vs bài 5 phút ≈ 35); tỉ lệ làm lại cùng bài > 4 lần/ngày giảm; D7 không giảm; số lượt nói/viết tăng.
