/* Quản trị → "Video & Social" (tải lười từ admin.js khi mở tab). Mô phỏng trình soạn/lịch của GrabCast:
 *  • Soạn bài: kho video (Drive/R2) + tải lên có tiến độ, xem trước video (thời lượng, dung lượng), caption chung + tab từng nền tảng
 *    (YouTube / TikTok / Instagram Reels / Facebook Page / Threads), bộ đếm theo giới hạn thật, đếm hashtag, cảnh báo link,
 *    khung điện thoại xem trước, mẫu caption & bộ hashtag (localStorage), kiểm tra (POST validate) trước khi gửi – lỗi hiện theo từng tab.
 *  • Lịch tuần/tháng (giờ New York) kéo-thả để dời lịch (unschedule → schedule), khung giờ vàng Mỹ 7/8/12/19/20 ET, "khung trống kế tiếp",
 *    chống đăng trùng, lên lịch hàng loạt nhiều video.
 *  • Bài đăng: lọc trạng thái/nền tảng/ngày + tìm kiếm, ngăn chi tiết từng kênh (trạng thái, link, lỗi, thử lại/hủy, số liệu).
 *  • Kênh & Drive: ảnh đại diện, tên, nền tảng, hạn mức; thanh dung lượng từng Drive; nút kết nối trên GrabCast (workspace 4).
 * Gọi GrabCast qua proxy /api/social (functions/api/social.js) – khóa API chỉ nằm ở máy chủ. admin.js gọi
 * AdminSocial.render(container, sapi, L, { esc, lang }), sapi(method, path, body?, { query, idem }) → JSON hoặc ném lỗi (err.code, err.status).
 * Studio có thể gọi AdminSocial.prefill({ objectId, title, caption }) trước khi mở tab → trình soạn được điền sẵn.
 * Mọi thao tác ra ngoài (lưu nháp, lên lịch, đăng ngay, dời, hủy, thử lại) đều hỏi xác nhận. Chữ tiếng Anh nằm trong bảng EN ở đây. */
