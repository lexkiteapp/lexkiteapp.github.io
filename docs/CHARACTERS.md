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
- Ảnh tĩnh là **nửa người** (đầu → hông, đáy mờ + quần xám) → KHÔNG đặt trần. Mọi chỗ hiện giáo viên dùng `Chars.slot(who, {pose, size, flip, cls, ground})` (`web/js/teacher-slot.js`). Không có bệ rời (3/11 chủ báo bệ xám `.tslot-ledge` lơ lửng giữa nền lộ trình trông như lỗi – đã bỏ). Hai cách tiếp đất:
  - `ground:'fade'` (**mặc định**, giáo viên đứng trên nền trống / modal / chip): nửa thân dưới mờ dần mượt vào nền (mask-image + `-webkit-` trên khung `.tslot-fig` → che cả ảnh tĩnh lẫn canvas clip; trong suốt hẳn 0,03 khung trên đáy, đặc từ 0,34 khung) + bóng tiếp đất elip mềm `.tslot-shadow`. Đúng mọi màu nền sáng/tối. Máy không có mask: `@supports not` phủ dải mờ màu `--bg`.
  - `ground:'card'` (giáo viên đứng ngay SAU mép trên một thẻ đục): slot không vẽ gì dưới chân; người gọi cho thẻ (z cao hơn) đè dải đáy 0,16 khung → chính thẻ là bệ, liền màu tuyệt đối. Cổng runtime đỏ nếu dải đáy không bị thẻ đục che.
- Chọn theo chỗ (3/11): lộ trình v2 + Stitch v1 (`ux1.js`, đứng tự do cạnh nút) → fade · lời mời nhắc học (`remind.js`, giữa modal) → fade · chuỗi ngày `retention.js`: modal chúc mừng/ô hàng chữ/thẻ chuỗi (`teachImg`) → fade, mốc chúc mừng (`teach2`) → fade, thẻ "Mốc tiếp theo" (`teach2(who, true)`, đứng ngay trên dải huy hiệu băng) → fade (dải cùng màu thẻ nên không có mép thấy được: thử `card` ra đường cắt ngang cứng – ảnh CI 3/11). `card` chỉ dùng khi mép thẻ đục KHÁC màu nền ngay sau giáo viên. Lộ trình: khe giáo viên ↔ nút `clamp(0px, 100vw − 372px, .75rem)` → không tràn mép ở 360 px · mặt chip phản hồi `st/common.js tStill` → fade · kết bài `tFace` (trên đĩa sao tròn) → fade. Khung riêng ngoài slot (giữ, đã khuất sau mặt thẻ thật): bài học `#lsnTch` (`-mb-14`/`-mb-10` dưới thẻ câu hỏi), Call `#cTch` (sau thẻ phụ đề), ô giáo viên `say.js`/`speak/app.js` (đáy ô bo của khung Stitch – known.json, chuyển khi port ô bệ).
- Cỡ chuẩn (chiều cao khung, đầu → mặt bệ): `xs` 48 (mặt trong chip) · `s` 72 · `m` 112 · `l` 152 · `xl` 208 px. Cạnh nút CTA tròn 72 px dùng `l`. Đặt về phía còn chỗ trên màn 390 px; `flip` khi đứng bên phải để tay chỉ vào nút; `clip:true` = clip tư thế (cùng khung, cùng mặt nạ fade).
- Tư thế theo ngữ cảnh: bảng tư thế ở side-notes `teacher-pose-map.md` (point = nút đang học, cheer = đúng, concern = sai, thinking = trống…). Thở nhẹ + hiện mờ 180 ms chỉ khi `prefers-reduced-motion: no-preference`. Tối: hạ sáng 5 % cho cùng ánh sáng UI.
- Cổng: `scripts/test/teacher-native.mjs` (npm test) – chỗ đặt trần mới = đỏ; `teacher-native.known.json` chỉ được giảm khi chuyển từng màn; kiểm luật mặt nạ fade (chỉ trên khung, đủ tiền tố, trong suốt ở đáy, có `@supports not`), bóng tiếp đất, mặc định `fade`, không còn `.tslot-ledge`/`ground` lạ. Runtime `scripts/test/teacher-native-shots.mjs` (workflow `teacher-native`, 6 màn gồm lộ trình `#/home` × sáng/tối × 390/360 px, ảnh cận từng chỗ giáo viên): fade phải có mặt nạ + bóng ngay dưới chân; card phải có thẻ đục đè dải đáy. `final-qc` chỉ chấp nhận mặt nạ đúng của khung fade.
