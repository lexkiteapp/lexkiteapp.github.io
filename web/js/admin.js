/* Trang quản trị Lexkite – gọi /api/admin (máy chủ tự kiểm tra email quản trị trong ADMIN_EMAILS). */
(() => {
  const $ = s => document.querySelector(s), main = $('#main');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // ---------- Ngôn ngữ trang quản trị: chỉ Tiếng Việt / English (riêng cho admin, không dùng hệ I18N của app) ----------
  // Khóa = chuỗi tiếng Việt nguyên văn; {tên} = chỗ điền; "…@@ngữ cảnh" = cùng chữ Việt nhưng nghĩa Anh khác; [một, nhiều] = số ít/nhiều theo {n}
  let LANG = (() => { try { const v = localStorage.getItem('lk.admLang'); if (v === 'vi' || v === 'en') return v; } catch (e) { /* bỏ qua */ } return /^vi/i.test(navigator.language || '') ? 'vi' : 'en'; })();
  const EN = {
    // Thanh trên, đăng nhập, tab
    'Tổng quan': 'Overview', 'Phân tích': 'Analytics', 'Người dùng': 'Users', 'Hộp thư': 'Inbox', 'Cảnh báo': 'Alerts', 'Chất lượng': 'Quality', 'Dịch vụ & API': 'Services & API', 'Cài đặt': 'Settings',
    'Trang quản trị Lexkite': 'Lexkite Admin', 'Chỉ tài khoản quản trị được cấp quyền.': 'Authorized admin accounts only.', 'Đăng nhập bằng Google': 'Sign in with Google',
    'Về app': 'Back to app', 'Về trang chủ Lexkite': 'Back to the Lexkite home page', 'Tự động (theo máy)': 'Auto (system)', 'Sáng': 'Light', 'Tối': 'Dark', 'Giao diện: {m} – bấm để đổi': 'Theme: {m} – click to change', 'Đổi giao diện sáng/tối': 'Switch light/dark theme',
    'Đổi ngôn ngữ': 'Change language', 'Ngôn ngữ: Tiếng Việt – bấm để chuyển sang English': 'Language: English – click to switch to Vietnamese', 'Thoát': 'Sign out',
    'Không có quyền': 'Access denied', '{e} chưa được cấp quyền quản trị.': '{e} does not have admin access.', 'Đổi tài khoản': 'Switch account',
    'Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?': 'Your admin session has expired. Sign in again now?', 'Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại': 'Session expired – sign in again and retry',
    'Cần đăng nhập lại để xác nhận thao tác quan trọng. Đăng nhập lại ngay?': 'Please sign in again to confirm this sensitive action. Sign in now?',
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
    'Dán khóa AIza… hoặc AQ.…': 'Paste an AIza… or AQ.… key', 'Hiện/ẩn khóa': 'Show/hide key', 'Thêm khóa': 'Add key',
    '🔒 {n} khóa sẵn sàng. Khóa chỉ máy chủ dùng (chấm bài, duyệt bản dịch), chỉ hiện 4 ký tự cuối. Gỡ khóa cần đăng nhập trong 15 phút gần nhất.': '🔒 {n} ready. Keys are used only by the server (grading, translation review) and only the last 4 characters are shown. Removing a key requires a sign-in within the last 15 minutes.',
    'Hãy dán khóa trước.': 'Paste a key first.', '⏳ Đang kiểm tra với Google…': '⏳ Checking with Google…', '✓ Đã thêm khóa …{k} (tổng {n} khóa)': '✓ Added key …{k} ({n} total)', 'Không lưu được': 'Could not save', 'Gỡ khóa …{k}?': 'Remove key …{k}?', '✓ Đã gỡ khóa': '✓ Key removed',
    // Biểu đồ
    '{h}h: {n} phiên': '{h}:00 – {n} sessions', '{d}: {f} mới · {b} quay lại': '{d}: {f} new · {b} returning', 'Khách mới': 'New visitors', 'Quay lại': 'Returning',
    'PWA (web đã cài)': 'PWA (installed web)', 'Add-on Chrome': 'Chrome add-on', 'App (cũ)': 'App (legacy)',
    'Lượt xem và khách 14 ngày qua': 'Views and visitors, last 14 days', '{d}: {v} lượt xem · {u} khách': '{d}: {v} views · {u} visitors', 'Lượt xem': 'Views', 'Khách': 'Visitors',
    // Trực tiếp
    '📈 Lưu lượng trực tiếp': '📈 Live traffic', 'Live · tự cập nhật 30s · {t}': 'Live · auto-refresh 30s · {t}', 'Lấy mẫu {p}% – số thực ≈ × {x}': 'Sampling {p}% – actual ≈ × {x}',
    'Đang online <small>(5 phút)</small>': 'Online now <small>(5 min)</small>', 'khách có tín hiệu gần đây': 'visitors with recent activity', 'Lượt xem hôm nay': 'Views today', '{n} phiên': ['{n} session', '{n} sessions'],
    'Khách hôm nay': 'Visitors today', 'thiết bị khác nhau': 'unique devices', 'Trang/khách': 'Pages/visitor', 'Thời gian TB': 'Avg. time', 'mỗi phiên hôm nay': 'per session today', 'Tổng lượt xem': 'Total views', '{n} khách từ trước đến nay': '{n} visitors all-time', '14 ngày qua': 'Last 14 days',
    '🌍 Quốc gia hôm nay': '🌍 Countries today', '👀 Đang xem': '👀 Viewing now', 'Không ai online trong 5 phút qua': 'Nobody online in the last 5 minutes', '📄 Trang xem nhiều hôm nay': '📄 Top pages today',
    'Theo trang vào đầu tiên (chưa có số lượt xem từng trang).': 'Based on landing pages (per-page views not available yet).', '🔗 Nguồn giới thiệu hôm nay': '🔗 Referrers today', 'Chủ yếu truy cập trực tiếp': 'Mostly direct traffic',
    '🔥 Trang xem nhiều · 7 ngày': '🔥 Top pages · 7 days', '📱 Nền tảng': '📱 Platforms', 'Nền tảng': 'Platform', 'Nền tảng@@h': 'Platforms', 'Số khách (thiết bị) khác nhau.': 'Unique visitors (devices).',
    '{c} quốc gia · {n} khách': '{c} countries · {n} visitors', ' · {n} không rõ': ' · {n} unknown', 'Ít': 'Few', 'Nhiều khách': 'Many visitors', '{c} – {n} khách hôm nay': '{c} – {n} visitors today', 'Không tải được bản đồ – danh sách quốc gia:': 'Map failed to load – country list:',
    // Người dùng
    'Xóa vĩnh viễn dữ liệu đồng bộ của tài khoản này (tài khoản Google không bị ảnh hưởng).\nGõ lại UID để xác nhận:\n': 'Permanently delete this account\'s synced data (the Google account is not affected).\nType the UID to confirm:\n',
    'UID không khớp – chưa xóa gì.': 'UID does not match – nothing was deleted.', 'Không xóa được: {e}': 'Could not delete: {e}', '(không tên)': '(no name)', '👑 Quản trị': '👑 Admin', 'Người học': 'Learner', 'Quản trị': 'Admin',
    'Ngày tạo': 'Created', 'Hoạt động gần nhất': 'Last active', 'Số lần vào (đồng bộ)': 'Visits (sync)', 'Dữ liệu đồng bộ': 'Synced data', '{b} · {n} phần': ['{b} · {n} part', '{b} · {n} parts'],
    '📚 Học tập': '📚 Learning', 'Chuỗi ngày': 'Streak', 'Ngày đã học': 'Study days', 'Lượt ôn': 'Reviews', 'Từ mới': 'New words', 'Bài luyện': 'Quizzes', 'Bài đọc': 'Readings', 'Từ đã nói': 'Words spoken', 'Huy hiệu': 'Badges',
    'Ngày học gần nhất: {d}': 'Last study day: {d}', '🗂️ Tài liệu đồng bộ': '🗂️ Synced documents', 'Phần': 'Part', 'Dung lượng': 'Size', 'Cập nhật': 'Updated', '({n} gói thẻ)': ['({n} card pack)', '({n} card packs)'], 'Không có dữ liệu đồng bộ': 'No synced data',
    '🗑 Xóa dữ liệu': '🗑 Delete data', '✉️ Gửi email': '✉️ Email',
    '🔎 Tìm email, tên hoặc UID': '🔎 Search email, name or UID', 'Tìm người dùng': 'Search users', 'Vai trò': 'Role', 'Trạng thái': 'Status', 'Hoạt động 7 ngày': 'Active (7 days)', 'Ngủ đông >30 ngày': 'Dormant >30 days', 'Mới 7 ngày': 'New (7 days)',
    'Sắp xếp': 'Sort', 'Mới nhất': 'Newest', 'Tải CSV theo bộ lọc hiện tại (tối đa 5.000 dòng)': 'Download CSV for the current filter (max 5,000 rows)',
    '👥 Tổng người dùng': '👥 Total users', 'tài khoản đã đồng bộ': 'synced accounts', '🟢 Hoạt động hôm nay': '🟢 Active today', '24 giờ qua': 'last 24 hours', '📅 Hoạt động 7 / 30 ngày': '📅 Active 7 / 30 days', '{p}% còn hoạt động trong tháng': '{p}% active this month',
    '✨ Mới 7 ngày': '✨ New (7 days)', 'tài khoản đăng ký mới': 'new sign-ups', '📱 Theo nền tảng': '📱 By platform', 'Lần vào': 'Visits', 'Chi tiết': 'Details', 'Xóa dữ liệu': 'Delete data', 'Không có người dùng khớp bộ lọc': 'No users match the filter',
    ' (lọc từ {n})': ' (filtered from {n})', '← Trước': '← Prev', 'Sau →': 'Next →', '⏳ Đang xuất…': '⏳ Exporting…', '✓ {n} dòng': ['✓ {n} row', '✓ {n} rows'], '✗ Lỗi xuất': '✗ Export failed',
    // Tổng quan
    'Đang chạy…': 'Running…', 'Bỏ qua': 'Skipped', 'Đang chờ': 'Queued', 'Thành công': 'Success', 'Cảnh báo@@status': 'Warning', 'Cần chú ý': 'Needs attention',
    'Hệ thống hoạt động bình thường · Đồng bộ {t}': 'All systems normal · Synced {t}', 'Tải lại số liệu': 'Reload data', '🔄 Cập nhật': '🔄 Refresh',
    '👥 Học viên &amp; Mức độ gắn kết (Learners &amp; Retention)': '👥 Learners &amp; Retention', 'Học viên đăng ký': 'Registered learners', '+{n} / 7 ngày': '+{n} / 7 days', 'Hoạt động 7 ngày: <b>{n}</b> người': 'Active (7 days): <b>{n}</b>', 'Quản lý →': 'Manage →',
    'Gắn kết (DAU / MAU)': 'Stickiness (DAU / MAU)', 'Chuẩn EdTech ≥ 25%': 'EdTech benchmark ≥ 25%', 'Lượt truy cập hôm nay': 'Visits today', '{n} phiên / 7 ngày': ['{n} session / 7 days', '{n} sessions / 7 days'],
    '<b>{n}</b> khách duy nhất (7 ngày)': '<b>{n}</b> unique visitors (7 days)', 'Chi tiết →': 'Details →', 'Thời gian học TB': 'Avg. study time', '{n} trang/phiên': '{n} pages/session', 'Độ sâu phiên ôn tập FSRS': 'FSRS review session depth', 'Xu hướng →': 'Trends →',
    '⚡ Vận hành &amp; Hạ tầng (Operations &amp; Reliability)': '⚡ Operations &amp; Reliability', 'Điểm chất lượng tự động': 'Automated quality score', 'Đạt chuẩn': 'Meets standard', 'Dưới chuẩn': 'Below standard', '14 ngày CI/CD liên tục': '14 days of continuous CI/CD', 'Rà soát →': 'Review →',
    'Lỗi JS (24 giờ)': 'JS errors (24h)', '{n} loại': ['{n} type', '{n} types'], '✨ Không có lỗi': '✨ No errors', '⚠️ Có lỗi cần sửa': '⚠️ Errors need fixing', 'Xem log →': 'View log →',
    'Tin nhắn chưa xử lý': 'Open messages', 'Sạch hòm thư': 'Inbox zero', 'Chờ trả lời': 'Awaiting reply', 'Hỗ trợ từ #/contact': 'Support via #/contact', 'Mở hộp thư →': 'Open inbox →',
    'Khóa Gemini API': 'Gemini API keys', '{n} sẵn sàng': '{n} ready', 'Chưa thiết lập': 'Not set up', 'D1: <b>{p}%</b> dung lượng': 'D1: <b>{p}%</b> storage used', 'Dịch vụ &amp; API →': 'Services &amp; API →',
    '⚠️ Tác vụ cần chú ý': '⚠️ Jobs needing attention', '✅ Trạng thái tác vụ tự động (GitHub Actions)': '✅ Automated job status (GitHub Actions)', 'Toàn bộ cảnh báo &amp; nhật ký →': 'All alerts &amp; logs →',
    // Phân tích
    'Khoảng thời gian (phần Chi tiết)': 'Date range (Details section)', 'ℹ️ Đang lấy mẫu {p}% người dùng – số phiên/người thực tế ≈ số dưới đây × {x}; tỉ lệ % và trung bình giữ nguyên.': 'ℹ️ Sampling {p}% of users – actual sessions/users ≈ figures below × {x}; percentages and averages are unaffected.',
    '🗺️ Khách theo quốc gia · hôm nay': '🗺️ Visitors by country · today', 'Bản đồ khách theo quốc gia hôm nay': 'Map of visitors by country today', 'Không tải được số liệu trực tiếp.': 'Could not load live data.', '📊 Chi tiết · {r}': '📊 Details · {r}',
    'Phiên truy cập': 'Sessions', 'Khách (thiết bị)': 'Visitors (devices)', '{n} phiên/khách': '{n} sessions/visitor', 'Thời gian TB/phiên': 'Avg. time/session', 'Trang/phiên': 'Pages/session', 'Khách quay lại': 'Returning visitors',
    'Thoát ngay (&lt;15 giây, 1 trang)': 'Bounce (&lt;15s, 1 page)', 'LCP thật (tốc độ hiện nội dung)': 'Real-user LCP (content load speed)', 'p75 · {p} phiên đạt “Tốt” (≤ 2,5 s)': 'p75 · {p} of sessions “Good” (≤ 2.5 s)', '{p} phiên đạt “Tốt” (≤ 2,5 s)': '{p} of sessions “Good” (≤ 2.5 s)',
    'Phiên theo ngày': 'Sessions per day', 'Nguồn truy cập': 'Traffic sources', 'Quốc gia': 'Countries', 'Trang vào đầu tiên': 'Landing pages', 'Tần suất (số phiên mỗi khách)': 'Frequency (sessions per visitor)', '{k} lần': '{k}×',
    'Thiết bị': 'Devices', 'Ngôn ngữ giao diện': 'UI language', '⏰ Thói quen sử dụng': '⏰ Usage habits', 'Giờ cao điểm (giờ Việt Nam)': 'Peak hours (Vietnam time)', 'Ngày trong tuần': 'Day of week', 'Thời lượng phiên': 'Session length',
    '📈 Tăng trưởng': '📈 Growth', 'Khách mới & khách quay lại theo ngày': 'New vs. returning visitors per day', 'Tài khoản đăng ký mới': 'New sign-ups', 'Chưa có đăng ký mới trong khoảng này': 'No new sign-ups in this range',
    'Thống kê ẩn danh tự xây: không cookie, không lưu IP; quốc gia do Cloudflare xác định. Không tính bot, Lighthouse và chế độ sandbox. "Hôm nay" theo giờ UTC.': 'Self-hosted anonymous analytics: no cookies, no stored IPs; country comes from Cloudflare. Bots, Lighthouse and sandbox mode are excluded. "Today" is in UTC.',
    // Hộp thư
    'Chưa xử lý': 'Open', 'Tin nhắn từ form Liên hệ (#/contact) · bản sao được chuyển vào support@lexkite.com': 'Messages from the Contact form (#/contact) · copies are forwarded to support@lexkite.com', ' · ⚠️ chưa chuyển vào Gmail': ' · ⚠️ not forwarded to Gmail',
    'Trả lời bằng Gmail': 'Reply in Gmail', 'Ứng dụng email': 'Email app', 'Mở lại': 'Reopen', '✓ Đã xử lý': '✓ Mark handled', 'Không có tin nhắn.': 'No messages.',
    // Cảnh báo & nhật ký
    'Trạng thái tự động': 'Automated status', 'Xem': 'View', 'Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.': 'GitHub workflows (translation, Android build, audio, blog, speed tests…) · JS errors · inbox · capacity. A summary email goes to support automatically when anything turns red.',
    'Lỗi JavaScript từ người dùng': 'JavaScript errors from users', 'Xóa tất cả': 'Clear all', 'Lỗi': 'Error', 'Vị trí': 'Source', 'Trang': 'Page', 'Số lần': 'Count', 'Gần nhất': 'Last seen', 'Đã sửa': 'Fixed', 'Không có lỗi 🎉': 'No errors 🎉',
    '🔐 Nhật ký quản trị (100 thao tác gần nhất)': '🔐 Admin audit log (last 100 actions)', 'Mọi thao tác ghi/xóa và mọi lần tài khoản lạ cố vào trang quản trị (dòng đỏ). IP được băm, không lưu IP gốc.': 'Every write/delete action and every attempt by an unknown account to open admin (red rows). IPs are hashed; raw IPs are never stored.',
    'Lúc': 'Time', 'Thao tác': 'Action', 'IP (băm)': 'IP (hashed)', 'Nước': 'Country', '⛔ bị từ chối': '⛔ denied', 'Chưa có thao tác': 'No actions yet', 'Xóa toàn bộ nhật ký lỗi?': 'Clear the entire error log?',
    // Chất lượng
    'Điểm chất lượng (lượt rà soát gần nhất)': 'Quality score (latest run)', 'Chuẩn: {s}% · {t}': 'Standard: {s}% · {t}', 'chưa chạy': 'not run yet', '14 lượt gần nhất': 'Last 14 runs', '{a}/{b} lượt đạt': '{a}/{b} runs passed',
    '✅ Đạt chuẩn': '✅ Meets standard', '⚠️ Dưới chuẩn – cần xử lý': '⚠️ Below standard – action needed', 'Đạt': 'Pass', 'Không đạt': 'Fail', 'Xem chi tiết lượt rà soát →': 'View run details →',
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
    '📊 Dung lượng & hạn mức miễn phí': '📊 Storage & free-tier quotas', '· vàng ≥ 70%, đỏ ≥ 90%': '· yellow ≥ 70%, red ≥ 90%', '🔎 Tìm dịch vụ, tài khoản…': '🔎 Search services, accounts…', 'Tìm dịch vụ': 'Search services', '+ Thêm dịch vụ': '+ Add service',
    '🔑 {n} khóa': ['🔑 {n} key', '🔑 {n} keys'], '🔑 chưa có khóa': '🔑 no keys', 'Sửa': 'Edit', 'Sửa {n}': 'Edit {n}', 'Quản lý khóa': 'Manage keys', 'Mở trang quản lý ↗': 'Open console ↗', 'Nâng gói': 'Upgrade',
    'Sửa dịch vụ': 'Edit service', 'Thêm dịch vụ': 'Add service', 'Tên dịch vụ *': 'Service name *', 'Dùng cho': 'Used for', 'Tài khoản / email': 'Account / email', 'Link trang quản lý': 'Console link', 'Link nâng gói': 'Upgrade link',
    'Gói miễn phí / giới hạn': 'Free tier / limits', 'Tên biến khóa (không ghi giá trị)': 'Secret variable name (never the value)', 'Ghi chú': 'Notes', 'Xóa dịch vụ': 'Delete service', 'Hủy': 'Cancel', 'Lưu': 'Save',
    'Không lưu giá trị khóa ở đây – chỉ ghi tên biến.': 'Don\'t store key values here – only the variable name.', 'Xóa dịch vụ này khỏi danh sách?': 'Remove this service from the list?',
    // Cài đặt
    'Thông báo đầu trang (để trống = tắt)': 'Site banner (empty = off)', 'Link kèm thông báo (https://…)': 'Banner link (https://…)', 'Kiểu thông báo: info / warn / ok': 'Banner style: info / warn / ok',
    'Lượt chấm AI/ngày – đã đăng nhập (mặc định 5)': 'AI grading per day – signed in (default 5)', 'Lượt chấm AI/ngày – khách (mặc định 3)': 'AI grading per day – guests (default 3)', 'Trần AI toàn hệ thống/ngày (mặc định 400)': 'System-wide AI cap per day (default 400)',
    'Ngưỡng cảnh báo lỗi JS/24h (mặc định 50)': 'JS error alert threshold per 24h (default 50)', 'Tỉ lệ lấy mẫu thống kê 0.01–1 (mặc định 1 = mọi người; > 30k người/ngày nên đặt 0.1 để giữ D1 miễn phí)': 'Analytics sampling rate 0.01–1 (default 1 = everyone; above 30k users/day set 0.1 to stay on the D1 free tier)',
    'Ghi chú nội bộ cho quản trị': 'Internal admin notes', 'Cài đặt website': 'Website settings', 'Sửa {t} bởi {b}': 'Edited {t} by {b}', 'Lưu cài đặt': 'Save settings', 'Thông báo hiện trên web/app sau tối đa 1 giờ.': 'Banner changes appear on web/app within 1 hour.',
    '{a} khóa xoay vòng · {b} sẵn sàng': '{a} rotating keys · {b} ready', 'Chưa có khóa – AI đang dùng Cloudflare Workers AI': 'No keys yet – AI is running on Cloudflare Workers AI', ' · dùng cho chấm bài viết/nói & duyệt bản dịch': ' · used for writing/speaking grading & translation review', '✓ Đã lưu': '✓ Saved',
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
  const FLAG = c => c && c.length === 2 && c !== 'XX' ? String.fromCodePoint(...[...c.toUpperCase()].map(x => 127397 + x.charCodeAt(0))) + ' ' + c : '🌐 ?';
  // Chữ tĩnh trong admin.html (data-l = chuỗi Việt gốc) + nút VI | EN
  const paintStatic = () => {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.dataset.l); });
    const g = document.getElementById('lng'); if (!g) return;
    g.innerHTML = LANG === 'vi' ? '<b>VI</b> | EN' : 'VI | <b>EN</b>'; g.title = L('Đổi ngôn ngữ'); g.setAttribute('aria-label', L('Ngôn ngữ: Tiếng Việt – bấm để chuyển sang English'));
  };
  paintStatic();
  // Giao diện sáng/tối: Tự động (theo máy) → Sáng → Tối, ghi nhớ trên trình duyệt
  const THEME = { auto: ['🌗', 'Tự động (theo máy)'], light: ['☀️', 'Sáng'], dark: ['🌙', 'Tối'] };
  const setTheme = m => { try { localStorage.setItem('lk.admTheme', m); } catch (e) { /* bỏ qua */ } if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m); paintTheme(); };
  const paintTheme = () => { const b = document.getElementById('thm'); if (!b) return; const m = (() => { try { return localStorage.getItem('lk.admTheme') || 'auto'; } catch (e) { return 'auto'; } })(); b.textContent = THEME[m][0] + ' ' + L(THEME[m][1]); b.setAttribute('aria-label', L('Giao diện: {m} – bấm để đổi', { m: L(THEME[m][1]) })); };
  try { const m = localStorage.getItem('lk.admTheme'); if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-theme', m); } catch (e) { /* bỏ qua */ }
  let user = null, tab = 'overview', denied = false;

  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  // Hộp thoại quản lý khóa API (Gemini): dán → kiểm tra với Google → lưu; Esc/nền để đóng; ẩn/hiện khóa
  function keyDialog(st, done) {
    const d = document.createElement('dialog'); d.className = 'key-dlg';
    const keys = st.keys || [], live = keys.filter(k => !k.cooling).length;
    d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><h3 style="margin:0">${L('✨ Khóa Gemini API')} <span class="pill ${keys.length ? 'ok' : 'warn'}">${L('{n} khóa', { n: keys.length })}</span></h3><button class="icon-x" value="x" aria-label="${L('Đóng')}">✕</button></div>
      <p class="small muted" style="margin:.5rem 0 0">${L('Nhiều khóa = <b>xoay vòng</b>: khóa hết lượt tự nghỉ 1 giờ và chuyển khóa kế tiếp; hết khóa → tự dùng Cloudflare AI. Thêm khóa từ nhiều tài khoản Google để tăng hạn mức miễn phí.')}</p>
      <ul class="key-list">${keys.map(k => `<li><span class="dot ${k.cooling ? 'warn' : ''}"></span><code>…${esc(k.last4)}</code><span class="small muted">${k.cooling ? L('tạm nghỉ (hết lượt)') : L('sẵn sàng')} · ${when(k.at)}${k.by ? ' · ' + esc(k.by.split('@')[0]) : ''}</span><button type="button" class="icon-btn-s" data-rm="${esc(k.last4)}" title="${L('Gỡ khóa')}" aria-label="${L('Gỡ khóa …{k}', { k: esc(k.last4) })}">🗑</button></li>`).join('') || `<li class="muted small">${L('Chưa có khóa – AI đang dùng Cloudflare Workers AI.')}</li>`}</ul>
      <details ${keys.length ? '' : 'open'} class="key-help"><summary class="small"><b>${L('Cách lấy khóa miễn phí')}</b></summary><ol class="key-steps"><li>${L('Mở {link} (đăng nhập Google)', { link: '<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>' })}</li><li>${L('Bấm <b>Create API key</b> → sao chép')}</li><li>${L('Dán vào ô dưới → <b>{b}</b>', { b: L('Thêm khóa') })}</li></ol></details>
      <label class="key-field"><input type="password" id="kv" placeholder="${L('Dán khóa AIza… hoặc AQ.…')}" autocomplete="off" spellcheck="false"><button type="button" class="btn ghost sm" id="kshow" aria-label="${L('Hiện/ẩn khóa')}">👁</button><button type="button" class="btn primary" id="ksave">${L('Thêm khóa')}</button></label>
      <div class="small" id="kmsg" role="status" aria-live="polite" style="min-height:1.2em;margin-top:.4rem"></div>
      <p class="tiny muted" style="margin:.6rem 0 0">${L('🔒 {n} khóa sẵn sàng. Khóa chỉ máy chủ dùng (chấm bài, duyệt bản dịch), chỉ hiện 4 ký tự cuối. Gỡ khóa cần đăng nhập trong 15 phút gần nhất.', { n: live })}</p></form>`;
    document.body.appendChild(d); d.showModal(); d.querySelector('#kv').focus();
    let changed = false;
    d.addEventListener('close', () => { d.remove(); if (changed) done(); }); d.addEventListener('click', e => { if (e.target === d) d.close(); });
    const msg = (t, ok) => { const m = d.querySelector('#kmsg'); m.textContent = t; m.className = 'small ' + (ok === true ? 'ok-t' : ok === false ? 'bad-t' : 'muted'); };
    d.querySelector('#kshow').onclick = () => { const i = d.querySelector('#kv'); i.type = i.type === 'password' ? 'text' : 'password'; };
    const add = async () => {
      const key = d.querySelector('#kv').value.trim(); if (!key) return msg(L('Hãy dán khóa trước.'), false);
      const b = d.querySelector('#ksave'); b.disabled = true; msg(L('⏳ Đang kiểm tra với Google…'));
      try { const r = await api('geminiSet', { key }); if (r.ok) { changed = true; msg(L('✓ Đã thêm khóa …{k} (tổng {n} khóa)', { k: r.last4, n: r.count }), true); d.querySelector('#kv').value = ''; setTimeout(() => { d.close(); }, 900); } else msg('✗ ' + (r.error || L('Không lưu được')), false); } catch (e) { msg('✗ ' + e.message, false); }
      b.disabled = false;
    };
    d.querySelector('#ksave').onclick = add; d.querySelector('#kv').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    d.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (!confirm(L('Gỡ khóa …{k}?', { k: b.dataset.rm }))) return; try { await api('geminiRemove', { last4: b.dataset.rm }); changed = true; b.closest('li').remove(); msg(L('✓ Đã gỡ khóa'), true); } catch (e) { msg('✗ ' + e.message, false); } });
  }
  async function api(op, body = {}) {
    const u = auth.currentUser || user; // phiên có thể bị đăng xuất ở tab khác cùng lexkite.com
    if (!u) { if (confirm(L('Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?'))) await signIn(); throw new Error(L('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại')); }
    // ui = ngôn ngữ giao diện quản trị (máy chủ chọn vi/en cho vài câu hiển thị); không dùng "lang" vì op review/judge đã dùng cho ngôn ngữ bản dịch
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ui: LANG, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (r.status === 401 && j.error === 'reauth') { if (confirm(j.message || L('Cần đăng nhập lại để xác nhận thao tác quan trọng. Đăng nhập lại ngay?'))) { await auth.signOut(); await signIn(); } throw new Error('reauth'); }
    if (!r.ok) throw new Error(j.error || r.status);
    return j;
  }
  // GrabCast qua proxy /api/social (khóa chỉ ở máy chủ) – dùng cho tab Video & Social (js/admin-social.js). Lỗi → err.code = mã lỗi máy chủ (not-configured, grabcast-rate, timeout…)
  async function sapi(method, path, body, opt = {}) {
    const u = auth.currentUser || user;
    if (!u) { if (confirm(L('Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?'))) await signIn(); throw new Error(L('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại')); }
    const r = await fetch('/api/social', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ method, path, query: opt.query, body: body || undefined, idem: opt.idem }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const m = j.message || j.detail || (j.error && j.error !== 'upstream' ? j.error : '') || 'HTTP ' + r.status, e = new Error(typeof m === 'string' ? m : JSON.stringify(m)); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  // Video Studio qua /api/studio (functions/api/studio.js) – dùng cho tab Video Studio (js/admin-studio.js, tải lười). Lỗi → err.code + err.data (need, from/to, errs…)
  async function stapi(op, body = {}) {
    const u = auth.currentUser || user;
    if (!u) { if (confirm(L('Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?'))) await signIn(); throw new Error(L('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại')); }
    const r = await fetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || j.error || 'HTTP ' + r.status); e.code = j.error; e.status = r.status; e.data = j; throw e; }
    return j;
  }
  const signIn = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => { $('#loginMsg').textContent = e.message; });
  $('#signin').onclick = signIn;

  const renderMe = u => {
    $('#me').innerHTML = `<a class="btn ghost sm theme-btn" href="/#/home" id="home">↩ ${L('Về app')}</a><button class="btn ghost sm theme-btn" id="thm" title="${L('Đổi giao diện sáng/tối')}"></button><button class="btn ghost sm lang-btn" id="lng"></button>${esc(u.email)} <button class="btn ghost sm" id="out">${L('Thoát')}</button>`;
    { const br = document.querySelector('.adm-top .brand'); if (br) br.title = L('Về trang chủ Lexkite'); }
    paintTheme(); paintStatic(); $('#thm').onclick = () => { const order = ['auto', 'light', 'dark'], cur = localStorage.getItem('lk.admTheme') || 'auto'; setTheme(order[(order.indexOf(cur) + 1) % 3]); };
    $('#lng').onclick = () => setLang(LANG === 'vi' ? 'en' : 'vi');
    $('#out').onclick = () => auth.signOut().then(() => location.reload());
  };
  const noAccess = u => { main.innerHTML = `<div class="card center adm-login"><h2>${L('Không có quyền')}</h2><p class="muted">${L('{e} chưa được cấp quyền quản trị.', { e: esc(u.email) })}</p><button class="btn" onclick="firebase.auth().signOut().then(()=>location.reload())">${L('Đổi tài khoản')}</button></div>`; };
  // Đổi VI ⇄ EN: lưu lựa chọn, vẽ lại thanh trên + tab đang mở (không tải lại trang)
  function setLang(l) {
    LANG = l; try { localStorage.setItem('lk.admLang', l); } catch (e) { /* bỏ qua */ }
    regionNames = mkRegion(); paintStatic();
    if (user) renderMe(user);
    if (user && denied) noAccess(user); else if (user && !$('#tabs').hidden) show(tab);
  }

  auth.onAuthStateChanged(async u => {
    user = u;
    if (!u) return;
    renderMe(u);
    try { const h = location.hash.slice(1); await show(VIEWS[h] ? h : 'overview'); $('#tabs').hidden = false; denied = false; badges(); }
    catch (e) { denied = true; noAccess(u); }
  });
  $('#tabs').onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); };

  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== tab && user) show(h); }); // gõ/đổi #tab trên thanh địa chỉ → chuyển tab
  async function show(t) {
    stopLive(); tab = t; try { history.replaceState(null, '', '#' + t); } catch (e) { /* bỏ qua */ } document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    main.innerHTML = `<div class="adm-loading-grid"><div class="skeleton-head"></div><div class="skeleton-grid">${'<div class="skeleton-card"></div>'.repeat(8)}</div></div>`;
    await VIEWS[t]();
  }
  async function badges() {
    const [o, a] = await Promise.all([api('overview'), api('alerts')]);
    $('#inboxN').textContent = o.inbox.open || '';
    $('#alertN').textContent = a.rows.filter(r => !r.ok).length || '';
  }
  const NODATA = () => `<p class="small muted">${L('Chưa có dữ liệu')}</p>`;
  // Biểu đồ 24 cột giờ trong ngày
  const hourChart = rows => { const v = Array.from({ length: 24 }, (_, h) => ((rows || []).find(r => r.k === h) || {}).n || 0), m = Math.max(1, ...v); return `<div class="hchart">${v.map((n, h) => `<div title="${L('{h}h: {n} phiên', { h, n })}"><i style="height:${Math.max(2, n / m * 100)}%"></i><small>${h % 3 ? '' : h + 'h'}</small></div>`).join('')}</div>`; };
  // Cột chồng khách mới / quay lại theo ngày
  const stack = rows => { if (!rows.length) return NODATA(); const m = Math.max(1, ...rows.map(r => (r.fresh || 0) + (r.back || 0))); return `<div class="hchart stack">${rows.slice(-30).map(r => `<div title="${L('{d}: {f} mới · {b} quay lại', { d: esc(r.day), f: r.fresh || 0, b: r.back || 0 })}"><i class="b" style="height:${(r.back || 0) / m * 100}%"></i><i style="height:${(r.fresh || 0) / m * 100}%"></i><small>${esc(String(r.day).slice(8))}</small></div>`).join('')}</div><p class="small muted"><span class="lg new"></span> ${L('Khách mới')} <span class="lg back"></span> ${L('Quay lại')}</p>`; };
  const bars = (rows, label = r => r.k, val = r => r.n, extra = r => '') => {
    if (!rows || !rows.length) return NODATA();
    const max = Math.max(1, ...rows.map(val)), tot = rows.reduce((t, r) => t + (+val(r) || 0), 0) || 1;
    return `<div class="hbars">${rows.map(r => `<div class="row2"><span class="k" title="${esc(label(r))}">${esc(label(r)) || '–'}</span><span class="track"><i style="width:${val(r) / max * 100}%"></i></span><span class="v">${num(val(r))}<small> · ${Math.round(val(r) / tot * 100)}%${extra(r)}</small></span></div>`).join('')}</div>`;
  };
  // Đủ mọi ngày trong khoảng chọn (ngày không có phiên = 0) – tránh vài cột khổng lồ khi dữ liệu thưa
  const padDays = (rows, days) => { const by = Object.fromEntries((rows || []).map(r => [r.day, r])), out = []; for (let i = Math.min(days, 90) - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); out.push(by[d] || { day: d, s: 0, v: 0 }); } return out; };
  const chart = (rows, key) => {
    if (!rows.length) return `<p class="muted small">${L('Chưa có dữ liệu')}</p>`;
    const W = 600, H = 170, max = Math.max(1, ...rows.map(r => +r[key] || 0)), bw = W / rows.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none">${rows.map((r, i) => { const h = (+r[key] || 0) / max * H; return `<rect x="${i * bw + 1}" y="${H - h}" width="${Math.max(bw - 2, 1)}" height="${h}" rx="2" fill="var(--primary)"><title>${r.day}: ${r[key]}</title></rect>`; }).join('')}<text x="0" y="${H + 14}">${rows[0].day}</text><text x="${W}" y="${H + 14}" text-anchor="end">${rows[rows.length - 1].day}</text><text x="2" y="10">${num(max)}</text></svg>`;
  };

  // ---------- Phân tích trực tiếp: thẻ KPI, biểu đồ vùng 14 ngày, bản đồ thế giới (jsvectormap tải lười) ----------
  let liveTimer = null, worldMap = null, mapKey = '', mapLib = null, mapRO = null;
  const stopLive = () => { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } if (mapRO) { mapRO.disconnect(); mapRO = null; } if (worldMap) { try { worldMap.destroy(); } catch (e) { /* bỏ qua */ } worldMap = null; } mapKey = ''; };
  const PLAT = { web: ['🌐', 'Web'], pwa: ['📲', 'PWA (web đã cài)'], ext: ['🧩', 'Add-on Chrome'], ios: ['🍎', 'iOS'], android: ['🤖', 'Android'], app: ['📱', 'App (cũ)'] };
  const platName = k => PLAT[k] ? L(PLAT[k][1]) : k || '–', platIcon = k => (PLAT[k] || ['❔'])[0];
  const ago = t => { if (!t) return '–'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? L('vừa xong') : m < 60 ? L('{n} phút trước', { n: m }) : m < 1440 ? L('{n} giờ trước', { n: Math.round(m / 60) }) : L('{n} ngày trước', { n: Math.round(m / 1440) }); };
  const mkRegion = () => { try { return new Intl.DisplayNames([LANG], { type: 'region' }); } catch (e) { return null; } }; // trình duyệt cũ → null
  let regionNames = mkRegion();
  const cname = c => { try { return c && c !== 'XX' && regionNames ? regionNames.of(c) : c || '?'; } catch (e) { return c; } };
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
    return `<svg class="area-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Lượt xem và khách 14 ngày qua')}"><defs><linearGradient id="acFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".35"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${lv} L${X(n - 1).toFixed(1)},${T + ih} L${X(0).toFixed(1)},${T + ih} Z" fill="url(#acFill)"/><path d="${lv}" class="ac-v"/><path d="${smooth(pu)}" class="ac-u"/>
      ${rows.map((r, i) => `<g class="ac-col"><rect x="${(X(i) - cw / 2).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${ih}" fill="transparent"/><line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${T}" y2="${T + ih}" class="ac-hl"/><circle cx="${pv[i][0].toFixed(1)}" cy="${pv[i][1].toFixed(1)}" r="3.5" class="ac-dv"/><circle cx="${pu[i][0].toFixed(1)}" cy="${pu[i][1].toFixed(1)}" r="3" class="ac-du"/>${i % 2 === (n - 1) % 2 ? `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${dd(r.day)}</text>` : ''}<title>${L('{d}: {v} lượt xem · {u} khách', { d: dd(r.day), v: num(r.views), u: num(r.visitors) })}</title></g>`).join('')}</svg>
      <p class="small muted ac-legend"><span class="lg new"></span> ${L('Lượt xem')} <span class="lg vis"></span> ${L('Khách')}</p>`;
  };
  const liveCard = l => {
    const t = l.today || {}, tot = l.total || {};
    const tile = (icon, label, val, sub = '', cls = '') => `<div class="lt ${cls}"><div class="lt-l">${icon} ${label}</div><div class="lt-v">${val}</div>${sub ? `<div class="lt-s">${sub}</div>` : ''}</div>`;
    return `<div class="row between live-head"><h3 style="margin:0">${L('📈 Lưu lượng trực tiếp')}</h3><span class="telemetry-pill"><span class="pulse-dot"></span>${L('Live · tự cập nhật 30s · {t}', { t: clock(l.at || Date.now()) })}</span></div>
      ${l.rate < 1 ? `<p class="small muted" style="margin:.3rem 0 0">${L('Lấy mẫu {p}% – số thực ≈ × {x}', { p: Math.round(l.rate * 100), x: Math.round(1 / l.rate) })}</p>` : ''}
      <div class="lt-grid">
        ${tile('<span class="pulse-dot"></span>', L('Đang online <small>(5 phút)</small>'), num(l.online), L('khách có tín hiệu gần đây'), 'on')}
        ${tile('👁️', L('Lượt xem hôm nay'), num(t.views), L('{n} phiên', { n: num(t.s) }))}
        ${tile('🧑', L('Khách hôm nay'), num(t.visitors), L('thiết bị khác nhau'))}
        ${tile('📄', L('Trang/khách'), nf1(t.perVisitor), L('hôm nay'))}
        ${tile('⏱️', L('Thời gian TB'), t.s ? durS(t.dur) : '–', L('mỗi phiên hôm nay'))}
        ${tile('Σ', L('Tổng lượt xem'), num(tot.views), L('{n} khách từ trước đến nay', { n: num(tot.visitors) }))}
      </div>
      <div class="ac-wrap"><div class="small muted ac-title">${L('14 ngày qua')}</div>${areaChart(l.series)}</div>`;
  };
  const route = k => '#/' + (k || 'home');
  const liveGrid = l => {
    const P = ['web', 'pwa', 'ext', 'ios', 'android'], m = rows => Object.fromEntries((rows || []).map(r => [r.k, r.n]));
    const pt = m(l.platsToday), p30 = m(l.plats30), keys = [...P, ...Object.keys({ ...pt, ...p30 }).filter(k => !P.includes(k))];
    const tt = Math.max(1, ...keys.map(k => pt[k] || 0)), t3 = Math.max(1, ...keys.map(k => p30[k] || 0));
    return `
      <div class="card"><h3>${L('🌍 Quốc gia hôm nay')}</h3>${bars((l.countries || []).slice(0, 12), r => FLAG(r.k) + ' · ' + cname(r.k))}</div>
      <div class="card"><h3>${L('👀 Đang xem')} <span class="small muted">· ${num(l.online)} online</span></h3>${(l.viewing || []).length ? bars(l.viewing, r => route(r.k)) : `<p class="small muted">${L('Không ai online trong 5 phút qua')}</p>`}</div>
      <div class="card"><h3>${L('📄 Trang xem nhiều hôm nay')}</h3>${bars(l.pagesToday, r => route(r.k))}${l.pagesFallback ? `<p class="tiny muted">${L('Theo trang vào đầu tiên (chưa có số lượt xem từng trang).')}</p>` : ''}</div>
      <div class="card"><h3>${L('🔗 Nguồn giới thiệu hôm nay')}</h3>${(l.refs || []).length ? bars(l.refs) : `<p class="small muted">${L('Chủ yếu truy cập trực tiếp')}</p>`}</div>
      <div class="card"><h3>${L('🔥 Trang xem nhiều · 7 ngày')}</h3>${bars(l.pages7, r => route(r.k))}</div>
      <div class="card"><h3>${L('📱 Nền tảng')}</h3><table class="tbl plat-tbl"><tr><th>${L('Nền tảng')}</th><th class="num">${L('Hôm nay')}</th><th class="num">${L('30 ngày')}</th></tr>${keys.map(k => `<tr><td>${platIcon(k)} ${esc(platName(k))}</td><td class="num"><span class="mini"><i style="width:${(pt[k] || 0) / tt * 100}%"></i></span>${num(pt[k])}</td><td class="num"><span class="mini"><i style="width:${(p30[k] || 0) / t3 * 100}%"></i></span>${num(p30[k])}</td></tr>`).join('')}</table><p class="tiny muted">${L('Số khách (thiết bị) khác nhau.')}</p></div>`;
  };
  // Nạp jsvectormap (MIT, lưu sẵn trong web/js/vendor) chỉ khi mở tab Phân tích
  const loadMap = () => mapLib || (mapLib = new Promise((ok, fail) => {
    if (!document.querySelector('link[data-jvm]')) { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'css/vendor/jsvectormap.min.css'; c.dataset.jvm = 1; document.head.appendChild(c); }
    const js = src => new Promise((y, n) => { const s = document.createElement('script'); s.src = src; s.onload = y; s.onerror = n; document.head.appendChild(s); });
    js('js/vendor/jsvectormap/jsvectormap.min.js').then(() => js('js/vendor/jsvectormap/world.js')).then(() => window.jsVectorMap ? ok(window.jsVectorMap) : fail(new Error('jsvectormap'))).catch(e => { mapLib = null; fail(e); });
  }));
  const BUCKETS = [['1', 1, '#fcd9cc'], ['2–5', 2, '#f7a98f'], ['6–20', 6, '#ef7a58'], ['21–100', 21, '#d9512e'], ['100+', 101, '#9e3215']];
  const bucket = n => [...BUCKETS].reverse().find(b => n >= b[1]);
  async function drawMap(countries) {
    const box = $('#worldMap'); if (!box) return;
    const rows = (countries || []).filter(r => r.k && r.k !== 'XX'), vals = Object.fromEntries(rows.map(r => [r.k, r.n])), known = rows.reduce((a, r) => a + r.n, 0), unk = (countries || []).filter(r => !r.k || r.k === 'XX').reduce((a, r) => a + r.n, 0);
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
        regionStyle: { initial: { fill: css('--surface-3') || '#dee2e8', stroke: css('--surface') || '#fff', strokeWidth: .4 }, hover: { fillOpacity: .8, cursor: 'pointer' } },
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
  // ---------- Người dùng: hộp thoại chi tiết & xóa dữ liệu ----------
  async function userDel(uid, done) {
    const c = prompt(L('Xóa vĩnh viễn dữ liệu đồng bộ của tài khoản này (tài khoản Google không bị ảnh hưởng).\nGõ lại UID để xác nhận:\n') + uid);
    if (c == null) return; if (c.trim() !== uid) return alert(L('UID không khớp – chưa xóa gì.'));
    try { await api('userDelete', { uid, confirm: uid }); done && done(); } catch (e) { if (e.message !== 'reauth') alert(L('Không xóa được: {e}', { e: e.message })); }
  }
  const rolePill = adm => adm ? `<span class="pill role-adm">${L('👑 Quản trị')}</span>` : `<span class="pill">${L('Người học')}</span>`;
  async function userDialog(uid, done) {
    const d = document.createElement('dialog'); d.className = 'key-dlg u-dlg';
    d.innerHTML = `<div class="key-box"><p class="muted">${L('Đang tải…')}</p></div>`; document.body.appendChild(d); d.showModal();
    d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); });
    let r; try { r = await api('user', { uid }); } catch (e) { d.querySelector('.key-box').innerHTML = `<p class="bad-t">✗ ${esc(e.message)}</p>`; return; }
    const u = r.user || {}, docs = r.docs || [], total = docs.reduce((a, x) => a + (x.bytes || 0), 0), LR = r.learn;
    const cards = docs.filter(x => /^cards_/.test(x.k)), other = docs.filter(x => !/^cards_/.test(x.k));
    const fact = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><div class="u-who"><span class="u-av big" aria-hidden="true">${esc((u.name || u.email || '?').trim().charAt(0).toUpperCase())}</span><span><h3 style="margin:0">${esc(u.name || L('(không tên)'))} ${rolePill(u.isAdmin)}</h3><span class="small muted">${esc(u.email || '')}</span></span></div><button class="icon-x" value="x" aria-label="${L('Đóng')}">✕</button></div>
      <dl class="u-facts">${fact('UID', `<code>${esc(u.uid)}</code>`)}${fact(L('Nền tảng'), `${platIcon(u.plat)} ${esc(platName(u.plat))}`)}${fact(L('Ngày tạo'), when(u.created))}${fact(L('Hoạt động gần nhất'), `${when(u.seen)} <span class="muted">(${ago(u.seen)})</span>`)}${fact(L('Số lần vào (đồng bộ)'), num(u.n))}${fact(L('Dữ liệu đồng bộ'), L('{b} · {n} phần', { b: bytes(total), n: docs.length }))}</dl>
      ${LR ? `<h4 class="u-h">${L('📚 Học tập')}</h4><div class="u-stats">${[['⭐', 'XP', num(LR.xp)], ['🔥', L('Chuỗi ngày'), num(LR.streak)], ['📅', L('Ngày đã học'), num(LR.studyDays)], ['🃏', L('Lượt ôn'), num(LR.reviews)], ['🌱', L('Từ mới'), num(LR.newWords)], ['🎯', L('Bài luyện'), num(LR.quizzes)], ['📖', L('Bài đọc'), num(LR.readings)], ['🎙️', L('Từ đã nói'), num(LR.spoken)], ['🏅', L('Huy hiệu'), num(LR.badges)]].map(([i, k, v]) => `<div><span>${i} ${k}</span><b>${v}</b></div>`).join('')}</div>${LR.lastStudy ? `<p class="tiny muted">${L('Ngày học gần nhất: {d}', { d: esc(LR.lastStudy) })}</p>` : ''}` : ''}
      <h4 class="u-h">${L('🗂️ Tài liệu đồng bộ')}</h4>
      <div class="tbl-wrap u-docs"><table class="tbl"><tr><th>${L('Phần')}</th><th class="num">${L('Dung lượng')}</th><th>${L('Cập nhật')}</th></tr>${other.map(x => `<tr><td><code>${esc(x.k)}</code></td><td class="num">${bytes(x.bytes)}</td><td class="small">${when(x.updated)}</td></tr>`).join('')}${cards.length ? `<tr><td><code>cards_*</code> <span class="small muted">${L('({n} gói thẻ)', { n: cards.length })}</span></td><td class="num">${bytes(cards.reduce((a, x) => a + x.bytes, 0))}</td><td class="small">${when(Math.max(...cards.map(x => x.updated)))}</td></tr>` : ''}${docs.length ? '' : `<tr><td colspan="3" class="muted">${L('Không có dữ liệu đồng bộ')}</td></tr>`}</table></div>
      <div class="row between" style="margin-top:1rem;gap:.5rem;flex-wrap:wrap">${docs.length || u.uid ? `<button type="button" class="btn ghost sm danger" id="udel">${L('🗑 Xóa dữ liệu')}</button>` : '<span></span>'}<span class="row" style="gap:.5rem">${u.email ? `<a class="btn sm" href="mailto:${esc(u.email)}">${L('✉️ Gửi email')}</a>` : ''}<button class="btn sm" value="x">${L('Đóng')}</button></span></div></form>`;
    const del = d.querySelector('#udel'); if (del) del.onclick = () => userDel(u.uid, () => { d.close(); done && done(); });
  }

  const VIEWS = {
    async overview() {
      const [o, a, q, gk, u] = await Promise.all([
        api('overview'),
        api('alerts'),
        api('quality').catch(() => ({})),
        api('geminiStatus').catch(() => ({})),
        api('usage').catch(() => ({}))
      ]);
      const users = o.users || {}, s = o.sessions || {}, bad = a.rows.filter(r => !r.ok);
      const mau = +users.act30 || 0, dau = +users.act1 || 0;
      const stickiness = mau > 0 ? Math.round(dau / mau * 100) : (dau > 0 ? 100 : 0);
      const qScore = q.score != null ? q.score : null;
      const liveKeys = (gk.keys || []).filter(k => !k.cooling).length;
      const d1Meter = (u.meters || []).find(m => /d1/i.test(m.name)) || { pct: 0, used: 0, cap: 500 * 1024 * 1024 };

      // Helper tạo đường sóng Sparkline SVG
      const spark = (pts, cls = '') => {
        const min = Math.min(...pts), max = Math.max(...pts), range = (max - min) || 1;
        const w = 68, h = 28, step = w / (pts.length - 1);
        const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - 4 - ((v - min) / range) * (h - 8)).toFixed(1)}`).join(' ');
        return `<svg class="kpi-spark ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" /></svg>`;
      };

      // Phân loại trạng thái workflow / telemetry theo chuẩn quốc tế
      const statusMeta = r => {
        const st = String(r.status || '').toLowerCase();
        const cn = String(r.conclusion || '').toLowerCase();
        if (st === 'in_progress' || st === 'running') return { dot: 'dot pulse', badge: 'pulse', text: L('Đang chạy…') };
        if (st === 'queued' || st === 'pending' || cn === 'skipped') return { dot: 'dot wait', badge: 'wait', text: cn === 'skipped' ? L('Bỏ qua') : L('Đang chờ') };
        if (cn === 'success' || (r.ok && !r.warn)) return { dot: 'dot ok', badge: 'ok', text: L('Thành công') };
        if (r.warn) return { dot: 'dot warn', badge: 'warn', text: L('Cảnh báo@@status') };
        return { dot: 'dot bad', badge: 'bad', text: L('Cần chú ý') };
      };

      const nowTime = clock(Date.now());
      const pipeRows = bad.length ? bad : a.rows.slice(0, 6);
      const qOk = qScore != null && qScore >= 100;

      main.innerHTML = `
        <div class="adm-header-bar">
          <div class="telemetry-pill">
            <span class="pulse-dot"></span>
            <span>${L('Hệ thống hoạt động bình thường · Đồng bộ {t}', { t: nowTime })}</span>
          </div>
          <button class="btn sm ghost" id="admReload" title="${L('Tải lại số liệu')}">${L('🔄 Cập nhật')}</button>
        </div>

        <section class="bento-section">
          <div class="bento-title">${L('👥 Học viên &amp; Mức độ gắn kết (Learners &amp; Retention)')}</div>
          <div class="bento-grid">
            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">👥</span> ${L('Học viên đăng ký')}</span>
                <span class="kpi-badge good">${L('+{n} / 7 ngày', { n: num(users.new7) })}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(users.total)}</span>
                ${spark([Math.max(1, users.total - users.new7), users.total], 'good')}
              </div>
              <div class="kpi-foot">
                <span>${L('Hoạt động 7 ngày: <b>{n}</b> người', { n: num(users.act7) })}</span>
                <a href="#" data-go="users">${L('Quản lý →')}</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🎯</span> ${L('Gắn kết (DAU / MAU)')}</span>
                <span class="kpi-badge ${stickiness >= 25 ? 'good' : 'warn'}">${stickiness}%</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${stickiness}%</span>
                ${spark([20, 25, 28, stickiness], stickiness >= 25 ? 'good' : '')}
              </div>
              <div class="kpi-foot">
                <span>DAU: <b>${num(dau)}</b> · MAU: <b>${num(mau)}</b></span>
                <span class="small muted">${L('Chuẩn EdTech ≥ 25%')}</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">⚡</span> ${L('Lượt truy cập hôm nay')}</span>
                <span class="kpi-badge">${L('{n} phiên / 7 ngày', { n: num(s.s7) })}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(s.today)}</span>
                ${spark([1, 2, 4, Math.max(1, s.today)])}
              </div>
              <div class="kpi-foot">
                <span>${L('<b>{n}</b> khách duy nhất (7 ngày)', { n: num(s.v7) })}</span>
                <a href="#" data-go="analytics">${L('Chi tiết →')}</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">⏱️</span> ${L('Thời gian học TB')}</span>
                <span class="kpi-badge">${L('{n} trang/phiên', { n: (+s.pages7 || 0).toFixed(1) })}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="font-size:1.55rem">${dur(s.dur7)}</span>
                ${spark([120, 180, 200, Math.max(60, s.dur7 || 0)])}
              </div>
              <div class="kpi-foot">
                <span>${L('Độ sâu phiên ôn tập FSRS')}</span>
                <a href="#" data-go="analytics">${L('Xu hướng →')}</a>
              </div>
            </div>
          </div>
        </section>

        <section class="bento-section">
          <div class="bento-title">${L('⚡ Vận hành &amp; Hạ tầng (Operations &amp; Reliability)')}</div>
          <div class="bento-grid">
            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🛡️</span> ${L('Điểm chất lượng tự động')}</span>
                <span class="kpi-badge ${qOk ? 'good' : 'bad'}">${qOk ? L('Đạt chuẩn') : L('Dưới chuẩn')}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="color:${qScore == null ? '' : qScore >= 100 ? 'var(--good,#15803d)' : 'var(--bad,#dc2626)'}">${qScore == null ? '–' : qScore + '%'}</span>
                ${spark([100, 100, 100, qScore || 100], qScore >= 100 ? 'good' : 'bad')}
              </div>
              <div class="kpi-foot">
                <span>${L('14 ngày CI/CD liên tục')}</span>
                <a href="#" data-go="quality">${L('Rà soát →')}</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🐞</span> ${L('Lỗi JS (24 giờ)')}</span>
                <span class="kpi-badge ${o.errors24.hits === 0 ? 'good' : 'bad'}">${L('{n} loại', { n: o.errors24.kinds })}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(o.errors24.hits)}</span>
                ${spark([0, 0, 0, o.errors24.hits], o.errors24.hits === 0 ? 'good' : 'bad')}
              </div>
              <div class="kpi-foot">
                <span>${o.errors24.hits === 0 ? L('✨ Không có lỗi') : L('⚠️ Có lỗi cần sửa')}</span>
                <a href="#" data-go="alerts">${L('Xem log →')}</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">📬</span> ${L('Tin nhắn chưa xử lý')}</span>
                <span class="kpi-badge ${o.inbox.open === 0 ? 'good' : 'warn'}">${o.inbox.open === 0 ? L('Sạch hòm thư') : L('Chờ trả lời')}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(o.inbox.open)}</span>
                ${spark([0, 1, 0, o.inbox.open])}
              </div>
              <div class="kpi-foot">
                <span>${L('Hỗ trợ từ #/contact')}</span>
                <a href="#" data-go="inbox">${L('Mở hộp thư →')}</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">☁️</span> ${L('Khóa Gemini API')}</span>
                <span class="kpi-badge ${gk.set ? 'good' : 'warn'}">${gk.set ? L('{n} sẵn sàng', { n: liveKeys }) : L('Chưa thiết lập')}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="font-size:1.55rem">${gk.set ? `${liveKeys}/${(gk.keys || []).length}` : 'CF AI'}</span>
                ${spark([1, 1, 2, liveKeys || 1], 'good')}
              </div>
              <div class="kpi-foot">
                <span>${L('D1: <b>{p}%</b> dung lượng', { p: d1Meter.pct })}</span>
                <a href="#" data-go="services">${L('Dịch vụ &amp; API →')}</a>
              </div>
            </div>
          </div>
        </section>

        <section class="pipeline-card">
          <div class="pipeline-head">
            <h3 style="margin:0">${bad.length ? L('⚠️ Tác vụ cần chú ý') : L('✅ Trạng thái tác vụ tự động (GitHub Actions)')}</h3>
            <a href="#" class="small" data-go="alerts">${L('Toàn bộ cảnh báo &amp; nhật ký →')}</a>
          </div>
          <div class="pipeline-grid">
            ${pipeRows.map(r => {
              const meta = statusMeta(r);
              return `<div class="pipeline-item">
                <span class="pipeline-item-name" title="${esc(r.name)}"><span class="${meta.dot}"></span><b>${esc(r.name)}</b></span>
                <span class="pipeline-item-status ${meta.badge}">${esc(r.conclusion || meta.text)}</span>
              </div>`;
            }).join('')}
          </div>
        </section>`;

      main.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { e.preventDefault(); show(x.dataset.go); });
      const rel = main.querySelector('#admReload');
      if (rel) rel.onclick = () => show('overview');
    },
    async analytics() {
      const days = +(sessionStorage.getItem('adm.days') || 30);
      const [a, l] = await Promise.all([api('analytics', { days }), api('live', { days }).catch(() => null)]), s = a.sum || {};
      const pct = (x, y) => y ? Math.round(x / y * 100) + '%' : '–';
      const span = days === 1 ? L('hôm nay') : L('{n} ngày', { n: days });
      main.innerHTML = `
        <div class="tools"><b>${L('Khoảng thời gian (phần Chi tiết)')}</b>${[1, 7, 30, 90, 365].map(d => `<button class="btn sm ${d === days ? 'primary' : ''}" data-d="${d}">${d === 1 ? L('Hôm nay') : L('{n} ngày', { n: d })}</button>`).join('')}</div>
        ${a.rate < 1 ? `<div class="card" style="margin-bottom:.8rem">${L('ℹ️ Đang lấy mẫu {p}% người dùng – số phiên/người thực tế ≈ số dưới đây × {x}; tỉ lệ % và trung bình giữ nguyên.', { p: Math.round(a.rate * 100), x: Math.round(1 / a.rate) })}</div>` : ''}
        ${l ? `<section class="card live-card" id="liveCard">${liveCard(l)}</section>
        <section class="card map-card"><div class="row between"><h3 style="margin:0">${L('🗺️ Khách theo quốc gia · hôm nay')}</h3><span class="small muted" id="mapSum"></span></div><div class="world-map" id="worldMap" aria-label="${L('Bản đồ khách theo quốc gia hôm nay')}"></div><div id="mapLegend" class="map-legend"></div></section>
        <div class="adm-grid live-grid" id="liveGrid">${liveGrid(l)}</div>` : `<div class="card muted">${L('Không tải được số liệu trực tiếp.')}</div>`}
        <h3 class="sec-t detail-t">${L('📊 Chi tiết · {r}', { r: span })}</h3>
        <div class="kpis">
          <div class="card kpi"><div class="l">${L('Phiên truy cập')}</div><div class="v">${num(s.s)}</div></div>
          <div class="card kpi"><div class="l">${L('Khách (thiết bị)')}</div><div class="v">${num(s.v)}</div><div class="s">${L('{n} phiên/khách', { n: s.v ? (s.s / s.v).toFixed(1) : 0 })}</div></div>
          <div class="card kpi"><div class="l">${L('Thời gian TB/phiên')}</div><div class="v">${dur(s.dur)}</div></div>
          <div class="card kpi"><div class="l">${L('Trang/phiên')}</div><div class="v">${(+s.pages || 0).toFixed(1)}</div></div>
          <div class="card kpi"><div class="l">${L('Khách quay lại')}</div><div class="v">${pct(s.ret, s.s)}</div></div>
          <div class="card kpi"><div class="l">${L('Thoát ngay (&lt;15 giây, 1 trang)')}</div><div class="v">${pct(s.bounce, s.s)}</div></div>
          <div class="card kpi"><div class="l">${L('LCP thật (tốc độ hiện nội dung)')}</div><div class="v">${s.lcp ? (s.lcp / 1000).toFixed(2) + ' s' : '–'}</div><div class="s">${s.lcpN ? L('p75 · {p} phiên đạt “Tốt” (≤ 2,5 s)', { p: pct(s.lcpGood, s.lcpN) }) : L('chưa có dữ liệu')}</div></div>
        </div>
        <div class="card"><h3>${L('Phiên theo ngày')}</h3>${chart(padDays(a.daily, a.days), 's')}</div>
        <div class="adm-grid">
          <div class="card"><h3>${L('Nguồn truy cập')}</h3>${bars(a.refs, r => L(r.k), r => r.n, r => ` · ${dur(r.dur)}`)}</div>
          <div class="card"><h3>${L('Quốc gia')}</h3>${bars(a.countries, r => FLAG(r.k))}</div>
          <div class="card"><h3>${L('Trang vào đầu tiên')}</h3>${bars(a.paths, r => '#/' + r.k)}</div>
          <div class="card"><h3>${L('Tần suất (số phiên mỗi khách)')}</h3>${bars(['1', '2–3', '4–7', '8–15', '16+'].map(k => a.freq.find(f => f.k === k) || { k, n: 0 }), r => L('{k} lần', { k: r.k }))}</div>
          <div class="card"><h3>${L('Thiết bị')}</h3>${bars(a.devs)}<h3 style="margin-top:1rem">${L('Nền tảng@@h')}</h3>${bars(a.plats, r => platName(r.k))}</div>
          <div class="card"><h3>${L('Ngôn ngữ giao diện')}</h3>${bars(a.langs)}</div>
        </div>
        <h3 class="sec-t">${L('⏰ Thói quen sử dụng')}</h3>
        <div class="adm-grid">
          <div class="card span2"><h3>${L('Giờ cao điểm (giờ Việt Nam)')}</h3>${hourChart(a.hours)}</div>
          <div class="card"><h3>${L('Ngày trong tuần')}</h3>${bars(['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((k, i) => ({ k: L(k), n: ((a.wdays || []).find(w => w.k === i) || {}).n || 0 })))}</div>
          <div class="card"><h3>${L('Thời lượng phiên')}</h3>${bars(a.durs || [], r => L(r.k))}</div>
        </div>
        <h3 class="sec-t">${L('📈 Tăng trưởng')}</h3>
        <div class="adm-grid">
          <div class="card span2"><h3>${L('Khách mới & khách quay lại theo ngày')}</h3>${stack(a.nr || [])}</div>
          <div class="card"><h3>${L('Tài khoản đăng ký mới')}</h3>${(a.signups || []).length ? bars(a.signups.slice(-14).reverse(), r => r.day) : `<p class="small muted">${L('Chưa có đăng ký mới trong khoảng này')}</p>`}</div>
        </div>
        <p class="small muted" style="margin-top:1rem">${L('Thống kê ẩn danh tự xây: không cookie, không lưu IP; quốc gia do Cloudflare xác định. Không tính bot, Lighthouse và chế độ sandbox. "Hôm nay" theo giờ UTC.')}</p>`;
      main.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { sessionStorage.setItem('adm.days', b.dataset.d); show('analytics'); });
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
      main.innerHTML = `
        <div class="kpis u-kpis" id="uKpi"></div>
        <div class="card u-card">
          <div class="u-tools">
            <input type="search" id="uq" placeholder="${L('🔎 Tìm email, tên hoặc UID')}" value="${esc(f.q)}" aria-label="${L('Tìm người dùng')}">
            ${sel('frole', 'Vai trò', [['', 'Tất cả'], ['admin', 'Quản trị'], ['learner', 'Người học']])}
            ${sel('fstatus', 'Trạng thái', [['', 'Tất cả'], ['active7', 'Hoạt động 7 ngày'], ['dormant', 'Ngủ đông >30 ngày'], ['new7', 'Mới 7 ngày']])}
            ${sel('fplat', 'Nền tảng', [['', 'Tất cả'], ['web', 'Web'], ['ios', 'iOS'], ['android', 'Android'], ['ext', 'Add-on Chrome'], ['app', 'App (cũ)']])}
            ${sel('fsort', 'Sắp xếp', [['seen', 'Hoạt động gần nhất'], ['new', 'Mới nhất']])}
            <button class="btn sm" id="ucsv" title="${L('Tải CSV theo bộ lọc hiện tại (tối đa 5.000 dòng)')}">⬇ CSV</button>
          </div>
          <div class="tbl-wrap" id="uTable"><p class="small muted">${L('Đang tải…')}</p></div>
          <div class="u-pager" id="uPager"></div>
        </div>`;
      const save = () => sessionStorage.setItem('adm.uf', JSON.stringify(f));
      let seq = 0;
      const load = async () => {
        save(); const my = ++seq, r = await api('users', f); if (my !== seq || tab !== 'users') return;
        const k = r.kpi || {}, tot = r.total || 0;
        $('#uKpi').innerHTML = `
          <div class="card kpi"><div class="l">${L('👥 Tổng người dùng')}</div><div class="v">${num(tot)}</div><div class="s">${L('tài khoản đã đồng bộ')}</div></div>
          <div class="card kpi"><div class="l">${L('🟢 Hoạt động hôm nay')}</div><div class="v">${num(k.act1)}</div><div class="s">${L('24 giờ qua')}</div></div>
          <div class="card kpi"><div class="l">${L('📅 Hoạt động 7 / 30 ngày')}</div><div class="v">${num(k.act7)} <small class="muted">/ ${num(k.act30)}</small></div><div class="s">${L('{p}% còn hoạt động trong tháng', { p: tot ? Math.round((k.act30 || 0) / tot * 100) : 0 })}</div></div>
          <div class="card kpi"><div class="l">${L('✨ Mới 7 ngày')}</div><div class="v">${num(k.new7)}</div><div class="s">${L('tài khoản đăng ký mới')}</div></div>
          <div class="card kpi"><div class="l">${L('📱 Theo nền tảng')}</div><div class="u-plats">${(r.plats || []).map(p => `<span class="pill">${platIcon(p.k)} ${esc(platName(p.k))} · <b>${num(p.n)}</b></span>`).join('') || '<span class="small muted">–</span>'}</div></div>`;
        $('#uTable').innerHTML = `<table class="tbl u-tbl"><tr><th>${L('Người dùng')}</th><th>${L('Vai trò')}</th><th>${L('Nền tảng')}</th><th>${L('Ngày tạo')}</th><th>${L('Hoạt động gần nhất')}</th><th class="num">${L('Lần vào')}</th><th></th></tr>
          ${r.rows.map(u => `<tr><td><div class="u-who"><span class="u-av" aria-hidden="true">${esc((u.name || u.email || '?').trim().charAt(0).toUpperCase())}</span><span><b>${esc(u.name || L('(không tên)'))}</b><br><span class="small muted">${esc(u.email || u.uid)}</span></span></div></td>
            <td>${rolePill(u.isAdmin)}</td>
            <td class="nowrap">${platIcon(u.plat)} ${esc(platName(u.plat))}</td><td class="small nowrap">${when(u.created)}</td>
            <td class="small nowrap" title="${esc(when(u.seen))}"><span class="dot ${Date.now() - u.seen < 7 * 864e5 ? 'ok' : Date.now() - u.seen > 30 * 864e5 ? '' : 'warn'}"></span>${ago(u.seen)}</td><td class="num">${num(u.n)}</td>
            <td class="nowrap"><button class="btn ghost sm" data-uid="${esc(u.uid)}">${L('Chi tiết')}</button> <button class="btn ghost sm danger" data-del="${esc(u.uid)}">${L('Xóa dữ liệu')}</button></td></tr>`).join('') || `<tr><td colspan="7" class="muted">${L('Không có người dùng khớp bộ lọc')}</td></tr>`}</table>`;
        const from = r.filtered ? f.offset + 1 : 0, to = Math.min(f.offset + 50, r.filtered);
        $('#uPager').innerHTML = `<span class="small muted">${num(from)}–${num(to)} / ${num(r.filtered)}${r.filtered !== tot ? L(' (lọc từ {n})', { n: num(tot) }) : ''}</span><span><button class="btn sm" id="uprev" ${f.offset ? '' : 'disabled'}>${L('← Trước')}</button> <button class="btn sm" id="unext" ${to < r.filtered ? '' : 'disabled'}>${L('Sau →')}</button></span>`;
        $('#uprev').onclick = () => { f.offset = Math.max(0, f.offset - 50); load(); };
        $('#unext').onclick = () => { f.offset += 50; load(); };
        main.querySelectorAll('[data-uid]').forEach(b => b.onclick = () => userDialog(b.dataset.uid, load));
        main.querySelectorAll('[data-del]').forEach(b => b.onclick = () => userDel(b.dataset.del, load));
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
          b.textContent = L('✓ {n} dòng', { n: num(r.rows.length) });
        } catch (e) { b.textContent = L('✗ Lỗi xuất'); }
        setTimeout(() => { b.disabled = false; b.textContent = '⬇ CSV'; }, 2500);
      };
      await load();
    },
    async inbox() {
      const f = sessionStorage.getItem('adm.inbox') || 'open', r = await api('inbox', { filter: f });
      const gmail = m => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.email) + '&su=' + encodeURIComponent('Re: Lexkite – ' + (m.msg || '').slice(0, 50)) + '&body=' + encodeURIComponent(`\n\n---\n${m.name || ''} <${m.email}> (${when(m.at)}):\n${m.msg}`);
      main.innerHTML = `
        <div class="tools"><button class="btn sm ${f === 'open' ? 'primary' : ''}" data-f="open">${L('Chưa xử lý')}</button><button class="btn sm ${f === 'all' ? 'primary' : ''}" data-f="all">${L('Tất cả')}</button><span class="small muted">${L('Tin nhắn từ form Liên hệ (#/contact) · bản sao được chuyển vào support@lexkite.com')}</span></div>
        ${r.rows.map(m => `<div class="card" style="margin-bottom:.8rem;${m.handled ? 'opacity:.6' : ''}"><div class="row between" style="gap:.5rem;flex-wrap:wrap"><b>${esc(m.name || L('(không tên)'))} &lt;${esc(m.email)}&gt;</b><span class="small muted">${when(m.at)} · ${esc(m.lang)} · #${m.id}${m.sent ? '' : L(' · ⚠️ chưa chuyển vào Gmail')}</span></div>
          <p class="msg">${esc(m.msg)}</p><div class="tools" style="margin:0"><a class="btn primary sm" target="_blank" rel="noopener" href="${gmail(m)}">${L('Trả lời bằng Gmail')}</a><a class="btn sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: Lexkite')}">${L('Ứng dụng email')}</a><button class="btn ghost sm" data-id="${m.id}" data-h="${m.handled ? 0 : 1}">${m.handled ? L('Mở lại') : L('✓ Đã xử lý')}</button></div></div>`).join('') || `<div class="card muted">${L('Không có tin nhắn.')}</div>`}`;
      main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { sessionStorage.setItem('adm.inbox', b.dataset.f); show('inbox'); });
      main.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => { await api('inboxMark', { id: +b.dataset.id, handled: +b.dataset.h }); badges(); show('inbox'); });
    },
    async alerts() {
      const [a, e, lg] = await Promise.all([api('alerts'), api('errors'), api('auditLog').catch(() => ({ rows: [] }))]);
      main.innerHTML = `
        <div class="card"><h3>${L('Trạng thái tự động')}</h3><table class="tbl">${a.rows.map(r => `<tr><td><span class="dot ${r.ok ? (r.warn ? 'warn' : '') : 'bad'}"></span>${esc(r.name)}</td><td>${esc(r.conclusion || r.status || '')}</td><td class="small muted">${r.at ? when(r.at) : ''}</td><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${L('Xem')}</a>` : ''}</td></tr>`).join('')}</table>
        <p class="small muted">${L('Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.')}</p></div>
        <div class="card" style="margin-top:1rem"><div class="row between"><h3>${L('Lỗi JavaScript từ người dùng')}</h3>${e.rows.length ? `<button class="btn ghost sm" id="eclr">${L('Xóa tất cả')}</button>` : ''}</div>
        <div class="tbl-wrap"><table class="tbl"><tr><th>${L('Lỗi')}</th><th>${L('Vị trí')}</th><th>${L('Trang')}</th><th>${L('Số lần')}</th><th>${L('Gần nhất')}</th><th></th></tr>${e.rows.map(x => `<tr><td class="msg">${esc(x.msg)}</td><td class="small">${esc(x.src)}</td><td>${esc(x.path)}</td><td>${num(x.n)}</td><td class="small">${when(x.last)}</td><td><button class="btn ghost sm" data-h="${x.h}">${L('Đã sửa')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted">${L('Không có lỗi 🎉')}</td></tr>`}</table></div></div>`;
      main.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:1rem"><h3>${L('🔐 Nhật ký quản trị (100 thao tác gần nhất)')}</h3><p class="small muted">${L('Mọi thao tác ghi/xóa và mọi lần tài khoản lạ cố vào trang quản trị (dòng đỏ). IP được băm, không lưu IP gốc.')}</p>
        <div class="tbl-wrap"><table class="tbl"><tr><th>${L('Lúc')}</th><th>Email</th><th>${L('Thao tác')}</th><th>${L('IP (băm)')}</th><th>${L('Nước')}</th></tr>${lg.rows.map(x => `<tr${x.ok ? '' : ' style="color:var(--bad,#dc2626);font-weight:600"'}><td class="small">${when(x.at)}</td><td class="small">${esc(x.email)}</td><td>${x.ok ? esc(x.op) : L('⛔ bị từ chối')}</td><td class="small muted">${esc(x.ip)}</td><td>${esc(x.country)}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${L('Chưa có thao tác')}</td></tr>`}</table></div></div>`);
      if ($('#eclr')) $('#eclr').onclick = async () => { if (confirm(L('Xóa toàn bộ nhật ký lỗi?'))) { await api('errorsClear'); show('alerts'); } };
      main.querySelectorAll('[data-h]').forEach(b => b.onclick = async () => { await api('errorsClear', { h: b.dataset.h }); show('alerts'); });
    },
    async quality() {
      const q = await api('quality'), col = q.score == null ? '' : q.score >= q.standard ? 'var(--good,#15803d)' : 'var(--bad,#dc2626)';
      main.innerHTML = `
        <div class="kpis"><div class="card kpi"><div class="l">${L('Điểm chất lượng (lượt rà soát gần nhất)')}</div><div class="v" style="color:${col}">${q.score == null ? '–' : q.score + '%'}</div><div class="s">${L('Chuẩn: {s}% · {t}', { s: q.standard, t: q.at ? when(q.at) : L('chưa chạy') })}</div></div>
          <div class="card kpi"><div class="l">${L('14 lượt gần nhất')}</div><div class="v" style="font-size:1.1rem;letter-spacing:2px">${q.history.map(h => `<a href="${esc(h.url)}" target="_blank" rel="noopener" title="${when(h.at)}">${h.ok ? '🟢' : '🔴'}</a>`).join('') || '–'}</div><div class="s">${L('{a}/{b} lượt đạt', { a: q.history.filter(h => h.ok).length, b: q.history.length })}</div></div></div>
        <div class="card"><h3>${q.score >= q.standard ? L('✅ Đạt chuẩn') : L('⚠️ Dưới chuẩn – cần xử lý')}</h3><table class="tbl">${q.checks.map(c => `<tr><td><span class="dot ${c.ok ? '' : 'bad'}"></span>${esc(c.name)}</td><td>${c.ok ? L('Đạt') : `<b>${L('Không đạt')}</b>`}</td></tr>`).join('')}</table>
        ${q.url ? `<p class="small"><a href="${esc(q.url)}" target="_blank" rel="noopener">${L('Xem chi tiết lượt rà soát →')}</a></p>` : ''}
        <div id="bcBox" style="margin-top:1rem"></div>
        <p class="small muted">${L('Rà soát tự động mỗi ngày 7h sáng: kiểm thử đầy đủ (chính tả, đa ngôn ngữ 14 thứ tiếng, thuật toán FSRS & đồng bộ, giao diện, trợ năng WCAG, lời giải đề thi, liên kết), kiểm tra kiểu, cú pháp workflow, bản live (trang, API, dữ liệu, âm thanh, phiên bản). Không đạt → email cảnh báo 8h sáng.')}</p></div>`;
      // Kiểm nghĩa bản dịch: dịch ngược (tự động sau mỗi lượt dịch) → câu nghi sai → AI xác nhận (bấm nút, gói AI miễn phí)
      const bc = await fetch('/i18n/backcheck.json?x=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null);
      if (bc && bc.langs) {
        $('#bcBox').innerHTML = `<h3>${L('🌐 Kiểm nghĩa bản dịch (dịch ngược + AI)')}</h3><p class="small muted">${L('Cập nhật {t} · "khớp nghĩa" = tỉ lệ câu dịch ngược về tiếng Anh vẫn đúng ý. <b>Duyệt bằng AI</b>: Gemini (xoay vòng các khóa) → hết lượt tự chuyển Cloudflare AI; mỗi lần ≤ 60 câu, bấm tiếp để duyệt phần còn lại.', { t: when(bc.at) })}</p>
          <table class="tbl"><tr><th>${L('Ngôn ngữ')}</th><th>${L('Số câu')}</th><th>${L('Khớp nghĩa')}</th><th>${L('Nghi sai')}</th><th></th></tr>${Object.entries(bc.langs).map(([l, x]) => `<tr><td><b>${esc(l)}</b></td><td>${num(x.checked)}</td><td>${x.ok}%</td><td>${x.flagged.length}</td><td><button class="btn sm primary" data-rev="${esc(l)}">${L('✨ Duyệt bằng AI')}</button></td></tr>`).join('')}</table><div id="bcRes"></div>`;
        main.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => {
          b.disabled = true; const old = b.textContent; b.textContent = L('⏳ Đang duyệt…');
          let r; try { r = await api('review', { lang: b.dataset.rev }); } catch (e) { r = { error: e.message }; }
          b.disabled = false; b.textContent = old;
          if (r.error) { $('#bcRes').innerHTML = `<p class="small bad-t">✗ ${esc(r.error)}</p>`; return; }
          $('#bcRes').innerHTML = `<div class="rev-head"><b>${esc(r.lang)}</b> · ${L('đã duyệt {a}/{b} câu nghi sai', { a: r.reviewed, b: r.total })}${r.pending ? L(' · còn {n} (bấm lại để duyệt tiếp)', { n: r.pending }) : L(' · ✅ xong')} · <b class="${r.wrong.length ? 'bad-t' : 'ok-t'}">${L('{n} câu sai nghĩa', { n: r.wrong.length })}</b>${r.models.length ? ` <span class="pill">${esc(r.models.join(' + '))}</span>` : ''} ${r.wrong.some(w => w.fix) ? `<button class="btn sm primary" id="gAll">${L('Áp dụng tất cả')}</button>` : ''}</div>
            <div class="tbl-wrap"><table class="tbl"><tr><th>${L('Tiếng Anh')}</th><th>${L('Bản dịch hiện tại')}</th><th>${L('AI đề xuất')}</th><th>${L('Lý do')}</th><th></th></tr>${r.wrong.map((w, i) => `<tr><td class="small">${esc(w.en)}</td><td class="small">${esc(w.tr)}</td><td class="small"><b>${esc(w.fix || '')}</b></td><td class="small">${esc(w.why || '')}</td><td>${w.fix ? `<button class="btn sm" data-ap="${i}">${L('Áp dụng')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="5">${L('✅ Không có câu sai')}</td></tr>`}</table></div>
            <p class="small muted">${L('Bản sửa đã áp dụng sẽ tự cập nhật vào app ở lượt dịch đêm.')}</p>`;
          const ap = async i => { const w = r.wrong[i]; if (!w.fix) return; await api('i18nFixApprove', { lang: r.lang, key: w.key, val: w.fix }); const bt = main.querySelector(`[data-ap="${i}"]`); if (bt) { bt.disabled = true; bt.textContent = L('✓ Đã duyệt'); } };
          main.querySelectorAll('[data-ap]').forEach(x => x.onclick = () => ap(+x.dataset.ap));
          if ($('#gAll')) $('#gAll').onclick = async () => { $('#gAll').disabled = true; for (let i = 0; i < r.wrong.length; i++) await ap(i); $('#gAll').textContent = L('✓ Đã duyệt tất cả'); };
        });
      }
    },
    async services() {
      const T = (r, k) => { if (LANG !== 'en') return r[k] || ''; try { const e = JSON.parse(r.i18n || '{}'); return e[k] || r[k] || ''; } catch (x) { return r[k] || ''; } }; // dữ liệu dịch vụ theo ngôn ngữ quản trị (cột i18n JSON)
      const [u, s, gk] = await Promise.all([api('usage'), api('services'), api('geminiStatus').catch(() => ({}))]);
      // Nhóm & trạng thái để quản lý trực quan: thẻ theo nhóm, lọc nhanh, tìm kiếm (regex khớp dữ liệu dịch vụ – không phải chữ giao diện)
      const GROUPS = [['infra', '☁️ Hạ tầng & dữ liệu', /cloudflare (pages|d1|email)|tên miền|github|firebase/i], ['ai', '🤖 AI & dịch', /workers ai|gemini|translate|claude/i], ['grow', '📈 Phát hành & tăng trưởng', /search console|admob|apple|play|chrome web store/i]];
      const groupOf = r => (GROUPS.find(g => g[2].test(r.name)) || ['other', '🧩 Khác'])[0];
      const state = r => (/gemini/i.test(r.name) ? (gk.set ? 'on' : 'todo') : /chưa đăng ký|chưa tạo/i.test(r.status + r.account) ? 'todo' : /chưa dùng/i.test(r.status) ? 'idle' : 'on'); // dịch vụ có khóa: trạng thái theo khóa thực tế
      const PILL = { on: ['ok', 'Đang dùng'], idle: ['muted', 'Chưa dùng'], todo: ['warn', 'Chưa thiết lập'] };
      const keyed = r => /gemini/i.test(r.name);
      const warnMeters = u.meters.filter(m => m.pct >= 70).length, cnt = k => s.rows.filter(r => state(r) === k).length;
      main.innerHTML = `
        <div class="kpis">
          <div class="card kpi"><div class="l">${L('Dịch vụ')}</div><div class="v">${s.rows.length}</div><div class="s">${L('trong hệ thống')}</div></div>
          <div class="card kpi"><div class="l">${L('Đang dùng')}</div><div class="v" style="color:#15803d">${cnt('on')}</div><div class="s">${L('hoạt động bình thường')}</div></div>
          <div class="card kpi"><div class="l">${L('Chưa thiết lập')}</div><div class="v" style="color:#b45309">${cnt('todo') + cnt('idle')}</div><div class="s">${L('cần đăng ký / thêm khóa')}</div></div>
          <div class="card kpi"><div class="l">${L('Hạn mức sắp đầy')}</div><div class="v" style="color:${warnMeters ? '#dc2626' : 'inherit'}">${warnMeters}</div><div class="s">${L('≥ 70% gói miễn phí')}</div></div>
        </div>
        <details class="card svc-usage" ${warnMeters ? 'open' : ''}><summary><b>${L('📊 Dung lượng & hạn mức miễn phí')}</b> <span class="small muted">${L('· vàng ≥ 70%, đỏ ≥ 90%')}</span></summary>${u.meters.map(m => `<div class="meter ${m.pct >= 90 ? 'crit' : m.pct >= 70 ? 'warn' : ''}"><div class="row between small"><b>${esc(m.name)}</b><span>${m.unit === 'bytes' ? (m.used / 1048576).toFixed(1) + ' / ' + (m.cap / 1048576).toFixed(0) + ' MB' : num(m.used) + ' / ' + num(m.cap)} · <b>${m.pct}%</b></span></div><div class="bar"><i style="width:${Math.min(100, m.pct)}%"></i></div>${m.hint ? `<div class="tiny muted">${esc(m.hint)}</div>` : ''}</div>`).join('')}</details>
        <div class="svc-tools"><input type="search" id="sq" placeholder="${L('🔎 Tìm dịch vụ, tài khoản…')}" aria-label="${L('Tìm dịch vụ')}"><div class="svc-chips" role="tablist">${[['all', 'Tất cả'], ['on', 'Đang dùng'], ['todo', 'Chưa thiết lập']].map(([k, l], i) => `<button type="button" class="chip-f ${i ? '' : 'on'}" data-f="${k}">${L(l)}</button>`).join('')}</div><button class="btn primary sm" id="sadd">${L('+ Thêm dịch vụ')}</button></div>
        <div id="svcList"></div>`;
      const card = r => { const st = state(r), [pc, pl] = PILL[st]; return `<article class="svc-card" data-st="${st}" data-q="${esc((r.name + ' ' + r.account + ' ' + r.purpose).toLowerCase())}">
          <header><div class="svc-name"><b>${esc(T(r, 'name'))}</b><span class="pill ${pc}">${L(pl)}</span>${keyed(r) ? (gk.set ? `<span class="pill ok">${L('🔑 {n} khóa', { n: (gk.keys || []).length })}</span>` : `<span class="pill warn">${L('🔑 chưa có khóa')}</span>`) : ''}</div>
            <button class="icon-btn-s" data-sid="${r.id}" title="${L('Sửa')}" aria-label="${L('Sửa {n}', { n: esc(T(r, 'name')) })}">✎</button></header>
          ${r.purpose ? `<p class="svc-purpose">${esc(T(r, 'purpose'))}</p>` : ''}
          <dl class="svc-meta">${r.account ? `<div><dt>👤</dt><dd>${esc(T(r, 'account'))}</dd></div>` : ''}${r.free ? `<div><dt>🎁</dt><dd>${esc(T(r, 'free'))}</dd></div>` : ''}${r.secret && !keyed(r) ? `<div><dt>🔐</dt><dd><code>${esc(T(r, 'secret'))}</code></dd></div>` : ''}</dl>
          ${r.note ? `<p class="svc-note">${esc(T(r, 'note'))}</p>` : ''}
          <footer>${keyed(r) ? `<button class="btn sm ${gk.set ? '' : 'primary'}" data-key="gemini">🔑 ${gk.set ? L('Quản lý khóa') : L('Thêm khóa')}</button>` : ''}${r.console ? `<a class="btn sm ${keyed(r) && !gk.set ? '' : 'primary'}" target="_blank" rel="noopener" href="${esc(r.console)}">${L('Mở trang quản lý ↗')}</a>` : ''}${r.billing ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(r.billing)}">${L('Nâng gói')}</a>` : ''}</footer></article>`; };
      $('#svcList').innerHTML = [...GROUPS, ['other', '🧩 Khác']].map(([g, title]) => { const rows = s.rows.filter(r => groupOf(r) === g); return rows.length ? `<section class="svc-group"><h3>${L(title)} <span class="muted small">${rows.length}</span></h3><div class="svc-grid">${rows.map(card).join('')}</div></section>` : ''; }).join('');
      let f = 'all';
      const apply = () => { const q = $('#sq').value.trim().toLowerCase(); main.querySelectorAll('.svc-card').forEach(c => { c.hidden = !((f === 'all' || (f === 'todo' ? c.dataset.st !== 'on' : c.dataset.st === f)) && (!q || c.dataset.q.includes(q))); }); main.querySelectorAll('.svc-group').forEach(gp => { gp.hidden = ![...gp.querySelectorAll('.svc-card')].some(c => !c.hidden); }); };
      $('#sq').oninput = apply;
      main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f = b.dataset.f; main.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); apply(); });
      // Sửa/thêm dịch vụ trong hộp thoại (không đẩy form xuống cuối trang)
      const form = (r = {}) => {
        const d = document.createElement('dialog'); d.className = 'key-dlg';
        d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><h3 style="margin:0">${r.id ? L('Sửa dịch vụ') : L('Thêm dịch vụ')}</h3><button class="icon-x" value="x" aria-label="${L('Đóng')}">✕</button></div>
          <div class="svc-form">${[['name', 'Tên dịch vụ *'], ['purpose', 'Dùng cho'], ['account', 'Tài khoản / email'], ['status', 'Trạng thái'], ['console', 'Link trang quản lý'], ['billing', 'Link nâng gói'], ['free', 'Gói miễn phí / giới hạn'], ['secret', 'Tên biến khóa (không ghi giá trị)'], ['note', 'Ghi chú']].map(([k, l]) => `<label class="${/note|purpose|free/.test(k) ? 'wide' : ''}">${L(l)}<input name="${k}" value="${esc(r[k] || '')}" ${k === 'name' ? 'required' : ''}></label>`).join('')}</div>
          <div class="row between" style="margin-top:1rem">${r.id ? `<button type="button" class="btn ghost sm danger" id="sdel">${L('Xóa dịch vụ')}</button>` : '<span></span>'}<span class="row" style="gap:.5rem"><button class="btn ghost" value="x">${L('Hủy')}</button><button type="button" class="btn primary" id="ssave">${L('Lưu')}</button></span></div></form>`;
        document.body.appendChild(d); d.showModal(); d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); });
        d.querySelector('#ssave').onclick = async () => { const row = { id: r.id }; d.querySelectorAll('input[name]').forEach(i => row[i.name] = i.value.trim()); if (!row.name) return d.querySelector('[name=name]').focus(); if (/\b(sk-|AIza|AQ\.|ghp_|xox|-----BEGIN)/.test(row.secret + row.note)) return alert(L('Không lưu giá trị khóa ở đây – chỉ ghi tên biến.')); await api('serviceSet', { row }); d.close(); show('services'); };
        const del = d.querySelector('#sdel'); if (del) del.onclick = async () => { if (confirm(L('Xóa dịch vụ này khỏi danh sách?'))) { await api('serviceDelete', { id: r.id }); d.close(); show('services'); } };
      };
      $('#sadd').onclick = () => form();
      main.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => form(s.rows.find(x => x.id === +b.dataset.sid)));
      main.querySelectorAll('[data-key]').forEach(b => b.onclick = () => keyDialog(gk, () => show('services')));
    },
    async social() {
      main.innerHTML = '';
      if (!window.AdminSocial) await new Promise((y, n) => { const sc = document.createElement('script'); sc.src = 'js/admin-social.js'; sc.onload = y; sc.onerror = n; document.head.appendChild(sc); }); // tải lười – chỉ khi mở tab
      AdminSocial.render(main, sapi, L, { esc, num, when, lang: () => LANG }); // js/admin-social.js
    },
    async studio() {
      main.innerHTML = '';
      if (!window.AdminStudio) await new Promise((y, n) => { const sc = document.createElement('script'); sc.src = 'js/admin-studio.js'; sc.onload = y; sc.onerror = n; document.head.appendChild(sc); }); // tải lười – chỉ khi mở tab
      AdminStudio.render(main, stapi, sapi, L, { esc, lang: () => LANG }); // js/admin-studio.js
    },
    async settings() {
      const c = await api('config'), v = k => esc((c.values[k] || {}).v || '');
      const LBL = { banner: 'Thông báo đầu trang (để trống = tắt)', banner_url: 'Link kèm thông báo (https://…)', banner_level: 'Kiểu thông báo: info / warn / ok', ai_user: 'Lượt chấm AI/ngày – đã đăng nhập (mặc định 5)', ai_anon: 'Lượt chấm AI/ngày – khách (mặc định 3)', ai_global: 'Trần AI toàn hệ thống/ngày (mặc định 400)', alert_errors: 'Ngưỡng cảnh báo lỗi JS/24h (mặc định 50)', hit_rate: 'Tỉ lệ lấy mẫu thống kê 0.01–1 (mặc định 1 = mọi người; > 30k người/ngày nên đặt 0.1 để giữ D1 miễn phí)', note: 'Ghi chú nội bộ cho quản trị' };
      main.innerHTML = `<div class="card"><h3>${L('Cài đặt website')}</h3><div class="form2">${c.keys.map(k => `<label>${LBL[k] ? L(LBL[k]) : k}${k === 'banner' || k === 'note' ? `<textarea name="${k}" rows="2">${v(k)}</textarea>` : `<input name="${k}" value="${v(k)}">`}<span class="small muted" style="font-weight:400">${c.values[k] ? L('Sửa {t} bởi {b}', { t: when(c.values[k].at), b: esc(c.values[k].by) }) : ''}</span></label>`).join('')}</div>
        <div class="tools" style="margin-top:1rem"><button class="btn primary" id="csave">${L('Lưu cài đặt')}</button><span class="small muted" id="cmsg">${L('Thông báo hiện trên web/app sau tối đa 1 giờ.')}</span></div></div>`;
      // Gemini API: nhiều khóa xoay vòng – quản lý trong hộp thoại dùng chung
      const g = await api('geminiStatus');
      main.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:1rem"><div class="row between"><div><h3 style="margin:0">✨ Gemini API</h3><p class="small muted" style="margin:.3rem 0 0">${g.set ? L('{a} khóa xoay vòng · {b} sẵn sàng', { a: g.keys.length, b: g.keys.filter(k => !k.cooling).length }) : L('Chưa có khóa – AI đang dùng Cloudflare Workers AI')}${L(' · dùng cho chấm bài viết/nói & duyệt bản dịch')}</p></div><button class="btn primary" id="gman">🔑 ${g.set ? L('Quản lý khóa') : L('Thêm khóa')}</button></div></div>`);
      $('#gman').onclick = () => keyDialog(g, () => show('settings'));
      $('#csave').onclick = async () => { const values = {}; main.querySelectorAll('[name]').forEach(i => values[i.name] = i.value.trim()); await api('configSet', { values }); $('#cmsg').textContent = L('✓ Đã lưu'); };
    },
  };
})();
