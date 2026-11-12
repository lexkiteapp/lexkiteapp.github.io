/* SỔ TÀI KHOẢN & KHÓA – nguồn duy nhất (Admin › Sổ tài khoản & khóa, functions/api/admin-accounts.js · spec docs/ACCOUNTS-LEDGER.md).
 * Chỉ TÊN biến/đường dẫn, phạm vi, ngày hết hạn, link quản lý. TUYỆT ĐỐI không ghi giá trị bí mật, không ghi email (email chủ nhập ở Admin, lưu D1).
 * store: pages (biến bí mật Cloudflare Pages – kiểm có/không ngay trên máy chủ) · github (Actions secrets – kiểm nếu token đọc được) · local (tệp ~/.config/lexkite, chỉ ghi nhận).
 * scripts/test/accounts.mjs: mọi secrets.X trong .github/workflows và env.X dạng bí mật trong functions phải có ở đây (tự đồng bộ tên). */
export const ROWS = [
 {
  "id": "pages-admin",
  "service": "Quản trị Lexkite",
  "account": "Cloudflare Pages · lexkite",
  "store": "pages",
  "names": [
   "ADMIN_EMAILS",
   "KEYS_ENC_KEY",
   "DRIVE_ENC_KEY",
   "LEXKITE_DRIVE_CLI_KEY",
   "LEXKITE_REPORT_CLI_KEY",
   "REPORT_SHOT_KEY",
   "CRON_KICK_SECRET",
   "PUSH_CRON_SECRET",
   "STUDIO_CALLBACK_SECRET"
  ],
  "scope": "Danh sách admin, khóa mã hóa kho khóa/Drive, khóa CLI/CI, bí mật cron",
  "manage": "https://dash.cloudflare.com/e34e14b7ab35eaf2b3d9d84fcce011f7/pages/view/lexkite/settings/environment-variables",
  "expires": "",
  "note": ""
 },
 {
  "id": "pages-github",
  "service": "GitHub (từ Pages)",
  "account": "GitHub · lexkiteapp",
  "store": "pages",
  "names": [
   "GH_DISPATCH_TOKEN"
  ],
  "scope": "Fine-grained, chỉ repo lexkiteapp.github.io, Actions đọc/ghi (chạy video.yml, sổ cron)",
  "manage": "https://github.com/settings/personal-access-tokens",
  "expires": "2027-11-02",
  "note": ""
 },
 {
  "id": "pages-github-issues",
  "service": "GitHub Issues (báo lỗi người dùng)",
  "account": "GitHub · braydanamilio-spec",
  "store": "pages",
  "names": [
   "GH_ISSUES_TOKEN"
  ],
  "scope": "Classic public_repo – tạo issue từ báo cáo trong app",
  "manage": "https://github.com/settings/tokens",
  "expires": "2027-01-31",
  "note": "Cloudflare chủ lexkiteapp là tài khoản cá nhân nên token fine-grained của tài khoản khác không với tới"
 },
 {
  "id": "pages-cloudflare",
  "service": "Cloudflare API (từ Pages)",
  "account": "Cloudflare · tài khoản chính",
  "store": "pages",
  "names": [
   "CF_API_TOKEN",
   "CF_ANALYTICS_TOKEN",
   "CF_AI_TOKEN",
   "CF_ACCOUNT_ID",
   "AI_B_TOKEN",
   "AI_B_ACCOUNT_ID",
   "D1B_TOKEN",
   "D1B_ACCOUNT_ID"
  ],
  "scope": "D1 / Workers AI / Analytics (tài khoản 2 = D1B, AI_B)",
  "manage": "https://dash.cloudflare.com/e34e14b7ab35eaf2b3d9d84fcce011f7/api-tokens",
  "expires": "",
  "note": ""
 },
 {
  "id": "pages-google",
  "service": "Google Cloud OAuth (Kho Drive, YouTube)",
  "account": "Google · dự án Lexkite",
  "store": "pages",
  "names": [
   "GOOGLE_DRIVE_CLIENT_ID",
   "GOOGLE_DRIVE_CLIENT_SECRET",
   "YOUTUBE_CLIENT_ID",
   "YOUTUBE_CLIENT_SECRET",
   "FIREBASE_API_KEY",
   "FCM_SA",
   "VAPID_PRIVATE_JWK"
  ],
  "scope": "OAuth client Drive/YouTube; Firebase; tài khoản dịch vụ FCM; khóa Web Push",
  "manage": "https://console.cloud.google.com/auth/clients",
  "expires": "",
  "note": ""
 },
 {
  "id": "pages-youtube-search",
  "service": "YouTube Data API v3 – tìm video #/watch (khóa API, dự án GCP RIÊNG)",
  "account": "Google · dự án riêng cho tìm kiếm",
  "store": "pages",
  "names": [
   "YOUTUBE_SEARCH_KEY"
  ],
  "scope": "functions/api/watch.js op=search (search.list + videos.list); chưa có khóa → RSS + link YouTube search. docs/specs/video-learn.md",
  "manage": "https://console.cloud.google.com/apis/credentials",
  "expires": "",
  "note": "Chờ chủ tạo (owner-pending)"
 },
 {
  "id": "pages-grabcast",
  "service": "GrabCast (đăng social)",
  "account": "GrabCast",
  "store": "pages",
  "names": [
   "GRABCAST_API_KEY",
   "GRABCAST_WEBHOOK_SECRET",
   "GRABCAST_WORKSPACE"
  ],
  "scope": "Lên lịch đăng, webhook trạng thái",
  "manage": "https://grabcast.click/admin.html",
  "expires": "",
  "note": ""
 },
 {
  "id": "pages-meta",
  "service": "Meta (Facebook/Instagram)",
  "account": "Meta · Lexkite",
  "store": "pages",
  "names": [
   "META_PAGE_TOKEN",
   "META_IG_TOKEN",
   "META_LOGIN_CONFIG_ID"
  ],
  "scope": "Graph API – đăng Page/Instagram",
  "manage": "https://developers.facebook.com/apps/",
  "expires": "",
  "note": ""
 },
 {
  "id": "pages-mail-ai",
  "service": "Thư & AI (Resend, Brevo, Gemini, Turnstile)",
  "account": "Resend / Brevo / Google AI Studio / Cloudflare",
  "store": "pages",
  "names": [
   "RESEND_API_KEY",
   "BREVO_API_KEY",
   "GEMINI_KEY",
   "TURNSTILE_SECRET_KEY",
   "HUMAN_TICKET_KEY",
   "SHORTS_READ_TOKEN"
  ],
  "scope": "Gửi thư, AI, chống bot. Khóa nhà cung cấp quản ở Admin › Khóa API",
  "manage": "https://lexkite.com/admin.html#keys",
  "expires": "",
  "note": "HUMAN_TICKET_KEY: TÙY CHỌN (≥ 32 ký tự, ký vé người thật 12 h – docs/HUMAN.md); chưa đặt thì dẫn xuất HMAC từ TURNSTILE_SECRET_KEY"
 },
 {
  "id": "gh-cloudflare",
  "service": "Cloudflare (CI)",
  "account": "Cloudflare · tài khoản chính (+ tài khoản 2)",
  "store": "github",
  "names": [
   "CLOUDFLARE_API_TOKEN",
   "CF_ACCOUNT_ID",
   "CF_ACCOUNT_2",
   "CF_AI_TOKEN",
   "CF_AI_TOKEN_2",
   "CF_ANALYTICS_TOKEN",
   "CF_ANALYTICS_TOKEN_2",
   "CF_POOL",
   "CF_PAGES_DEPLOY_HOOK",
   "R2_ACCESS_KEY_ID",
   "R2_SECRET_ACCESS_KEY"
  ],
  "scope": "Deploy Pages/Workers, D1, R2, AI pool",
  "manage": "https://github.com/lexkiteapp/lexkiteapp.github.io/settings/secrets/actions",
  "expires": "",
  "note": ""
 },
 {
  "id": "gh-ai-pools",
  "service": "AI pool & nhà cung cấp (CI)",
  "account": "Google AI Studio / Groq / GrabCast / Modal",
  "store": "github",
  "names": [
   "GEMINI_POOL",
   "GROQ_POOL",
   "GRABCAST_AI_KEY",
   "GRABCAST_API_KEY",
   "MODAL_TOKEN_ID",
   "MODAL_TOKEN_SECRET",
   "ELEVENLABS_API_KEY",
   "BRAVE_SEARCH_KEY"
  ],
  "scope": "Sinh nội dung, giọng, tìm kiếm",
  "manage": "https://github.com/lexkiteapp/lexkiteapp.github.io/settings/secrets/actions",
  "expires": "",
  "note": ""
 },
 {
  "id": "gh-zenodo",
  "service": "Zenodo (CERN) – nộp bằng chứng tác quyền restricted access, DOI",
  "account": "zenodo.org (owner)",
  "store": "github",
  "names": [
   "ZENODO_TOKEN"
  ],
  "scope": "deposit:write + deposit:actions – content-evidence.yml ngày 1 hằng tháng (docs/CONTENT-PROTECTION.md §4c)",
  "manage": "https://zenodo.org/account/settings/applications/",
  "expires": "",
  "note": "Tạo 3/11/2026. Xoay vòng: tạo token mới cùng scope → cập nhật secret → xóa token cũ."
 },
 {
  "id": "gh-deploy-keys",
  "service": "Khóa deploy kho media (CI)",
  "account": "GitHub · lexkiteapp",
  "store": "github",
  "names": [
   "BOT_DEPLOY_KEY",
   "FOOTAGE_DEPLOY_KEY",
   "SHORTS_DEPLOY_KEY",
   "MEDIA2_DEPLOY_KEY",
   "MEDIA4_DEPLOY_KEY",
   "LEXKITE_MEDIA_TOKEN"
  ],
  "scope": "Ghi vào các kho lexkite-media/footage/shorts",
  "manage": "https://github.com/lexkiteapp/lexkiteapp.github.io/settings/secrets/actions",
  "expires": "",
  "note": ""
 },
 {
  "id": "gh-lexkite-ci",
  "service": "Lexkite CI nội bộ",
  "account": "Lexkite",
  "store": "github",
  "names": [
   "LEXKITE_DRIVE_CLI_KEY",
   "LEXKITE_REPORT_CLI_KEY",
   "LEXKITE_CI_HEADER",
   "STUDIO_CALLBACK_SECRET"
  ],
  "scope": "CI gọi API quản trị của chính mình",
  "manage": "https://github.com/lexkiteapp/lexkiteapp.github.io/settings/secrets/actions",
  "expires": "",
  "note": ""
 },
 {
  "id": "gh-stores",
  "service": "Cửa hàng ứng dụng (CI)",
  "account": "Apple / Google Play / Chrome Web Store",
  "store": "github",
  "names": [
   "ASC_KEY_ID",
   "ASC_ISSUER_ID",
   "ASC_KEY_P8",
   "ASC_REVIEW_PHONE",
   "ANDROID_KEYSTORE_BASE64",
   "ANDROID_KEYSTORE_PASSWORD",
   "ANDROID_KEY_ALIAS",
   "ANDROID_KEY_PASSWORD",
   "PLAY_SERVICE_ACCOUNT_JSON",
   "CWS_CLIENT_ID",
   "CWS_CLIENT_SECRET",
   "CWS_REFRESH_TOKEN",
   "CWS_PUBLISHER_ID",
   "CWS_EXTENSION_ID",
   "OTA_SIGNING_KEY",
   "PLAY_SERVICE_ACCOUNT_JSON"
  ],
  "scope": "Phát hành TestFlight, Play, CWS; ký OTA; đọc đánh giá App Store/Play (store-reviews.yml – PLAY_SERVICE_ACCOUNT_JSON chưa tạo)",
  "manage": "https://appstoreconnect.apple.com/",
  "expires": "",
  "note": ""
 },
 {
  "id": "gh-ios-signing",
  "service": "Ký iOS cố định (CI)",
  "account": "Apple Developer · team B285J68262",
  "store": "github",
  "names": [
   "IOS_DIST_P12_BASE64",
   "IOS_DIST_P12_PASSWORD",
   "IOS_PROFILE_APP_BASE64",
   "IOS_PROFILE_WIDGET_BASE64"
  ],
  "scope": "Chứng chỉ Apple Distribution (.p12 + mật khẩu) và hồ sơ App Store app/widget cho ký Manual trên CI (scripts/native/ios-sign.sh) – tạo/gia hạn: docs/CI-SIGNING-IOS.md",
  "manage": "https://appstoreconnect.apple.com/",
  "expires": "",
  "note": "Gia hạn mỗi năm (chứng chỉ + hồ sơ hết hạn 1 năm sau create-dist)"
 },
 {
  "id": "gh-google",
  "service": "Google (CI)",
  "account": "Google · dự án Lexkite",
  "store": "github",
  "names": [
   "GSC_SA_JSON",
   "ADS_OAUTH_CLIENT_ID",
   "ADS_OAUTH_CLIENT_SECRET",
   "ADS_OAUTH_REFRESH",
   "FCM_SA"
  ],
  "scope": "Search Console, báo cáo AdSense/AdMob; FCM_SA = JSON service account lexkite-push (Firebase Cloud Messaging API Admin) cho dry-run validate_only (push-fcm.yml)",
  "manage": "https://console.cloud.google.com/apis/credentials",
  "expires": "",
  "note": ""
 },
 {
  "id": "local-stitch",
  "service": "Google Stitch (thiết kế)",
  "account": "3 tài khoản Google + 1 dự phòng",
  "store": "local",
  "names": [
   "~/.config/lexkite/stitch-key",
   "~/.config/lexkite/stitch-key-2",
   "~/.config/lexkite/stitch-key-3",
   "~/.config/lexkite/stitch-key-4"
  ],
  "scope": "MCP Stitch ~400 lượt/24h mỗi khóa; key4 dự phòng",
  "manage": "https://stitch.withgoogle.com/",
  "expires": "",
  "note": ""
 },
 {
  "id": "local-cf",
  "service": "Cloudflare (máy chủ dự án)",
  "account": "Cloudflare · tài khoản chính / 2",
  "store": "local",
  "names": [
   "~/.config/lexkite/cf-token",
   "~/.config/lexkite/cf-token-2"
  ],
  "scope": "wrangler từ máy",
  "manage": "https://dash.cloudflare.com/e34e14b7ab35eaf2b3d9d84fcce011f7/api-tokens",
  "expires": "",
  "note": ""
 },
 {
  "id": "local-android",
  "service": "Khóa ký Android",
  "account": "Play App Signing",
  "store": "local",
  "names": [
   "~/.config/lexkite/android-upload.p12",
   "~/.config/lexkite/android-upload.pass"
  ],
  "scope": "Upload key – sao lưu 2 nơi",
  "manage": "https://play.google.com/console",
  "expires": "",
  "note": ""
 }
];
