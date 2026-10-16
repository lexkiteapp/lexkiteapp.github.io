# Add-on Chrome Lexkite – quy tắc Chrome Web Store & quy trình phát hành

Mọi thay đổi trong `extension/` (và mã web được chép vào `extension/app/`) phải giữ đúng các quy tắc dưới đây. `node scripts/cws-check.mjs` (chạy trong `npm test` và trước mỗi lần đăng) tự kiểm phần lớn; phần còn lại là trách nhiệm người sửa.

## 1. Quy tắc bắt buộc (vi phạm = bị từ chối hoặc gỡ)

1. **Không mã từ xa.** Mọi JS/WASM phải nằm trong gói. Cấm `<script src="https://…">`, `import('https://…')`, `importScripts(url ngoài)`, `eval`, `new Function`, tải JS rồi chạy. Được phép tải **dữ liệu** (JSON, văn bản, âm thanh, ảnh). Thư viện bên thứ ba ⇒ chép vào gói. Mã web cần CDN (Firebase SDK, AdSense, Turnstile, transformers.js) ⇒ `scripts/build-extension.sh` xóa URL trong bản add-on; thêm thư viện CDN mới vào web ⇒ thêm vào danh sách xóa đó.
2. **Quyền tối thiểu & đã khai báo.** Quyền hiện tại nằm trong `store/chrome/permissions.lock.json`. Thêm/bớt quyền, host, `content_scripts.matches`, trang ghi đè (tab mới…) ⇒ cập nhật **cùng lúc**: lock file, lý do trong `store/chrome/PRIVACY-PRACTICES.md`, chính sách `content/legal/{en,vi}/privacy.html` (+ `node scripts/build-legal.mjs`), rồi sửa lý do trên dashboard trước khi gửi. Quyền mới ⇒ duyệt lâu hơn và Chrome có thể tắt add-on chờ người dùng đồng ý lại → chỉ thêm khi thật cần (ưu tiên `optional_permissions`).
3. **Dữ liệu khai đúng sự thật.** Bất kỳ dữ liệu mới nào rời khỏi máy người dùng (API mới, thống kê mới, trường mới gửi về `/api/hit` hay `/api/sync`) ⇒ cập nhật chính sách + mục Data usage trên dashboard **trước** khi phát hành. Không bán/chia sẻ dữ liệu cho quảng cáo; add-on **không có quảng cáo**.
4. **Một mục đích duy nhất**: học từ vựng khi duyệt web (tra/dịch/lưu/ôn); Soát lỗi viết (mặc định tắt) nằm trong mục đích này vì nó DẠY: giải thích lỗi, nối bài ngữ pháp, Sổ lỗi sai – không quảng bá như công cụ sửa văn bản chung. Tính năng không liên quan (chặn quảng cáo, đổi công cụ tìm kiếm, ví tiền…) không đưa vào add-on. Ô tìm kiếm ở tab mới phải dùng `chrome.search.query` (công cụ mặc định của người dùng), không tự đổi công cụ tìm kiếm.
5. **Không phá trang người khác**: giao diện trong Shadow DOM, CSS chèn trang chỉ nhắm phần tử riêng (`vb-mark`), không chặn phím tắt của trang ngoài trường hợp đã có (Esc/P khi bảng tra mở, A/S/D trên YouTube khi có phụ đề); không gửi nội dung trang đi đâu ngoài đoạn người dùng chủ động chọn. Soát lỗi viết: chỉ đọc ô người dùng đang gõ khi đã bật; bỏ qua mật khẩu/email/số/thẻ, trang ngân hàng – thanh toán; chỉ gửi LanguageTool khi bật "Kiểm nâng cao" (≤ 20 lượt/phút).
6. **Cầu nối dữ liệu** (`content.js`) chỉ mở với tên miền mình đang sở hữu (lexkite.com, lexkite.pages.dev). Không bao giờ thêm tên miền không kiểm soát.
7. **Không bí mật trong gói/repo.** Khóa API của mình không được nằm trong `extension/` (khóa công khai như Firebase web key, Turnstile site key là chấp nhận được). Khóa Gemini là của người dùng, chỉ lưu `chrome.storage.local`.
8. **Phiên bản tăng dần**: `version` 1–4 số, mỗi số ≤ 65535, luôn lớn hơn bản trên cửa hàng (API từ chối nếu không tăng).
9. **Không gây hiểu nhầm trong listing**: không hứa điều add-on không làm, ghi rõ không liên kết với IELTS/TOEIC/ETS/British Council; ảnh chụp từ giao diện thật (`scripts/store-shots.mjs`).
10. **MV3 service worker**: không giữ trạng thái quan trọng trong biến toàn cục (SW ngủ sau ~30 giây) → lưu `chrome.storage`; dùng `chrome.alarms` thay `setInterval` dài; alarm dày (dev-reload) chỉ cho bản phát triển.

