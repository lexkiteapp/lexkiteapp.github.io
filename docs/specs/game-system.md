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
| Chuyển động | `st-pop/burst/fade`; `style.css` tắt MỌI animation/transition khi reduced-motion | (4 file "không guard" của kiểm kê đầu là báo nhầm – đã có luật chung) | – |
| Thẻ nói 30 s | `#/score` | không XP, không streak | – |

## Các phần (mỗi phần 1 PR, base main mới nhất)
1. **Luật thưởng một nguồn** ✅ PR này: `Game.xpFor` + chống cày `src` + vectors `rewards.json` + Swift/Kotlin `RewardRules`; ratchet `reward-rules.mjs` (danh sách chờ: app.js, path-day.js, lesson/ui.js – đang bị #1840/#1830/#1814 giữ).
2. **Một định nghĩa "ngày học" + bỏ chữ ép** ✅ PR #2: ngày học = có XP hoặc ôn thẻ (đúng `activeDays`) – trợ giúp chuỗi nói đúng câu đó; thẻ nói 30 s cho XP (`talk`, src `score30`) nên tính chuỗi; giải tuần "Nguy cơ" → "Cần thêm XP", "hãy cố gắng hơn" → "Tuần mới, khởi đầu mới – học đều mỗi ngày là đủ"; gợi ý câu khó "để nhận thêm XP" → "để nhớ lâu hơn". Chờ app.js gộp xong (#1840/#1814/#1713/#1769): "Chấp nhận bắt đầu lại" → "Bắt đầu chuỗi mới", cứu chuỗi luôn có đường miễn phí.
3. **Bộ UI game Stitch** (`web/js/st/game-kit.js`, lười): thanh tiến độ, chip combo, dải đúng/sai, màn hoàn thành, hoạt ảnh nhận thưởng; ref Stitch sáng + tối từ "Lexkite Kit", port trung thành, cổng font/màu + contrast + frame-consistency. Native: SwiftUI/Compose cùng token.
   - **P3a màn hoàn thành ✅ PR này**: `web/cpack/game/game-end.js` (`GameEnd.show(view, o)`, gói lười `gend`) trên khung Stitch `lesson-complete` thật (cùng khung bài học/Tây Ban Nha) – áp vào blitz, nhịp, ghép thẻ, nói từ; ô số chỉ số thật, chấm tuần/chuỗi = `Game.weekDots/runOf` (chuyển từ lesson/engine.js – một luật), khe `.celebrate` giữ path-reward, nút Thách đấu = `#lsnShare`. Chưa áp: màn có vectors native (sayit, paraphrase, grammar/listen/read) – đổi thì sinh lại vectors + Swift/Kotlin. Test `game-end.mjs`.
4. **Một engine âm/rung**: `tone()` là dự phòng có chủ đích khi mp3 chưa giải mã (không phải engine thứ 2); còn lại: rung trong lesson/ui.js qua `Sfx.haptic` (chờ #1830), máy nhịp của game nhịp giữ AudioContext riêng (cần chính xác thời gian).
   - **✅ PR P4**: một công tắc tiếng `Sfx.muted` (game.js) cho feel.js + teacher-bubble.js; tiếng pop bong bóng qua `Sfx.bubble` (feel.js phát từ bộ đệm mp3, chưa giải mã → HTMLAudio); rung lesson/ui.js đã qua `Sfx.haptic`. Máy gác: haptics.mjs (không `new Audio`/`settings.sfx` riêng trong feel/teacher-bubble).
5. **Áp vào mọi dạng bài + mini-game** và thêm 3 game còn thiếu (ô chữ → ghép tranh → cờ câu đố) theo `play-community-1211.md`, mỗi game nạp lười < 30 KB.
   - **P5a 🧩 Ô chữ mỗi ngày ✅ PR này**: `#/practice/crossword` (gói lười `pxw`): lưới 9×9 dựng từ từ của người học (đến hạn → yếu → sổ từ; cùng ngày cùng lưới, `xw-core.js` thuần), gợi ý = nghĩa + câu ví dụ che từ, bàn chữ 12 phím + bàn phím thật, gợi ý chữ / bỏ qua; SRS chỉ thẻ đến hạn (Good / Hard có gợi ý / Again bỏ qua + sổ lỗi); kết quả GameEnd + lưới chia sẻ 🟩🟨⬜. Khung Stitch `game-crossword` (key1 2a7b46a4…, sáng 'bright', tối = dark-from-light). Test `play-crossword.mjs`.
   - **P5b 🖼️ Ghép tranh ✅ PR này**: `#/practice/picmatch` (gói lười `ppm`): 6 ảnh minh họa theo nghĩa (kho `VImg.quizUrl`, chỉ từ CÓ ảnh) ↔ 6 từ, chạm ảnh rồi chạm từ; sai → ✕ + sổ lỗi, đúng → ✓ + đọc to; thẻ đến hạn: Good (không sai/gợi ý) / Hard; gợi ý + trộn từ; XP = `Game.xpFor('game')`; kết quả `GameEnd`. Khung Stitch `game-picmatch` (key1, sáng 'bright' + tối dark-from-light), CSS ~8 KB gz, khung nằm `web/cpack/game/game-picmatch.js` (bind `out`). Ảnh còn mở dần (`vocab_img_pct`) → chưa có cờ ảnh: toast + về Luyện tập. Test `play-picmatch.mjs`.
   - **P5c ♟️ Cờ câu đố ✅**: `#/practice/chess` (gói lười `pch`, ~24 KB cpack): 5 thế chiếu hết 1 nước/ván (kho `chess-puzzles.js`, luật `chess-core.js` kiểm mọi nước hợp lệ – đúng = nước chiếu hết bất kỳ), mỗi thế dạy 1 thuật ngữ cờ tiếng Anh (hiện + đọc to sau khi giải); chạm quân → ô đi được, sai → ✕, Gợi ý 2 bước, Thế khác; XP `Game.xpFor('game')`; kết quả = GameEnd. Khung Stitch game-chess (bản gốc Tactile Night; bản sáng đổi token, mục 'bright' còn trong queue).

## Luật không đổi
Không tim/năng lượng; không đếm ngược ép; không khoá sau quảng cáo; nhắc ≤ 1/ngày, giờ yên 22–08, backoff 3 (notifications.md); i18n 15 ngôn ngữ; khung app ≤ 374 KB gz (phần game lười); không cắt tính năng/test/ngưỡng.

## Đo (sau 14 ngày mỗi phần)
XP/phút theo dạng bài lệch ≤ 2× (trước: ghép thẻ 60 s ≈ 20 XP vs bài 5 phút ≈ 35); tỉ lệ làm lại cùng bài > 4 lần/ngày giảm; D7 không giảm; số lượt nói/viết tăng.
