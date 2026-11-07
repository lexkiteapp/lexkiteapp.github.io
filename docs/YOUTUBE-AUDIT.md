# YouTube API audit + quota – hồ sơ soạn sẵn (05/11/2026)

> **Hiện trạng 05/11/2026 (điều phối đọc Gmail chủ):** đường CHÍNH lên YouTube = **GrabCast** (dự án `grabcast-youtube`, OAuth đã xác minh 04/10; Compliance Review YouTube API của GrabCast/Digidot: sửa V.1–V.3, trả lời 20/10, Google xác nhận 22/10, chưa có kết quả, đã nhắc trong luồng 05/11). Khi GrabCast qua audit: chủ nối kênh YouTube trên GrabCast → autopilot **tự bật** YouTube (`yt_gc_auto`, bài đầu vẫn chờ duyệt tay).
> Trong lúc chờ: **YouTube thủ công** ở Quản trị › Video › Gói chờ đăng tay (tải gói/tải tất cả, chép tiêu đề/mô tả/thẻ/hashtag/giờ hẹn, mở Studio đúng hộp tải lên; Studio nhận ≤ 15 video/lần, hẹn giờ trong Studio) – đồng bộ tự khớp marker `lk:<clip>`.
> Đường API trực tiếp của Lexkite (file này) chỉ là **dự phòng**: dự án chưa audit tải qua `videos.insert` thì video bị **khóa Private, không kháng nghị, không đổi Public được – phải tải lại** → không dùng chế độ `api` trước khi audit đạt.

> TL;DR: Lexkite đăng thẳng lên YouTube qua YouTube Data API v3 (`functions/api/youtube.js` + `.github/workflows/youtube-upload.yml`, upload resumable trên CI, refresh token mã hóa trong D1). Project Google Cloud **chưa qua audit** → mọi video tải qua API bị khóa **Private**. File này là bản nháp để chủ dán vào form audit + kịch bản quay video demo. Thiết lập 1 lần: [YOUTUBE-SETUP.md](YOUTUBE-SETUP.md) §1. Tài khoản: **vintagezulilyjewelry@gmail.com** (không dùng khieudinhthong).

## 1. Form
https://support.google.com/youtube/contact/yt_api_form → "I would like to request an API audit / quota extension". Đăng nhập bằng tài khoản chính ở trên.

## 2. Câu trả lời soạn sẵn (tiếng Anh, dán thẳng)

- **API client / app name:** Lexkite
- **Website:** https://lexkite.com · **Privacy policy:** https://lexkite.com/en/privacy · **Terms:** https://lexkite.com/en/terms
- **Google Cloud project number:** *(chủ lấy ở https://console.cloud.google.com/home/dashboard → Project number)*
- **Who uses the API client:** Internal only. Only the Lexkite owner (one admin account) uses it to publish Lexkite's own educational videos to Lexkite's own YouTube channel. No third-party users, no public sign-up, no access to other people's channels or data.
- **Use case:**
  Lexkite is a free English-learning app. We produce short educational videos (YouTube Shorts, 20–60 s) that teach one English phrase or grammar point each. Every video is reviewed by an automated quality gate and then approved by the owner in the Lexkite admin panel. Approved videos are uploaded to our own channel with the YouTube Data API v3 (`videos.insert`, resumable upload) from our CI server, with title, description, tags, category Education (27), `selfDeclaredMadeForKids=false` and `containsSyntheticMedia=true` (AI disclosure). We set a custom thumbnail (`thumbnails.set`) and read our own uploads (`playlistItems.list`, `videos.list`) to confirm processing and embed the videos on lexkite.com lesson pages.
- **Scopes:** `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`
- **API methods & daily volume:** `videos.insert` ≈ 1,600 units × up to 30/day; `thumbnails.set` 50 × 30; `videos.list` / `playlistItems.list` ≈ 1 unit × ~200. Requested quota: **50,000 units/day** (≈ 30 uploads/day).
- **Data handling:** OAuth refresh token stored encrypted (AES-GCM) on our server (Cloudflare D1), never shown in a browser, used only by our CI to upload. Video files go directly from our storage into the YouTube resumable session; no YouTube data is sold, shared or used for ads. The owner can disconnect at any time (admin button revokes the token and deletes it).
- **Compliance:** owner approves every upload; no automated mass-posting of third-party content; no misleading metadata; AI-generated presenters are disclosed via `containsSyntheticMedia` and in the description.

## 3. Video demo (screencast 2–3 phút, không tiếng cũng được) – chủ tự quay
Quay màn hình bằng QuickTime (File → New Screen Recording), tải lên YouTube ở chế độ **Unlisted**, dán link vào form.
1. Mở https://lexkite.com/admin.html → đăng nhập quản trị (che email nếu muốn).
2. Mục **Video** → Thư viện: một clip đã qua QC (chỉ điểm vào nhãn QC ✓).
3. Bấm **Duyệt & lên YouTube** → chọn Riêng tư / lịch đăng → thấy dòng "Chờ tải lên".
4. Dòng YouTube trên thư viện: tên kênh đã kết nối + hạn mức còn lại.
5. Mở tab **Social** → mục Kênh: YouTube "Kết nối trực tiếp (API)" + ghi chú "Private đến khi qua audit".
6. Mở YouTube Studio → video vừa tải (Private) có tiêu đề/mô tả/thumbnail đúng, "Altered or synthetic content: Yes".
7. (Tuỳ chọn) Màn hình đồng ý OAuth khi bấm **Kết nối YouTube**: chỉ 2 quyền upload + readonly.

## 4. Sau khi Google duyệt
- Đổi chế độ upload: Quản trị › Video › YouTube › chế độ **API** (`yt_meta.mode = 'api'`), hoặc env `YOUTUBE_UPLOAD_MODE=api` trên Cloudflare Pages.
- Video mới được giữ đúng privacy đã chọn (unlisted / publishAt theo lịch). Video cũ đang Private: đổi tay trong Studio hoặc duyệt lại.
- Nếu được cấp quota cao hơn: tăng `max` của `youtube-upload.yml` (mặc định 6/lượt).
