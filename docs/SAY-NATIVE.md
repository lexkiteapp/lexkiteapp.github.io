# Say it like a native – thẻ phản xạ (spec-lite)

> TL;DR: Thẻ 2 mặt "nói như người bản xứ" (#/say) + video react 9:16 cùng dữ liệu; khung Stitch v2 say-front/back, giáo viên Ama/Carlos 2D, nghĩa 15 ngôn ngữ dịch trên CI.
> Đọc khi: sửa loạt thẻ, màn #/say, ảnh chia sẻ, mẫu video `react`.

**Mục tiêu:** câu người bản xứ thật nói (idiom/cụm), kèm sắc thái (lịch sự/trung tính/thân mật), tình huống dùng, câu nên tránh (thô → che •), luyện nghe-nói và chia sẻ được.

## Dữ liệu (một nguồn)
- `content/say-native/series.json` (tay): loạt → thẻ {key = headword kho từ, say, reg, mean, when, swap, dont, pose, quiz}. Loạt có `teacher` (ama | carlos).
- `content/say-native/meanings.json`: nghĩa 13 ngôn ngữ – CI `say-native.yml` (ai-pool: Gemini/Groq → CF_POOL; 2 giám khảo khác họ, đều ≥ 4); vi = nghĩa kho từ đã duyệt.
- `node scripts/say-native/build.mjs [--check]` → `web/data/say.json`. Cổng: ≥ 3 loạt, 6–10 thẻ, key trong kho có IPA, reg hợp lệ, đủ 14 nghĩa, không chữ Việt ngoài vi, câu thô đã che và không vào quiz, pose có clip của giáo viên, id duy nhất. `--check` nằm trong `npm test` (khi say.json có trên nhánh).
- Bản dịch `web/packs` cho idiom là dịch máy theo chữ → thẻ KHÔNG dùng packs.

## Web (#/say)
- `web/js/say.js` (tải lười `BUNDLES.say`): `#/say` danh sách loạt; `#/say/<loạt>/<thẻ>` thẻ, chạm lật. Link sâu `https://lexkite.com/app/#/say/<loạt>/<thẻ>`.
- Khung: `brand/stitch/v2/say-{front,back}-{light,dark}.html` → bind `brand/stitch/v2/bind/say-front|say-back.json` → `ST2.mount` (cách port: `STITCH-V2-PORT.md`). Thanh tab Stitch → thanh tab chung (tab Luyện).
- Giáo viên: `Chars.still(<giáo viên loạt>, <pose thẻ>)` vào chỗ trống; 🔊 `UI.tts(say, 'en-US', …, { voice: Chars.voice(<giáo viên>) })`, 🎧 chậm 0.7, 🎤 `UI.recognize` (% giống), ⚑ `LexReport` cid `say:<loạt>/<thẻ>`.
- Chia sẻ: Canvas 1:1 (1080²) và 4:5 (1080×1350), không chứa câu "đừng nói"; `LKFile.save` / tải ảnh / chép link.
- Danh sách loạt chưa có ref Stitch riêng → dùng token thẻ của mặt trước (chủ duyệt ảnh; cần thì vẽ ref).
- i18n: nhóm lười `say` (`web/js/i18n/en/say.js`) + nhãn khung ở `v2`; nhãn ngắn dịch tay `scripts/i18n-fixed.json`.

## Video (`react`, teach2d)
Mẫu `react` trong pipeline teach2d (`docs/VIDEO-TEACH2D.md`): hook ≤ 6 chữ → câu → nghĩa → "Repeat after me" + lặng 1,6 s → đổi/đừng nói (che, không đọc) → quiz 2,6 s → CTA; ~22–25 s, ≤ 150 wpm, chỉ tiếng Anh. Thử: `t2_react_*` trong pilots.json; chạy `teach-video.yml`.

## Xong khi
- [ ] say.json từ CI (đủ 14 nghĩa) · `build.mjs --check` trong npm test · journey-e2e `say-list/front/back` xanh.
- [ ] Chủ OK ảnh trước/sau (sáng+tối) và 3 video mẫu trước khi gộp / chạy lô.
- [ ] qc.py thêm `#/say` vào danh sách route CTA (chủ qc.py) → CTA video trỏ `#/say/<loạt>/<thẻ>`.
