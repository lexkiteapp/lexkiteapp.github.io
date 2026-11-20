# Spec: Vừa chơi vừa học (play-learn) – 3/11/2026

> TL;DR: Lớp phản hồi (âm −16 LUFS, rung, ăn mừng nhẹ) bật mặc định + mini-game học thật trên dữ liệu SRS + thách đấu bạn bè. Mốc 1 = Thử thách 60 giây (ôn thẻ đến hạn) + link thách đấu. Không tim/mạng, không ép.
> Đọc khi: thêm mini-game, âm thanh/rung/hiệu ứng phản hồi, vòng thưởng. Chi tiết âm/chuyển động: `docs/GAME-FEEL.md`.

## Mục tiêu
Chủ app 3/11: "chơi đa dạng, cuốn, thách đấu bạn bè, UI/UX + âm thanh + hiệu ứng đẹp, nhiều kiến thức, dễ học dễ nhớ". Học viên muốn mở app vì vui, nhưng **mỗi lượt chơi là một lượt ôn SRS thật** (FSRS chấm, không đụng thuật toán). Hơn Duolingo/Quizlet ở chỗ: không mất "tim", không khóa sau quảng cáo, 100 % free, nhẹ trên máy yếu.

## Benchmark 2026 (lấy cái hay, bỏ cái ép)
| App | Lấy | Bỏ |
|---|---|---|
| Duolingo | XP, combo "x in a row", nhiệm vụ ngày/tuần, rương mốc, giải tuần, âm đúng/sai đặc trưng | tim/mạng, đếm ngược ép mua, thông báo gây tội lỗi |
| Quizlet | Match tính giờ, kỷ lục cá nhân, Blast arcade | trò không nối SRS |
| Kahoot | thanh thời gian + điểm tốc độ, nhạc nhịp, bục vinh danh | áp lực công khai |
| Memrise | Speed Review từ đến hạn, "Difficult words" | – |
| Babbel | ôn chia chế độ (nghe/nói/viết) theo SRS | – |
| ELSA | rung + điểm phát âm tức thì | paywall |
Xu hướng 2026: phiên ≤ 2 phút, haptic tinh tế, reduced-motion là mặc định tôn trọng, AI cá nhân hoá trên máy, không dark-pattern.

## Chọn game (chấm 1–5: Học = giá trị ghi nhớ trên SRS · Cuốn = vòng lặp hấp dẫn · Nhẹ = chi phí máy yếu)
| Game | Học | Cuốn | Nhẹ | Vì sao / mẫu tham chiếu | Mốc |
|---|---|---|---|---|---|
| Thử thách 60 giây (nhận diện nhanh) | 4 | 5 | 5 | Speed Review (Memrise) + nhịp Kahoot, kỷ lục + thách bạn | M1 ✅ |
| Ghép cặp tốc độ trên thẻ đến hạn | 3 | 5 | 5 | Match (Quizlet) / Match Madness (Duolingo) – đã có lõi Ghép thẻ | M2 |
| Gõ nhanh chữ thiếu (nhớ chủ động) | 5 | 4 | 5 | recall > nhận diện → nhớ lâu nhất; gợi ý chữ cái như rmodes | M2 |
| Nghe liên hoàn (chính tả 1 từ) | 5 | 4 | 4 | luyện nghe + chính tả, giọng Ama/Carlos (Kokoro) | M2 |
| Câu thật – chọn từ đúng ngữ cảnh | 5 | 3 | 5 | câu ví dụ IELTS/TOEIC thật, collocation | M2 |
| Đoán từ qua ảnh | 3 | 4 | 3 | img.json (không chữ trong ảnh), ảnh tải lười, ≤ 30 KB/ảnh | M2 |
| Đấu bạn bất đồng bộ / giải tuần | 3 | 5 | 4 | xã hội = giữ chân mạnh nhất; dùng api/league sẵn có | M3 |
| Arcade bắn chữ kiểu Blast | 2 | 4 | 2 | canvas nặng, học ít → loại (không trò vô nghĩa) | ✗ |
Nguyên tắc cuốn mà không ép: phiên ≤ 2 phút, mục tiêu rõ (vượt kỷ lục/bạn), phản hồi < 100 ms, phần thưởng thay đổi (combo, kỷ lục, rương mốc), chơi lại 1 chạm; sau câu sai luôn có "mẹo nhớ" ngắn (gốc từ, collocation) để dễ nhớ.

## Hiệu năng (bắt buộc mọi mini-game)
- Mỗi game ≤ 15 KB gz, tải lười, 0 byte vào khung app; không thư viện game/canvas (trừ pháo giấy có sẵn).
- Chỉ animate `transform`/`opacity` (CSS có sẵn), không đọc layout trong vòng lặp; đồng hồ 5 Hz (không rAF liên tục), dừng khi tab ẩn, dọn hết timer/listener khi rời màn.
- Dữ liệu chuẩn bị 1 lần đầu lượt (không duyệt cả kho 20k từ mỗi câu); âm giải mã sau lần chạm đầu.
- Mục tiêu: INP < 100 ms, 60 fps, không long task > 50 ms trên CPU chậm 4× (gate CI `perf-*`/visual-qa khi có màn Stitch).

