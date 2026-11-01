# Thư viện video quản trị – phát từ Kho Drive riêng (không cần token GitHub)

> TL;DR: Thư viện video quản trị phát từ Kho Drive riêng (repo riêng tư lexkite-shorts), không cần token GitHub; luồng và dữ liệu. Việc của chủ: không còn.
> Đọc khi: sửa thư viện video.

Quản trị → **🎬 Thư viện video** (`web/js/admin-video.js`) gọi `functions/api/admin-shorts.js` (sau `adminGate`).
Bản gốc nằm ở repo **riêng tư** `lexkiteapp/lexkite-shorts`; bản phát cho admin nằm ở **Kho Drive riêng** (`functions/api/drive.js`,
3 Google Drive của chủ, ≈ 46 GB trống). Máy chủ đọc Drive bằng refresh token OAuth của kho (mã hoá AES-GCM trong D1) rồi phát lại qua
URL ký ngắn hạn (HMAC từ `DRIVE_ENC_KEY`, ≤ 2 giờ, chuyển tiếp HTTP Range tới `alt=media`). Token không bao giờ tới trình duyệt.

## Việc của chủ: KHÔNG CÒN (từ 22/10/2026)

Không cần tạo `SHORTS_READ_TOKEN`. Secret dùng lại đã có trên Cloudflare Pages: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`,
`DRIVE_ENC_KEY` (Kho Drive). Kiểm: mở `/admin.html#video` → dòng nguồn "Kho Drive riêng (trực tiếp)", bìa hiện, bấm video phát được.

## Luồng

1. `cine-render.yml` (cả bản tin `scene=news`) lưu bài ĐẠT: công thức + meta + `shorts/index.json` vào `lexkite-shorts`, master + bìa thẳng lên Kho Drive (`scripts/cine/archive_new.sh`) – repo không còn mp4 (`docs/VIDEO-STORAGE.md`).
2. `drive-shorts.yml` (sau mỗi cine-render + hằng ngày 04:23 UTC + chạy tay): tải mp4 + bìa lên kho (`scripts/video/drive-shorts.mjs`),
   ghi `item.drive.{video,cover}` (driveId, fileId) vào `shorts/index.json`, rồi `shorts_index.py manifest` (index + coverage + lịch + credit)
   → tải lên kho `shorts/_admin/admin-shorts.json` (2 bản sao, mỗi lượt 1 file mới có `built`).
3. `admin-shorts.js` lấy manifest = dòng mới nhất (`status ok`) của `drive_files` theo thư mục + tên cố định → đọc từ Drive (đệm 5 phút/isolate).
   Bìa/video: URL ký `?f=<fileId>&d=<driveId>&k=v|c&n=<tên>&e&s` → Drive `alt=media` (Range chuyển tiếp; Drive bỏ qua Range → tự cắt).
   Bìa đệm Cache API Cloudflare 1 ngày (khóa băm bí mật) → không tốn hạn mức Drive API; trình duyệt `private, max-age=3600`.
4. Thứ tự dự phòng manifest/media: Kho Drive → repo riêng (chỉ khi secret tuỳ chọn `SHORTS_READ_TOKEN` tình cờ tồn tại) → bản gói sẵn
   `functions/api/_shorts_data.js` (không media). Short chưa lên kho → không có bìa/video cho tới lượt drive-shorts kế tiếp.

## Dữ liệu

| Nguồn | Tạo bởi | Ghi chú |
|---|---|---|
| `shorts/index.json` (repo riêng) | `scripts/cine/store_shorts.py` mỗi lần CI lưu bản đạt QA; dựng lại toàn bộ: `scripts/cine/shorts_index.py full <checkout>` | id, cảnh/định dạng, mẫu, lĩnh vực, CEFR, điểm học, thời lượng, QA + số đo, ngày dựng, lịch đăng, dung lượng, đường dẫn bìa/video |
| `functions/api/_shorts_data.js` (repo công khai, chỉ phục vụ sau adminGate) | `python3 scripts/cine/shorts_index.py public <index.json>` | bản sao manifest + `coverage.json` + lịch đăng + tóm tắt credit; không media |
| `content/video/cine/credits.json` | `python3 scripts/cine/credits_summary.py "<thư mục repo chính>"` | chỉ tổng credit theo kho/ngày; sổ `ledger.txt` (có mã tác vụ Kling) không commit |

Bản gói sẵn chỉ còn là dự phòng; làm mới khi muốn: tải `shorts/index.json` của repo riêng → chạy lệnh `public` → commit.
Manifest sống: `python3 scripts/cine/shorts_index.py manifest <index.json> <out.json>` (drive-shorts.yml tự chạy).
