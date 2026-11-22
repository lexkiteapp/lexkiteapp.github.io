# Nhật ký giọng nói – ngày 1 vs ngày 30 (spec-lite, vòng lan truyền 22/11)
> TL;DR: `#/diary` = người học thu **1 câu cố định** ngày đầu, thu lại câu đó ở mốc **7 · 14 · 30 · 60 · 90 ngày**, mỗi lần chấm bằng **`Speak.score` + `Score30.grade`** (một bộ chấm). Bấm "Chia sẻ" → dựng **video dọc 9:16 trên máy** (hai bản ghi + điểm + biểu đồ + Ama/Carlos 2D + link thách đấu `/c/<id>`) → share sheet (TikTok/Reels/Zalo). Bản ghi **chỉ nằm trên máy**. Tự duyệt theo quyền điều phối 22/11.
> Đọc khi: sửa `web/cpack/diary-app/*`, nhóm i18n `diary`, sự kiện `vd_*`, loại nhắc `diary` trong `remind.js`, thẻ `pid ≥ 100` trong `functions/api/challenge.js`.

**Vì sao**: người ta chia sẻ *tiến bộ của chính mình* (định dạng "day 1 vs day 30" phổ biến trên TikTok/Reels). Thẻ điểm 30 s cho một con số; nhật ký cho một câu chuyện → lý do quay lại (D7/D30) + lý do khoe.

## Luồng
1. **Bắt đầu** (`#/diary`, chưa có nhật ký): chọn 1 trong 3 câu theo trình độ (ngắn A1–A2 · vừa B1 · dài B2+; câu chứa âm khó th/r–l/v–w/âm cuối) → đọc → điểm ngày 1 → "Hẹn bạn ngày 7". Câu cố định suốt nhật ký.
2. **Mốc**: mốc tới hạn khi `ngày kể từ bắt đầu ≥ m` (m ∈ 7,14,30,60,90); mỗi mốc giữ bản thu **mới nhất** (thu lại được trong mốc). Trễ mốc vẫn thu được (ghi đúng số ngày thật, vd "ngày 33").
3. **Màn nhật ký**: dòng thời gian các mốc (đã thu / tới hạn / còn n ngày), nút nghe từng bản, biểu đồ điểm, nút **Chia sẻ video**, **Xóa bản này**, **Xóa cả nhật ký** (xác nhận, không hoàn tác).
4. **Video** (chỉ khi bấm Chia sẻ, dựng trên máy): 720×1280, 30 fps, ≤ 25 s — mở đầu "Ngày 1 → Ngày N" · bản ngày 1 (chữ chạy, từ đúng/sai) · bản mới nhất · điểm trước→sau + biểu đồ · Ama/Carlos 2D chúc mừng (`Chars.still(…, 'cheer'|'clap')`) · lexkite.com + link. Chỉ có ngày 1 → video "Ngày 1 – hẹn ngày 30" (cam kết công khai cũng là nội dung lan truyền). `canvas.captureStream` + WebAudio → `MediaRecorder` (ưu tiên `video/mp4`, không có thì `webm`); chia sẻ bằng `LKFile.save({share:true})` kèm link, không share file được → tải về + chép link.
5. **Link thách đấu** = `POST /api/challenge {op:'create', fl, pr, pid: 100+i}` (dùng lại bảng `sc_card`, không đổi lược đồ): `pid ≥ 100` = câu nhật ký i. `/c/<id>` hiện "Mình từ X lên Y điểm sau N ngày" và nút → `#/diary/c/<id>`: bạn đọc đúng câu đó, so điểm, rồi được mời **bắt đầu nhật ký của mình** (vòng K). UTM `utm_campaign=voicediary`.

## Dùng lại (không viết trùng)
Chấm: `Speak.score` + `Score30.grade` (gói `score30` nạp cùng). Bản ghi: `r.audio` của `UI.recognize` (máy tính); điện thoại web (mic không chạy song song với nhận giọng – `UI.micParallel`) → sau khi chấm, thu thêm 1 lượt **chỉ ghi âm** cùng câu để lưu (nói rõ trên màn). Thưởng: `Game.xpFor('say', {score})` (khi #1853 có trên main; trước đó hằng `XPR.say`=3) qua `App.reward`. Lưu/chia sẻ file: `LKFile`. Nhân vật: `Chars`. Khung: khung app chung (`.page-head`, thanh trên + 5 tab), nút/thẻ Kit; cổng Stitch như màn `score` (khung `say-front`). Nhắc: loại `diary` trong `Remind.plan` – cùng trần ≤ 1/ngày, giờ yên lặng, giãn cách, tắt chung `reminderOn`.

## Riêng tư
IndexedDB `lk-vdiary` (store `takes`: điểm + từ + Blob âm thanh) + `localStorage lk.vd` (ngày bắt đầu, câu). **Không đồng bộ, không gửi máy chủ.** Link thách đấu chỉ chứa mã ngẫu nhiên; máy chủ chỉ lưu fl/pr/pid/lang (như thẻ 30 s). Xóa app/dữ liệu trình duyệt = mất nhật ký (ghi rõ trên màn).

## Nhẹ
Gói lười `diary` (`web/cpack/diary-app/`, ước ≤ 9 KB gz) + nhóm i18n lười `diary`; không đụng khung app ngoài 1 dòng route. Add-on: cùng gói (CSP không chặn – không mã ngoài). **Native iOS/Android: đợt sau** (AVAudioRecorder/MediaRecorder + AVAssetWriter/MediaMuxer, cùng công thức điểm qua `score-card` vectors); trước đó app gốc chạy bản web trong WebView như hiện nay.

## Công tắc & đo
Ship 100 %; khẩn: `/api/config vd_kill='1'` → ẩn lối vào, `#/diary` báo tạm nghỉ (bản ghi trên máy giữ nguyên). Beacon chỉ đếm (`t:'q'` → `ext_events` `cta:vd_*`): `view · start · rec · ms · share · shared · dl · del · cview · cta · cstart · cdone · join` (join = bạn từ link bắt đầu nhật ký). **Mục tiêu 30 ngày**: tỉ lệ chia sẻ = shared / ms ≥ 15 %; K = (join / shared) × (shared / người bắt đầu) ≥ 0,3; D30 người có nhật ký ≥ 2× trung bình.

## Kiểm
`scripts/test/voice-diary.mjs`: mốc/ngày (thuần), chọn bản, công thức thưởng, kịch bản video (thời lượng, khung), pid 100+ máy chủ ↔ client, trang `/c` biến thể nhật ký 15 ngôn ngữ, e2e jsdom (thu ngày 1 → giả đồng hồ +7 → thu → chia sẻ → mở link → so → bắt đầu nhật ký), nhắc `diary` (trần 1/ngày, giờ yên). i18n-qa, size-budget, stitch-diff (màn `diary`). Ảnh sáng/tối qua visual-qa.
