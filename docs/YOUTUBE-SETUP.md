# YouTube – tải short đã duyệt lên kênh ($0)

Code: `functions/api/youtube.js` (+ `youtube/callback.js`) · `scripts/video/yt-upload.mjs` · `.github/workflows/youtube-upload.yml` ·
nút trong **Quản trị → 🎬 Thư viện video** (`web/js/admin-video.js`). Lưu trữ: `docs/VIDEO-STORAGE.md`.

## 0. Hiện tại: ĐĂNG TAY qua YouTube Studio (tới khi qua kiểm định API, §3)

Video tải bằng API từ project chưa kiểm định bị khoá **private** → không nhúng được. Nên mặc định `mode = manual`: chủ bấm tải lên trong Studio
(ở chế độ **Unlisted**), mọi việc còn lại tự động. Cờ: Quản trị → Thư viện video → **Cách đăng** (D1 `yt_meta.mode`, mặc định env
`YOUTUBE_UPLOAD_MODE` hoặc `manual`). Qua kiểm định → chọn **Tự động qua API** + **Kết nối lại YouTube** (thêm quyền `youtube.upload`) → đường API (§2) chạy tiếp.

- **Duyệt & tạo gói đăng** (1 clip hoặc chọn nhiều) → trạng thái **Sẵn sàng đăng**; `youtube-manual.yml` (gọi ngay qua `GH_DISPATCH_TOKEN`, cron :07/:37)
  dựng gói `shorts/_ytpack/<clip>.zip` trên Kho Drive (`scripts/video/yt-pack.mjs`): `<clip>.mp4` (master) · `cover.jpg` · `title.txt` (câu mở đầu, ≤ 100 ký tự, EN) ·
  `description.txt` (bài học + link `https://lexkite.com/video/<slug>/` + `#shorts …` + dòng cuối **`lk:<clip>`**) · `tags.txt` · `settings.txt`.
- Thẻ mỗi clip trong Quản trị: **Tải gói**, chép tiêu đề/mô tả/thẻ, **Mở YouTube Studio**, danh sách kiểm 6 bước, ô **dán link** dự phòng.
- **Đồng bộ** (nút + cron 30 phút): chỉ quyền `youtube.readonly` → `playlistItems` của playlist uploads (≈ 1 đơn vị/50 video) → tìm `lk:<clip>` →
  `videos.list` (1 đơn vị) kiểm **unlisted/public + xử lý xong + độ dài khớp ±1,5 s** → clip **Trên web**: op `ids` trả `youtube_id`, `video-web.yml`
  (tự chạy khi `web/data/videos.json` còn thiếu) ghi vào manifest → bài học nhúng YouTube y như đăng bằng API. Video riêng tư / đang xử lý / sai file /
  thiếu dòng `lk:` / đăng trùng → báo trên thẻ + bản tin email 8h (workers/mail). Gói của clip đã trên web 3 ngày → thùng rác Drive.
- Trạng thái: **Đang tạo gói → Sẵn sàng đăng → Đã đăng (dò thấy) → Trên web**.

**Lần đầu (chủ, ~5 phút):** §1 bước 1–2 (bật API, redirect URI) · thêm quyền `.../auth/youtube.readonly` · Quản trị → Thư viện video →
**Kết nối YouTube** → chọn kênh Lexkite → màn "chưa xác minh" → **Advanced → Go to Lexkite** → **Allow** (chỉ quyền xem).
Rồi mỗi clip: **Tải gói** → giải nén → https://studio.youtube.com → **Create → Upload videos** → chọn `<clip>.mp4` → dán `title.txt`, `description.txt`
(giữ dòng `lk:<clip>`) → bìa `cover.jpg` → *No, it's not made for kids* → **Show more**: *Altered content = Yes*, Tags = `tags.txt`, Category = Education →
Visibility **Unlisted** → Save → bấm **Đồng bộ** (hoặc chờ ≤ 30 phút).

