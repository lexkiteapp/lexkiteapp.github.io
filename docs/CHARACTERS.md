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
- Chuẩn bị/tách nền/dựng CHỈ trên CI (`green-prep.yml` → `matte-pro.yml` → `teach-build.yml`); không chạy nặng trên máy.
- Đổi bất kỳ mục nào ở đây = hỏi chủ trước, kèm chi phí.
