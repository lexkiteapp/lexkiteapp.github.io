/* Trang quản trị Lexkite – gọi /api/admin (máy chủ tự kiểm tra email quản trị trong ADMIN_EMAILS).
 * Khung: thanh bên theo nhóm (ngăn kéo trên điện thoại) · đầu trang (tiêu đề, mô tả, nút) · bảng lệnh Ctrl/⌘+K · toast · hộp thoại xác nhận.
 * Đường dẫn #tab giữ nguyên (kể cả #drive/<mục>?…, #keys?…) để mở lại/chia sẻ. Các tab nặng tải lười (js/admin-*.js). */
(() => {
  const $ = s => document.querySelector(s), main = $('#main');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // ---------- Ngôn ngữ trang quản trị: chỉ Tiếng Việt / English (riêng cho admin, không dùng hệ I18N của app) ----------
  // Khóa = chuỗi tiếng Việt nguyên văn; {tên} = chỗ điền; "…@@ngữ cảnh" = cùng chữ Việt nhưng nghĩa Anh khác; [một, nhiều] = số ít/nhiều theo {n}
  let LANG = (() => { try { const v = localStorage.getItem('lk.admLang'); if (v === 'vi' || v === 'en') return v; } catch (e) { /* bỏ qua */ } return /^vi/i.test(navigator.language || '') ? 'vi' : 'en'; })();
  const EN = {
    // Khung, thanh bên, đăng nhập
    'Bỏ qua tới nội dung': 'Skip to content', 'Mở menu': 'Open menu', 'Đóng menu': 'Close menu', 'Đi tới…': 'Go to…', 'Điều hướng quản trị': 'Admin navigation',
    'Tổng quan': 'Overview', 'Phân tích': 'Analytics', 'Quảng cáo': 'Ads', 'Cờ theo nền tảng, công tắc khẩn cấp, doanh thu ước tính, tần suất, cổng giữ chân và đồng ý theo vùng.': 'Per-platform flags, kill switch, estimated revenue, frequency caps, retention guard and consent by region.', 'Người dùng': 'Users', 'Hộp thư': 'Inbox', 'Thông báo': 'Notices', 'Cảnh báo': 'Alerts', 'Báo lỗi': 'Reports', 'Chất lượng': 'Quality', 'Nội dung & Video': 'Content & Video',
    'Video & Social': 'Video & Social', 'Kênh & phân phối': 'Channels & distribution', 'Kênh nhúng cho bài học, kênh mạng xã hội, luật định tuyến và lịch đăng theo kênh.': 'Lesson embed channels, social channels, routing rules and per-channel calendar.', 'Video Studio': 'Video Studio', 'Hệ thống': 'System', 'Hạn mức': 'Quotas', 'Kho Drive': 'Drive storage', 'Khóa API': 'API keys', 'Dịch vụ & API': 'Services & API', 'Cài đặt': 'Settings',
    'Sức khỏe hệ thống, người thật và tác vụ tự động trên một màn hình.': 'System health, real people and automated jobs on one screen.',
    'Lưu lượng trực tiếp, nguồn truy cập, thói quen sử dụng và tăng trưởng.': 'Live traffic, sources, usage habits and growth.',
    'Tài khoản đã đồng bộ: tìm, lọc, xem chi tiết, xuất CSV, xóa dữ liệu theo yêu cầu.': 'Synced accounts: search, filter, inspect, export CSV, delete data on request.',
    'Tin nhắn từ form Liên hệ – trả lời và đánh dấu đã xử lý.': 'Messages from the Contact form – reply and mark as handled.',
    'Gửi thông báo tới chuông 🔔 của người học: soạn, hẹn giờ, chọn đối tượng, thu hồi, xem lượt đọc.': 'Send notices to learners\' 🔔 bell: compose, schedule, target, revoke, view reads.',
    'Tác vụ tự động, lỗi JavaScript từ người dùng và nhật ký quản trị.': 'Automated jobs, JavaScript errors from users and the admin audit log.',
    'Báo lỗi từ người dùng: phân loại, giao việc, phản hồi.': 'User bug reports: triage, assign, reply.',
    'Điểm rà soát tự động hằng ngày và kiểm nghĩa bản dịch.': 'Daily automated review score and translation meaning checks.',
    'Soạn bài, lịch đăng và kênh mạng xã hội (GrabCast).': 'Compose posts, schedule and manage social channels (GrabCast).',
    'Dây chuyền sản xuất video tự động từ kịch bản tới lên lịch.': 'Automated video production pipeline from script to schedule.',
    'Trung tâm video': 'Video hub', 'Việc cần làm, duyệt, thư viện, sản xuất & QC, kịch bản và kênh đăng cho mọi video ngắn.': 'To-dos, review, library, production & QC, scripts and posting channels for every short video.',
    'Thư viện video': 'Video library', 'Xem mọi short đã dựng (kho riêng lexkite-shorts), lọc, phát thử, chép nội dung đăng và thống kê độ phủ, QA, credit.': 'Browse every rendered short (private lexkite-shorts store): filter, play, copy post text, and coverage, QA and credit statistics.',
    'Backlink, PR & Thương hiệu': 'Backlinks, PR & Brand', 'Bài PR, hồ sơ trỏ về lexkite.com, tên miền na ná, tài khoản mạng xã hội, bản sao chép – tự kiểm hằng ngày.': 'PR posts and profiles linking to lexkite.com, lookalike domains, social accounts, content copies – checked daily.',
    'Hạn mức theo tính năng, cầu dao nhà cung cấp, khóa và danh sách không giới hạn.': 'Per-feature quotas, provider breakers, blocks and the unlimited list.',
    'Kho Google Drive riêng: dung lượng, bản sao, duyệt file, sổ kho.': 'Private Google Drive pool: capacity, replicas, file browser, ledger.',
    'Lưu trữ': 'Storage', 'Dung lượng repo chính và kho media (MB, số tệp), dự báo kho 20k từ, cảnh báo ở 70 %.': 'Main repo and media repo size (MB, files), 20k-word forecast, alerts at 70%.',
    'Kho khóa nhà cung cấp AI & thư – mã hóa, xoay vòng, kiểm tra.': 'AI & mail provider key vault – encrypted, rotated, health-checked.',
    'Dịch vụ đang dùng, tài khoản, gói miễn phí và dung lượng.': 'Services in use, accounts, free tiers and capacity.',
    'Thông báo đầu trang, giới hạn AI, giám sát và lấy mẫu thống kê.': 'Site banner, AI limits, monitoring and analytics sampling.',
    'Trang quản trị Lexkite': 'Lexkite Admin', 'Chỉ tài khoản quản trị được cấp quyền.': 'Authorized admin accounts only.', 'Đăng nhập bằng Google': 'Sign in with Google',
    'Về app': 'Back to app', 'Về trang chủ Lexkite': 'Back to the Lexkite home page', 'Tự động (theo máy)': 'Auto (system)', 'Sáng': 'Light', 'Tối': 'Dark', 'Giao diện: {m} – bấm để đổi': 'Theme: {m} – click to change', 'Đổi giao diện sáng/tối': 'Switch light/dark theme',
    'Đổi ngôn ngữ': 'Change language', 'Ngôn ngữ: Tiếng Việt – bấm để chuyển sang English': 'Language: English – click to switch to Vietnamese', 'Thoát': 'Sign out',
    'Không có quyền': 'Access denied', 'Không tải được dữ liệu': 'Could not load data', 'Thử lại': 'Retry', 'Tài khoản này không có quyền quản trị': 'This account does not have admin access', 'Đăng nhập bằng tài khoản khác': 'Sign in with a different account', '{e} chưa được cấp quyền quản trị.': '{e} does not have admin access.', 'Đổi tài khoản': 'Switch account',
    'Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?': 'Your admin session has expired. Sign in again now?', 'Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại': 'Session expired – sign in again and retry',
    'Cần đăng nhập lại để xác nhận thao tác quan trọng. Đăng nhập lại ngay?': 'Please sign in again to confirm this sensitive action. Sign in now?',
    // Bảng lệnh, toast, hộp thoại, bảng
    'Bảng lệnh': 'Command palette', 'Tìm trang hoặc lệnh…': 'Search pages or commands…', 'Kết quả': 'Results', 'chọn': 'select', 'mở': 'open', 'đóng': 'close', 'Không tìm thấy': 'No matches', 'Trang': 'Pages', 'Lệnh': 'Commands',
    'Kho Drive · Duyệt file': 'Drive storage · Browse files', 'Kho Drive · Sổ kho': 'Drive storage · Ledger', 'Kho Drive · Nhật ký': 'Drive storage · Audit log', 'Tải lại trang này': 'Reload this page',
    'Đổi sang tiếng Anh': 'Switch to English', 'Đổi sang tiếng Việt': 'Switch to Vietnamese',
    'Hủy': 'Cancel', 'Xác nhận': 'Confirm', 'Gõ {t} để xác nhận': 'Type {t} to confirm', 'Sao chép': 'Copy', 'Sao chép {v}': 'Copy {v}', 'Đã sao chép': 'Copied', 'Không sao chép được': 'Could not copy',
    'Không tải được dữ liệu': 'Could not load data', 'Thử lại': 'Retry', 'Tìm trong bảng': 'Search this table', '🔎 Lọc…': '🔎 Filter…', 'Sắp xếp theo {c}': 'Sort by {c}', '{a}–{b} / {n}': '{a}–{b} of {n}',
    'Bỏ thay đổi chưa lưu?': 'Discard unsaved changes?', 'Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.': 'You have unsaved changes. Leaving this page will lose them.', 'Bỏ thay đổi': 'Discard changes', 'Ở lại': 'Stay',
    // Drive (banner toàn cục)
    'Drive {e} mất kết nối – bấm Kết nối lại': 'Drive {e} disconnected – click Reconnect', 'Drive {e}: Google không phản hồi {n} lần liên tiếp': 'Drive {e}: Google failed {n} times in a row', 'Drive {e}: tải lên lỗi {n} lần liên tiếp': 'Drive {e}: {n} uploads failed in a row',
    'Drive {e} đã dùng {p}%': 'Drive {e} is {p}% full', 'Toàn kho chỉ còn {g} GB trống': 'Whole pool has only {g} GB free', 'Nâng gói Cloudflare 5 USD trước ngày {d}': 'Upgrade Cloudflare to the $5 plan before {d}', 'Xem Hạn mức': 'View quotas', '{n} file chỉ còn 1 bản sao': '{n} file(s) have only 1 copy', '(+{n} cảnh báo khác)': '(+{n} more)', 'Xem Kho Drive': 'Open Drive storage',
    // Đơn vị & thời gian
    '{s} giây': '{s}s', '{m} phút {s} giây': '{m}m {s}s', '{m}p {s}s': '{m}m {s}s', 'vừa xong': 'just now', '{n} phút trước': '{n} min ago', '{n} giờ trước': '{n}h ago', '{n} ngày trước': ['{n} day ago', '{n} days ago'],
    'CN': 'Sun', 'T2': 'Mon', 'T3': 'Tue', 'T4': 'Wed', 'T5': 'Thu', 'T6': 'Fri', 'T7': 'Sat',
    '<15 giây': '<15s', '15–60 giây': '15–60s', '1–3 phút': '1–3 min', '3–10 phút': '3–10 min', '10–30 phút': '10–30 min', '30+ phút': '30+ min', '(trực tiếp)': '(direct)',
    'Chưa có dữ liệu': 'No data yet', 'chưa có dữ liệu': 'no data yet', 'Đang tải…': 'Loading…', 'Đóng': 'Close', 'Tất cả': 'All', 'Hôm nay': 'Today', 'hôm nay': 'today', '{n} ngày': ['{n} day', '{n} days'], '30 ngày': '30 days',
    // Khóa Gemini
    '✨ Khóa Gemini API': '✨ Gemini API keys', '{n} khóa': ['{n} key', '{n} keys'],
    'Nhiều khóa = <b>xoay vòng</b>: khóa hết lượt tự nghỉ 1 giờ và chuyển khóa kế tiếp; hết khóa → tự dùng Cloudflare AI. Thêm khóa từ nhiều tài khoản Google để tăng hạn mức miễn phí.': 'Multiple keys = <b>rotation</b>: a key that hits its quota rests for 1 hour and the next one takes over; when all keys are out, Cloudflare AI is used automatically. Add keys from several Google accounts to raise the free quota.',
    'tạm nghỉ (hết lượt)': 'resting (quota hit)', 'sẵn sàng': 'ready', 'Gỡ khóa': 'Remove key', 'Gỡ khóa …{k}': 'Remove key …{k}', 'Chưa có khóa – AI đang dùng Cloudflare Workers AI.': 'No keys yet – AI is running on Cloudflare Workers AI.',
    'Cách lấy khóa miễn phí': 'How to get a free key', 'Mở {link} (đăng nhập Google)': 'Open {link} (sign in with Google)', 'Bấm <b>Create API key</b> → sao chép': 'Click <b>Create API key</b> → copy it', 'Dán vào ô dưới → <b>{b}</b>': 'Paste it below → <b>{b}</b>',
    'Dán khóa AIza… hoặc AQ.…': 'Paste an AIza… or AQ.… key', 'Hiện/ẩn khóa': 'Show/hide key', 'Thêm khóa': 'Add key', 'Khóa API Gemini': 'Gemini API key',
    '🔒 {n} khóa sẵn sàng. Khóa chỉ máy chủ dùng (chấm bài, duyệt bản dịch), chỉ hiện 4 ký tự cuối. Gỡ khóa cần đăng nhập trong 15 phút gần nhất.': '🔒 {n} ready. Keys are used only by the server (grading, translation review) and only the last 4 characters are shown. Removing a key requires a sign-in within the last 15 minutes.',
    'Hãy dán khóa trước.': 'Paste a key first.', '⏳ Đang kiểm tra với Google…': '⏳ Checking with Google…', '✓ Đã thêm khóa …{k} (tổng {n} khóa)': '✓ Added key …{k} ({n} total)', 'Không lưu được': 'Could not save', 'Gỡ khóa …{k}?': 'Remove key …{k}?', '✓ Đã gỡ khóa': '✓ Key removed',
    'AI sẽ không dùng khóa này nữa.': 'AI will stop using this key.',
    // Biểu đồ
    '{h}h: {n} phiên': '{h}:00 – {n} sessions', '{d}: {f} mới · {b} quay lại': '{d}: {f} new · {b} returning', 'Khách mới': 'New visitors', 'Quay lại': 'Returning',
    'PWA (web đã cài)': 'PWA (installed web)', 'Add-on Chrome': 'Chrome add-on', 'App (cũ)': 'App (legacy)',
    'Lượt xem và khách 14 ngày qua': 'Views and visitors, last 14 days', '{d}: {v} lượt xem · {u} khách': '{d}: {v} views · {u} visitors', 'Lượt xem': 'Views', 'Khách': 'Visitors', 'Phiên theo ngày: {r}': 'Sessions per day: {r}',
    // Tổng quan
    'Cập nhật {t}': 'Updated {t}', 'Làm mới': 'Refresh', 'Tải lại số liệu': 'Reload data', 'Người thật': 'Real people', 'Học viên': 'Learners', 'Vận hành': 'Operations',
    'Người thật hôm nay': 'Humans today', 'Người thật 7 ngày': 'Humans · 7 days', 'Người thật 30 ngày': 'Humans · 30 days', 'thiết bị khác nhau': 'unique devices', 'hôm qua': 'yesterday', '7 ngày trước đó': 'previous 7 days', '30 ngày trước đó': 'previous 30 days',
    'so với {v}: {n}': 'vs {v}: {n}', 'Đang online': 'Active now', 'tín hiệu trong 5 phút qua': 'signal in the last 5 minutes', 'Đăng nhập hôm nay': 'Signed-in today', '7 ngày: {a} · 30 ngày: {b}': '7 days: {a} · 30 days: {b}',
    'Học viên đăng ký': 'Registered learners', '+{n} / 7 ngày': '+{n} / 7 days', 'Gắn kết (DAU / MAU)': 'Stickiness (DAU / MAU)', 'Chuẩn EdTech ≥ 25%': 'EdTech benchmark ≥ 25%',
    'Thẻ đã ôn': 'Cards reviewed', 'Chưa đo – cần sự kiện ôn thẻ trong thống kê': 'Not tracked yet – needs a review event in analytics',
    'Lỗi JS (24 giờ)': 'JS errors (24h)', '{n} loại': ['{n} type', '{n} types'], 'Không có lỗi': 'No errors', 'Phiên tự động đã loại': 'Bot sessions excluded', 'bot, CI, quản trị – hôm nay': 'bots, CI, admins – today',
    'Tin nhắn chưa xử lý': 'Open messages', 'Sạch hòm thư': 'Inbox zero', 'Chờ trả lời': 'Awaiting reply', 'Điểm chất lượng': 'Quality score', 'Đạt chuẩn': 'Meets standard', 'Dưới chuẩn': 'Below standard', 'chưa chạy': 'not run yet',
    'Khóa Gemini API': 'Gemini API keys', '{n} sẵn sàng': '{n} ready', 'Chưa thiết lập': 'Not set up', 'D1: {p}% dung lượng': 'D1: {p}% storage used',
    'Tác vụ cần chú ý': 'Jobs needing attention', 'Tác vụ tự động (GitHub Actions)': 'Automated jobs (GitHub Actions)', 'Toàn bộ cảnh báo & nhật ký →': 'All alerts & logs →',
    'Đang chạy…': 'Running…', 'Bỏ qua': 'Skipped', 'Đang chờ': 'Queued', 'Thành công': 'Success', 'Cảnh báo@@status': 'Warning', 'Cần chú ý': 'Needs attention', 'Chưa có tác vụ': 'No jobs yet',
    // Trực tiếp
    '📈 Lưu lượng trực tiếp': '📈 Live traffic', 'Live · tự cập nhật 30s · {t}': 'Live · auto-refresh 30s · {t}', 'Lấy mẫu {p}% – số thực ≈ × {x}': 'Sampling {p}% – actual ≈ × {x}',
    'Đang online <small>(5 phút)</small>': 'Online now <small>(5 min)</small>', 'khách có tín hiệu gần đây': 'visitors with recent activity', 'Lượt xem hôm nay': 'Views today', '{n} phiên': ['{n} session', '{n} sessions'],
    'Khách hôm nay': 'Visitors today', 'Trang/khách': 'Pages/visitor', 'Thời gian TB': 'Avg. time', 'mỗi phiên hôm nay': 'per session today', 'Tổng lượt xem': 'Total views', '{n} khách từ trước đến nay': '{n} visitors all-time', '14 ngày qua': 'Last 14 days',
    '🌍 Quốc gia hôm nay': '🌍 Countries today', '👀 Đang xem': '👀 Viewing now', 'Không ai online trong 5 phút qua': 'Nobody online in the last 5 minutes', '📄 Trang xem nhiều hôm nay': '📄 Top pages today',
    'Theo trang vào đầu tiên (chưa có số lượt xem từng trang).': 'Based on landing pages (per-page views not available yet).', '🔗 Nguồn giới thiệu hôm nay': '🔗 Referrers today', 'Chủ yếu truy cập trực tiếp': 'Mostly direct traffic',
    '🔥 Trang xem nhiều · 7 ngày': '🔥 Top pages · 7 days', '📱 Nền tảng': '📱 Platforms', 'Nền tảng': 'Platform', 'Nền tảng@@h': 'Platforms', 'Số khách (thiết bị) khác nhau.': 'Unique visitors (devices).',
    '{c} quốc gia · {n} khách': '{c} countries · {n} visitors', ' · {n} không rõ': ' · {n} unknown', 'Ít': 'Few', 'Nhiều khách': 'Many visitors', '{c} – {n} khách hôm nay': '{c} – {n} visitors today', 'Không tải được bản đồ – danh sách quốc gia:': 'Map failed to load – country list:',
    // Phân tích
    'Khoảng thời gian (phần Chi tiết)': 'Date range (Details section)', 'ℹ️ Đang lấy mẫu {p}% người dùng – số phiên/người thực tế ≈ số dưới đây × {x}; tỉ lệ % và trung bình giữ nguyên.': 'ℹ️ Sampling {p}% of users – actual sessions/users ≈ figures below × {x}; percentages and averages are unaffected.',
    '🗺️ Khách theo quốc gia · hôm nay': '🗺️ Visitors by country · today', 'Bản đồ khách theo quốc gia hôm nay': 'Map of visitors by country today', 'Không tải được số liệu trực tiếp.': 'Could not load live data.', 'Chi tiết · {r}': 'Details · {r}',
    'Phiên truy cập': 'Sessions', 'Khách (thiết bị)': 'Visitors (devices)', '{n} phiên/khách': '{n} sessions/visitor', 'Thời gian TB/phiên': 'Avg. time/session', 'Trang/phiên': 'Pages/session', 'Khách quay lại': 'Returning visitors',
    'Thoát ngay (&lt;15 giây, 1 trang)': 'Bounce (&lt;15s, 1 page)', 'LCP thật (tốc độ hiện nội dung)': 'Real-user LCP (content load speed)', 'p75 · {p} phiên đạt “Tốt” (≤ 2,5 s)': 'p75 · {p} of sessions “Good” (≤ 2.5 s)',
    'Phiên theo ngày': 'Sessions per day', 'Nguồn truy cập': 'Traffic sources', 'Quốc gia': 'Countries', 'Trang vào đầu tiên': 'Landing pages', 'Tần suất (số phiên mỗi khách)': 'Frequency (sessions per visitor)', '{k} lần': '{k}×',
    'Thiết bị': 'Devices', 'Ngôn ngữ giao diện': 'UI language', 'Thói quen sử dụng': 'Usage habits', 'Giờ cao điểm (giờ Việt Nam)': 'Peak hours (Vietnam time)', 'Ngày trong tuần': 'Day of week', 'Thời lượng phiên': 'Session length',
    'Tăng trưởng': 'Growth', 'Khách mới & khách quay lại theo ngày': 'New vs. returning visitors per day', 'Tài khoản đăng ký mới': 'New sign-ups', 'Chưa có đăng ký mới trong khoảng này': 'No new sign-ups in this range',
    'Thống kê ẩn danh tự xây: không cookie, không lưu IP; quốc gia do Cloudflare xác định. Chỉ tính người thật: loại bot, máy chủ đám mây (CI GitHub, máy ảo Android/iOS), header CI, chế độ sandbox và tài khoản quản trị. "Hôm nay" theo giờ Việt Nam (UTC+7).': 'Self-hosted anonymous analytics: no cookies, no stored IPs; country comes from Cloudflare. Humans only: bots, cloud servers (GitHub CI, Android/iOS emulators), the CI header, sandbox mode and admin accounts are excluded. "Today" is Vietnam time (UTC+7).',
    'Đã loại trong khoảng này: {n} phiên.': 'Excluded in this period: {n} sessions.', 'Tự động/bot & quản trị hôm nay: {n} phiên (đã loại)': 'Automation/bots & admin today: {n} sessions (excluded)', 'Ngày theo giờ Việt Nam (UTC+7)': 'Days in Vietnam time (UTC+7)',
    'CI của mình': 'Our CI', 'App trên máy ảo CI': 'App on CI emulator', 'Bot/công cụ (UA)': 'Bot/tool (UA)', 'Bot đã xác minh': 'Verified bot', 'Máy chủ đám mây': 'Cloud server', 'Không rõ': 'Unknown',
    // Người dùng
    'Xóa vĩnh viễn dữ liệu đồng bộ?': 'Permanently delete synced data?', 'Xóa toàn bộ dữ liệu đồng bộ của {e}. Tài khoản Google không bị ảnh hưởng. Không thể hoàn tác.': 'This deletes all synced data of {e}. The Google account is not affected. This cannot be undone.',
    'Xóa vĩnh viễn': 'Delete permanently', 'Đã xóa dữ liệu của {e}': 'Deleted data of {e}', 'Không xóa được: {e}': 'Could not delete: {e}', '(không tên)': '(no name)', '👑 Quản trị': '👑 Admin', 'Người học': 'Learner', 'Quản trị': 'Admin',
    'Ngày tạo': 'Created', 'Hoạt động gần nhất': 'Last active', 'Số lần vào (đồng bộ)': 'Visits (sync)', 'Dữ liệu đồng bộ': 'Synced data', '{b} · {n} phần': ['{b} · {n} part', '{b} · {n} parts'],
    '📚 Học tập': '📚 Learning', 'Chuỗi ngày': 'Streak', 'Ngày đã học': 'Study days', 'Lượt ôn': 'Reviews', 'Từ mới': 'New words', 'Bài luyện': 'Quizzes', 'Bài đọc': 'Readings', 'Từ đã nói': 'Words spoken', 'Huy hiệu': 'Badges',
    'Ngày học gần nhất: {d}': 'Last study day: {d}', '🗂️ Tài liệu đồng bộ': '🗂️ Synced documents', 'Phần': 'Part', 'Dung lượng': 'Size', 'Cập nhật': 'Updated', '({n} gói thẻ)': ['({n} card pack)', '({n} card packs)'], 'Không có dữ liệu đồng bộ': 'No synced data',
    '🗑 Xóa dữ liệu': '🗑 Delete data', '✉️ Gửi email': '✉️ Email', 'Chi tiết người dùng': 'User details',
    'Bị khóa đồng bộ': 'Sync blocked', 'Bị khóa': 'Blocked', 'Nhãn & Ghi chú nội bộ': 'Tags & Internal notes', 'Nhập nhãn mới…': 'New tag…', '+ Thêm nhãn': '+ Add tag', 'Xóa nhãn': 'Remove tag', 'Gợi ý:': 'Suggestions:',
    'Bản sao lưu tiến độ (30 ngày)': 'Progress backups (30 days)', '{n} bản lưu': ['{n} backup', '{n} backups'], 'Thời gian': 'Time', 'Người sao lưu': 'Created by', '↩️ Khôi phục': '↩️ Restore', 'Xuất JSON (GDPR)': 'Export JSON (GDPR)',
    'Khóa đồng bộ': 'Block sync', 'Mở khóa đồng bộ': 'Unblock sync', 'Đặt lại tiến độ': 'Reset progress', 'Khóa tài khoản': 'Block account', 'Mở khóa': 'Unblock', 'Khôi phục': 'Restore',
    'Tài khoản này đang bị khóa đồng bộ. /api/sync sẽ trả 403 khi kéo/đẩy dữ liệu.': 'This account is blocked from syncing. /api/sync will return 403 when pulling/pushing data.',
    '(chưa gắn nhãn)': '(no tags yet)', 'hỗ trợ': 'support', 'giáo viên': 'teacher',
    'Ghi chú riêng của admin về người dùng này (chỉ admin thấy)…': 'Private admin notes about this user (visible to admins only)…',
    'Chưa có bản sao lưu nào. Hệ thống tự động sao lưu dữ liệu trước khi Đặt lại tiến độ.': 'No backups yet. The system automatically creates a backup before resetting progress.',
    'Gửi thông báo': 'Send notice', 'Gửi': 'Send',
    '✅ Mở khóa đồng bộ': '✅ Unblock sync', '⛔ Khóa đồng bộ': '⛔ Block sync', '🗑 Xóa vĩnh viễn': '🗑 Delete permanently',
    'Đã lưu nhãn và ghi chú nội bộ': 'Saved tags and internal notes', 'Lỗi lưu nhãn: {e}': 'Failed to save tags: {e}',
    'Đã xuất toàn bộ dữ liệu GDPR': 'Exported all GDPR data', 'Lỗi xuất dữ liệu: {e}': 'Export error: {e}',
    'Khóa đồng bộ tài khoản?': 'Block sync for this account?', 'Mở khóa đồng bộ tài khoản?': 'Unblock sync for this account?',
    'Khi bị khóa, tài khoản {e} sẽ không thể đồng bộ dữ liệu học tập lên máy chủ.': 'When blocked, {e} cannot sync learning data to the server.',
    'Mở khóa cho phép tài khoản {e} tiếp tục đồng bộ bình thường.': 'Unblocking allows {e} to resume normal syncing.',
    'Đã khóa đồng bộ {e}': 'Blocked sync for {e}', 'Đã mở khóa đồng bộ {e}': 'Unblocked sync for {e}', 'Lỗi: {e}': 'Error: {e}',
    'Đặt lại tiến độ học tập?': 'Reset learning progress?',
    'Toàn bộ thẻ ôn tập, XP, chuỗi ngày của {e} sẽ bị xóa về 0. Hệ thống sẽ tự động lưu 1 bản sao lưu trong 30 ngày.': 'All study cards, XP, and streak of {e} will be reset to 0. The system will automatically save a backup for 30 days.',
    'Đã đặt lại tiến độ và tạo bản sao lưu ({n} tài liệu)': 'Reset progress and created a backup ({n} documents)',
    'Lỗi đặt lại: {e}': 'Reset error: {e}', 'Khôi phục tiến độ học tập?': 'Restore learning progress?',
    'Khôi phục toàn bộ dữ liệu của {e} từ bản sao lưu lúc {t}. Dữ liệu hiện tại sẽ bị ghi đè.': 'Restore all data of {e} from the backup at {t}. Current data will be overwritten.',
    'Đã khôi phục thành công {n} tài liệu': 'Successfully restored {n} documents', 'Lỗi khôi phục: {e}': 'Restore error: {e}',
    '🔎 Tìm email, tên hoặc UID': '🔎 Search email, name or UID', 'Tìm người dùng': 'Search users', 'Vai trò': 'Role', 'Trạng thái': 'Status', 'Hoạt động 7 ngày': 'Active (7 days)', 'Ngủ đông >30 ngày': 'Dormant >30 days', 'Mới 7 ngày': 'New (7 days)',
    'Sắp xếp': 'Sort', 'Mới nhất': 'Newest', 'Tải CSV theo bộ lọc hiện tại (tối đa 5.000 dòng)': 'Download CSV for the current filter (max 5,000 rows)',
    'Tổng người dùng': 'Total users', 'tài khoản đã đồng bộ': 'synced accounts', 'Hoạt động hôm nay': 'Active today', '24 giờ qua': 'last 24 hours', 'Hoạt động 7 / 30 ngày': 'Active 7 / 30 days', '{p}% còn hoạt động trong tháng': '{p}% active this month',
    'tài khoản đăng ký mới': 'new sign-ups', 'Theo nền tảng': 'By platform', 'Lần vào': 'Visits', 'Chi tiết': 'Details', 'Xóa dữ liệu': 'Delete data', 'Không có người dùng khớp bộ lọc': 'No users match the filter', 'Thử bỏ bớt bộ lọc hoặc từ khóa.': 'Try removing some filters or search terms.',
    ' (lọc từ {n})': ' (filtered from {n})', '← Trước': '← Prev', 'Sau →': 'Next →', '⏳ Đang xuất…': '⏳ Exporting…', 'Đã xuất {n} dòng': ['Exported {n} row', 'Exported {n} rows'], 'Lỗi xuất CSV': 'CSV export failed',
    // Hộp thư
    'Chưa xử lý': 'Open', 'Bản sao được chuyển vào support@lexkite.com': 'Copies are forwarded to support@lexkite.com', 'chưa chuyển vào Gmail': 'not forwarded to Gmail', 'Lọc tin nhắn': 'Filter messages',
    'Trả lời bằng Gmail': 'Reply in Gmail', 'Ứng dụng email': 'Email app', 'Mở lại': 'Reopen', '✓ Đã xử lý': '✓ Mark handled', 'Không có tin nhắn': 'No messages', 'Hộp thư trống – mọi tin đã được xử lý.': 'Inbox zero – every message has been handled.',
    'Đã đánh dấu xử lý': 'Marked as handled', 'Đã mở lại tin nhắn': 'Message reopened', 'Mã tin': 'Message ID',
    // Cảnh báo & nhật ký
    'Trạng thái tự động': 'Automated status', 'Xem': 'View', 'Tác vụ': 'Job', 'Kết quả@@run': 'Result', 'Lúc': 'Time',
    'Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.': 'GitHub workflows (translation, Android build, audio, blog, speed tests…) · JS errors · inbox · capacity. A summary email goes to support automatically when anything turns red.',
    'Lỗi JavaScript từ người dùng': 'JavaScript errors from users', 'Xóa tất cả': 'Clear all', 'Lỗi': 'Error', 'Vị trí': 'Source', 'Trang@@path': 'Page', 'Số lần': 'Count', 'Gần nhất': 'Last seen', 'Đã sửa': 'Fixed', 'Không có lỗi 🎉': 'No errors 🎉',
    'Nhật ký quản trị (100 thao tác gần nhất)': 'Admin audit log (last 100 actions)', 'Mọi thao tác ghi/xóa và mọi lần tài khoản lạ cố vào trang quản trị (dòng đỏ). IP được băm, không lưu IP gốc.': 'Every write/delete action and every attempt by an unknown account to open admin (red rows). IPs are hashed; raw IPs are never stored.',
    'Thao tác': 'Action', 'IP (băm)': 'IP (hashed)', 'Nước': 'Country', '⛔ bị từ chối': '⛔ denied', 'Chưa có thao tác': 'No actions yet', 'Xóa toàn bộ nhật ký lỗi?': 'Clear the entire error log?', 'Mọi lỗi JS đã ghi sẽ bị xóa khỏi D1.': 'All recorded JS errors will be removed from D1.',
    'Đã xóa nhật ký lỗi': 'Error log cleared', 'Đã đánh dấu đã sửa': 'Marked as fixed',
    // Chất lượng
    'Điểm chất lượng (lượt rà soát gần nhất)': 'Quality score (latest run)', 'Chuẩn: {s}% · {t}': 'Standard: {s}% · {t}', '14 lượt gần nhất': 'Last 14 runs', '{a}/{b} lượt đạt': '{a}/{b} runs passed',
    '✅ Đạt chuẩn': '✅ Meets standard', '⚠️ Dưới chuẩn – cần xử lý': '⚠️ Below standard – action needed', 'Hạng mục': 'Check', 'Đạt': 'Pass', 'Không đạt': 'Fail', 'Xem chi tiết lượt rà soát →': 'View run details →',
    'Rà soát tự động mỗi ngày 7h sáng: kiểm thử đầy đủ (chính tả, đa ngôn ngữ 14 thứ tiếng, thuật toán FSRS & đồng bộ, giao diện, trợ năng WCAG, lời giải đề thi, liên kết), kiểm tra kiểu, cú pháp workflow, bản live (trang, API, dữ liệu, âm thanh, phiên bản). Không đạt → email cảnh báo 8h sáng.': 'Automated review daily at 7 AM: full test suite (spelling, 14-language i18n, FSRS & sync algorithms, UI, WCAG accessibility, exam answer keys, links), type checks, workflow syntax, and the live site (pages, API, data, audio, version). Any failure → alert email at 8 AM.',
    '🌐 Kiểm nghĩa bản dịch (dịch ngược + AI)': '🌐 Translation meaning check (back-translation + AI)',
    'Cập nhật {t} · "khớp nghĩa" = tỉ lệ câu dịch ngược về tiếng Anh vẫn đúng ý. <b>Duyệt bằng AI</b>: Gemini (xoay vòng các khóa) → hết lượt tự chuyển Cloudflare AI; mỗi lần ≤ 60 câu, bấm tiếp để duyệt phần còn lại.': 'Updated {t} · "meaning match" = share of strings whose back-translation to English keeps the meaning. <b>AI review</b>: Gemini (rotating keys) → falls back to Cloudflare AI when quota runs out; up to 60 strings per run, click again to review the rest.',
    'Ngôn ngữ': 'Language', 'Số câu': 'Strings', 'Khớp nghĩa': 'Meaning match', 'Nghi sai': 'Suspect', '✨ Duyệt bằng AI': '✨ Review with AI', '⏳ Đang duyệt…': '⏳ Reviewing…',
    'đã duyệt {a}/{b} câu nghi sai': 'reviewed {a}/{b} suspect strings', ' · còn {n} (bấm lại để duyệt tiếp)': ' · {n} left (click again to continue)', ' · ✅ xong': ' · ✅ done', '{n} câu sai nghĩa': ['{n} mistranslation', '{n} mistranslations'],
    'Áp dụng tất cả': 'Apply all', 'Tiếng Anh': 'English', 'Bản dịch hiện tại': 'Current translation', 'AI đề xuất': 'AI suggestion', 'Lý do': 'Reason', 'Áp dụng': 'Apply', '✅ Không có câu sai': '✅ No mistranslations',
    'Bản sửa đã áp dụng sẽ tự cập nhật vào app ở lượt dịch đêm.': 'Applied fixes reach the app in the nightly translation run.', '✓ Đã duyệt': '✓ Approved', '✓ Đã duyệt tất cả': '✓ All approved',
    // Dịch vụ
    '☁️ Hạ tầng & dữ liệu': '☁️ Infrastructure & data', '🤖 AI & dịch': '🤖 AI & translation', '📈 Phát hành & tăng trưởng': '📈 Publishing & growth', '🧩 Khác': '🧩 Other', 'Đang dùng': 'In use', 'Chưa dùng': 'Unused',
    'Dịch vụ': 'Services', 'trong hệ thống': 'in the system', 'hoạt động bình thường': 'running normally', 'cần đăng ký / thêm khóa': 'need sign-up or a key', 'Hạn mức sắp đầy': 'Quotas near limit', '≥ 70% gói miễn phí': '≥ 70% of free tier',
    '📊 Dung lượng & hạn mức miễn phí': '📊 Storage & free-tier quotas', '· vàng ≥ 70%, đỏ ≥ 90%': '· yellow ≥ 70%, red ≥ 90%', '🔎 Tìm dịch vụ, tài khoản…': '🔎 Search services, accounts…', 'Tìm dịch vụ': 'Search services', '+ Thêm dịch vụ': '+ Add service', 'Lọc dịch vụ': 'Filter services',
    '🔑 {n} khóa': ['🔑 {n} key', '🔑 {n} keys'], '🔑 chưa có khóa': '🔑 no keys', 'Sửa': 'Edit', 'Sửa {n}': 'Edit {n}', 'Quản lý khóa': 'Manage keys', 'Mở trang quản lý ↗': 'Open console ↗', 'Nâng gói': 'Upgrade',
    'Sửa dịch vụ': 'Edit service', 'Thêm dịch vụ': 'Add service', 'Tên dịch vụ *': 'Service name *', 'Dùng cho': 'Used for', 'Tài khoản / email': 'Account / email', 'Link trang quản lý': 'Console link', 'Link nâng gói': 'Upgrade link',
    'Gói miễn phí / giới hạn': 'Free tier / limits', 'Tên biến khóa (không ghi giá trị)': 'Secret variable name (never the value)', 'Ghi chú': 'Notes', 'Xóa dịch vụ': 'Delete service', 'Lưu': 'Save',
    'Không lưu giá trị khóa ở đây – chỉ ghi tên biến.': 'Don\'t store key values here – only the variable name.', 'Xóa dịch vụ này khỏi danh sách?': 'Remove this service from the list?', 'Chỉ xóa khỏi danh sách quản trị, không ảnh hưởng dịch vụ thật.': 'This only removes it from the admin list; the real service is not affected.',
    'Hãy nhập tên dịch vụ.': 'Enter a service name.', 'Đã lưu dịch vụ': 'Service saved', 'Đã xóa dịch vụ': 'Service deleted', 'Không có dịch vụ khớp bộ lọc': 'No services match the filter',
    // Cài đặt
    'Thông báo đầu trang': 'Site banner', 'Dải thông báo hiện trên đầu web/app cho mọi người dùng.': 'A strip shown at the top of the web app for everyone.',
    'Nội dung thông báo': 'Banner text', 'Để trống = tắt thông báo.': 'Leave empty to turn the banner off.', 'Liên kết kèm theo': 'Banner link', 'Không bắt buộc – phải bắt đầu bằng https://': 'Optional – must start with https://',
    'Kiểu thông báo': 'Banner style', 'Thông tin': 'Info', 'Cảnh báo@@lvl': 'Warning', 'Thành công': 'Success', 'Xem trước': 'Preview', 'Thông báo đang tắt': 'Banner is off',
    'Hiện trên web/app sau tối đa 1 giờ (bộ đệm cấu hình).': 'Appears on web/app within 1 hour (config cache).',
    'Giới hạn AI': 'AI limits', 'Số lượt chấm bài viết/nói bằng AI mỗi ngày.': 'Daily AI grading for writing/speaking.',
    'Người dùng đã đăng nhập': 'Signed-in users', 'Khách (chưa đăng nhập)': 'Guests (not signed in)', 'Trần toàn hệ thống': 'System-wide cap', 'lượt/người/ngày': 'per user/day', 'lượt/khách/ngày': 'per guest/day', 'lượt/ngày': 'per day',
    'Nếu tab Hạn mức đã đặt hạn mức cho tính năng "ai", giá trị ở đó được ưu tiên.': 'If the Quotas page sets a quota for the "ai" feature, that value takes precedence.',
    'Khóa cũ – trần chung hiện do cầu dao nhà cung cấp ở tab Hạn mức quản lý.': 'Legacy key – the global cap is now managed by the provider breaker on the Quotas page.',
    'Giám sát': 'Monitoring', 'Khi nào gửi cảnh báo tự động.': 'When automatic alerts fire.', 'Ngưỡng cảnh báo lỗi JS': 'JS error alert threshold', 'lỗi/24 giờ': 'errors / 24h',
    'Vượt ngưỡng → mục đỏ trong Cảnh báo và email tóm tắt về support.': 'Above the threshold → a red item in Alerts and a summary email to support.',
    'Lấy mẫu thống kê': 'Analytics sampling', 'Tỉ lệ người dùng gửi thống kê phiên.': 'Share of users that send session analytics.', 'Tỉ lệ lấy mẫu': 'Sampling rate',
    '≈ {p}% khách gửi thống kê; số đếm trong Phân tích cần nhân × {x}.': '≈ {p}% of visitors send analytics; counts in Analytics should be multiplied by × {x}.', '100% khách gửi thống kê – số liệu đầy đủ.': '100% of visitors send analytics – complete data.',
    'Trên ~30.000 người/ngày nên đặt 0,1 để D1 ở gói miễn phí.': 'Above ~30,000 users/day, set 0.1 to keep D1 on the free tier.',
    'Ghi chú nội bộ': 'Internal notes', 'Chỉ quản trị thấy. Không ghi khóa hay mật khẩu.': 'Visible to admins only. Never write keys or passwords here.', 'Ghi chú cho quản trị': 'Notes for admins',
    'Khác@@set': 'Other', 'Mặc định: {v}': 'Default: {v}', 'Đang dùng mặc định': 'Using default', 'Đã đặt riêng': 'Custom', 'Đặt lại mặc định': 'Reset to default', 'Sửa {t} bởi {b}': 'Edited {t} by {b}', 'trống': 'empty',
    'Phải là số nguyên từ {a} đến {b}.': 'Must be a whole number from {a} to {b}.', 'Phải là số từ {a} đến {b}.': 'Must be a number from {a} to {b}.', 'Liên kết phải bắt đầu bằng https://': 'The link must start with https://', 'Tối đa {n} ký tự.': 'At most {n} characters.',
    'Có vẻ là khóa/bí mật – không lưu ở đây.': 'Looks like a key/secret – don\'t store it here.',
    'Không có thay đổi': 'No changes', '{n} thay đổi chưa lưu': ['{n} unsaved change', '{n} unsaved changes'], 'Hoàn tác': 'Discard', 'Lưu thay đổi': 'Save changes', 'Đang lưu…': 'Saving…',
    'Đã lưu {n} thay đổi': ['Saved {n} change', 'Saved {n} changes'], 'Sửa lỗi trước khi lưu': 'Fix the errors before saving', 'Đã lưu': 'Saved',
    '{a} khóa xoay vòng · {b} sẵn sàng': '{a} rotating keys · {b} ready', 'Chưa có khóa – AI đang dùng Cloudflare Workers AI': 'No keys yet – AI is running on Cloudflare Workers AI', 'Dùng cho chấm bài viết/nói & duyệt bản dịch.': 'Used for writing/speaking grading & translation review.',
    'Đã tự động đăng xuất do không thao tác trong {n} phút.': 'Automatically logged out due to inactivity for {n} minutes.',
  };
  const L = (vi, vars) => {
    let s = LANG === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : vi.split('@@')[0];
    if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1];
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
  };
  const LOC = () => (LANG === 'en' ? 'en-US' : 'vi-VN');
  const num = n => (+n || 0).toLocaleString(LOC());
  const dur = s => { s = Math.round(+s || 0); return s < 60 ? L('{s} giây', { s }) : L('{m} phút {s} giây', { m: Math.floor(s / 60), s: s % 60 }); };
  const when = t => t ? new Date(t).toLocaleString(LOC(), { dateStyle: 'short', timeStyle: 'short' }) : '–';
  const clock = t => new Date(t).toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const bytes = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? (b / 1024).toFixed(1) + ' KB' : (b || 0) + ' B';
  const ago = t => { if (!t) return '–'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? L('vừa xong') : m < 60 ? L('{n} phút trước', { n: m }) : m < 1440 ? L('{n} giờ trước', { n: Math.round(m / 60) }) : L('{n} ngày trước', { n: Math.round(m / 1440) }); };
  // Thời gian tương đối + tooltip tuyệt đối (giữ chỗ cố định, không nhảy bố cục)
  const rel = t => { if (!t || !isFinite(new Date(t))) return '–'; return `<time datetime="${new Date(t).toISOString()}" title="${esc(when(t))}">${esc(ago(t))}</time>`; };
  const copyBtn = (v, label) => `<button type="button" class="copy" data-copy="${esc(v)}" aria-label="${esc(L('Sao chép {v}', { v }))}" title="${esc(L('Sao chép'))}">${esc(label == null ? v : label)}</button>`;
  // Mã quốc gia Cloudflare: XX = không rõ, T1 = mạng Tor (không phải quốc gia) – không vẽ cờ giả
  const realCC = c => /^[A-Z]{2}$/.test(c || '') && c !== 'XX' && c !== 'T1';
  const FLAG = c => realCC(c) ? String.fromCodePoint(...[...c].map(x => 127397 + x.charCodeAt(0))) + ' ' + c : c === 'T1' ? '🧅 Tor' : '🌐 ?';

  // ---------- Điều hướng: nhóm → mục [khóa, biểu tượng, nhãn, mô tả, id huy hiệu] ----------
  const NAV = [
    ['Tổng quan', [['overview', '📊', 'Tổng quan', 'Sức khỏe hệ thống, người thật và tác vụ tự động trên một màn hình.'], ['analytics', '📈', 'Phân tích', 'Lưu lượng trực tiếp, nguồn truy cập, thói quen sử dụng và tăng trưởng.'], ['ads', '💰', 'Quảng cáo', 'Cờ theo nền tảng, công tắc khẩn cấp, doanh thu ước tính, tần suất, cổng giữ chân và đồng ý theo vùng.']]],
    ['Người dùng', [['users', '👥', 'Người dùng', 'Tài khoản đã đồng bộ: tìm, lọc, xem chi tiết, xuất CSV, xóa dữ liệu theo yêu cầu.'], ['inbox', '📬', 'Hộp thư', 'Tin nhắn từ form Liên hệ – trả lời và đánh dấu đã xử lý.', 'inboxN'], ['notices', '📣', 'Thông báo', 'Gửi thông báo tới chuông 🔔 của người học: soạn, hẹn giờ, chọn đối tượng, thu hồi, xem lượt đọc.', 'notN']]],
    ['Chất lượng', [['alerts', '🚨', 'Cảnh báo', 'Tác vụ tự động, lỗi JavaScript từ người dùng và nhật ký quản trị.', 'alertN'], ['reports', '🐞', 'Báo lỗi', 'Báo lỗi từ người dùng: phân loại, giao việc, phản hồi.', 'repN'], ['quality', '🛡️', 'Chất lượng', 'Điểm rà soát tự động hằng ngày và kiểm nghĩa bản dịch.']]],
    ['Nội dung & Video', [['dist', '🛰️', 'Kênh & phân phối', 'Kênh nhúng cho bài học, kênh mạng xã hội, luật định tuyến và lịch đăng theo kênh.'], ['social', '📣', 'Video & Social', 'Soạn bài, lịch đăng và kênh mạng xã hội (GrabCast).'], ['studio', '🎞️', 'Video Studio', 'Dây chuyền sản xuất video tự động từ kịch bản tới lên lịch.'], ['video', '🎬', 'Trung tâm video', 'Việc cần làm, duyệt, thư viện, sản xuất & QC, kịch bản và kênh đăng cho mọi video ngắn.'], ['backlinks', '🔗', 'Backlink, PR & Thương hiệu', 'Bài PR, hồ sơ trỏ về lexkite.com, tên miền na ná, tài khoản mạng xã hội, bản sao chép – tự kiểm hằng ngày.']]],
    ['Hệ thống', [['quota', '⚖️', 'Hạn mức', 'Hạn mức theo tính năng, cầu dao nhà cung cấp, khóa và danh sách không giới hạn.'], ['drive', '🗄️', 'Kho Drive', 'Kho Google Drive riêng: dung lượng, bản sao, duyệt file, sổ kho.', 'drvN'], ['keys', '🔑', 'Khóa API', 'Kho khóa nhà cung cấp AI & thư – mã hóa, xoay vòng, kiểm tra.'], ['services', '🧩', 'Dịch vụ & API', 'Dịch vụ đang dùng, tài khoản, gói miễn phí và dung lượng.'], ['storage', '💾', 'Lưu trữ', 'Dung lượng repo chính và kho media (MB, số tệp), dự báo kho 20k từ, cảnh báo ở 70 %.']]],
    ['', [['settings', '⚙️', 'Cài đặt', 'Thông báo đầu trang, giới hạn AI, giám sát và lấy mẫu thống kê.']]],
  ];
  const ITEM = {}; NAV.forEach(([g, items]) => items.forEach(([k, icon, label, desc, badge]) => { ITEM[k] = { k, icon, label, desc, badge, group: g }; }));
  const baseOf = h => String(h || '').replace(/^#/, '').split(/[/?]/)[0];

  // Chữ tĩnh trong admin.html (data-l = chuỗi Việt gốc) + nút VI | EN
  const paintStatic = () => {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.dataset.l); });
    const br = document.querySelector('.adm-top .brand'); if (br) br.title = L('Về trang chủ Lexkite');
    const k = $('#cmdkKey'); if (k) k.textContent = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Ctrl K';
    $('#tabs').setAttribute('aria-label', L('Điều hướng quản trị'));
    const g = document.getElementById('lng'); if (!g) return;
    g.innerHTML = LANG === 'vi' ? '<b>VI</b> | EN' : 'VI | <b>EN</b>'; g.title = L('Đổi ngôn ngữ'); g.setAttribute('aria-label', L('Ngôn ngữ: Tiếng Việt – bấm để chuyển sang English'));
  };
  paintStatic();
  // Giao diện sáng/tối: Tự động (theo máy) → Sáng → Tối, ghi nhớ trên trình duyệt
  const THEME = { auto: ['🌗', 'Tự động (theo máy)'], light: ['☀️', 'Sáng'], dark: ['🌙', 'Tối'] };
  const themeNow = () => { try { return localStorage.getItem('lk.admTheme') || 'auto'; } catch (e) { return 'auto'; } };
  const setTheme = m => { try { localStorage.setItem('lk.admTheme', m); } catch (e) { /* bỏ qua */ } if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m); paintTheme(); };
  const cycleTheme = () => { const order = ['auto', 'light', 'dark']; setTheme(order[(order.indexOf(themeNow()) + 1) % 3]); };
  const paintTheme = () => { const b = document.getElementById('thm'); if (!b) return; const m = THEME[themeNow()] ? themeNow() : 'auto'; b.innerHTML = `${THEME[m][0]} <span class="lbl">${esc(L(THEME[m][1]))}</span>`; b.setAttribute('aria-label', L('Giao diện: {m} – bấm để đổi', { m: L(THEME[m][1]) })); };
  try { const m = localStorage.getItem('lk.admTheme'); if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-theme', m); } catch (e) { /* bỏ qua */ }
  let user = null, tab = 'overview', denied = false, guard = null, seq = 0;

  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();

  // ---------- Thành phần dùng chung: toast, hộp thoại, xác nhận, bảng dữ liệu, ô số liệu ----------
  function toast(msg, kind = 'ok', ms = 3500) {
    const box = $('#toasts'); if (!box) return;
    const t = document.createElement('div'); t.className = 'a-toast ' + kind;
    t.innerHTML = `<span>${kind === 'bad' ? '✕' : '✓'}</span><span class="tm"></span><button type="button" aria-label="${esc(L('Đóng'))}">✕</button>`;
    t.querySelector('.tm').textContent = msg; t.querySelector('button').onclick = () => t.remove();
    box.appendChild(t); while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.remove(), ms);
  }
  // Hộp thoại: showModal khi trình duyệt hỗ trợ (bẫy focus, Esc), không thì mở thường + Esc tự xử lý
  function modal(html, cls = '', label = '') {
    const d = document.createElement('dialog'); d.className = 'key-dlg ' + cls; d.innerHTML = html; if (label) d.setAttribute('aria-label', label);
    const back = document.activeElement; document.body.appendChild(d);
    if (typeof d.showModal === 'function') { d.setAttribute('data-modal', ''); d.showModal(); } else d.setAttribute('open', '');
    d.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeDlg(d); } });
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDlg(d); });
    d.addEventListener('close', () => { d.remove(); if (back && back.focus && back.isConnected) back.focus(); });
    return d;
  }
  function closeDlg(d) { if (!d.isConnected) return; if (typeof d.close === 'function' && d.hasAttribute('data-modal')) d.close(); else { d.removeAttribute('open'); d.dispatchEvent(new Event('close')); } }
  // Xác nhận thao tác (thay confirm/prompt): danger = nút đỏ; typed = phải gõ đúng chuỗi mới bật nút
  function confirmDlg(o) {
    return new Promise(res => {
      let done = false;
      const d = modal(`<div class="key-box"><h3 id="cfT">${esc(o.title)}</h3>${o.body ? `<p class="dlg-body">${esc(o.body)}</p>` : ''}
        ${o.typed ? `<label class="dlg-typed">${esc(L('Gõ {t} để xác nhận', { t: o.typed }))}<input id="cfIn" autocomplete="off" spellcheck="false"></label>` : ''}
        <div class="dlg-act"><button type="button" class="btn ghost" data-no>${esc(o.cancel || L('Hủy'))}</button><button type="button" class="btn ${o.danger ? 'danger-fill' : 'primary'}" data-yes ${o.typed ? 'disabled' : ''}>${esc(o.ok || L('Xác nhận'))}</button></div></div>`, 'cf-dlg');
      d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-labelledby', 'cfT');
      const fin = v => { if (done) return; done = true; closeDlg(d); res(v); };
      const yes = d.querySelector('[data-yes]'), inp = d.querySelector('#cfIn');
      d.querySelector('[data-no]').onclick = () => fin(false); yes.onclick = () => fin(true);
      d.addEventListener('close', () => fin(false));
      if (inp) { inp.oninput = () => { yes.disabled = inp.value.trim() !== o.typed; }; inp.onkeydown = e => { if (e.key === 'Enter' && !yes.disabled) fin(true); }; inp.focus(); }
      else (o.danger ? d.querySelector('[data-no]') : yes).focus();
    });
  }
  const skel = (n = 4) => `<div class="sk-tiles" aria-busy="true" aria-label="${esc(L('Đang tải…'))}">${'<span class="sk sk-tile"></span>'.repeat(n)}</div><span class="sk sk-block"></span>`;
  const emptyState = (title, text = '', icon = '∅') => `<div class="empty"><span class="em-i" aria-hidden="true">${icon}</span><b>${esc(title)}</b>${text ? esc(text) : ''}</div>`;
  const errBox = e => `<div class="err-box" role="alert"><span>⚠️ ${esc(L('Không tải được dữ liệu'))}: ${esc(e && e.message || e)}</span><button type="button" class="btn sm" data-retry>${esc(L('Thử lại'))}</button></div>`;
  // Đường mini 14 điểm (SVG thuần, không thư viện)
  const spark = vals => {
    if (!vals || vals.length < 2) return '';
    const w = 84, h = 30, max = Math.max(1, ...vals), step = w / (vals.length - 1), y = v => (h - 2 - (v / max) * (h - 6)).toFixed(1);
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${y(v)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="area" d="${d} L${w},${h} L0,${h} Z"/><path d="${d}"/></svg>`;
  };
  // Xu hướng so với kỳ trước (▲/▼ %), tooltip = số kỳ trước
  const delta = (cur, prev, vs) => {
    if (cur == null || prev == null || (!+prev && !+cur)) return '';
    if (!+prev) return '';
    const p = Math.round((cur - prev) / prev * 100), c = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
    return `<span class="delta ${c}" title="${esc(L('so với {v}: {n}', { v: vs, n: num(prev) }))}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}%</span>`;
  };
  // Ô số liệu: l (nhãn, HTML tin cậy), v (giá trị), s (dòng phụ), d (xu hướng), sp (đường mini), go (tab đích)
  const tile = o => { const tag = o.go ? 'a' : 'div'; return `<${tag} class="kstat ${o.cls || ''}"${o.go ? ` href="#${o.go}" data-go="${o.go}"` : ''}><span class="tile-l">${o.l}</span><span class="tile-row"><span class="tile-v">${o.v}</span>${o.sp || ''}</span>${o.s || o.d ? `<span class="tile-s">${o.d || ''}${o.s ? `<span>${o.s}</span>` : ''}</span>` : ''}</${tag}>`; };
  /* Bảng dữ liệu: tiêu đề dính, sắp xếp (bấm tiêu đề), lọc chữ, phân trang, trạng thái rỗng.
   * cols: [{ k, label, num, sort: r => giá trị, html: r => HTML (đã esc), cls }] · rows · opts: { pageSize, filter: r => chuỗi, empty: [tiêu đề, mô tả], rowCls: r => lớp, sort: [k, 'asc'|'desc'] } */
  function dataTable(host, cols, rows, opts = {}) {
    const st = { q: '', k: (opts.sort || [])[0] || '', dir: (opts.sort || [])[1] || 'desc', page: 0 }, size = opts.pageSize || 25;
    host.innerHTML = `${opts.filter ? `<div class="dt-tools"><input type="search" class="dt-q" placeholder="${esc(L('🔎 Lọc…'))}" aria-label="${esc(L('Tìm trong bảng'))}"></div>` : ''}<div class="tbl-wrap scroll"><table class="tbl"><thead><tr>${cols.map(c => `<th scope="col" class="${c.num ? 'num' : ''}"${c.sort ? ` data-k="${c.k}" aria-sort="none"` : ''}>${c.sort ? `<button type="button" class="th-sort" aria-label="${esc(L('Sắp xếp theo {c}', { c: c.label }))}">${esc(c.label)} <span class="ar" aria-hidden="true">↕</span></button>` : esc(c.label)}</th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="dt-foot"></div>`;
    const body = host.querySelector('tbody'), foot = host.querySelector('.dt-foot');
    const draw = () => {
      const q = st.q.toLowerCase(); let list = q ? rows.filter(r => String(opts.filter(r)).toLowerCase().includes(q)) : rows.slice();
      const c = cols.find(x => x.k === st.k);
      if (c && c.sort) list.sort((a, b) => { const x = c.sort(a), y = c.sort(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), LOC()); return st.dir === 'asc' ? r : -r; });
      const pages = Math.max(1, Math.ceil(list.length / size)); st.page = Math.min(st.page, pages - 1);
      const view = list.slice(st.page * size, st.page * size + size);
      body.innerHTML = view.map(r => `<tr${opts.rowCls ? ` class="${opts.rowCls(r) || ''}"` : ''}>${cols.map(c => `<td class="${c.num ? 'num ' : ''}${c.cls || ''}">${c.html(r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">${emptyState(...(opts.empty || [L('Chưa có dữ liệu')]))}</td></tr>`;
      host.querySelectorAll('th[data-k]').forEach(th => th.setAttribute('aria-sort', th.dataset.k === st.k ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'));
      foot.innerHTML = list.length > size ? `<span>${esc(L('{a}–{b} / {n}', { a: num(st.page * size + 1), b: num(st.page * size + view.length), n: num(list.length) }))}</span><span><button type="button" class="btn sm" data-pg="-1" ${st.page ? '' : 'disabled'}>${esc(L('← Trước'))}</button> <button type="button" class="btn sm" data-pg="1" ${st.page < pages - 1 ? '' : 'disabled'}>${esc(L('Sau →'))}</button></span>` : '';
      foot.querySelectorAll('[data-pg]').forEach(b => { b.onclick = () => { st.page += +b.dataset.pg; draw(); }; });
    };
    host.querySelectorAll('th[data-k] .th-sort').forEach(b => { b.onclick = () => { const k = b.closest('th').dataset.k; if (st.k === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.k = k; st.dir = 'desc'; } draw(); }; });
    const qi = host.querySelector('.dt-q'); if (qi) qi.oninput = () => { st.q = qi.value.trim(); st.page = 0; draw(); };
    draw(); return { draw, host };
  }
  // Sao chép mã (UID, mã tin…) – ủy quyền sự kiện cho mọi nút .copy
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(b.dataset.copy); b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1200); toast(L('Đã sao chép')); } catch (x) { toast(L('Không sao chép được'), 'bad'); }
  }, true);

  // ---------- Gọi API (giữ nguyên cổng quản trị, đăng nhập lại khi cần) ----------
  const ask = async m => confirmDlg({ title: m, ok: L('Đăng nhập bằng Google') });
  // Hộp thoại quản lý khóa API (Gemini): dán → kiểm tra với Google → lưu; ẩn/hiện khóa
  function keyDialog(st, done) {
    const keys = st.keys || [], live = keys.filter(k => !k.cooling).length;
    const d = modal(`<div class="key-box"><div class="row between"><h3 style="margin:0">${L('✨ Khóa Gemini API')} <span class="chip ${keys.length ? 'ok' : 'warn'}">${L('{n} khóa', { n: keys.length })}</span></h3><button type="button" class="icon-x" data-close aria-label="${L('Đóng')}">✕</button></div>
      <p class="small muted" style="margin:.5rem 0 0">${L('Nhiều khóa = <b>xoay vòng</b>: khóa hết lượt tự nghỉ 1 giờ và chuyển khóa kế tiếp; hết khóa → tự dùng Cloudflare AI. Thêm khóa từ nhiều tài khoản Google để tăng hạn mức miễn phí.')}</p>
      <ul class="key-list">${keys.map(k => `<li><span class="dot ${k.cooling ? 'warn' : 'ok'}"></span><code>…${esc(k.last4)}</code><span class="small muted">${k.cooling ? L('tạm nghỉ (hết lượt)') : L('sẵn sàng')} · ${rel(k.at)}${k.by ? ' · ' + esc(k.by.split('@')[0]) : ''}</span><button type="button" class="icon-btn-s" data-rm="${esc(k.last4)}" title="${L('Gỡ khóa')}" aria-label="${L('Gỡ khóa …{k}', { k: esc(k.last4) })}">🗑</button></li>`).join('') || `<li class="muted small">${L('Chưa có khóa – AI đang dùng Cloudflare Workers AI.')}</li>`}</ul>
      <details ${keys.length ? '' : 'open'} class="key-help"><summary class="small"><b>${L('Cách lấy khóa miễn phí')}</b></summary><ol class="key-steps"><li>${L('Mở {link} (đăng nhập Google)', { link: '<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>' })}</li><li>${L('Bấm <b>Create API key</b> → sao chép')}</li><li>${L('Dán vào ô dưới → <b>{b}</b>', { b: L('Thêm khóa') })}</li></ol></details>
      <div class="key-field"><input type="password" id="kv" placeholder="${L('Dán khóa AIza… hoặc AQ.…')}" aria-label="${L('Khóa API Gemini')}" autocomplete="off" spellcheck="false"><button type="button" class="btn ghost sm" id="kshow" aria-label="${L('Hiện/ẩn khóa')}">👁</button><button type="button" class="btn primary" id="ksave">${L('Thêm khóa')}</button></div>
      <div class="small" id="kmsg" role="status" aria-live="polite" style="min-height:1.2em;margin-top:.4rem"></div>
      <p class="tiny muted" style="margin:.6rem 0 0">${L('🔒 {n} khóa sẵn sàng. Khóa chỉ máy chủ dùng (chấm bài, duyệt bản dịch), chỉ hiện 4 ký tự cuối. Gỡ khóa cần đăng nhập trong 15 phút gần nhất.', { n: live })}</p></div>`, '', L('✨ Khóa Gemini API'));
    d.querySelector('#kv').focus();
    let changed = false;
    d.addEventListener('close', () => { if (changed) done(); });
    const msg = (t, ok) => { const m = d.querySelector('#kmsg'); m.textContent = t; m.className = 'small ' + (ok === true ? 'ok-t' : ok === false ? 'bad-t' : 'muted'); };
    d.querySelector('#kshow').onclick = () => { const i = d.querySelector('#kv'); i.type = i.type === 'password' ? 'text' : 'password'; };
    const add = async () => {
      const key = d.querySelector('#kv').value.trim(); if (!key) return msg(L('Hãy dán khóa trước.'), false);
      const b = d.querySelector('#ksave'); b.disabled = true; msg(L('⏳ Đang kiểm tra với Google…'));
      try { const r = await api('geminiSet', { key }); if (r.ok) { changed = true; msg(L('✓ Đã thêm khóa …{k} (tổng {n} khóa)', { k: r.last4, n: r.count }), true); d.querySelector('#kv').value = ''; setTimeout(() => closeDlg(d), 900); } else msg('✗ ' + (r.error || L('Không lưu được')), false); } catch (e) { msg('✗ ' + e.message, false); }
      b.disabled = false;
    };
    d.querySelector('#ksave').onclick = add; d.querySelector('#kv').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    d.querySelectorAll('[data-rm]').forEach(b => { b.onclick = async () => { if (!(await confirmDlg({ title: L('Gỡ khóa …{k}?', { k: b.dataset.rm }), body: L('AI sẽ không dùng khóa này nữa.'), ok: L('Gỡ khóa'), danger: true }))) return; try { await api('geminiRemove', { last4: b.dataset.rm }); changed = true; b.closest('li').remove(); msg(L('✓ Đã gỡ khóa'), true); } catch (e) { msg('✗ ' + e.message, false); } }; });
  }
  const token = async () => { const u = auth.currentUser || user; if (!u) { if (await ask(L('Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?'))) await signIn(); throw new Error(L('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại')); } return u.getIdToken(); };
  const reauth = async () => { if (await ask(L('Cần đăng nhập lại để xác nhận thao tác quan trọng. Đăng nhập lại ngay?'))) { await auth.signOut(); await signIn(); } throw new Error('reauth'); };
  async function api(op, body = {}) {
    // ui = ngôn ngữ giao diện quản trị (máy chủ chọn vi/en cho vài câu hiển thị); không dùng "lang" vì op review/judge đã dùng cho ngôn ngữ bản dịch
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ui: LANG, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (r.status === 401 && j.error === 'reauth') { if (j.message) { if (await ask(j.message)) { await auth.signOut(); await signIn(); } throw new Error('reauth'); } return reauth(); }
    if (!r.ok) throw new Error(j.error || r.status);
    return j;
  }
  // GrabCast qua proxy /api/social (khóa chỉ ở máy chủ) – tab Video & Social. Lỗi → err.code = mã lỗi máy chủ
  async function sapi(method, path, body, opt = {}) {
    const r = await fetch('/api/social', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ method, path, query: opt.query, body: body || undefined, idem: opt.idem }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const m = j.message || j.detail || (j.error && j.error !== 'upstream' ? j.error : '') || 'HTTP ' + r.status, e = new Error(typeof m === 'string' ? m : JSON.stringify(m)); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Video Studio qua /api/studio – tab Video Studio. Lỗi → err.code + err.data
  async function stapi(op, body = {}) {
    const r = await fetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Thư viện video qua /api/admin-shorts – tab 🎬 Thư viện video (functions/api/admin-shorts.js)
  async function vapi(op, body = {}) {
    const r = await fetch('/api/admin-shorts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; throw e; }
    return j;
  }
  // YouTube (functions/api/youtube.js) – Thư viện video: Kết nối YouTube, Duyệt & lên YouTube. credentials: cookie phiên OAuth (lk_yt)
  async function capi(op, body = {}) { // thư viện clip quy mô lớn → /api/admin-clips (functions/api/admin-clips.js)
    const r = await fetch('/api/admin-clips', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Kênh & phân phối qua /api/distribution (functions/api/distribution.js) – tab 🛰️ + làn nhúng/social ở tab Video (tên riêng: trước đây trùng tên dapi của Kho Drive → bị ghi đè)
  async function distapi(op, body = {}) {
    const r = await fetch('/api/distribution', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  async function yapi(op, body = {}) {
    const r = await fetch('/api/youtube', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Backlink, PR & Thương hiệu qua /api/backlinks – tab Backlink, PR & Thương hiệu. Lỗi → err.code + err.data
  async function bapi(op, body = {}) {
    const r = await fetch('/api/backlinks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Kho Drive riêng qua /api/drive – tab Kho Drive. Lỗi → err.code + err.data
  async function dapi(op, body = {}) {
    const r = await fetch('/api/drive', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && j.error === 'reauth') return reauth();
    if (!r.ok) { const e = new Error(j.message || j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Cài đặt tài khoản quản trị qua /api/admin-prefs (functions/api/admin-prefs.js)
  async function prefApi(op, body = {}) {
    const r = await fetch('/api/admin-prefs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; throw e; }
    return j;
  }
  let idleTimer = null, idleMin = 0, lastAct = Date.now();
  function setupIdleTimer(minutes) {
    idleMin = Number(minutes) || 0;
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
    if (idleMin <= 0) return;
    lastAct = Date.now();
    idleTimer = setInterval(async () => {
      if (idleMin > 0 && Date.now() - lastAct >= idleMin * 60000) {
        clearInterval(idleTimer); idleTimer = null;
        try { await auth.signOut(); } catch (e) { /* bỏ qua */ }
        alert(L('Đã tự động đăng xuất do không thao tác trong {n} phút.', { n: idleMin }));
        location.reload();
      }
    }, 15000);
  }
  const onAct = () => { lastAct = Date.now(); };
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(ev => {
    try { addEventListener(ev, onAct, { passive: true }); } catch (e) { /* bỏ qua */ }
  });
  const gprov = () => { const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; }; // luôn cho chọn tài khoản Google
  const signIn = () => auth.signInWithPopup(gprov()).catch(e => { const m = $('#loginMsg'); if (m) m.textContent = e.message; });
  $('#signin').onclick = signIn;

  // ---------- Thanh trên, thanh bên, đầu trang ----------
  const renderMe = u => {
    $('#me').innerHTML = `<a class="btn ghost sm" href="/app/#/home" id="home" aria-label="${esc(L('Về app'))}">↩ <span class="lbl">${esc(L('Về app'))}</span></a><button type="button" class="btn ghost sm theme-btn" id="thm" title="${esc(L('Đổi giao diện sáng/tối'))}"></button><button type="button" class="btn ghost sm lang-btn" id="lng"></button><span class="adm-email" title="${esc(u.email)}">${esc(u.email)}</span><button type="button" class="btn ghost sm" id="out">${esc(L('Thoát'))}</button>`;
    paintTheme(); paintStatic();
    $('#thm').onclick = cycleTheme;
    $('#lng').onclick = () => setLang(LANG === 'vi' ? 'en' : 'vi');
    $('#out').onclick = () => auth.signOut().then(() => location.reload());
  };
  const BADGE = {};
  const setBadge = (id, text, cls = '') => { BADGE[id] = [text, cls]; const b = document.getElementById(id); if (b) { b.textContent = text; b.className = 'side-b' + (cls ? ' ' + cls : ''); } };
  const renderNav = () => {
    document.querySelectorAll('#tabs .side-b').forEach(b => { if (!BADGE[b.id] && b.textContent) BADGE[b.id] = [b.textContent, b.className.replace('side-b', '').trim()]; }); // huy hiệu do module tự đặt (repN)
    $('#tabs').innerHTML = NAV.map(([g, items]) => `<div class="side-g">${g ? `<h2 class="side-h">${esc(L(g))}</h2>` : ''}${items.map(([k, icon, label, , b]) => `<a class="side-a" href="#${k}" data-tab="${k}"${k === tab ? ' aria-current="page"' : ''}><span class="side-i" aria-hidden="true">${icon}</span><span class="nav-l">${esc(L(label))}</span>${b ? `<b class="side-b" id="${b}"></b>` : ''}</a>`).join('')}</div>`).join('');
    Object.entries(BADGE).forEach(([id, [t, c]]) => setBadge(id, t, c));
  };
  const pageHead = t => {
    const it = ITEM[t]; if (!it) return;
    $('#pgHead').innerHTML = `<div class="pg-tx">${it.group ? `<div class="pg-crumb">${esc(L(it.group))}</div>` : ''}<h1 class="pg-t">${esc(L(it.label))}</h1><p class="pg-d">${esc(L(it.desc))}</p></div><div class="pg-act" id="pgAct"></div>`;
    document.title = L(it.label) + ' · Lexkite Admin';
  };
  const setActions = html => { const a = $('#pgAct'); if (a) a.innerHTML = html; return a; };
  // Ngăn kéo thanh bên (điện thoại)
  const side = $('#side'), scrim = $('#scrim'), navBtn = $('#navBtn');
  const drawer = open => { side.classList.toggle('open', open); scrim.hidden = !open; navBtn.setAttribute('aria-expanded', String(open)); navBtn.querySelector('.sr-only').textContent = L(open ? 'Đóng menu' : 'Mở menu'); if (open) { const a = side.querySelector('[aria-current]') || side.querySelector('a'); if (a) a.focus(); } };
  navBtn.onclick = () => drawer(!side.classList.contains('open'));
  scrim.onclick = () => drawer(false);
  side.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('open')) { drawer(false); navBtn.focus(); } });
  $('.adm-skip').onclick = e => { e.preventDefault(); main.focus(); };
  const noAccess = u => { $('#pgHead').innerHTML = ''; main.innerHTML = `<div class="card center adm-login"><h1 class="adm-login-t">${L('Không có quyền')}</h1><p class="muted">${L('{e} chưa được cấp quyền quản trị.', { e: esc(u.email) })}</p><button type="button" class="btn" id="swAcc">${L('Đổi tài khoản')}</button></div>`; $('#swAcc').onclick = () => auth.signOut().then(() => location.reload()); };
  // Cổng cửa: tài khoản không phải quản trị chỉ thấy màn từ chối (không vẽ thanh trên/thanh bên/nội dung quản trị)
  const deny = () => {
    document.body.classList.remove('adm-in'); side.hidden = true; $('#me').innerHTML = ''; $('#pgHead').innerHTML = ''; $('#tabs').innerHTML = '';
    main.innerHTML = `<div class="card center adm-login" id="denied"><h1 class="adm-login-t">${L('Tài khoản này không có quyền quản trị')}</h1><button type="button" class="btn primary" id="swAcc">${L('Đăng nhập bằng tài khoản khác')}</button></div>`;
    $('#swAcc').onclick = signIn;
  };
  // Hỏi máy chủ (adminGate) ngay sau đăng nhập: 403 = không phải quản trị; lỗi mạng khác → để luồng cũ xử lý (API vẫn chặn)
  const isAdmin = async () => { try { await api('whoami'); return true; } catch (e) { return !(e && e.message === 'forbidden'); } }; // máy chủ chỉ trả 403 'forbidden' khi chắc chắn không phải admin (lỗi tạm = 503 auth-retry)
  // Đổi VI ⇄ EN: lưu lựa chọn, vẽ lại thanh trên + thanh bên + tab đang mở (không tải lại trang)
  async function setLang(l) {
    if (guard && guard() && !(await leaveOk())) return;
    LANG = l; try { localStorage.setItem('lk.admLang', l); } catch (e) { /* bỏ qua */ }
    regionNames = mkRegion(); paintStatic();
    if (user) renderMe(user);
    if (user && denied) noAccess(user); else if (user && document.body.classList.contains('adm-in')) { renderNav(); show(tab, { force: true }); }
  }

  auth.onAuthStateChanged(async u => {
    user = u;
    if (!u) return;
    if (!(await isAdmin())) { user = null; denied = true; deny(); try { await auth.signOut(); } catch (e) { /* bỏ qua */ } return; }
    renderMe(u);
    try {
      let cachedPref = null;
      try { cachedPref = JSON.parse(sessionStorage.getItem('adm.pref') || 'null'); } catch (e) { /* bỏ qua */ }
      if (cachedPref && cachedPref.autoLogoutMin) setupIdleTimer(cachedPref.autoLogoutMin);
      prefApi('get').then(r => {
        if (r && r.pref) {
          try { sessionStorage.setItem('adm.pref', JSON.stringify(r.pref)); } catch (e) { /* bỏ qua */ }
          if (r.pref.autoLogoutMin) setupIdleTimer(r.pref.autoLogoutMin);
        }
      }).catch(() => {});
      const defTab = (cachedPref && cachedPref.tab && VIEWS[cachedPref.tab]) ? cachedPref.tab : 'overview';
      const h = baseOf(location.hash); await show(VIEWS[h] ? h : defTab, { force: true, first: true });
      document.body.classList.add('adm-in'); side.hidden = false; denied = false; renderNav(); badges();
      try { localStorage.setItem('lk.noTrack', '1'); } catch (e) { /* bỏ qua */ } // máy của quản trị: app không gửi thống kê (js/app.js)
    } catch (e) {
      if (e && e.message === 'forbidden') { denied = true; noAccess(u); return; }
      // lỗi tải dữ liệu (D1 hết hạn mức, mạng…) ≠ không có quyền → vẫn vào quản trị, báo lỗi + nút thử lại thay vì 'Access denied'
      document.body.classList.add('adm-in'); side.hidden = false; denied = false; renderNav(); badges();
      main.innerHTML = `<div class="card center"><h2>${L('Không tải được dữ liệu')}</h2><p class="muted">${esc(String(e && e.message || e).slice(0, 300))}</p><button type="button" class="btn primary" id="admRetry">${L('Thử lại')}</button></div>`;
      $('#admRetry').onclick = () => location.reload();
    }
  });

  // ---------- Điều hướng: liên kết thanh bên, #hash, bảng lệnh; chặn rời trang khi còn thay đổi chưa lưu ----------
  const leaveOk = () => confirmDlg({ title: L('Bỏ thay đổi chưa lưu?'), body: L('Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.'), ok: L('Bỏ thay đổi'), cancel: L('Ở lại'), danger: true });
  async function go(hash) {
    const t = baseOf(hash); if (!VIEWS[t] || !user || denied) return;
    if (guard && guard() && !(await leaveOk())) return;
    guard = null; drawer(false);
    if ('#' + String(hash).replace(/^#/, '') !== location.hash) { try { history.pushState(null, '', '#' + String(hash).replace(/^#/, '')); } catch (e) { location.hash = hash; return; } }
    show(t, { force: true });
  }
  $('#tabs').addEventListener('click', e => {
    const a = e.target.closest('a[data-tab]'); if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); go(a.dataset.tab === tab ? a.dataset.tab : a.getAttribute('href'));
  });
  main.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); go(g.dataset.go); return; }
    if (e.target.closest('[data-retry]')) show(tab, { force: true });
  });
  addEventListener('hashchange', async () => { // gõ/đổi #tab trên thanh địa chỉ, Quay lại/Tiến
    const h = baseOf(location.hash); if (!VIEWS[h] || !user || denied) return;
    if (guard && guard()) { if (!(await leaveOk())) { try { history.replaceState(null, '', '#' + tab); } catch (e) { /* bỏ qua */ } return; } guard = null; }
    show(h, { force: true });
  });
  addEventListener('beforeunload', e => { if (guard && guard()) { e.preventDefault(); e.returnValue = ''; } });
  async function show(t, o = {}) {
    if (!VIEWS[t]) t = 'overview';
    stopLive(); guard = null; tab = t; const my = ++seq;
    try { const cur = location.hash.slice(1); history.replaceState(null, '', '#' + t + (baseOf(cur) === t ? cur.slice(t.length) : '')); } catch (e) { /* bỏ qua */ }
    document.querySelectorAll('#tabs a[data-tab]').forEach(a => { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    pageHead(t); main.innerHTML = skel();
    try { await VIEWS[t](); }
    catch (e) { if (o.first || e.message === 'forbidden') throw e; if (my === seq && e.message !== 'reauth') main.innerHTML = errBox(e); }
  }
  async function badges() {
    driveAlerts();
    try {
      const [o, a, nst] = await Promise.all([api('overview'), api('alerts'), api('noticeStats').catch(() => ({}))]);
      setBadge('notN', nst && nst.active ? num(nst.active) : '');
      setBadge('inboxN', o.inbox && o.inbox.open ? num(o.inbox.open) : '', 'hot');
      const n = (a.rows || []).filter(r => !r.ok).length; setBadge('alertN', n ? num(n) : '', 'hot');
    } catch (e) { /* huy hiệu không bắt buộc */ }
  }
  // Cảnh báo chủ động Kho Drive (functions/api/drive.js op alerts): banner đỏ/vàng trên mọi tab + huy hiệu Kho Drive
  const DRV_T = { capacity: 'Nâng gói Cloudflare 5 USD trước ngày {d}', conn: 'Drive {e} mất kết nối – bấm Kết nối lại', net: 'Drive {e}: Google không phản hồi {n} lần liên tiếp', upload: 'Drive {e}: tải lên lỗi {n} lần liên tiếp', quota: 'Drive {e} đã dùng {p}%', pool: 'Toàn kho chỉ còn {g} GB trống', replica: '{n} file chỉ còn 1 bản sao' };
  let drvAl = null;
  const paintDrv = () => {
    const al = drvAl || [], crit = al.filter(a => a.level === 'crit');
    setBadge('drvN', al.length ? (crit.length ? '⛔' : '⚠') + al.length : '', crit.length ? 'drv-crit' : '');
    let el = $('#drvBanner');
    if (!al.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'drvBanner'; el.setAttribute('role', 'alert'); $('#pgHead').parentNode.insertBefore(el, $('#pgHead')); }
    const top = crit[0] || al[0], p = top.p || {};
    el.className = 'drv-banner ' + (crit.length ? 'crit' : 'warn');
    const cap = top.t === 'capacity'; // functions/api/capacity.js – nâng gói Cloudflare → tab Hạn mức
    el.innerHTML = `<b>${crit.length ? '⛔' : '⚠️'} ${esc(L(cap ? 'Hạn mức' : 'Kho Drive'))}:</b> <span>${esc(L(DRV_T[top.t] || DRV_T.conn, { e: p.email || '', n: p.n || '', p: p.pct || '', g: p.gb ?? '', d: p.by || '' }))}${al.length > 1 ? ' ' + esc(L('(+{n} cảnh báo khác)', { n: al.length - 1 })) : ''}</span> <a href="#${cap ? 'quota' : 'drive'}" data-go="${cap ? 'quota' : 'drive'}">${esc(L(cap ? 'Xem Hạn mức' : 'Xem Kho Drive'))} →</a>`;
    el.querySelector('a').onclick = e => { e.preventDefault(); go(cap ? 'quota' : 'drive'); };
  };
  async function driveAlerts() { try { const r = await dapi('alerts'); drvAl = r.alerts || []; } catch (e) { return; } paintDrv(); }

  // ---------- Bảng lệnh Ctrl/⌘+K: nhảy tới mọi mục + vài lệnh nhanh ----------
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const raw = s => s.split('@@')[0];
  const cmdItems = () => {
    const pages = [];
    NAV.forEach(([g, items]) => items.forEach(([k, icon, label]) => pages.push({ g: 'Trang', icon, t: L(label), hint: g ? L(g) : '', kw: [k, raw(label), EN[label] || '', g], run: () => go(k) })));
    [['drive/browse', '📂', 'Kho Drive · Duyệt file'], ['drive/ledger', '📒', 'Kho Drive · Sổ kho'], ['drive/audit', '🧾', 'Kho Drive · Nhật ký']].forEach(([h, icon, label]) => pages.push({ g: 'Trang', icon, t: L(label), hint: '#' + h, kw: [h, raw(label), EN[label]], run: () => go(h) }));
    const cmds = [
      { g: 'Lệnh', icon: '↻', t: L('Tải lại trang này'), kw: ['reload', 'refresh', 'tai lai'], run: () => show(tab, { force: true }) },
      { g: 'Lệnh', icon: '🌗', t: L('Đổi giao diện sáng/tối'), kw: ['theme', 'dark', 'light', 'giao dien', 'toi', 'sang'], run: cycleTheme },
      { g: 'Lệnh', icon: '🌐', t: LANG === 'vi' ? L('Đổi sang tiếng Anh') : L('Đổi sang tiếng Việt'), kw: ['language', 'english', 'vietnamese', 'ngon ngu'], run: () => setLang(LANG === 'vi' ? 'en' : 'vi') },
      { g: 'Lệnh', icon: '↩', t: L('Về app'), kw: ['app', 'home'], run: () => { location.href = '/app/#/home'; } },
      { g: 'Lệnh', icon: '⎋', t: L('Thoát'), kw: ['sign out', 'logout', 'thoat'], run: () => auth.signOut().then(() => location.reload()) },
    ];
    return [...pages, ...cmds];
  };
  function palette() {
    if (!user || denied || $('#cmdkDlg')) return;
    const items = cmdItems();
    const d = modal(`<div class="cmdk-in"><span aria-hidden="true">⌕</span><input id="cmdkQ" type="text" role="combobox" aria-expanded="true" aria-controls="cmdkL" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${esc(L('Tìm trang hoặc lệnh…'))}" aria-label="${esc(L('Tìm trang hoặc lệnh…'))}"></div><ul class="cmdk-l" id="cmdkL" role="listbox" aria-label="${esc(L('Kết quả'))}"></ul><div class="cmdk-foot" aria-hidden="true"><span><kbd>↑</kbd> <kbd>↓</kbd> ${esc(L('chọn'))}</span><span><kbd>↵</kbd> ${esc(L('mở'))}</span><span><kbd>Esc</kbd> ${esc(L('đóng'))}</span></div>`, 'cmdk-dlg', L('Bảng lệnh'));
    d.id = 'cmdkDlg';
    const q = d.querySelector('#cmdkQ'), ul = d.querySelector('#cmdkL'); let list = [], sel = 0;
    const draw = () => {
      const words = fold(q.value).split(/\s+/).filter(Boolean);
      list = items.filter(it => { const hay = fold([it.t, it.hint || '', ...(it.kw || [])].join(' ')); return words.every(w => hay.includes(w)); });
      sel = Math.min(sel, Math.max(0, list.length - 1));
      let g = '', i = 0; ul.innerHTML = list.map(it => { const head = it.g !== g ? `<li class="cmdk-g" role="presentation">${esc(L(g = it.g))}</li>` : ''; const id = i; i++; return `${head}<li class="cmdk-o" role="option" id="cmdk-o-${id}" data-i="${id}" aria-selected="${id === sel}"><span aria-hidden="true">${it.icon}</span><span>${esc(it.t)}</span>${it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ''}</li>`; }).join('') || `<li class="cmdk-g" role="presentation">${esc(L('Không tìm thấy'))}</li>`;
      if (list.length) { q.setAttribute('aria-activedescendant', 'cmdk-o-' + sel); const el = ul.querySelector(`[data-i="${sel}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); } else q.removeAttribute('aria-activedescendant');
    };
    const run = i => { const it = list[i]; if (!it) return; closeDlg(d); it.run(); };
    q.oninput = () => { sel = 0; draw(); };
    q.onkeydown = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, list.length); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + list.length) % Math.max(1, list.length); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    };
    ul.onclick = e => { const o = e.target.closest('[data-i]'); if (o) run(+o.dataset.i); };
    ul.onmousemove = e => { const o = e.target.closest('[data-i]'); if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; draw(); } };
    draw(); q.focus();
  }
  $('#cmdk').onclick = palette;
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if ($('#cmdkDlg')) closeDlg($('#cmdkDlg')); else palette(); }
  });

  // "Ngày" thống kê = giờ Việt Nam (khớp functions/api/hit.js dayOf)
  const vday = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
  const NODATA = () => emptyState(L('Chưa có dữ liệu'));
  // Biểu đồ 24 cột giờ trong ngày
  const hourChart = rows => { const v = Array.from({ length: 24 }, (_, h) => ((rows || []).find(r => r.k === h) || {}).n || 0), m = Math.max(1, ...v); return `<div class="hchart">${v.map((n, h) => `<div title="${L('{h}h: {n} phiên', { h, n })}"><i style="height:${Math.max(2, n / m * 100)}%"></i><small>${h % 3 ? '' : h + 'h'}</small></div>`).join('')}</div>`; };
  // Cột chồng khách mới / quay lại theo ngày
  const stack = rows => { if (!rows.length) return NODATA(); const m = Math.max(1, ...rows.map(r => (r.fresh || 0) + (r.back || 0))); return `<div class="hchart stack">${rows.slice(-30).map(r => `<div title="${L('{d}: {f} mới · {b} quay lại', { d: esc(r.day), f: r.fresh || 0, b: r.back || 0 })}"><i class="b" style="height:${(r.back || 0) / m * 100}%"></i><i style="height:${(r.fresh || 0) / m * 100}%"></i><small>${esc(String(r.day).slice(8))}</small></div>`).join('')}</div><p class="small muted"><span class="lg new"></span> ${L('Khách mới')} <span class="lg back"></span> ${L('Quay lại')}</p>`; };
  // total: mẫu số cho % khi rows chỉ là top N (vd. 12 quốc gia đầu) – thiếu thì lấy tổng các dòng đang hiện
  const bars = (rows, label = r => r.k, val = r => r.n, extra = r => '', total = 0) => {
    if (!rows || !rows.length) return NODATA();
    const max = Math.max(1, ...rows.map(val)), tot = Math.max(+total || 0, rows.reduce((t, r) => t + (+val(r) || 0), 0)) || 1;
    return `<div class="hbars">${rows.map(r => `<div class="row2"><span class="k" title="${esc(label(r))}">${esc(label(r)) || '–'}</span><span class="track"><i style="width:${val(r) / max * 100}%"></i></span><span class="v">${num(val(r))}<small> · ${Math.round(val(r) / tot * 100)}%${extra(r)}</small></span></div>`).join('')}</div>`;
  };
  // Đủ mọi ngày trong khoảng chọn (ngày không có phiên = 0) – tránh vài cột khổng lồ khi dữ liệu thưa
  const padDays = (rows, days) => { const by = Object.fromEntries((rows || []).map(r => [r.day, r])), out = []; for (let i = Math.min(days, 90) - 1; i >= 0; i--) { const d = vday(Date.now() - i * 864e5); out.push(by[d] || { day: d, s: 0, v: 0 }); } return out; };
  const chart = (rows, key, label) => {
    if (!rows.length) return NODATA();
    const W = 600, H = 170, max = Math.max(1, ...rows.map(r => +r[key] || 0)), bw = W / rows.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">${rows.map((r, i) => { const h = (+r[key] || 0) / max * H; return `<rect x="${i * bw + 1}" y="${H - h}" width="${Math.max(bw - 2, 1)}" height="${h}" rx="2" fill="var(--primary)"><title>${esc(r.day)}: ${num(r[key])}</title></rect>`; }).join('')}<text x="0" y="${H + 14}">${esc(rows[0].day)}</text><text x="${W}" y="${H + 14}" text-anchor="end">${esc(rows[rows.length - 1].day)}</text><text x="2" y="10">${num(max)}</text></svg>`;
  };

  // ---------- Phân tích trực tiếp: thẻ KPI, biểu đồ vùng 14 ngày, bản đồ thế giới (jsvectormap tải lười) ----------
  let liveTimer = null, worldMap = null, mapKey = '', mapLib = null, mapRO = null;
  const stopLive = () => { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } if (mapRO) { mapRO.disconnect(); mapRO = null; } if (worldMap) { try { worldMap.destroy(); } catch (e) { /* bỏ qua */ } worldMap = null; } mapKey = ''; };
  const PLAT = { web: ['🌐', 'Web'], pwa: ['📲', 'PWA (web đã cài)'], ext: ['🧩', 'Add-on Chrome'], ios: ['🍎', 'iOS'], android: ['🤖', 'Android'], app: ['📱', 'App (cũ)'] };
  const platName = k => PLAT[k] ? L(PLAT[k][1]) : k || '–', platIcon = k => (PLAT[k] || ['❔'])[0];
  const mkRegion = () => { try { return new Intl.DisplayNames([LANG], { type: 'region' }); } catch (e) { return null; } }; // trình duyệt cũ → null
  let regionNames = mkRegion();
  const cname = c => { if (c === 'T1') return 'Tor'; if (!realCC(c)) return L('Không rõ'); try { return regionNames ? regionNames.of(c) : c; } catch (e) { return c; } };
  const durS = s => { s = Math.round(+s || 0); return s < 60 ? L('{s} giây', { s }) : L('{m}p {s}s', { m: Math.floor(s / 60), s: String(s % 60).padStart(2, '0') }); };
  const nf1 = x => (+x || 0).toLocaleString(LOC(), { maximumFractionDigits: 1 });
  // Biểu đồ vùng mượt 2 chuỗi (lượt xem + khách) – di chuột vào cột để xem số (title)
  const areaChart = rows => {
    if (!rows || !rows.length) return NODATA();
    const W = Math.round(Math.min(1200, Math.max(320, main.clientWidth - 70))), H = 200, PL = 36, T = 12, B = 22, iw = W - PL - 8, ih = H - T - B, n = rows.length;
    const max = Math.max(1, ...rows.map(r => +r.views || 0), ...rows.map(r => +r.visitors || 0)), nice = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
    const X = i => PL + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => T + ih - (+v || 0) / nice * ih;
    const smooth = pts => pts.map((p, i) => { if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`; const a = pts[i - 2] || pts[i - 1], b = pts[i - 1], c = p, d = pts[i + 1] || p, k = 6; return `C${(b[0] + (c[0] - a[0]) / k).toFixed(1)},${Math.min(T + ih, b[1] + (c[1] - a[1]) / k).toFixed(1)} ${(c[0] - (d[0] - b[0]) / k).toFixed(1)},${Math.min(T + ih, c[1] - (d[1] - b[1]) / k).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`; }).join(' ');
    const pv = rows.map((r, i) => [X(i), Y(r.views)]), pu = rows.map((r, i) => [X(i), Y(r.visitors)]), lv = smooth(pv);
    const grid = [0, .5, 1].map(f => `<line x1="${PL}" x2="${W - 8}" y1="${(T + ih - f * ih).toFixed(1)}" y2="${(T + ih - f * ih).toFixed(1)}" class="ac-grid"/><text x="${PL - 6}" y="${(T + ih - f * ih + 3).toFixed(1)}" text-anchor="end">${num(Math.round(nice * f))}</text>`).join('');
    const dd = d => LANG === 'en' ? d.slice(5, 7) + '/' + d.slice(8) : d.slice(8) + '/' + d.slice(5, 7), cw = n > 1 ? iw / (n - 1) : iw;
    return `<svg class="area-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Lượt xem và khách 14 ngày qua')}"><defs><linearGradient id="acFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".3"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${lv} L${X(n - 1).toFixed(1)},${T + ih} L${X(0).toFixed(1)},${T + ih} Z" fill="url(#acFill)"/><path d="${lv}" class="ac-v"/><path d="${smooth(pu)}" class="ac-u"/>
      ${rows.map((r, i) => `<g class="ac-col"><rect x="${(X(i) - cw / 2).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${ih}" fill="transparent"/><line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${T}" y2="${T + ih}" class="ac-hl"/><circle cx="${pv[i][0].toFixed(1)}" cy="${pv[i][1].toFixed(1)}" r="3.5" class="ac-dv"/><circle cx="${pu[i][0].toFixed(1)}" cy="${pu[i][1].toFixed(1)}" r="3" class="ac-du"/>${i % 2 === (n - 1) % 2 ? `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${dd(r.day)}</text>` : ''}<title>${L('{d}: {v} lượt xem · {u} khách', { d: dd(r.day), v: num(r.views), u: num(r.visitors) })}</title></g>`).join('')}</svg>
      <p class="small muted ac-legend"><span class="lg new"></span> ${L('Lượt xem')} <span class="lg vis"></span> ${L('Khách')}</p>`;
  };
  // Dòng "đã loại": máy tự động & quản trị hôm nay không cộng vào số người thật (để thấy bộ lọc đang chạy)
  const EXCL = { ci: 'CI của mình', 'ci-app': 'App trên máy ảo CI', ua: 'Bot/công cụ (UA)', bot: 'Bot đã xác minh', dc: 'Máy chủ đám mây', admin: 'Quản trị' };
  const exclLine = l => {
    const x = l.excluded; if (!x) return '';
    const parts = (x.kinds || []).map(r => `${esc(L(EXCL[r.k] || r.k))} ${num(r.s)}`).join(' · ');
    return `<p class="excl">🤖 ${L('Tự động/bot & quản trị hôm nay: {n} phiên (đã loại)', { n: num(x.s) })}${parts ? ' – ' + parts : ''} · ${L('Ngày theo giờ Việt Nam (UTC+7)')}</p>`;
  };
  const liveCard = l => {
    const t = l.today || {}, tot = l.total || {};
    const lt = (icon, label, val, sub = '', cls = '') => `<div class="lt ${cls}"><div class="lt-l">${icon} ${label}</div><div class="lt-v">${val}</div>${sub ? `<div class="lt-s">${sub}</div>` : ''}</div>`;
    return `<div class="card-h live-head"><h2 class="h3">${L('📈 Lưu lượng trực tiếp')}</h2><span class="telemetry-pill"><span class="pulse-dot"></span>${L('Live · tự cập nhật 30s · {t}', { t: clock(l.at || Date.now()) })}</span></div>
      ${l.rate < 1 ? `<p class="excl">${L('Lấy mẫu {p}% – số thực ≈ × {x}', { p: Math.round(l.rate * 100), x: Math.round(1 / l.rate) })}</p>` : ''}
      ${exclLine(l)}
      <div class="lt-grid">
        ${lt('<span class="pulse-dot"></span>', L('Đang online <small>(5 phút)</small>'), num(l.online), L('khách có tín hiệu gần đây'), 'on')}
        ${lt('👁️', L('Lượt xem hôm nay'), num(t.views), L('{n} phiên', { n: num(t.s) }))}
        ${lt('🧑', L('Khách hôm nay'), num(t.visitors), L('thiết bị khác nhau'))}
        ${lt('📄', L('Trang/khách'), nf1(t.perVisitor), L('hôm nay'))}
        ${lt('⏱️', L('Thời gian TB'), t.s ? durS(t.dur) : '–', L('mỗi phiên hôm nay'))}
        ${lt('Σ', L('Tổng lượt xem'), num(tot.views), L('{n} khách từ trước đến nay', { n: num(tot.visitors) }))}
      </div>
      <div class="ac-wrap"><div class="small muted ac-title">${L('14 ngày qua')}</div>${areaChart(l.series)}</div>`;
  };
  const route = k => '#/' + (k || 'home');
  const liveGrid = l => {
    const P = ['web', 'pwa', 'ext', 'ios', 'android'], m = rows => Object.fromEntries((rows || []).map(r => [r.k, r.n]));
    const pt = m(l.platsToday), p30 = m(l.plats30), keys = [...P, ...Object.keys({ ...pt, ...p30 }).filter(k => !P.includes(k))];
    const tt = Math.max(1, ...keys.map(k => pt[k] || 0)), t3 = Math.max(1, ...keys.map(k => p30[k] || 0));
    return `
      <div class="card"><h3>${L('🌍 Quốc gia hôm nay')}</h3>${bars((l.countries || []).slice(0, 12), r => FLAG(r.k) + ' · ' + cname(r.k), r => r.n, () => '', (l.today || {}).visitors)}</div>
      <div class="card"><h3>${L('👀 Đang xem')} <span class="small muted">· ${num(l.online)} online</span></h3>${(l.viewing || []).length ? bars(l.viewing, r => route(r.k)) : emptyState(L('Không ai online trong 5 phút qua'))}</div>
      <div class="card"><h3>${L('📄 Trang xem nhiều hôm nay')}</h3>${bars(l.pagesToday, r => route(r.k))}${l.pagesFallback ? `<p class="tiny muted">${L('Theo trang vào đầu tiên (chưa có số lượt xem từng trang).')}</p>` : ''}</div>
      <div class="card"><h3>${L('🔗 Nguồn giới thiệu hôm nay')}</h3>${(l.refs || []).length ? bars(l.refs) : emptyState(L('Chủ yếu truy cập trực tiếp'))}</div>
      <div class="card"><h3>${L('🔥 Trang xem nhiều · 7 ngày')}</h3>${bars(l.pages7, r => route(r.k))}</div>
      <div class="card"><h3>${L('📱 Nền tảng')}</h3><table class="tbl plat-tbl"><thead><tr><th scope="col">${L('Nền tảng')}</th><th scope="col" class="num">${L('Hôm nay')}</th><th scope="col" class="num">${L('30 ngày')}</th></tr></thead><tbody>${keys.map(k => `<tr><td>${platIcon(k)} ${esc(platName(k))}</td><td class="num"><span class="mini"><i style="width:${(pt[k] || 0) / tt * 100}%"></i></span>${num(pt[k])}</td><td class="num"><span class="mini"><i style="width:${(p30[k] || 0) / t3 * 100}%"></i></span>${num(p30[k])}</td></tr>`).join('')}</tbody></table><p class="tiny muted">${L('Số khách (thiết bị) khác nhau.')}</p></div>`;
  };
  // Nạp jsvectormap (MIT, lưu sẵn trong web/js/vendor) chỉ khi mở tab Phân tích
  const loadMap = () => mapLib || (mapLib = new Promise((ok, fail) => {
    if (!document.querySelector('link[data-jvm]')) { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'css/vendor/jsvectormap.min.css'; c.dataset.jvm = 1; document.head.appendChild(c); }
    const js = src => new Promise((y, n) => { const s = document.createElement('script'); s.src = src; s.onload = y; s.onerror = n; document.head.appendChild(s); });
    js('js/vendor/jsvectormap/jsvectormap.min.js').then(() => js('js/vendor/jsvectormap/world.js')).then(() => window.jsVectorMap ? ok(window.jsVectorMap) : fail(new Error('jsvectormap'))).catch(e => { mapLib = null; fail(e); });
  }));
  const BUCKETS = [['1', 1, '#FFE7C2'], ['2–5', 2, '#FFC94A'], ['6–20', 6, '#FFB054'], ['21–100', 21, '#F2553B'], ['100+', 101, '#CC3F1C']]; // dải màu thương hiệu (kem → vàng → cam)
  const bucket = n => [...BUCKETS].reverse().find(b => n >= b[1]);
  async function drawMap(countries) {
    const box = $('#worldMap'); if (!box) return;
    const rows = (countries || []).filter(r => realCC(r.k)), vals = Object.fromEntries(rows.map(r => [r.k, r.n])), known = rows.reduce((a, r) => a + r.n, 0), unk = (countries || []).filter(r => !realCC(r.k)).reduce((a, r) => a + r.n, 0);
    mapKey = JSON.stringify(countries || []);
    if ($('#mapSum')) $('#mapSum').textContent = L('{c} quốc gia · {n} khách', { c: rows.length, n: num(known) }) + (unk ? L(' · {n} không rõ', { n: num(unk) }) : '');
    if ($('#mapLegend')) $('#mapLegend').innerHTML = `<span class="small muted">${L('Ít')}</span>${BUCKETS.map(b => `<span class="ml-i"><i style="background:${b[2]}"></i>${b[0]}</span>`).join('')}<span class="small muted">${L('Nhiều khách')}</span>`;
    try {
      const JVM = await loadMap(); if (!$('#worldMap') || tab !== 'analytics') return;
      if (worldMap) { try { worldMap.destroy(); } catch (e) { /* bỏ qua */ } worldMap = null; }
      box.innerHTML = '';
      const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const values = Object.fromEntries(Object.entries(vals).map(([k, n]) => [k, bucket(n)[0]]));
      worldMap = new JVM({
        selector: '#worldMap', map: 'world', backgroundColor: 'transparent', zoomButtons: true, zoomOnScroll: false, zoomMax: 8,
        regionStyle: { initial: { fill: css('--surface-3') || '#e8e9f4', stroke: css('--surface') || '#ffffff', strokeWidth: .4 }, hover: { fillOpacity: .8, cursor: 'pointer' } },
        series: { regions: [{ attribute: 'fill', scale: Object.fromEntries(BUCKETS.map(b => [b[0], b[2]])), values }] },
        onRegionTooltipShow(e, tip, code) { tip.text(L('{c} – {n} khách hôm nay', { c: cname(code), n: num(vals[code] || 0) })); },
      });
      // Bản đồ tự co giãn theo khung (đổi cỡ cửa sổ / xoay máy)
      if (window.ResizeObserver && !mapRO) { let w = 0; mapRO = new ResizeObserver(() => { const k = box.clientWidth + 'x' + box.clientHeight; if (worldMap && k !== w) { w = k; try { worldMap.updateSize(); } catch (e) { /* bỏ qua */ } } }); mapRO.observe(box); }
    } catch (e) {
      box.classList.add('fallback');
      box.innerHTML = `<p class="small muted">${L('Không tải được bản đồ – danh sách quốc gia:')}</p>${bars(rows, r => FLAG(r.k) + ' · ' + cname(r.k))}`;
    }
  }
  // ---------- Người dùng: hộp thoại chi tiết & xóa dữ liệu (gõ lại UID để xác nhận) ----------
  async function userDel(uid, email, done) {
    const ok = await confirmDlg({ title: L('Xóa vĩnh viễn dữ liệu đồng bộ?'), body: L('Xóa toàn bộ dữ liệu đồng bộ của {e}. Tài khoản Google không bị ảnh hưởng. Không thể hoàn tác.', { e: email || uid }), typed: uid, ok: L('Xóa vĩnh viễn'), danger: true });
    if (!ok) return;
    try { await api('userDelete', { uid, confirm: uid }); toast(L('Đã xóa dữ liệu của {e}', { e: email || uid })); done && done(); } catch (e) { if (e.message !== 'reauth') toast(L('Không xóa được: {e}', { e: e.message }), 'bad'); }
  }
  const rolePill = adm => adm ? `<span class="chip warn">${L('👑 Quản trị')}</span>` : `<span class="chip">${L('Người học')}</span>`;
  async function userDialog(uid, done) {
    const d = modal(`<div class="key-box"><p class="muted">${L('Đang tải…')}</p></div>`, 'u-dlg', L('Chi tiết người dùng'));
    let r; try { r = await api('user', { uid }); } catch (e) { d.querySelector('.key-box').innerHTML = `<p class="bad-t">✗ ${esc(e.message)}</p><div class="dlg-act"><button type="button" class="btn" data-close>${L('Đóng')}</button></div>`; return; }
    const u = r.user || {}, docs = r.docs || [], backups = r.backups || [];
    let LR = r.learn, tags = Array.isArray(u.tags) ? [...u.tags] : [];
    const fact = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;

    const render = () => {
      const total = docs.reduce((a, x) => a + (x.bytes || 0), 0);
      const cards = docs.filter(x => /^cards_/.test(x.k)), other = docs.filter(x => !/^cards_/.test(x.k));
      d.querySelector('.key-box').innerHTML = `
        <div class="row between">
          <div class="u-who">
            <span class="u-av big" aria-hidden="true">${esc((u.name || u.email || '?').trim().charAt(0).toUpperCase())}</span>
            <span>
              <h3 style="margin:0">${esc(u.name || L('(không tên)'))} ${rolePill(u.isAdmin)} ${u.blocked ? `<span class="chip bad">⛔ ${L('Bị khóa đồng bộ')}</span>` : ''}</h3>
              <span class="small muted">${esc(u.email || '')}</span>
            </span>
          </div>
          <button type="button" class="icon-x" data-close aria-label="${L('Đóng')}">✕</button>
        </div>

        ${u.blocked ? `<div class="u-blocked-banner"><span>⛔</span><span>${L('Tài khoản này đang bị khóa đồng bộ. /api/sync sẽ trả 403 khi kéo/đẩy dữ liệu.')}</span></div>` : ''}

        <dl class="u-facts">
          ${fact('UID', copyBtn(u.uid || uid))}
          ${fact(L('Nền tảng'), `${platIcon(u.plat)} ${esc(platName(u.plat))}`)}
          ${fact(L('Ngày tạo'), rel(u.created))}
          ${fact(L('Hoạt động gần nhất'), rel(u.seen))}
          ${fact(L('Số lần vào (đồng bộ)'), num(u.n))}
          ${fact(L('Dữ liệu đồng bộ'), L('{b} · {n} phần', { b: bytes(total), n: docs.length }))}
        </dl>

        <div class="u-section">
          <div class="u-h"><span>🏷️ ${L('Nhãn & Ghi chú nội bộ')}</span> <button type="button" class="btn sm primary" id="uSaveTags">${L('Lưu')}</button></div>
          <div class="u-tag-chips" id="uTagList">
            ${tags.map((t, i) => `<span class="u-tag-chip"><span>${esc(t)}</span><button type="button" data-rmtag="${i}" aria-label="${L('Xóa nhãn')}">✕</button></span>`).join('') || `<span class="small muted">${L('(chưa gắn nhãn)')}</span>`}
          </div>
          <div class="row" style="gap:.4rem;align-items:center;margin:.4rem 0">
            <input type="text" id="uNewTag" placeholder="${L('Nhập nhãn mới…')}" style="max-width:180px;font-size:.8rem;padding:.25rem .5rem" maxlength="30">
            <button type="button" class="btn sm" id="uAddTag">${L('+ Thêm nhãn')}</button>
          </div>
          <div class="u-tag-quick">
            <span class="tiny muted" style="align-self:center">${L('Gợi ý:')}</span>
            ${['VIP', 'tester', 'support', 'teacher'].map(t => `<button type="button" class="btn ghost sm" data-qtag="${esc(t)}">+ ${esc(t)}</button>`).join('')}
          </div>
          <textarea class="u-notes-txt" id="uNotes" placeholder="${L('Ghi chú riêng của admin về người dùng này (chỉ admin thấy)…')}" maxlength="2000">${esc(u.notes || '')}</textarea>
        </div>

        ${LR ? `<div class="u-section"><h4 class="u-h" style="margin-top:0">${L('📚 Học tập')}</h4><div class="u-stats">${[['⭐', 'XP', num(LR.xp)], ['🔥', L('Chuỗi ngày'), num(LR.streak)], ['📅', L('Ngày đã học'), num(LR.studyDays)], ['🃏', L('Lượt ôn'), num(LR.reviews)], ['🌱', L('Từ mới'), num(LR.newWords)], ['🎯', L('Bài luyện'), num(LR.quizzes)], ['📖', L('Bài đọc'), num(LR.readings)], ['🎙️', L('Từ đã nói'), num(LR.spoken)], ['🏅', L('Huy hiệu'), num(LR.badges)]].map(([i, k, v]) => `<div><span>${i} ${k}</span><b>${v}</b></div>`).join('')}</div>${LR.lastStudy ? `<p class="tiny muted" style="margin-top:.4rem">${L('Ngày học gần nhất: {d}', { d: esc(LR.lastStudy) })}</p>` : ''}</div>` : ''}

        <div class="u-section">
          <h4 class="u-h" style="margin-top:0">${L('🗂️ Tài liệu đồng bộ')}</h4>
          <div class="tbl-wrap u-docs"><table class="tbl sticky"><thead><tr><th scope="col">${L('Phần')}</th><th scope="col" class="num">${L('Dung lượng')}</th><th scope="col">${L('Cập nhật')}</th></tr></thead><tbody>${other.map(x => `<tr><td><code>${esc(x.k)}</code></td><td class="num">${bytes(x.bytes)}</td><td class="small">${rel(x.updated)}</td></tr>`).join('')}${cards.length ? `<tr><td><code>cards_*</code> <span class="small muted">${L('({n} gói thẻ)', { n: cards.length })}</span></td><td class="num">${bytes(cards.reduce((a, x) => a + x.bytes, 0))}</td><td class="small">${rel(Math.max(...cards.map(x => x.updated)))}</td></tr>` : ''}${docs.length ? '' : `<tr><td colspan="3">${emptyState(L('Không có dữ liệu đồng bộ'))}</td></tr>`}</tbody></table></div>
        </div>

        <div class="u-section">
          <h4 class="u-h" style="margin-top:0"><span>📦 ${L('Bản sao lưu tiến độ (30 ngày)')}</span> <span class="tiny muted">${L('{n} bản lưu', { n: backups.length })}</span></h4>
          ${backups.length ? `<div class="tbl-wrap u-backups"><table class="tbl sticky"><thead><tr><th scope="col">${L('Thời gian')}</th><th scope="col">${L('Người sao lưu')}</th><th scope="col" class="num">${L('Dung lượng')}</th><th scope="col"><span class="sr-only">${L('Khôi phục')}</span></th></tr></thead><tbody>${backups.map(bk => `<tr><td class="small">${rel(bk.at)}<br><span class="tiny muted">${when(bk.at)}</span></td><td class="small">${esc(bk.by || 'admin')}</td><td class="num small">${bytes(bk.bytes || 0)}</td><td class="nowrap"><button type="button" class="btn ghost sm" data-restore="${bk.id}" data-at="${bk.at}">${L('↩️ Khôi phục')}</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="tiny muted">${L('Chưa có bản sao lưu nào. Hệ thống tự động sao lưu dữ liệu trước khi Đặt lại tiến độ.')}</p>`}
        </div>

        <div class="u-act-bar">
          <div class="u-act-group">
            <button type="button" class="btn sm" id="uNotif">📣 ${L('Gửi thông báo')}</button>
            <button type="button" class="btn sm" id="uExport">⬇ ${L('Xuất JSON (GDPR)')}</button>
            ${u.email ? `<a class="btn sm" href="mailto:${esc(u.email)}">${L('✉️ Gửi email')}</a>` : ''}
          </div>
          <div class="u-act-group">
            <button type="button" class="btn sm ${u.blocked ? 'primary' : 'ghost danger'}" id="uBlock">${u.blocked ? L('✅ Mở khóa đồng bộ') : L('⛔ Khóa đồng bộ')}</button>
            <button type="button" class="btn ghost sm danger" id="uReset">🔄 ${L('Đặt lại tiến độ')}</button>
            ${docs.length || u.uid ? `<button type="button" class="btn ghost sm danger" id="udel">${L('🗑 Xóa vĩnh viễn')}</button>` : ''}
          </div>
        </div>`;

      // Xóa nhãn
      d.querySelectorAll('[data-rmtag]').forEach(b => {
        b.onclick = () => { tags.splice(+b.dataset.rmtag, 1); render(); };
      });
      // Gợi ý nhãn
      d.querySelectorAll('[data-qtag]').forEach(b => {
        b.onclick = () => {
          const t = b.dataset.qtag;
          if (t && !tags.includes(t) && tags.length < 10) { tags.push(t); render(); }
        };
      });
      // Thêm nhãn mới
      const addTag = () => {
        const inp = d.querySelector('#uNewTag');
        const v = inp ? inp.value.trim().slice(0, 30) : '';
        if (v && !tags.includes(v) && tags.length < 10) { tags.push(v); render(); }
      };
      const addBtn = d.querySelector('#uAddTag'); if (addBtn) addBtn.onclick = addTag;
      const tagInp = d.querySelector('#uNewTag'); if (tagInp) tagInp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } };

      // Lưu nhãn & ghi chú
      const saveBtn = d.querySelector('#uSaveTags');
      if (saveBtn) saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        const notes = (d.querySelector('#uNotes') || {}).value || '';
        try {
          await api('userTag', { uid: u.uid, tags, notes });
          u.tags = tags; u.notes = notes;
          toast(L('Đã lưu nhãn và ghi chú nội bộ'));
          done && done();
        } catch (e) {
          toast(L('Lỗi lưu nhãn: {e}', { e: e.message }), 'bad');
        }
        saveBtn.disabled = false;
      };

      // Gửi thông báo
      const notifBtn = d.querySelector('#uNotif');
      if (notifBtn) notifBtn.onclick = () => {
        try { sessionStorage.setItem('adm.targetUser', JSON.stringify({ uid: u.uid, email: u.email || u.name || '' })); } catch (e) { /* bỏ qua */ }
        closeDlg(d);
        show('notices');
      };

      // Xuất JSON GDPR
      const expBtn = d.querySelector('#uExport');
      if (expBtn) expBtn.onclick = async () => {
        expBtn.disabled = true; expBtn.textContent = L('⏳ Đang xuất…');
        try {
          const data = await api('userExportData', { uid: u.uid });
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url;
          a.download = `lexkite-user-${u.uid.slice(0, 12)}-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast(L('Đã xuất toàn bộ dữ liệu GDPR'));
        } catch (e) {
          toast(L('Lỗi xuất dữ liệu: {e}', { e: e.message }), 'bad');
        }
        expBtn.disabled = false; expBtn.textContent = `⬇ ${L('Xuất JSON (GDPR)')}`;
      };

      // Khóa / Mở khóa
      const blockBtn = d.querySelector('#uBlock');
      if (blockBtn) blockBtn.onclick = async () => {
        const blk = !u.blocked;
        const ok = await confirmDlg({
          title: blk ? L('Khóa đồng bộ tài khoản?') : L('Mở khóa đồng bộ tài khoản?'),
          body: blk ? L('Khi bị khóa, tài khoản {e} sẽ không thể đồng bộ dữ liệu học tập lên máy chủ.', { e: u.email || u.uid }) : L('Mở khóa cho phép tài khoản {e} tiếp tục đồng bộ bình thường.', { e: u.email || u.uid }),
          typed: u.email || u.uid,
          ok: blk ? L('Khóa tài khoản') : L('Mở khóa'),
          danger: blk
        });
        if (!ok) return;
        try {
          await api('userBlock', { uid: u.uid, blocked: blk ? 1 : 0, confirm: u.email || u.uid });
          u.blocked = blk ? 1 : 0;
          toast(blk ? L('Đã khóa đồng bộ {e}', { e: u.email || u.uid }) : L('Đã mở khóa đồng bộ {e}', { e: u.email || u.uid }));
          render();
          done && done();
        } catch (e) {
          if (e.message !== 'reauth') toast(L('Lỗi: {e}', { e: e.message }), 'bad');
        }
      };

      // Đặt lại tiến độ học
      const rstBtn = d.querySelector('#uReset');
      if (rstBtn) rstBtn.onclick = async () => {
        const ok = await confirmDlg({
          title: L('Đặt lại tiến độ học tập?'),
          body: L('Toàn bộ thẻ ôn tập, XP, chuỗi ngày của {e} sẽ bị xóa về 0. Hệ thống sẽ tự động lưu 1 bản sao lưu trong 30 ngày.', { e: u.email || u.uid }),
          typed: u.email || u.uid,
          ok: L('Đặt lại tiến độ'),
          danger: true
        });
        if (!ok) return;
        try {
          const res = await api('userReset', { uid: u.uid, confirm: u.email || u.uid });
          toast(L('Đã đặt lại tiến độ và tạo bản sao lưu ({n} tài liệu)', { n: res.backedUp || 0 }));
          const fresh = await api('user', { uid: u.uid });
          docs.length = 0; docs.push(...(fresh.docs || []));
          backups.length = 0; backups.push(...(fresh.backups || []));
          LR = fresh.learn;
          render();
          done && done();
        } catch (e) {
          if (e.message !== 'reauth') toast(L('Lỗi đặt lại: {e}', { e: e.message }), 'bad');
        }
      };

      // Khôi phục bản sao lưu
      d.querySelectorAll('[data-restore]').forEach(btn => {
        btn.onclick = async () => {
          const bId = +btn.dataset.restore, atStr = when(+btn.dataset.at);
          const ok = await confirmDlg({
            title: L('Khôi phục tiến độ học tập?'),
            body: L('Khôi phục toàn bộ dữ liệu của {e} từ bản sao lưu lúc {t}. Dữ liệu hiện tại sẽ bị ghi đè.', { e: u.email || u.uid, t: atStr }),
            typed: u.email || u.uid,
            ok: L('Khôi phục'),
            danger: true
          });
          if (!ok) return;
          try {
            const res = await api('userRestore', { uid: u.uid, backupId: bId, confirm: u.email || u.uid });
            toast(L('Đã khôi phục thành công {n} tài liệu', { n: res.restored || 0 }));
            const fresh = await api('user', { uid: u.uid });
            docs.length = 0; docs.push(...(fresh.docs || []));
            backups.length = 0; backups.push(...(fresh.backups || []));
            LR = fresh.learn;
            render();
            done && done();
          } catch (e) {
            if (e.message !== 'reauth') toast(L('Lỗi khôi phục: {e}', { e: e.message }), 'bad');
          }
        };
      });

      // Xóa vĩnh viễn
      const del = d.querySelector('#udel');
      if (del) del.onclick = () => userDel(u.uid, u.email, () => { closeDlg(d); done && done(); });
    };

    render();
  }

  // ---------- Cài đặt: định nghĩa trường (mặc định, kiểu, giới hạn) – khóa khớp CONFIG_KEYS của functions/api/admin.js ----------
  const SECRET = /\b(sk-|AIza|AQ\.|ghp_|xox|-----BEGIN)/;
  const SETTINGS = [
    { id: 'banner', title: 'Thông báo đầu trang', desc: 'Dải thông báo hiện trên đầu web/app cho mọi người dùng.', preview: true, foot: 'Hiện trên web/app sau tối đa 1 giờ (bộ đệm cấu hình).', fields: [
      { k: 'banner', type: 'text', label: 'Nội dung thông báo', help: 'Để trống = tắt thông báo.', def: '', max: 300 },
      { k: 'banner_url', type: 'url', label: 'Liên kết kèm theo', help: 'Không bắt buộc – phải bắt đầu bằng https://', def: '' },
      { k: 'banner_level', type: 'seg', label: 'Kiểu thông báo', def: 'info', opts: [['info', 'ℹ️', 'Thông tin'], ['warn', '⚠️', 'Cảnh báo@@lvl'], ['ok', '✅', 'Thành công']] },
    ] },
    { id: 'ai', title: 'Giới hạn AI', desc: 'Số lượt chấm bài viết/nói bằng AI mỗi ngày.', foot: 'Nếu tab Hạn mức đã đặt hạn mức cho tính năng "ai", giá trị ở đó được ưu tiên.', fields: [
      { k: 'ai_user', type: 'int', label: 'Người dùng đã đăng nhập', unit: 'lượt/người/ngày', def: 5, min: 0, max: 1000 },
      { k: 'ai_anon', type: 'int', label: 'Khách (chưa đăng nhập)', unit: 'lượt/khách/ngày', def: 3, min: 0, max: 1000 },
      { k: 'ai_global', type: 'int', label: 'Trần toàn hệ thống', unit: 'lượt/ngày', def: 400, min: 0, max: 100000, help: 'Khóa cũ – trần chung hiện do cầu dao nhà cung cấp ở tab Hạn mức quản lý.' },
    ] },
    { id: 'mon', title: 'Giám sát', desc: 'Khi nào gửi cảnh báo tự động.', fields: [
      { k: 'alert_errors', type: 'int', label: 'Ngưỡng cảnh báo lỗi JS', unit: 'lỗi/24 giờ', def: 50, min: 1, max: 100000, help: 'Vượt ngưỡng → mục đỏ trong Cảnh báo và email tóm tắt về support.' },
    ] },
    { id: 'an', title: 'Lấy mẫu thống kê', desc: 'Tỉ lệ người dùng gửi thống kê phiên.', fields: [
      { k: 'hit_rate', type: 'rate', label: 'Tỉ lệ lấy mẫu', def: 1, min: 0.01, max: 1, help: 'Trên ~30.000 người/ngày nên đặt 0,1 để D1 ở gói miễn phí.' },
    ] },
    { id: 'note', title: 'Ghi chú nội bộ', desc: 'Chỉ quản trị thấy. Không ghi khóa hay mật khẩu.', fields: [
      { k: 'note', type: 'area', label: 'Ghi chú cho quản trị', def: '', max: 2000 },
    ] },
  ];
  const validate = (f, v) => {
    if (v === '') return '';
    if (f.type === 'int') return /^\d+$/.test(v) && +v >= f.min && +v <= f.max ? '' : L('Phải là số nguyên từ {a} đến {b}.', { a: num(f.min), b: num(f.max) });
    if (f.type === 'rate') { const x = +String(v).replace(',', '.'); return isFinite(x) && x >= f.min && x <= f.max && /^[\d.,]+$/.test(v) ? '' : L('Phải là số từ {a} đến {b}.', { a: f.min, b: f.max }); }
    if (f.type === 'url') return /^https:\/\/[^\s]+$/.test(v) ? '' : L('Liên kết phải bắt đầu bằng https://');
    if (f.max && v.length > f.max) return L('Tối đa {n} ký tự.', { n: num(f.max) });
    if ((f.type === 'area' || f.type === 'text') && SECRET.test(v)) return L('Có vẻ là khóa/bí mật – không lưu ở đây.');
    return '';
  };

  const repMod = () => window.AdminReports ? Promise.resolve() : new Promise((y, n) => { const sc = document.createElement('script'); sc.src = 'js/admin-reports.js'; sc.onload = y; sc.onerror = n; document.head.appendChild(sc); }); // Báo lỗi (tải lười)
  const lazy = (name, src) => window[name] ? Promise.resolve() : new Promise((y, n) => { const sc = document.createElement('script'); sc.src = src; sc.onload = y; sc.onerror = () => n(new Error(src)); document.head.appendChild(sc); });
  const VIEWS = {
    async overview() {
      const [o, a, q, gk, u] = await Promise.all([api('overview'), api('alerts'), api('quality').catch(() => ({})), api('geminiStatus').catch(() => ({})), api('usage').catch(() => ({}))]);
      const H = o.humans || {}, U = o.users || {}, E = o.errors24 || {}, I = o.inbox || {}, rows = a.rows || [], bad = rows.filter(r => !r.ok);
      const mau = +U.act30 || 0, dau = +U.act1 || 0, stick = mau > 0 ? Math.round(dau / mau * 100) : (dau > 0 ? 100 : 0);
      const qScore = q.score != null ? q.score : null, liveKeys = (gk.keys || []).filter(k => !k.cooling).length;
      const d1 = (u.meters || []).find(m => /d1/i.test(m.name));
      const statusMeta = r => {
        const st = String(r.status || '').toLowerCase(), cn = String(r.conclusion || '').toLowerCase();
        if (st === 'in_progress' || st === 'running') return ['pulse', 'info', L('Đang chạy…')];
        if (st === 'queued' || st === 'pending' || cn === 'skipped') return ['wait', 'muted', cn === 'skipped' ? L('Bỏ qua') : L('Đang chờ')];
        if (cn === 'success' || (r.ok && !r.warn)) return ['ok', 'ok', L('Thành công')];
        if (r.warn) return ['warn', 'warn', L('Cảnh báo@@status')];
        return ['bad', 'bad', L('Cần chú ý')];
      };
      setActions(`<span class="telemetry-pill"><span class="pulse-dot"></span>${esc(L('Cập nhật {t}', { t: clock(Date.now()) }))}</span><button type="button" class="btn sm" id="admReload" title="${esc(L('Tải lại số liệu'))}">↻ ${esc(L('Làm mới'))}</button>`);
      $('#admReload').onclick = () => show('overview', { force: true });
      const v = x => x == null ? '–' : num(x);
      const pipe = (bad.length ? bad : rows.slice(0, 8)).map(r => { const [dot, chip, text] = statusMeta(r); return `<div class="pipe-i"><span class="pipe-n" title="${esc(r.name)}"><span class="dot ${dot}"></span>${esc(r.name)}</span><span class="chip ${chip}">${esc(r.conclusion || text)}</span></div>`; }).join('');
      main.innerHTML = `
        <h2 class="sec-t">${L('Người thật')}</h2>
        <div class="tiles">
          ${tile({ l: L('Người thật hôm nay'), v: v(H.d1), d: delta(H.d1, H.p1, L('hôm qua')), s: L('thiết bị khác nhau'), sp: spark((o.series || []).map(r => r.v)), go: 'analytics' })}
          ${tile({ l: L('Người thật 7 ngày'), v: v(H.d7), d: delta(H.d7, H.p7, L('7 ngày trước đó')), s: L('thiết bị khác nhau'), go: 'analytics' })}
          ${tile({ l: L('Người thật 30 ngày'), v: v(H.d30), d: delta(H.d30, H.p30, L('30 ngày trước đó')), s: L('thiết bị khác nhau'), go: 'analytics' })}
          ${tile({ l: `<span class="pulse-dot"></span> ${L('Đang online')}`, v: v(o.online), s: L('tín hiệu trong 5 phút qua'), cls: 'live', go: 'analytics' })}
        </div>
        <h2 class="sec-t">${L('Học viên')}</h2>
        <div class="tiles">
          ${tile({ l: L('Đăng nhập hôm nay'), v: v(U.act1), s: esc(L('7 ngày: {a} · 30 ngày: {b}', { a: num(U.act7), b: num(U.act30) })), go: 'users' })}
          ${tile({ l: L('Học viên đăng ký'), v: v(U.total), d: +U.new7 ? `<span class="delta up">${esc(L('+{n} / 7 ngày', { n: num(U.new7) }))}</span>` : '', go: 'users' })}
          ${tile({ l: L('Gắn kết (DAU / MAU)'), v: stick + '%', d: `<span class="chip ${stick >= 25 ? 'ok' : 'warn'}">${L('Chuẩn EdTech ≥ 25%')}</span>` })}
          ${tile({ l: L('Thẻ đã ôn'), v: '–', s: L('Chưa đo – cần sự kiện ôn thẻ trong thống kê') })}
        </div>
        <h2 class="sec-t">${L('Vận hành')}</h2>
        <div class="tiles">
          ${tile({ l: L('Lỗi JS (24 giờ)'), v: v(E.hits), d: `<span class="chip ${+E.hits ? 'bad' : 'ok'}">${+E.hits ? esc(L('{n} loại', { n: num(E.kinds) })) : L('Không có lỗi')}</span>`, go: 'alerts' })}
          ${tile({ l: L('Phiên tự động đã loại'), v: v(o.excluded), s: L('bot, CI, quản trị – hôm nay'), go: 'analytics' })}
          ${tile({ l: L('Tin nhắn chưa xử lý'), v: v(I.open), d: `<span class="chip ${+I.open ? 'warn' : 'ok'}">${+I.open ? L('Chờ trả lời') : L('Sạch hòm thư')}</span>`, go: 'inbox' })}
          ${tile({ l: L('Điểm chất lượng'), v: qScore == null ? '–' : qScore + '%', d: qScore == null ? `<span class="chip">${L('chưa chạy')}</span>` : `<span class="chip ${qScore >= 100 ? 'ok' : 'bad'}">${qScore >= 100 ? L('Đạt chuẩn') : L('Dưới chuẩn')}</span>`, go: 'quality' })}
          ${tile({ l: L('Khóa Gemini API'), v: gk.set ? `${liveKeys}<small>/${(gk.keys || []).length}</small>` : 'CF AI', d: `<span class="chip ${gk.set ? 'ok' : 'warn'}">${gk.set ? esc(L('{n} sẵn sàng', { n: liveKeys })) : L('Chưa thiết lập')}</span>`, s: d1 ? esc(L('D1: {p}% dung lượng', { p: d1.pct })) : '', go: 'services' })}
        </div>
        <section class="card mt"><div class="card-h"><h2 class="h3">${bad.length ? L('Tác vụ cần chú ý') : L('Tác vụ tự động (GitHub Actions)')}</h2><a href="#alerts" data-go="alerts" class="small">${L('Toàn bộ cảnh báo & nhật ký →')}</a></div>
          ${pipe ? `<div class="pipe-grid">${pipe}</div>` : emptyState(L('Chưa có tác vụ'))}</section>`;
    },
    async analytics() {
      const days = +(sessionStorage.getItem('adm.days') || 30);
      const [a, l] = await Promise.all([api('analytics', { days }), api('live', { days }).catch(() => null)]), s = a.sum || {};
      const pct = (x, y) => y ? Math.round(x / y * 100) + '%' : '–';
      const span = days === 1 ? L('hôm nay') : L('{n} ngày', { n: days });
      setActions(`<div class="range-tabs" role="group" aria-label="${esc(L('Khoảng thời gian (phần Chi tiết)'))}">${[1, 7, 30, 90, 365].map(d => `<button type="button" data-d="${d}" aria-pressed="${d === days}">${d === 1 ? L('Hôm nay') : L('{n} ngày', { n: d })}</button>`).join('')}</div>`)
        .querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { sessionStorage.setItem('adm.days', b.dataset.d); show('analytics', { force: true }); }; });
      const T = (l2, val, sub = '') => tile({ l: l2, v: val, s: sub });
      main.innerHTML = `
        ${a.rate < 1 ? `<div class="card" role="note">${L('ℹ️ Đang lấy mẫu {p}% người dùng – số phiên/người thực tế ≈ số dưới đây × {x}; tỉ lệ % và trung bình giữ nguyên.', { p: Math.round(a.rate * 100), x: Math.round(1 / a.rate) })}</div>` : ''}
        ${l ? `<section class="card live-card" id="liveCard">${liveCard(l)}</section>
        <section class="card map-card"><div class="card-h"><h2 class="h3">${L('🗺️ Khách theo quốc gia · hôm nay')}</h2><span class="small muted" id="mapSum"></span></div><div class="world-map" id="worldMap" role="img" aria-label="${L('Bản đồ khách theo quốc gia hôm nay')}"></div><div id="mapLegend" class="map-legend"></div></section>
        <div class="adm-grid live-grid" id="liveGrid">${liveGrid(l)}</div>` : `<div class="err-box" role="alert">${L('Không tải được số liệu trực tiếp.')}</div>`}
        <h2 class="sec-t">${L('Chi tiết · {r}', { r: span })}</h2>
        <div class="tiles">
          ${T(L('Phiên truy cập'), num(s.s))}
          ${T(L('Khách (thiết bị)'), num(s.v), L('{n} phiên/khách', { n: s.v ? nf1(s.s / s.v) : 0 }))}
          ${T(L('Thời gian TB/phiên'), dur(s.dur))}
          ${T(L('Trang/phiên'), nf1(s.pages))}
          ${T(L('Khách quay lại'), pct(s.ret, s.s))}
          ${T(L('Thoát ngay (&lt;15 giây, 1 trang)'), pct(s.bounce, s.s))}
          ${T(L('LCP thật (tốc độ hiện nội dung)'), s.lcp ? (s.lcp / 1000).toFixed(2) + ' s' : '–', s.lcpN ? L('p75 · {p} phiên đạt “Tốt” (≤ 2,5 s)', { p: pct(s.lcpGood, s.lcpN) }) : L('chưa có dữ liệu'))}
        </div>
        <div class="card mt"><h3>${L('Phiên theo ngày')}</h3>${chart(padDays(a.daily, a.days), 's', L('Phiên theo ngày: {r}', { r: span }))}</div>
        <div class="adm-grid">
          <div class="card"><h3>${L('Nguồn truy cập')}</h3>${bars(a.refs, r => L(r.k), r => r.n, r => ` · ${dur(r.dur)}`)}</div>
          <div class="card"><h3>${L('Quốc gia')}</h3>${bars(a.countries, r => FLAG(r.k), r => r.n, () => '', s.s)}</div>
          <div class="card"><h3>${L('Trang vào đầu tiên')}</h3>${bars(a.paths, r => '#/' + r.k)}</div>
          <div class="card"><h3>${L('Tần suất (số phiên mỗi khách)')}</h3>${bars(['1', '2–3', '4–7', '8–15', '16+'].map(k => (a.freq || []).find(f => f.k === k) || { k, n: 0 }), r => L('{k} lần', { k: r.k }))}</div>
          <div class="card"><h3>${L('Thiết bị')}</h3>${bars(a.devs)}<h3 class="mt">${L('Nền tảng@@h')}</h3>${bars(a.plats, r => platName(r.k))}</div>
          <div class="card"><h3>${L('Ngôn ngữ giao diện')}</h3>${bars(a.langs)}</div>
        </div>
        <h2 class="sec-t">${L('Thói quen sử dụng')}</h2>
        <div class="adm-grid">
          <div class="card span2"><h3>${L('Giờ cao điểm (giờ Việt Nam)')}</h3>${hourChart(a.hours)}</div>
          <div class="card"><h3>${L('Ngày trong tuần')}</h3>${bars(['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((k, i) => ({ k: L(k), n: ((a.wdays || []).find(w => w.k === i) || {}).n || 0 })))}</div>
          <div class="card"><h3>${L('Thời lượng phiên')}</h3>${bars(a.durs || [], r => L(r.k))}</div>
        </div>
        <h2 class="sec-t">${L('Tăng trưởng')}</h2>
        <div class="adm-grid">
          <div class="card span2"><h3>${L('Khách mới & khách quay lại theo ngày')}</h3>${stack(a.nr || [])}</div>
          <div class="card"><h3>${L('Tài khoản đăng ký mới')}</h3>${(a.signups || []).length ? bars(a.signups.slice(-14).reverse(), r => r.day) : emptyState(L('Chưa có đăng ký mới trong khoảng này'))}</div>
        </div>
        <p class="small muted mt">${L('Thống kê ẩn danh tự xây: không cookie, không lưu IP; quốc gia do Cloudflare xác định. Chỉ tính người thật: loại bot, máy chủ đám mây (CI GitHub, máy ảo Android/iOS), header CI, chế độ sandbox và tài khoản quản trị. "Hôm nay" theo giờ Việt Nam (UTC+7).')}${a.excluded && a.excluded.s ? ' ' + L('Đã loại trong khoảng này: {n} phiên.', { n: num(a.excluded.s) }) : ''}</p>`;
      if (window.AdminGrowth) { const g = document.createElement('section'); main.appendChild(g); AdminGrowth.render(g, api, L, { esc, num, lang: () => LANG }); } // js/admin-growth.js
      if (!l) return;
      drawMap(l.countries);
      // Tự cập nhật thẻ trực tiếp 30 giây/lần – chỉ khi đang mở tab Phân tích và trang đang hiển thị
      liveTimer = setInterval(async () => {
        if (tab !== 'analytics') { stopLive(); return; }
        if (document.hidden) return;
        try {
          const n = await api('live', { days }); if (tab !== 'analytics' || !$('#liveCard')) return;
          $('#liveCard').innerHTML = liveCard(n); $('#liveGrid').innerHTML = liveGrid(n);
          if (JSON.stringify(n.countries) !== mapKey) drawMap(n.countries);
        } catch (e) { /* lỗi mạng tạm thời – thử lại lượt sau */ }
      }, 30000);
    },
    async users() {
      let f; try { f = JSON.parse(sessionStorage.getItem('adm.uf') || '{}'); } catch (e) { f = {}; }
      f = { q: '', role: '', status: '', plat: '', sort: 'seen', offset: 0, ...f };
      const sel = (id, label, opts) => `<label class="u-sel"><span>${L(label)}</span><select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${f[id.slice(1)] === v ? 'selected' : ''}>${L(t)}</option>`).join('')}</select></label>`;
      setActions(`<button type="button" class="btn sm" id="ucsv" title="${esc(L('Tải CSV theo bộ lọc hiện tại (tối đa 5.000 dòng)'))}">⬇ CSV</button>`);
      main.innerHTML = `
        <div class="tiles" id="uKpi">${'<span class="sk sk-tile"></span>'.repeat(5)}</div>
        <div class="card mt">
          <div class="u-tools">
            <input type="search" id="uq" placeholder="${L('🔎 Tìm email, tên hoặc UID')}" value="${esc(f.q)}" aria-label="${L('Tìm người dùng')}">
            ${sel('frole', 'Vai trò', [['', 'Tất cả'], ['admin', 'Quản trị'], ['learner', 'Người học']])}
            ${sel('fstatus', 'Trạng thái', [['', 'Tất cả'], ['active7', 'Hoạt động 7 ngày'], ['dormant', 'Ngủ đông >30 ngày'], ['new7', 'Mới 7 ngày']])}
            ${sel('fplat', 'Nền tảng', [['', 'Tất cả'], ['web', 'Web'], ['ios', 'iOS'], ['android', 'Android'], ['ext', 'Add-on Chrome'], ['app', 'App (cũ)']])}
            ${sel('fsort', 'Sắp xếp', [['seen', 'Hoạt động gần nhất'], ['new', 'Mới nhất']])}
          </div>
          <div class="tbl-wrap scroll" id="uTable"><span class="sk sk-block" style="margin:0"></span></div>
          <div class="u-pager" id="uPager"></div>
        </div>`;
      const save = () => sessionStorage.setItem('adm.uf', JSON.stringify(f));
      let my = 0;
      const load = async () => {
        save(); const me = ++my; let r;
        try { r = await api('users', f); } catch (e) { if (me === my && tab === 'users') $('#uTable').innerHTML = errBox(e); return; }
        if (me !== my || tab !== 'users') return;
        const k = r.kpi || {}, tot = r.total || 0;
        $('#uKpi').innerHTML = `
          ${tile({ l: L('Tổng người dùng'), v: num(tot), s: L('tài khoản đã đồng bộ') })}
          ${tile({ l: L('Hoạt động hôm nay'), v: num(k.act1), s: L('24 giờ qua') })}
          ${tile({ l: L('Hoạt động 7 / 30 ngày'), v: `${num(k.act7)} <small>/ ${num(k.act30)}</small>`, s: L('{p}% còn hoạt động trong tháng', { p: tot ? Math.round((k.act30 || 0) / tot * 100) : 0 }) })}
          ${tile({ l: L('Mới 7 ngày'), v: num(k.new7), s: L('tài khoản đăng ký mới') })}
          <div class="kstat"><span class="tile-l">${L('Theo nền tảng')}</span><div class="u-plats">${(r.plats || []).map(p => `<span class="chip">${platIcon(p.k)} ${esc(platName(p.k))} · <b>${num(p.n)}</b></span>`).join('') || '<span class="small muted">–</span>'}</div></div>`;
        $('#uTable').innerHTML = `<table class="tbl u-tbl"><thead><tr><th scope="col">${L('Người dùng')}</th><th scope="col">${L('Vai trò')}</th><th scope="col">${L('Nền tảng')}</th><th scope="col">${L('Ngày tạo')}</th><th scope="col">${L('Hoạt động gần nhất')}</th><th scope="col" class="num">${L('Lần vào')}</th><th scope="col"><span class="sr-only">${L('Thao tác')}</span></th></tr></thead><tbody>
          ${(r.rows || []).map(u => {
            const utags = (Array.isArray(u.tags) ? u.tags : (() => { try { return JSON.parse(u.tags || '[]'); } catch (e) { return []; } })());
            return `<tr><td><div class="u-who"><span class="u-av" aria-hidden="true">${esc((u.name || u.email || '?').trim().charAt(0).toUpperCase())}</span><span><b>${esc(u.name || L('(không tên)'))}</b> ${u.blocked ? `<span class="chip bad sm">⛔ ${L('Bị khóa')}</span>` : ''}<br><span class="small muted">${esc(u.email || u.uid)}</span>${utags.length ? `<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.2rem">${utags.map(t => `<span class="chip sm">${esc(t)}</span>`).join('')}</div>` : ''}</span></div></td>
            <td>${rolePill(u.isAdmin)}</td>
            <td class="nowrap">${platIcon(u.plat)} ${esc(platName(u.plat))}</td><td class="small nowrap">${rel(u.created)}</td>
            <td class="small nowrap"><span class="dot ${Date.now() - u.seen < 7 * 864e5 ? 'ok' : Date.now() - u.seen > 30 * 864e5 ? '' : 'warn'}"></span>${rel(u.seen)}</td><td class="num">${num(u.n)}</td>
            <td class="nowrap"><button type="button" class="btn ghost sm" data-uid="${esc(u.uid)}">${L('Chi tiết')}</button> <button type="button" class="btn ghost sm" data-notif="${esc(u.uid)}" data-em="${esc(u.email || u.name || '')}" title="${L('Gửi thông báo')}">📣 ${L('Gửi')}</button> <button type="button" class="btn ghost sm danger" data-del="${esc(u.uid)}" data-em="${esc(u.email || '')}">${L('Xóa dữ liệu')}</button></td></tr>`;
          }).join('') || `<tr><td colspan="7">${emptyState(L('Không có người dùng khớp bộ lọc'), L('Thử bỏ bớt bộ lọc hoặc từ khóa.'))}</td></tr>`}</tbody></table>`;
        const from = r.filtered ? f.offset + 1 : 0, to = Math.min(f.offset + 50, r.filtered);
        $('#uPager').innerHTML = `<span>${num(from)}–${num(to)} / ${num(r.filtered)}${r.filtered !== tot ? L(' (lọc từ {n})', { n: num(tot) }) : ''}</span><span><button type="button" class="btn sm" id="uprev" ${f.offset ? '' : 'disabled'}>${L('← Trước')}</button> <button type="button" class="btn sm" id="unext" ${to < r.filtered ? '' : 'disabled'}>${L('Sau →')}</button></span>`;
        $('#uprev').onclick = () => { f.offset = Math.max(0, f.offset - 50); load(); };
        $('#unext').onclick = () => { f.offset += 50; load(); };
        main.querySelectorAll('[data-uid]').forEach(b => { b.onclick = () => userDialog(b.dataset.uid, load); });
        main.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => userDel(b.dataset.del, b.dataset.em, load); });
        main.querySelectorAll('[data-notif]').forEach(b => { b.onclick = () => { try { sessionStorage.setItem('adm.targetUser', JSON.stringify({ uid: b.dataset.notif, email: b.dataset.em })); } catch (e) { /* bỏ qua */ } show('notices'); }; });
      };
      let deb; $('#uq').oninput = () => { clearTimeout(deb); deb = setTimeout(() => { f.q = $('#uq').value.trim(); f.offset = 0; load(); }, 350); };
      [['#frole', 'role'], ['#fstatus', 'status'], ['#fplat', 'plat'], ['#fsort', 'sort']].forEach(([id, k]) => { $(id).onchange = () => { f[k] = $(id).value; f.offset = 0; load(); }; });
      $('#ucsv').onclick = async () => {
        const b = $('#ucsv'); b.disabled = true; b.textContent = L('⏳ Đang xuất…');
        try {
          const r = await api('usersExport', { ...f, offset: 0 });
          const cell = v => { let x = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return /[",\n\r;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
          const iso = t => t ? new Date(t).toISOString() : '';
          const lines = [['email', 'name', 'role', 'plat', 'created', 'seen', 'n'], ...r.rows.map(u => [u.email, u.name, u.isAdmin ? 'admin' : 'learner', u.plat, iso(u.created), iso(u.seen), u.n])].map(x => x.map(cell).join(','));
          const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a'); a.href = url; a.download = `lexkite-users-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast(L('Đã xuất {n} dòng', { n: num(r.rows.length) }));
        } catch (e) { toast(L('Lỗi xuất CSV'), 'bad'); }
        b.disabled = false; b.textContent = '⬇ CSV';
      };
      await load();
    },
    async inbox() {
      const f = sessionStorage.getItem('adm.inbox') || 'open', r = await api('inbox', { filter: f });
      const gmail = m => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.email) + '&su=' + encodeURIComponent('Re: Lexkite – ' + (m.msg || '').slice(0, 50)) + '&body=' + encodeURIComponent(`\n\n---\n${m.name || ''} <${m.email}> (${when(m.at)}):\n${m.msg}`);
      setActions(`<div class="range-tabs" role="group" aria-label="${esc(L('Lọc tin nhắn'))}"><button type="button" data-f="open" aria-pressed="${f === 'open'}">${L('Chưa xử lý')}</button><button type="button" data-f="all" aria-pressed="${f === 'all'}">${L('Tất cả')}</button></div>`)
        .querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { sessionStorage.setItem('adm.inbox', b.dataset.f); show('inbox', { force: true }); }; });
      main.innerHTML = `<p class="small muted">${L('Bản sao được chuyển vào support@lexkite.com')}</p>
        ${(r.rows || []).map(m => `<article class="card ib-item${m.handled ? ' done' : ''}"><div class="card-h"><b>${esc(m.name || L('(không tên)'))} &lt;${esc(m.email)}&gt;</b><span class="ib-meta">${rel(m.at)} · ${esc(m.lang)} · ${copyBtn(m.id, '#' + m.id)}${m.sent ? '' : ` · <span class="chip warn">${L('chưa chuyển vào Gmail')}</span>`}</span></div>
          <p class="msg">${esc(m.msg)}</p><div class="tools" style="margin:0"><a class="btn primary sm" target="_blank" rel="noopener" href="${esc(gmail(m))}">${L('Trả lời bằng Gmail')}</a><a class="btn sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: Lexkite')}">${L('Ứng dụng email')}</a><button type="button" class="btn ghost sm" data-id="${esc(m.id)}" data-h="${m.handled ? 0 : 1}">${m.handled ? L('Mở lại') : L('✓ Đã xử lý')}</button></div></article>`).join('') || `<div class="card">${emptyState(L('Không có tin nhắn'), L('Hộp thư trống – mọi tin đã được xử lý.'), '📭')}</div>`}`;
      main.querySelectorAll('[data-id][data-h]').forEach(b => { b.onclick = async () => { b.disabled = true; try { await api('inboxMark', { id: +b.dataset.id, handled: +b.dataset.h }); toast(+b.dataset.h ? L('Đã đánh dấu xử lý') : L('Đã mở lại tin nhắn')); badges(); show('inbox', { force: true }); } catch (e) { b.disabled = false; toast(e.message, 'bad'); } }; });
    },
    async alerts() {
      const [a, e, lg] = await Promise.all([api('alerts'), api('errors'), api('auditLog').catch(() => ({ rows: [] }))]);
      main.innerHTML = `<section class="card"><div class="card-h"><h2 class="h3">${L('Trạng thái tự động')}</h2></div><div id="tAuto"></div><p class="small muted">${L('Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.')}</p></section>
        <section class="card mt"><div class="card-h"><h2 class="h3">${L('Lỗi JavaScript từ người dùng')}</h2>${(e.rows || []).length ? `<button type="button" class="btn ghost sm danger" id="eclr">${L('Xóa tất cả')}</button>` : ''}</div><div id="tErr"></div></section>
        <section class="card mt"><div class="card-h"><h2 class="h3">${L('Nhật ký quản trị (100 thao tác gần nhất)')}</h2></div><p class="small muted">${L('Mọi thao tác ghi/xóa và mọi lần tài khoản lạ cố vào trang quản trị (dòng đỏ). IP được băm, không lưu IP gốc.')}</p><div id="tLog"></div></section>`;
      const stDot = r => r.ok ? (r.warn ? 'warn' : 'ok') : 'bad';
      dataTable($('#tAuto'), [
        { k: 'name', label: L('Tác vụ'), sort: r => r.name, html: r => `<span class="dot ${stDot(r)}"></span>${esc(r.name)}` },
        { k: 'res', label: L('Kết quả@@run'), sort: r => (r.ok ? (r.warn ? 1 : 2) : 0), html: r => `<span class="chip ${stDot(r)}">${esc(r.conclusion || r.status || '')}</span>` },
        { k: 'at', label: L('Lúc'), sort: r => r.at || 0, html: r => r.at ? rel(r.at) : '' },
        { k: 'url', label: '', html: r => r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${L('Xem')}</a>` : '' },
      ], a.rows || [], { sort: ['res', 'asc'], pageSize: 50, empty: [L('Chưa có tác vụ')] });
      dataTable($('#tErr'), [
        { k: 'msg', label: L('Lỗi'), sort: r => r.msg, cls: 'msg', html: r => esc(r.msg) },
        { k: 'src', label: L('Vị trí'), cls: 'small', html: r => esc(r.src) },
        { k: 'path', label: L('Trang@@path'), sort: r => r.path || '', html: r => esc(r.path) },
        { k: 'n', label: L('Số lần'), num: true, sort: r => +r.n || 0, html: r => num(r.n) },
        { k: 'last', label: L('Gần nhất'), sort: r => r.last || 0, cls: 'small nowrap', html: r => rel(r.last) },
        { k: 'h', label: '', html: r => `<button type="button" class="btn ghost sm" data-h="${esc(r.h)}">${L('Đã sửa')}</button>` },
      ], e.rows || [], { filter: r => [r.msg, r.src, r.path].join(' '), sort: ['last', 'desc'], empty: [L('Không có lỗi 🎉')] });
      dataTable($('#tLog'), [
        { k: 'at', label: L('Lúc'), sort: r => r.at || 0, cls: 'small nowrap', html: r => rel(r.at) },
        { k: 'email', label: 'Email', sort: r => r.email || '', cls: 'small', html: r => esc(r.email) },
        { k: 'op', label: L('Thao tác'), sort: r => r.op || '', html: r => r.ok ? esc(r.op) : L('⛔ bị từ chối') },
        { k: 'ip', label: L('IP (băm)'), cls: 'small muted', html: r => esc(r.ip) },
        { k: 'country', label: L('Nước'), sort: r => r.country || '', html: r => esc(r.country) },
      ], lg.rows || [], { filter: r => [r.email, r.op, r.country, r.ip].join(' '), sort: ['at', 'desc'], rowCls: r => r.ok ? '' : 'bad-row', empty: [L('Chưa có thao tác')] });
      if ($('#eclr')) $('#eclr').onclick = async () => { if (await confirmDlg({ title: L('Xóa toàn bộ nhật ký lỗi?'), body: L('Mọi lỗi JS đã ghi sẽ bị xóa khỏi D1.'), ok: L('Xóa tất cả'), danger: true })) { await api('errorsClear'); toast(L('Đã xóa nhật ký lỗi')); show('alerts', { force: true }); } };
      $('#tErr').addEventListener('click', async ev => { const b = ev.target.closest('[data-h]'); if (!b) return; b.disabled = true; try { await api('errorsClear', { h: b.dataset.h }); toast(L('Đã đánh dấu đã sửa')); show('alerts', { force: true }); } catch (x) { b.disabled = false; toast(x.message, 'bad'); } });
    },
    async reports() { await repMod(); main.innerHTML = ''; AdminReports.render(main, L, { esc, num, when, lang: () => LANG }); }, // Báo lỗi – js/admin-reports.js (tải lười, tự gọi /api/report)
    async quality() {
      const q = await api('quality'), hist = q.history || [], ok = q.score != null && q.score >= q.standard;
      main.innerHTML = `
        <div class="tiles">
          ${tile({ l: L('Điểm chất lượng (lượt rà soát gần nhất)'), v: q.score == null ? '–' : q.score + '%', d: q.score == null ? '' : `<span class="chip ${ok ? 'ok' : 'bad'}">${ok ? L('Đạt chuẩn') : L('Dưới chuẩn')}</span>`, s: L('Chuẩn: {s}% · {t}', { s: q.standard, t: q.at ? rel(q.at) : L('chưa chạy') }) })}
          <div class="kstat"><span class="tile-l">${L('14 lượt gần nhất')}</span><div class="q-hist">${hist.map(h => `<a href="${esc(h.url)}" target="_blank" rel="noopener" class="${h.ok ? '' : 'bad'}" title="${esc(when(h.at))} · ${h.ok ? L('Đạt') : L('Không đạt')}" aria-label="${esc(when(h.at))} · ${h.ok ? L('Đạt') : L('Không đạt')}"></a>`).join('') || '–'}</div><span class="tile-s">${L('{a}/{b} lượt đạt', { a: hist.filter(h => h.ok).length, b: hist.length })}</span></div>
        </div>
        <section class="card mt"><div class="card-h"><h2 class="h3">${ok ? L('✅ Đạt chuẩn') : L('⚠️ Dưới chuẩn – cần xử lý')}</h2>${q.url ? `<a class="small" href="${esc(q.url)}" target="_blank" rel="noopener">${L('Xem chi tiết lượt rà soát →')}</a>` : ''}</div><div id="qChecks"></div>
          <p class="small muted">${L('Rà soát tự động mỗi ngày 7h sáng: kiểm thử đầy đủ (chính tả, đa ngôn ngữ 14 thứ tiếng, thuật toán FSRS & đồng bộ, giao diện, trợ năng WCAG, lời giải đề thi, liên kết), kiểm tra kiểu, cú pháp workflow, bản live (trang, API, dữ liệu, âm thanh, phiên bản). Không đạt → email cảnh báo 8h sáng.')}</p></section>
        <section class="card mt" id="bcBox"><span class="sk sk-block" style="margin:0;height:120px"></span></section>`;
      dataTable($('#qChecks'), [
        { k: 'name', label: L('Hạng mục'), sort: r => r.name, html: r => `<span class="dot ${r.ok ? 'ok' : 'bad'}"></span>${esc(r.name)}` },
        { k: 'ok', label: L('Kết quả@@run'), sort: r => r.ok ? 1 : 0, html: r => `<span class="chip ${r.ok ? 'ok' : 'bad'}">${r.ok ? L('Đạt') : L('Không đạt')}</span>` },
      ], q.checks || [], { sort: ['ok', 'asc'], pageSize: 50 });
      { const rb = document.createElement('section'); rb.className = 'mt'; main.appendChild(rb); repMod().then(() => AdminReports.card(rb, L, { esc, num, lang: () => LANG })).catch(() => {}); } // thẻ chất lượng: báo lỗi người dùng
      // Kiểm nghĩa bản dịch: dịch ngược (tự động sau mỗi lượt dịch) → câu nghi sai → AI xác nhận (bấm nút, gói AI miễn phí)
      const bc = await fetch('/i18n/backcheck.json?x=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null);
      const box = $('#bcBox'); if (!box) return;
      if (!bc || !bc.langs) { box.remove(); return; }
      box.innerHTML = `<div class="card-h"><h2 class="h3">${L('🌐 Kiểm nghĩa bản dịch (dịch ngược + AI)')}</h2></div><p class="small muted">${L('Cập nhật {t} · "khớp nghĩa" = tỉ lệ câu dịch ngược về tiếng Anh vẫn đúng ý. <b>Duyệt bằng AI</b>: Gemini (xoay vòng các khóa) → hết lượt tự chuyển Cloudflare AI; mỗi lần ≤ 60 câu, bấm tiếp để duyệt phần còn lại.', { t: rel(bc.at) })}</p><div id="bcT"></div><div id="bcRes"></div>`;
      dataTable($('#bcT'), [
        { k: 'l', label: L('Ngôn ngữ'), sort: r => r.l, html: r => `<b>${esc(r.l)}</b>` },
        { k: 'n', label: L('Số câu'), num: true, sort: r => +r.checked || 0, html: r => num(r.checked) },
        { k: 'ok', label: L('Khớp nghĩa'), num: true, sort: r => +r.ok || 0, html: r => `${esc(r.ok)}%` },
        { k: 'f', label: L('Nghi sai'), num: true, sort: r => (r.flagged || []).length, html: r => num((r.flagged || []).length) },
        { k: 'x', label: '', html: r => `<button type="button" class="btn sm primary" data-rev="${esc(r.l)}">${L('✨ Duyệt bằng AI')}</button>` },
      ], Object.entries(bc.langs).map(([l, x]) => ({ l, ...x })), { sort: ['f', 'desc'], pageSize: 50 });
      box.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-rev]'); if (!b) return;
        b.disabled = true; const old = b.textContent; b.textContent = L('⏳ Đang duyệt…');
        let r; try { r = await api('review', { lang: b.dataset.rev }); } catch (e) { r = { error: e.message }; }
        b.disabled = false; b.textContent = old;
        if (r.error) { $('#bcRes').innerHTML = `<p class="small bad-t">✗ ${esc(r.error)}</p>`; return; }
        $('#bcRes').innerHTML = `<div class="rev-head"><b>${esc(r.lang)}</b> · ${L('đã duyệt {a}/{b} câu nghi sai', { a: r.reviewed, b: r.total })}${r.pending ? L(' · còn {n} (bấm lại để duyệt tiếp)', { n: r.pending }) : L(' · ✅ xong')} · <b class="${r.wrong.length ? 'bad-t' : 'ok-t'}">${L('{n} câu sai nghĩa', { n: r.wrong.length })}</b>${(r.models || []).length ? ` <span class="chip">${esc(r.models.join(' + '))}</span>` : ''} ${r.wrong.some(w => w.fix) ? `<button type="button" class="btn sm primary" id="gAll">${L('Áp dụng tất cả')}</button>` : ''}</div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">${L('Tiếng Anh')}</th><th scope="col">${L('Bản dịch hiện tại')}</th><th scope="col">${L('AI đề xuất')}</th><th scope="col">${L('Lý do')}</th><th scope="col"><span class="sr-only">${L('Thao tác')}</span></th></tr></thead><tbody>${r.wrong.map((w, i) => `<tr><td class="small">${esc(w.en)}</td><td class="small">${esc(w.tr)}</td><td class="small"><b>${esc(w.fix || '')}</b></td><td class="small">${esc(w.why || '')}</td><td>${w.fix ? `<button type="button" class="btn sm" data-ap="${i}">${L('Áp dụng')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="5">${L('✅ Không có câu sai')}</td></tr>`}</tbody></table></div>
          <p class="small muted">${L('Bản sửa đã áp dụng sẽ tự cập nhật vào app ở lượt dịch đêm.')}</p>`;
        const ap = async i => { const w = r.wrong[i]; if (!w.fix) return; await api('i18nFixApprove', { lang: r.lang, key: w.key, val: w.fix }); const bt = main.querySelector(`[data-ap="${i}"]`); if (bt) { bt.disabled = true; bt.textContent = L('✓ Đã duyệt'); } };
        main.querySelectorAll('[data-ap]').forEach(x => { x.onclick = () => ap(+x.dataset.ap); });
        if ($('#gAll')) $('#gAll').onclick = async () => { $('#gAll').disabled = true; for (let i = 0; i < r.wrong.length; i++) await ap(i); $('#gAll').textContent = L('✓ Đã duyệt tất cả'); };
      });
    },
    async services() {
      const T = (r, k) => { if (LANG !== 'en') return r[k] || ''; try { const e = JSON.parse(r.i18n || '{}'); return e[k] || r[k] || ''; } catch (x) { return r[k] || ''; } }; // dữ liệu dịch vụ theo ngôn ngữ quản trị (cột i18n JSON)
      const [u, s, gk] = await Promise.all([api('usage'), api('services'), api('geminiStatus').catch(() => ({}))]);
      // Nhóm & trạng thái để quản lý trực quan: thẻ theo nhóm, lọc nhanh, tìm kiếm (regex khớp dữ liệu dịch vụ – không phải chữ giao diện)
      const GROUPS = [['infra', '☁️ Hạ tầng & dữ liệu', /cloudflare (pages|d1|email)|tên miền|github|firebase/i], ['ai', '🤖 AI & dịch', /workers ai|gemini|translate|claude/i], ['grow', '📈 Phát hành & tăng trưởng', /search console|admob|apple|play|chrome web store/i]];
      const groupOf = r => (GROUPS.find(g => g[2].test(r.name)) || ['other', '🧩 Khác'])[0];
      const state = r => (/gemini/i.test(r.name) ? (gk.set ? 'on' : 'todo') : /chưa đăng ký|chưa tạo/i.test(r.status + r.account) ? 'todo' : /chưa dùng/i.test(r.status) ? 'idle' : 'on'); // dịch vụ có khóa: trạng thái theo khóa thực tế
      const PILL = { on: ['ok', 'Đang dùng'], idle: ['muted', 'Chưa dùng'], todo: ['warn', 'Chưa thiết lập'] };
      const keyed = r => /gemini/i.test(r.name), rows = s.rows || [], meters = u.meters || [];
      const warnMeters = meters.filter(m => m.pct >= 70).length, cnt = k => rows.filter(r => state(r) === k).length;
      setActions(`<button type="button" class="btn primary sm" id="sadd">${L('+ Thêm dịch vụ')}</button>`);
      main.innerHTML = `
        <div class="tiles">
          ${tile({ l: L('Dịch vụ'), v: num(rows.length), s: L('trong hệ thống') })}
          ${tile({ l: L('Đang dùng'), v: num(cnt('on')), s: L('hoạt động bình thường') })}
          ${tile({ l: L('Chưa thiết lập'), v: num(cnt('todo') + cnt('idle')), s: L('cần đăng ký / thêm khóa'), d: cnt('todo') + cnt('idle') ? '<span class="chip warn">!</span>' : '' })}
          ${tile({ l: L('Hạn mức sắp đầy'), v: num(warnMeters), s: L('≥ 70% gói miễn phí'), d: warnMeters ? '<span class="chip bad">!</span>' : '' })}
        </div>
        <details class="card svc-usage mt" ${warnMeters ? 'open' : ''}><summary><b>${L('📊 Dung lượng & hạn mức miễn phí')}</b> <span class="small muted">${L('· vàng ≥ 70%, đỏ ≥ 90%')}</span></summary>${meters.map(m => `<div class="meter ${m.pct >= 90 ? 'crit' : m.pct >= 70 ? 'warn' : ''}"><div class="row between small"><b>${esc(m.name)}</b><span>${m.unit === 'bytes' ? (m.used / 1048576).toFixed(1) + ' / ' + (m.cap / 1048576).toFixed(0) + ' MB' : num(m.used) + ' / ' + num(m.cap)} · <b>${esc(m.pct)}%</b></span></div><div class="bar"><i style="width:${Math.min(100, +m.pct || 0)}%"></i></div>${m.hint ? `<div class="tiny muted">${esc(m.hint)}</div>` : ''}</div>`).join('')}</details>
        <div class="svc-tools"><input type="search" id="sq" placeholder="${L('🔎 Tìm dịch vụ, tài khoản…')}" aria-label="${L('Tìm dịch vụ')}"><div class="svc-chips" role="group" aria-label="${L('Lọc dịch vụ')}">${[['all', 'Tất cả'], ['on', 'Đang dùng'], ['todo', 'Chưa thiết lập']].map(([k, l], i) => `<button type="button" class="chip-f" aria-pressed="${!i}" data-f="${k}">${L(l)}</button>`).join('')}</div></div>
        <div id="svcList"></div><div id="svcNone" hidden class="card">${emptyState(L('Không có dịch vụ khớp bộ lọc'))}</div>`;
      const card = r => { const st = state(r), [pc, pl] = PILL[st]; return `<article class="svc-card" data-st="${st}" data-q="${esc((r.name + ' ' + r.account + ' ' + r.purpose).toLowerCase())}">
          <header><div class="svc-name"><b>${esc(T(r, 'name'))}</b><span class="chip ${pc}">${L(pl)}</span>${keyed(r) ? (gk.set ? `<span class="chip ok">${L('🔑 {n} khóa', { n: (gk.keys || []).length })}</span>` : `<span class="chip warn">${L('🔑 chưa có khóa')}</span>`) : ''}</div>
            <button type="button" class="icon-btn-s" data-sid="${esc(r.id)}" title="${L('Sửa')}" aria-label="${L('Sửa {n}', { n: esc(T(r, 'name')) })}">✎</button></header>
          ${r.purpose ? `<p class="svc-purpose">${esc(T(r, 'purpose'))}</p>` : ''}
          <dl class="svc-meta">${r.account ? `<div><dt>👤</dt><dd>${esc(T(r, 'account'))}</dd></div>` : ''}${r.free ? `<div><dt>🎁</dt><dd>${esc(T(r, 'free'))}</dd></div>` : ''}${r.secret && !keyed(r) ? `<div><dt>🔐</dt><dd><code>${esc(T(r, 'secret'))}</code></dd></div>` : ''}</dl>
          ${r.note ? `<p class="svc-note">${esc(T(r, 'note'))}</p>` : ''}
          <footer>${keyed(r) ? `<button type="button" class="btn sm ${gk.set ? '' : 'primary'}" data-key="gemini">🔑 ${gk.set ? L('Quản lý khóa') : L('Thêm khóa')}</button>` : ''}${r.console ? `<a class="btn sm ${keyed(r) && !gk.set ? '' : 'primary'}" target="_blank" rel="noopener" href="${esc(r.console)}">${L('Mở trang quản lý ↗')}</a>` : ''}${r.billing ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(r.billing)}">${L('Nâng gói')}</a>` : ''}</footer></article>`; };
      $('#svcList').innerHTML = [...GROUPS, ['other', '🧩 Khác']].map(([g, title]) => { const rs = rows.filter(r => groupOf(r) === g); return rs.length ? `<section class="svc-group"><h2 class="h3">${L(title)} <span class="muted small">${rs.length}</span></h2><div class="svc-grid">${rs.map(card).join('')}</div></section>` : ''; }).join('');
      let f = 'all';
      const apply = () => { const q = $('#sq').value.trim().toLowerCase(); main.querySelectorAll('.svc-card').forEach(c => { c.hidden = !((f === 'all' || (f === 'todo' ? c.dataset.st !== 'on' : c.dataset.st === f)) && (!q || c.dataset.q.includes(q))); }); main.querySelectorAll('.svc-group').forEach(gp => { gp.hidden = ![...gp.querySelectorAll('.svc-card')].some(c => !c.hidden); }); $('#svcNone').hidden = !!main.querySelector('.svc-card:not([hidden])'); };
      $('#sq').oninput = apply;
      main.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { f = b.dataset.f; main.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); }; });
      // Sửa/thêm dịch vụ trong hộp thoại
      const form = (r = {}) => {
        const d = modal(`<div class="key-box"><div class="row between"><h3 style="margin:0">${r.id ? L('Sửa dịch vụ') : L('Thêm dịch vụ')}</h3><button type="button" class="icon-x" data-close aria-label="${L('Đóng')}">✕</button></div>
          <div class="svc-form">${[['name', 'Tên dịch vụ *'], ['purpose', 'Dùng cho'], ['account', 'Tài khoản / email'], ['status', 'Trạng thái'], ['console', 'Link trang quản lý'], ['billing', 'Link nâng gói'], ['free', 'Gói miễn phí / giới hạn'], ['secret', 'Tên biến khóa (không ghi giá trị)'], ['note', 'Ghi chú']].map(([k, l]) => `<label class="${/note|purpose|free/.test(k) ? 'wide' : ''}">${L(l)}<input name="${k}" value="${esc(r[k] || '')}" ${k === 'name' ? 'required' : ''}></label>`).join('')}</div>
          <p class="fld-err" id="sErr" role="alert"></p>
          <div class="row between" style="margin-top:1rem">${r.id ? `<button type="button" class="btn ghost sm danger" id="sdel">${L('Xóa dịch vụ')}</button>` : '<span></span>'}<span class="row" style="gap:.5rem"><button type="button" class="btn ghost" data-close>${L('Hủy')}</button><button type="button" class="btn primary" id="ssave">${L('Lưu')}</button></span></div></div>`, '', r.id ? L('Sửa dịch vụ') : L('Thêm dịch vụ'));
        d.querySelector('[name=name]').focus();
        d.querySelector('#ssave').onclick = async () => {
          const row = { id: r.id }; d.querySelectorAll('input[name]').forEach(i => { row[i.name] = i.value.trim(); });
          if (!row.name) { d.querySelector('#sErr').textContent = L('Hãy nhập tên dịch vụ.'); return d.querySelector('[name=name]').focus(); }
          if (SECRET.test(row.secret + row.note)) { d.querySelector('#sErr').textContent = L('Không lưu giá trị khóa ở đây – chỉ ghi tên biến.'); return; }
          try { await api('serviceSet', { row }); closeDlg(d); toast(L('Đã lưu dịch vụ')); show('services', { force: true }); } catch (e) { d.querySelector('#sErr').textContent = e.message; }
        };
        const del = d.querySelector('#sdel'); if (del) del.onclick = async () => { if (await confirmDlg({ title: L('Xóa dịch vụ này khỏi danh sách?'), body: L('Chỉ xóa khỏi danh sách quản trị, không ảnh hưởng dịch vụ thật.'), ok: L('Xóa dịch vụ'), danger: true })) { await api('serviceDelete', { id: r.id }); closeDlg(d); toast(L('Đã xóa dịch vụ')); show('services', { force: true }); } };
      };
      $('#sadd').onclick = () => form();
      main.querySelectorAll('[data-sid]').forEach(b => { b.onclick = () => form(rows.find(x => String(x.id) === b.dataset.sid)); });
      main.querySelectorAll('[data-key]').forEach(b => { b.onclick = () => keyDialog(gk, () => show('services', { force: true })); });
    },
    async social() {
      await lazy('AdminSocial', 'js/admin-social.js'); main.innerHTML = ''; // tải lười – chỉ khi mở tab
      AdminSocial.render(main, sapi, L, { esc, num, when, lang: () => LANG }); // js/admin-social.js
    },
    async dist() { // Kênh & phân phối – js/admin-dist.js + js/lib/dist-rules.js (tải lười)
      await lazy('DistRules', 'js/lib/dist-rules.js'); await lazy('AdminDist', 'js/admin-dist.js'); main.innerHTML = '';
      AdminDist.render(main, distapi, L, { esc, lang: () => LANG, toast, yapi, sapi });
    },
    async studio() {
      await lazy('AdminStudio', 'js/admin-studio.js'); main.innerHTML = '';
      AdminStudio.render(main, stapi, sapi, L, { esc, lang: () => LANG }); // js/admin-studio.js
    },
    async video() { // Thư viện video – js/admin-video.js (tải lười) → /api/admin-shorts
      await lazy('AdminVideo', 'js/admin-video.js'); main.innerHTML = '';
      try { await lazy('AdminClips', 'js/admin-clips.js'); } catch (e) { /* lưới cũ làm dự phòng */ }
      AdminVideo.render(main, vapi, L, { esc, lang: () => LANG, toast, yapi, distapi, capi: window.AdminClips && AdminClips.mount ? capi : null });
    },
    async backlinks() { // Backlink, PR & Thương hiệu – js/admin-backlinks.js (tải lười) → /api/backlinks (functions/api/backlinks.js)
      await lazy('AdminBacklinks', 'js/admin-backlinks.js'); main.innerHTML = '';
      AdminBacklinks.render(main, bapi, L, { esc, when, lang: () => LANG, toast });
    },
    async drive() { // Kho Drive riêng (sao lưu nguồn 2 của kho dựng video) – js/admin-drive.js (tải lười)
      await lazy('AdminDrive', 'js/admin-drive.js'); main.innerHTML = '';
      AdminDrive.render(main, dapi, L, { esc, when, lang: () => LANG });
    },
    async keys() { // Khóa API (kho khóa nhà cung cấp, mã hóa, xoay vòng) – js/admin-keys.js (tải lười) → /api/keys (functions/api/keys.js)
      const kapi = async (op, body = {}) => {
        const u = auth.currentUser || user; if (!u) throw new Error(L('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại'));
        const r = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 401 && j.error === 'reauth') return reauth();
        if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; throw e; }
        return j;
      };
      await lazy('AdminKeys', 'js/admin-keys.js'); main.innerHTML = '';
      AdminKeys.render(main, kapi, L, { esc, num, when, lang: () => LANG });
    },
    async ads() { // 💰 Quảng cáo – js/admin-ads.js (tải lười) → op adsStats + config/configSet (docs/ADS.md)
      await lazy('AdminAds', 'js/admin-ads.js'); main.innerHTML = '';
      AdminAds.render(main, api, L, { esc, lang: () => LANG, toast, confirm: confirmDlg });
    },
    async storage() { // 💾 Lưu trữ – js/admin-storage.js (tải lười) đọc /data/storage-forecast.json (docs/STORAGE.md)
      await lazy('AdminStorage', 'js/admin-storage.js'); main.innerHTML = '';
      AdminStorage.render(main, L, { esc, num, lang: () => LANG });
    },
    async quota() { // Hạn mức & chống lạm dụng – js/admin-quota.js (tải lười, tự gọi /api/quota)
      await lazy('AdminQuota', 'js/admin-quota.js'); main.innerHTML = '';
      AdminQuota.render(main, L, { esc, num, when, lang: () => LANG });
    },
    async notices() { // Thông báo người dùng – js/admin-notices.js (tải lười)
      main.innerHTML = '';
      if (!window.AdminNotices) await new Promise((y, n) => { const sc = document.createElement('script'); sc.src = 'js/admin-notices.js'; sc.onload = y; sc.onerror = n; document.head.appendChild(sc); });
      AdminNotices.render(main, api, L, { esc, num, when, lang: () => LANG, user });
      lazy('AdminPush', 'js/admin-push.js').then(() => AdminPush.render(main, L, { esc, num, lang: () => LANG })).catch(() => {}); // ⏰ thẻ Nhắc học (docs/REMINDERS.md)
    },
    async settings() {
      const [c, g] = await Promise.all([api('config'), api('geminiStatus').catch(() => null)]);
      const keys = (c.keys || []).filter(k => !/^ads_/.test(k)), vals = c.values || {}, known = new Set(SETTINGS.flatMap(s => s.fields.map(f => f.k)));
      const groups = [...SETTINGS, ...(keys.some(k => !known.has(k)) ? [{ id: 'other', title: 'Khác@@set', desc: '', fields: keys.filter(k => !known.has(k)).map(k => ({ k, type: 'text', label: k, def: '' })) }] : [])]
        .map(s => ({ ...s, fields: s.fields.filter(f => keys.includes(f.k)) })).filter(s => s.fields.length);
      const F = {}; groups.forEach(s => s.fields.forEach(f => { const cur = String((vals[f.k] || {}).v ?? ''); F[f.k] = { f, cur, val: cur }; }));
      const disp = x => x.val === '' ? String(x.f.def) : x.val; // giá trị hiện trong ô (trống = mặc định)
      const fid = k => 'set-' + k;
      const control = x => {
        const f = x.f, v = esc(disp(x)), id = fid(f.k), aria = `aria-describedby="${id}-h ${id}-e"`;
        if (f.type === 'seg') return `<div class="seg" role="radiogroup" aria-labelledby="${id}-l">${f.opts.map(([o, icon, t]) => `<label><input type="radio" name="${id}" value="${o}" ${disp(x) === o ? 'checked' : ''}><span><span aria-hidden="true">${icon}</span>${esc(L(t))}</span></label>`).join('')}</div>`;
        if (f.type === 'area') return `<textarea id="${id}" rows="4" ${aria} maxlength="${f.max}">${v}</textarea>`;
        if (f.type === 'text') return `<textarea id="${id}" rows="2" ${aria}>${v}</textarea>`;
        if (f.type === 'url') return `<input id="${id}" type="url" inputmode="url" placeholder="https://…" value="${v}" ${aria}>`;
        if (f.type === 'rate') return `<div class="range-row"><input type="range" id="${id}-r" min="${f.min}" max="${f.max}" step="0.01" value="${v}" aria-label="${esc(L(f.label))}"><input id="${id}" type="number" min="${f.min}" max="${f.max}" step="0.01" value="${v}" ${aria}></div>`;
        return `<div class="fld-in"><input id="${id}" type="number" inputmode="numeric" min="${f.min}" max="${f.max}" step="1" value="${v}" ${aria}>${f.unit ? `<span class="fld-unit">${esc(L(f.unit))}</span>` : ''}</div>`;
      };
      const meta = x => {
        const f = x.f, saved = vals[f.k], parts = [];
        if (f.def !== '' && f.def != null) parts.push(x.val === '' ? `<span class="chip info">${esc(L('Đang dùng mặc định'))}</span>` : `<span class="chip">${esc(L('Mặc định: {v}', { v: f.type === 'seg' ? L((f.opts.find(o => o[0] === f.def) || [])[2] || f.def) : f.def }))}</span>`);
        if (x.val !== '' && f.def !== '' && f.def != null) parts.push(`<button type="button" class="reset" data-reset="${f.k}">${esc(L('Đặt lại mặc định'))}</button>`);
        if (saved && saved.at) parts.push(`<span class="tiny muted">${L('Sửa {t} bởi {b}', { t: rel(saved.at), b: esc(String(saved.by || '').split('@')[0]) })}</span>`);
        return parts.join('');
      };
      const field = x => { const f = x.f, id = fid(f.k); return `<div class="fld" data-k="${f.k}"><div class="fld-top">${f.type === 'seg' ? `<span class="fld-lbl" id="${id}-l">${esc(L(f.label))}</span>` : `<label for="${id}" id="${id}-l">${esc(L(f.label))}</label>`}<span class="fld-meta">${meta(x)}</span></div>${control(x)}<p class="fld-help" id="${id}-h">${f.help ? esc(L(f.help)) : ''}${f.type === 'rate' ? `<span class="rate-x"></span>` : ''}</p><p class="fld-err" id="${id}-e" role="alert"></p></div>`; };
      const gemCard = g ? `<section class="card set-card"><div class="card-h"><div><h2 class="h3">✨ Gemini API</h2><p>${esc(g.set ? L('{a} khóa xoay vòng · {b} sẵn sàng', { a: (g.keys || []).length, b: (g.keys || []).filter(k => !k.cooling).length }) : L('Chưa có khóa – AI đang dùng Cloudflare Workers AI'))} · ${esc(L('Dùng cho chấm bài viết/nói & duyệt bản dịch.'))}</p></div><button type="button" class="btn sm ${g.set ? '' : 'primary'}" id="gman">🔑 ${g.set ? L('Quản lý khóa') : L('Thêm khóa')}</button></div></section>` : '';
      main.innerHTML = `<form id="setForm" novalidate><div class="set-grid">${groups.map(s => `<section class="card set-card" data-card="${s.id}"><div class="card-h"><div><h2 class="h3">${esc(L(s.title))}</h2>${s.desc ? `<p>${esc(L(s.desc))}</p>` : ''}</div></div>
          ${s.fields.map(f => field(F[f.k])).join('')}
          ${s.preview ? `<div class="fld"><span class="fld-lbl">${esc(L('Xem trước'))}</span><div class="bn-prev" id="bnPrev" aria-live="polite"></div></div>` : ''}
          ${s.foot ? `<p class="fld-help">${esc(L(s.foot))}</p>` : ''}</section>`).join('')}${gemCard}</div>
        <div class="savebar" id="saveBar"><span class="st" id="saveSt" role="status" aria-live="polite"></span><span class="sp"></span><button type="button" class="btn ghost sm" id="sdisc">${esc(L('Hoàn tác'))}</button><button type="submit" class="btn primary sm" id="csave">${esc(L('Lưu thay đổi'))}</button></div></form>`;
      const errs = () => Object.values(F).filter(x => validate(x.f, x.val)).length;
      const dirty = () => Object.values(F).filter(x => x.val !== x.cur);
      const paintPreview = () => {
        const p = $('#bnPrev'); if (!p) return;
        const t = F.banner ? disp(F.banner) : '', url = F.banner_url ? disp(F.banner_url) : '', lvl = F.banner_level ? disp(F.banner_level) : 'info';
        p.innerHTML = t ? `<div class="lk-banner ${['info', 'warn', 'ok'].includes(lvl) ? lvl : 'info'}" role="presentation"><span>${esc(t)}</span>${/^https:\/\//.test(url) ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" tabindex="-1">→</a>' : ''}<button type="button" tabindex="-1" aria-hidden="true">×</button></div>` : `<div class="bn-off">${esc(L('Thông báo đang tắt'))}</div>`;
      };
      const paintRate = () => { const x = F.hit_rate; if (!x) return; const r = +disp(x).replace(',', '.'), el = main.querySelector('[data-k="hit_rate"] .rate-x'); if (!el || !(r > 0)) return; el.textContent = ' ' + (r >= 1 ? L('100% khách gửi thống kê – số liệu đầy đủ.') : L('≈ {p}% khách gửi thống kê; số đếm trong Phân tích cần nhân × {x}.', { p: nf1(r * 100), x: nf1(1 / r) })); };
      const paintField = k => {
        const x = F[k], el = main.querySelector(`.fld[data-k="${k}"]`); if (!el) return;
        const e = validate(x.f, x.val); el.classList.toggle('invalid', !!e); el.classList.toggle('dirty', x.val !== x.cur);
        el.querySelector('.fld-err').textContent = e; el.querySelector('.fld-meta').innerHTML = meta(x);
        const inp = el.querySelector('#' + fid(k)); if (inp) inp.setAttribute('aria-invalid', String(!!e));
      };
      const paintBar = () => {
        const n = dirty().length, bad = errs();
        $('#saveBar').classList.toggle('dirty', !!n);
        $('#saveSt').innerHTML = bad ? `<span class="dot bad"></span>${esc(L('Sửa lỗi trước khi lưu'))}` : n ? `<span class="dot warn"></span>${esc(L('{n} thay đổi chưa lưu', { n }))}` : `<span class="dot ok"></span>${esc(L('Không có thay đổi'))}`;
        $('#csave').disabled = !n || !!bad; $('#sdisc').disabled = !n;
      };
      const setVal = (k, raw) => {
        const x = F[k]; let v = String(raw).trim();
        if (x.f.type === 'rate') v = v.replace(',', '.');
        if (x.cur === '' && v === String(x.f.def)) v = ''; // gõ đúng mặc định khi đang dùng mặc định → vẫn là mặc định
        x.val = v; paintField(k); paintBar();
        if (/^banner/.test(k)) paintPreview(); if (k === 'hit_rate') paintRate();
      };
      const sync = k => { // đưa ô nhập về giá trị hiện tại (sau đặt lại / hoàn tác / lưu)
        const x = F[k], id = fid(k), v = disp(x);
        if (x.f.type === 'seg') main.querySelectorAll(`input[name="${id}"]`).forEach(r => { r.checked = r.value === v; });
        else { const i = $('#' + id); if (i) i.value = v; const r = $('#' + id + '-r'); if (r) r.value = v; }
      };
      main.querySelectorAll('.fld[data-k]').forEach(el => {
        const k = el.dataset.k, x = F[k]; if (!x) return;
        if (x.f.type === 'seg') el.querySelectorAll('input[type=radio]').forEach(r => { r.onchange = () => setVal(k, r.value); });
        else {
          const i = $('#' + fid(k)), rr = $('#' + fid(k) + '-r');
          i.oninput = () => { if (rr && i.value !== '') rr.value = i.value; setVal(k, i.value); };
          if (rr) rr.oninput = () => { i.value = rr.value; setVal(k, rr.value); };
        }
      });
      $('#setForm').addEventListener('click', e => { const b = e.target.closest('[data-reset]'); if (!b) return; const k = b.dataset.reset; F[k].val = ''; sync(k); setVal(k, ''); const i = $('#' + fid(k)) || main.querySelector(`input[name="${fid(k)}"]`); if (i) i.focus(); });
      $('#sdisc').onclick = () => { Object.keys(F).forEach(k => { F[k].val = F[k].cur; sync(k); paintField(k); }); paintBar(); paintPreview(); paintRate(); };
      const save = async () => {
        const ch = dirty(); if (!ch.length || errs()) { if (errs()) { const el = main.querySelector('.fld.invalid input, .fld.invalid textarea'); if (el) el.focus(); toast(L('Sửa lỗi trước khi lưu'), 'bad'); } return; }
        const values = Object.fromEntries(ch.map(x => [x.f.k, x.val]));
        const b = $('#csave'); b.disabled = true; b.textContent = L('Đang lưu…');
        try {
          await api('configSet', { values });
          const at = Date.now(); ch.forEach(x => { x.cur = x.val; vals[x.f.k] = { v: x.val, at, by: user && user.email || '' }; paintField(x.f.k); });
          toast(L('Đã lưu {n} thay đổi', { n: ch.length }));
        } catch (e) { if (e.message !== 'reauth') toast(L('Không lưu được') + ': ' + e.message, 'bad'); }
        b.textContent = L('Lưu thay đổi'); paintBar();
      };
      $('#setForm').onsubmit = e => { e.preventDefault(); save(); };
      $('#setForm').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); save(); } });
      if ($('#gman')) $('#gman').onclick = () => keyDialog(g, () => show('settings', { force: true }));
      Object.keys(F).forEach(paintField); paintBar(); paintPreview(); paintRate();
      guard = () => tab === 'settings' && dirty().length > 0;
      try {
        await lazy('AdminPrefs', 'js/admin-prefs.js');
        if (window.AdminPrefs && window.AdminPrefs.render) {
          const pwrap = document.createElement('div');
          pwrap.id = 'admPrefWrap';
          const targetGrid = main.querySelector('#setForm .set-grid') || main;
          targetGrid.appendChild(pwrap);
          await window.AdminPrefs.render(pwrap, {
            api: prefApi,
            user,
            L,
            esc,
            num,
            rel,
            when,
            toast,
            dataTable,
            emptyState,
            lang: () => LANG,
            setLang,
            onPrefSaved: p => {
              try { sessionStorage.setItem('adm.pref', JSON.stringify(p)); } catch (e) { /* bỏ qua */ }
              if (p.autoLogoutMin !== undefined) setupIdleTimer(p.autoLogoutMin);
              if (p.theme && typeof setTheme === 'function') setTheme(p.theme);
            }
          });
        }
      } catch (e) { /* module lười không làm hỏng tab cài đặt */ }
    },
  };
  // Cho module tải lười dùng chung thành phần (tùy chọn – module cũ vẫn chạy độc lập)
  window.AdminUI = { toast, confirm: confirmDlg, modal, close: closeDlg, rel, copyBtn, dataTable, emptyState };
})();
