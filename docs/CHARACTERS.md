# Nhân vật Lexkite – 1 bộ duy nhất (chủ 28/10/2026)

> TL;DR: chỉ **2 giáo viên 2D** Ama (cô) + Carlos (thầy), trang phục 1, cho MỌI bề mặt: app web, add-on, landing/blog/OG, mẫu social, end card, video.
> Không 3D, không trộn, không nhân vật khác (Mia/Jake/Leo/Diane/Daniel/Mei/Kai/Ruth). Đọc khi: thêm/sửa bất cứ chỗ nào hiện giáo viên.

- **Nguồn duy nhất**: `web/teach/characters.json` (người, tư thế → clip phông xanh nguồn, khung, sha256). Web/add-on: `web/js/characters.js` → `Chars.poster/avatar/clip/img`.
  Python (video): `scripts/teach/registry.py` (`video_clips`, `check`). Mẫu social: `build-social-templates.mjs` cắt từ poster/avatar registry.
- **Tư thế**: talk · listen · explain · happy · encourage · thinking · laugh. Thiếu → tạo clip Kling CÙNG khung đầu trang phục 1 (`docs/CREDIT-RULES.md`), không lấp bằng kiểu khác.
- **Dựng**: CI `teach-build.yml` → `scripts/teach/build.py` (cùng khung mọi tư thế, Ama/Carlos cùng cỡ đầu + đường mắt, H.264 xếp chồng alpha) + tờ soát `sheet.py`.
- **Cổng**: `scripts/test/characters-gate.mjs` (npm test) – tham chiếu ngoài registry, tệp lạ, hash; `characters-shots.yml` – hash tài sản trên ảnh chụp build + live.
  Video: `render_v9/render_tpl/render_v5/news.py` dừng nếu nhân vật/clip ngoài registry.
- **Video hằng ngày** (`video.yml` → `render.mjs`): diễn viên = clip `build:"registry"` trong `brand/library/manifest.json` (7 tư thế × 2 đoạn/người, khung medium nửa người neo đáy), CI dựng tại chỗ bằng `scripts/video/registry_clips.py` từ footage phông xanh. `casting.json`/`library.json`/`teachers.json`: dữ liệu cũ (Mia/Leo/Diane, 3D) chỉ ở `retired`. Cổng: `characters-gate.mjs` §4.