## 2. Giới hạn của cửa hàng
- Mỗi lúc chỉ **1 bản chờ duyệt**; muốn gửi bản khác ⇒ chờ duyệt xong hoặc hủy (dashboard / API `:cancelSubmission`).
- Duyệt: vài giờ – vài ngày; bản thêm quyền/host rộng duyệt lâu hơn. Nên gom thay đổi, **1–2 tuần/bản**.
- Mô tả ngắn ≤ 132 ký tự (`_locales/*/messages.json` → `appDesc` cũng ≤ 132), tên ≤ 75; tối đa 5 ảnh 1280×800 mỗi ngôn ngữ.
- Tối đa 20 item mỗi tài khoản nhà phát triển. Không mất phí khi cập nhật.

## 3. Phát hành bản mới (tự động)
1. Sửa add-on, `npm test` PASS (gồm `cws-check`), đẩy lên `main`.
2. GitHub → **Actions → "Đăng add-on Chrome Web Store" → Run workflow** (`publish` = tải gói + gửi duyệt; `upload` = chỉ tải gói làm bản nháp).
3. Workflow: lấy phiên bản đang có trên cửa hàng → build zip → `cws-check --store-version` → tải gói → gửi duyệt. Dừng nếu đang có bản chờ duyệt.
4. Mô tả, ảnh, mục quyền riêng tư **không** đổi qua API → sửa tay trên dashboard khi cần (nội dung chuẩn ở `store/chrome/`, trang copy nhanh `store/chrome/fill.html`).

Thủ công (dự phòng): `bash scripts/build-extension.sh --zip` → `node scripts/cws-check.mjs --zip store/lexkite-extension.zip` → dashboard → Package → Upload new package → Submit for review.

## 4. Thiết lập workflow (làm 1 lần, sau khi bản đầu tiên đã được tạo trên dashboard)
Bản đầu tiên phải tạo tay trên dashboard và đặt Visibility ít nhất một lần; sau đó API mới đăng được.

1. **ID**: dashboard → item Lexkite → lấy *Item ID* (32 chữ cái) ⇒ `CWS_EXTENSION_ID`; dashboard → *Publisher → Settings* → *Publisher ID* ⇒ `CWS_PUBLISHER_ID`.
2. **Google Cloud** (đăng nhập vintagezulilyjewelry@gmail.com): https://console.cloud.google.com → tạo project "lexkite-cws" → *APIs & Services → Library* → bật **Chrome Web Store API**.
3. *OAuth consent screen*: User type **External**, tên app "Lexkite CWS", email hỗ trợ = email trên → thêm chính email đó vào Test users → sau đó bấm **Publish app** (chuyển sang *In production*; nếu để *Testing* thì refresh token hết hạn sau 7 ngày). Không cần xác minh của Google vì chỉ mình dùng.
4. *Credentials → Create credentials → OAuth client ID*: loại **Web application**, Authorized redirect URI: `https://developers.google.com/oauthplayground` ⇒ ghi lại *Client ID* và *Client secret*.
5. **Refresh token**: mở https://developers.google.com/oauthplayground → ⚙️ → tick *Use your own OAuth credentials* → dán Client ID/secret → ô *Input your own scopes*: `https://www.googleapis.com/auth/chromewebstore` → *Authorize APIs* (chọn email trên) → *Exchange authorization code for tokens* → chép **Refresh token**.
6. **GitHub secrets** (repo lexkiteapp/lexkiteapp.github.io → Settings → Secrets and variables → Actions → New repository secret): `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`. Tuyệt đối không dán các giá trị này vào code, issue hay chat.
7. Chạy thử workflow với `mode = upload` → thấy bản nháp mới trên dashboard là xong.

Lỗi thường gặp: `invalid_grant` ⇒ refresh token hết hạn/bị thu hồi (làm lại bước 5, kiểm consent screen đã *In production*); `fetchStatus` 403/404 ⇒ sai Publisher ID / Item ID hoặc email OAuth không phải chủ item; upload báo version ⇒ tăng `version`.

## 5. Kiểm thử – KHÔNG dùng tài khoản thật của người dùng
- Không mở trang cần đăng nhập (Apple App Store Connect, Google, ngân hàng, email…) bằng trình duyệt/tài khoản thật của anh Quyền để kiểm thử hay chụp ảnh: tự điều hướng có thể làm phiên đăng nhập bị đăng xuất/khóa (đã xảy ra với App Store Connect 16/10/2026).
- Cần bố cục giống trang thật → dựng **trang mẫu tĩnh** trong `scripts/test/fixtures/` (chữ tự viết, không chép nội dung/logo/CSS của bên khác) và kiểm bằng `scripts/test/ext-e2e.mjs` trên CI (vd. `fixtures/notice-card.html`: thẻ thông báo sáng/tối, CSS reset mạnh).
- Trang công khai không đăng nhập (Wikipedia, BBC, GitHub…) thì được dùng trong ext-e2e.
