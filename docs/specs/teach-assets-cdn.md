# Spec: kho tài sản giáo viên riêng (teach.lexkite.com)

> TL;DR: ảnh/clip Ama+Carlos chuyển sang dự án Pages tĩnh riêng `teach.lexkite.com` ($0), tên tệp có sha256 → cache immutable, CORS cho WebGL, SW + `/teach/` cục bộ làm dự phòng; add-on giữ bản đóng gói. Chờ điều phối duyệt.

Chủ 1/11: ảnh + clip Ama/Carlos phải **nhúng từ kho riêng**, nhẹ, không lag, không đặt thẳng trong app web. Hiện 5,5 MB / 64 tệp ở `web/teach/` (deploy chung Pages `lexkite`), đường dẫn sinh ở `web/js/characters.js` (`f = 'teach/'+who+'/'+x`), sha256 đã có trong `web/teach/characters.json` (`files`).

## Chọn kho ($0)
| Phương án | Chi phí/giới hạn | Kết luận |
|---|---|---|
| **A. Dự án Cloudflare Pages tĩnh riêng `lexkite-teach`, tên miền `teach.lexkite.com`** | Tài sản tĩnh Pages: băng thông + lượt tải không giới hạn, không tốn lượt Worker; 20k tệp/bản | **Chọn** |
| B. R2 public qua Worker `lexkite-media` (media.lexkite.com) | R2 free 10 GB, nhưng mỗi lượt qua Worker ăn 100k req/ngày chung với vimg/blog | dự phòng nếu Pages đổi điều khoản |
| C. Kho GitHub Pages (lexkite-media-N) | free nhưng cache 10 phút, không đặt được header immutable/CORS tuỳ ý | loại |

Cùng tài khoản CF (zone lexkite.com) → HTTP/3, máy chủ gần VN; không đụng giới hạn deploy 180 phút của Pages chính.

## Thiết kế
1. **URL bất biến theo nội dung**: `https://teach.lexkite.com/<who>/<tên>.<sha256[:12]>.<ext>` (vd `ama/poster.9e49a070d2dc.webp`). Đổi tệp = đổi tên → cache vĩnh viễn an toàn. Giữ đường dẫn logic trong URL để dự phòng tự suy ra được.
2. **Header** (`_headers` của dự án kho): `Cache-Control: public, max-age=31536000, immutable` · `Access-Control-Allow-Origin: *` · `Cross-Origin-Resource-Policy: cross-origin` · `Timing-Allow-Origin: *`. `characters.json` (không băm) `max-age=300`.
3. **characters.js**: thêm `BASE` + bảng băm `H` (64 mục × ~20 B ≈ 1,5 KB, sinh bởi `scripts/teach/build.py`, cổng kiểm khớp `files.sha256`). `f(w,x)` → `BASE + w/x-có-băm` khi `BASE` khác rỗng, ngược lại `'teach/'+…` như cũ. `Chars.img/clip` thêm `crossorigin="anonymous"` (bắt buộc cho texture WebGL của `teacher-slot.js` PR #314 – không thì canvas bị "tainted"). Cờ tắt nhanh: `BASE=''` hoặc `localStorage.lk_teach_local=1`.
4. **Dự phòng 2 lớp** (kho lỗi → vẫn hiện giáo viên):
   - SW (`web/sw.js`): yêu cầu tới `teach.lexkite.com` → cache-first trong cache riêng `lk-teach` (giữ qua đổi CACHE, LRU 80 tệp ≈ 7 MB); mạng lỗi/≥400 → bỏ đuôi `.<sha>` và lấy `/teach/<who>/<tên>` cùng gốc.
   - Trang: `Chars` gắn `onerror` 1 lần (img/video) đổi `src` sang `teach/…` cục bộ – cho lần tải đầu khi SW chưa cài.
5. **CSP**: thêm `https://teach.lexkite.com` vào `img-src`/`media-src`/`connect-src` trong `web/_headers` (đang Report-Only).
6. **Add-on MV3** (docs/CWS-RULES.md): giữ bản đóng gói `web/teach` như hiện nay (rsync trong `build-extension.sh`, đã loại `*-hd.mp4`) → không cần quyền host, chạy offline, không có mã từ xa. `characters.js` trong add-on luôn `BASE=''` (phát hiện `chrome-extension:`). Ảnh/clip từ xa vẫn hợp lệ với CWS nếu sau này muốn bỏ khỏi zip – quyết định riêng.
7. **Ghi đăng ký**: `infra/resources.json` mục `teach-cdn` (PR này).

## CI & cổng
- `teach-cdn.yml` (push main đổi `web/teach/**` + workflow_dispatch): dựng thư mục tạm với tên có băm + `_headers` → `wrangler pages deploy --project-name lexkite-teach` (secret `CLOUDFLARE_API_TOKEN` sẵn có, quyền Pages Edit) → bước **verify**: tải từng URL, so sha256 với `characters.json`, kiểm header CORS/immutable. Commit `[CF-Pages-Skip]` không cần – kho deploy riêng.
- `characters-gate.mjs` (npm test, không mạng): sha cục bộ (đã có) + bảng `H` trong characters.js khớp `files` + mọi tệp có mục băm. Kiểm kho thật = bước verify của `teach-cdn.yml` + chạy lại hằng tuần (cron) báo đỏ nếu lệch → "kiểm hash cả 2 nơi".
- Lần đầu: tạo dự án + gắn tên miền bằng wrangler/API (token có Pages Edit; nếu thiếu quyền DNS → dùng `lexkite-teach.pages.dev` trước, gắn tên miền là bước chủ bấm 1 lần).

## Thứ tự / no-cuts
1. PR này: spec + đăng ký infra. 2. Sau khi duyệt: PR logic (`teach-cdn.yml`, build.py sinh `H`, gate, SW, CSP) – `characters.js` sửa **sau khi PR #293 gộp**; `BASE` ban đầu rỗng, bật bằng PR 1 dòng khi verify xanh. 3. `web/teach/` **giữ nguyên** làm dự phòng; chỉ xem xét bỏ khỏi deploy Pages chính sau ≥14 ngày kho mới ổn + quyết định của chủ.

## Xong khi
- `teach.lexkite.com` trả 64 tệp, sha256 khớp, header immutable + CORS (log verify xanh).
- Web: giáo viên hiện từ kho mới, WebGL không lỗi tainted; chặn kho (DevTools block) → vẫn hiện từ `/teach/`.
- npm test + characters-gate xanh; add-on build không đổi.