**Không tự động hoá YouTube Studio** bằng bot trình duyệt (Puppeteer/Selenium/extension) hay lưu cookie/mật khẩu Google của chủ: vi phạm Điều khoản YouTube
(https://www.youtube.com/t/terms – cấm truy cập bằng phương tiện tự động ngoài API) và buộc giữ thông tin đăng nhập của chủ. Chỉ dùng API chính thức + OAuth.

## 1. Việc của chủ – một lần (~10 phút, tài khoản chính thức vintagezulilyjewelry@gmail.com)

Dùng **cùng Google Cloud project với Kho Drive** (project "Lexkite" – client Web `GOOGLE_DRIVE_CLIENT_ID`; Firebase `lexkite-app` chỉ để đăng nhập, không dùng).
Không cần secret mới (máy chủ dùng lại client của Kho Drive; muốn tách thì thêm `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` trên Cloudflare Pages).

1. Bật API: https://console.cloud.google.com/apis/library/youtube.googleapis.com → **Enable** (chọn project Lexkite).
2. Thêm địa chỉ trả về vào client Web của Kho Drive: https://console.cloud.google.com/auth/clients → mở client đang dùng cho Kho Drive →
   **Authorized redirect URIs** → thêm `https://lexkite.com/api/youtube/callback` → Save.
3. Thêm quyền: https://console.cloud.google.com/auth/scopes → **Add or remove scopes** → `.../auth/youtube.readonly` (đăng tay, §0) + `.../auth/youtube.upload` (khi bật API) → Save.
   (Phạm vi "nhạy cảm": chỉ chủ dùng nên không cần Google thẩm định; màn hình đồng ý có thể báo "chưa xác minh" → **Advanced → Go to Lexkite**.
   App phải ở **In production** (https://console.cloud.google.com/auth/audience) – chế độ Testing làm token hết hạn sau 7 ngày.)
4. **Kết nối**: mở https://lexkite.com/admin.html#video → **Kết nối YouTube** → chọn đúng kênh Lexkite (kênh thương hiệu nếu có) → **Allow**.
   Trang quay về, dòng YouTube hiện tên kênh + hạn mức. Chỉ chủ bấm; Claude/CI không bao giờ đăng nhập Google thay chủ.
5. (Khuyên) Xác minh kênh để dùng ảnh bìa tuỳ chỉnh: https://www.youtube.com/verify (chưa xác minh → video vẫn lên, chỉ không đặt được bìa).

## 2. Dùng hằng ngày

- Thư viện video → mở 1 clip → **Duyệt & lên YouTube**, hoặc **☑ Chọn nhiều** → chọn → **Duyệt & lên YouTube (n)**.
- Chế độ: **Riêng tư** (mặc định) – nếu tick *Theo lịch đăng*, clip có ô lịch sẽ có `publishAt` = giờ lịch (YouTube tự công khai đúng giờ);
  hoặc **Không công khai (unlisted)**. Không có đường nào đăng **public** ngay.
- `youtube-upload.yml` chạy 4 lần/ngày: ≤ 6 video/ngày (10.000 đơn vị; 1 lần tải ≈ 1.600 + bìa 50), phần còn lại giữ trong hàng chờ, tự tiếp tục
  (phiên resumable dùng lại ≤ 20 h, lỗi mạng → tải tiếp từ byte đã nhận). Dòng YouTube trên thư viện báo hạn mức còn lại + số chờ/đã lên.
- Siêu dữ liệu: tiêu đề tiếng Anh (câu mở đầu + điểm học), mô tả có bài học + link `https://lexkite.com/video/<slug>/` + `#shorts #learnenglish #<chủ đề>`,
  tags, categoryId 27 (Education), `selfDeclaredMadeForKids=false`, `containsSyntheticMedia=true` (công bố AI), ngôn ngữ en, ảnh bìa làm thumbnail.
- Video xem được (unlisted, hoặc đã tới `publishAt`) → `video-web.yml` ghi `youtube_id` vào `web/data/videos.json` → web dùng mặt tiền YouTube.

## 3. Kiểm định API (API compliance audit) – BẮT BUỘC trước khi video được công khai

Google khoá mọi video tải qua API từ project **chưa kiểm định** ở chế độ **private** (kể cả khi chọn unlisted/publishAt). Việc của chủ (miễn phí):
1. Mở form: https://support.google.com/youtube/contact/yt_api_form → chọn **"I would like to request an API audit / quota extension"**.
2. Điền: project number (https://console.cloud.google.com/home/dashboard → Project number), tên app "Lexkite", website https://lexkite.com,
   chính sách https://lexkite.com/en/privacy, mục đích: "Upload our own educational English shorts to our own channel; owner approves every video;
   ~6 uploads/day; no third-party users". Kèm ảnh chụp trang Quản trị (nút Duyệt) nếu được hỏi.
3. Xin tăng hạn mức cùng form nếu cần > 6 video/ngày (ví dụ 50.000 đơn vị/ngày ≈ 30 video).
4. Google trả lời qua email (thường 1–4 tuần). Trong lúc chờ: video vẫn lên ở private – chủ có thể đổi tay sang public trong YouTube Studio.
Điều khoản: https://developers.google.com/youtube/terms/developer-policies · hạn mức: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

## 4. Bảo mật

Refresh token mã hoá AES-GCM bằng `DRIVE_ENC_KEY` (AAD = `youtube:<id kênh>`) trong D1 `yt_channel`; access token chỉ trong bộ nhớ < 50 phút.
OAuth `state` ký HMAC + cookie `lk_yt` HttpOnly + dùng 1 lần (`yt_nonce`), chỉ email quản trị. CI chỉ gọi được `ids · next · session · done · fail · quota`
(HMAC `LEXKITE_DRIVE_CLI_KEY`) – không duyệt, không đổi chế độ. Byte video không đi qua Worker (CI PUT thẳng vào phiên của Google).
Ngắt kết nối = thu hồi token ở Google + xoá dòng (`disconnect`).

## Nhiều kênh (22/10/2026)
- Google chỉ cấp quyền cho MỘT kênh mỗi lần đồng ý. "Thêm kênh" chạy lại OAuth với `prompt=select_account consent` → màn hình chọn tài khoản/kênh thương hiệu hiện lại; mỗi kênh được lưu một hàng `yt_channel` (không còn xóa kênh khác).
- Kênh mặc định (`yt_meta.default_channel`, radio trong Quản trị → Video → YouTube) là đích của gói đăng, link Studio và tải API. `sync` quét playlist uploads của MỌI kênh đã kết nối và ghi kênh tìm thấy video vào `yt_queue.channel_id`; kênh mất quyền bị bỏ qua + báo lỗi (không bị coi là video biến mất).
- Op: `setdefault {channel_id}`, `disconnect {channel_id}` (DANGER: đăng nhập ≤ 15 phút, thu hồi token rồi xóa hàng).