## Bản thiết kế sản xuất (KHOÁ – chủ duyệt 29/10)
- Trang phục 3: Ama blazer coral + áo kem + băng đô vàng; Carlos blazer xanh + sơ mi trắng. **Tóc ĐEN** (caramel/nâu đã thử, chủ loại). Khung đầu: `cine/teachers/green_{ama,carlos}_o3_ref.png` (Carlos ngậm miệng: ảnh môi khép trong bank).
- **Clip 1080p** (Kling 2.5, 5 s, phông #00B140), máy khoá, không zoom, tay xuôi đầu/cuối. 13 tư thế + bản 2 cho talk/listen/explain. Id `ga11_*` / `gc11_*`.
- **Tư thế chỉ-ảnh** (05/11, rig `TeacherRig`): `people.<who>.stills` = ảnh chuẩn phông xanh trong lexkite-media (`cine/teachers/green/*_still.png`, đã qua `qc_green.py still` + soát mắt) → `scripts/teach/still_img.py` (CI teach-build, sau build.py) cắt đúng khung build.py → `still-<pose>.webp`. `Chars.has/stills`; cử chỉ thiếu ảnh của người đó dùng `alt`. Hiện có: Ama thumbs_up, clap · Carlos thumbs_up, hold_card.
- Prompt: tư thế ngậm miệng không dùng từ smile/warm/friendly, ghi "lips pressed together…"; tay "point" tả theo phía khung hình.
- Kiểm ở bước ẢNH trước khi tạo clip; mỗi clip QC (5 ngón, miệng, khung ±5 % cỡ đầu, nền sạch); hỏng 2 lần thì bỏ mục.
- **Mắt mở + vòng nghỉ (3/11):** ảnh tĩnh/poster chọn khung mắt mở (`scripts/teach/eyes.py`, không còn cứng 40 % clip); vòng nghỉ 1–3 s `idle.webm` (VP9α) + `idle.mp4` (xếp chồng, Safari) + `idle-poster.webp` qua `Chars.idle`, ≤ 150 KB/tệp, dựng bởi `scripts/teach/idle.py`, cổng `idle.py --check` (characters-shots.yml). Spec: [specs/home-upgrade.md](specs/home-upgrade.md).
- Chuẩn bị/tách nền/dựng CHỈ trên CI (`green-prep.yml` → `matte-pro.yml` → `teach-build.yml`); không chạy nặng trên máy.
- Đổi bất kỳ mục nào ở đây = hỏi chủ trước, kèm chi phí.

## Chỗ giáo viên (teacher slot, 1/11 – chủ: "giáo viên trông như nhân vật app top")
- Ảnh tĩnh là **nửa người** (đầu → hông, đáy mờ + quần xám) → KHÔNG đặt trần. Mọi chỗ hiện giáo viên dùng `Chars.slot(who, {pose, size, flip, cls, ground})` (`web/js/teacher-slot.js`): giáo viên đứng **sau một bệ** cùng màu mặt thẻ (`--surface-2`, gờ đáy `--ledge`) che đường cắt hông; không vệt cắt, không khối xám, không lơ lửng.
- Phát clip (WebGL H.264 xếp chồng / VP9α) nằm ở `web/js/teacher-live.js`, tải lười khi trang có `.tslot[data-clip]` – khung app chỉ giữ ảnh tĩnh + CSS (3/11, size-budget).
- Cỡ chuẩn (chiều cao khung, đầu → mặt bệ): `xs` 48 (mặt trong chip) · `s` 72 · `m` 112 · `l` 152 · `xl` 208 px. Cạnh nút CTA tròn 72 px dùng `l`. Đặt về phía còn chỗ trên màn 390 px; `flip` khi đứng bên phải để tay chỉ vào nút; `clip:true` = clip tư thế trên cùng bệ.
- Tư thế theo ngữ cảnh: bảng tư thế ở side-notes `teacher-pose-map.md` (point = nút đang học, cheer = đúng, concern = sai, thinking = trống…). Thở nhẹ + hiện mờ 180 ms chỉ khi `prefers-reduced-motion: no-preference`. Tối: hạ sáng 5 % cho cùng ánh sáng UI.
- **Vòng nghỉ trong chỗ giáo viên (3/11, Home "Hôm nay"):** `Chars.slot(who, {idle:true})` = `Chars.idle` (tư thế mặc định `happy` – tư thế gốc của vòng trong characters.json). Khung cuối ≈ khung đầu (`idle.py`) nên lặp liền (`data-loop="0"` → `video.loop`). Máy có H.264 (mọi Safari/iOS, Chrome/Android thường) → `idle.mp4` xếp chồng ghép alpha bằng WebGL; không có H.264 mà có VP9 (Chromium nguồn mở, một số Linux) → `idle.webm` VP9α phát thẳng (Safari bỏ alpha VP9 nên không vào nhánh này). Tải khi khung hiện trên màn, dừng khi khuất; giảm chuyển động/tiết kiệm dữ liệu → ảnh tĩnh. Khung cắt `.tslot-fig` dùng `overflow:clip` (hidden là khung cuộn: scrollIntoView đẩy ảnh lên lộ thân mờ – #314).
- **Sân khấu Truyện + bài tập (5/11):** 2 người đứng trên 1 sàn chung (`web/css/story-stage.css`, `web/js/lesson/story-stage.js`, tải lười), người nói sáng, người im StoryStage.park (không sửa teacher.js) – docs/specs/story-stage.md, cổng `scripts/test/story-stage.mjs`.
- Cổng: `scripts/test/teacher-native.mjs` (npm test) – chỗ đặt trần mới = đỏ; `teacher-native.known.json` chỉ được giảm khi chuyển từng màn.

## Chữ chạy theo lời nói

`SayText` (`web/js/say-text.js`) hiện chữ theo từng từ khi giáo viên nói: có file tiếng thì bám mốc khớp miệng `LK_CUES`, không có thì theo đồng hồ. Chữ chờ chỉ mờ, không xô bố cục; tiếng lỗi hoặc bị chặn thì hiện đủ câu. Giảm chuyển động và tiết kiệm dữ liệu thì tắt. Máy kiểm thử mặc định tắt; đặt `lk.saytext=1` để bật. Gọi qua `teacher.say(text, { caption })`. Cổng: `scripts/test/say-text.mjs`.

**Cảm xúc trung tâm (7/11, `TeacherMood` – `web/js/teacher-mood.js`, tải lười):** đúng → cheer · sai → concern, sai ≥ 2 liền → encourage · chuỗi tăng → laugh · lỡ chuỗi → empathy + câu an ủi trên Hôm nay (`App.streakLost`) · đứng yên ≥ 45 s → gợi ý chữ 1 lần/màn, ≤ 3/ngày, không tiếng. Biểu cảm: `Chars.POSE_EMO`. Cổng `scripts/test/teacher-mood.mjs`.

**Bong bóng lời giáo viên (5/11):** gõ chữ 1 lần/ngày, pop nhẹ, 🔊 Ama đọc, miệng bám âm thanh, vòng nghỉ dừng khi ẩn = `TeacherBubble` (`web/js/teacher-bubble.js`) – spec + kiểm kê các chỗ giáo viên nói: [docs/specs/teacher-bubble.md](specs/teacher-bubble.md).

## Hình học chỗ giáo viên

Ghi chú cho `web/js/teacher-slot.js` (`.tslot-fig`, `.tslot-img`, `.tslot-ledge`):

- Hình học (ảnh 1108×960, người chiếm y 8 %→100 %): ảnh cao 1,2 khung (`--fh`), đáy ảnh lùi 0,18 khung (`--fb`) dưới đáy khung (phần mờ + quần bị khung cắt) – MỘT nguồn cho ảnh tĩnh, clip và rig (`.tb-rig`); kích thước theo mẫu Stitch (stitch-diff).
- bệ cao 0,16 khung che dải 72 %→86 % ảnh (vạt áo) → mép nhìn thấy duy nhất là mặt bệ bo tròn; đầu cách đỉnh khung ~7 %.
- 06/11 (ảnh chủ, Hôm nay tối): rig tụt 0,1 khung sau khi tải (bệ che tới vai) vì `.trig{position:relative}` chèn sau đè `.tb-rig{absolute}` → CSS mặc định của rig dùng `:where()` (độ ưu tiên 0). Ảnh xl giãn 1,1 px khi tải vì hộp trước khi tải lấy tỉ lệ từ width/height làm tròn → `img.tslot-img{aspect-ratio:1108/960}` (= tỉ lệ cuối).
- `hip:true` (Hôm nay/Welcome – như mẫu streak, chủ 06/11): đầu/mặt cùng cỡ (ảnh 1,2 khung), người nâng (`--fb` −0,125), bệ mỏng 0,1 → mép bệ đúng hàng 780/960 = hông (`TeacherSlot.HIP`; đầu quần y 786–798): lộ tới hông + tay, bệ là dải thấp sau chân và vẫn che dải 15 % đáy người (mờ dần, final-qc 'not-pasted-on').
- Cổng: `scripts/test/teacher-bubble.mjs` (CI teacher-bubble.yml) – 360/1280 × sáng/tối × mọi cỡ: khung/ảnh/bệ/rig lệch ≤ 1 px trước ↔ sau khi ảnh + rig tải, CLS 0, mép bệ đúng 72 % ảnh (không che thân hơn mẫu); chỗ hip:true mép bệ = HIP ± 1 px và che dải 15 % đáy người.
- Khung cắt .tslot-fig chỉ rộng vừa ảnh (ảnh rộng 1,2×1108/960 = 1,385 khung-cao, khung rộng 0,9 → mỗi bên lố 0,243 → lề 0,25) và cao hơn đỉnh 0,1.
- overflow:clip (không phải hidden): khung hidden là KHUNG CUỘN – scrollIntoView/focus/tìm trong trang cuộn ảnh lên 0,18 khung → thân mờ lộ trên bệ
- (final-qc streak: ảnh đáy = đáy khung dù bottom -20 px); clip không cuộn được. hidden đứng trước làm dự phòng cho trình duyệt cũ:
- khung thừa (±60 % cũ) làm tràn ngang màn 360 px khi chỗ giáo viên sát mép thẻ (stitch-diff/final-qc 'tràn ngang tslot-fig').

## Phát clip – lag, vệt đen, lệch miệng (05/11)

| Lỗi | Gốc | Sửa | Cổng |
|---|---|---|---|
| Lệch miệng (chỗ giáo viên) | Clip Kling quay lúc NÓI, phát lặp không tiếng → miệng nhép không lời | Chỉ clip miệng ngậm (`QUIET` trong `teacher-live.js`) được phát im; clip nói chỉ khi có lời (`data-talk`) rồi về ảnh tĩnh | `scripts/teach/mouth_motion.py --check`, `teacher-quality.mjs` |
| Lệch miệng (mặt vẽ có tiếng) | Đọc thẳng `audio.currentTime`: trễ loa, bậc thô, trễ 1 khung | `LipSync.clock` | `lip-clock.mjs` (p95 ≤ 33 ms) |
| Vệt/khung đen | H.264 không gắn dải màu; nhiễu alpha 1–3/255; `mediump` lấy mẫu qua đường nối | Shader tự đo mức đen, cắt nhiễu, cắt cứng alpha < 9/255, highp; `build.py`/`idle.py` gắn BT.709 tv | `teacher-quality.mjs` (Chromium + WebKit) |
| Lag | Tải texture mỗi rAF (60/s) cả 2 video; đầu 1108 px thu nhỏ mỗi khung; video giải mã ở tab ẩn | rVFC + `texSubImage2D`, chỉ video đang hiện; thu nhỏ đầu 1 lần; dừng khi tab ẩn; máy không GPU/CPU yếu (tải khung > 12 ms trung bình) → ảnh tĩnh thở CSS (`lkSlow`) | `teacher-quality.mjs` (CPU 4×) |
