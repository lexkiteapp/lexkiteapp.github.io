/* Quản trị → Video & Social: các mục quản lý (tải lười từ admin-social.js) – Duyệt bài (kanban), Hàng đợi tự động, Sức khỏe kênh,
 * Phân tích, Bình luận; cùng bộ chọn clip Lexkite đã duyệt, gợi ý AI, bộ kênh cho trình soạn.
 * Máy chủ: /api/social path "lk/…" (functions/api/_social_mgr.js). GrabCast giữ lịch & tự đăng nền (máy tắt vẫn đăng);
 * Lexkite là nguồn sự thật cho duyệt/luật/lịch – KHÔNG bài nào công khai khi chưa duyệt (máy chủ chặn).
 * AdminSocialMgr.paint(tab, el, ctx) · pickClip(ctx) · aiSuggest(ctx, input) · setsBar(el, ctx, get, set)
 * ctx = { sapi, L, esc, lang, D, accById, modal, both, errText, alive, LS } */
(function () {
  const GC_ACC = 'https://grabcast.click/scheduler.html#accounts', WS = '4';
  const EN = {
    '💡 Ý tưởng': '💡 Idea', '📝 Nháp': '📝 Draft', '👀 Chờ duyệt': '👀 In review', '✅ Đã duyệt': '✅ Approved', '🕒 Đã lên lịch': '🕒 Scheduled', '🚀 Đã đăng': '🚀 Published', '⚠️ Lỗi': '⚠️ Failed',
    'Không bài nào công khai khi chưa duyệt. GrabCast giữ lịch và tự đăng nền khi tới giờ (máy anh tắt vẫn đăng).': 'Nothing goes public without approval. GrabCast keeps the schedule and posts in the background (even when your computer is off).',
    '＋ Ý tưởng': '＋ Idea', 'Tiêu đề': 'Title', 'Ghi chú': 'Note', 'Lưu': 'Save', 'Đóng': 'Close', 'Hủy': 'Cancel', 'Xóa': 'Delete', 'Đang tải…': 'Loading…', '🔄 Tải lại': '🔄 Reload',
    'Duyệt & lên lịch': 'Approve & schedule', 'Duyệt & đăng ngay': 'Approve & publish now', 'Chỉ duyệt': 'Approve only', 'Trả về nháp': 'Back to draft', 'Gửi duyệt': 'Send for review', 'Xem ↗': 'View ↗',
    'Duyệt bài “{t}” và lên lịch đăng lên {n} kênh lúc {d}? GrabCast sẽ tự đăng đúng giờ.': 'Approve “{t}” and schedule it on {n} channels for {d}? GrabCast posts it at that time.',
    'Duyệt bài “{t}” và ĐĂNG NGAY lên {n} kênh? Bài sẽ công khai ngay.': 'Approve “{t}” and PUBLISH NOW on {n} channels? It goes public immediately.',
    'Xóa mục “{t}” khỏi bảng?': 'Remove “{t}” from the board?', 'Chuyển “{t}” sang {s}?': 'Move “{t}” to {s}?',
    'Nội dung đã bị sửa trên GrabCast sau khi duyệt – hãy hủy lịch rồi duyệt lại.': 'The content was edited on GrabCast after approval – unschedule it and approve again.',
    'Bài được lên lịch ngoài Lexkite khi chưa duyệt.': 'This post was scheduled outside Lexkite without approval.', 'Nội dung đã đổi sau khi duyệt – cần duyệt lại.': 'Content changed after approval – needs re-approval.',
    'Trống': 'Empty', 'Xem thêm {n}': 'Show {n} more', 'Duyệt bởi {w}': 'Approved by {w}', '✓ Xong': '✓ Done', '✗ {e}': '✗ {e}', 'Giờ đăng chưa chọn hoặc đã qua – mở bài ở tab Bài đăng để chọn giờ.': 'No publish time or it is in the past – open the post in the Posts tab to pick a time.',
    'Nhân bản / đăng lại': 'Duplicate / repost', 'Đặt giờ': 'Set time', 'Chép link duyệt': 'Copy review link', 'Nhân bản “{t}” thành bài nháp mới (phải duyệt lại)?': 'Duplicate “{t}” as a new draft (needs approval again)?',
    'Giờ đăng (giờ máy bạn), dạng 2026-10-30 19:00': 'Publish time (your local time), e.g. 2026-10-30 19:00', 'Giờ không hợp lệ.': 'Invalid time.', '✓ Đã chép link duyệt (chỉ quản trị viên mở được): {u}': '✓ Review link copied (admins only): {u}',
    'Mỗi dòng: clip_id,kênh1;kênh2,2026-10-30T19:00 (giờ máy bạn). Dán được từ Google Sheets.': 'One per line: clip_id,channel1;channel2,2026-10-30T19:00 (your local time). Pasting from Google Sheets works.', '⬇️ Xuất báo cáo CSV': '⬇️ Export report CSV',
    // Autopilot
    'Lượt Meta API còn hôm nay {n}': 'Meta API calls left today {n}', 'Loại': 'Type', 'Meta (dự phòng): chưa có token kênh nào – thêm token cho từng kênh FB/IG ở dưới (docs/DISTRIBUTION.md §6b).': 'Meta (fallback): no channel token yet – add a token per FB/IG channel below (docs/DISTRIBUTION.md §6b).',
    '＋ Thêm / đổi token kênh': '＋ Add / change channel token', 'Máy chủ thiếu KEYS_ENC_KEY – không lưu token được.': 'The server has no KEYS_ENC_KEY – tokens cannot be saved.',
    'FB: Page token không hết hạn (tài khoản giữ Page là Tester của app Lexkite) + Page ID. IG: token Instagram Login (tự refresh trước khi hết 60 ngày). Token được kiểm bằng 1 lượt gọi Meta rồi lưu mã hóa, không hiện lại.': 'FB: a never-expiring Page token (the account holding the Page is a Tester of the Lexkite app) + Page ID. IG: an Instagram Login token (refreshed automatically before its 60 days run out). The token is checked with one Meta call, then stored encrypted and never shown again.',
    '🔗 Kết nối Facebook': '🔗 Connect Facebook', '🔗 Kết nối Instagram': '🔗 Connect Instagram', '🔗 Kết nối lại': '🔗 Reconnect',
    'Kết nối một chạm: bấm nút, đăng nhập đúng tài khoản giữ Page/IG (Tester của app Lexkite) rồi cho phép – token được lưu mã hóa, không phải chép gì.': 'One-tap connect: press the button, log in with the account that holds the Page/IG (a Tester of the Lexkite app) and allow – the token is stored encrypted, nothing to copy.',
    'Dán token tay (dự phòng)': 'Paste a token by hand (fallback)', '⚙️ App Meta (App Secret)': '⚙️ Meta app (App Secret)', 'App Secret đã có ({s})': 'App Secret set ({s})', 'Chưa có App Secret': 'No App Secret yet',
    'Dán App Secret 1 lần (Meta: Cài đặt ứng dụng › Thông tin cơ bản; Instagram: Instagram › Thiết lập API với đăng nhập Instagram). Lưu mã hóa, không hiện lại.': 'Paste the App Secret once (Meta: App settings › Basic; Instagram: Instagram › API setup with Instagram login). Stored encrypted, never shown again.',
    '💾 Lưu App Secret': '💾 Save App Secret', '✓ Đã lưu App Secret {k} (…{l})': '✓ App Secret saved for {k} (…{l})', 'Cần App Secret trước khi kết nối.': 'An App Secret is needed before connecting.',
    'Đang mở trang đăng nhập Meta…': 'Opening the Meta login page…', '✓ Đã kết nối {c}': '✓ Connected {c}', 'Chọn Page cho kênh {c}': 'Pick the Page for channel {c}', '✓ Chọn Page này': '✓ Use this Page',
    'Kết nối lỗi: {e}': 'Connection failed: {e}', 'Token kênh {c} cần kết nối lại – bấm 🔗 Kết nối lại.': 'Channel {c} token needs reconnecting – press 🔗 Reconnect.',
    'Phiên kết nối không hợp lệ hoặc đã hết hạn (10 phút) – bấm lại nút.': 'The connect session is invalid or expired (10 min) – press the button again.', 'Anh đã từ chối hoặc hủy đăng nhập.': 'Login was declined or cancelled.',
    'Thiếu quyền – cho phép đủ các quyền được hỏi rồi thử lại.': 'Permissions missing – allow every requested permission and try again.', 'Tài khoản này không quản lý Page nào có quyền đăng.': 'This account manages no Page it can post to.',
    'Page ID (chỉ FB)': 'Page ID (FB only)', '💾 Lưu token': '💾 Save token', '✓ Đã lưu token {n} (…{l})': '✓ Token saved for {n} (…{l})', 'Xóa token Meta của kênh {c}?': 'Delete the Meta token of channel {c}?', 'refresh lỗi': 'refresh failed',
    'Đường đăng FB/IG': 'FB/IG route', 'Đang dùng: {p}': 'In use: {p}', 'Lý do: {w}': 'Reason: {w}', 'từ {d}': 'since {d}', 'Chế độ': 'Mode',
    'Tự động (GrabCast lỗi → Meta)': 'Automatic (GrabCast down → Meta)', 'Luôn GrabCast': 'Always GrabCast', 'Luôn Meta (đăng thẳng)': 'Always Meta (direct)', '🔀 Chuyển': '🔀 Switch',
    'Chuyển đường đăng FB/IG sang “{m}”?': 'Switch the FB/IG route to “{m}”?', '✓ Đã chuyển đường đăng': '✓ Route switched',
            'chưa kiểm': 'not checked yet', 'hết hạn {d}': 'expires {d}', 'không hết hạn': 'never expires',
    '⛔ Meta tạm dừng tới {d} ({c}).': '⛔ Meta paused until {d} ({c}).',         'Đường': 'Route', 'Duyệt (Meta)': 'Approve (Meta)', 'Duyệt bài này để đăng qua Meta đúng giờ đã xếp?': 'Approve this post to publish via Meta at the planned time?', 'Mở ↗': 'Open ↗',
    'GrabCast trễ (chưa đăng sau giờ hẹn + 30 phút)': 'GrabCast late (not posted 30 min after the slot)', 'Khóa GrabCast sai/hết quyền': 'GrabCast key rejected', 'GrabCast quá tải / hết DB': 'GrabCast overloaded / database out',
    'GrabCast lỗi máy chủ lặp lại': 'GrabCast repeated server errors', 'bị thu hồi': 'revoked', 'sắp hết hạn': 'expiring soon', 'quyền dữ liệu sắp hết hạn': 'data access expiring soon', 'thiếu quyền': 'missing permission', 'lỗi kiểm': 'check failed', 'Chuyển tay': 'Manual switch', 'Meta chưa cấu hình': 'Meta not configured',
    '🛰️ Autopilot đăng social': '🛰️ Social autopilot', 'Chạy nền trên máy chủ mỗi 2 giờ (máy anh tắt vẫn chạy): lấy bài đến hạn trong lịch Kênh & phân phối, tạo bài trên GrabCast và lên lịch đúng giờ – GrabCast tự đăng khi tới giờ.': 'Runs in the background on the server every 2 hours (even when your computer is off): takes due posts from the Channels & distribution plan, creates them on GrabCast and schedules them – GrabCast publishes at that time.',
    'Bật autopilot (công tắc khẩn: tắt = dừng mọi lượt gọi GrabCast)': 'Autopilot on (kill switch: off = no GrabCast calls at all)', 'Tự động duyệt': 'Auto-approve', 'Duyệt tay trước (bài/nền tảng)': 'Manual approvals first (posts/platform)',
    'Tắt: mọi bài autopilot vào cột Chờ duyệt, anh duyệt tay (giữ đúng giờ đã xếp). Bật: chỉ nền tảng đã có đủ số bài duyệt tay mới tự lên lịch.': 'Off: every autopilot post goes to In review and you approve it (the planned time is kept). On: only platforms with enough manual approvals are scheduled automatically.',
    'Đã duyệt tay {m}/{n}': 'Manually approved {m}/{n}', 'chỉ bật khi app GrabCast được duyệt': 'turn on only once the GrabCast app is approved', 'Nền tảng tự đăng': 'Platforms',
    'Lần chạy cuối': 'Last run', 'Chưa chạy lần nào.': 'Has not run yet.', 'Đến hạn': 'Due', 'Đã tạo': 'Created', 'Đã lên lịch': 'Scheduled', 'Chờ duyệt': 'In review', 'Lượt GrabCast còn hôm nay': 'GrabCast calls left today',
    'Đang tắt': 'Off', 'Cầu dao đang mở': 'Breaker open', 'Thiếu khóa GrabCast': 'GrabCast key missing', 'Hết ngân sách hôm nay': 'Daily budget used up', 'Dừng: {c}': 'Stopped: {c}', 'Bình thường': 'OK',
    '⛔ Cầu dao mở tới {d} (mã {c}) – GrabCast trả lỗi nên autopilot đã dừng cả lượt, không thử lại.': '⛔ Breaker open until {d} (code {c}) – GrabCast returned an error, so the autopilot stopped the whole run and will not retry.',
    'Mở lại': 'Reset', 'Máy chủ chưa có khóa GrabCast (secret GRABCAST_API_KEY).': 'The server has no GrabCast key yet (secret GRABCAST_API_KEY).', 'Đồng bộ trạng thái': 'Status sync',
    '💾 Lưu cài đặt': '💾 Save settings', '▶️ Chạy ngay': '▶️ Run now', '✓ Đã lưu cài đặt': '✓ Settings saved', 'Chạy 1 lượt autopilot ngay (tính vào ngân sách GrabCast hôm nay)?': 'Run one autopilot pass now (counts towards today’s GrabCast budget)?',
    'Bật tự động duyệt? Bài autopilot sẽ được lên lịch công khai không cần anh duyệt – chỉ cho nền tảng đã có đủ bài duyệt tay.': 'Turn on auto-approve? Autopilot posts will be scheduled publicly without your approval – only on platforms that already have enough manual approvals.',
    'Sắp đăng (72 giờ)': 'Coming up (72 h)', 'Chưa có bài nào trong lịch – chạy “Lập lịch” ở Kênh & phân phối.': 'Nothing planned – run “Plan” in Channels & distribution.',
    'Đã xếp lịch': 'Planned', 'Đã đẩy lên GrabCast': 'Pushed to GrabCast', 'Đã đăng': 'Published', 'Lỗi': 'Failed', 'Đã hủy': 'Cancelled', 'Webhook GrabCast': 'GrabCast webhook', 'sẵn sàng': 'ready', 'chưa cấu hình': 'not configured',
    'Xong: tạo {c} · lên lịch {s} · chờ duyệt {r} · {n} lượt GrabCast': 'Done: {c} created · {s} scheduled · {r} in review · {n} GrabCast calls',
    // Bảng điều khiển: Kênh, tạm dừng, xem trước, duyệt bài đầu, nhật ký lỗi
    '📡 Kênh': '📡 Channels', '🔄 Làm mới kênh': '🔄 Refresh channels', '⏸ Tạm dừng toàn bộ': '⏸ Pause everything', '▶️ Chạy lại': '▶️ Resume', '⏸ Đang tạm dừng': '⏸ Paused',
    'Autopilot không tạo, không lên lịch bài nào cho tới khi anh bấm Chạy lại. Bài đã gỡ lịch nằm ở cột Chờ duyệt.': 'The autopilot creates and schedules nothing until you press Resume. Unscheduled posts wait in the In review column.',
    'Tạm dừng TOÀN BỘ autopilot?\n\n• Tắt autopilot: không tạo, không lên lịch bài mới.\n• Gỡ lịch các bài autopilot ĐÃ lên lịch trên GrabCast (tối đa 20 bài mỗi lần bấm) – bài về cột Chờ duyệt, KHÔNG bị xóa.\n• Bài anh tự soạn tay không bị đụng tới.\n\nBật lại bất cứ lúc nào bằng nút Chạy lại.': 'Pause the WHOLE autopilot?\n\n• Turns the autopilot off: no new posts are created or scheduled.\n• Unschedules autopilot posts ALREADY scheduled on GrabCast (up to 20 per click) – they go back to In review and are NOT deleted.\n• Posts you composed by hand are not touched.\n\nTurn it back on any time with Resume.',
    'Chạy lại autopilot? Lượt nền kế tiếp (mỗi 2 giờ) sẽ lấy bài đến hạn. Bài đã gỡ lịch nằm ở cột Chờ duyệt – anh duyệt lại để đăng.': 'Resume the autopilot? The next background run (every 2 hours) picks up due posts. Unscheduled posts are in In review – approve them again to publish.',
    '✓ Đã tạm dừng toàn bộ: gỡ lịch {u} bài · còn {l} bài chưa gỡ.': '✓ Everything paused: {u} posts unscheduled · {l} still scheduled.', 'Lỗi gỡ lịch: {e}': 'Unschedule errors: {e}', '⏸ Gỡ tiếp {n} bài': '⏸ Unschedule {n} more',
    '✓ Autopilot đã chạy lại.': '✓ Autopilot resumed.', 'Autopilot đang chạy': 'Autopilot running',
    'Đã nối {n}': ['{n} connected', '{n} connected'], 'Chưa kết nối': 'Not connected', 'Autopilot bật': 'Autopilot on', 'Autopilot tắt': 'Autopilot off', 'Chờ anh duyệt bài đầu': 'Waiting for your first-post approval',
    '✅ Duyệt bài đầu': '✅ Approve the first post', '✅ Mở để duyệt': '✅ Open to approve', 'Chưa có bài chờ duyệt – bài đầu tiên sẽ vào cột Chờ duyệt để anh duyệt.': 'No post waiting yet – the first one will land in In review for you to approve.',
    'Chưa có trang nào.': 'No pages yet.', 'chưa đồng bộ': 'not synced yet', 'Đã gỡ khỏi GrabCast': 'Removed from GrabCast', 'Ngôn ngữ trang: {l}': 'Page language: {l}',
    'Không nhận ra ngôn ngữ từ tên – coi là trang chung tiếng Anh. Đặt tên “Lexkite <ngôn ngữ>” để định tuyến đúng.': 'Language not recognised from the name – treated as the shared English page. Name it “Lexkite <language>” to route correctly.',
    'Token Meta hết hạn {d}': 'Meta token expires {d}', 'Token Meta không hết hạn': 'Meta token never expires', 'Token Meta cần kết nối lại': 'Meta token needs reconnecting', 'Meta tạm dừng': 'Meta paused',
    '🔗 Kết nối': '🔗 Connect', '📋 Hướng dẫn': '📋 Guide', 'Mở GrabCast ↗': 'Open GrabCast ↗', 'Kết nối {p} trên GrabCast': 'Connect {p} on GrabCast',
    'Bấm <b>Mở GrabCast</b> (cửa sổ riêng) và đăng nhập grabcast.click.': 'Press <b>Open GrabCast</b> (separate window) and sign in to grabcast.click.',
    'Chọn workspace <b>Lexkite (#{ws})</b> ở góc trên – bắt buộc, nếu không kênh sẽ vào workspace khác.': 'Pick the <b>Lexkite (#{ws})</b> workspace at the top – required, otherwise the channel lands in another workspace.',
    'Vào <b>Accounts</b> → bấm <b>Connect {p}</b>.': 'Go to <b>Accounts</b> → press <b>Connect {p}</b>.',
    'Đăng nhập Facebook bằng tài khoản quản trị các Page → tích đúng các Page Lexkite cần đăng.': 'Sign in to Facebook with the account that admins the Pages → tick exactly the Lexkite Pages to post to.',
    'Đăng nhập qua Facebook → chọn tài khoản Instagram Business/Creator đã liên kết với Page Lexkite cùng ngôn ngữ.': 'Sign in through Facebook → pick the Instagram Business/Creator account linked to the Lexkite Page of the same language.',
    'Đăng nhập TikTok của Lexkite → cho phép đăng video.': 'Sign in to Lexkite’s TikTok → allow video posting.', 'Đăng nhập Threads bằng tài khoản Instagram của Lexkite → cho phép đăng bài.': 'Sign in to Threads with Lexkite’s Instagram account → allow posting.',
    'Chỉ nối YouTube trên GrabCast khi GrabCast đã được YouTube duyệt – trước đó video bị khóa Riêng tư.': 'Only connect YouTube on GrabCast once YouTube has approved GrabCast – until then videos are locked Private.',
    'Đặt tên theo bộ 16 fanpage: <b>Lexkite</b> (tiếng Anh, trang chung) hoặc <b>Lexkite + tên ngôn ngữ</b>. Lexkite nhận ngôn ngữ từ tên để đăng đúng clip.': 'Name it per the 16-page set: <b>Lexkite</b> (English, shared page) or <b>Lexkite + language name</b>. Lexkite reads the language from the name to post the right clips.',
    'Cấp đủ quyền được hỏi → Lưu, rồi đóng cửa sổ GrabCast: bảng Kênh tự làm mới.': 'Grant every requested permission → Save, then close the GrabCast window: the Channels panel refreshes itself.',
    'Tên trang:': 'Page names:', '⏳ Đang chờ anh kết nối trong cửa sổ GrabCast… đóng cửa sổ khi xong, bảng tự làm mới.': '⏳ Waiting for you to connect in the GrabCast window… close it when done and this panel refreshes.',
    'Trình duyệt chặn cửa sổ bật lên – bấm Mở GrabCast trong hướng dẫn hoặc cho phép popup.': 'The browser blocked the popup – use Open GrabCast in the guide or allow popups.',
    'Đang làm mới kênh…': 'Refreshing channels…', '✓ Kênh mới: {s}': '✓ New channels: {s}', '✓ Đã làm mới – chưa thấy kênh mới.': '✓ Refreshed – no new channel yet.', 'Không đồng bộ được GrabCast ({e}) – hiện dữ liệu đã lưu.': 'Could not sync GrabCast ({e}) – showing saved data.',
    'Hết 15 phút chờ – bấm Làm mới kênh khi đã kết nối xong.': 'Stopped waiting after 15 minutes – press Refresh channels once you are done.',
    'Qua GrabCast: chờ GrabCast được YouTube duyệt': 'Via GrabCast: waiting for YouTube to approve GrabCast', 'Kênh YouTube trên GrabCast: {s}': 'YouTube channels on GrabCast: {s}',
    'Tự bật YouTube khi có kênh YouTube trên GrabCast (bài đầu vẫn chờ anh duyệt)': 'Turn YouTube on automatically once a GrabCast YouTube channel exists (the first post still waits for your approval)',
    '🎬 Trong lúc chờ: YouTube thủ công': '🎬 Meanwhile: YouTube by hand', 'Tab Video › Gói chờ đăng tay: tải gói, chép tiêu đề/mô tả/thẻ/hashtag/giờ hẹn, mở Studio.': 'Video tab › Manual upload packs: download the pack, copy title/description/tags/hashtags/schedule time, open Studio.',
    'Dự phòng: API YouTube trực tiếp': 'Fallback: direct YouTube API', '🔗 Kết nối API trực tiếp': '🔗 Connect the direct API', 'Kênh API: {s}': 'API channels: {s}',
    'Chỉ dùng khi thật cần: app chưa qua audit của Google nên video tải bằng API bị khóa Riêng tư và KHÔNG chuyển Công khai được (phải tải lại).': 'Only when really needed: the app has not passed Google’s audit, so API uploads are locked Private and CANNOT be made Public (they must be re-uploaded).',
    'Đang mở trang đăng nhập Google…': 'Opening the Google sign-in page…', 'Kết nối YouTube lỗi: {e}': 'YouTube connection failed: {e}',
    '👁 Xem trước': '👁 Preview', 'Xem trước': 'Preview', '👁 Xem trước: {c}': '👁 Preview: {c}', 'Chỉ xem trước – 0 lượt GrabCast, không đăng gì.': 'Preview only – 0 GrabCast calls, nothing is posted.',
    'Trang đích': 'Target page', 'Chưa có trang đích': 'No target page', 'chưa nối kênh': 'no channel connected', 'không có trang cùng ngôn ngữ ({l})': 'no page in the same language ({l})', 'Ngôn ngữ clip': 'Clip language',
    'Caption': 'Caption', 'Hashtag': 'Hashtags', 'Ảnh bìa': 'Cover', 'Vấn đề': 'Issues', 'Không có vấn đề.': 'No issues.',
    'Instagram: cover_url (đường Meta) – GrabCast chưa có tùy chọn bìa': 'Instagram: cover_url (Meta route) – GrabCast has no cover option yet', 'YouTube: đặt ảnh bìa qua API trực tiếp': 'YouTube: cover set through the direct API',
    'GrabCast chưa có tùy chọn ảnh bìa': 'GrabCast has no cover option yet', 'Clip không có ảnh bìa': 'The clip has no cover image',
    'Clip thiếu tiêu đề/điểm học – sẽ không đăng': 'The clip has no title/learning point – it will not be posted', 'Hashtag bị cắt khỏi caption': 'Hashtags were cut off the caption', 'Caption dài quá giới hạn nền tảng': 'The caption is over the platform limit',
    'Thiếu caption': 'No caption', 'Thiếu tiêu đề': 'No title', 'Số hashtag vượt giới hạn nền tảng': 'More hashtags than the platform allows', 'YouTube không nhận ký tự < >': 'YouTube rejects the < > characters',
    '🧾 Nhật ký lỗi': '🧾 Error log', 'Lỗi bền của autopilot (50 mục gần nhất) và lý do bỏ qua ở lượt chạy cuối – mới nhất ở trên.': 'Persistent autopilot errors (last 50) and the reasons posts were skipped in the last run – newest first.',
    'Lỗi gần đây': 'Recent errors', 'Chưa có lỗi nào.': 'No errors so far.', 'Lần chạy cuối bỏ qua': 'Skipped in the last run', 'Lần chạy cuối không bỏ qua bài nào.': 'The last run skipped nothing.',
    // lý do bỏ qua (state.last_run.skipped[].why)
    'Clip chưa được duyệt (hoặc đã bị loại/tạm dừng) – không đăng.': 'The clip is not approved (or was rejected/paused) – not posted.', 'Kênh không còn trên GrabCast – kết nối lại ở bảng Kênh.': 'The channel is gone from GrabCast – reconnect it in the Channels panel.',
    'Kênh cần kết nối lại trên GrabCast.': 'The channel needs reconnecting on GrabCast.', 'Kênh hết lượt đăng 24 giờ – để lượt sau.': 'The channel hit its 24 h posting limit – left for a later run.',
    'Nội dung không qua kiểm tra của nền tảng (độ dài/định dạng).': 'The content failed the platform checks (length/format).', 'Clip thiếu tiêu đề/điểm học – không đăng.': 'The clip has no title/learning point – not posted.',
    'Đang chờ anh duyệt.': 'Waiting for your approval.', 'Lỗi lặp lại 2 lần – dừng thử, chờ anh xem (nút Mở lại).': 'Failed twice – retries stopped until you check it (Reset button).', 'Bài đã có trên GrabCast – không tạo trùng.': 'The post already exists on GrabCast – no duplicate created.',
    'Bài này đang đi đường Meta.': 'This post is going through Meta.', 'Lỗi tự xếp lịch.': 'Automatic planning failed.', 'Lỗi tự duyệt clip.': 'Automatic clip approval failed.', 'Quá giờ đăng hơn 12 giờ – bỏ bài này.': 'More than 12 h past the slot – this post was dropped.',
    'Bài đang được xử lý ở lượt khác.': 'The post is being handled by another run.', 'Instagram đang xử lý video – lượt sau đăng tiếp.': 'Instagram is still processing the video – the next run continues.', 'Container Instagram hết hạn – tạo lại ở lượt sau.': 'The Instagram container expired – recreated next run.',
    'Instagram hết lượt đăng 24 giờ.': 'Instagram hit its 24 h posting limit.', 'Kênh chưa có token Meta.': 'The channel has no Meta token.', 'Kênh Meta đang tạm dừng (token/cầu dao).': 'The Meta channel is paused (token/breaker).',
    'Meta lỗi lặp lại – dừng thử, chờ anh xem.': 'Meta failed repeatedly – retries stopped until you check it.', 'Chờ tới giờ đăng (Meta).': 'Waiting for the slot (Meta).',
    'GrabCast không tạo được bài (mã {c}).': 'GrabCast could not create the post (code {c}).', 'Meta báo lỗi ({c}).': 'Meta returned an error ({c}).', 'GrabCast không đọc được bài (mã {c}).': 'GrabCast could not read the post (code {c}).',
    'GrabCast từ chối khi kiểm tra ({c}).': 'GrabCast rejected the post on validation ({c}).', 'Xung đột trạng thái trên GrabCast ({c}).': 'State conflict on GrabCast ({c}).', 'GrabCast không lên lịch được (mã {c}).': 'GrabCast could not schedule it (code {c}).', 'Lý do khác ({c}).': 'Other reason ({c}).',
    // loại lỗi trong nhật ký (state.log[].k)
    'Bài đăng lỗi': 'Post failed', 'Dừng thử lại': 'Retries stopped', 'Clip thiếu tiêu đề': 'Clip missing title', 'Chưa nối kênh': 'No channel connected', 'Chưa có clip duyệt': 'No approved clips', 'Lịch trống': 'Nothing planned',
    'Đăng trùng': 'Duplicate post', 'Kho không có clip mới': 'No new clips', 'Danh mục clip cũ': 'Clip manifest stale', 'Chuyển sang Meta': 'Switched to Meta', 'Đã hồi phục': 'Recovered', 'Khóa GrabCast lỗi': 'GrabCast key error', 'Token Meta': 'Meta token', 'Meta lỗi': 'Meta down',
    // Hàng đợi
    '🤖 Hàng đợi tự động': '🤖 Auto queue', 'Rải clip ĐÃ DUYỆT trong kho Lexkite vào khung giờ vàng từng kênh, theo trần/ngày, giãn cách và chống trùng. Kết quả là bài NHÁP chờ duyệt – không tự đăng.': 'Spread APPROVED Lexkite clips across each channel’s prime slots, respecting daily caps, spacing and duplicate rules. Results are DRAFTS awaiting approval – nothing auto-publishes.',
    'Luật chống spam': 'Anti-spam rules', 'Tối đa/ngày': 'Max/day', 'Giãn cách tối thiểu (giờ)': 'Minimum gap (hours)', 'Khung giờ (giờ địa phương của kênh)': 'Slots (channel local time)', 'Múi giờ mặc định': 'Default time zone',
    'Không lặp clip trên cùng kênh (ngày)': 'No repeat of a clip on a channel (days)', 'Số ngày lập kế hoạch': 'Days to plan', 'Bỏ thứ 7, CN': 'Skip weekends', '💾 Lưu luật': '💾 Save rules', 'Múi giờ': 'Time zone',
    '📋 Lập kế hoạch': '📋 Plan', 'Tạo {n} bài nháp & gửi duyệt': 'Create {n} drafts & send for review', 'Kênh': 'Channel', 'Clip': 'Clip', 'Giờ': 'Time', 'Trạng thái': 'Status',
    'Tạo {n} bài nháp trên GrabCast (đẩy video lên kho GrabCast) và đưa vào cột Chờ duyệt?': 'Create {n} draft posts on GrabCast (uploading the videos) and put them in In review?',
    'Bỏ qua: {d} trùng · {s} hết khung': 'Skipped: {d} duplicates · {s} no free slot', 'Chưa có clip đã duyệt nào cần xếp.': 'No approved clips left to place.', '✓ Đã lưu luật': '✓ Rules saved', 'Xong {ok}/{n}.': 'Done {ok}/{n}.',
    'Đây là trần riêng của Lexkite (chống spam), luôn thấp hơn trần nền tảng.': 'These are Lexkite’s own anti-spam caps, always below the platform limits.',
    // Sức khỏe
    '🩺 Sức khỏe kênh': '🩺 Channel health', 'Hoạt động': 'Healthy', 'Cần kết nối lại': 'Needs reconnect', 'Sắp hết hạn': 'Expiring soon', 'Gần trần 24 giờ': 'Near 24 h limit', 'Hết lượt 24 giờ': '24 h limit reached', 'Chỉ riêng tư (chờ duyệt app)': 'Private only (app in review)',
    'Tất cả nền tảng': 'All platforms', 'Mọi trạng thái': 'Any status', 'Nhóm theo': 'Group by', 'Không nhóm': 'No grouping', 'Nền tảng': 'Platform', 'Nhóm': 'Group', 'Sắp xếp': 'Sort', 'Tên': 'Name', 'Dùng 24 giờ': '24 h usage', 'Bài gần nhất': 'Last post',
    '24 giờ': '24 h', 'Hết hạn': 'Expires', 'Quyền': 'Permissions', 'đăng': 'publish', 'số liệu': 'insights', 'đọc bình luận': 'read comments', 'trả lời': 'reply', 'bình luận đầu': 'first comment', 'thiếu quyền: {s}': 'missing: {s}',
    'Workspace Lexkite (#{ws}) chưa có kênh nào.': 'The Lexkite workspace (#{ws}) has no channels yet.', 'Kết nối lại ↗': 'Reconnect ↗', '(chưa nhóm)': '(ungrouped)',
    'YouTube trên GrabCast đang “Riêng tư đến khi được duyệt”: bài lên ở chế độ private cho tới khi Google duyệt app GrabCast. TikTok đã được duyệt: bài lên công khai.': 'YouTube on GrabCast is “Private until review”: posts go up private until Google approves the GrabCast app. TikTok is approved: posts go up public.',
    '🔗 Kết nối kênh': '🔗 Connect channels', 'Kết nối Facebook & Instagram': 'Connect Facebook & Instagram', 'Kết nối TikTok': 'Connect TikTok', 'Kết nối YouTube': 'Connect YouTube', 'Kết nối Threads': 'Connect Threads',
    'Đăng nhập dùng app Meta đã được duyệt của GrabCast – Lexkite không cần app Meta riêng.': 'Sign-in uses GrabCast’s approved Meta app – Lexkite needs no Meta app of its own.',
    '⏳ Đang chờ kết nối trong cửa sổ GrabCast… (tự nhận kênh mới)': '⏳ Waiting for the connection in the GrabCast window… (new channels are detected automatically)',
    '✓ Đã thêm {n} kênh: {s}': ['✓ Added {n} channel: {s}', '✓ Added {n} channels: {s}'], 'Hết thời gian chờ – bấm Tải lại khi đã kết nối xong.': 'Timed out – press Reload once you are done connecting.',
    'Trình duyệt chặn cửa sổ bật lên – cho phép popup rồi bấm lại.': 'The browser blocked the popup – allow popups and click again.',
    'Việc anh cần làm (1 lần)': 'Your one-time steps', 'Trên GrabCast chọn workspace <b>Lexkite (#{ws})</b> ở góc trên (bắt buộc – nếu không kênh sẽ vào workspace khác).': 'On GrabCast pick the <b>Lexkite (#{ws})</b> workspace at the top (required – otherwise channels land in another workspace).',
    'Accounts → Facebook → đăng nhập Facebook bằng tài khoản quản trị Page Lexkite → tích <b>Page Lexkite</b> và <b>Instagram Lexkite</b> (IG phải là Business/Creator và đã liên kết Page).': 'Accounts → Facebook → sign in with the Facebook account that admins the Lexkite Page → tick the <b>Lexkite Page</b> and <b>Lexkite Instagram</b> (IG must be Business/Creator and linked to the Page).',
    'Cấp đủ quyền Meta đề nghị (đăng bài, số liệu, bình luận) → Lưu.': 'Grant all requested Meta permissions (publishing, insights, comments) → Save.',
    'Quay lại đây: kênh mới tự hiện trong bảng, cửa sổ GrabCast tự đóng.': 'Come back here: the new channels appear in the table and the GrabCast window closes itself.',
    // Phân tích
    '📈 Phân tích': '📈 Analytics', 'Lượt xem': 'Views', 'Thích': 'Likes', 'Bình luận': 'Comments', 'Lưu lại': 'Saves', 'Chia sẻ': 'Shares', 'Thời gian xem': 'Watch time', 'Tỉ lệ tương tác': 'Engagement rate',
    'Theo bài': 'By post', 'Theo kênh': 'By channel', 'Theo template': 'By template', 'Theo hook': 'By hook', 'Theo độ khó': 'By level', '🔄 Đồng bộ số liệu': '🔄 Sync metrics', '⬆️ Nhập CSV': '⬆️ Import CSV',
    'Trọng số tuần sau (đưa về thư viện)': 'Next week’s weights (fed back to the library)', 'Chưa có số liệu.': 'No metrics yet.', 'Nguồn': 'Source',
    'Khóa API GrabCast chưa được đọc số liệu (insights) – Lexkite lấy lượt xem web + số anh nhập; khi GrabCast mở quyền, nút Đồng bộ tự lấy.': 'The GrabCast API key cannot read insights yet – Lexkite uses web views + numbers you import; once GrabCast opens it, Sync pulls them automatically.',
    'Dán CSV: post_id,platform,views,likes,comments,saves,shares,watch_s': 'Paste CSV: post_id,platform,views,likes,comments,saves,shares,watch_s', 'Nhập': 'Import', '✓ Đã nhập {n} dòng': '✓ Imported {n} rows',
    '✓ Đồng bộ: {n} số liệu GrabCast, {w} clip web': '✓ Synced: {n} GrabCast metrics, {w} web clips', 'Trọng số': 'Weight', 'Nhóm/khóa': 'Key', 'Cảnh báo phân tích': 'Analytics alerts', 'Theo độ dài': 'By length', 'Theo giờ đăng': 'By post hour', '7 ngày': '7 days', 'Top 5': 'Top 5', 'Thấp nhất 5': 'Bottom 5', 'Bị gỡ/hạn chế': 'Removed/restricted',
    // Bình luận
    '💬 Bình luận': '💬 Comments', 'API GrabCast (khóa API) chưa cho đọc/trả lời bình luận – hộp thư chỉ dùng được khi đăng nhập grabcast.click. Lexkite liệt kê bài đã đăng để mở thẳng trên nền tảng.': 'The GrabCast API (API key) does not allow reading/replying to comments yet – the inbox only works signed in on grabcast.click. Lexkite lists published posts so you can open them on the platform.',
    'Mở hộp thư GrabCast ↗': 'Open the GrabCast inbox ↗', 'Chưa có bài đã đăng.': 'No published posts yet.',
    // Chọn clip, AI, bộ kênh
    '📚 Kho Lexkite (đã duyệt)': '📚 Lexkite library (approved)', 'Tìm clip…': 'Search clips…', 'Chưa có clip đã duyệt.': 'No approved clips yet.', 'đã dùng trên {n} kênh': 'used on {n} channels', 'Chọn': 'Pick',
    '✨ Gợi ý AI': '✨ AI suggestions', 'Hook gợi ý': 'Suggested hooks', 'Dùng caption này': 'Use this caption', 'Thêm hashtag': 'Add hashtags', 'Dùng làm bình luận đầu': 'Use as first comment', '⏳ AI đang viết…': '⏳ AI is writing…',
    // Bình luận đầu + click về web app (§6c)
    '💬 Bình luận đầu & click về web app (28 ngày)': '💬 First comment & clicks to the web app (28 days)',
    'Mỗi bài tối đa 1 bình luận của kênh mang link (FB, YouTube: bình luận · Threads: tự trả lời) – nội dung viết lúc sản xuất. Instagram/TikTok không bình luận link (không bấm được): caption ghi "link in bio". Không nền tảng nào có API ghim bình luận.': 'At most 1 channel comment with the link per post (FB, YouTube: comment · Threads: self-reply), written at production. Instagram/TikTok get no link comment (not clickable): the caption says "link in bio". No platform offers an API to pin comments.',
    'Bật bình luận đầu': 'First comment on', 'Tối đa/kênh/ngày': 'Max per channel per day', 'Click': 'Clicks', 'Từ bình luận': 'From comments', 'Từ link bio': 'From bio links',
    'Theo nền tảng': 'By platform', 'Clip nhiều click nhất': 'Top clips by clicks', 'Chưa có click nào.': 'No clicks yet.', 'Bài có bình luận đã duyệt tay {m}/{n}': 'Posts with a comment approved by hand {m}/{n}',
    'Bình luận đường Meta': 'Comments via Meta', 'Clip chưa có bình luận đầu (viết lúc sản xuất)': 'Clip has no first comment (written at production)', 'Bình luận đầu phải có đúng 1 chỗ {link}': 'First comment needs exactly one {link}', 'Bình luận đầu có link trần': 'First comment has a raw link', 'Bình luận đầu có hashtag/@': 'First comment has a hashtag/@', 'Bình luận đầu có câu mồi': 'First comment has bait wording', 'Bình luận đầu dài/ngắn quá': 'First comment too long/short', 'Bình luận đầu quá giới hạn nền tảng': 'First comment over the platform limit', 'Id clip sai dạng': 'Bad clip id', 'Bình luận đầu': 'First comment', 'Không có (clip chưa có bình luận viết lúc sản xuất)': 'None (this clip has no comment written at production)', 'Link bio (dán vào hồ sơ)': 'Bio link (paste into the profile)', 'Bình luận hôm nay': 'Comments today',
    'Bộ kênh:': 'Channel sets:', 'Tất cả FB': 'All FB', 'Tất cả IG': 'All IG', 'Tất cả': 'All', '💾 Lưu bộ': '💾 Save as set', 'Tên bộ kênh:': 'Set name:', 'Xóa bộ “{n}”?': 'Delete set “{n}”?', 'Chọn kênh trước.': 'Pick channels first.',
  };
  const SMG_CSS = `.smg-kb{display:grid;grid-template-columns:repeat(7,minmax(180px,1fr));gap:.5rem;overflow-x:auto;padding-bottom:.4rem}.smg-col{background:var(--bg2,rgba(127,127,127,.06));border-radius:10px;padding:.45rem;min-height:120px}.smg-col h4{margin:0 0 .4rem;font-size:.8rem;display:flex;justify-content:space-between}.smg-col.drop{outline:2px dashed var(--primary)}
.smg-card{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:.45rem;margin-bottom:.4rem;font-size:.78rem;cursor:grab}.smg-card b{display:block;overflow-wrap:anywhere}.smg-card .acts{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.35rem}.smg-card .warn-t{color:var(--a-warn)}
.smg-bar{height:6px;border-radius:3px;background:rgba(127,127,127,.2);overflow:hidden;min-width:60px}.smg-bar i{display:block;height:100%;background:var(--a-ok)}.smg-bar i.w{background:var(--a-warn)}.smg-bar i.b{background:var(--a-bad)}
.smg-flt{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.5rem 0}.smg-chip{display:inline-block;font-size:.68rem;padding:.05rem .35rem;border-radius:6px;background:rgba(127,127,127,.14);margin:.1rem .15rem 0 0}
.smg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.4rem}.smg-clip{border:1px solid var(--line);border-radius:8px;padding:.4rem;font-size:.75rem;text-align:left;background:none;color:inherit;cursor:pointer}.smg-clip:hover{border-color:var(--primary)}
.smg-scroll{max-height:60vh;overflow:auto}.smg-kpi{display:flex;flex-wrap:wrap;gap:.6rem}.smg-kpi div{border:1px solid var(--line);border-radius:8px;padding:.4rem .6rem;min-width:90px}.smg-kpi b{display:block;font-size:1.05rem}
/* Bảng điều khiển Autopilot (Stitch adm-social): thẻ kênh, thanh tạm dừng, xem trước, nhật ký – chỉ token admin (tự đúng sáng/tối) */
.smg-hd{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between}.smg-hd h3{margin:0}.smg-hd .acts{display:flex;flex-wrap:wrap;gap:.4rem}
.smg-lbl{font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:.8rem 0 .35rem}
.smg-stop{background:var(--a-bad-bg);color:var(--a-bad);border:1.5px solid color-mix(in srgb,var(--a-bad) 45%,transparent);font-weight:700}.smg-stop:hover{background:color-mix(in srgb,var(--a-bad) 18%,var(--surface))}
.smg-banner{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;background:var(--a-warn-bg);color:var(--a-warn);border:1px solid color-mix(in srgb,var(--a-warn) 35%,transparent);border-radius:var(--a-r,14px);padding:.7rem .9rem;margin:.7rem 0}.smg-banner b{font-size:1rem}.smg-banner p{margin:.15rem 0 0;color:var(--text)}
.smg-res{border-left:3px solid var(--a-info);background:var(--a-info-bg);border-radius:0 var(--a-r-sm,10px) var(--a-r-sm,10px) 0;padding:.5rem .7rem;margin:.5rem 0;font-size:.85rem}
.smg-chs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.7rem;margin-top:.6rem}
.smg-pc{background:var(--surface);border:1px solid var(--line);border-radius:var(--a-r,14px);padding:.75rem .85rem;box-shadow:var(--a-card-shadow,none);display:flex;flex-direction:column;gap:.45rem;min-width:0}
.smg-pc header{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}.smg-pc header b{font-size:.95rem;margin-right:auto}.smg-pi{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--surface-2);font-size:1rem}
.smg-first{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;background:var(--a-warn-bg);border-radius:var(--a-r-sm,10px);padding:.4rem .5rem}
.smg-accs{list-style:none;margin:0;padding:0;display:grid;gap:.3rem}.smg-accs li{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;font-size:.82rem;border-top:1px solid color-mix(in srgb,var(--line) 70%,transparent);padding-top:.3rem;min-width:0}.smg-accs li>span:first-child{font-weight:600;overflow-wrap:anywhere;margin-right:auto}
.smg-acts{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:auto}.smg-steps{margin:.2rem 0;padding-left:1.25rem;font-size:.82rem;line-height:1.55}.smg-steps li{margin:.15rem 0}
.smg-guide{border:1px dashed color-mix(in srgb,var(--primary) 45%,var(--line));border-radius:var(--a-r-sm,10px);padding:.5rem .6rem;background:color-mix(in srgb,var(--primary) 5%,transparent)}
.smg-names{display:flex;flex-wrap:wrap;gap:.2rem;margin:.3rem 0}.smg-yt{border-top:1px solid var(--line);padding-top:.45rem}.smg-yt details summary{cursor:pointer;font-size:.82rem}
.smg-pv{border:1px solid var(--line);border-radius:var(--a-r,14px);padding:.7rem;margin:.6rem 0;background:var(--surface)}.smg-ptabs{display:flex;flex-wrap:wrap;gap:.3rem;margin:.5rem 0}
.smg-ptabs button{border:1.5px solid var(--line);background:var(--surface);color:inherit;font:inherit;font-size:.8rem;font-weight:600;border-radius:999px;padding:.3rem .7rem;cursor:pointer}.smg-ptabs button[aria-selected=true]{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,transparent)}
.smg-cap{white-space:pre-line;overflow-wrap:anywhere;font-size:.86rem;background:var(--surface-2);border-radius:var(--a-r-sm,10px);padding:.55rem .65rem;max-height:240px;overflow:auto}
.smg-cnt{font-size:.75rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--a-ok)}.smg-cnt.w{color:var(--a-warn)}.smg-cnt.x{color:var(--a-bad)}
.smg-log{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}.smg-log li{display:grid;grid-template-columns:auto 1fr;gap:.15rem .6rem;font-size:.84rem;border-left:3px solid var(--a-bad);background:var(--surface-2);border-radius:0 8px 8px 0;padding:.4rem .6rem;overflow-wrap:anywhere}.smg-log li.sk{border-left-color:var(--a-warn)}.smg-log time,.smg-log .n{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.75rem;white-space:nowrap}
.smg-tw{overflow-x:auto;max-width:100%}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .smg-pc,:root:not([data-theme="light"]) .smg-pv{border-color:color-mix(in srgb,var(--line) 70%,var(--text) 12%)}:root:not([data-theme="light"]) .smg-banner{border-color:color-mix(in srgb,var(--a-warn) 55%,transparent)}}
:root[data-theme="dark"] .smg-pc,:root[data-theme="dark"] .smg-pv{border-color:color-mix(in srgb,var(--line) 70%,var(--text) 12%)}:root[data-theme="dark"] .smg-banner{border-color:color-mix(in srgb,var(--a-warn) 55%,transparent)}
@media (max-width:640px){.smg-kb{grid-template-columns:repeat(7,80vw)}.smg-chs{grid-template-columns:1fr}.smg-hd .acts,.smg-acts{width:100%}.smg-hd .acts .btn,.smg-acts .btn,.smg-banner .btn{flex:1 1 auto}
.smg-ap .btn,.smg-ch .btn,.smg-lg .btn,.smg-pv .btn,.smg-ptabs button{min-height:44px}.smg-ch input[type=checkbox],.smg-ap input[type=checkbox]{width:22px;height:22px}
.smg-tc thead{display:none}.smg-tc,.smg-tc tbody,.smg-tc tr,.smg-tc td{display:block;width:100%}.smg-tc tr{border:1px solid var(--line);border-radius:var(--a-r-sm,10px);padding:.35rem .5rem;margin-bottom:.45rem;box-sizing:border-box}
.smg-tc td{border:0;padding:.2rem 0;display:flex;flex-wrap:wrap;gap:.3rem;align-items:center}.smg-tc td[data-l]::before{content:attr(data-l);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);min-width:5.5rem}
.smg-log li{grid-template-columns:1fr}}`;
  const PI = { facebook_page: '📘', instagram: '📸', tiktok: '🎵', youtube: '▶️', threads: '🧵' }, PN = { facebook_page: 'Facebook Page', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', threads: 'Threads' };
  const COLS = [['idea', '💡 Ý tưởng'], ['draft', '📝 Nháp'], ['review', '👀 Chờ duyệt'], ['approved', '✅ Đã duyệt'], ['scheduled', '🕒 Đã lên lịch'], ['published', '🚀 Đã đăng'], ['failed', '⚠️ Lỗi']];
  const HS = { ok: ['ok', 'Hoạt động'], reconnect: ['bad', 'Cần kết nối lại'], expiring: ['warn', 'Sắp hết hạn'], near_limit: ['warn', 'Gần trần 24 giờ'], limit: ['bad', 'Hết lượt 24 giờ'], private_only: ['muted', 'Chỉ riêng tư (chờ duyệt app)'] };
  const uid = () => ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  // Gộp các khung cùng clip + cùng giờ thành 1 bài nhiều kênh (1 bài GrabCast = 1 lần duyệt)
  const groupSlots = slots => { const m = new Map(); for (const s of slots) { const k = s.clip + '|' + s.at; const g = m.get(k) || m.set(k, { clip: s.clip, at: s.at, account_ids: [] }).get(k); g.account_ids.push(String(s.account_id)); } return [...m.values()].sort((a, b) => a.at - b.at); };
  const parseCsv = t => { const ls = String(t || '').trim().split(/\r?\n/).filter(Boolean); if (!ls.length) return []; const h = ls[0].toLowerCase().split(',').map(x => x.trim()); const hasH = h.includes('post_id'); const cols = hasH ? h : ['post_id', 'platform', 'views', 'likes', 'comments', 'saves', 'shares', 'watch_s']; return (hasH ? ls.slice(1) : ls).map(l => { const v = l.split(','); return Object.fromEntries(cols.map((c, i) => [c, (v[i] || '').trim()])); }).filter(r => r.post_id); };
  const parseQueueCsv = t => String(t || '').split(/\r?\n/).map(l => l.split(/[,\t]/).map(x => x.trim())).filter(c => /^[a-z0-9-]{3,120}$/.test(c[0] || '') && c[1] && c[2]).map(c => ({ clip: c[0], account_ids: c[1].split(/[;|\s]+/).filter(x => /^[A-Za-z0-9_-]{1,40}$/.test(x)), at: +new Date(c[2]) })).filter(x => x.account_ids.length && x.at > Date.now());
  const rate = r => (r.views ? ((r.saves || 0) * 3 + (r.shares || 0) * 4 + (r.comments || 0) * 2 + (r.likes || 0)) / r.views : 0);
  const sumBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = key(r) || '–'; const o = m.get(k) || m.set(k, { k, views: 0, likes: 0, comments: 0, saves: 0, shares: 0, watch_s: 0, n: 0, d7: null }).get(k); for (const f of ['views', 'likes', 'comments', 'saves', 'shares', 'watch_s']) o[f] += +r[f] || 0; if (r.d7 != null) o.d7 = (o.d7 || 0) + r.d7; o.n++; } return [...m.values()].sort((a, b) => b.views - a.views); };
  // Bảng điều khiển Autopilot: thứ tự nền tảng, tên ngôn ngữ (bộ 16 fanpage), lý do bỏ qua, loại lỗi nhật ký, vấn đề khi xem trước
  const PAUSE_Q = 'Tạm dừng TOÀN BỘ autopilot?\n\n• Tắt autopilot: không tạo, không lên lịch bài mới.\n• Gỡ lịch các bài autopilot ĐÃ lên lịch trên GrabCast (tối đa 20 bài mỗi lần bấm) – bài về cột Chờ duyệt, KHÔNG bị xóa.\n• Bài anh tự soạn tay không bị đụng tới.\n\nBật lại bất cứ lúc nào bằng nút Chạy lại.'; // hỏi trước khi Tạm dừng toàn bộ (EN: cùng khóa trong EN)
  const CH_PLATS = ['facebook_page', 'instagram', 'tiktok', 'threads', 'youtube'];
  const LANGN = { en: 'English', vi: 'Tiếng Việt', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', th: 'ไทย', zh: '中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };
  const GSTEP = { facebook_page: 'Đăng nhập Facebook bằng tài khoản quản trị các Page → tích đúng các Page Lexkite cần đăng.', instagram: 'Đăng nhập qua Facebook → chọn tài khoản Instagram Business/Creator đã liên kết với Page Lexkite cùng ngôn ngữ.',
    tiktok: 'Đăng nhập TikTok của Lexkite → cho phép đăng video.', threads: 'Đăng nhập Threads bằng tài khoản Instagram của Lexkite → cho phép đăng bài.', youtube: 'Chỉ nối YouTube trên GrabCast khi GrabCast đã được YouTube duyệt – trước đó video bị khóa Riêng tư.' };
  const SKIP = { 'clip-not-approved': 'Clip chưa được duyệt (hoặc đã bị loại/tạm dừng) – không đăng.', 'account-gone': 'Kênh không còn trên GrabCast – kết nối lại ở bảng Kênh.', reconnect: 'Kênh cần kết nối lại trên GrabCast.',
    limit: 'Kênh hết lượt đăng 24 giờ – để lượt sau.', invalid: 'Nội dung không qua kiểm tra của nền tảng (độ dài/định dạng).', 'no-metadata': 'Clip thiếu tiêu đề/điểm học – không đăng.', 'waiting-approval': 'Đang chờ anh duyệt.',
    'gave-up': 'Lỗi lặp lại 2 lần – dừng thử, chờ anh xem (nút Mở lại).', exists: 'Bài đã có trên GrabCast – không tạo trùng.', meta: 'Bài này đang đi đường Meta.', 'plan-error': 'Lỗi tự xếp lịch.', 'auto-queue-error': 'Lỗi tự duyệt clip.',
    'too-late': 'Quá giờ đăng hơn 12 giờ – bỏ bài này.', locked: 'Bài đang được xử lý ở lượt khác.', 'ig-processing': 'Instagram đang xử lý video – lượt sau đăng tiếp.', 'ig-expired': 'Container Instagram hết hạn – tạo lại ở lượt sau.',
    'ig-limit': 'Instagram hết lượt đăng 24 giờ.', 'meta-no-token': 'Kênh chưa có token Meta.', 'meta-channel-paused': 'Kênh Meta đang tạm dừng (token/cầu dao).', 'meta-gave-up': 'Meta lỗi lặp lại – dừng thử, chờ anh xem.', 'meta-wait': 'Chờ tới giờ đăng (Meta).' };
  const SKIP_PRE = [['create-', 'GrabCast không tạo được bài (mã {c}).'], ['get-', 'GrabCast không đọc được bài (mã {c}).'], ['validate:', 'GrabCast từ chối khi kiểm tra ({c}).'], ['conflict-', 'Xung đột trạng thái trên GrabCast ({c}).'], ['schedule-', 'GrabCast không lên lịch được (mã {c}).'], ['meta-', 'Meta báo lỗi ({c}).']];
  /** Mã lý do bỏ qua → [chuỗi VI, biến] (dịch qua M ở nơi dùng). */
  const skipWhy = w => { w = String(w || ''); if (Object.prototype.hasOwnProperty.call(SKIP, w)) return [SKIP[w]]; const x = SKIP_PRE.find(([k]) => w.startsWith(k)); return x ? [x[1], { c: w.slice(x[0].length) }] : ['Lý do khác ({c}).', { c: w || '?' }]; };
  const LOGK = { 'post-failed': 'Bài đăng lỗi', 'gave-up': 'Dừng thử lại', 'no-metadata': 'Clip thiếu tiêu đề', 'no-channels': 'Chưa nối kênh', 'no-approved': 'Chưa có clip duyệt', 'nothing-planned': 'Lịch trống', 'dup-published': 'Đăng trùng',
    'no-new-clips': 'Kho không có clip mới', 'manifest-stale': 'Danh mục clip cũ', failover: 'Chuyển sang Meta', recovered: 'Đã hồi phục', 'gc-auth': 'Khóa GrabCast lỗi', 'meta-token': 'Token Meta', 'meta-down': 'Meta lỗi' };
  const ISS = { 'no-metadata': 'Clip thiếu tiêu đề/điểm học – sẽ không đăng', 'hashtag-cut': 'Hashtag bị cắt khỏi caption', 'too-long': 'Caption dài quá giới hạn nền tảng', 'no-caption': 'Thiếu caption', 'no-title': 'Thiếu tiêu đề', hashtags: 'Số hashtag vượt giới hạn nền tảng', angle: 'YouTube không nhận ký tự < >', 'first-comment-missing': 'Clip chưa có bình luận đầu (viết lúc sản xuất)', 'first-comment-link-slot': 'Bình luận đầu phải có đúng 1 chỗ {link}', 'first-comment-raw-url': 'Bình luận đầu có link trần', 'first-comment-tag': 'Bình luận đầu có hashtag/@', 'first-comment-spam': 'Bình luận đầu có câu mồi', 'first-comment-length': 'Bình luận đầu dài/ngắn quá', 'first-comment-too-long': 'Bình luận đầu quá giới hạn nền tảng', 'first-comment-bad-clip': 'Id clip sai dạng' };
  const HFLAG = ['reconnect', 'limit', 'expiring', 'near_limit', 'private_only'];
  // Phát hiện kênh mới sau khi kết nối (popup GrabCast)
  const newAccounts = (before, after) => { const b = new Set(before.map(a => String(a.id))); return after.filter(a => !b.has(String(a.id))); };

  function mk(ctx) {
    const esc = ctx.esc, M = (vi, vars) => { if (ctx.lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return ctx.L(vi, vars); let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s; };
    if (!document.getElementById('admSmgCss')) { const st = document.createElement('style'); st.id = 'admSmgCss'; st.textContent = SMG_CSS; document.head.appendChild(st); }
    const err = e => M('✗ {e}', { e: ctx.errText(e) });
    const pill = (c, t) => `<span class="pill ${c}">${esc(t)}</span>`;
    const accN = id => { const a = ctx.accById(id); return a ? (PI[String(a.platform)] || '•') + ' ' + (a.display_name || a.username || a.name || id) : '#' + id; };
    const when = ms => (ms ? new Date(ms).toLocaleString(ctx.lang() === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
    return { M, esc, err, pill, accN, when };
  }

  // ======================= DUYỆT BÀI (KANBAN) =======================
  async function board(el, ctx) {
    const { M, esc, err, accN } = mk(ctx); let items = [], more = {};
    el.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between;gap:.5rem"><p class="small muted" style="margin:0;flex:1 1 260px">${M('Không bài nào công khai khi chưa duyệt. GrabCast giữ lịch và tự đăng nền khi tới giờ (máy anh tắt vẫn đăng).')}</p>
      <div class="row" style="gap:.4rem"><button type="button" class="btn sm ghost" id="smgIdea">${M('＋ Ý tưởng')}</button><button type="button" class="btn sm" id="smgRe">${M('🔄 Tải lại')}</button></div></div>
      <p class="small" id="smgMsg" role="status" aria-live="polite"></p><div class="smg-kb" id="smgKb"><p class="small muted">${M('Đang tải…')}</p></div></section>`;
    const $ = s => el.querySelector(s), msg = (t, c) => { const m = $('#smgMsg'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { items = (await ctx.sapi('GET', 'lk/board')).items || []; paintKb(); focus(); } catch (e) { msg(err(e), false); } };
    const card = it => {
      const n = it.note === 'changed-in-grabcast' ? M('Nội dung đã bị sửa trên GrabCast sau khi duyệt – hãy hủy lịch rồi duyệt lại.') : it.note === 'scheduled-outside' ? M('Bài được lên lịch ngoài Lexkite khi chưa duyệt.') : it.note === 'changed-after-approval' ? M('Nội dung đã đổi sau khi duyệt – cần duyệt lại.') : '';
      const acts = [];
      if (it.state === 'review') acts.push(`<button type="button" class="btn sm primary" data-a="approve" data-id="${esc(it.id)}">${M(it.mode === 'now' ? 'Duyệt & đăng ngay' : 'Duyệt & lên lịch')}</button>`, `<button type="button" class="btn sm ghost" data-a="draft" data-id="${esc(it.id)}">${M('Trả về nháp')}</button>`);
      if ((it.state === 'draft' || it.state === 'idea') && it.post_id) acts.push(`<button type="button" class="btn sm" data-a="review" data-id="${esc(it.id)}">${M('Gửi duyệt')}</button>`);
      if (it.post_id) acts.push(`<button type="button" class="btn sm ghost" data-a="dup" data-id="${esc(it.id)}" title="${esc(M('Nhân bản / đăng lại'))}">⧉</button>`);
      if (['idea', 'draft', 'review', 'approved'].includes(it.state)) acts.push(`<button type="button" class="btn sm ghost" data-a="time" data-id="${esc(it.id)}" title="${esc(M('Đặt giờ'))}">🕒</button>`);
      acts.push(`<button type="button" class="btn sm ghost" data-a="link" data-id="${esc(it.id)}" title="${esc(M('Chép link duyệt'))}">🔗</button>`);
      if (!['scheduled', 'published'].includes(it.state)) acts.push(`<button type="button" class="btn sm ghost" data-a="del" data-id="${esc(it.id)}" aria-label="${esc(M('Xóa'))}">🗑</button>`);
      const links = (it.links || []).filter(l => l.u).map(l => `<a href="${esc(l.u)}" target="_blank" rel="noopener">${PI[l.p] || '↗'}</a>`).join(' ');
      return `<div class="smg-card" draggable="${['idea', 'draft', 'review'].includes(it.state)}" data-id="${esc(it.id)}"><b>${esc(it.title || it.clip || '(…)')}</b>
        <div class="muted">${(it.accounts || []).map(a => esc(accN(a))).join(' · ')}</div>${it.want_at ? `<div class="tiny">🕒 ${esc(ctx.both(it.want_at))}</div>` : ''}
        ${it.approved_by ? `<div class="tiny muted">${M('Duyệt bởi {w}', { w: esc(String(it.approved_by).replace(/@.*/, '')) })}</div>` : ''}${n ? `<div class="tiny warn-t">⚠️ ${esc(n)}</div>` : ''}${it.err ? `<div class="tiny bad-t">✗ ${esc(it.err)}</div>` : ''}
        ${(it.links || []).some(l => l.e) ? `<div class="tiny bad-t">${(it.links || []).filter(l => l.e).map(l => esc((PI[l.p] || '') + ' ' + l.e)).join(' · ')}</div>` : ''}${links ? `<div class="tiny">${links}</div>` : ''}<div class="acts">${acts.join('')}</div></div>`;
    };
    function paintKb() {
      const kb = $('#smgKb'); if (!kb) return;
      kb.innerHTML = COLS.map(([k, t]) => { const xs = items.filter(i => i.state === k), lim = more[k] || 40; return `<div class="smg-col" data-col="${k}"><h4><span>${M(t)}</span><span class="muted">${xs.length}</span></h4>${xs.slice(0, lim).map(card).join('') || `<p class="tiny muted">${M('Trống')}</p>`}${xs.length > lim ? `<button type="button" class="btn sm ghost" data-more="${k}">${M('Xem thêm {n}', { n: xs.length - lim })}</button>` : ''}</div>`; }).join('');
    }
    const byId = id => items.find(i => i.id === id);
    const focus = () => { if (!ctx.focus) return; const c = el.querySelector(`.smg-card[data-id="${CSS.escape(ctx.focus)}"]`); if (c) { c.style.outline = '2px solid var(--primary)'; c.scrollIntoView({ block: 'nearest', inline: 'center' }); } ctx.focus = null; };
    async function act(a, id) {
      const it = byId(id); if (!it) return; const t = it.title || it.clip || id;
      try {
        if (a === 'approve') {
          const n = (it.accounts || []).length;
          if (it.mode !== 'now' && (!it.want_at || it.want_at < Date.now() + 6e4)) { if (!confirm(M('Chuyển “{t}” sang {s}?', { t, s: M('✅ Đã duyệt') }))) return; await ctx.sapi('POST', 'lk/board/approve', { id, publish: false }); msg(M('Giờ đăng chưa chọn hoặc đã qua – mở bài ở tab Bài đăng để chọn giờ.'), null); }
          else { if (!confirm(it.mode === 'now' ? M('Duyệt bài “{t}” và ĐĂNG NGAY lên {n} kênh? Bài sẽ công khai ngay.', { t, n }) : M('Duyệt bài “{t}” và lên lịch đăng lên {n} kênh lúc {d}? GrabCast sẽ tự đăng đúng giờ.', { t, n, d: ctx.both(it.want_at) }))) return;
            const r = await ctx.sapi('POST', 'lk/board/approve', { id }, { idem: 'apv-' + id.slice(2) + '-' + (it.want_at || 0) }); msg(r.error ? err({ code: r.error }) : M('✓ Xong'), !r.error); }
        } else if (a === 'draft' || a === 'review' || a === 'idea') { if (!confirm(M('Chuyển “{t}” sang {s}?', { t, s: M((COLS.find(c => c[0] === a) || [])[1]) }))) return; await ctx.sapi('POST', 'lk/board/move', { id, state: a }); }
        else if (a === 'dup') { if (!confirm(M('Nhân bản “{t}” thành bài nháp mới (phải duyệt lại)?', { t }))) return; await ctx.sapi('POST', 'lk/board/duplicate', { id }, { idem: 'dup-' + id.slice(2) + '-' + Date.now().toString(36) }); msg(M('✓ Xong'), true); }
        else if (a === 'time') { const v = prompt(M('Giờ đăng (giờ máy bạn), dạng 2026-10-30 19:00'), it.want_at ? new Date(it.want_at - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16).replace('T', ' ') : ''); if (!v) return; const at = new Date(v.trim().replace(' ', 'T')); if (isNaN(at)) return msg(M('Giờ không hợp lệ.'), false); await ctx.sapi('POST', 'lk/board/time', { id, at: +at }); }
        else if (a === 'link') { const u = location.origin + location.pathname + '#social/board/' + id; try { await navigator.clipboard.writeText(u); msg(M('✓ Đã chép link duyệt (chỉ quản trị viên mở được): {u}', { u }), true); } catch (e) { prompt(M('Chép link duyệt'), u); } return; }
        else if (a === 'del') { if (!confirm(M('Xóa mục “{t}” khỏi bảng?', { t }))) return; await ctx.sapi('POST', 'lk/board/delete', { id }); }
        await load(); ctx.reloadPosts && ctx.reloadPosts();
      } catch (e) { msg(err(e), false); await load(); }
    }
    el.onclick = e => { const m = e.target.closest('[data-more]'); if (m) { more[m.dataset.more] = (more[m.dataset.more] || 40) + 80; return paintKb(); } const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a, b.dataset.id); };
    let drag = null;
    el.ondragstart = e => { const c = e.target.closest('.smg-card'); drag = c && c.dataset.id; };
    el.ondragover = e => { const c = e.target.closest('.smg-col'); if (c && drag && ['idea', 'draft', 'review', 'approved'].includes(c.dataset.col)) { e.preventDefault(); c.classList.add('drop'); } };
    el.ondragleave = e => { const c = e.target.closest('.smg-col'); if (c) c.classList.remove('drop'); };
    el.ondrop = e => { const c = e.target.closest('.smg-col'); if (!c || !drag) return; e.preventDefault(); c.classList.remove('drop'); const it = byId(drag), to = c.dataset.col; drag = null; if (!it || it.state === to) return; act(to === 'approved' ? 'approve' : to, it.id); };
    $('#smgRe').onclick = load;
    $('#smgIdea').onclick = () => {
      const { d, shut } = ctx.modal('soc-dlg', `<form method="dialog" class="card" style="min-width:min(420px,90vw)"><h3>${M('＋ Ý tưởng')}</h3><label class="small">${M('Tiêu đề')}<input id="smgT" maxlength="200" required style="width:100%"></label>
        <label class="small">${M('Ghi chú')}<textarea id="smgN" rows="4" maxlength="2000" style="width:100%"></textarea></label><div class="row" style="gap:.4rem;justify-content:flex-end;margin-top:.5rem"><button type="button" class="btn ghost" data-x>${M('Hủy')}</button><button type="submit" class="btn primary">${M('Lưu')}</button></div></form>`, M('＋ Ý tưởng'));
      d.querySelector('form').onsubmit = async ev => { ev.preventDefault(); const t = d.querySelector('#smgT').value.trim(); if (!t) return; try { await ctx.sapi('POST', 'lk/board/save', { title: t, note: d.querySelector('#smgN').value, state: 'idea' }); shut(); load(); } catch (e2) { msg(err(e2), false); shut(); } };
    };
    load();
  }

  // ======================= HÀNG ĐỢI TỰ ĐỘNG =======================
  // ---- Autopilot (máy chủ: functions/api/_social_auto.js, cron .github/workflows/social-auto.yml) ----
  async function autoCard(box, ctx) {
    const { M, esc, err, pill, when } = mk(ctx); let A = null;
    // Bảng Kênh (#smgCh) + Nhật ký lỗi (#smgLog) cạnh thẻ: cùng dữ liệu lk/auto, vẽ lại sau mỗi lần tải
    const host = box.parentElement || box, S = { A: null, H: null, guide: null, pauseRes: null, pv: null, load: null };
    const side = () => { S.A = A; const ch = host.querySelector('#smgCh'), lg = host.querySelector('#smgLog'); if (ch) chanPanel(ch, ctx, S); if (lg) logPanel(lg, ctx, S); };
    const STOP = { off: 'Đang tắt', breaker: 'Cầu dao đang mở', 'no-key': 'Thiếu khóa GrabCast', budget: 'Hết ngân sách hôm nay' };
    const PW = { late: 'GrabCast trễ (chưa đăng sau giờ hẹn + 30 phút)', 'no-key': 'Thiếu khóa GrabCast', auth: 'Khóa GrabCast sai/hết quyền', db_budget_guard: 'GrabCast quá tải / hết DB', overload: 'GrabCast quá tải / hết DB', down: 'GrabCast lỗi máy chủ lặp lại', manual: 'Chuyển tay', 'meta-not-configured': 'Meta chưa cấu hình' };
    const TW = { 'refresh-failed': 'refresh lỗi', revoked: 'bị thu hồi', expiring: 'sắp hết hạn', 'data-access-expiring': 'quyền dữ liệu sắp hết hạn', 'missing-scope': 'thiếu quyền', error: 'lỗi kiểm' };
    const MODES = { auto: 'Tự động (GrabCast lỗi → Meta)', grabcast: 'Luôn GrabCast', meta: 'Luôn Meta (đăng thẳng)' };
    const why = w => { if (!w) return ''; const k = String(w).replace(/^manual:/, '').split(/[-:]/)[0]; return (PW[w] ? M(PW[w]) : PW[k] ? M(PW[k]) : '') + ' (' + w + ')'; };
    const DS = { planned: 'Đã xếp lịch', pushed: 'Đã đẩy lên GrabCast', published: 'Đã đăng', failed: 'Lỗi', cancelled: 'Đã hủy' }, BS = Object.fromEntries(COLS);
    const msg = (t, c) => { const m = box.querySelector('#apM'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { A = await ctx.sapi('GET', 'lk/auto'); paint(); side(); } catch (e) { box.innerHTML = `<p class="small bad-t">${esc(err(e))}</p>`; } };
    S.load = load;
    /** Cờ sức khỏe từng tài khoản GrabCast (reconnect/limit/expiring…) – cùng nguồn tab Sức khỏe kênh; lỗi → bảng Kênh dùng trạng thái D1. */
    S.health = () => ctx.sapi('GET', 'lk/health').then(h => { S.H = h && Array.isArray(h.accounts) ? h : null; if (A) side(); }).catch(() => {});
    const goBoard = id => (ctx.goBoard ? ctx.goBoard(id) : (location.hash = '#social/board/' + id)); S.goBoard = goBoard;
    const firstWait = p => A && (+((A.manual || {})[p]) || 0) < A.cfg.manual_first;
    /** Bình luận đầu + click (§6c): công tắc, hạn mức, số click 28 ngày (functions/api/go → ext_events), trạng thái bình luận Meta, link bio IG/TikTok. */
    function fcBlock() {
      const c = A.cfg, f = c.fc || { on: true, per_ch_day: 6 }, k = A.clicks || { total: 0, plats: [], kinds: { fc: 0, bio: 0 }, top: [] }, F = A.fc || {}, CP = { fb: 'facebook_page', yt: 'youtube', th: 'threads', x: 'x', ig: 'instagram', tt: 'tiktok' };
      const today = Object.values(F.today || {}).reduce((a, b) => a + (+b || 0), 0), meta = Object.entries(F.meta || {}).map(([s, n]) => esc(s) + ' ' + esc(String(n))).join(' · ') || '—';
      const bio = ['instagram', 'tiktok'].map(p => `<li>${PI[p]} ${PN[p]}: <code>https://lexkite.com/api/go/${p === 'instagram' ? 'ig' : 'tt'}/bio</code></li>`).join('');
      return `<details><summary class="small" style="font-weight:600">${M('💬 Bình luận đầu & click về web app (28 ngày)')}</summary>
        <p class="tiny muted">${M('Mỗi bài tối đa 1 bình luận của kênh mang link (FB, YouTube: bình luận · Threads: tự trả lời) – nội dung viết lúc sản xuất. Instagram/TikTok không bình luận link (không bấm được): caption ghi "link in bio". Không nền tảng nào có API ghim bình luận.')}</p>
        <div class="soc-form"><label class="row" style="gap:.3rem"><input type="checkbox" id="apFc" ${f.on ? 'checked' : ''}>${M('Bật bình luận đầu')}</label><label>${M('Tối đa/kênh/ngày')}<input type="number" min="1" max="20" id="apFcN" value="${esc(String(f.per_ch_day))}"></label></div>
        <div class="smg-kpi">${[['Click', k.total], ['Từ bình luận', k.kinds.fc], ['Từ link bio', k.kinds.bio], ['Bình luận hôm nay', today]].map(([t, v]) => `<div><b>${esc(String(v))}</b><span class="tiny muted">${M(t)}</span></div>`).join('')}</div>
        <p class="tiny"><b>${M('Theo nền tảng')}:</b> ${k.plats.length ? k.plats.map(x => `${PI[CP[x.k]] || ''} ${esc(PN[CP[x.k]] || x.k)} ${esc(String(x.n))}`).join(' · ') : M('Chưa có click nào.')}</p>
        ${k.top.length ? `<p class="tiny"><b>${M('Clip nhiều click nhất')}:</b> ${k.top.map(x => `${PI[CP[x.plat]] || ''} ${esc(x.clip)} (${esc(String(x.n))})`).join(' · ')}</p>` : ''}
        <p class="tiny muted">${Object.keys(PN).filter(p => p !== 'instagram' && p !== 'tiktok').map(p => `${PI[p]} ${M('Bài có bình luận đã duyệt tay {m}/{n}', { m: (F.manual || {})[p] || 0, n: c.manual_first })}`).join(' · ')} · <b>${M('Bình luận đường Meta')}:</b> ${meta}</p>
        <p class="tiny" style="margin-bottom:.2rem"><b>${M('Link bio (dán vào hồ sơ)')}:</b></p><ul class="tiny" style="margin:0">${bio}</ul></details>`;
    }
    function provBlock() {
      const P = A.provider || { cur: 'grabcast' }, me = A.meta || {}, c = A.cfg, tks = me.tokens || [];
      const tokTxt = t => { const h = t.health, exp = (h && h.expires_at) || t.expires_at; if (t.breaker) return M('⛔ Meta tạm dừng tới {d} ({c}).', { d: when(t.breaker.until), c: t.breaker.kind + ':' + t.breaker.code }); if (h && !h.ok) return '⚠️ ' + (TW[h.why] ? M(TW[h.why]) : h.why || '✗'); if (t.status && t.status !== 'ok') return '⚠️ ' + (TW[t.status] ? M(TW[t.status]) : t.status); return t.platform === 'facebook_page' && !exp ? M('không hết hạn') : exp ? M('hết hạn {d}', { d: when(exp) }) : M('chưa kiểm'); };
      const rows = tks.map(t => `<tr><td>${PI[t.platform] || ''} ${esc(t.title || t.channel_id)}</td><td>${t.kind === 'ig' ? 'Instagram Login' : 'FB Page'} · ${esc(t.name || t.target_id)}</td><td>…${esc(t.last4 || '')}${t.src === 'env' ? ' <span class="tiny muted">(secret)</span>' : ''}</td><td>${esc(tokTxt(t))}</td><td><button type="button" class="btn sm ghost" data-oa="${esc(t.channel_id)}" data-k="${t.kind === 'ig' ? 'ig' : 'fb'}">${M('🔗 Kết nối lại')}</button>${t.src === 'd1' ? ` <button type="button" class="btn sm ghost" data-tdel="${esc(t.channel_id)}">${M('Xóa')}</button>` : ''}</td></tr>`).join('');
      const apps = me.apps || {}, hasTok = new Set(tks.map(t => t.channel_id));
      const conn = (me.channels || []).filter(x => !hasTok.has(x.channel_id)).map(x => { const k = x.platform === 'instagram' ? 'ig' : 'fb'; return `<button type="button" class="btn sm" data-oa="${esc(x.channel_id)}" data-k="${k}">${M(k === 'ig' ? '🔗 Kết nối Instagram' : '🔗 Kết nối Facebook')} · ${esc(x.title || x.channel_id)}</button>`; }).join(' ');
      const appRow = k => { const a = apps[k] || {}; return `<div class="soc-form"><span class="small">${k === 'ig' ? 'Instagram' : 'Facebook'} · App ID ${esc(a.app_id || '')} · ${a.secret ? esc(M('App Secret đã có ({s})', { s: a.src === 'env' ? 'secret' : '…' + (a.last4 || '') })) : `<span class="bad-t">${M('Chưa có App Secret')}</span>`}</span><input id="apSec-${k}" type="password" autocomplete="off" spellcheck="false" aria-label="App Secret ${k === 'ig' ? 'Instagram' : 'Facebook'}" placeholder="App Secret"><button type="button" class="btn sm ghost" data-sec="${k}">${M('💾 Lưu App Secret')}</button></div>`; };
      const opts = (me.channels || []).map(x => `<option value="${esc(x.channel_id)}" data-p="${esc(x.platform)}">${PI[x.platform] || ''} ${esc(x.title || x.channel_id)}</option>`).join('');
      return `<div class="smg-prov" style="border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;margin:.4rem 0">
        <p class="small" style="margin:0"><b>${M('Đường đăng FB/IG')}:</b> ${P.cur === 'meta' ? '🟦 Meta API' : '🟩 GrabCast'} ${P.why ? '· ' + esc(M('Lý do: {w}', { w: why(P.why) })) : ''} ${P.since ? '· ' + esc(M('từ {d}', { d: when(P.since) })) : ''}</p>
        <div class="soc-form"><label>${M('Chế độ')}<select id="apMode">${Object.keys(MODES).map(k => `<option value="${k}" ${c.provider === k ? 'selected' : ''}>${M(MODES[k])}</option>`).join('')}</select></label><button type="button" class="btn sm ghost" id="apProv">${M('🔀 Chuyển')}</button></div>
        ${me.configured ? `<p class="tiny muted" style="margin:.2rem 0">${esc(M('Lượt Meta API còn hôm nay {n}', { n: me.budget_left + '/' + c.meta_daily }))}</p><div class="smg-scroll"><table class="soc-tbl"><thead><tr><th>${M('Kênh')}</th><th>${M('Loại')}</th><th>Token</th><th>${M('Trạng thái')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
          : `<p class="tiny bad-t" style="margin:.2rem 0">${M('Meta (dự phòng): chưa có token kênh nào – thêm token cho từng kênh FB/IG ở dưới (docs/DISTRIBUTION.md §6b).')}</p>`}
        <p class="tiny muted" style="margin:.3rem 0 .2rem">${M('Kết nối một chạm: bấm nút, đăng nhập đúng tài khoản giữ Page/IG (Tester của app Lexkite) rồi cho phép – token được lưu mã hóa, không phải chép gì.')}</p>
        ${conn ? `<div class="row" style="gap:.4rem;flex-wrap:wrap">${conn}</div>` : ''}<div id="apPick"></div>
        <details${apps.fb && apps.ig && (!apps.fb.secret || !apps.ig.secret) ? ' open' : ''}><summary class="small">${M('⚙️ App Meta (App Secret)')}</summary><p class="tiny muted">${M('Dán App Secret 1 lần (Meta: Cài đặt ứng dụng › Thông tin cơ bản; Instagram: Instagram › Thiết lập API với đăng nhập Instagram). Lưu mã hóa, không hiện lại.')}</p>${appRow('fb')}${appRow('ig')}</details>
        <details><summary class="small">${M('＋ Thêm / đổi token kênh')} · ${M('Dán token tay (dự phòng)')}</summary>
          ${me.enc === false ? `<p class="tiny bad-t">${M('Máy chủ thiếu KEYS_ENC_KEY – không lưu token được.')}</p>` : ''}
          <p class="tiny muted">${M('FB: Page token không hết hạn (tài khoản giữ Page là Tester của app Lexkite) + Page ID. IG: token Instagram Login (tự refresh trước khi hết 60 ngày). Token được kiểm bằng 1 lượt gọi Meta rồi lưu mã hóa, không hiện lại.')}</p>
          <div class="soc-form"><label>${M('Kênh')}<select id="apTkCh">${opts}</select></label><label>${M('Page ID (chỉ FB)')}<input id="apTkId" inputmode="numeric" autocomplete="off"></label><label>Token<input id="apTkV" type="password" autocomplete="off" spellcheck="false"></label><button type="button" class="btn sm" id="apTkSave">${M('💾 Lưu token')}</button></div>
        </details></div>`;
    }
    function paint() {
      const c = A.cfg, st = A.state || {}, lr = st.last_run, br = st.breaker && st.breaker.until > A.now ? st.breaker : null;
      const stopTxt = lr ? (lr.stop ? (STOP[lr.stop] ? M(STOP[lr.stop]) : M('Dừng: {c}', { c: lr.stop })) : M('Bình thường')) : '';
      box.innerHTML = `<h3 style="margin-top:0">${M('🛰️ Autopilot đăng social')}</h3><p class="small muted">${M('Chạy nền trên máy chủ mỗi 2 giờ (máy anh tắt vẫn chạy): lấy bài đến hạn trong lịch Kênh & phân phối, tạo bài trên GrabCast và lên lịch đúng giờ – GrabCast tự đăng khi tới giờ.')}</p>
        ${A.key ? '' : `<p class="small bad-t">${M('Máy chủ chưa có khóa GrabCast (secret GRABCAST_API_KEY).')}</p>`}
        ${br ? `<p class="small bad-t">${M('⛔ Cầu dao mở tới {d} (mã {c}) – GrabCast trả lỗi nên autopilot đã dừng cả lượt, không thử lại.', { d: esc(when(br.until)), c: esc(br.code) })} <button type="button" class="btn sm ghost" id="apReset">${M('Mở lại')}</button></p>` : ''}
        ${provBlock()}
        <p class="small"><b>${M('Lần chạy cuối')}:</b> ${lr ? `${esc(when(lr.at))} · ${esc(stopTxt)}` : M('Chưa chạy lần nào.')} · <b>${M('Đồng bộ trạng thái')}:</b> ${esc(when(st.last_sync && st.last_sync.at))} · <b>${M('Webhook GrabCast')}:</b> ${A.webhook ? M('sẵn sàng') : M('chưa cấu hình')}</p>
        <div class="smg-kpi">${[['Đến hạn', lr ? lr.due : 0], ['Đã tạo', lr ? lr.created : 0], ['Đã lên lịch', lr ? lr.scheduled : 0], ['Chờ duyệt', lr ? lr.review : 0], ['Lượt GrabCast còn hôm nay', A.budget_left + '/' + c.daily_calls]].map(([k, v]) => `<div><b>${esc(String(v))}</b><span class="tiny muted">${M(k)}</span></div>`).join('')}</div>
        <div class="soc-form" style="margin-top:.6rem"><label class="row" style="gap:.3rem"><input type="checkbox" id="apOn" ${c.on ? 'checked' : ''}>${M('Bật autopilot (công tắc khẩn: tắt = dừng mọi lượt gọi GrabCast)')}</label>
          <label class="row" style="gap:.3rem"><input type="checkbox" id="apAA" ${c.auto_approve ? 'checked' : ''}>${M('Tự động duyệt')}</label>
          <label>${M('Duyệt tay trước (bài/nền tảng)')}<input type="number" min="0" max="50" id="apN" value="${c.manual_first}"></label></div>
        <p class="tiny muted">${M('Tắt: mọi bài autopilot vào cột Chờ duyệt, anh duyệt tay (giữ đúng giờ đã xếp). Bật: chỉ nền tảng đã có đủ số bài duyệt tay mới tự lên lịch.')}</p>
        <div class="small" style="font-weight:600;margin:.4rem 0 .2rem">${M('Nền tảng tự đăng')}</div><div class="soc-targets">${Object.keys(PN).map(p => `<label><input type="checkbox" data-ap="${p}" ${c.plats[p] ? 'checked' : ''}> ${PI[p]} ${PN[p]} <span class="tiny muted">${M('Đã duyệt tay {m}/{n}', { m: (A.manual || {})[p] || 0, n: c.manual_first })}${p === 'tiktok' || p === 'youtube' ? ' · ' + M('chỉ bật khi app GrabCast được duyệt') : ''}</span></label>`).join('')}</div>
        <div class="row" style="gap:.4rem;margin-top:.5rem"><button type="button" class="btn sm" id="apSave">${M('💾 Lưu cài đặt')}</button><button type="button" class="btn sm ghost" id="apRun" ${A.key && c.on ? '' : 'disabled'}>${M('▶️ Chạy ngay')}</button></div>
        ${fcBlock()}
        <p class="small" id="apM" role="status" aria-live="polite"></p>
        <details${(A.upcoming || []).length ? ' open' : ''}><summary class="small" style="font-weight:600">${M('Sắp đăng (72 giờ)')}</summary>${(A.upcoming || []).length ? `<div class="smg-scroll smg-tw"><table class="soc-tbl smg-tc"><thead><tr><th>${M('Giờ')}</th><th>${M('Clip')}</th><th>${M('Kênh')}</th><th>${M('Trạng thái')}</th><th>${M('Đường')}</th><th>${M('Xem trước')}</th></tr></thead><tbody>${A.upcoming.map(r => `<tr><td data-l="${esc(M('Giờ'))}">${esc(when(r.slot_ms))}</td><td data-l="${esc(M('Clip'))}">${esc(r.clip)}</td><td data-l="${esc(M('Kênh'))}">${PI[r.platform] || ''} ${esc(r.channel || r.channel_id)}</td><td data-l="${esc(M('Trạng thái'))}">${esc(r.board && BS[r.board] ? M(BS[r.board]) : DS[r.state] ? M(DS[r.state]) : r.state || '')}${r.board === 'review' && firstWait(r.platform) ? ' ' + pill('warn', M('Chờ anh duyệt bài đầu')) : ''}${r.err ? ` <span class="tiny bad-t">${esc(r.err)}</span>` : ''}</td><td data-l="${esc(M('Đường'))}">${r.provider === 'meta' ? 'Meta' : r.provider === 'grabcast' || r.board ? 'GrabCast' : ''}${r.permalink && /^https:\/\/www\.(facebook|instagram)\.com\//.test(r.permalink) ? ` <a href="${esc(r.permalink)}" target="_blank" rel="noopener">${M('Mở ↗')}</a>` : ''}${r.board === 'review' && (A.provider || {}).cur === 'meta' && r.board_id ? ` <button type="button" class="btn sm ghost" data-apv="${esc(r.board_id)}">${M('Duyệt (Meta)')}</button>` : ''}${r.board === 'review' && (A.provider || {}).cur !== 'meta' && r.board_id ? ` <button type="button" class="btn sm primary" data-gob="${esc(r.board_id)}">${M('✅ Mở để duyệt')}</button>` : ''}</td><td><button type="button" class="btn sm ghost" data-pv="${esc(r.clip)}">${M('👁 Xem trước')}</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted">${M('Chưa có bài nào trong lịch – chạy “Lập lịch” ở Kênh & phân phối.')}</p>`}</details><div id="apPv"></div>`;
      const $ = s => box.querySelector(s);
      $('#apSave').onclick = async () => {
        const cfg = { on: $('#apOn').checked, auto_approve: $('#apAA').checked, manual_first: Math.max(0, +$('#apN').value || 0), fc: { ...(A.cfg.fc || {}), on: !!($('#apFc') && $('#apFc').checked), per_ch_day: +(($('#apFcN') || {}).value) || 6 }, plats: Object.fromEntries([...box.querySelectorAll('[data-ap]')].map(i => [i.dataset.ap, i.checked])) };
        if (cfg.auto_approve && !A.cfg.auto_approve && !confirm(M('Bật tự động duyệt? Bài autopilot sẽ được lên lịch công khai không cần anh duyệt – chỉ cho nền tảng đã có đủ bài duyệt tay.'))) return;
        try { A.cfg = (await ctx.sapi('POST', 'lk/auto/save', { cfg })).cfg; paint(); msg(M('✓ Đã lưu cài đặt'), true); } catch (e) { msg(err(e), false); }
      };
      $('#apRun').onclick = async () => {
        if (!confirm(M('Chạy 1 lượt autopilot ngay (tính vào ngân sách GrabCast hôm nay)?'))) return;
        $('#apRun').disabled = true; msg(M('Đang tải…'));
        try { const r = (await ctx.sapi('POST', 'lk/auto/run', {})).run || {}; await load(); msg(M('Xong: tạo {c} · lên lịch {s} · chờ duyệt {r} · {n} lượt GrabCast', { c: r.created || 0, s: r.scheduled || 0, r: r.review || 0, n: r.calls || 0 }), !r.stop); } catch (e) { msg(err(e), false); const b = $('#apRun'); if (b) b.disabled = false; }
      };
      $('#apProv').onclick = async () => {
        const m = $('#apMode').value; if (!confirm(M('Chuyển đường đăng FB/IG sang “{m}”?', { m: M(MODES[m]) }))) return;
        try { A.cfg = (await ctx.sapi('POST', 'lk/auto/provider', { mode: m })).cfg; await load(); msg(M('✓ Đã chuyển đường đăng'), true); } catch (e) { msg(err(e), false); }
      };
      $('#apTkSave').onclick = async () => {
        const ch = $('#apTkCh').value, tok = $('#apTkV').value.trim(); if (!ch || !tok) return;
        try { const o = await ctx.sapi('POST', 'lk/auto/token', { channel_id: ch, target_id: $('#apTkId').value.trim() || undefined, token: tok }); $('#apTkV').value = ''; await load(); msg(M('✓ Đã lưu token {n} (…{l})', { n: o.name || o.target_id || ch, l: o.last4 }), true); } catch (e) { $('#apTkV').value = ''; msg(err(e), false); }
      };
      box.querySelectorAll('[data-oa]').forEach(bt => { bt.onclick = async () => {
        const k = bt.dataset.k; if (!((A.meta || {}).apps || {})[k] || !A.meta.apps[k].secret) { msg(M('Cần App Secret trước khi kết nối.'), false); const d = box.querySelector('#apSec-' + k); if (d) { d.closest('details').open = true; d.focus(); } return; }
        try { msg(M('Đang mở trang đăng nhập Meta…')); const o = await ctx.sapi('POST', 'lk/auto/oauth/start', { kind: k, channel_id: bt.dataset.oa }); if (/^https:\/\/www\.(facebook|instagram)\.com\//.test(o.url || '')) location.assign(o.url); } catch (e) { msg(err(e), false); }
      }; });
      box.querySelectorAll('[data-sec]').forEach(bt => { bt.onclick = async () => {
        const k = bt.dataset.sec, inp = box.querySelector('#apSec-' + k), v = inp.value.trim(); if (!v) return;
        try { const o = await ctx.sapi('POST', 'lk/auto/app', { kind: k, secret: v }); inp.value = ''; await load(); msg(M('✓ Đã lưu App Secret {k} (…{l})', { k: k === 'ig' ? 'Instagram' : 'Facebook', l: o.last4 }), true); } catch (e) { inp.value = ''; msg(err(e), false); }
      }; });
      box.querySelectorAll('[data-tdel]').forEach(bt => { bt.onclick = async () => { if (!confirm(M('Xóa token Meta của kênh {c}?', { c: bt.dataset.tdel }))) return; try { await ctx.sapi('POST', 'lk/auto/token/del', { channel_id: bt.dataset.tdel }); await load(); } catch (e) { msg(err(e), false); } }; });
      box.querySelectorAll('[data-apv]').forEach(bt => { bt.onclick = async () => { if (!confirm(M('Duyệt bài này để đăng qua Meta đúng giờ đã xếp?'))) return; try { await ctx.sapi('POST', 'lk/auto/approve', { id: bt.dataset.apv }); await load(); msg(M('✓ Xong'), true); } catch (e) { msg(err(e), false); } }; });
      const rs = $('#apReset'); if (rs) rs.onclick = async () => { try { await ctx.sapi('POST', 'lk/auto/reset', {}); await load(); } catch (e) { msg(err(e), false); } };
      box.querySelectorAll('[data-gob]').forEach(bt => { bt.onclick = () => goBoard(bt.dataset.gob); });
      box.querySelectorAll('[data-pv]').forEach(bt => { bt.onclick = () => openPv(bt.dataset.pv); });
      pvPaint();
    }
    // ---- Xem trước từng nền tảng (lk/auto/preview: 0 lượt GrabCast, không ghi) ----
    async function openPv(clip) {
      S.pv = { clip, loading: true }; pvPaint(); const el = box.querySelector('#apPv'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      try { const r = await ctx.sapi('POST', 'lk/auto/preview', { clip }); if (!S.pv || S.pv.clip !== clip) return; const ps = ((r && r.preview) || {}).posts || []; S.pv = { clip, data: r.preview, tab: (ps[0] || {}).platform }; }
      catch (e) { if (S.pv && S.pv.clip === clip) S.pv = { clip, error: err(e) }; }
      pvPaint();
    }
    function pvPaint() {
      const el = box.querySelector('#apPv'); if (!el) return; const v = S.pv; if (!v) { el.innerHTML = ''; el.className = ''; return; }
      el.className = 'smg-pv'; el.setAttribute('aria-live', 'polite');
      const head = `<div class="smg-hd"><h4 style="margin:0">${esc(M('👁 Xem trước: {c}', { c: v.clip }))}</h4><button type="button" class="btn sm ghost" data-pvx>${M('Đóng')}</button></div><p class="tiny muted" style="margin:.2rem 0">${M('Chỉ xem trước – 0 lượt GrabCast, không đăng gì.')}</p>`;
      if (v.loading || v.error) { el.innerHTML = head + (v.error ? `<p class="small bad-t">${esc(v.error)}</p>` : `<p class="small muted">${M('Đang tải…')}</p>`); }
      else {
        const posts = (v.data && v.data.posts) || [], x = posts.find(q => q.platform === v.tab) || posts[0] || null, chs = A.channels || [];
        const tabs = `<div class="smg-ptabs" role="tablist" aria-label="${esc(M('Nền tảng'))}">${posts.map(q => `<button type="button" role="tab" data-pvt="${esc(q.platform)}" aria-selected="${!!x && q.platform === x.platform}">${PI[q.platform] || ''} ${esc(PN[q.platform] || q.platform)}${q.issues.some(i => /^error:/.test(i)) ? ' ⚠️' : ''}</button>`).join('')}</div>`;
        const whyT = w => { const m = /\((\w+)\)/.exec(w || ''); return /ngôn ngữ/.test(w || '') && m ? M('không có trang cùng ngôn ngữ ({l})', { l: m[1] }) : M('chưa nối kênh'); };
        const coverT = c => (/^cover_url/.test(c) ? M('Instagram: cover_url (đường Meta) – GrabCast chưa có tùy chọn bìa') : /^thumbnails/.test(c) ? M('YouTube: đặt ảnh bìa qua API trực tiếp') : /^không có/.test(c) ? M('Clip không có ảnh bìa') : M('GrabCast chưa có tùy chọn ảnh bìa'));
        const cnt = (n, max) => `<span class="smg-cnt ${n > max ? 'x' : n > max * 0.9 ? 'w' : ''}">${n}/${max}</span>`;
        const body = !x ? '' : `<div class="smg-lbl">${M('Trang đích')}</div><p class="small" style="margin:0">${x.channel_id ? `${PI[x.platform] || ''} <b>${esc((chs.find(c => c.channel_id === x.channel_id) || {}).title || x.channel_id)}</b>` : `<span class="bad-t">${M('Chưa có trang đích')}: ${esc(whyT(x.why))}</span>`} · <span class="tiny muted">${M('Ngôn ngữ clip')}: ${esc(String(v.data.lang || 'en').toUpperCase())}</span></p>
          ${x.title ? `<div class="smg-lbl">${M('Tiêu đề')} ${cnt([...x.title].length, 100)}</div><p class="small" style="margin:0;overflow-wrap:anywhere">${esc(x.title)}</p>` : ''}
          <div class="smg-lbl">${M('Caption')} ${cnt(x.caption_len, x.caption_max)}</div><div class="smg-cap">${esc(x.caption)}</div>
          <div class="smg-lbl">${M('Hashtag')}</div><div>${(x.hashtags || []).map(h => `<span class="smg-chip">${esc(h)}</span>`).join('') || '—'}</div>
          <div class="smg-lbl">${x.fc_mode === 'bio' ? M('Link bio (dán vào hồ sơ)') : M('Bình luận đầu')}</div>${x.fc_mode === 'bio' ? `<p class="small" style="margin:0;overflow-wrap:anywhere"><code>${esc(x.fc_link || '')}</code></p>` : x.first_comment ? `<div class="smg-cap">${esc(x.first_comment)}</div>` : `<p class="small muted" style="margin:0">${M('Không có (clip chưa có bình luận viết lúc sản xuất)')}</p>`}
          <div class="smg-lbl">${M('Ảnh bìa')}</div><p class="small" style="margin:0">${esc(coverT(x.cover || ''))}</p>
          <div class="smg-lbl">${M('Vấn đề')}</div>${x.issues.length ? `<div>${x.issues.map(i => { const [lv, code] = String(i).split(':'); return pill(lv === 'error' ? 'bad' : 'warn', ISS[code] ? M(ISS[code]) : code); }).join(' ')}</div>` : `<p class="small ok-t" style="margin:0">${M('Không có vấn đề.')}</p>`}`;
        el.innerHTML = head + tabs + body;
        el.querySelectorAll('[data-pvt]').forEach(b => { b.onclick = () => { S.pv.tab = b.dataset.pvt; pvPaint(); const t = box.querySelector(`[data-pvt="${b.dataset.pvt}"]`); if (t) t.focus(); }; });
      }
      const xb = el.querySelector('[data-pvx]'); if (xb) xb.onclick = () => { S.pv = null; pvPaint(); };
    }
    await load(); if (A && A.key) S.health(); await oauthReturn();
    /** Quay về từ /api/social/meta/callback (?meta=ok|pick|lỗi) hoặc link cảnh báo (?meta_reconnect=<kênh>) – xử lý 1 lần rồi xóa khỏi URL. */
    async function oauthReturn() {
      const q = new URLSearchParams(location.search), r = q.get('meta'), rc = q.get('meta_reconnect'); if (!r && !rc) return;
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* bỏ qua */ }
      const ERR = { 'bad-state': 'Phiên kết nối không hợp lệ hoặc đã hết hạn (10 phút) – bấm lại nút.', replay: 'Phiên kết nối không hợp lệ hoặc đã hết hạn (10 phút) – bấm lại nút.', denied: 'Anh đã từ chối hoặc hủy đăng nhập.', scope: 'Thiếu quyền – cho phép đủ các quyền được hỏi rồi thử lại.', 'no-page': 'Tài khoản này không quản lý Page nào có quyền đăng.', 'no-app-secret': 'Cần App Secret trước khi kết nối.' };
      if (rc) { const b = [...box.querySelectorAll('[data-oa]')].find(x => x.dataset.oa === rc); msg(M('Token kênh {c} cần kết nối lại – bấm 🔗 Kết nối lại.', { c: rc }), false); if (b) { b.scrollIntoView({ block: 'center' }); b.focus(); } return; }
      if (r === 'ok') { msg(M('✓ Đã kết nối {c}', { c: q.get('ch') || '' }), true); return; }
      if (r !== 'pick') { msg(M('Kết nối lỗi: {e}', { e: ERR[r] ? M(ERR[r]) : r }), false); return; }
      const id = q.get('id') || ''; let P; try { P = await ctx.sapi('POST', 'lk/auto/oauth/pages', { id }); } catch (e) { msg(err(e), false); return; }
      const el = box.querySelector('#apPick'); if (!el) return;
      el.innerHTML = `<div class="soc-form"><label>${esc(M('Chọn Page cho kênh {c}', { c: P.channel_id }))}<select id="apPickSel">${(P.pages || []).map(p => `<option value="${esc(p.id)}">${esc(p.name || p.id)} (${esc(p.id)})</option>`).join('')}</select></label><button type="button" class="btn sm" id="apPickGo">${M('✓ Chọn Page này')}</button></div>`;
      el.querySelector('#apPickGo').onclick = async () => { try { const o = await ctx.sapi('POST', 'lk/auto/oauth/pick', { id, page_id: el.querySelector('#apPickSel').value }); el.innerHTML = ''; await load(); msg(M('✓ Đã kết nối {c}', { c: o.name || o.target_id }), true); } catch (e) { msg(err(e), false); } };
    }
  }
  // ---- Bảng Kênh: 1 thẻ/nền tảng – trang đã nối + ngôn ngữ, sức khỏe/token, duyệt bài đầu, Kết nối (GrabCast popup / YouTube) + Tạm dừng toàn bộ ----
  function chanPanel(host, ctx, S) {
    const { M, esc, err, pill, when } = mk(ctx), A = S.A, c = A.cfg, chs = A.channels || [], toks = ((A.meta || {}).tokens) || [], hacc = S.H ? S.H.accounts : null;
    const plats = CH_PLATS.filter(p => PN[p]), mf = c.manual_first;
    const accRow = ch => {
      const h = hacc && hacc.find(a => String(a.id) === String(ch.account_id) && a.platform === ch.platform), f = h ? HFLAG.find(x => (h.flags || []).includes(x)) : null;
      const st = ch.unsynced ? pill('muted', M('chưa đồng bộ')) : ch.status === 'gone' ? pill('muted', M('Đã gỡ khỏi GrabCast')) : f ? pill(HS[f][0], M(HS[f][1])) : ch.status === 'error' ? pill('bad', M('Cần kết nối lại')) : pill('ok', M('Hoạt động'));
      const t = toks.find(x => x.channel_id === ch.channel_id), hx = t && t.health, exp = t && ((hx && hx.expires_at) || t.expires_at);
      const tok = !t ? '' : t.breaker ? pill('bad', M('Meta tạm dừng')) : (hx && !hx.ok) || (t.status && t.status !== 'ok') ? pill('bad', M('Token Meta cần kết nối lại')) : `<span class="tiny muted">${esc(exp ? M('Token Meta hết hạn {d}', { d: when(exp) }) : M('Token Meta không hết hạn'))}</span>`;
      const l = ch.lang || '', lt = l ? `${l.toUpperCase()} · ${LANGN[l] || l}` : '?';
      return `<li data-ch="${esc(ch.channel_id || '')}"><span>${esc(ch.title || ch.channel_id || '')}</span><span class="smg-chip" title="${esc(ch.lang_src === 'default' ? M('Không nhận ra ngôn ngữ từ tên – coi là trang chung tiếng Anh. Đặt tên “Lexkite <ngôn ngữ>” để định tuyến đúng.') : M('Ngôn ngữ trang: {l}', { l: lt }))}">🌐 ${esc(lt)}${ch.lang_src === 'default' ? ' ?' : ''}</span>${st}${tok}</li>`;
    };
    const listOf = p => {
      const xs = chs.filter(x => x.platform === p), have = new Set(xs.map(x => String(x.account_id)));
      const extra = ((ctx.D && ctx.D.accounts) || []).filter(a => String(a.platform) === p && !have.has(String(a.id))).map(a => ({ channel_id: '', platform: p, account_id: a.id, title: a.display_name || a.username || a.name || String(a.id), lang: '', unsynced: true }));
      return [...xs, ...extra];
    };
    const guide = p => `<div class="smg-guide" id="chG-${p}"><b class="small">${esc(M('Kết nối {p} trên GrabCast', { p: PN[p] }))}</b><ol class="smg-steps">
      <li>${M('Bấm <b>Mở GrabCast</b> (cửa sổ riêng) và đăng nhập grabcast.click.')}</li><li>${M('Chọn workspace <b>Lexkite (#{ws})</b> ở góc trên – bắt buộc, nếu không kênh sẽ vào workspace khác.', { ws: WS })}</li>
      <li>${M('Vào <b>Accounts</b> → bấm <b>Connect {p}</b>.', { p: esc(PN[p]) })}</li><li>${M(GSTEP[p])}</li>
      <li>${M('Đặt tên theo bộ 16 fanpage: <b>Lexkite</b> (tiếng Anh, trang chung) hoặc <b>Lexkite + tên ngôn ngữ</b>. Lexkite nhận ngôn ngữ từ tên để đăng đúng clip.')}</li><li>${M('Cấp đủ quyền được hỏi → Lưu, rồi đóng cửa sổ GrabCast: bảng Kênh tự làm mới.')}</li></ol>
      <div class="tiny muted">${M('Tên trang:')}</div><div class="smg-names">${Object.keys(LANGN).map(k => `<span class="smg-chip" lang="${k}">${esc(k === 'en' ? 'Lexkite' : 'Lexkite ' + LANGN[k])}</span>`).join('')}</div>
      <button type="button" class="btn sm primary" data-gco="${p}">${M('Mở GrabCast ↗')}</button></div>`;
    const card = p => {
      const xs = listOf(p), on = p === 'youtube' ? !!(c.plats.youtube || A.yt_via_gc) : !!c.plats[p], m = +((A.manual || {})[p]) || 0;
      const rv = (A.upcoming || []).find(r => r.platform === p && r.board === 'review' && r.board_id);
      const first = on && m < mf ? `<div class="smg-first">${pill('warn', M('Chờ anh duyệt bài đầu'))}<span class="tiny">${M('Đã duyệt tay {m}/{n}', { m, n: mf })}</span>${rv ? `<button type="button" class="btn sm primary" data-gob="${esc(rv.board_id)}">${M('✅ Duyệt bài đầu')}</button>` : `<span class="tiny muted">${M('Chưa có bài chờ duyệt – bài đầu tiên sẽ vào cột Chờ duyệt để anh duyệt.')}</span>`}</div>` : '';
      const yt = p !== 'youtube' ? '' : `<div class="smg-yt"><p class="small" style="margin:0"><b>${M('Qua GrabCast: chờ GrabCast được YouTube duyệt')}</b></p>${(A.yt_gc_channels || []).length ? `<p class="tiny muted" style="margin:.15rem 0">${esc(M('Kênh YouTube trên GrabCast: {s}', { s: A.yt_gc_channels.map(x => x.title || x.channel_id).join(', ') }))}</p>` : ''}
        <label class="row small" style="gap:.4rem;align-items:center;margin:.3rem 0"><input type="checkbox" id="chYtAuto" ${c.yt_gc_auto !== false ? 'checked' : ''}><span>${M('Tự bật YouTube khi có kênh YouTube trên GrabCast (bài đầu vẫn chờ anh duyệt)')}</span></label>
        <a class="btn sm ghost" href="#video" data-ytman>${M('🎬 Trong lúc chờ: YouTube thủ công')}</a><p class="tiny muted" style="margin:.2rem 0">${M('Tab Video › Gói chờ đăng tay: tải gói, chép tiêu đề/mô tả/thẻ/hashtag/giờ hẹn, mở Studio.')}</p>
        <details><summary>${M('Dự phòng: API YouTube trực tiếp')}</summary><p class="tiny warn-t" style="margin:.3rem 0">⚠️ ${M('Chỉ dùng khi thật cần: app chưa qua audit của Google nên video tải bằng API bị khóa Riêng tư và KHÔNG chuyển Công khai được (phải tải lại).')}</p>${(A.yt_direct || []).length ? `<p class="tiny muted" style="margin:.2rem 0">${esc(M('Kênh API: {s}', { s: A.yt_direct.map(x => (x.title || x.channel_id) + (x.status && x.status !== 'ok' ? ' (' + x.status + ')' : '')).join(', ') }))}</p>` : ''}<button type="button" class="btn sm ghost" data-ytapi>${M('🔗 Kết nối API trực tiếp')}</button></details></div>`;
      return `<article class="smg-pc" data-plat="${p}"><header><span class="smg-pi" aria-hidden="true">${PI[p]}</span><b>${PN[p]}</b>${xs.length ? pill('ok', M('Đã nối {n}', { n: xs.length })) : pill('muted', M('Chưa kết nối'))}${pill(on ? 'info' : 'muted', M(on ? 'Autopilot bật' : 'Autopilot tắt'))}</header>
        ${first}${xs.length ? `<ul class="smg-accs">${xs.map(accRow).join('')}</ul>` : `<p class="tiny muted" style="margin:0">${M('Chưa có trang nào.')}</p>`}
        <div class="smg-acts"><button type="button" class="btn sm ${xs.length ? '' : 'primary'}" data-gc="${p}">${M('🔗 Kết nối')}</button><button type="button" class="btn sm ghost" data-guide="${p}" aria-expanded="${S.guide === p}" aria-controls="chG-${p}">${M('📋 Hướng dẫn')}</button></div>
        ${S.guide === p ? guide(p) : ''}${yt}</article>`;
    };
    const pr = S.pauseRes, prHtml = !pr ? '' : `<div class="smg-res" role="status">${esc(M('✓ Đã tạm dừng toàn bộ: gỡ lịch {u} bài · còn {l} bài chưa gỡ.', { u: pr.unscheduled || 0, l: pr.left || 0 }))}${(pr.errors || []).length ? `<div class="bad-t">${esc(M('Lỗi gỡ lịch: {e}', { e: pr.errors.map(e => `${e.post_id} (${e.status}${e.code ? ' ' + e.code : ''})`).join(', ') }))}</div>` : ''}${pr.left > 0 ? `<button type="button" class="btn sm smg-stop" id="chMore" style="margin-top:.4rem">${M('⏸ Gỡ tiếp {n} bài', { n: pr.left })}</button>` : ''}</div>`;
    host.innerHTML = `<div class="smg-hd"><h3>${M('📡 Kênh')}</h3><div class="acts"><button type="button" class="btn sm ghost" id="chRe">${M('🔄 Làm mới kênh')}</button>${c.on ? `<button type="button" class="btn sm smg-stop" id="chPause">${M('⏸ Tạm dừng toàn bộ')}</button>` : ''}</div></div>
      ${c.on ? '' : `<div class="smg-banner" role="status" id="chPaused"><div><b>${M('⏸ Đang tạm dừng')}</b><p class="small">${M('Autopilot không tạo, không lên lịch bài nào cho tới khi anh bấm Chạy lại. Bài đã gỡ lịch nằm ở cột Chờ duyệt.')}</p></div><button type="button" class="btn primary" id="chResume">${M('▶️ Chạy lại')}</button></div>`}
      ${prHtml}<p class="small" id="chM" role="status" aria-live="polite">${esc(S.chMsg ? S.chMsg[0] : '')}</p><div class="smg-chs">${plats.map(card).join('')}</div>`;
    if (S.chMsg) host.querySelector('#chM').className = 'small ' + (S.chMsg[1] === true ? 'ok-t' : S.chMsg[1] === false ? 'bad-t' : 'muted');
    const $ = q => host.querySelector(q), msg = (t, k) => { S.chMsg = [t, k]; const m = $('#chM'); if (m) { m.textContent = t; m.className = 'small ' + (k === true ? 'ok-t' : k === false ? 'bad-t' : 'muted'); } };
    const pauseAll = async ask => {
      if (ask && !confirm(M(PAUSE_Q))) return;
      msg(M('Đang tải…')); try { S.pauseRes = await ctx.sapi('POST', 'lk/auto/pause_all', {}); S.chMsg = null; await S.load(); } catch (e) { msg(err(e), false); }
    };
    if ($('#chPause')) $('#chPause').onclick = () => pauseAll(true);
    if ($('#chMore')) $('#chMore').onclick = () => pauseAll(true);
    if ($('#chResume')) $('#chResume').onclick = async () => {
      if (!confirm(M('Chạy lại autopilot? Lượt nền kế tiếp (mỗi 2 giờ) sẽ lấy bài đến hạn. Bài đã gỡ lịch nằm ở cột Chờ duyệt – anh duyệt lại để đăng.'))) return;
      try { await ctx.sapi('POST', 'lk/auto/save', { cfg: { on: true } }); S.pauseRes = null; S.chMsg = [M('✓ Autopilot đã chạy lại.'), true]; await S.load(); } catch (e) { msg(err(e), false); }
    };
    const yta = $('#chYtAuto'); if (yta) yta.onchange = async () => { try { await ctx.sapi('POST', 'lk/auto/save', { cfg: { yt_gc_auto: yta.checked } }); S.chMsg = [M('✓ Đã lưu cài đặt'), true]; await S.load(); } catch (e) { yta.checked = !yta.checked; msg(err(e), false); } };
    host.querySelectorAll('[data-gob]').forEach(b => { b.onclick = () => S.goBoard(b.dataset.gob); });
    host.querySelectorAll('[data-guide]').forEach(b => { b.onclick = () => { S.guide = S.guide === b.dataset.guide ? null : b.dataset.guide; chanPanel(host, ctx, S); }; });
    host.querySelectorAll('[data-gc],[data-gco]').forEach(b => { b.onclick = () => connect(b.dataset.gc || b.dataset.gco); });
    const ya = host.querySelector('[data-ytapi]'); if (ya) ya.onclick = async () => {
      if (!ctx.yapi) { location.hash = '#video'; return; }
      try { msg(M('Đang mở trang đăng nhập Google…')); const r = await ctx.yapi('connect'); if (/^https:\/\/accounts\.google\.com\//.test((r && r.url) || '')) location.assign(r.url); } catch (e) { msg(M('Kết nối YouTube lỗi: {e}', { e: (e && (e.code || e.message)) || e }), false); }
    };
    /** Làm mới sau khi nối kênh: 1 lượt GET accounts → dist_ext (lk/auto/channels/sync) + danh sách tài khoản admin + sức khỏe, báo kênh mới. */
    async function refresh() {
      if (S.busy) return; S.busy = true; const before = new Set(((S.A && S.A.channels) || []).map(x => x.channel_id)); msg(M('Đang làm mới kênh…')); let syncErr = null;
      try { await ctx.sapi('POST', 'lk/auto/channels/sync', {}); } catch (e) { syncErr = e; }
      try { if (ctx.reloadAccounts) await ctx.reloadAccounts(); await S.load(); await S.health(); } finally { S.busy = false; }
      const nw = ((S.A && S.A.channels) || []).filter(x => !before.has(x.channel_id));
      if (syncErr) msg(M('Không đồng bộ được GrabCast ({e}) – hiện dữ liệu đã lưu.', { e: err(syncErr) }), false);
      else if (nw.length) msg(M('✓ Kênh mới: {s}', { s: nw.map(x => `${PI[x.platform] || ''} ${x.title} (${String(x.lang || 'en').toUpperCase()})`).join(', ') }), true);
      else msg(M('✓ Đã làm mới – chưa thấy kênh mới.'), true);
    }
    S.refresh = refresh; $('#chRe').onclick = refresh;
    /** Kết nối: API GrabCast chặn connect/* với khóa API (403 api_key_not_allowed) → anh nối trên grabcast.click trong popup; đóng popup / quay lại tab → tự làm mới. */
    function connect(p) {
      S.guide = p; // YouTube qua GrabCast cũng mở trang Accounts – bước hướng dẫn nói rõ chỉ nối sau khi GrabCast được YouTube duyệt
      const w = window.open(GC_ACC, 'gc-connect', 'width=1100,height=800');
      chanPanel(host, ctx, S);
      if (!w) return msg(M('Trình duyệt chặn cửa sổ bật lên – bấm Mở GrabCast trong hướng dẫn hoặc cho phép popup.'), false);
      msg(M('⏳ Đang chờ anh kết nối trong cửa sổ GrabCast… đóng cửa sổ khi xong, bảng tự làm mới.'));
      stopWatch(); const t0 = Date.now(), W = S.watch = { w };
      W.onFocus = () => { if (S.watch === W && Date.now() - (W.last || 0) > 5000) { W.last = Date.now(); refresh(); } };
      window.addEventListener('focus', W.onFocus);
      W.iv = setInterval(() => {
        if (!host.isConnected) return stopWatch();
        if (w.closed) { stopWatch(); W.last = Date.now(); refresh(); return; }
        if (Date.now() - t0 > 15 * 60e3) { stopWatch(); msg(M('Hết 15 phút chờ – bấm Làm mới kênh khi đã kết nối xong.'), false); }
      }, 1000);
    }
    function stopWatch() { const W = S.watch; if (!W) return; clearInterval(W.iv); window.removeEventListener('focus', W.onFocus); S.watch = null; }
  }

  // ---- Nhật ký lỗi: state.log (bền, ≤ 50) mới nhất trước + lý do bỏ qua của lượt chạy cuối (đã dịch) ----
  function logPanel(host, ctx, S) {
    const { M, esc, when } = mk(ctx), st = S.A.state || {}, log = [...(st.log || [])].sort((a, b) => (+b.at || 0) - (+a.at || 0)), sk = ((st.last_run || {}).skipped) || [];
    const groups = new Map(); for (const x of sk) { const k = String(x.why || ''); const g = groups.get(k) || groups.set(k, { why: k, n: 0, ex: [] }).get(k); g.n++; if (x.clip && g.ex.length < 3) g.ex.push(x.clip + (x.ch ? ' → ' + x.ch : '')); }
    const kLbl = k => { const b = String(k || '').split(':')[0]; return LOGK[b] ? M(LOGK[b]) : b; };
    host.innerHTML = `<div class="smg-hd"><h3>${M('🧾 Nhật ký lỗi')}</h3></div><p class="tiny muted">${M('Lỗi bền của autopilot (50 mục gần nhất) và lý do bỏ qua ở lượt chạy cuối – mới nhất ở trên.')}</p>
      <div class="smg-lbl">${M('Lỗi gần đây')}</div>${log.length ? `<ol class="smg-log" id="lgErr">${log.map(e => `<li data-at="${+e.at || 0}"><time datetime="${e.at ? new Date(+e.at).toISOString() : ''}">${esc(when(e.at))}</time><span><b>${esc(kLbl(e.k))}</b> · ${esc(e.text || '')}</span></li>`).join('')}</ol>` : `<p class="small ok-t">${M('Chưa có lỗi nào.')}</p>`}
      <div class="smg-lbl">${M('Lần chạy cuối bỏ qua')}${st.last_run ? ' · ' + esc(when(st.last_run.at)) : ''}</div>${groups.size ? `<ul class="smg-log" id="lgSkip">${[...groups.values()].sort((a, b) => b.n - a.n).map(g => { const [t, v] = skipWhy(g.why); return `<li class="sk" data-why="${esc(g.why)}"><span class="n">${g.n}×</span><span>${esc(M(t, v))}${g.ex.length ? `<br><span class="tiny muted">${esc(g.ex.join(' · '))}</span>` : ''}</span></li>`; }).join('')}</ul>` : `<p class="small muted">${M('Lần chạy cuối không bỏ qua bài nào.')}</p>`}`;
  }

  async function queue(el, ctx) {
    const { M, esc, err, accN } = mk(ctx); let R = null, plan = null, sel = ctx.LS.get('qacc', null);
    el.innerHTML = `<section class="card smg-ch" id="smgCh" aria-live="polite"><p class="small muted">${M('Đang tải…')}</p></section><section class="card smg-ap" id="smgAP"><p class="small muted">${M('Đang tải…')}</p></section><section class="card smg-lg" id="smgLog"></section><section class="card"><h3 style="margin-top:0">${M('🤖 Hàng đợi tự động')}</h3><p class="small muted">${M('Rải clip ĐÃ DUYỆT trong kho Lexkite vào khung giờ vàng từng kênh, theo trần/ngày, giãn cách và chống trùng. Kết quả là bài NHÁP chờ duyệt – không tự đăng.')}</p>
      <div id="smgR"><p class="small muted">${M('Đang tải…')}</p></div><div class="row" style="gap:.4rem;margin-top:.6rem"><button type="button" class="btn sm" id="smgPlan">${M('📋 Lập kế hoạch')}</button><button type="button" class="btn sm ghost" id="smgCsv">${M('⬆️ Nhập CSV')}</button><button type="button" class="btn sm primary" id="smgGo" disabled>${M('Tạo {n} bài nháp & gửi duyệt', { n: 0 })}</button></div>
      <p class="small" id="smgQm" role="status" aria-live="polite"></p><div id="smgOut" class="smg-scroll"></div></section>`;
    const $ = s => el.querySelector(s), msg = (t, c) => { const m = $('#smgQm'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const accs = () => (ctx.D.accounts || []).filter(a => PN[String(a.platform)]);
    autoCard($('#smgAP'), ctx);
    try { R = (await ctx.sapi('GET', 'lk/rules')).rules; } catch (e) { return msg(err(e), false); }
    if (!sel) sel = accs().map(a => String(a.id));
    const paintR = () => {
      $('#smgR').innerHTML = `<details open><summary class="small" style="font-weight:600">${M('Luật chống spam')}</summary><p class="tiny muted">${M('Đây là trần riêng của Lexkite (chống spam), luôn thấp hơn trần nền tảng.')}</p>
        <div class="soc-form">${Object.keys(PN).map(p => `<label>${PI[p]} ${PN[p]} – ${M('Tối đa/ngày')}<input type="number" min="0" max="2" data-pd="${p}" value="${R.perDay[p] || 0}"></label>`).join('')}
        <label>${M('Giãn cách tối thiểu (giờ)')}<input type="number" min="1" max="24" id="rGap" value="${R.minGapH}"></label><label>${M('Khung giờ (giờ địa phương của kênh)')}<input id="rH" value="${esc(R.hours.join(', '))}"></label>
        <label>${M('Múi giờ mặc định')}<input id="rTz" value="${esc(R.tz)}"></label><label>${M('Không lặp clip trên cùng kênh (ngày)')}<input type="number" min="1" max="365" id="rDup" value="${R.dupDays}"></label>
        <label>${M('Số ngày lập kế hoạch')}<input type="number" min="1" max="31" id="rDays" value="${R.days}"></label><label class="row" style="gap:.3rem"><input type="checkbox" id="rWe" ${R.skipWeekend ? 'checked' : ''}>${M('Bỏ thứ 7, CN')}</label></div>
        <div class="small" style="font-weight:600;margin:.5rem 0 .2rem">${M('Kênh')}</div><div class="soc-targets">${accs().map(a => `<label><input type="checkbox" data-acc value="${esc(a.id)}" ${sel.includes(String(a.id)) ? 'checked' : ''}> ${esc(accN(a.id))} <input data-tz="${esc(a.id)}" placeholder="${esc(M('Múi giờ'))}" value="${esc(R.tzBy[a.id] || '')}" style="width:11em"></label>`).join('')}</div>
        <button type="button" class="btn sm ghost" id="rSave" style="margin-top:.5rem">${M('💾 Lưu luật')}</button></details>`;
      $('#rSave').onclick = async () => { readR(); try { R = (await ctx.sapi('POST', 'lk/rules/save', { rules: R })).rules; msg(M('✓ Đã lưu luật'), true); paintR(); } catch (e) { msg(err(e), false); } };
    };
    const readR = () => {
      const perDay = {}; el.querySelectorAll('[data-pd]').forEach(i => { perDay[i.dataset.pd] = +i.value || 0; }); const tzBy = {}; el.querySelectorAll('[data-tz]').forEach(i => { if (i.value.trim()) tzBy[i.dataset.tz] = i.value.trim(); });
      R = { ...R, perDay, tzBy, minGapH: +$('#rGap').value, hours: $('#rH').value.split(/[,\s]+/).map(Number).filter(Number.isFinite), tz: $('#rTz').value.trim(), dupDays: +$('#rDup').value, days: +$('#rDays').value, skipWeekend: $('#rWe').checked };
      sel = [...el.querySelectorAll('[data-acc]:checked')].map(i => i.value); ctx.LS.set('qacc', sel);
    };
    paintR();
    $('#smgPlan').onclick = async () => {
      readR(); msg(M('Đang tải…'));
      try {
        await ctx.sapi('POST', 'lk/rules/save', { rules: R });
        const r = await ctx.sapi('POST', 'lk/queue/plan', { accounts: sel, max: 120 }), g = groupSlots(r.slots || []);
        plan = { groups: g.map(x => ({ ...x, st: '' })), clips: r.clips || {} };
        const d = (r.skipped || []).filter(x => x.why === 'duplicate').length, s = (r.skipped || []).filter(x => x.why === 'no-slot').length;
        msg(g.length ? M('Bỏ qua: {d} trùng · {s} hết khung', { d, s }) : M('Chưa có clip đã duyệt nào cần xếp.'), g.length ? null : false);
        const go = $('#smgGo'); go.disabled = !g.length; go.textContent = M('Tạo {n} bài nháp & gửi duyệt', { n: g.length }); paintPlan();
      } catch (e) { msg(err(e), false); }
    };
    const paintPlan = () => { $('#smgOut').innerHTML = `<table class="soc-tbl"><thead><tr><th>${M('Giờ')}</th><th>${M('Clip')}</th><th>${M('Kênh')}</th><th>${M('Trạng thái')}</th></tr></thead><tbody>${plan.groups.map((g, i) => `<tr data-row="${i}"><td>${esc(ctx.both(g.at))}</td><td>${esc((plan.clips[g.clip] || {}).title || g.clip)}<div class="tiny muted">${esc([(plan.clips[g.clip] || {}).template, (plan.clips[g.clip] || {}).hook].filter(Boolean).join(' · '))}</div></td><td>${g.account_ids.map(a => esc(accN(a))).join('<br>')}</td><td class="st">${esc(g.st)}</td></tr>`).join('')}</tbody></table>`; };
    $('#smgCsv').onclick = () => { // nhập hàng loạt (CSV / dán từ Google Sheets): clip,account_ids(;),giờ ISO
      const { d, shut } = ctx.modal('soc-dlg', `<form method="dialog" class="card" style="min-width:min(560px,92vw)"><h3>${M('⬆️ Nhập CSV')}</h3><label class="small">${M('Mỗi dòng: clip_id,kênh1;kênh2,2026-10-30T19:00 (giờ máy bạn). Dán được từ Google Sheets.')}<textarea id="qTx" rows="8" style="width:100%"></textarea></label><div class="row" style="gap:.4rem;justify-content:flex-end;margin-top:.5rem"><button type="button" class="btn ghost" data-x>${M('Hủy')}</button><button type="submit" class="btn primary">${M('Nhập')}</button></div></form>`, M('⬆️ Nhập CSV'));
      d.querySelector('form').onsubmit = ev => { ev.preventDefault(); const g = parseQueueCsv(d.querySelector('#qTx').value); shut(); plan = { groups: g.map(x => ({ ...x, st: '' })), clips: {} }; const go = $('#smgGo'); go.disabled = !g.length; go.textContent = M('Tạo {n} bài nháp & gửi duyệt', { n: g.length }); paintPlan(); };
    };
    $('#smgGo').onclick = async () => {
      if (!plan || !plan.groups.length || !confirm(M('Tạo {n} bài nháp trên GrabCast (đẩy video lên kho GrabCast) và đưa vào cột Chờ duyệt?', { n: plan.groups.length }))) return;
      const go = $('#smgGo'); go.disabled = true; let ok = 0; const idem = 'q' + uid().slice(0, 20);
      for (let i = 0; i < plan.groups.length; i++) { // 1 nhóm/lượt (mỗi lượt đẩy video lớn) – bảng cập nhật dần
        const g = plan.groups[i]; g.st = '⏳'; paintPlan();
        try { const r = await ctx.sapi('POST', 'lk/queue/apply', { items: [g] }, { idem: idem + '-' + i }), x = (r.results || [])[0] || {}; g.st = x.ok ? '✓' : '✗ ' + (x.error || ''); if (x.ok) ok++; }
        catch (e) { g.st = '✗ ' + ctx.errText(e).slice(0, 100); if (e && (e.code === 'grabcast-rate' || e.code === 'too-fast')) { paintPlan(); break; } }
        paintPlan(); if (!ctx.alive()) return;
      }
      msg(M('Xong {ok}/{n}.', { ok, n: plan.groups.length }), ok === plan.groups.length); plan = null; ctx.reloadPosts && ctx.reloadPosts();
    };
  }

  // ======================= SỨC KHỎE KÊNH =======================
  async function health(el, ctx) {
    const { M, esc, err, pill } = mk(ctx); let H = null; const F = ctx.LS.get('hf', { p: '', s: '', g: 'platform', sort: 'name' });
    el.innerHTML = `<section class="card"><h3 style="margin-top:0">${M('🩺 Sức khỏe kênh')}</h3><p class="small muted">${M('YouTube trên GrabCast đang “Riêng tư đến khi được duyệt”: bài lên ở chế độ private cho tới khi Google duyệt app GrabCast. TikTok đã được duyệt: bài lên công khai.')}</p>
      <div class="smg-flt"><select id="hP" aria-label="${esc(M('Nền tảng'))}"><option value="">${M('Tất cả nền tảng')}</option>${Object.keys(PN).map(p => `<option value="${p}" ${F.p === p ? 'selected' : ''}>${PN[p]}</option>`).join('')}</select>
      <select id="hS" aria-label="${esc(M('Trạng thái'))}"><option value="">${M('Mọi trạng thái')}</option>${Object.keys(HS).map(s => `<option value="${s}" ${F.s === s ? 'selected' : ''}>${M(HS[s][1])}</option>`).join('')}</select>
      <label class="small">${M('Nhóm theo')} <select id="hG"><option value="">${M('Không nhóm')}</option><option value="platform" ${F.g === 'platform' ? 'selected' : ''}>${M('Nền tảng')}</option><option value="group" ${F.g === 'group' ? 'selected' : ''}>${M('Nhóm')}</option></select></label>
      <label class="small">${M('Sắp xếp')} <select id="hO"><option value="name">${M('Tên')}</option><option value="used" ${F.sort === 'used' ? 'selected' : ''}>${M('Dùng 24 giờ')}</option><option value="last" ${F.sort === 'last' ? 'selected' : ''}>${M('Bài gần nhất')}</option></select></label>
      <button type="button" class="btn sm" id="hRe">${M('🔄 Tải lại')}</button></div><div id="hOut" class="smg-scroll"><p class="small muted">${M('Đang tải…')}</p></div></section>
      <section class="card"><h3 style="margin-top:0">${M('🔗 Kết nối kênh')}</h3><p class="small muted">${M('Đăng nhập dùng app Meta đã được duyệt của GrabCast – Lexkite không cần app Meta riêng.')}</p>
      <div class="row" style="gap:.4rem;flex-wrap:wrap"><button type="button" class="btn sm primary" data-conn="meta">📘📸 ${M('Kết nối Facebook & Instagram')}</button><button type="button" class="btn sm" data-conn="tiktok">🎵 ${M('Kết nối TikTok')}</button><button type="button" class="btn sm" data-conn="youtube">▶️ ${M('Kết nối YouTube')}</button><button type="button" class="btn sm" data-conn="threads">🧵 ${M('Kết nối Threads')}</button></div>
      <p class="small" id="hCm" role="status" aria-live="polite"></p>
      <details><summary class="small" style="font-weight:600">${M('Việc anh cần làm (1 lần)')}</summary><ol class="small"><li>${M('Trên GrabCast chọn workspace <b>Lexkite (#{ws})</b> ở góc trên (bắt buộc – nếu không kênh sẽ vào workspace khác).', { ws: WS })}</li><li>${M('Accounts → Facebook → đăng nhập Facebook bằng tài khoản quản trị Page Lexkite → tích <b>Page Lexkite</b> và <b>Instagram Lexkite</b> (IG phải là Business/Creator và đã liên kết Page).')}</li><li>${M('Cấp đủ quyền Meta đề nghị (đăng bài, số liệu, bình luận) → Lưu.')}</li><li>${M('Quay lại đây: kênh mới tự hiện trong bảng, cửa sổ GrabCast tự đóng.')}</li></ol></details></section>`;
    const $ = s => el.querySelector(s), cm = (t, c) => { const m = $('#hCm'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { H = await ctx.sapi('GET', 'lk/health'); paint(); return H; } catch (e) { $('#hOut').innerHTML = `<p class="small bad-t">${esc(err(e))}</p>`; return null; } };
    const bar = a => { const r = a.cap ? a.used / a.cap : 0; return `<div class="smg-bar" title="${a.used}/${a.cap}"><i class="${r >= 1 ? 'b' : r >= 0.8 ? 'w' : ''}" style="width:${Math.min(100, Math.round(r * 100))}%"></i></div><span class="tiny">${a.used}/${a.cap}</span>`; };
    const row = a => `<tr><td><b>${esc(PI[a.platform] || '•')} ${esc(a.name)}</b>${a.username ? `<div class="tiny muted">@${esc(a.username)}</div>` : ''}</td><td>${a.flags.filter(f => HS[f]).map(f => pill(HS[f][0], M(HS[f][1]))).join(' ') || pill('ok', M('Hoạt động'))}${a.state === 'reconnect' ? ` <a class="btn sm ghost" href="${GC_ACC}" target="_blank" rel="noopener">${M('Kết nối lại ↗')}</a>` : ''}</td>
      <td>${bar(a)}</td><td class="tiny">${a.last ? esc(ctx.both(Date.parse(a.last))) : '–'}</td><td class="tiny">${a.expires_at ? esc(new Date(a.expires_at).toLocaleDateString()) : '–'}</td>
      <td>${[['publish', 'đăng'], ['insights', 'số liệu'], ['comments_read', 'đọc bình luận'], ['comments_reply', 'trả lời'], ['first_comment', 'bình luận đầu']].map(([k, t]) => `<span class="smg-chip">${a.perms[k] ? '✓' : '✗'} ${M(t)}</span>`).join('')}${a.missing.length ? `<div class="tiny bad-t">${esc(M('thiếu quyền: {s}', { s: a.missing.join(', ') }))}</div>` : ''}</td></tr>`;
    function paint() {
      if (!H) return; let xs = H.accounts.filter(a => (!F.p || a.platform === F.p) && (!F.s || a.flags.includes(F.s) || a.state === F.s));
      xs = xs.sort(F.sort === 'used' ? (a, b) => b.used / b.cap - a.used / a.cap : F.sort === 'last' ? (a, b) => String(b.last || '').localeCompare(String(a.last || '')) : (a, b) => a.name.localeCompare(b.name));
      if (!H.accounts.length) { $('#hOut').innerHTML = `<p class="small muted">${M('Workspace Lexkite (#{ws}) chưa có kênh nào.', { ws: WS })}</p>`; return; }
      const groups = new Map(); for (const a of xs) { const k = F.g === 'platform' ? PN[a.platform] || a.platform : F.g === 'group' ? (a.group && (a.group.name || a.group)) || M('(chưa nhóm)') : ''; (groups.get(k) || groups.set(k, []).get(k)).push(a); }
      const head = `<thead><tr><th>${M('Kênh')}</th><th>${M('Trạng thái')}</th><th>${M('24 giờ')}</th><th>${M('Bài gần nhất')}</th><th>${M('Hết hạn')}</th><th>${M('Quyền')}</th></tr></thead>`;
      $('#hOut').innerHTML = [...groups].map(([k, as]) => `${k ? `<h4 style="margin:.6rem 0 .2rem">${esc(k)} <span class="muted small">${as.length}</span></h4>` : ''}<table class="soc-tbl">${head}<tbody>${as.map(row).join('')}</tbody></table>`).join('');
    }
    const save = () => ctx.LS.set('hf', F);
    $('#hP').onchange = e => { F.p = e.target.value; save(); paint(); }; $('#hS').onchange = e => { F.s = e.target.value; save(); paint(); };
    $('#hG').onchange = e => { F.g = e.target.value; save(); paint(); }; $('#hO').onchange = e => { F.sort = e.target.value; save(); paint(); }; $('#hRe').onclick = load;
    // Kết nối: API GrabCast không cho mở OAuth bằng khóa API → mở trang kết nối GrabCast trong popup, dò kênh mới mỗi 5 giây, tự đóng popup.
    let poll = null;
    el.querySelector('.row [data-conn]').parentElement.onclick = async e => {
      const b = e.target.closest('[data-conn]'); if (!b) return;
      const w = window.open(GC_ACC, 'gcConnect', 'popup,width=560,height=720'); if (!w) return cm(M('Trình duyệt chặn cửa sổ bật lên – cho phép popup rồi bấm lại.'), false);
      const before = (H && H.accounts) || []; cm(M('⏳ Đang chờ kết nối trong cửa sổ GrabCast… (tự nhận kênh mới)')); clearInterval(poll); const t0 = Date.now();
      poll = setInterval(async () => {
        if (!el.isConnected || Date.now() - t0 > 10 * 60e3) { clearInterval(poll); if (el.isConnected) cm(M('Hết thời gian chờ – bấm Tải lại khi đã kết nối xong.'), false); return; }
        let h; try { h = await ctx.sapi('GET', 'lk/health'); } catch (e2) { return; }
        const nw = newAccounts(before, h.accounts || []);
        if (nw.length) { clearInterval(poll); H = h; paint(); try { w.close(); } catch (e3) { /* popup khác origin */ } cm(M('✓ Đã thêm {n} kênh: {s}', { n: nw.length, s: nw.map(a => a.name).join(', ') }), true); ctx.reloadAccounts && ctx.reloadAccounts(); }
        else if (w.closed && Date.now() - t0 > 15e3) { clearInterval(poll); cm(M('Hết thời gian chờ – bấm Tải lại khi đã kết nối xong.'), false); }
      }, 5000);
    };
    load();
  }

  // ======================= PHÂN TÍCH =======================
  async function stats(el, ctx) {
    const { M, esc, err } = mk(ctx); let D = null, by = ctx.LS.get('sby', 'template');
    el.innerHTML = `<section class="card"><h3 style="margin-top:0">${M('📈 Phân tích')}</h3><p class="small muted">${M('Khóa API GrabCast chưa được đọc số liệu (insights) – Lexkite lấy lượt xem web + số anh nhập; khi GrabCast mở quyền, nút Đồng bộ tự lấy.')}</p>
      <div class="smg-flt"><select id="sBy">${[['post', 'Theo bài'], ['account', 'Theo kênh'], ['template', 'Theo template'], ['hook', 'Theo hook'], ['cefr', 'Theo độ khó'], ['len', 'Theo độ dài'], ['hour', 'Theo giờ đăng']].map(([k, t]) => `<option value="${k}" ${by === k ? 'selected' : ''}>${M(t)}</option>`).join('')}</select>
      <button type="button" class="btn sm" id="sSync">${M('🔄 Đồng bộ số liệu')}</button><button type="button" class="btn sm ghost" id="sCsv">${M('⬆️ Nhập CSV')}</button><button type="button" class="btn sm ghost" id="sExp">${M('⬇️ Xuất báo cáo CSV')}</button></div><p class="small" id="sMsg" role="status" aria-live="polite"></p><div id="sOut"><p class="small muted">${M('Đang tải…')}</p></div></section>`;
    const $ = s => el.querySelector(s), msg = (t, c) => { const m = $('#sMsg'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { D = await ctx.sapi('GET', 'lk/metrics'); paint(); } catch (e) { msg(err(e), false); } };
    const n = x => (+x || 0).toLocaleString();
    function al() { // cảnh báo phân tích (kênh 0 view, video bị gỡ, quota) – nằm trong Quản trị, không cần mở issue
      const xs = D.alerts || []; return xs.length ? `<div class="card" role="alert" style="border-color:var(--a-warn)"><b>⚠️ ${M('Cảnh báo phân tích')}</b><ul class="small" style="margin:.3rem 0 0;padding-left:1rem">${xs.map(a => `<li>${esc(a.text)}</li>`).join('')}</ul></div>` : '';
    }
    function tb() { // top/bottom 5 bài (video có số liệu) + video bị gỡ
      const vs = sumBy((D.rows || []).filter(r => r.platform !== 'web' && r.post_id), r => r.post_id).filter(x => x.k !== '–'), gone = (D.vmeta || []).filter(v => v.missing);
      const list = (xs) => xs.map(x => `<li>${esc(x.k)} · <b>${n(x.views)}</b></li>`).join('');
      return vs.length ? `<div class="smg-kpi"><div><span class="tiny muted">${M('Top 5')}</span><ul class="small" style="margin:0;padding-left:1rem">${list(vs.slice(0, 5))}</ul></div><div><span class="tiny muted">${M('Thấp nhất 5')}</span><ul class="small" style="margin:0;padding-left:1rem">${list(vs.slice(-5).reverse())}</ul></div>${gone.length ? `<div><span class="tiny muted">${M('Bị gỡ/hạn chế')}</span><b class="bad-t">${gone.length}</b></div>` : ''}</div>` : '';
    }
    function paint() {
      const rows = (D.rows || []).filter(r => r.platform !== 'web' || by === 'template' || by === 'hook' || by === 'cefr');
      if (!rows.length) { $('#sOut').innerHTML = al() + `<p class="small muted">${M('Chưa có số liệu.')}</p>`; return; }
      const t = sumBy(rows, () => 'all')[0], VM = new Map((D.vmeta || []).map(v => [v.video_id, v])), GR = new Map((D.growth || []).map(g => [g.video_id, g])), CH = new Map((D.channels || []).map(c => [c.channel_id, c.title])),
        key = { post: r => r.post_id || r.clip, account: r => (r.platform === 'web' ? 'web' : (PI[r.platform] || r.platform || '') + ' ' + (CH.get(r.account_id) || r.account_id)), template: r => r.template, hook: r => r.hook, cefr: r => r.cefr,
          len: r => { const v = VM.get(r.post_id); return v && v.secs ? (v.secs < 20 ? '<20s' : v.secs < 40 ? '20–40s' : v.secs <= 60 ? '40–60s' : '>60s') : ''; },
          hour: r => { const v = VM.get(r.post_id), t = v && Date.parse(v.publish_at); return t ? String(new Date(t).getHours()).padStart(2, '0') + ':00' : ''; } }[by];
      for (const r of rows) { const x = GR.get(r.post_id); r.d7 = x ? +x.d7 || 0 : null; r.d30 = x ? +x.d30 || 0 : null; }
      const g = sumBy(rows, key).slice(0, 300), W = D.weights && D.weights.by && D.weights.by[by];
      $('#sOut').innerHTML = al() + `<div class="smg-kpi">${[['Lượt xem', n(t.views)], ['Thích', n(t.likes)], ['Bình luận', n(t.comments)], ['Lưu lại', n(t.saves)], ['Chia sẻ', n(t.shares)], ['Thời gian xem', Math.round(t.watch_s / 60) + ' min'], ['Tỉ lệ tương tác', (rate(t) * 100).toFixed(1) + '%']].map(([k, v]) => `<div><span class="tiny muted">${M(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        ${tb()}
        <div class="smg-scroll"><table class="soc-tbl" style="margin-top:.6rem"><thead><tr><th>${M('Nhóm/khóa')}</th><th>${M('Lượt xem')}</th><th>${M('Thích')}</th><th>${M('Bình luận')}</th><th>${M('Lưu lại')}</th><th>${M('Chia sẻ')}</th><th>${M('Tỉ lệ tương tác')}</th><th>${M('7 ngày')}</th>${W ? `<th>${M('Trọng số')}</th>` : ''}</tr></thead>
        <tbody>${g.map(r => `<tr><td>${esc(r.k)}</td><td>${n(r.views)}</td><td>${n(r.likes)}</td><td>${n(r.comments)}</td><td>${n(r.saves)}</td><td>${n(r.shares)}</td><td>${(rate(r) * 100).toFixed(1)}%</td><td>${r.d7 == null ? '–' : '+' + n(r.d7)}</td>${W ? `<td>${W[r.k] ? W[r.k].w : '–'}</td>` : ''}</tr>`).join('')}</tbody></table></div>
        ${D.weights ? `<p class="tiny muted">${M('Trọng số tuần sau (đưa về thư viện)')}: mean ${esc(String(D.weights.mean))}</p>` : ''}`;
    }
    $('#sExp').onclick = () => { if (!D) return; const key = { post: r => r.post_id || r.clip, account: r => r.platform + ':' + r.account_id, template: r => r.template, hook: r => r.hook, cefr: r => r.cefr }[by]; const g = sumBy(D.rows || [], key);
      const csv = ['key,views,likes,comments,saves,shares,watch_s,engagement'].concat(g.map(r => [JSON.stringify(String(r.k)), r.views, r.likes, r.comments, r.saves, r.shares, r.watch_s, rate(r).toFixed(4)].join(','))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `lexkite-social-${by}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $('#sBy').onchange = e => { by = e.target.value; ctx.LS.set('sby', by); if (D) paint(); };
    $('#sSync').onclick = async () => { msg(M('Đang tải…')); try { const r = await ctx.sapi('POST', 'lk/metrics/sync', {}); msg(M('✓ Đồng bộ: {n} số liệu GrabCast, {w} clip web', { n: r.n, w: r.web }) + (r.grabcast !== 'ok' ? ' · GrabCast: ' + r.grabcast : ''), true); load(); } catch (e) { msg(err(e), false); } };
    $('#sCsv').onclick = () => {
      const { d, shut } = ctx.modal('soc-dlg', `<form method="dialog" class="card" style="min-width:min(520px,92vw)"><h3>${M('⬆️ Nhập CSV')}</h3><label class="small">${M('Dán CSV: post_id,platform,views,likes,comments,saves,shares,watch_s')}<textarea id="sTx" rows="8" style="width:100%"></textarea></label><div class="row" style="gap:.4rem;justify-content:flex-end;margin-top:.5rem"><button type="button" class="btn ghost" data-x>${M('Hủy')}</button><button type="submit" class="btn primary">${M('Nhập')}</button></div></form>`, M('⬆️ Nhập CSV'));
      d.querySelector('form').onsubmit = async ev => { ev.preventDefault(); const rows = parseCsv(d.querySelector('#sTx').value); shut(); if (!rows.length) return; try { const r = await ctx.sapi('POST', 'lk/metrics/import', { rows }); msg(M('✓ Đã nhập {n} dòng', { n: r.imported }), true); load(); } catch (e) { msg(err(e), false); } };
    };
    load();
  }

  // ======================= BÌNH LUẬN =======================
  function inbox(el, ctx) {
    const { M, esc, accN } = mk(ctx), pub = (ctx.D.posts || []).flatMap(p => (p.targets || []).filter(t => t.permalink && /published/.test(String(t.state))).map(t => ({ p, t }))).slice(0, 200);
    el.innerHTML = `<section class="card"><h3 style="margin-top:0">${M('💬 Bình luận')}</h3><p class="small muted">${M('API GrabCast (khóa API) chưa cho đọc/trả lời bình luận – hộp thư chỉ dùng được khi đăng nhập grabcast.click. Lexkite liệt kê bài đã đăng để mở thẳng trên nền tảng.')}</p>
      <p><a class="btn sm" href="https://grabcast.click/scheduler.html#inbox" target="_blank" rel="noopener">${M('Mở hộp thư GrabCast ↗')}</a></p>
      ${pub.length ? `<table class="soc-tbl"><tbody>${pub.map(({ p, t }) => `<tr><td>${esc(accN(t.account_id))}</td><td>${esc(String(p.title || p.caption || '').slice(0, 90))}</td><td class="tiny">${t.published_at ? esc(ctx.both(Date.parse(t.published_at))) : ''}</td><td><a href="${esc(t.permalink)}" target="_blank" rel="noopener">${M('Xem ↗')}</a></td></tr>`).join('')}</tbody></table>` : `<p class="small muted">${M('Chưa có bài đã đăng.')}</p>`}</section>`;
  }

  // ======================= DÙNG TRONG TRÌNH SOẠN =======================
  async function pickClip(ctx) {
    const { M, esc, err } = mk(ctx); let list = [], used = {};
    return new Promise(res => {
      const { d, shut } = ctx.modal('soc-dlg', `<div class="card" style="width:min(760px,94vw)"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${M('📚 Kho Lexkite (đã duyệt)')}</h3><button type="button" class="btn sm ghost" data-x>${M('Đóng')}</button></div>
        <input type="search" id="pcQ" placeholder="${esc(M('Tìm clip…'))}" style="width:100%;margin:.5rem 0"><div id="pcL" class="smg-grid smg-scroll"><p class="small muted">${M('Đang tải…')}</p></div></div>`, M('📚 Kho Lexkite (đã duyệt)'));
      let done = false; d.addEventListener('close', () => { if (!done) res(null); });
      const paint = () => { const q = d.querySelector('#pcQ').value.toLowerCase(), xs = list.filter(c => !q || (c.id + ' ' + c.title + ' ' + c.template + ' ' + c.hook).toLowerCase().includes(q)).slice(0, 240);
        d.querySelector('#pcL').innerHTML = xs.length ? xs.map(c => `<button type="button" class="smg-clip" data-c="${esc(c.id)}"><b>${esc(c.title)}</b><span class="tiny muted">${esc([c.template, c.hook, c.cefr, c.duration ? Math.round(c.duration) + 's' : ''].filter(Boolean).join(' · '))}</span>${used[c.id] ? `<div class="tiny warn-t">${M('đã dùng trên {n} kênh', { n: used[c.id].length })}</div>` : ''}</button>`).join('') : `<p class="small muted">${M('Chưa có clip đã duyệt.')}</p>`; };
      d.querySelector('#pcQ').oninput = paint;
      d.querySelector('#pcL').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; done = true; const c = list.find(x => x.id === b.dataset.c); shut(); res(c ? { ...c, used: used[c.id] || [] } : null); };
      ctx.sapi('GET', 'lk/clips').then(r => { list = r.clips || []; used = r.used || {}; paint(); }).catch(e => { d.querySelector('#pcL').innerHTML = `<p class="small bad-t">${esc(err(e))}</p>`; });
    });
  }
  async function aiSuggest(ctx, input) {
    const { M, esc, err } = mk(ctx);
    return new Promise(res => {
      const { d, shut } = ctx.modal('soc-dlg', `<div class="card" style="width:min(640px,94vw)"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${M('✨ Gợi ý AI')}</h3><button type="button" class="btn sm ghost" data-x>${M('Đóng')}</button></div><div id="aiB"><p class="small muted">${M('⏳ AI đang viết…')}</p></div></div>`, M('✨ Gợi ý AI'));
      let done = false; d.addEventListener('close', () => { if (!done) res(null); });
      ctx.sapi('POST', 'lk/ai/caption', input).then(r => {
        const tg = (r.hashtags || []).map(t => '#' + t).join(' ');
        d.querySelector('#aiB').innerHTML = `<p class="small" style="font-weight:600">${M('Hook gợi ý')}</p><ol class="small">${(r.hooks || []).map(h => `<li>${esc(h)}</li>`).join('')}</ol><pre class="small" style="white-space:pre-wrap">${esc(r.caption)}\n\n${esc(tg)}</pre>${r.first_comment ? `<p class="small muted">💬 ${esc(r.first_comment)}</p>` : ''}
          <div class="row" style="gap:.4rem;flex-wrap:wrap"><button type="button" class="btn sm primary" data-u="cap">${M('Dùng caption này')}</button><button type="button" class="btn sm" data-u="tags">${M('Thêm hashtag')}</button>${r.first_comment ? `<button type="button" class="btn sm ghost" data-u="fc">${M('Dùng làm bình luận đầu')}</button>` : ''}</div>`;
        d.querySelector('#aiB').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; done = true; shut(); res({ use: b.dataset.u, caption: (r.hooks && r.hooks[0] ? r.hooks[0] + '\n\n' : '') + r.caption + (tg ? '\n\n' + tg : ''), tags: tg, fc: r.first_comment }); };
      }).catch(e => { d.querySelector('#aiB').innerHTML = `<p class="small bad-t">${esc(err(e))}</p>`; });
    });
  }
  // Bộ kênh: Tất cả FB / Tất cả IG / Tất cả + bộ đã lưu (D1, dùng chung mọi máy)
  function setsBar(el, ctx, get, set) {
    const { M, esc, err } = mk(ctx); let sets = [];
    const paint = () => { el.innerHTML = `<span class="small" style="font-weight:600">${M('Bộ kênh:')}</span> <button type="button" class="btn sm ghost" data-s="@fb">📘 ${M('Tất cả FB')}</button><button type="button" class="btn sm ghost" data-s="@ig">📸 ${M('Tất cả IG')}</button><button type="button" class="btn sm ghost" data-s="@all">${M('Tất cả')}</button>${sets.map(s => `<span class="smg-chip"><button type="button" class="btn sm ghost" data-s="${esc(s.name)}">${esc(s.name)}</button><button type="button" class="btn sm ghost" data-del="${esc(s.name)}" aria-label="${esc(M('Xóa'))}">×</button></span>`).join('')} <button type="button" class="btn sm" data-save>${M('💾 Lưu bộ')}</button>`; };
    el.onclick = async e => {
      const b = e.target.closest('[data-s],[data-del],[data-save]'); if (!b) return; const accs = (ctx.D.accounts || []);
      if (b.dataset.s) { const s = b.dataset.s, ids = s === '@fb' ? accs.filter(a => a.platform === 'facebook_page') : s === '@ig' ? accs.filter(a => a.platform === 'instagram') : s === '@all' ? accs : null; set(ids ? ids.map(a => String(a.id)) : ((sets.find(x => x.name === s) || {}).ids || []).filter(id => ctx.accById(id))); return; }
      try {
        if (b.dataset.del) { if (!confirm(M('Xóa bộ “{n}”?', { n: b.dataset.del }))) return; await ctx.sapi('POST', 'lk/sets/delete', { name: b.dataset.del }); }
        else { const ids = get(); if (!ids.length) return alert(M('Chọn kênh trước.')); const n = (prompt(M('Tên bộ kênh:')) || '').trim(); if (!n) return; await ctx.sapi('POST', 'lk/sets/save', { name: n.slice(0, 60), ids }); }
        sets = (await ctx.sapi('GET', 'lk/sets')).sets || []; paint();
      } catch (e2) { alert(err(e2)); }
    };
    paint(); ctx.sapi('GET', 'lk/sets').then(r => { sets = r.sets || []; if (el.isConnected) paint(); }).catch(() => {});
  }

  const TABS = { board, queue, health, stats, inbox };
  window.AdminSocialMgr = { paint: (t, el, ctx) => TABS[t](el, ctx), pickClip, aiSuggest, setsBar, _t: { PAUSE_Q, skipWhy, SKIP, SKIP_PRE, LOGK, ISS, GSTEP, LANGN, groupSlots, parseCsv, parseQueueCsv, rate, sumBy, newAccounts, COLS, EN } };
})();
