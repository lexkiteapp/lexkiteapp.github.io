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
