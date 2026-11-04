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
- Prompt: tư thế ngậm miệng không dùng từ smile/warm/friendly, ghi "lips pressed together…"; tay "point" tả theo phía khung hình.
- Kiểm ở bước ẢNH trước khi tạo clip; mỗi clip QC (5 ngón, miệng, khung ±5 % cỡ đầu, nền sạch); hỏng 2 lần thì bỏ mục.
- **Mắt mở + vòng nghỉ (3/11):** ảnh tĩnh/poster chọn khung mắt mở (`scripts/teach/eyes.py`, không còn cứng 40 % clip); vòng nghỉ 1–3 s `idle.webm` (VP9α) + `idle.mp4` (xếp chồng, Safari) + `idle-poster.webp` qua `Chars.idle`, ≤ 150 KB/tệp, dựng bởi `scripts/teach/idle.py`, cổng `idle.py --check` (characters-shots.yml). Spec: [specs/home-upgrade.md](specs/home-upgrade.md).
- Chuẩn bị/tách nền/dựng CHỈ trên CI (`green-prep.yml` → `matte-pro.yml` → `teach-build.yml`); không chạy nặng trên máy.
- Đổi bất kỳ mục nào ở đây = hỏi chủ trước, kèm chi phí.

## Chỗ giáo viên (teacher slot, 1/11 – chủ: "giáo viên trông như nhân vật app top")
- Ảnh tĩnh là **nửa người** (đầu → hông, đáy mờ + quần xám) → KHÔNG đặt trần. Mọi chỗ hiện giáo viên dùng `Chars.slot(who, {pose, size, flip, cls, ground})` (`web/js/teacher-slot.js`): giáo viên đứng **sau một bệ** cùng màu mặt thẻ (`--surface-2`, gờ đáy `--ledge`) che đường cắt hông; không vệt cắt, không khối xám, không lơ lửng.
- Phát clip (WebGL H.264 xếp chồng / VP9α) nằm ở `web/js/teacher-live.js`, tải lười khi trang có `.tslot[data-clip]` – khung app chỉ giữ ảnh tĩnh + CSS (3/11, size-budget).
- Cỡ chuẩn (chiều cao khung, đầu → mặt bệ): `xs` 48 (mặt trong chip) · `s` 72 · `m` 112 · `l` 152 · `xl` 208 px. Cạnh nút CTA tròn 72 px dùng `l`. Đặt về phía còn chỗ trên màn 390 px; `flip` khi đứng bên phải để tay chỉ vào nút; `clip:true` = clip tư thế trên cùng bệ.
- Tư thế theo ngữ cảnh: bảng tư thế ở side-notes `teacher-pose-map.md` (point = nút đang học, cheer = đúng, concern = sai, thinking = trống…). Thở nhẹ + hiện mờ 180 ms chỉ khi `prefers-reduced-motion: no-preference`. Không opacity/filter/lớp phủ trên nhân vật ở mọi theme (chủ 4/11, cổng chars-stage).
- **Vòng nghỉ trong chỗ giáo viên (3/11, Home "Hôm nay"):** `Chars.slot(who, {idle:true})` = `Chars.idle` (tư thế mặc định `happy` – tư thế gốc của vòng trong characters.json). Khung cuối ≈ khung đầu (`idle.py`) nên lặp liền (`data-loop="0"` → `video.loop`). Máy có H.264 (mọi Safari/iOS, Chrome/Android thường) → `idle.mp4` xếp chồng ghép alpha bằng WebGL; không có H.264 mà có VP9 (Chromium nguồn mở, một số Linux) → `idle.webm` VP9α phát thẳng (Safari bỏ alpha VP9 nên không vào nhánh này). Tải khi khung hiện trên màn, dừng khi khuất; giảm chuyển động/tiết kiệm dữ liệu → ảnh tĩnh. Khung cắt `.tslot-fig` dùng `overflow:clip` (hidden là khung cuộn: scrollIntoView đẩy ảnh lên lộ thân mờ – #314).
- Cổng: `scripts/test/teacher-native.mjs` (npm test) – chỗ đặt trần mới = đỏ; `teacher-native.known.json` chỉ được giảm khi chuyển từng màn.

## Cảnh hai người (`Chars.duo`, 4/11 – chủ: "2 nhân vật nhỏ, đặt thô", "thầy như có lớp phủ mờ")
- Một nguồn: `web/js/teacher-duo.js` (tải lười trong gói lesson). `Chars.duo({ids, floor, extra})` + `Chars.duoSpeak(root, who)`: cùng cỡ/đường mắt, đứng sát, sau mặt đỡ thấy được (khuất ≥ 20 % khung), nhãn tên đúng tâm từng người, câu mới ngay dưới hai người (xếp mới → cũ, DOM vẫn theo thời gian), đuôi trỏ đúng người.
- Người nói rõ bằng đuôi bong bóng, viền nhãn, miệng, nhấn tỉ lệ 1,03. **Cấm opacity/filter/lớp phủ làm nhạt nhân vật.** Art nhìn thẳng, không vẽ lại: hướng về nhau chỉ bằng nghiêng nhẹ 6°; quay đầu thật cần art mới (hỏi chủ + credit).
- Cổng: `.github/workflows/chars-stage.yml` + `scripts/test/chars-stage-shots.mjs`, danh sách màn + cỡ đầu tối thiểu ở `scripts/test/chars-stage.json` (chỉ được nâng): 390 px + desktop × sáng + tối, DPR 2. Ảnh trước/sau: artifact `chars-stage`, `sheet-390.png`, `sheet-desk.png`.
