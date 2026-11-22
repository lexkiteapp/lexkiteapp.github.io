# Say it like a native – thẻ phản xạ (spec-lite)

> TL;DR: Thẻ 2 mặt "nói như người bản xứ" (#/say) + video react 9:16 cùng dữ liệu; khung Stitch v2 say-front/back, giáo viên Ama/Carlos 2D, nghĩa 15 ngôn ngữ dịch trên CI.
> Đọc khi: sửa loạt thẻ, màn #/say, ảnh chia sẻ, mẫu video `react`.

**Mục tiêu:** câu người bản xứ thật nói (idiom/cụm), kèm sắc thái (lịch sự/trung tính/thân mật), tình huống dùng, câu nên tránh (thô → che •), luyện nghe-nói và chia sẻ được.

## Dữ liệu (một nguồn)
- `content/say-native/series.json` (tay): loạt → thẻ {key = headword kho từ, say, reg, mean, when, swap, dont, pose, quiz}. Loạt có `teacher` (ama | carlos).
- `content/say-native/meanings.json`: nghĩa 13 ngôn ngữ – CI `say-native.yml` (ai-pool: Gemini/Groq → CF_POOL; 2 giám khảo khác họ, đều ≥ 4); vi = nghĩa kho từ đã duyệt. Trên nhánh PR bot KHÔNG commit: kết quả = artifact + summary + comment PR → `bash scripts/ci/bot-output.sh say-native` rồi tự commit; trên main bot commit main.
- `node scripts/say-native/build.mjs [--check]` → `web/data/say.json`. Cổng: ≥ 3 loạt, 6–10 thẻ, key trong kho có IPA, reg hợp lệ, đủ 14 nghĩa, không chữ Việt ngoài vi, câu thô đã che và không vào quiz, pose có clip của giáo viên, id duy nhất. `--check` nằm trong `npm test` (khi say.json có trên nhánh).
- Bản dịch `web/packs` cho idiom là dịch máy theo chữ → thẻ KHÔNG dùng packs.

## Web (#/say)
- `web/js/say.js` (tải lười `BUNDLES.say`): `#/say` danh sách loạt; `#/say/<loạt>/<thẻ>` thẻ, chạm lật. Link sâu `https://lexkite.com/app/#/say/<loạt>/<thẻ>`.
- Khung: `brand/stitch/v2/say-{front,back}-{light,dark}.html` → bind `brand/stitch/v2/bind/say-front|say-back.json` → `ST2.mount` (cách port: `STITCH-V2-PORT.md`). Thanh tab Stitch → thanh tab chung (tab Kỹ năng).
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

## Slang Card (22/11 – dòng clip ngắn viral "thẻ lóng + biểu cảm")
> Ý tưởng định dạng tham khảo trang khác (thẻ từ + biểu cảm hài); hình, câu chữ, nhân vật là của Lexkite: **không** ảnh meme/ảnh chụp, **không** từ tục – chỉ giáo viên 2D Ama/Carlos với bộ biểu cảm mạnh của TeacherRig.
- **Kho**: `content/say-native/slang.json` (≥ 300 thẻ sạch, hợp quảng cáo: no cap, lowkey, ghosted, salty, it's giving, my bad, rain check…). Mỗi thẻ: `key`, `forms`, `ipa` (US), `mean` (lời giáo viên ≤ 9 chữ), `def`, `vi` (nghĩa tay), `hook` (tình huống ≤ 6 chữ, ?/!), `example {ctx, text}`, `quiz` (2 lựa chọn), `misuse {text, why}`, `level`, `reg` (neutral/casual/very-casual), `region`, `era`, `expr`, `theme`.
- **Cổng** `node scripts/say-native/slang.mjs --check` (npm test): ≥ 300 thẻ, enum, độ dài, hook+key+mean+example ≤ 20 chữ nói (clip 7–12 s), ví dụ chứa từ, danh sách chặn an toàn quảng cáo (tục, tình dục, rượu/chất kích thích, bạo lực, xúc phạm nhóm, chính trị/tôn giáo; "I'm dead" = cười xỉu được phép), IPA đúng IPA kho từ cho mọi từ nội dung có trong kho.
- **Nghĩa 13 ngôn ngữ**: `translate.mjs` (CI `say-native.yml`, 2 giám khảo) – cùng `meanings.json`; vi = `vi` của thẻ.
- **Biểu cảm**: `expr` ∈ 14 tên của `TeacherRig.EXPR` (`web/js/teacher-rig.js`): shock · panic · smug · smirk · shrug · furious · cringe · laugh · deadpan · proud · love · confused · sad · hype → mặt vẽ (emotion) + ảnh tư thế đã duyệt (nếu có) trong khoảng lặng sau hook. Không tốn credit; thêm ảnh tư thế mới = Kling theo `CREDIT-RULES.md`.
- **Clip** (teach2d `slang`, `gen.py` `slang()` / `build.py` `T_slang`): hook + biểu cảm → từ + IPA → nghĩa (+ nghĩa tiếng của page ở kênh L1) → ví dụ có ngữ cảnh → quiz câm 3-2-1 hoặc thẻ "đừng dùng ở đây" → CTA lexkite.com; giọng Kokoro của giáo viên, tốc 1.05, 7–12 s (qc.py `duration` 7–13 s cho mẫu này, mọi cổng khác giữ nguyên).
- **Carousel vuông** (`scripts/video/teach2d/card.py`, job render của `teach-video.yml`): 3 ảnh 1080² (bìa · đời thật + đừng dùng · quiz + CTA) cùng tập, khung giáo viên cắt từ chính `rig.webm` của clip; cổng tràn chữ / tương phản / có giáo viên → `cards.json`.
- **Lô**: `gen.py --slang-eps N` (cổng máy data · level · hook · dup → `auto.json` + `reviewed.json`), mẫu `slang` ở sổ duyệt `approved.json` = `draft` tới khi 3 tập mẫu short + wide QC ≥ 90.