## Luật thiết kế
- Mọi mini-game lấy từ **thẻ đến hạn → từ yếu → sổ từ**; kết quả quy về Again/Hard/Good **chỉ cho thẻ đến hạn** (thẻ chưa đến hạn không bị đẩy xa giả tạo); sai → `logMistake` + hỏi lại trong lượt.
- Không tim/mạng/gem; hết giờ = kết thúc nhẹ nhàng, có "Chơi lại". Tab ẩn → dừng giờ.
- Phản hồi qua **một chỗ** `Sfx.answer/finish` (game.js) – âm, rung, aria-live, combo 3/5/10.
- Âm: gói `web/sfx` tự tổng hợp CC0, **mỗi file −16 LUFS ±1 LU, đỉnh ≤ −1 dBFS** (BS.1770, `scripts/sfx/build.mjs`); tắt bằng Cài đặt › Âm thanh; rung tắt cùng âm và khi reduced-motion.
- Nhân vật chỉ 2D Ama/Carlos qua `Chars`. Giao diện chỉ từ Stitch (Lexkite Kit) – màn chưa có ref dùng lại thành phần luyện tập có sẵn, ghi vào "Cần Stitch".

## Mốc
1. **M1 (PR này)** – lớp phản hồi bật mặc định (`vb.feel` ≠ '0'; công tắc Cài đặt giữ nguyên), SFX chuẩn −16 LUFS + test; mini-game **Thử thách 60 giây** (`#/practice/blitz`, gói lười `pgames`): 3 dạng câu (từ → nghĩa, nghe → từ, ảnh → từ), combo ×1/×2/×3, kỷ lục cá nhân (`game.best.blitz`, đồng bộ), ôn lại từ sai, XP + nhiệm vụ; **👥 thách đấu bạn**: link `?ch=` mang đúng bộ từ + điểm cần vượt (base64url đã kiểm, không máy chủ, không dữ liệu cá nhân; Web Share / chép link).
2. **M2 – đa dạng trò** (mỗi trò ≤ 15 KB gz, lười, cùng lõi `PlayBlitz.core`): Ghép cặp tốc độ nối SRS · Đoán từ qua ảnh (img.json, không chữ trong ảnh) · Nghe-chọn liên hoàn · Điền chữ cái thiếu (chính tả) · Câu ví dụ thật (chọn từ đúng ngữ cảnh) · "Giờ vàng" ×2 XP (khung giờ người dùng chọn, không thông báo ép) · rương mốc tuần · port sang khung Stitch.
3. **M3 – xã hội & ghi nhớ sâu** – đấu bất đồng bộ qua API giải tuần sẵn có (`functions/api/league.js`, nick ẩn danh, chống gian lận phía máy chủ, D1 quota-guard) · bảng điểm bạn bè · nhiệm vụ tuần + huy hiệu mini-game (sau #267) · nhân vật phản ứng đúng/sai (GAME-FEEL §4 bước 1) · "thẻ mẹo nhớ" (gốc từ, collocation, câu IELTS) hiện sau câu sai để dễ nhớ.

## Tiêu chí xong (M1)
Blitz chạy từ dữ liệu SRS thật, cập nhật FSRS đúng mức, 15 ngôn ngữ đủ khóa (i18n-missing/qa strict), không vỡ khung 390 px, nút X ≥ 44 px, tương phản ≥ 4.5:1 sáng/tối, khung app không tăng (code ở gói lười), `npm run prepush` xanh.

## Gate CI
`scripts/test/play-blitz.mjs` (logic thuần + jsdom vòng chơi: chấm SRS, combo, dừng khi tab ẩn, phím 1–4, kết thúc) · `scripts/test/sfx-loudness.mjs` (−16 LUFS ±1, đỉnh ≤ −1 dBFS, ffmpeg có thì đo cả mp3 phát hành) · `feel.mjs` (mặc định bật, `?feel=0` tắt) · shell-size · i18n strict.

## Cần Stitch (giao phiên stitch-factory)
- `play-blitz` (focus: X + thanh thời gian mảnh, chip combo, thẻ đề, 4 đáp án A–D, teacher-slot) sáng/tối.
- `play-blitz-done` (điểm, kỷ lục, từ cần ôn, 1 CTA "Chơi lại").
- Ô "Mini-game" trên màn Luyện tập v2 (`st/v2/practice`).

## Phụ thuộc / không đụng
#315 (path3.js), #284 (home v2, ux1/v2 i18n, st-*.css), #267 (huy hiệu): M1 không sửa file riêng của các PR đó. Chung không tránh được: `web/js/app.js` (2 dòng: gói `pgames` + ô chế độ, bản sao `extension/app/js/app.js`), `scripts/i18n-fixed.json` và `web/js/i18n/<lang>.js` (khóa mới, gộp bằng `i18n-dedupe.cjs`). M3 huy hiệu chờ #267.