(function () {
  const GC = 'https://grabcast.click/scheduler.html', GC_ACC = GC + '#accounts', GC_KEY = 'https://grabcast.click/account.html#api', WS = '4';
  const EN = {
    '🎬 Video & Social': '🎬 Video & Social', 'Lưu video trên Drive và đăng lên các kênh qua GrabCast.': 'Store videos on Drive and post to channels via GrabCast.',
    'Kết nối kênh/Drive trên GrabCast ↗': 'Connect channels/Drive on GrabCast ↗', '🔄 Tải lại': '🔄 Reload', 'Đang tải…': 'Loading…',
    '✍️ Soạn bài': '✍️ Compose', '📅 Lịch': '📅 Calendar', '🗂️ Bài đăng': '🗂️ Posts', '📡 Kênh & Drive': '📡 Channels & Drives', 'Mục Video & Social': 'Video & Social sections',
    '🗽 New York: {ny} · 🕒 Giờ của bạn: {loc}': '🗽 New York: {ny} · 🕒 Your time: {loc}',
    // Chưa cấu hình
    '⚙️ Chưa kết nối GrabCast': '⚙️ GrabCast is not connected', 'Máy chủ chưa có khóa GrabCast. Làm 1 lần:': 'The server has no GrabCast key yet. One-time setup:',
    'Mở {link} → tạo khóa API với quyền <b>social:read, social:write, storage:read, storage:write</b>.': 'Open {link} → create an API key with scopes <b>social:read, social:write, storage:read, storage:write</b>.',
    'Cloudflare Pages → lexkite → Settings → Variables and Secrets: thêm <b>secret</b> {k} (giá trị khóa) và biến {w} (mã workspace).': 'Cloudflare Pages → lexkite → Settings → Variables and Secrets: add the <b>secret</b> {k} (key value) and the variable {w} (workspace id).',
    'Triển khai lại bản mới nhất (Retry deployment) rồi tải lại tab này.': 'Redeploy the latest build (Retry deployment), then reload this tab.',
    '🔒 Khóa chỉ máy chủ dùng, không bao giờ gửi xuống trình duyệt. Không dán khóa vào đây hay vào repo.': '🔒 The key is used only by the server and is never sent to the browser. Do not paste it here or into the repo.',
    // Drive & kênh
    '💾 Drive lưu video': '💾 Video storage (Drive)', 'Tổng': 'Total', '{u} / {t} · còn trống {f}': '{u} / {t} · {f} free', 'Sắp đầy': 'Almost full', 'Gần đầy': 'Filling up', 'Đầy': 'Full',
    '⚠️ {n} Drive đã dùng ≥ 80% – dọn bớt hoặc thêm Drive trên GrabCast.': ['⚠️ {n} Drive is ≥ 80% full – clean up or add a Drive on GrabCast.', '⚠️ {n} Drives are ≥ 80% full – clean up or add a Drive on GrabCast.'],
    '📡 Kênh đã kết nối': '📡 Connected channels', 'cần kết nối lại': 'needs reconnect', 'Hoạt động': 'Active', 'Kết nối lại ↗': 'Reconnect ↗',
    '{n}/{max} bài trong 24 giờ': '{n}/{max} posts in 24 h', '➕ Kết nối kênh mới trên GrabCast ↗': '➕ Connect a new channel on GrabCast ↗',
    'Trên GrabCast chọn workspace <b>Lexkite (#{ws})</b> trước khi kết nối.': 'On GrabCast pick the <b>Lexkite (#{ws})</b> workspace before connecting.',
    'Workspace Lexkite chưa có kênh nào.': 'The Lexkite workspace has no channels yet.', 'Workspace Lexkite chưa có Drive nào.': 'The Lexkite workspace has no Drive yet.',
    'Kết nối tại {link} (chọn workspace <b>Lexkite</b>).': 'Connect at {link} (choose the <b>Lexkite</b> workspace).',
    // Trạng thái
    'Tất cả': 'All', 'Nháp': 'Draft', 'Đã lên lịch': 'Scheduled', 'Đã đăng': 'Published', 'Lỗi': 'Failed', 'Đã hủy': 'Cancelled', 'Khác': 'Other',
    'Không có bài nào.': 'No posts.', '(không tiêu đề)': '(untitled)', 'Lên lịch': 'Schedule', 'Đăng ngay': 'Publish now', 'Hủy lịch': 'Unschedule', 'Thử lại': 'Retry', 'Hủy bài': 'Cancel post', 'Đổi giờ': 'Reschedule', 'Xem ↗': 'View ↗',
    'Lên lịch bài “{t}” lúc {d}?': 'Schedule “{t}” for {d}?', 'Đăng ngay bài “{t}” lên {p}? Bài sẽ công khai ngay.': 'Publish “{t}” to {p} now? It goes public immediately.',
    'Hủy lịch bài “{t}”? Bài trở về nháp.': 'Unschedule “{t}”? It goes back to draft.', 'Thử đăng lại bài “{t}”?': 'Retry publishing “{t}”?', 'Hủy bài “{t}”? Bài sẽ không được đăng.': 'Cancel “{t}”? It will not be published.',
    'Có thể gửi lại video lên TikTok lần nữa. Bạn đã kiểm tra trên TikTok và chắc chắn bài chưa lên?': 'The video may be sent to TikTok again. Did you check TikTok and are you sure it is not there?',
    '✓ Xong': '✓ Done', '✗ {e}': '✗ {e}', 'Chọn giờ đăng': 'Choose a publish time', 'Giờ đăng (giờ máy bạn)': 'Publish time (your local time)', 'Khung giờ vàng còn trống ở Mỹ (giờ New York):': 'Free US prime-time slots (New York time):',
    'Đóng': 'Close', 'Hủy': 'Cancel', 'Chọn giờ trước.': 'Pick a time first.', 'Giờ đăng phải ở tương lai.': 'The publish time must be in the future.',
    'Quá giới hạn GrabCast (60 lượt/phút) – đợi 1 phút rồi thử lại.': 'GrabCast rate limit hit (60/min) – wait a minute and retry.', 'GrabCast không phản hồi trong 15 giây.': 'GrabCast did not respond within 15 seconds.',
    'Khóa GrabCast không hợp lệ hoặc đã bị thu hồi – tạo khóa mới tại {link} rồi cập nhật secret GRABCAST_API_KEY trên Cloudflare Pages.': 'The GrabCast key is invalid or revoked – create a new one at {link} and update the GRABCAST_API_KEY secret on Cloudflare Pages.',
    'Khóa GrabCast không có quyền cho thao tác này (hoặc không thuộc workspace Lexkite) – cấp thêm quyền social/storage cho khóa tại {link}.': 'The GrabCast key is not allowed to do this (or is not in the Lexkite workspace) – grant social/storage scopes to the key at {link}.',
    // Soạn bài – video
    '🎞️ Video': '🎞️ Video', 'Tìm video…': 'Search videos…', 'Tìm trong kho video': 'Search the video library', '⬆️ Tải video mới': '⬆️ Upload a video', 'Kho video': 'Video library',
    'Kho chưa có video nào – tải video mới lên.': 'No videos in storage yet – upload one.', 'Không có video khớp.': 'No matching videos.', 'Chưa chọn video.': 'No video selected.',
    'Chỉ nhận tệp video (MP4, MOV, WebM).': 'Video files only (MP4, MOV, WebM).', '✓ Đã tải lên kho video': '✓ Uploaded to video storage', 'Video đang tải lên – đợi xong rồi thử lại.': 'The video is still uploading – wait for it to finish.',
    '⏳ Đang tải lên {p}%…': '⏳ Uploading {p}%…', 'Tải lên thất bại ({s})': 'Upload failed ({s})', 'GrabCast không trả về link tải lên.': 'GrabCast returned no upload URL.', 'GrabCast không trả về mã media.': 'GrabCast returned no media id.',
    'dọc': 'vertical', 'ngang': 'horizontal',
    // Soạn bài – nội dung
    '✍️ Nội dung': '✍️ Content', 'Caption chung': 'Master caption', 'Bình luận đầu tiên': 'First comment', 'Link': 'Link', 'Đăng lên kênh': 'Post to channels',
    '— Mẫu caption —': '— Caption template —', 'Mẫu caption': 'Caption template', '💾 Lưu làm mẫu': '💾 Save as template', 'Xóa mẫu đang chọn': 'Delete selected template', 'Chọn một mẫu caption trước.': 'Pick a caption template first.', 'Tên mẫu caption:': 'Template name:',
    'Thay caption hiện tại bằng mẫu “{n}”?': 'Replace the current caption with template “{n}”?', 'Xóa mẫu “{n}”?': 'Delete template “{n}”?', 'Bộ hashtag:': 'Hashtag sets:',
    '＃ Lưu hashtag đang dùng': '＃ Save current hashtags', 'Tên bộ hashtag:': 'Hashtag set name:', 'Caption chưa có hashtag nào.': 'The caption has no hashtags yet.', 'Xóa bộ hashtag “{n}”?': 'Delete hashtag set “{n}”?',
    'Thêm bộ hashtag {n}': 'Add hashtag set {n}', 'Xóa bộ {n}': 'Delete set {n}', '{n} hashtag': ['{n} hashtag', '{n} hashtags'], '{n} link': ['{n} link', '{n} links'],
    // Soạn bài – từng nền tảng
    '⚙️ Tùy chỉnh từng nền tảng': '⚙️ Per-platform settings', 'Nền tảng': 'Platform', 'Chọn kênh ở trên để chỉnh riêng từng nền tảng.': 'Pick channels above to tune each platform.',
    'Loại bài: {k}': 'Post type: {k}', 'Để trống = dùng caption chung': 'Empty = use the master caption', 'Để trống = dùng bình luận đầu tiên chung': 'Empty = use the shared first comment',
    'Tiêu đề YouTube': 'YouTube title', 'Mô tả': 'Description', 'Thẻ (cách nhau bằng dấu phẩy)': 'Tags (comma separated)', 'Quyền riêng tư': 'Privacy', 'Danh mục': 'Category',
    'Công khai': 'Public', 'Không công khai': 'Unlisted', 'Riêng tư': 'Private', 'Giáo dục': 'Education', 'Mọi người & blog': 'People & Blogs', 'Giải trí': 'Entertainment', 'Khoa học & công nghệ': 'Science & Technology',
    'Dành cho trẻ em: Không (cố định cho Lexkite).': 'Made for kids: No (fixed for Lexkite).', 'Có nội dung chân thực được tạo/chỉnh bằng AI (YouTube yêu cầu khai báo)': 'Contains realistic AI-generated/altered content (YouTube disclosure)',
    'Thông báo cho người đăng ký': 'Notify subscribers', 'Caption TikTok': 'TikTok caption', '— chọn (bắt buộc) —': '— choose (required) —', 'Mọi người': 'Everyone', 'Bạn bè (theo dõi nhau)': 'Friends (mutual follows)', 'Người theo dõi': 'Followers', 'Chỉ mình tôi': 'Only me',
    'Cho phép bình luận': 'Allow comments', 'Cho phép Duet': 'Allow Duet', 'Cho phép Stitch': 'Allow Stitch', 'Gắn nhãn nội dung AI': 'Label as AI-generated', 'TikTok: {m}': 'TikTok: {m}', 'Tài khoản TikTok này đang không đăng được.': 'This TikTok account cannot post right now.',
    'Caption Reels': 'Reels caption', 'Bình luận đầu tiên (Instagram)': 'First comment (Instagram)', 'Hiện Reel cả trên lưới Feed': 'Also show the Reel in the Feed grid', 'Caption Facebook': 'Facebook caption', 'Bình luận đầu tiên (Facebook)': 'First comment (Facebook)',
    'Nội dung Threads': 'Threads text', 'Threads chỉ biến hashtag đầu tiên thành chủ đề.': 'Threads turns only the first hashtag into a topic.',
    // Kiểm tra tại chỗ
    'Caption quá dài: {n}/{max}.': 'Caption too long: {n}/{max}.', 'Thiếu tiêu đề YouTube.': 'YouTube title is missing.', 'Tiêu đề YouTube tối đa {max} ký tự ({n}).': 'YouTube titles are limited to {max} characters ({n}).',
    'Mô tả YouTube không được chứa dấu < hoặc >.': 'YouTube descriptions cannot contain < or >.', 'Thẻ YouTube tối đa {max} ký tự tổng ({n}).': 'YouTube tags are limited to {max} characters in total ({n}).',
    'Chọn quyền riêng tư TikTok (bắt buộc).': 'Choose a TikTok privacy level (required).', 'Video TikTok qua API tối đa 10 phút.': 'TikTok API videos are limited to 10 minutes.',
    'Instagram chỉ cho tối đa {max} hashtag ({n}, tính cả bình luận đầu tiên).': 'Instagram allows at most {max} hashtags ({n}, first comment included).', 'Reels Instagram phải dài 3 giây – 15 phút.': 'Instagram Reels must be 3 seconds – 15 minutes long.',
    'Link trong caption không bấm được trên {p}.': 'Links in the caption are not clickable on {p}.', 'Threads tối đa {max} link ({n}).': 'Threads allows at most {max} links ({n}).', 'Video Threads tối đa 5 phút.': 'Threads videos are limited to 5 minutes.',
    'Shorts dài hơn 3 phút sẽ đăng thành video thường.': 'Shorts longer than 3 minutes are posted as regular videos.', 'Reel Facebook cần 3–90 giây – sẽ đăng thành video thường.': 'Facebook Reels need 3–90 seconds – posting as a regular video.',
    'Chọn hoặc tải 1 video.': 'Choose or upload a video.', 'Nhập caption.': 'Enter a caption.', 'Chọn ít nhất 1 kênh.': 'Select at least one channel.', 'Sửa các lỗi ⛔ ở tab nền tảng trước.': 'Fix the ⛔ errors in the platform tabs first.',
    'GrabCast: {m}': 'GrabCast: {m}',
    // Xem trước
    '👁️ Xem trước': '👁️ Preview', 'Xem trước cho': 'Preview for', 'Mô phỏng gần đúng – bố cục thật do từng nền tảng quyết định.': 'Approximate mockup – each platform decides the real layout.',
    // Thời gian & gửi
    '🕒 Thời gian đăng': '🕒 Publish time', '⏭ Khung trống kế tiếp': '⏭ Next free slot', 'Hết khung trống trong 400 ngày tới.': 'No free slot in the next 400 days.', 'Giờ đã chọn: {d}': 'Selected: {d}',
    'Kiểm tra': 'Validate', 'Lưu nháp': 'Save draft', '⏳ Đang chuẩn bị video…': '⏳ Preparing video…', '⏳ Đang kiểm tra…': '⏳ Validating…', '⏳ Đang tạo bài…': '⏳ Creating post…', '⏳ Đang lên lịch…': '⏳ Scheduling…', '⏳ Đang đăng…': '⏳ Publishing…',
    '✓ Hợp lệ': '✓ Valid', 'Chưa hợp lệ – xem các tab có dấu ⛔.': 'Not valid – see the tabs marked ⛔.', '✓ Đã lưu nháp': '✓ Draft saved', '✓ Đã lên lịch {d}': '✓ Scheduled for {d}', '✓ Đã gửi đăng – theo dõi trạng thái ở tab Bài đăng.': '✓ Sent for publishing – track it in the Posts tab.',
    'Tạo bài nháp trên {n} kênh?': ['Create a draft for {n} channel?', 'Create a draft for {n} channels?'], 'Tạo bài và lên lịch đăng lên {n} kênh lúc {d}?': ['Create and schedule for {n} channel at {d}?', 'Create and schedule for {n} channels at {d}?'],
    'Tạo bài và ĐĂNG NGAY lên {n} kênh? Bài sẽ công khai ngay.': ['Create and PUBLISH NOW to {n} channel? It goes public immediately.', 'Create and PUBLISH NOW to {n} channels? It goes public immediately.'],
    'Đã tạo bài nhưng chưa lên lịch/đăng được: {e}': 'Post created but not scheduled/published: {e}',
    'Có vẻ trùng bài “{t}” ({s}) trên cùng kênh. Vẫn tạo bài mới?': 'This looks like a duplicate of “{t}” ({s}) on the same channel. Create anyway?',
    // Lịch
    'Trước': 'Previous', 'Sau': 'Next', 'Hôm nay': 'Today', 'Tuần': 'Week', 'Tháng': 'Month', '📦 Lên lịch hàng loạt': '📦 Bulk planner', 'Giờ khác': 'Other',
    'Giờ hiển thị: New York (ET). Kéo bài sang ô khác để dời lịch; Enter trên bài để mở chi tiết; ô + để soạn bài vào khung đó.': 'Times shown in New York (ET). Drag a post to another cell to reschedule; Enter on a post opens details; + composes a post for that slot.',
    'Tạo bài lúc {d}': 'New post at {d}', 'Dời bài “{t}” sang {d}?': 'Move “{t}” to {d}?', '⏭ Khung giờ vàng còn trống': '⏭ Free prime-time slots', '✍️ Soạn bài': '✍️ Compose', 'Lịch bài đăng': 'Post calendar',
    'Không tải được lịch: {e}': 'Could not load the calendar: {e}',
    // Hàng loạt
    'Chọn nhiều video → tự xếp mỗi video 1 bài vào khung giờ vàng còn trống (giờ New York).': 'Pick several videos → each becomes one post in the next free prime-time slots (New York time).',
    'Chọn tất cả': 'Select all', 'Bỏ chọn': 'Clear', 'Đã chọn {n} video': ['{n} video selected', '{n} videos selected'], 'Caption mẫu ({title} = tên video)': 'Caption template ({title} = video name)',
    'Khung giờ (ET)': 'Slots (ET)', 'Bắt đầu từ ngày (New York)': 'Start date (New York)', 'Bỏ qua thứ 7 & Chủ nhật': 'Skip Saturday & Sunday', 'Quyền riêng tư YouTube': 'YouTube privacy', 'Quyền riêng tư TikTok': 'TikTok privacy',
    'Xem kế hoạch': 'Preview plan', 'Tạo & lên lịch {n} bài': ['Create & schedule {n} post', 'Create & schedule {n} posts'], 'Chọn ít nhất 1 video.': 'Select at least one video.', 'Chọn ít nhất 1 khung giờ.': 'Select at least one slot.',
    'Tạo {n} bài và lên lịch đăng lên {k} kênh theo kế hoạch? Bài sẽ tự công khai đúng giờ.': ['Create {n} post and schedule it to {k} channel(s)? It goes public on time.', 'Create {n} posts and schedule them to {k} channel(s)? They go public on time.'],
    'Video': 'Video', 'Trạng thái': 'Status', 'Giờ của bạn': 'Your time', 'chờ': 'waiting', '⚠️ trùng – bỏ qua': '⚠️ duplicate – skipped', 'Xong {ok}/{n} bài.': 'Done {ok}/{n} posts.',
    // Danh sách bài
    'Tìm theo tiêu đề/caption…': 'Search title/caption…', 'Tìm bài đăng': 'Search posts', 'Mọi nền tảng': 'All platforms', 'Từ ngày': 'From', 'Đến ngày': 'To', 'Lọc trạng thái': 'Filter by status',
    'Chi tiết bài đăng': 'Post details', 'Kênh': 'Channels', 'lần thử: {n}': 'attempts: {n}', 'Bình luận đầu tiên: {s}': 'First comment: {s}', '📊 Số liệu': '📊 Analytics', 'Chưa có số liệu (cần quyền insights trên GrabCast).': 'No analytics yet (needs the insights permission on GrabCast).',
    'Lượt xem': 'Views', 'Tiếp cận': 'Reach', 'Thích': 'Likes', 'Bình luận': 'Comments', 'Chia sẻ': 'Shares', 'Lưu': 'Saves', 'Cập nhật {d}': 'Updated {d}', 'Không tải được bài: {e}': 'Could not load the post: {e}',
  };
  const CSS = `.soc-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin-bottom:.8rem}.soc-head h2{margin:0;font-size:1.25rem}.soc-head .acts{display:flex;gap:.5rem;flex-wrap:wrap}
.soc-wrap :focus-visible,.soc-drawer :focus-visible,.soc-pt :focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.soc-tabs{display:flex;gap:.25rem;flex-wrap:wrap;margin:0 0 1rem;padding:.25rem;border:1px solid var(--line);border-radius:12px;background:var(--surface-2,rgba(0,0,0,.03))}
.soc-tabs button{border:0;background:none;color:var(--muted);font:inherit;font-weight:600;padding:.45rem .8rem;border-radius:8px;cursor:pointer}.soc-tabs button[aria-selected=true]{background:var(--surface,#fff);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.soc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-bottom:1rem}.soc-grid>.card{margin:0;min-width:0}
.soc-drv{margin:.6rem 0 .9rem}.soc-drv .t{display:flex;justify-content:space-between;gap:.5rem;font-size:.85rem;flex-wrap:wrap}.soc-drv .t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
.soc-bar{height:9px;border-radius:99px;background:var(--line,#e5e7eb);overflow:hidden;margin:.3rem 0}.soc-bar i{display:block;height:100%;background:#2FBF71;border-radius:99px}
.soc-drv.warn .soc-bar i{background:#FFB054}.soc-drv.crit .soc-bar i{background:#E5502F}.soc-drv.full .soc-bar i{background:#991b1b}.soc-drv.total{border-top:1px solid var(--line,#e5e7eb);padding-top:.6rem}
.soc-accs{list-style:none;padding:0;margin:.6rem 0 0;display:grid;gap:.5rem}.soc-accs li{display:flex;gap:.6rem;align-items:center;border:1px solid var(--line);border-radius:12px;padding:.55rem .7rem;min-width:0}
.soc-accs .nm{display:flex;flex-direction:column;min-width:0;flex:1}.soc-accs .nm b,.soc-accs .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.soc-av{width:34px;height:34px;border-radius:50%;flex:none;background:#0F3D3E;color:#FFE7C2;display:inline-grid;place-items:center;font-weight:700;font-size:.85rem;overflow:hidden;position:relative}.soc-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.soc-av.s{width:22px;height:22px;font-size:.65rem}
.soc-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.soc-form label{display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;font-weight:600;min-width:0}.soc-form .wide{grid-column:1/-1}
.soc-form label.chk{flex-direction:row;align-items:center;gap:.45rem;font-weight:500}.soc-form label.chk input{width:auto}
.soc-wrap input:not([type=checkbox]):not([type=radio]):not([type=file]),.soc-wrap textarea,.soc-wrap select,.soc-pt input,.soc-pt select{font:inherit;font-weight:400;padding:.5rem .6rem;border:1.5px solid var(--line,#e5e7eb);border-radius:10px;background:var(--surface,#fff);color:inherit;width:100%;box-sizing:border-box;min-width:0}
.soc-lbl{display:flex;justify-content:space-between;gap:.5rem;align-items:baseline;flex-wrap:wrap}
.soc-targets{display:flex;flex-wrap:wrap;gap:.4rem}.soc-targets label{display:flex;flex-direction:row;align-items:center;gap:.35rem;font-weight:500;font-size:.85rem;border:1px solid var(--line,#e5e7eb);border-radius:999px;padding:.25rem .7rem .25rem .3rem;cursor:pointer;max-width:100%}
.soc-targets label:has(input:checked){border-color:var(--primary);background:color-mix(in srgb,var(--primary) 10%,transparent)}
.soc-times{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}.soc-times .chip-f{font-size:.78rem;padding:.3rem .6rem;text-align:left;line-height:1.25}
.soc-prog{height:6px;border-radius:99px;background:var(--line,#e5e7eb);overflow:hidden;margin-top:.4rem}.soc-prog i{display:block;height:100%;width:0;background:var(--primary);transition:width .2s}
.soc-msg{min-height:1.2em;margin-top:.5rem;white-space:pre-line}.soc-btns{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}
.soc-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0 .8rem}.soc-tag{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;overflow:hidden}.soc-tag button{border:0;background:none;color:inherit;font:inherit;font-size:.78rem;padding:.25rem .55rem;cursor:pointer}.soc-tag button+button{border-left:1px solid var(--line);color:var(--muted)}
.soc-comp{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:1rem;align-items:start}.soc-comp .card{margin:0 0 1rem;min-width:0}.soc-comp h3,.soc-wrap .card>h3{margin:0 0 .6rem;font-size:1rem}
.soc-sticky{position:sticky;top:5rem}
.soc-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:.5rem;max-height:290px;overflow:auto;margin:.6rem 0;padding:2px}
.soc-mi{display:flex;flex-direction:column;gap:.2rem;text-align:left;border:1.5px solid var(--line);border-radius:10px;background:var(--surface,#fff);color:inherit;font:inherit;font-size:.74rem;padding:.3rem;cursor:pointer;min-width:0;position:relative}
.soc-mi.on,.soc-mi:has(input:checked){border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 30%,transparent)}.soc-mi input{position:absolute;top:.45rem;left:.45rem;z-index:1}
.soc-mi b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.soc-th{aspect-ratio:9/16;max-height:118px;width:100%;border-radius:7px;background:linear-gradient(160deg,#17595A,#0F3D3E);display:grid;place-items:center;overflow:hidden;color:#FFE7C2;font-size:1.3rem}.soc-th img,.soc-th video{width:100%;height:100%;object-fit:cover}
.soc-sel{display:flex;gap:.8rem;align-items:flex-start;margin-top:.4rem;font-size:.85rem}.soc-sel .soc-th{width:110px;max-height:none;flex:none}.soc-sel video{background:#000}
.soc-cnt{font-size:.75rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--muted)}.soc-cnt.w{color:#b45309}.soc-cnt.x{color:var(--again,#d1343a)}.soc-cnts{display:flex;flex-wrap:wrap;gap:.25rem .7rem;margin-top:.3rem}
.soc-ptabs{display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.7rem}.soc-ptabs button{border:1.5px solid var(--line);background:var(--surface,#fff);color:inherit;font:inherit;font-size:.82rem;font-weight:600;border-radius:999px;padding:.3rem .7rem;cursor:pointer}
.soc-ptabs button[aria-selected=true]{background:#0F3D3E;border-color:#0F3D3E;color:#fff}.soc-ptabs .dot{display:inline-block;width:.5rem;height:.5rem;border-radius:50%;background:#d1343a;margin-left:.35rem;vertical-align:middle}.soc-ptabs .dot.w{background:#FFB054}
.soc-probs{list-style:none;padding:0;margin:.6rem 0 0;font-size:.82rem}.soc-probs li{padding:.3rem .55rem;border-radius:8px;margin-bottom:.25rem;border-left:3px solid #d1343a;background:color-mix(in srgb,#d1343a 12%,transparent)}.soc-probs li.w{border-color:#FFB054;background:color-mix(in srgb,#FFB054 16%,transparent)}
.soc-phone{width:220px;max-width:100%;margin:0 auto;border:7px solid #111;border-radius:28px;background:#000;aspect-ratio:9/18.5;position:relative;overflow:hidden;color:#fff;font-size:.72rem;line-height:1.35}
.soc-phone .md{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(160deg,#17595A,#0F3D3E);font-size:2rem}.soc-phone .md img,.soc-phone .md video{width:100%;height:100%;object-fit:cover}
.soc-phone .ov{position:absolute;left:.6rem;right:2.5rem;bottom:.8rem;text-shadow:0 1px 3px rgba(0,0,0,.7)}.soc-phone .side{position:absolute;right:.45rem;bottom:1.1rem;font-size:1rem;line-height:2;text-align:center}
.soc-phone .who{display:flex;align-items:center;gap:.35rem}.soc-phone .cap{margin:.3rem 0 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;overflow-wrap:anywhere}.soc-phone .cap.c8{-webkit-line-clamp:8}
.soc-phone .ht{color:#FFD36A}.soc-phone .ttl{display:block;font-size:.8rem;margin-top:.2rem}.soc-phone .mus{margin:.25rem 0 0;opacity:.85}.soc-phone.p-youtube .ov{bottom:1.2rem}
.soc-phone.lite{background:#fff;color:#0f172a}.soc-phone.lite .pad{padding:.6rem}.soc-phone.lite .ht{color:#17595A;font-weight:600}.soc-phone .yt16{aspect-ratio:16/9;display:grid;place-items:center;background:linear-gradient(160deg,#17595A,#0F3D3E);overflow:hidden;font-size:1.6rem;color:#FFE7C2}.soc-phone .yt16 img,.soc-phone .yt16 video{width:100%;height:100%;object-fit:cover}
.soc-phone .th-md{margin-top:.4rem;border-radius:10px;overflow:hidden;aspect-ratio:4/5;display:grid;place-items:center;background:linear-gradient(160deg,#17595A,#0F3D3E);color:#FFE7C2;font-size:1.6rem}.soc-phone .th-md img,.soc-phone .th-md video{width:100%;height:100%;object-fit:cover}.soc-phone .th-a{margin-top:.4rem;opacity:.7}
.soc-calbar{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:space-between;align-items:center;margin-bottom:.4rem}.soc-calbar b{font-size:.95rem}
.soc-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}.soc-seg button{border:0;background:var(--surface,#fff);color:inherit;font:inherit;font-size:.82rem;padding:.35rem .7rem;cursor:pointer}.soc-seg button[aria-pressed=true]{background:#0F3D3E;color:#fff}
.soc-calwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:.5rem}
.soc-wk,.soc-mo{display:grid;border:1px solid var(--line);border-radius:12px;overflow:hidden}.soc-wk{grid-template-columns:52px repeat(7,minmax(100px,1fr));min-width:760px}.soc-mo{grid-template-columns:repeat(7,minmax(92px,1fr));min-width:680px}
.soc-hd{font-size:.72rem;font-weight:700;padding:.35rem .25rem;text-align:center;background:var(--surface-2,rgba(0,0,0,.03));border-left:1px solid var(--line)}.soc-hd.today{color:var(--primary)}
.soc-cell{min-height:58px;border-top:1px solid var(--line);border-left:1px solid var(--line);padding:.22rem;display:flex;flex-direction:column;gap:.2rem;min-width:0}.soc-mo .soc-cell{min-height:86px}.soc-cell.out{opacity:.5}.soc-cell.today{background:color-mix(in srgb,#17595A 8%,transparent)}
.soc-cell.drop{background:color-mix(in srgb,var(--primary) 16%,transparent);outline:2px dashed var(--primary);outline-offset:-3px}.soc-cell .dn{font-size:.72rem;font-weight:700;color:var(--muted)}.soc-hr{font-size:.72rem;font-weight:700;color:var(--muted);padding:.3rem;border-top:1px solid var(--line)}
.soc-chip{display:block;width:100%;text-align:left;font:inherit;font-size:.7rem;border:0;border-left:3px solid #94a3b8;border-radius:6px;padding:.18rem .35rem;background:var(--surface-2,#f1f5f9);color:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.soc-chip.g-scheduled{border-color:#17595A}.soc-chip.g-published{border-color:#2FBF71}.soc-chip.g-failed{border-color:#d1343a}.soc-chip[draggable=true]{cursor:grab}
.soc-add{border:1px dashed var(--line);background:none;color:var(--muted);border-radius:6px;font:inherit;font-size:.75rem;cursor:pointer;opacity:.35;padding:0 .3rem;align-self:flex-start}.soc-cell:hover .soc-add,.soc-add:focus{opacity:1}
.soc-filt{display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-end}.soc-filt>*{flex:1 1 150px;min-width:0}.soc-filt label{display:flex;flex-direction:column;font-size:.78rem;font-weight:600;gap:.2rem}
.soc-row{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:var(--surface,#fff);border:1px solid var(--line);border-radius:12px;padding:.65rem .85rem;margin-bottom:.5rem;cursor:pointer}.soc-row:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}
.soc-row .t{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start}.soc-row .t b{overflow-wrap:anywhere}.soc-row .meta,.soc-tg .meta{display:flex;flex-wrap:wrap;gap:.3rem .8rem;font-size:.8rem;margin-top:.25rem}
.soc-err{font-size:.8rem;color:var(--again,#d1343a);margin:.25rem 0 0;overflow-wrap:anywhere;display:block}
.soc-drawer{margin:0 0 0 auto;height:100dvh;max-height:100dvh;width:min(520px,100vw);max-width:100vw;border:0;border-left:1px solid var(--line);padding:0;background:var(--surface,#fff);color:var(--text,inherit)}.soc-drawer::backdrop{background:rgba(15,23,42,.45)}
.soc-dhd{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;padding:1rem;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface,#fff);z-index:1}.soc-dhd h3{margin:0;font-size:1.05rem;overflow-wrap:anywhere}.soc-dbd{padding:1rem}
.soc-tg{border:1px solid var(--line);border-radius:10px;padding:.6rem .7rem;margin-bottom:.5rem}.soc-tg .h{display:flex;justify-content:space-between;gap:.5rem;align-items:center}.soc-tg a{overflow-wrap:anywhere;font-size:.82rem}
.soc-capbox{white-space:pre-line;overflow-wrap:anywhere;font-size:.88rem;background:var(--surface-2,rgba(0,0,0,.03));border-radius:10px;padding:.6rem .7rem;max-height:180px;overflow:auto}
.soc-met{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4rem}.soc-met div{border:1px solid var(--line);border-radius:10px;padding:.45rem;text-align:center;font-size:.75rem}.soc-met b{display:block;font-size:1.05rem}
.soc-tbl{width:100%;border-collapse:collapse;font-size:.8rem}.soc-tbl th,.soc-tbl td{padding:.35rem .4rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.soc-tbl td:nth-child(2){overflow-wrap:anywhere}.soc-tblw{overflow-x:auto}
.soc-steps{margin:.6rem 0;padding-left:1.2rem;line-height:1.6}.soc-steps code{font-size:.85em}.soc-empty{text-align:center;padding:1.4rem .5rem;color:var(--muted);font-size:.9rem}
.pill.bad{background:#fee2e2;color:#b91c1c}.warn-t{color:#b45309}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .pill.bad{background:#450a0a;color:#fecaca}:root:not([data-theme="light"]) .warn-t,:root:not([data-theme="light"]) .soc-cnt.w{color:#fbbf24}}:root[data-theme="dark"] .pill.bad{background:#450a0a;color:#fecaca}:root[data-theme="dark"] .warn-t,:root[data-theme="dark"] .soc-cnt.w{color:#fbbf24}
@media (max-width:980px){.soc-comp{grid-template-columns:1fr}.soc-sticky{position:static}}
@media (max-width:760px){.soc-grid{grid-template-columns:1fr}}@media (max-width:560px){.soc-form{grid-template-columns:1fr}.soc-btns .btn,.soc-head .acts .btn{flex:1 1 auto;text-align:center}.soc-tabs button{flex:1 1 auto;padding:.45rem .4rem}}`;

  // ---------- Nền tảng & giới hạn thật (theo GrabCast validate.py / threads_rules.py) ----------
  const PL = {
    youtube: { n: 'YouTube', i: '▶️', cap: 5000, byte: true, title: 100, tags: 500 },
    tiktok: { n: 'TikTok', i: '🎵', cap: 2200, nolink: true },
    instagram: { n: 'Instagram Reels', i: '📸', cap: 2200, hash: 5, nolink: true },
    facebook_page: { n: 'Facebook Page', i: '📘', cap: 63206 },
    threads: { n: 'Threads', i: '🧵', cap: 500, links: 5 },
  };
  const ICON = { x: '𝕏', twitter: '𝕏', linkedin: '💼', pinterest: '📌', bluesky: '🦋', mastodon: '🐘', drive: '💾', google: '💾', googledrive: '💾', r2: '☁️' };
  const platKey = p => { p = String(p || '').toLowerCase().replace(/[^a-z_]/g, ''); return p === 'facebook' || p === 'fb' ? 'facebook_page' : p === 'ig' ? 'instagram' : p === 'yt' ? 'youtube' : p; };
  const icon = p => { const k = platKey(p); return (PL[k] && PL[k].i) || ICON[k.replace(/_/g, '')] || '📡'; };
  const pname = p => (PL[platKey(p)] || {}).n || String(p || '?');
  const YTP = { public: 'Công khai', unlisted: 'Không công khai', private: 'Riêng tư' };
  const YTC = [['27', 'Giáo dục'], ['22', 'Mọi người & blog'], ['24', 'Giải trí'], ['28', 'Khoa học & công nghệ']];
  const TTP = { PUBLIC_TO_EVERYONE: 'Mọi người', MUTUAL_FOLLOW_FRIENDS: 'Bạn bè (theo dõi nhau)', FOLLOWER_OF_CREATOR: 'Người theo dõi', SELF_ONLY: 'Chỉ mình tôi' };
  // GrabCast có thể trả { items: [] } / { posts: [] } / mảng trần – đọc mềm dẻo
  const arr = j => (Array.isArray(j) ? j : (j && (j.items || j.data || j.results || j.accounts || j.posts || j.stores || j.objects)) || []);
  const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined; };
  const GROUP = s => { s = String(s || '').toLowerCase(); return /fail|error|partial|needs_check|missed/.test(s) ? 'failed' : /cancel|deleted/.test(s) ? 'cancelled' : /publishing|processing|schedul|queue|pending|deferred/.test(s) ? 'scheduled' : /publish|posted|done|success|complete|live/.test(s) ? 'published' : /draft|new|^$/.test(s) ? 'draft' : 'other'; };
  const GLBL = { draft: ['muted', 'Nháp'], scheduled: ['warn', 'Đã lên lịch'], published: ['ok', 'Đã đăng'], failed: ['bad', 'Lỗi'], cancelled: ['muted', 'Đã hủy'], other: ['muted', 'Khác'] };
  const GB = b => { b = +b || 0; return b >= 1e12 ? (b / 1e12).toFixed(2) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(0) + ' MB' : Math.round(b / 1e3) + ' KB'; };
  const uid = () => ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  const LS = { get(k, d) { try { const v = localStorage.getItem('lk.soc.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('lk.soc.' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua: trình duyệt chặn lưu */ } } };
  // Đếm: YouTube tính byte UTF-8, Threads tính emoji theo byte (cách đếm thận trọng của GrabCast), còn lại tính ký tự
  const bytes = s => { try { return unescape(encodeURIComponent(s)).length; } catch (e) { return s.length * 3; } };
  const clen = (p, s) => { s = String(s || ''); return p === 'youtube' ? bytes(s) : p === 'threads' ? [...s].reduce((n, c) => n + (c.codePointAt(0) > 0xffff ? bytes(c) : 1), 0) : [...s].length; };
  const tagsIn = s => String(s || '').match(/(?:^|\s)#[\p{L}\p{N}_]+/gu) || [];
  const linksIn = s => String(s || '').match(/\bhttps?:\/\/\S+|\bwww\.\S+/gi) || [];
  const tagList = s => [...new Set(String(s || '').split(/[,\n]/).map(x => x.trim().replace(/^#/, '')).filter(Boolean))];
  // Kiểm tra tại chỗ theo luật từng nền tảng → [{ lv: 'error'|'warning', k: câu tiếng Việt (khóa dịch), v }]
  function checkLocal(p, d) {
    const out = [], add = (lv, k, v) => out.push({ lv, k, v }), P = PL[p] || {}, txt = String(d.text || ''), o = d.o || {}, m = d.m || {}, dur = m.dur;
    const n = clen(p, txt); if (P.cap && n > P.cap) add('error', 'Caption quá dài: {n}/{max}.', { n, max: P.cap });
    if (P.nolink && linksIn(txt).length) add('warning', 'Link trong caption không bấm được trên {p}.', { p: P.n });
    if (p === 'youtube') {
      const t = String(d.title || '').trim(), tn = [...t].length, tg = tagList(o.tags).join('').length;
      if (!t) add('error', 'Thiếu tiêu đề YouTube.'); else if (tn > P.title) add('error', 'Tiêu đề YouTube tối đa {max} ký tự ({n}).', { max: P.title, n: tn });
      if (/[<>]/.test(txt)) add('error', 'Mô tả YouTube không được chứa dấu < hoặc >.');
      if (tg > P.tags) add('error', 'Thẻ YouTube tối đa {max} ký tự tổng ({n}).', { max: P.tags, n: tg });
      if (dur != null && dur > 180 && m.h && m.w && m.h >= m.w) add('warning', 'Shorts dài hơn 3 phút sẽ đăng thành video thường.');
    } else if (p === 'tiktok') {
      if (!o.privacy) add('error', 'Chọn quyền riêng tư TikTok (bắt buộc).');
      if (dur != null && dur > 600) add('error', 'Video TikTok qua API tối đa 10 phút.');
    } else if (p === 'instagram') {
      const h = tagsIn(txt).length + tagsIn(d.fc).length; if (h > P.hash) add('warning', 'Instagram chỉ cho tối đa {max} hashtag ({n}, tính cả bình luận đầu tiên).', { max: P.hash, n: h });
      if (dur != null && (dur < 3 || dur > 900)) add('error', 'Reels Instagram phải dài 3 giây – 15 phút.');
    } else if (p === 'facebook_page') {
      if (dur != null && (dur < 3 || dur > 90) && m.h && m.w && m.h >= m.w) add('warning', 'Reel Facebook cần 3–90 giây – sẽ đăng thành video thường.');
    } else if (p === 'threads') {
      const l = linksIn(txt).length; if (l > P.links) add('error', 'Threads tối đa {max} link ({n}).', { max: P.links, n: l });
      if (tagsIn(txt).length > 1) add('warning', 'Threads chỉ biến hashtag đầu tiên thành chủ đề.');
      if (dur != null && dur > 300) add('error', 'Video Threads tối đa 5 phút.');
    }
    return out;
  }
  const kindFor = (a, p, m) => {
    const ks = (a && (a.kinds || a.supported_kinds)) || [], has = k => !ks.length || ks.includes(k), s = m && m.dur, vert = !(m && m.w && m.h) || m.h >= m.w;
    if (p === 'youtube') return has('short') && vert && s != null && s <= 180 ? 'short' : 'video';
    if (p === 'facebook_page') return has('reel') && vert && (s == null || (s >= 3 && s <= 90)) ? 'reel' : 'video';
    return p === 'instagram' ? 'reel' : p === 'threads' ? 'post' : p === 'tiktok' ? 'video' : String(ks[0] || 'video');
  };
  const optsFor = (p, o) => {
    o = o || {};
    if (p === 'youtube') return { privacy_status: o.privacy || 'public', made_for_kids: false, contains_synthetic_media: !!o.ai, category_id: String(o.cat || '27'), tags: tagList(o.tags), notify_subscribers: o.notify !== false };
    if (p === 'tiktok') { const t = { allow_comment: !!o.comment, allow_duet: !!o.duet, allow_stitch: !!o.stitch, is_aigc: !!o.aigc }; if (o.privacy) t.privacy_level = o.privacy; return t; }
    if (p === 'instagram') return Object.assign({ share_to_feed: o.feed !== false }, o.fc ? { first_comment: o.fc } : {});
    if (p === 'facebook_page') return o.fc ? { first_comment: o.fc } : {};
    return {};
  };

  // ---------- Giờ New York (tự xử lý EST/EDT) & khung giờ vàng ----------
  const NY = 'America/New_York', SLOTS = [7, 8, 12, 19, 20];
  const nyParts = d => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: NY, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  const nyAt = (y, m, d, h, mi = 0) => { const want = Date.UTC(y, m - 1, d, h, mi); let t = want + 5 * 36e5; for (let i = 0; i < 3; i++) { const p = nyParts(new Date(t)); t += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); } return new Date(t); };
  const dayKey = d => { const p = nyParts(d); return `${p.year}-${p.month}-${p.day}`; };
  const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const wday = k => new Date(k + 'T12:00:00Z').getUTCDay(); // 0 = Chủ nhật
  const atNY = (k, h, mi = 0) => { const [y, m, d] = k.split('-').map(Number); return nyAt(y, m, d, h, mi); };
  const postTime = p => pick(p, 'scheduled_at', 'published_at');
  // Giờ (New York) đã có bài lên lịch/đã đăng trên các kênh liên quan → không xếp thêm vào cùng giờ
  const takenSet = (posts, acc) => {
    const s = new Set(), want = (acc || []).map(String);
    for (const p of posts || []) {
      const g = GROUP(pick(p, 'status', 'state')), t = postTime(p); if ((g !== 'scheduled' && g !== 'published') || !t) continue;
      if (want.length && (p.targets || []).length && !p.targets.some(x => want.includes(String(x.account_id)))) continue;
      const q = nyParts(new Date(t)); s.add(`${q.year}-${q.month}-${q.day}T${+q.hour % 24}`);
    }
    return s;
  };
  function freeSlots(posts, opt = {}) {
    const n = opt.n || 5, now = opt.now || Date.now(), hours = [...(opt.hours || SLOTS)].map(Number).sort((a, b) => a - b), taken = opt.taken || takenSet(posts, opt.acc), out = [];
    const today = dayKey(new Date(now)); let k = opt.from && opt.from > today ? opt.from : today;
    for (let i = 0; i < 400 && out.length < n && hours.length; i++, k = addDays(k, 1)) {
      if (opt.skipWeekend && (wday(k) === 0 || wday(k) === 6)) continue;
      for (const h of hours) { if (out.length >= n) break; const t = atNY(k, h); if (+t < now + 15 * 6e4 || taken.has(k + 'T' + h)) continue; taken.add(k + 'T' + h); out.push({ h, t, key: k }); }
    }
    return out;
  }
  // Lên lịch hàng loạt: mỗi video 1 khung trống kế tiếp
  const planBulk = (videos, posts, opt = {}) => { const sl = freeSlots(posts, { ...opt, n: videos.length }); return videos.map((v, i) => ({ v, t: sl[i] ? sl[i].t : null, key: sl[i] && sl[i].key, h: sl[i] && sl[i].h })); };
  // Chống đăng trùng: cùng video (đã ghi nhớ) hoặc cùng caption trên cùng kênh, bài chưa hủy/lỗi
  const dupOf = (posts, d) => {
    const used = (d.src && (LS.get('used', {})[d.src] || [])) || [], acc = (d.acc || []).map(String), cap = String(d.cap || '').trim();
    return (posts || []).find(p => {
      const g = GROUP(pick(p, 'status', 'state')); if (g === 'cancelled' || g === 'failed') return false;
      if (!(p.targets || []).some(t => acc.includes(String(t.account_id)))) return false;
      return used.includes(String(p.id)) || (cap.length > 8 && String(p.caption || '').trim() === cap);
    });
  };
  const remember = (src, pid) => { if (!src || !pid) return; const u = LS.get('used', {}); u[src] = [...new Set([...(u[src] || []), String(pid)])].slice(-20); const ks = Object.keys(u); if (ks.length > 300) delete u[ks[0]]; LS.set('used', u); };
  const localInput = d => new Date(+d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const isVideo = o => /^video\//.test(String(pick(o, 'content_type', 'mime_type', 'mime') || '')) || String(pick(o, 'type', 'kind') || '') === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(String(pick(o, 'filename', 'name', 'key') || ''));
  const https = u => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
  const img = u => (typeof u === 'string' && /^(https:\/\/|data:image\/)/.test(u) ? u : '');
  const thumbOf = o => { const t = pick(o, 'thumb_url', 'thumb', 'poster_url', 'preview_url', 'thumbnail_url'); return img(t) || (t && typeof t === 'object' ? img(t.url) : ''); };
  const objMeta = o => {
    const m = (o && typeof o.meta === 'object' && o.meta) || {}; let dur = +pick(m, 'duration', 'duration_s', 'seconds') || +pick(o, 'duration', 'duration_s') || 0; const ms = +pick(m, 'duration_ms') || +pick(o, 'duration_ms') || 0; if (!dur && ms) dur = ms / 1000;
    return { dur: dur || null, w: +pick(m, 'w', 'width') || +pick(o, 'width') || null, h: +pick(m, 'h', 'height') || +pick(o, 'height') || null, size: +pick(o, 'size', 'size_bytes', 'bytes') || 0, thumb: thumbOf(o), url: o && o._url };
  };
  const fmtDur = s => (s == null ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);
  const baseName = s => String(s || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_-]+/g, ' ').trim();
  const accName = a => pick(a, 'display_name', 'name', 'username', 'handle', 'title', 'id') || '?';
  const accPlat = a => pick(a, 'platform', 'provider', 'network', 'type') || '';

  let gen = 0, pending = null;
  function render(box, sapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN'), alive = () => my === gen && box.isConnected;
    const S = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const fmt = (t, o) => new Date(t).toLocaleString(LOC(), { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', ...o });
    const both = t => (t ? `${fmt(t, { timeZone: NY })} · ${fmt(t)}` : '–');
    const hhNY = t => new Date(t).toLocaleTimeString(LOC(), { timeZone: NY, hour: '2-digit', minute: '2-digit' });
    const lnk = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
    const errText = e => (e && e.code === 'api_key_invalid' ? S('Khóa GrabCast không hợp lệ hoặc đã bị thu hồi – tạo khóa mới tại {link} rồi cập nhật secret GRABCAST_API_KEY trên Cloudflare Pages.', { link: 'grabcast.click/account.html#api' })
      : e && e.code === 'api_key_not_allowed' ? S('Khóa GrabCast không có quyền cho thao tác này (hoặc không thuộc workspace Lexkite) – cấp thêm quyền social/storage cho khóa tại {link}.', { link: 'grabcast.click/account.html#api' })
      : e && e.code === 'grabcast-rate' ? S('Quá giới hạn GrabCast (60 lượt/phút) – đợi 1 phút rồi thử lại.') : e && e.code === 'timeout' ? S('GrabCast không phản hồi trong 15 giây.') : String((e && e.message) || e).slice(0, 300));
    const errHtml = e => (e && /^api_key_/.test(e.code || '') ? errText(e).replace('grabcast.click/account.html#api', lnk(GC_KEY, 'grabcast.click/account.html#api')) : esc(errText(e)));
    const opt = (v, t, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(t)}</option>`;
    const hl = s => esc(s).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="ht">$2</span>');
    const pill = g => `<span class="pill ${GLBL[g][0]}">${S(GLBL[g][1])}</span>`;
    const avHtml = (a, cls = '') => { const n = a ? accName(a) : 'Lexkite', u = a && https(pick(a, 'avatar_url', 'picture', 'avatar')); return `<span class="soc-av ${cls}" aria-hidden="true">${esc(String(n).trim().charAt(0).toUpperCase() || '?')}${u ? `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>`; };
    if (!document.getElementById('admSocialCss')) { const st = document.createElement('style'); st.id = 'admSocialCss'; st.textContent = CSS; document.head.appendChild(st); }
    // Mọi nội dung nằm trong .soc-wrap (khung main dùng chung với tab khác → không để lại class/sự kiện trên main)
    const put = html => { box.innerHTML = `<div class="soc-wrap">${html}</div>`; box.firstElementChild.addEventListener('error', e => { if (e.target && e.target.tagName === 'IMG' && e.target.closest('.soc-av,.soc-th')) e.target.remove(); }, true); }; // ảnh hỏng (link hết hạn) → chữ cái đầu

    const TABS = [['compose', '✍️ Soạn bài'], ['calendar', '📅 Lịch'], ['posts', '🗂️ Bài đăng'], ['accounts', '📡 Kênh & Drive']];
    const D = { stores: [], accounts: [], posts: [], objects: [], bad: {} };
    const accById = id => D.accounts.find(a => String(a.id) === String(id));
    let tab = pending ? 'compose' : LS.get('tab', 'compose'); if (!TABS.some(t => t[0] === tab)) tab = 'compose';
    const C = { src: null, title: '', cap: '', fc: '', link: '', acc: [], at: '', pt: '', pv: '', srv: {}, mid: null, midFor: null, idem: uid(), tt: null, ttFor: null, q: '', busy: false,
      per: { youtube: { cap: '', privacy: 'public', cat: '27', tags: '', ai: false, notify: true }, tiktok: { cap: '', privacy: '', comment: false, duet: false, stitch: false, aigc: false }, instagram: { cap: '', fc: '', feed: true }, facebook_page: { cap: '', fc: '' }, threads: { cap: '' } } };
    let pre = pending; pending = null;
    if (pre) { C.title = String(pre.title || '').slice(0, 100); C.cap = String(pre.caption || ''); }

    const head = `<div class="soc-head"><div><h2>${S('🎬 Video & Social')}</h2><p class="small muted" style="margin:.2rem 0 0">${S('Lưu video trên Drive và đăng lên các kênh qua GrabCast.')}</p><p class="tiny muted" id="socTz" style="margin:.25rem 0 0"></p></div>
      <div class="acts"><a class="btn ghost sm" href="${GC_ACC}" target="_blank" rel="noopener">${S('Kết nối kênh/Drive trên GrabCast ↗')}</a><button type="button" class="btn sm" id="socReload">${S('🔄 Tải lại')}</button></div></div>`;
    const tabsHtml = () => `<div class="soc-tabs" role="tablist" aria-label="${esc(S('Mục Video & Social'))}">${TABS.map(([k, t]) => `<button type="button" role="tab" id="socT-${k}" data-tab="${k}" aria-selected="${k === tab}" aria-controls="socBody" tabindex="${k === tab ? 0 : -1}">${S(t)}</button>`).join('')}</div>`;
    put(head + `<p class="small muted">${S('Đang tải…')}</p>`);
    const $ = s => box.querySelector(s);
    const bindHead = () => { const b = $('#socReload'); if (b) b.onclick = () => render(box, sapi, L, h); tick(); };
    let iv = null;
    function tick() { const el = $('#socTz'); if (!el || !alive()) { clearInterval(iv); return; } const n = new Date(); el.textContent = S('🗽 New York: {ny} · 🕒 Giờ của bạn: {loc}', { ny: fmt(n, { timeZone: NY, weekday: undefined, day: undefined, month: undefined }), loc: fmt(n, { weekday: undefined, day: undefined, month: undefined }) }); }
    iv = setInterval(tick, 30000);
    bindHead();
    const badHtml = k => (D.bad[k] ? `<p class="small bad-t">${S('✗ {e}', { e: errHtml(D.bad[k]) })}</p>` : '');

    Promise.allSettled([sapi('GET', 'storage/stores'), sapi('GET', 'accounts'), sapi('GET', 'posts', null, { query: { limit: 200 } }), sapi('GET', 'storage/objects', null, { query: { limit: 200, type: 'video' } })]).then(res => {
      if (!alive()) return;
      if (res.some(r => r.status === 'rejected' && r.reason && r.reason.code === 'not-configured')) return setup();
      ['stores', 'accounts', 'posts', 'objects'].forEach((k, i) => { D[k] = res[i].status === 'fulfilled' ? arr(res[i].value) : []; D.bad[k] = res[i].status === 'rejected' ? res[i].reason : null; });
      D.objects = D.objects.filter(isVideo); D.accounts = D.accounts.filter(a => platKey(accPlat(a)) !== 'google_drive');
      if (pre && pre.objectId) { const o = D.objects.find(x => String(x.id) === String(pre.objectId)); if (o) C.src = { type: 'obj', id: o.id, name: pick(o, 'name', 'filename') || o.id, ...objMeta(o) }; }
      put(head + tabsHtml() + '<div id="socBody" role="tabpanel"></div>');
      bindHead();
      const tl = $('.soc-tabs');
      tl.onclick = e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); };
      tl.onkeydown = e => { const i = TABS.findIndex(t => t[0] === tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); go(TABS[(i + d + TABS.length) % TABS.length][0]); $('#socT-' + tab).focus(); };
      paint();
    });
    function go(t) { tab = t; LS.set('tab', t); box.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); paint(); }
    function paint() { const b = $('#socBody'); if (!b) return; b.setAttribute('aria-labelledby', 'socT-' + tab); ({ compose, calendar: calendarTab, posts: postsTab, accounts: accountsTab })[tab](b); }

    function setup() {
      put(head + `<section class="card"><h3 style="margin:0">${S('⚙️ Chưa kết nối GrabCast')}</h3><p class="small" style="margin:.5rem 0 0">${S('Máy chủ chưa có khóa GrabCast. Làm 1 lần:')}</p>
        <ol class="soc-steps small"><li>${S('Mở {link} → tạo khóa API với quyền <b>social:read, social:write, storage:read, storage:write</b>.', { link: lnk(GC_KEY, 'grabcast.click/account.html#api') })}</li>
        <li>${S('Cloudflare Pages → lexkite → Settings → Variables and Secrets: thêm <b>secret</b> {k} (giá trị khóa) và biến {w} (mã workspace).', { k: '<code>GRABCAST_API_KEY</code>', w: `<code>GRABCAST_WORKSPACE</code> = <code>${WS}</code>` })}</li>
        <li>${S('Triển khai lại bản mới nhất (Retry deployment) rồi tải lại tab này.')}</li></ol><p class="tiny muted" style="margin:0">${S('🔒 Khóa chỉ máy chủ dùng, không bao giờ gửi xuống trình duyệt. Không dán khóa vào đây hay vào repo.')}</p></section>`);
      bindHead();
    }
    const emptyConn = t => `<p class="small muted" style="margin:.5rem 0 0">${S(t)} ${S('Kết nối tại {link} (chọn workspace <b>Lexkite</b>).', { link: lnk(GC_ACC, 'grabcast.click/scheduler.html') })}</p>`;
    // Hộp thoại dùng chung (có dự phòng khi trình duyệt thiếu showModal)
    function modal(cls, html, label) {
      const d = document.createElement('dialog'); d.className = cls; d.innerHTML = html; if (label) d.setAttribute('aria-label', label); document.body.appendChild(d);
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      const shut = () => { if (typeof d.close === 'function' && d.open) d.close(); else { d.remove(); d.dispatchEvent(new Event('close')); } };
      d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) shut(); });
      return { d, shut };
    }

    // ======================= SOẠN BÀI =======================
    const vids = () => D.objects;
    const selPlats = () => [...new Set(C.acc.map(id => platKey(accPlat(accById(id) || {}))).filter(p => PL[p]))];
    const eff = p => ((C.per[p] && String(C.per[p].cap || '').trim()) ? C.per[p].cap : C.cap);
    const fcEff = p => ((C.per[p] && C.per[p].fc) || C.fc);
    const localErr = p => checkLocal(p, { text: eff(p), title: C.title, fc: fcEff(p), o: C.per[p], m: C.src || {} }).some(x => x.lv === 'error');
    const probsFor = p => [...checkLocal(p, { text: eff(p), title: C.title, fc: fcEff(p), o: C.per[p], m: C.src || {} }).map(x => ({ lv: x.lv, m: S(x.k, x.v) })), ...(C.srv[p] || []).map(x => ({ lv: x.lv, m: S('GrabCast: {m}', { m: x.m }) }))];
    const msg = (t, okk) => { const m = $('#cmMsg'); if (!m) return; m.textContent = t; m.className = 'soc-msg small ' + (okk === true ? 'ok-t' : okk === false ? 'bad-t' : 'muted'); };
    function compose(b) {
      const accs = D.accounts;
      b.innerHTML = `<div class="soc-comp"><div>
        <section class="card"><h3>${S('🎞️ Video')}</h3>
          <div class="row" style="gap:.5rem"><input type="search" id="cmQ" placeholder="${esc(S('Tìm video…'))}" aria-label="${esc(S('Tìm trong kho video'))}" value="${esc(C.q)}" style="flex:1 1 180px"><label class="btn sm"><input type="file" id="cmFile" accept="video/*" hidden>${S('⬆️ Tải video mới')}</label></div>
          <div class="soc-prog" hidden id="cmProg"><i></i></div><div class="soc-media" id="cmMedia" role="group" aria-label="${esc(S('Kho video'))}"></div>${badHtml('objects')}<div id="cmSel"></div></section>
        <section class="card"><h3>${S('✍️ Nội dung')}</h3><div class="soc-form">
          <label class="wide"><span class="soc-lbl">${S('Caption chung')}<span class="soc-cnts" id="cmCapN"></span></span><textarea id="cmCap" rows="5">${esc(C.cap)}</textarea></label>
          <div class="wide row" style="gap:.4rem"><select id="cmTpl" aria-label="${esc(S('Mẫu caption'))}" style="flex:1 1 160px"></select><button type="button" class="btn sm ghost" id="cmTplSave">${S('💾 Lưu làm mẫu')}</button><button type="button" class="btn sm ghost danger" id="cmTplDel" aria-label="${esc(S('Xóa mẫu đang chọn'))}">🗑</button></div>
          <div class="wide"><span class="small" style="font-weight:600">${S('Bộ hashtag:')}</span><div class="soc-chips" id="cmTags" style="margin:.3rem 0"></div><button type="button" class="btn sm ghost" id="cmTagSave">${S('＃ Lưu hashtag đang dùng')}</button></div>
          <label>${S('Bình luận đầu tiên')}<input id="cmFc" maxlength="2200" value="${esc(C.fc)}"></label><label>${S('Link')}<input id="cmLink" type="url" placeholder="https://lexkite.com/" value="${esc(C.link)}"></label>
          <div class="wide"><div class="small" style="font-weight:600;margin-bottom:.3rem">${S('Đăng lên kênh')}</div><div class="soc-targets" id="cmAcc">${accs.map(a => `<label><input type="checkbox" value="${esc(a.id)}" ${C.acc.includes(String(a.id)) ? 'checked' : ''}> ${avHtml(a, 's')} ${icon(accPlat(a))} <span>${esc(accName(a))}</span></label>`).join('') || emptyConn('Workspace Lexkite chưa có kênh nào.')}</div>${badHtml('accounts')}</div>
        </div></section>
        <section class="card"><h3>${S('⚙️ Tùy chỉnh từng nền tảng')}</h3><div class="soc-ptabs" role="tablist" id="cmPT" aria-label="${esc(S('Nền tảng'))}"></div><div id="cmPanel" role="tabpanel"></div></section>
        <section class="card"><h3>${S('🕒 Thời gian đăng')}</h3><div class="soc-form"><label class="wide">${S('Giờ đăng (giờ máy bạn)')}<input type="datetime-local" id="cmAt" value="${esc(C.at)}"></label></div>
          <div class="row" style="gap:.5rem;margin-top:.5rem"><button type="button" class="btn sm" id="cmNext">${S('⏭ Khung trống kế tiếp')}</button></div>
          <p class="small muted" style="margin:.5rem 0 0">${S('Khung giờ vàng còn trống ở Mỹ (giờ New York):')}</p><div class="soc-times" id="cmTimes"></div><p class="small" id="cmAtTz" style="margin:.5rem 0 0"></p>
          <div class="soc-btns"><button type="button" class="btn ghost" id="cmVal">${S('Kiểm tra')}</button><button type="button" class="btn" id="cmDraft">${S('Lưu nháp')}</button><button type="button" class="btn primary" id="cmSched">${S('Lên lịch')}</button><button type="button" class="btn ghost danger" id="cmNow">${S('Đăng ngay')}</button></div>
          <div class="soc-msg small" id="cmMsg" role="status" aria-live="polite"></div></section>
      </div><aside><div class="soc-sticky card"><h3>${S('👁️ Xem trước')}</h3><div class="soc-ptabs" role="tablist" id="pvT" aria-label="${esc(S('Xem trước cho'))}"></div><div id="pv"></div><p class="tiny muted" style="margin:.6rem 0 0">${S('Mô phỏng gần đúng – bố cục thật do từng nền tảng quyết định.')}</p></div></aside></div>`;
      paintMedia(); paintSel(); paintTpl(); paintTags(); paintPT(); paintTimes(); refresh();
      $('#cmQ').oninput = e => { C.q = e.target.value; paintMedia(); };
      $('#cmMedia').onclick = e => { const it = e.target.closest('[data-oid]'); if (!it) return; const o = vids().find(x => String(x.id) === it.dataset.oid); if (!o) return; C.src = { type: 'obj', id: o.id, name: pick(o, 'name', 'filename') || o.id, ...objMeta(o) }; C.mid = null; C.srv = {}; paintMedia(); paintSel(); refresh(); };
      $('#cmFile').onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) uploadNow(f); };
      $('#cmCap').oninput = e => { C.cap = e.target.value; C.srv = {}; refresh(); };
      $('#cmFc').oninput = e => { C.fc = e.target.value; C.srv = {}; refresh(); };
      $('#cmLink').oninput = e => { C.link = e.target.value; };
      $('#cmAcc').onchange = () => { C.acc = [...box.querySelectorAll('#cmAcc input:checked')].map(i => i.value); C.srv = {}; paintPT(); refresh(); };
      $('#cmTpl').onchange = e => { const t = e.target.value !== '' && LS.get('tpl', [])[+e.target.value]; if (!t) return; if (C.cap.trim() && C.cap !== t.body && !confirm(S('Thay caption hiện tại bằng mẫu “{n}”?', { n: t.name }))) { e.target.value = ''; return; } C.cap = t.body; $('#cmCap').value = t.body; C.srv = {}; refresh(); };
      $('#cmTplSave').onclick = () => { if (!C.cap.trim()) return msg(S('Nhập caption.'), false); const n = (prompt(S('Tên mẫu caption:')) || '').trim().slice(0, 60); if (!n) return; LS.set('tpl', [...LS.get('tpl', []).filter(x => x.name !== n), { name: n, body: C.cap }].slice(-50)); paintTpl(); };
      $('#cmTplDel').onclick = () => { const l = LS.get('tpl', []), v = $('#cmTpl').value, i = v === '' ? -1 : +v; if (!l[i]) return msg(S('Chọn một mẫu caption trước.'), false); if (!confirm(S('Xóa mẫu “{n}”?', { n: l[i].name }))) return; l.splice(i, 1); LS.set('tpl', l); paintTpl(); };
      $('#cmTags').onclick = e => {
        const a = e.target.closest('[data-tag]'), x = e.target.closest('[data-tagdel]'), sets = tagSets();
        if (a) { const s = sets[+a.dataset.tag]; if (!s) return; const have = new Set(tagsIn(C.cap).map(t => t.trim().toLowerCase())), add = s.tags.map(t => '#' + t).filter(t => !have.has(t.toLowerCase())); if (add.length) { C.cap = C.cap.replace(/\s*$/, '') + (C.cap.trim() ? '\n\n' : '') + add.join(' '); $('#cmCap').value = C.cap; refresh(); } }
        if (x) { const s = sets[+x.dataset.tagdel]; if (s && confirm(S('Xóa bộ hashtag “{n}”?', { n: s.name }))) { sets.splice(+x.dataset.tagdel, 1); LS.set('tags', sets); paintTags(); } }
      };
      $('#cmTagSave').onclick = () => { const t = [...new Set(tagsIn(C.cap).map(x => x.trim().slice(1)))]; if (!t.length) return msg(S('Caption chưa có hashtag nào.'), false); const n = (prompt(S('Tên bộ hashtag:')) || '').trim().slice(0, 40); if (!n) return; LS.set('tags', [...tagSets().filter(x => x.name !== n), { name: n, tags: t.slice(0, 30) }].slice(-30)); paintTags(); };
      const pt = $('#cmPT');
      pt.onclick = e => { const x = e.target.closest('[data-p]'); if (x) { C.pt = x.dataset.p; paintPT(); } };
      pt.onkeydown = e => { const ps = selPlats(), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d || !ps.length) return; e.preventDefault(); C.pt = ps[(ps.indexOf(C.pt) + d + ps.length) % ps.length]; paintPT(); const f = pt.querySelector('[aria-selected=true]'); if (f) f.focus(); };
      const onPanel = e => { const el = e.target.closest('[data-k]'); if (!el) return; const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.value; if (k === 'title') C.title = v; else C.per[C.pt][k] = v; C.srv = {}; refresh(); };
      $('#cmPanel').oninput = onPanel; $('#cmPanel').onchange = onPanel;
      $('#pvT').onclick = e => { const x = e.target.closest('[data-p]'); if (x) { C.pv = x.dataset.p; paintPv(); } };
      $('#cmAt').oninput = e => { C.at = e.target.value; paintAt(); };
      $('#cmNext').onclick = () => { const s = freeSlots(D.posts, { n: 1, acc: C.acc })[0]; if (!s) return msg(S('Hết khung trống trong 400 ngày tới.'), false); setAt(s.t); };
      $('#cmTimes').onclick = e => { const x = e.target.closest('[data-at]'); if (x) setAt(new Date(+x.dataset.at)); };
      $('#cmVal').onclick = () => run('val'); $('#cmDraft').onclick = () => run('draft'); $('#cmSched').onclick = () => run('sched'); $('#cmNow').onclick = () => run('now');
      busy(C.busy);
    }
    const tagSets = () => { const l = LS.get('tags', null); return Array.isArray(l) ? l : [{ name: 'IELTS', tags: ['IELTS', 'LearnEnglish', 'Lexkite'] }, { name: 'TOEIC', tags: ['TOEIC', 'EnglishVocabulary', 'Lexkite'] }]; };
    function paintTpl() { const s = $('#cmTpl'); if (s) s.innerHTML = `<option value="">${esc(S('— Mẫu caption —'))}</option>` + LS.get('tpl', []).map((t, i) => opt(i, t.name, '')).join(''); }
    function paintTags() { const el = $('#cmTags'); if (el) el.innerHTML = tagSets().map((s, i) => `<span class="soc-tag"><button type="button" data-tag="${i}" title="${esc(s.tags.map(t => '#' + t).join(' '))}" aria-label="${esc(S('Thêm bộ hashtag {n}', { n: s.name }))}">＃ ${esc(s.name)} <small class="muted">${s.tags.length}</small></button><button type="button" data-tagdel="${i}" aria-label="${esc(S('Xóa bộ {n}', { n: s.name }))}">✕</button></span>`).join(''); }
    function paintMedia() {
      const el = $('#cmMedia'); if (!el) return; const q = C.q.trim().toLowerCase(), list = vids().filter(o => !q || String(pick(o, 'name', 'filename') || '').toLowerCase().includes(q)).slice(0, 120);
      el.innerHTML = list.map(o => { const m = objMeta(o), on = C.src && String(C.src.id) === String(o.id), nm = String(pick(o, 'name', 'filename', 'id')); return `<button type="button" class="soc-mi ${on ? 'on' : ''}" data-oid="${esc(o.id)}" aria-pressed="${!!on}" title="${esc(nm)}"><span class="soc-th">${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy">` : '🎬'}</span><b>${esc(nm)}</b><span class="muted">${GB(m.size)}${m.dur ? ' · ' + fmtDur(m.dur) : ''}</span></button>`; }).join('')
        || `<p class="soc-empty">${S(vids().length ? 'Không có video khớp.' : 'Kho chưa có video nào – tải video mới lên.')}</p>`;
    }
    function paintSel() {
      const el = $('#cmSel'); if (!el) return; const s = C.src;
      if (!s) { el.innerHTML = `<p class="small muted" style="margin:.3rem 0 0">${S('Chưa chọn video.')}</p>`; return; }
      const md = s.url ? `<video src="${esc(s.url)}" controls muted playsinline preload="metadata"></video>` : s.thumb ? `<img src="${esc(s.thumb)}" alt="">` : '🎬';
      el.innerHTML = `<div class="soc-sel"><span class="soc-th">${md}</span><div style="min-width:0"><b style="overflow-wrap:anywhere">${esc(s.name)}</b><div class="muted">${[s.size ? GB(s.size) : '', s.dur ? '⏱ ' + fmtDur(s.dur) : '', s.w && s.h ? `${s.w}×${s.h} · ${S(s.h >= s.w ? 'dọc' : 'ngang')}` : ''].filter(Boolean).join(' · ')}</div></div></div>`;
    }
    function paintPT() {
      const ps = selPlats(), el = $('#cmPT'); if (!el) return; if (!ps.includes(C.pt)) C.pt = ps[0] || '';
      el.innerHTML = ps.map(p => { const pr = probsFor(p), dot = pr.some(x => x.lv === 'error') ? '<span class="dot" aria-label="⛔"></span>' : pr.length ? '<span class="dot w" aria-label="⚠️"></span>' : ''; return `<button type="button" role="tab" data-p="${p}" aria-selected="${p === C.pt}" tabindex="${p === C.pt ? 0 : -1}">${PL[p].i} ${esc(PL[p].n)}${dot}</button>`; }).join('');
      paintPanel(); paintPv();
      if (ps.includes('tiktok')) loadTT();
    }
    // TikTok yêu cầu đọc creator_info mỗi lần mở biểu mẫu (quy tắc UX của TikTok)
    function loadTT() {
      const a = C.acc.map(accById).find(x => x && platKey(accPlat(x)) === 'tiktok'); if (!a || C.ttFor === String(a.id)) return; C.ttFor = String(a.id);
      sapi('GET', `tiktok/creator-info/${encodeURIComponent(a.id)}`).then(r => { C.tt = r; if (alive() && C.pt === 'tiktok') paintPanel(); }).catch(() => { C.tt = null; });
    }
    const cntSpan = k => `<span class="soc-cnt" data-cnt="${k}"></span>`;
    function paintPanel() {
      const el = $('#cmPanel'); if (!el) return; const p = C.pt;
      if (!p) { el.innerHTML = `<p class="small muted">${S('Chọn kênh ở trên để chỉnh riêng từng nền tảng.')}</p>`; return; }
      const o = C.per[p], accs = C.acc.map(accById).filter(a => a && platKey(accPlat(a)) === p);
      const capBox = l => `<label class="wide"><span class="soc-lbl">${l}${cntSpan('cap')}</span><textarea data-k="cap" rows="4" placeholder="${esc(S('Để trống = dùng caption chung'))}">${esc(o.cap)}</textarea></label>`;
      const chk = (k, l, dis) => `<label class="chk wide"><input type="checkbox" data-k="${k}" ${o[k] ? 'checked' : ''} ${dis ? 'disabled' : ''}> ${l}</label>`;
      let f = '';
      if (p === 'youtube') f = `<label class="wide"><span class="soc-lbl">${S('Tiêu đề YouTube')}${cntSpan('title')}</span><input data-k="title" value="${esc(C.title)}"></label>${capBox(S('Mô tả'))}
        <label class="wide"><span class="soc-lbl">${S('Thẻ (cách nhau bằng dấu phẩy)')}${cntSpan('tags')}</span><input data-k="tags" value="${esc(o.tags)}"></label>
        <label>${S('Quyền riêng tư')}<select data-k="privacy">${Object.keys(YTP).map(v => opt(v, S(YTP[v]), o.privacy)).join('')}</select></label><label>${S('Danh mục')}<select data-k="cat">${YTC.map(([v, t]) => opt(v, S(t), o.cat)).join('')}</select></label>
        <p class="small muted wide" style="margin:0">${S('Dành cho trẻ em: Không (cố định cho Lexkite).')}</p>${chk('ai', S('Có nội dung chân thực được tạo/chỉnh bằng AI (YouTube yêu cầu khai báo)'))}<label class="chk wide"><input type="checkbox" data-k="notify" ${o.notify !== false ? 'checked' : ''}> ${S('Thông báo cho người đăng ký')}</label>`;
      else if (p === 'tiktok') { const tt = C.tt || {}, ops = Array.isArray(tt.privacy_level_options) && tt.privacy_level_options.length ? tt.privacy_level_options : Object.keys(TTP);
        f = `${tt.can_post === false ? `<p class="small bad-t wide" style="margin:0">${esc(S('TikTok: {m}', { m: tt.message || S('Tài khoản TikTok này đang không đăng được.') }))}</p>` : ''}${capBox(S('Caption TikTok'))}
        <label class="wide">${S('Quyền riêng tư')}<select data-k="privacy"><option value="">${esc(S('— chọn (bắt buộc) —'))}</option>${ops.map(v => opt(v, TTP[v] ? S(TTP[v]) : v, o.privacy)).join('')}</select></label>
        ${chk('comment', S('Cho phép bình luận'), tt.comment_disabled)}${chk('duet', S('Cho phép Duet'), tt.duet_disabled)}${chk('stitch', S('Cho phép Stitch'), tt.stitch_disabled)}${chk('aigc', S('Gắn nhãn nội dung AI'))}`; }
      else if (p === 'instagram') f = `${capBox(S('Caption Reels'))}<label class="wide"><span class="soc-lbl">${S('Bình luận đầu tiên (Instagram)')}${cntSpan('fc')}</span><input data-k="fc" value="${esc(o.fc)}" placeholder="${esc(S('Để trống = dùng bình luận đầu tiên chung'))}"></label><label class="chk wide"><input type="checkbox" data-k="feed" ${o.feed !== false ? 'checked' : ''}> ${S('Hiện Reel cả trên lưới Feed')}</label>`;
      else if (p === 'facebook_page') f = `${capBox(S('Caption Facebook'))}<label class="wide">${S('Bình luận đầu tiên (Facebook)')}<input data-k="fc" value="${esc(o.fc)}" placeholder="${esc(S('Để trống = dùng bình luận đầu tiên chung'))}"></label>`;
      else f = capBox(S('Nội dung Threads'));
      el.innerHTML = `<p class="small muted" style="margin:0 0 .6rem">${accs.map(a => `${avHtml(a, 's')} ${esc(accName(a))}`).join(' · ')} · ${S('Loại bài: {k}', { k: kindFor(accs[0], p, C.src || {}) })}</p><div class="soc-form">${f}</div><ul class="soc-probs" id="cmProbs" aria-live="polite"></ul>`;
      refresh();
    }
    const cntTxt = (n, max, pre = '') => `<span class="soc-cnt ${n > max ? 'x' : n > max * 0.9 ? 'w' : ''}">${pre}${n.toLocaleString(LOC())}/${max.toLocaleString(LOC())}</span>`;
    function refresh() {
      const ps = selPlats(), show = ps.length ? ps : Object.keys(PL), capN = $('#cmCapN');
      if (capN) { const t = tagsIn(C.cap).length, l = linksIn(C.cap).length; capN.innerHTML = show.map(p => `<span title="${esc(PL[p].n)}">${PL[p].i} ${cntTxt(clen(p, C.cap), PL[p].cap)}</span>`).join('') + `<span class="soc-cnt ${ps.includes('instagram') && t > 5 ? 'w' : ''}">${S('{n} hashtag', { n: t })}</span>` + (l ? `<span class="soc-cnt ${ps.some(p => PL[p].nolink) ? 'w' : ''}">🔗 ${S('{n} link', { n: l })}</span>` : ''); }
      const p = C.pt, pn = $('#cmPanel');
      if (p && pn) {
        pn.querySelectorAll('[data-cnt]').forEach(s => { const k = s.dataset.cnt, o = C.per[p];
          s.outerHTML = `<span data-cnt="${k}">${k === 'cap' ? cntTxt(clen(p, eff(p)), PL[p].cap) + (p === 'instagram' ? ' ' + cntTxt(tagsIn(eff(p)).length + tagsIn(fcEff(p)).length, PL.instagram.hash, '# ') : '') : k === 'title' ? cntTxt([...C.title].length, 100) : k === 'tags' ? cntTxt(tagList(o.tags).join('').length, 500) : cntTxt([...fcEff(p)].length, 2200)}</span>`; });
        const pr = $('#cmProbs'); if (pr) pr.innerHTML = probsFor(p).map(x => `<li class="${x.lv === 'error' ? '' : 'w'}">${x.lv === 'error' ? '⛔' : '⚠️'} ${esc(x.m)}</li>`).join('');
      }
      box.querySelectorAll('#cmPT [data-p]').forEach(bt => { const pr = probsFor(bt.dataset.p), d = bt.querySelector('.dot'), want = pr.some(x => x.lv === 'error') ? 'dot' : pr.length ? 'dot w' : ''; if (d) d.remove(); if (want) bt.insertAdjacentHTML('beforeend', `<span class="${want}" aria-label="${want === 'dot' ? '⛔' : '⚠️'}"></span>`); });
      paintPv(); paintAt();
    }
    function paintPv() {
      const el = $('#pv'), t = $('#pvT'); if (!el || !t) return; const ps = selPlats().length ? selPlats() : Object.keys(PL); if (!ps.includes(C.pv)) C.pv = ps.includes(C.pt) ? C.pt : ps[0];
      t.innerHTML = ps.map(p => `<button type="button" role="tab" data-p="${p}" aria-selected="${p === C.pv}" title="${esc(PL[p].n)}">${PL[p].i}</button>`).join('');
      el.innerHTML = phone(C.pv);
    }
    function phone(p) {
      const a = C.acc.map(accById).find(x => x && platKey(accPlat(x)) === p), who = a ? accName(a) : 'Lexkite', handle = a ? pick(a, 'username', 'handle') || who : 'lexkite', s = C.src || {}, kind = kindFor(a, p, s), av = avHtml(a, 's'), txt = hl(eff(p));
      const md = s.url ? `<video src="${esc(s.url)}" muted playsinline preload="metadata"></video>` : s.thumb ? `<img src="${esc(s.thumb)}" alt="">` : '🎬';
      if (p === 'youtube' && kind === 'video') return `<div class="soc-phone lite"><div class="yt16">${md}</div><div class="pad"><b class="ttl">${esc(C.title || S('(không tiêu đề)'))}</b><div class="who" style="margin-top:.35rem">${av}<span>${esc(who)}</span></div><p class="cap">${txt}</p></div></div>`;
      if (p === 'threads') return `<div class="soc-phone lite"><div class="pad"><div class="who">${av}<b>${esc(handle)}</b></div><p class="cap c8">${txt}</p><div class="th-md">${md}</div><div class="th-a" aria-hidden="true">♡ 💬 🔁 ↗</div></div></div>`;
      return `<div class="soc-phone p-${p}"><div class="md">${md}</div><div class="ov"><div class="who">${av}<b>${esc(p === 'tiktok' ? '@' + handle : handle)}</b></div>${p === 'youtube' ? `<b class="ttl">${esc(C.title)}</b>` : ''}<p class="cap">${txt}</p>${p === 'tiktok' || p === 'instagram' ? '<p class="mus">♫ Lexkite</p>' : ''}</div><div class="side" aria-hidden="true">♥<br>💬<br>↗</div></div>`;
    }
    function paintTimes() { const el = $('#cmTimes'); if (el) el.innerHTML = freeSlots(D.posts, { n: 6, acc: C.acc }).map(s => `<button type="button" class="chip-f" data-at="${+s.t}" title="${esc(both(s.t))}">${s.h}:00 ET · ${esc(fmt(s.t, { timeZoneName: undefined }))}</button>`).join(''); }
    function setAt(t) { C.at = localInput(t); const i = $('#cmAt'); if (i) i.value = C.at; box.querySelectorAll('#cmTimes [data-at]').forEach(x => x.classList.toggle('on', +x.dataset.at === +t)); paintAt(); }
    function paintAt() { const el = $('#cmAtTz'); if (!el) return; const t = C.at ? new Date(C.at) : null; el.textContent = t && !isNaN(t) ? S('Giờ đã chọn: {d}', { d: both(t) }) : ''; }
    function busy(on) { C.busy = on; ['#cmVal', '#cmDraft', '#cmSched', '#cmNow', '#cmFile'].forEach(s => { const x = $(s); if (x) x.disabled = on; }); }
    // Đọc thời lượng/kích thước + ảnh thu nhỏ (khung hình ~1 giây) ngay trên máy, không cần tải lên
    const readMeta = url => new Promise(res => {
      const v = document.createElement('video'), out = {}, done = () => { clearTimeout(tm); res(out); }, tm = setTimeout(done, 8000);
      v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.onerror = done;
      v.onloadedmetadata = () => { Object.assign(out, { dur: isFinite(v.duration) ? v.duration : null, w: v.videoWidth || null, h: v.videoHeight || null }); try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch (e) { done(); } };
      v.onseeked = () => { try { const c = document.createElement('canvas'), w = 160; c.width = w; c.height = Math.max(1, Math.round(w * (v.videoHeight || 16) / (v.videoWidth || 9))); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); const d = c.toDataURL('image/webp', 0.6); if (d.length < 38000) out.thumb = d; } catch (e) { /* bỏ qua: không vẽ được khung hình */ } done(); };
      v.src = url;
    });
    // PUT bằng XHR để có tiến độ; trả { status, json, range }
    const putBytes = (url, headers, body, onP) => new Promise((resolve, reject) => {
      const x = new XMLHttpRequest(); x.open('PUT', url);
      for (const [k, v] of Object.entries(headers || {})) if (!/^(host|content-length)$/i.test(k)) x.setRequestHeader(k, String(v));
      x.upload.onprogress = e => { if (e.lengthComputable) onP(e.loaded); };
      x.onerror = () => reject(new Error(S('Tải lên thất bại ({s})', { s: 'network' })));
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText || '{}'); } catch (e) { /* bỏ qua */ } resolve({ status: x.status, json: j, range: x.getResponseHeader('Range') }); };
      x.send(body);
    });
    // Tải lên kho GrabCast (giống storage-panel.js): begin {name,mime,size,meta,thumb} → PUT (R2 một lần / Drive từng khúc) → complete {lease,store_id,remote_id}
    async function upload(file, meta) {
      const prog = p => { const pg = $('#cmProg'); if (pg) { pg.hidden = false; pg.firstElementChild.style.width = p + '%'; } msg(S('⏳ Đang tải lên {p}%…', { p })); };
      const mime = file.type || 'video/mp4', up = await sapi('POST', 'storage/objects', { name: file.name.slice(0, 200), mime, size: file.size, type: 'video', client_key: `${file.name}:${file.size}:${file.lastModified}`.slice(0, 100), meta: { w: meta.w || undefined, h: meta.h || undefined, duration_ms: meta.dur ? Math.round(meta.dur * 1000) : undefined }, thumb: meta.thumb || undefined });
      const o = up.object || {}, oid = o.id; if (!oid) throw new Error(S('GrabCast không trả về link tải lên.'));
      if (up.done) return o;
      const u = up.upload || {}; if (!https(u.url)) throw new Error(S('GrabCast không trả về link tải lên.'));
      try {
        let res;
        if (u.kind === 'r2' || !u.chunk || file.size <= 64 * 1048576) {
          res = await putBytes(u.url, u.headers || { 'Content-Type': mime }, file, n => prog(Math.round(n / file.size * 100)));
          if (!(res.status >= 200 && res.status < 300) && res.status !== 308) throw new Error(S('Tải lên thất bại ({s})', { s: res.status }));
        } else {
          let off = 0; // Drive: phiên resumable, gửi từng khúc
          while (off < file.size) {
            const end = Math.min(file.size, off + u.chunk); res = await putBytes(u.url, { 'Content-Range': `bytes ${off}-${end - 1}/${file.size}` }, file.slice(off, end), n => prog(Math.round((off + n) / file.size * 100)));
            if (res.status === 200 || res.status === 201) break; if (res.status !== 308) throw new Error(S('Tải lên thất bại ({s})', { s: res.status }));
            off = res.range && /bytes=0-(\d+)/.test(res.range) ? +RegExp.$1 + 1 : end;
          }
        }
        prog(100);
        const c = await sapi('POST', `storage/objects/${encodeURIComponent(oid)}/complete`, { lease: up.lease, store_id: up.store_id, remote_id: (res && res.json && res.json.id) || null });
        return c.object || o;
      } catch (e) { sapi('POST', `storage/objects/${encodeURIComponent(oid)}/abort`, { lease: up.lease }).catch(() => {}); throw e; }
    }
    async function uploadNow(file) {
      if (!/^video\//.test(file.type || '') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) return msg(S('Chỉ nhận tệp video (MP4, MOV, WebM).'), false);
      const url = URL.createObjectURL(file), s = { type: 'file', name: file.name, size: file.size, url, dur: null, w: null, h: null };
      C.src = s; C.mid = null; paintSel(); paintMedia(); refresh(); busy(true);
      try {
        Object.assign(s, await readMeta(url)); if (C.src === s && alive()) { paintSel(); refresh(); }
        const o = await upload(file, s); s.type = 'obj'; s.id = o.id;
        D.objects.unshift({ ...o, name: o.name || file.name, size: o.size || file.size, mime: o.mime || file.type, meta: { w: s.w, h: s.h, duration_ms: s.dur ? Math.round(s.dur * 1000) : null }, thumb: o.thumb || s.thumb, _url: url });
        if (alive()) { msg(S('✓ Đã tải lên kho video'), true); paintMedia(); }
      } catch (e) { if (C.src === s) C.src = null; msg(S('✗ {e}', { e: errText(e) }), false); }
      finally { const pg = $('#cmProg'); if (pg) pg.hidden = true; busy(false); if (alive()) { paintSel(); refresh(); } }
    }
    const useObj = async oid => { const u = await sapi('POST', `storage/objects/${encodeURIComponent(oid)}/use`, {}); const mid = pick(u, 'media_id') || pick(u.media || {}, 'id') || pick(u, 'id'); if (!mid) throw new Error(S('GrabCast không trả về mã media.')); return mid; };
    const media = async () => { const s = C.src; if (!s) throw new Error(S('Chọn hoặc tải 1 video.')); if (s.type !== 'obj') throw new Error(S('Video đang tải lên – đợi xong rồi thử lại.')); if (C.mid && C.midFor === s.id) return C.mid; msg(S('⏳ Đang chuẩn bị video…')); C.mid = await useObj(s.id); C.midFor = s.id; return C.mid; };
    function buildPost(st) {
      const targets = st.acc.map(id => { const a = accById(id) || { id }, p = platKey(accPlat(a)), o = st.per[p] || {}, t = { account_id: a.id, kind: kindFor(a, p, st.m), options: optsFor(p, o) }; if (o.cap && String(o.cap).trim()) t.caption_override = String(o.cap).trim(); return t; });
      const b = { caption: String(st.cap || '').trim(), media_ids: [st.mid], targets, timezone: NY };
      if (String(st.title || '').trim()) b.title = String(st.title).trim().slice(0, 100); if (String(st.fc || '').trim()) b.first_comment = String(st.fc).trim(); if (String(st.link || '').trim()) b.link = String(st.link).trim();
      return b;
    }
    // POST validate (bài chưa lưu) → lỗi/cảnh báo theo từng kênh (GrabCast: targets[].problems[{level, code, message}])
    async function validateSrv(body, at) {
      const v = await sapi('POST', 'validate', at ? { ...body, scheduled_at: at.toISOString() } : body), by = {}, glob = [];
      const norm = x => (typeof x === 'object' && x ? { lv: /warn/.test(String(x.level || '')) ? 'warning' : 'error', m: x.message || x.code || JSON.stringify(x) } : { lv: 'error', m: String(x) });
      for (const t of v.targets || []) { const p = platKey(t.platform || accPlat(accById(t.account_id) || {})); for (const x of [...(t.problems || []), ...(t.errors || [])]) (by[p] = by[p] || []).push(norm(x)); }
      for (const x of [...(v.problems || []), ...(v.errors || [])]) glob.push(norm(x));
      const all = [...Object.values(by).flat(), ...glob], errs = all.filter(x => x.lv === 'error');
      return { ok: v.ok !== false && v.valid !== false && !errs.length, by, glob, first: (errs[0] || {}).m || '', warns: all.filter(x => x.lv !== 'error').map(x => x.m) };
    }
    function globalCheck() {
      if (!C.src) return S('Chọn hoặc tải 1 video.'); if (!C.acc.length) return S('Chọn ít nhất 1 kênh.');
      if (!C.cap.trim() && selPlats().some(p => p !== 'youtube' && !String(C.per[p].cap || '').trim())) return S('Nhập caption.');
      const p = selPlats().find(localErr); if (p) { C.pt = p; paintPT(); return S('Sửa các lỗi ⛔ ở tab nền tảng trước.'); } // lỗi máy chủ cũ không chặn: lần gửi này sẽ kiểm tra lại
      return '';
    }
    async function run(mode) {
      const bad = globalCheck(); if (bad) return msg(bad, false);
      let at = null;
      if (mode === 'sched') { at = C.at ? new Date(C.at) : null; if (!at || isNaN(at)) return msg(S('Chọn giờ trước.'), false); if (+at < Date.now() + 6e4) return msg(S('Giờ đăng phải ở tương lai.'), false); }
      const n = C.acc.length, src = C.src.id ? 'o:' + C.src.id : '';
      if (mode !== 'val') {
        const dup = dupOf(D.posts, { src, acc: C.acc, cap: C.cap }); if (dup && !confirm(S('Có vẻ trùng bài “{t}” ({s}) trên cùng kênh. Vẫn tạo bài mới?', { t: titleOf(dup).slice(0, 60), s: S(GLBL[GROUP(pick(dup, 'status', 'state'))][1]) }))) return;
        const q = mode === 'draft' ? S('Tạo bài nháp trên {n} kênh?', { n }) : mode === 'sched' ? S('Tạo bài và lên lịch đăng lên {n} kênh lúc {d}?', { n, d: both(at) }) : S('Tạo bài và ĐĂNG NGAY lên {n} kênh? Bài sẽ công khai ngay.', { n });
        if (!confirm(q)) return;
      }
      busy(true);
      try {
        const body = buildPost({ ...C, mid: await media(), m: C.src });
        msg(S('⏳ Đang kiểm tra…'));
        const v = await validateSrv(body, at); C.srv = v.by; paintPT();
        if (!v.ok) { const p = selPlats().find(q => (v.by[q] || []).some(x => x.lv === 'error')); if (p) { C.pt = p; paintPT(); } return msg(S('Chưa hợp lệ – xem các tab có dấu ⛔.') + v.glob.map(x => '\n• ' + x.m).join(''), false); }
        if (mode === 'val') return msg(S('✓ Hợp lệ') + v.warns.map(w => '\n⚠️ ' + w).join(''), true);
        msg(S('⏳ Đang tạo bài…'));
        const c = await sapi('POST', 'posts', body, { idem: C.idem }), post = c.post || c.data || c, pid = pick(post, 'id');
        remember(src, pid); C.idem = uid(); C.mid = null; C.midFor = null; // bài đã tạo: lần sau là bài mới
        if (pid) D.posts.unshift({ ...post, targets: post.targets || body.targets.map(t => ({ account_id: t.account_id })), caption: body.caption, status: post.status || 'draft' });
        if (mode === 'draft') msg(S('✓ Đã lưu nháp'), true);
        else if (pid) {
          msg(S(mode === 'sched' ? '⏳ Đang lên lịch…' : '⏳ Đang đăng…'));
          try { await sapi('POST', `posts/${encodeURIComponent(pid)}/${mode === 'sched' ? 'schedule' : 'publish-now'}`, mode === 'sched' ? { scheduled_at: at.toISOString(), consent: true } : { consent: true }); }
          catch (e) { return msg(S('Đã tạo bài nhưng chưa lên lịch/đăng được: {e}', { e: errText(e) }), false); }
          msg(mode === 'sched' ? S('✓ Đã lên lịch {d}', { d: both(at) }) : S('✓ Đã gửi đăng – theo dõi trạng thái ở tab Bài đăng.'), true);
        }
        reloadPosts();
      } catch (e) { msg(S('✗ {e}', { e: errText(e) }), false); }
      finally { if (alive()) busy(false); }
    }
    const reloadPosts = () => sapi('GET', 'posts', null, { query: { limit: 200 } }).then(r => { D.posts = arr(r); cal.posts = null; if (alive() && tab === 'compose') paintTimes(); }).catch(() => {});

    // ======================= LỊCH =======================
    const cal = { view: LS.get('calv', 'week') === 'month' ? 'month' : 'week', key: '', posts: null, rk: '' };
    const monday = k => addDays(k, -((wday(k) + 6) % 7));
    const calRange = () => { const k = cal.key || (cal.key = dayKey(new Date())); return cal.view === 'week' ? { s: monday(k), n: 7 } : { s: monday(k.slice(0, 8) + '01'), n: 42 }; };
    const dLabel = (k, o) => new Date(k + 'T12:00:00Z').toLocaleDateString(LOC(), { timeZone: 'UTC', ...o });
    const mergePosts = list => { for (const p of list) { const i = D.posts.findIndex(x => String(x.id) === String(p.id)); if (i >= 0) D.posts[i] = { ...D.posts[i], ...p }; else D.posts.push(p); } };
    const titleOf = p => String(pick(p, 'title') || String(pick(p, 'caption') || '').slice(0, 70) || S('(không tiêu đề)'));
    const platsOf = p => [...new Set((p.targets || []).map(t => platKey(pick(t, 'platform', 'provider') || accPlat(accById(t.account_id) || {}))).filter(Boolean))];
    function calendarTab(b) {
      b.innerHTML = `<section class="card"><div class="soc-calbar"><div class="row" style="gap:.35rem"><button type="button" class="btn sm ghost" data-cn="-1" aria-label="${esc(S('Trước'))}">‹</button><button type="button" class="btn sm" data-cn="0">${S('Hôm nay')}</button><button type="button" class="btn sm ghost" data-cn="1" aria-label="${esc(S('Sau'))}">›</button><b id="calT" aria-live="polite"></b></div>
        <div class="row" style="gap:.5rem"><span class="soc-seg" role="group"><button type="button" data-cv="week" aria-pressed="${cal.view === 'week'}">${S('Tuần')}</button><button type="button" data-cv="month" aria-pressed="${cal.view === 'month'}">${S('Tháng')}</button></span><button type="button" class="btn sm primary" id="calBulk" aria-expanded="false" aria-controls="bulkBox">${S('📦 Lên lịch hàng loạt')}</button></div></div>
        <p class="tiny muted" style="margin:.2rem 0 0">${S('Giờ hiển thị: New York (ET). Kéo bài sang ô khác để dời lịch; Enter trên bài để mở chi tiết; ô + để soạn bài vào khung đó.')}</p>
        <div id="calErr"></div><div id="calGrid" class="soc-calwrap" aria-label="${esc(S('Lịch bài đăng'))}"></div></section><section class="card" id="bulkBox" hidden></section><section class="card" id="calFree"></section>`;
      b.querySelectorAll('[data-cn]').forEach(x => x.onclick = () => { const d = +x.dataset.cn, k = cal.key || dayKey(new Date()); cal.key = !d ? dayKey(new Date()) : cal.view === 'week' ? addDays(k, 7 * d) : (() => { const [y, m] = k.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + d, 1)); return t.toISOString().slice(0, 10); })(); loadCal(); });
      b.querySelectorAll('[data-cv]').forEach(x => x.onclick = () => { cal.view = x.dataset.cv; LS.set('calv', cal.view); b.querySelectorAll('[data-cv]').forEach(y => y.setAttribute('aria-pressed', y === x)); loadCal(); });
      $('#calBulk').onclick = () => { const bx = $('#bulkBox'), open = bx.hidden; bx.hidden = !open; $('#calBulk').setAttribute('aria-expanded', open); if (open) bulkPaint(); };
      const g = $('#calGrid');
      g.ondragstart = e => { const c = e.target.closest && e.target.closest('.soc-chip[draggable="true"]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.pid); e.dataTransfer.effectAllowed = 'move'; };
      g.ondragover = e => { const c = e.target.closest && e.target.closest('.soc-cell[data-day]'); if (!c) return; e.preventDefault(); g.querySelectorAll('.drop').forEach(x => x !== c && x.classList.remove('drop')); c.classList.add('drop'); };
      g.ondragleave = e => { const c = e.target.closest && e.target.closest('.soc-cell'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('drop'); };
      g.ondrop = e => { const c = e.target.closest && e.target.closest('.soc-cell[data-day]'); if (!c) return; e.preventDefault(); c.classList.remove('drop'); const pid = e.dataTransfer.getData('text/plain'); if (pid) moveTo(pid, c.dataset.day, c.dataset.h); };
      g.onclick = e => { const c = e.target.closest('.soc-chip'); if (c) return drawer(c.dataset.pid); const a = e.target.closest('[data-new]'); if (a) { C.at = localInput(new Date(+a.dataset.new)); go('compose'); } };
      $('#calFree').onclick = e => { const a = e.target.closest('[data-new]'); if (a) { C.at = localInput(new Date(+a.dataset.new)); go('compose'); } };
      loadCal();
    }
    async function loadCal() {
      const { s, n } = calRange(), g = $('#calGrid'), rk = cal.view + s; if (!g) return;
      $('#calT').textContent = cal.view === 'week' ? `${dLabel(s, { day: 'numeric', month: 'short' })} – ${dLabel(addDays(s, 6), { day: 'numeric', month: 'short', year: 'numeric' })}` : dLabel(cal.key, { month: 'long', year: 'numeric' });
      if (cal.posts && cal.rk === rk) return paintCal();
      g.innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`; cal.rk = rk; const ce = $('#calErr'); if (ce) ce.innerHTML = '';
      try { const r = await sapi('GET', 'posts', null, { query: { from: atNY(s, 0).toISOString(), to: atNY(addDays(s, n), 0).toISOString(), limit: 200 } }); cal.posts = arr(r); mergePosts(cal.posts); }
      catch (e) { cal.posts = D.posts.slice(); const ce = $('#calErr'); if (ce) ce.innerHTML = `<p class="small bad-t">${S('Không tải được lịch: {e}', { e: errHtml(e) })}</p>`; }
      if (alive() && tab === 'calendar' && cal.rk === rk) paintCal();
    }
    function chip(x) {
      const p = x.p, g = GROUP(pick(p, 'status', 'state')), drag = /^(scheduled|draft)$/i.test(String(pick(p, 'status', 'state') || 'draft'));
      return `<button type="button" class="soc-chip g-${g}" data-pid="${esc(p.id)}" draggable="${drag}" title="${esc(titleOf(p) + ' · ' + S(GLBL[g][1]) + ' · ' + both(x.t))}">${esc(hhNY(x.t))} ${platsOf(p).map(icon).join('')} ${esc(titleOf(p))}</button>`;
    }
    function paintCal() {
      const g = $('#calGrid'); if (!g) return; const { s, n } = calRange(), today = dayKey(new Date()), by = {}, now = Date.now();
      for (const p of cal.posts || []) { const t = postTime(p); if (!t || GROUP(pick(p, 'status', 'state')) === 'cancelled') continue; const q = nyParts(new Date(t)), k = `${q.year}-${q.month}-${q.day}`; (by[k] = by[k] || []).push({ p, h: +q.hour % 24, t: new Date(t) }); }
      Object.values(by).forEach(l => l.sort((a, b) => a.t - b.t));
      const days = Array.from({ length: n }, (_, i) => addDays(s, i));
      if (cal.view === 'week') {
        let html = `<div class="soc-wk" role="grid"><div class="soc-hd" role="columnheader">ET</div>` + days.map(k => `<div class="soc-hd ${k === today ? 'today' : ''}" role="columnheader">${esc(dLabel(k, { weekday: 'short', day: 'numeric', month: 'numeric' }))}</div>`).join('');
        for (const hr of [...SLOTS, 'x']) {
          html += `<div class="soc-hr" role="rowheader">${hr === 'x' ? S('Giờ khác') : hr + ':00'}</div>`;
          html += days.map(k => { const items = (by[k] || []).filter(x => (hr === 'x' ? !SLOTS.includes(x.h) : x.h === hr)), at = hr === 'x' ? null : atNY(k, hr); return `<div class="soc-cell ${k === today ? 'today' : ''}" role="gridcell" data-day="${k}" data-h="${hr}">${items.map(chip).join('')}${at && !items.length && +at > now + 15 * 6e4 ? `<button type="button" class="soc-add" data-new="${+at}" aria-label="${esc(S('Tạo bài lúc {d}', { d: both(at) }))}">+</button>` : ''}</div>`; }).join('');
        }
        g.innerHTML = html + '</div>';
      } else {
        const mo = cal.key.slice(0, 7);
        g.innerHTML = `<div class="soc-mo" role="grid">` + days.slice(0, 7).map(k => `<div class="soc-hd" role="columnheader">${esc(dLabel(k, { weekday: 'short' }))}</div>`).join('') + days.map(k => { const items = by[k] || []; return `<div class="soc-cell ${k.slice(0, 7) !== mo ? 'out' : ''} ${k === today ? 'today' : ''}" role="gridcell" data-day="${k}" data-h=""><span class="dn">${+k.slice(8)}</span>${items.slice(0, 4).map(chip).join('')}${items.length > 4 ? `<span class="tiny muted">+${items.length - 4}</span>` : ''}</div>`; }).join('') + '</div>';
      }
      const f = $('#calFree'); if (f) f.innerHTML = `<h3>${S('⏭ Khung giờ vàng còn trống')}</h3><div class="soc-times">${freeSlots([...D.posts, ...(cal.posts || [])], { n: 8 }).map(x => `<button type="button" class="chip-f" data-new="${+x.t}" title="${esc(S('Tạo bài lúc {d}', { d: both(x.t) }))}">${x.h}:00 ET · ${esc(fmt(x.t, { timeZoneName: undefined }))}</button>`).join('')}</div>`;
    }
    async function reschedule(p, at) {
      const id = encodeURIComponent(String(p.id)), st = String(pick(p, 'status', 'state') || ''), old = postTime(p);
      if (/^scheduled$/i.test(st)) await sapi('POST', `posts/${id}/unschedule`, {});
      try { await sapi('POST', `posts/${id}/schedule`, { scheduled_at: at.toISOString(), consent: true }); }
      catch (e) { if (/^scheduled$/i.test(st) && old && +new Date(old) > Date.now() + 6e4) await sapi('POST', `posts/${id}/schedule`, { scheduled_at: new Date(old).toISOString(), consent: true }).catch(() => {}); throw e; }
    }
    async function moveTo(pid, k, hr) {
      const p = (cal.posts || []).find(x => String(x.id) === String(pid)) || D.posts.find(x => String(x.id) === String(pid)); if (!p) return;
      const old = postTime(p), q = old ? nyParts(new Date(old)) : { hour: '12', minute: '00' }, at = hr && hr !== 'x' ? atNY(k, +hr) : atNY(k, +q.hour % 24, +q.minute);
      if (old && Math.abs(+at - +new Date(old)) < 6e4) return;
      if (+at < Date.now() + 6e4) return alert(S('Giờ đăng phải ở tương lai.'));
      if (!confirm(S('Dời bài “{t}” sang {d}?', { t: titleOf(p).slice(0, 60), d: both(at) }))) return;
      try { await reschedule(p, at); } catch (e) { alert(S('✗ {e}', { e: errText(e) })); }
      cal.posts = null; if (alive()) loadCal();
    }

    // ---------- Lên lịch hàng loạt ----------
    const B = { sel: [], acc: [], hours: [12, 19], from: '', skipWe: false, cap: '{title}\n\n#IELTS #LearnEnglish #Lexkite', yt: 'public', tt: '', plan: null, idem: '' };
    function bulkPaint() {
      const bx = $('#bulkBox'); if (!bx) return; const hasTT = B.acc.some(id => platKey(accPlat(accById(id) || {})) === 'tiktok');
      bx.innerHTML = `<h3>${S('📦 Lên lịch hàng loạt')}</h3><p class="small muted" style="margin:0 0 .5rem">${S('Chọn nhiều video → tự xếp mỗi video 1 bài vào khung giờ vàng còn trống (giờ New York).')}</p>
        <div class="row" style="gap:.4rem"><button type="button" class="btn sm ghost" id="bkAll">${S('Chọn tất cả')}</button><button type="button" class="btn sm ghost" id="bkNone">${S('Bỏ chọn')}</button><span class="small muted" id="bkN">${S('Đã chọn {n} video', { n: B.sel.length })}</span></div>
        <div class="soc-media" id="bkMedia">${vids().map(o => { const m = objMeta(o), nm = String(pick(o, 'name', 'filename', 'id')); return `<label class="soc-mi"><input type="checkbox" data-bv="${esc(o.id)}" ${B.sel.includes(String(o.id)) ? 'checked' : ''} aria-label="${esc(nm)}"><span class="soc-th">${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy">` : '🎬'}</span><b>${esc(nm)}</b><span class="muted">${GB(m.size)}${m.dur ? ' · ' + fmtDur(m.dur) : ''}</span></label>`; }).join('') || `<p class="soc-empty">${S('Kho chưa có video nào – tải video mới lên.')}</p>`}</div>
        <div class="soc-form"><div class="wide"><div class="small" style="font-weight:600;margin-bottom:.3rem">${S('Đăng lên kênh')}</div><div class="soc-targets" id="bkAcc">${D.accounts.map(a => `<label><input type="checkbox" value="${esc(a.id)}" ${B.acc.includes(String(a.id)) ? 'checked' : ''}> ${avHtml(a, 's')} ${icon(accPlat(a))} <span>${esc(accName(a))}</span></label>`).join('') || emptyConn('Workspace Lexkite chưa có kênh nào.')}</div></div>
          <label class="wide">${S('Caption mẫu ({title} = tên video)')}<textarea id="bkCap" rows="3">${esc(B.cap)}</textarea></label>
          <div class="wide"><div class="small" style="font-weight:600">${S('Khung giờ (ET)')}</div><div class="soc-targets" id="bkH" style="margin-top:.3rem">${SLOTS.map(x => `<label><input type="checkbox" value="${x}" ${B.hours.includes(x) ? 'checked' : ''}> ${x}:00</label>`).join('')}</div></div>
          <label>${S('Bắt đầu từ ngày (New York)')}<input type="date" id="bkFrom" value="${esc(B.from || dayKey(new Date()))}"></label><label class="chk" style="align-self:end"><input type="checkbox" id="bkWe" ${B.skipWe ? 'checked' : ''}> ${S('Bỏ qua thứ 7 & Chủ nhật')}</label>
          <label>${S('Quyền riêng tư YouTube')}<select id="bkYt">${Object.keys(YTP).map(v => opt(v, S(YTP[v]), B.yt)).join('')}</select></label>
          ${hasTT ? `<label>${S('Quyền riêng tư TikTok')}<select id="bkTt"><option value="">${esc(S('— chọn (bắt buộc) —'))}</option>${Object.keys(TTP).map(v => opt(v, S(TTP[v]), B.tt)).join('')}</select></label>` : ''}</div>
        <div class="soc-btns"><button type="button" class="btn" id="bkPlan">${S('Xem kế hoạch')}</button><button type="button" class="btn primary" id="bkGo" ${B.plan ? '' : 'disabled'}>${S('Tạo & lên lịch {n} bài', { n: B.plan ? B.plan.length : 0 })}</button></div>
        <div class="soc-msg small" id="bkMsg" role="status" aria-live="polite"></div><div id="bkOut" class="soc-tblw"></div>`;
      const inval = () => { B.plan = null; const gb = $('#bkGo'); if (gb) { gb.disabled = true; gb.textContent = S('Tạo & lên lịch {n} bài', { n: 0 }); } const o = $('#bkOut'); if (o) o.innerHTML = ''; };
      $('#bkMedia').onchange = () => { B.sel = [...bx.querySelectorAll('[data-bv]:checked')].map(i => i.dataset.bv); $('#bkN').textContent = S('Đã chọn {n} video', { n: B.sel.length }); inval(); };
      $('#bkAll').onclick = () => { B.sel = vids().map(o => String(o.id)); bulkPaint(); }; $('#bkNone').onclick = () => { B.sel = []; bulkPaint(); };
      $('#bkAcc').onchange = () => { B.acc = [...bx.querySelectorAll('#bkAcc input:checked')].map(i => i.value); B.plan = null; bulkPaint(); };
      $('#bkH').onchange = () => { B.hours = [...bx.querySelectorAll('#bkH input:checked')].map(i => +i.value); inval(); };
      $('#bkCap').oninput = e => { B.cap = e.target.value; }; $('#bkFrom').onchange = e => { B.from = e.target.value; inval(); }; $('#bkWe').onchange = e => { B.skipWe = e.target.checked; inval(); };
      $('#bkYt').onchange = e => { B.yt = e.target.value; }; const tt = $('#bkTt'); if (tt) tt.onchange = e => { B.tt = e.target.value; };
      $('#bkPlan').onclick = bulkPreview; $('#bkGo').onclick = bulkRun;
      if (B.plan) bulkTable();
    }
    const bmsg = (t, okk) => { const m = $('#bkMsg'); if (m) { m.textContent = t; m.className = 'soc-msg small ' + (okk === true ? 'ok-t' : okk === false ? 'bad-t' : 'muted'); } };
    function bulkPreview() {
      if (!B.sel.length) return bmsg(S('Chọn ít nhất 1 video.'), false); if (!B.acc.length) return bmsg(S('Chọn ít nhất 1 kênh.'), false); if (!B.hours.length) return bmsg(S('Chọn ít nhất 1 khung giờ.'), false);
      const vs = B.sel.map(id => vids().find(o => String(o.id) === id)).filter(Boolean);
      B.plan = planBulk(vs, [...D.posts, ...(cal.posts || [])], { hours: B.hours, from: B.from || dayKey(new Date()), skipWeekend: B.skipWe, acc: B.acc }).map(r => ({ ...r, st: S('chờ') })); B.idem = uid();
      bmsg(''); const gb = $('#bkGo'); gb.disabled = false; gb.textContent = S('Tạo & lên lịch {n} bài', { n: B.plan.length }); bulkTable();
    }
    function bulkTable() { const o = $('#bkOut'); if (o) o.innerHTML = `<table class="soc-tbl"><thead><tr><th>#</th><th>${S('Video')}</th><th>New York</th><th>${S('Giờ của bạn')}</th><th>${S('Trạng thái')}</th></tr></thead><tbody>${B.plan.map((r, i) => `<tr data-row="${i}"><td>${i + 1}</td><td>${esc(String(pick(r.v, 'name', 'filename', 'id')))}</td><td>${r.t ? esc(fmt(r.t, { timeZone: NY })) : '–'}</td><td>${r.t ? esc(fmt(r.t)) : '–'}</td><td class="st">${esc(r.st)}</td></tr>`).join('')}</tbody></table>`; }
    async function bulkRun() {
      const plan = B.plan; if (!plan || !plan.length) return; const ps = [...new Set(B.acc.map(id => platKey(accPlat(accById(id) || {}))))];
      if (ps.includes('tiktok') && !B.tt) return bmsg(S('Chọn quyền riêng tư TikTok (bắt buộc).'), false);
      if (!confirm(S('Tạo {n} bài và lên lịch đăng lên {k} kênh theo kế hoạch? Bài sẽ tự công khai đúng giờ.', { n: plan.length, k: B.acc.length }))) return;
      const gb = $('#bkGo'), pb = $('#bkPlan'); gb.disabled = pb.disabled = true; let ok = 0;
      const per = { youtube: { ...C.per.youtube, cap: '', privacy: B.yt }, tiktok: { ...C.per.tiktok, cap: '', privacy: B.tt }, instagram: { feed: true }, facebook_page: {}, threads: {} };
      const setSt = (i, t) => { plan[i].st = t; const c = box.querySelector(`#bkOut tr[data-row="${i}"] .st`); if (c) c.textContent = t; };
      for (let i = 0; i < plan.length; i++) {
        const r = plan[i]; if (!alive()) return; if (!r.t) { setSt(i, '✗'); continue; }
        const title = baseName(pick(r.v, 'name', 'filename')).slice(0, 100), cap = B.cap.split('{title}').join(title), m = objMeta(r.v), src = 'o:' + r.v.id;
        try {
          if (dupOf(D.posts, { src, acc: B.acc, cap })) { setSt(i, S('⚠️ trùng – bỏ qua')); continue; }
          const loc = ps.flatMap(p => checkLocal(p, { text: cap, title, o: per[p], m }).filter(x => x.lv === 'error')); if (loc.length) throw new Error(S(loc[0].k, loc[0].v));
          setSt(i, '⏳'); const body = buildPost({ mid: await useObj(r.v.id), title, cap, fc: '', link: '', acc: B.acc, per, m });
          const v = await validateSrv(body, r.t); if (!v.ok) throw new Error(v.first || S('Chưa hợp lệ – xem các tab có dấu ⛔.'));
          const c = await sapi('POST', 'posts', body, { idem: `${B.idem}-${i}` }), post = c.post || c.data || c, pid = pick(post, 'id');
          await sapi('POST', `posts/${encodeURIComponent(pid)}/schedule`, { scheduled_at: r.t.toISOString(), consent: true });
          remember(src, pid); D.posts.push({ ...post, status: 'scheduled', scheduled_at: r.t.toISOString(), caption: cap, targets: post.targets || body.targets }); ok++; setSt(i, '✓');
        } catch (e) { setSt(i, '✗ ' + errText(e).slice(0, 120)); if (e && e.code === 'grabcast-rate') break; }
      }
      bmsg(S('Xong {ok}/{n} bài.', { ok, n: plan.length }), ok === plan.length); B.plan = null; pb.disabled = false; cal.posts = null; if (alive() && tab === 'calendar') loadCal();
    }

    // ======================= BÀI ĐĂNG =======================
    const F = { q: '', g: 'all', p: '', from: '', to: '' };
    function postsTab(b) {
      const pl = [...new Set([...Object.keys(PL), ...D.accounts.map(a => platKey(accPlat(a)))])].filter(Boolean);
      b.innerHTML = `<section class="card"><div class="soc-filt"><label>${S('Tìm bài đăng')}<input type="search" id="pfQ" value="${esc(F.q)}" placeholder="${esc(S('Tìm theo tiêu đề/caption…'))}"></label>
        <label>${S('Nền tảng')}<select id="pfP"><option value="">${esc(S('Mọi nền tảng'))}</option>${pl.map(p => opt(p, icon(p) + ' ' + pname(p), F.p)).join('')}</select></label>
        <label>${S('Từ ngày')}<input type="date" id="pfF" value="${esc(F.from)}"></label><label>${S('Đến ngày')}<input type="date" id="pfT" value="${esc(F.to)}"></label></div>
        <div class="soc-chips" id="pfS" role="group" aria-label="${esc(S('Lọc trạng thái'))}"></div>${badHtml('posts')}<div id="pfList"></div></section>`;
      const upd = () => { paintChips(); paintList(); };
      $('#pfQ').oninput = e => { F.q = e.target.value; paintList(); }; $('#pfP').onchange = e => { F.p = e.target.value; upd(); };
      $('#pfF').onchange = e => { F.from = e.target.value; upd(); }; $('#pfT').onchange = e => { F.to = e.target.value; upd(); };
      $('#pfS').onclick = e => { const x = e.target.closest('[data-pf]'); if (x) { F.g = x.dataset.pf; upd(); } };
      $('#pfList').onclick = e => { const x = e.target.closest('[data-pid]'); if (x) drawer(x.dataset.pid); };
      upd();
    }
    const match = (p, skipG) => {
      const g = GROUP(pick(p, 'status', 'state')); if (!skipG && F.g !== 'all' && g !== F.g) return false; if (F.p && !platsOf(p).includes(F.p)) return false;
      const t = postTime(p) || pick(p, 'created_at'); if (F.from || F.to) { if (!t) return false; const k = dayKey(new Date(t)); if ((F.from && k < F.from) || (F.to && k > F.to)) return false; }
      return !F.q || (titleOf(p) + ' ' + (p.caption || '')).toLowerCase().includes(F.q.trim().toLowerCase());
    };
    function paintChips() { const el = $('#pfS'); if (!el) return; const base = D.posts.filter(p => match(p, true)); el.innerHTML = ['all', 'draft', 'scheduled', 'published', 'failed', 'cancelled'].map(k => `<button type="button" class="chip-f ${F.g === k ? 'on' : ''}" data-pf="${k}" aria-pressed="${F.g === k}">${S(k === 'all' ? 'Tất cả' : GLBL[k][1])} <small>${k === 'all' ? base.length : base.filter(p => GROUP(pick(p, 'status', 'state')) === k).length}</small></button>`).join(''); }
    const errsOf = p => [pick(p, 'error', 'last_error', 'error_message'), ...(p.targets || []).map(x => pick(x, 'last_error', 'error', 'error_message'))].filter(Boolean).map(x => (typeof x === 'object' ? x.message || JSON.stringify(x) : String(x)));
    function paintList() {
      const el = $('#pfList'); if (!el) return;
      const rows = D.posts.filter(p => match(p)).sort((a, b) => +new Date(postTime(b) || b.created_at || 0) - +new Date(postTime(a) || a.created_at || 0));
      el.innerHTML = rows.slice(0, 200).map(p => { const g = GROUP(pick(p, 'status', 'state')), t = postTime(p) || pick(p, 'created_at'), er = errsOf(p)[0];
        return `<button type="button" class="soc-row" data-pid="${esc(p.id)}"><span class="t"><b>${esc(titleOf(p))}</b>${pill(g)}</span><span class="meta muted"><span>${platsOf(p).map(x => icon(x) + ' ' + esc(pname(x))).join(' · ') || '—'}</span><span>🕒 ${esc(both(t))}</span></span>${er ? `<span class="soc-err">⚠️ ${esc(String(er).slice(0, 200))}</span>` : ''}</button>`; }).join('') || `<p class="soc-empty">${S('Không có bài nào.')}</p>`;
    }
    // Ngăn chi tiết: từng kênh (trạng thái, link, lỗi), thao tác, số liệu
    async function drawer(id) {
      let p = D.posts.find(x => String(x.id) === String(id)) || (cal.posts || []).find(x => String(x.id) === String(id)) || { id };
      const { d, shut } = modal('soc-drawer', `<div class="soc-dhd"><h3 id="dwT">${esc(titleOf(p))}</h3><button type="button" class="icon-x" data-x aria-label="${esc(S('Đóng'))}">✕</button></div><div class="soc-dbd" id="dwB"><p class="small muted">${S('Đang tải…')}</p></div>`, S('Chi tiết bài đăng'));
      const dq = s => d.querySelector(s);
      const paintD = (ins, err) => {
        const g = GROUP(pick(p, 'status', 'state')), A = { draft: ['schedule', 'publish', 'cancel'], scheduled: ['reschedule', 'unschedule', 'publish', 'cancel'], failed: ['retry', 'cancel'], published: [], cancelled: [], other: ['retry', 'cancel'] }[g];
        const LB = { schedule: 'Lên lịch', reschedule: 'Đổi giờ', publish: 'Đăng ngay', unschedule: 'Hủy lịch', retry: 'Thử lại', cancel: 'Hủy bài' };
        dq('#dwT').textContent = titleOf(p);
        dq('#dwB').innerHTML = `${err ? `<p class="small bad-t">${S('Không tải được bài: {e}', { e: errHtml(err) })}</p>` : ''}<div class="row between" style="margin-bottom:.5rem">${pill(g)}<span class="small muted">🕒 ${esc(both(postTime(p) || pick(p, 'created_at')))}</span></div>
          ${p.caption ? `<div class="soc-capbox">${esc(p.caption)}</div>` : ''}
          ${A.length ? `<div class="soc-btns" style="margin:.7rem 0">${A.map(a => `<button type="button" class="btn sm ${a === 'publish' ? 'primary' : a === 'cancel' ? 'ghost danger' : ''}" data-act="${a}">${S(LB[a])}</button>`).join('')}</div>` : ''}
          <h4 style="margin:.9rem 0 .4rem">${S('Kênh')}</h4>${(p.targets || []).map(t => { const a = accById(t.account_id), pl = platKey(pick(t, 'platform') || accPlat(a || {})), tg = GROUP(t.state || t.status), u = https(pick(t, 'permalink', 'url', 'post_url')), e = pick(t, 'last_error', 'error'), fc = t.options && typeof t.options.first_comment === 'object' && t.options.first_comment;
            return `<div class="soc-tg"><div class="h"><span>${avHtml(a, 's')} ${icon(pl)} <b>${esc(a ? accName(a) : pname(pl))}</b> <span class="muted small">${esc(t.kind || '')}</span></span><span class="pill ${GLBL[tg][0]}" title="${esc(t.state || '')}">${S(GLBL[tg][1])}</span></div>
              <div class="meta muted"><span>${esc(String(t.state || ''))}</span>${t.published_at ? `<span>✓ ${esc(both(t.published_at))}</span>` : ''}${t.attempts ? `<span>${S('lần thử: {n}', { n: t.attempts })}</span>` : ''}${fc ? `<span>${S('Bình luận đầu tiên: {s}', { s: esc(fc.status || '') })}</span>` : ''}</div>
              ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${S('Xem ↗')} ${esc(u.replace(/^https:\/\//, '').slice(0, 60))}</a>` : ''}${e ? `<span class="soc-err">⚠️ ${esc(String(typeof e === 'object' ? e.message || JSON.stringify(e) : e).slice(0, 300))}${t.last_error_code ? ` <code>${esc(t.last_error_code)}</code>` : ''}</span>` : ''}</div>`; }).join('') || '<p class="small muted">—</p>'}
          <div id="dwI">${ins || ''}</div>`;
      };
      const loadP = async () => { let err = null; try { const r = await sapi('GET', `posts/${encodeURIComponent(id)}`); p = r.post || r; mergePosts([p]); } catch (e) { err = e; } if (!d.isConnected) return; paintD('', err);
        if ((p.targets || []).some(t => GROUP(t.state || t.status) === 'published')) {
          sapi('GET', `posts/${encodeURIComponent(id)}/insights`).then(r => { const m = r.metrics || {}, ks = [['views', 'Lượt xem'], ['reach', 'Tiếp cận'], ['likes', 'Thích'], ['comments', 'Bình luận'], ['shares', 'Chia sẻ'], ['saves', 'Lưu']].filter(([k]) => m[k] != null);
            const el = dq('#dwI'); if (el) el.innerHTML = `<h4 style="margin:.9rem 0 .4rem">${S('📊 Số liệu')}</h4>` + (ks.length ? `<div class="soc-met">${ks.map(([k, l]) => `<div><b>${(+m[k] || 0).toLocaleString(LOC())}</b>${S(l)}</div>`).join('')}</div>${r.updated_at ? `<p class="tiny muted">${S('Cập nhật {d}', { d: esc(both(r.updated_at)) })}</p>` : ''}` : `<p class="small muted">${S('Chưa có số liệu (cần quyền insights trên GrabCast).')}</p>`); })
            .catch(() => { const el = dq('#dwI'); if (el) el.innerHTML = `<h4 style="margin:.9rem 0 .4rem">${S('📊 Số liệu')}</h4><p class="small muted">${S('Chưa có số liệu (cần quyền insights trên GrabCast).')}</p>`; });
        } };
      d.addEventListener('click', async e => {
        const btn = e.target.closest('[data-act]'); if (!btn) return; const a = btn.dataset.act, t = titleOf(p).slice(0, 60), pid = encodeURIComponent(String(p.id));
        try {
          if (a === 'schedule' || a === 'reschedule') { const at = await pickTime(); if (!at || !confirm(S('Lên lịch bài “{t}” lúc {d}?', { t, d: both(at) }))) return; btn.disabled = true; if (a === 'reschedule') await reschedule(p, at); else await sapi('POST', `posts/${pid}/schedule`, { scheduled_at: at.toISOString(), consent: true }); }
          else if (a === 'publish') { if (!confirm(S('Đăng ngay bài “{t}” lên {p}? Bài sẽ công khai ngay.', { t, p: platsOf(p).map(pname).join(', ') || '?' }))) return; btn.disabled = true; await sapi('POST', `posts/${pid}/publish-now`, { consent: true }); }
          else if (a === 'unschedule') { if (!confirm(S('Hủy lịch bài “{t}”? Bài trở về nháp.', { t }))) return; btn.disabled = true; await sapi('POST', `posts/${pid}/unschedule`, {}); }
          else if (a === 'cancel') { if (!confirm(S('Hủy bài “{t}”? Bài sẽ không được đăng.', { t }))) return; btn.disabled = true; await sapi('POST', `posts/${pid}/cancel`, {}); }
          else if (a === 'retry') { if (!confirm(S('Thử đăng lại bài “{t}”?', { t }))) return; btn.disabled = true;
            try { await sapi('POST', `posts/${pid}/retry`, { consent: true }); } catch (er) { if (er && er.code === 'confirm_required' && confirm(S('Có thể gửi lại video lên TikTok lần nữa. Bạn đã kiểm tra trên TikTok và chắc chắn bài chưa lên?'))) await sapi('POST', `posts/${pid}/retry`, { consent: true, confirm: true }); else throw er; } }
          btn.textContent = S('✓ Xong'); cal.posts = null; await loadP(); if (alive()) { if (tab === 'posts') { paintChips(); paintList(); } else if (tab === 'calendar') loadCal(); }
        } catch (er) { btn.disabled = false; alert(S('✗ {e}', { e: errText(er) })); }
      });
      paintD(); loadP();
      return { d, shut };
    }
    // Hộp chọn giờ (giờ máy) + khung giờ vàng New York còn trống
    function pickTime() {
      return new Promise(resolve => {
        const { d, shut } = modal('key-dlg soc-pt', `<div class="key-box"><div class="row between"><h3 style="margin:0">${S('Chọn giờ đăng')}</h3><button type="button" class="icon-x" data-x aria-label="${esc(S('Đóng'))}">✕</button></div>
          <label class="small" style="display:flex;flex-direction:column;gap:.25rem;margin-top:.7rem;font-weight:600">${S('Giờ đăng (giờ máy bạn)')}<input type="datetime-local" id="ptAt"></label>
          <p class="small muted" style="margin:.6rem 0 0">${S('Khung giờ vàng còn trống ở Mỹ (giờ New York):')}</p><div class="soc-times">${freeSlots(D.posts, { n: 6 }).map(s => `<button type="button" class="chip-f" data-at="${+s.t}" title="${esc(both(s.t))}">${s.h}:00 ET · ${esc(fmt(s.t, { timeZoneName: undefined }))}</button>`).join('')}</div>
          <p class="small" id="ptTz" style="min-height:1.2em;margin:.5rem 0 0"></p><p class="small bad-t" id="ptMsg" style="min-height:1.2em"></p><div class="row between"><span></span><span class="row" style="gap:.5rem"><button type="button" class="btn ghost" data-x>${S('Hủy')}</button><button type="button" class="btn primary" id="ptOk">${S('Lên lịch')}</button></span></div></div>`, S('Chọn giờ đăng'));
        let out = null; d.addEventListener('close', () => resolve(out));
        const i = d.querySelector('#ptAt'), tz = () => { const t = i.value ? new Date(i.value) : null; d.querySelector('#ptTz').textContent = t && !isNaN(t) ? both(t) : ''; };
        i.oninput = tz;
        d.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { i.value = localInput(new Date(+b.dataset.at)); d.querySelectorAll('[data-at]').forEach(x => x.classList.toggle('on', x === b)); tz(); });
        d.querySelector('#ptOk').onclick = () => { const at = i.value ? new Date(i.value) : null; if (!at || isNaN(at)) { d.querySelector('#ptMsg').textContent = S('Chọn giờ trước.'); return; } if (+at < Date.now() + 6e4) { d.querySelector('#ptMsg').textContent = S('Giờ đăng phải ở tương lai.'); return; } out = at; shut(); };
      });
    }

    // ======================= KÊNH & DRIVE =======================
    function accountsTab(b) {
      b.innerHTML = `<div class="soc-grid"><section class="card">${channels()}${badHtml('accounts')}</section><section class="card">${drives(D.stores)}${badHtml('stores')}</section></div>`;
    }
    function channels() {
      const A = D.accounts;
      return `<h3>${S('📡 Kênh đã kết nối')} <span class="small muted">${A.length}</span></h3>${A.length ? `<ul class="soc-accs">${A.map(a => {
        const broken = a.needs_reconnect === true || /expired|error|revoked|reauth|reconnect|disconnected/i.test(String(pick(a, 'status', 'state') || '')), l = a.limits || {}, cap = l.posts_cap || l.reels_cap, used = l.posts_24h != null ? l.posts_24h : l.reels_24h, u = pick(a, 'username', 'handle');
        return `<li>${avHtml(a)}<div class="nm"><b title="${esc(accName(a))}">${esc(accName(a))}</b><span class="small muted">${icon(accPlat(a))} ${esc(pname(accPlat(a)))}${u ? ' · @' + esc(String(u).replace(/^@/, '')) : ''}</span>${cap ? `<span class="tiny muted">${S('{n}/{max} bài trong 24 giờ', { n: used || 0, max: cap })}</span>` : ''}</div>${broken ? `<a class="pill warn" href="${GC_ACC}" target="_blank" rel="noopener" title="${esc(S('cần kết nối lại'))}">${S('Kết nối lại ↗')}</a>` : `<span class="pill ok">${S('Hoạt động')}</span>`}</li>`; }).join('')}</ul>` : emptyConn('Workspace Lexkite chưa có kênh nào.')}
        <p style="margin:.8rem 0 0"><a class="btn sm" href="${GC_ACC}" target="_blank" rel="noopener">${S('➕ Kết nối kênh mới trên GrabCast ↗')}</a></p><p class="tiny muted" style="margin:.4rem 0 0">${S('Trên GrabCast chọn workspace <b>Lexkite (#{ws})</b> trước khi kết nối.', { ws: WS })}</p>`;
    }
    function drives(stores) {
      let U = 0, T = 0, hot = 0;
      const row = (name, used, total, free, extra = '') => {
        const pct = total ? Math.min(100, Math.round(used / total * 100)) : 0, cls = pct >= 95 ? 'crit full' : pct >= 90 ? 'crit' : pct >= 80 ? 'warn' : '';
        const tag = pct >= 95 ? `<span class="pill bad">${S('Đầy')}</span>` : pct >= 90 ? `<span class="pill bad">${S('Sắp đầy')}</span>` : pct >= 80 ? `<span class="pill warn">${S('Gần đầy')}</span>` : '';
        return `<div class="soc-drv ${cls} ${extra}"><div class="t"><b title="${esc(name)}">${esc(name)}</b><span>${pct}% ${tag}</span></div><div class="soc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(name)}"><i style="width:${pct}%"></i></div><div class="small muted">${S('{u} / {t} · còn trống {f}', { u: GB(used), t: total ? GB(total) : '?', f: GB(free) })}</div></div>`;
      };
      const rows = stores.map(s => {
        const used = +pick(s, 'used_bytes', 'used', 'usage_bytes', 'usage') || 0; let total = +pick(s, 'total_bytes', 'quota_bytes', 'capacity_bytes', 'total', 'quota', 'limit', 'capacity') || 0;
        let free = pick(s, 'free_bytes', 'free', 'available_bytes', 'available'); free = free != null ? +free : Math.max(0, total - used); if (!total && free) total = used + free;
        U += used; T += total; if (total && used / total >= 0.8) hot++;
        return row(`${icon(pick(s, 'provider', 'kind', 'type'))} ${pick(s, 'name', 'label', 'title', 'email', 'id') || '?'}`, used, total, free);
      }).join('');
      return `<h3>${S('💾 Drive lưu video')}</h3>${hot ? `<p class="small warn-t" style="margin:.4rem 0 0">${S('⚠️ {n} Drive đã dùng ≥ 80% – dọn bớt hoặc thêm Drive trên GrabCast.', { n: hot })}</p>` : ''}
        ${rows || emptyConn('Workspace Lexkite chưa có Drive nào.')}${stores.length > 1 ? row(S('Tổng'), U, T, Math.max(0, T - U), 'total') : ''}`;
    }
  }
  // Studio (hoặc nơi khác) điền sẵn trình soạn: gọi trước khi mở tab Video & Social
  const prefill = x => { pending = x && typeof x === 'object' ? x : null; };
  window.AdminSocial = { render, prefill, _t: { nyAt, nyParts, GROUP, clen, tagsIn, linksIn, tagList, checkLocal, kindFor, optsFor, freeSlots, planBulk, dupOf, dayKey, addDays, atNY, PL, EN } };
})();
