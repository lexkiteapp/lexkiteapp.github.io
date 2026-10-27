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
    'YouTube & TikTok trên GrabCast đang “Riêng tư đến khi được duyệt”: bài lên ở chế độ riêng tư (TikTok SELF_ONLY, YouTube private) cho tới khi Google/TikTok duyệt app GrabCast.': 'YouTube & TikTok on GrabCast are “Private until review”: posts go up private (TikTok SELF_ONLY, YouTube private) until Google/TikTok approve the GrabCast app.',
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
    '✓ Đồng bộ: {n} số liệu GrabCast, {w} clip web': '✓ Synced: {n} GrabCast metrics, {w} web clips', 'Trọng số': 'Weight', 'Nhóm/khóa': 'Key',
    // Bình luận
    '💬 Bình luận': '💬 Comments', 'API GrabCast (khóa API) chưa cho đọc/trả lời bình luận – hộp thư chỉ dùng được khi đăng nhập grabcast.click. Lexkite liệt kê bài đã đăng để mở thẳng trên nền tảng.': 'The GrabCast API (API key) does not allow reading/replying to comments yet – the inbox only works signed in on grabcast.click. Lexkite lists published posts so you can open them on the platform.',
    'Mở hộp thư GrabCast ↗': 'Open the GrabCast inbox ↗', 'Chưa có bài đã đăng.': 'No published posts yet.',
    // Chọn clip, AI, bộ kênh
    '📚 Kho Lexkite (đã duyệt)': '📚 Lexkite library (approved)', 'Tìm clip…': 'Search clips…', 'Chưa có clip đã duyệt.': 'No approved clips yet.', 'đã dùng trên {n} kênh': 'used on {n} channels', 'Chọn': 'Pick',
    '✨ Gợi ý AI': '✨ AI suggestions', 'Hook gợi ý': 'Suggested hooks', 'Dùng caption này': 'Use this caption', 'Thêm hashtag': 'Add hashtags', 'Dùng làm bình luận đầu': 'Use as first comment', '⏳ AI đang viết…': '⏳ AI is writing…',
    'Bộ kênh:': 'Channel sets:', 'Tất cả FB': 'All FB', 'Tất cả IG': 'All IG', 'Tất cả': 'All', '💾 Lưu bộ': '💾 Save as set', 'Tên bộ kênh:': 'Set name:', 'Xóa bộ “{n}”?': 'Delete set “{n}”?', 'Chọn kênh trước.': 'Pick channels first.',
  };
  const CSS = `.smg-kb{display:grid;grid-template-columns:repeat(7,minmax(180px,1fr));gap:.5rem;overflow-x:auto;padding-bottom:.4rem}.smg-col{background:var(--bg2,rgba(127,127,127,.06));border-radius:10px;padding:.45rem;min-height:120px}.smg-col h4{margin:0 0 .4rem;font-size:.8rem;display:flex;justify-content:space-between}.smg-col.drop{outline:2px dashed var(--accent,#0d9488)}
.smg-card{background:var(--card,#fff);border:1px solid var(--line);border-radius:8px;padding:.45rem;margin-bottom:.4rem;font-size:.78rem;cursor:grab}.smg-card b{display:block;overflow-wrap:anywhere}.smg-card .acts{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.35rem}.smg-card .warn-t{color:#b45309}
.smg-bar{height:6px;border-radius:3px;background:rgba(127,127,127,.2);overflow:hidden;min-width:60px}.smg-bar i{display:block;height:100%;background:#0d9488}.smg-bar i.w{background:#d97706}.smg-bar i.b{background:#dc2626}
.smg-flt{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.5rem 0}.smg-chip{display:inline-block;font-size:.68rem;padding:.05rem .35rem;border-radius:6px;background:rgba(127,127,127,.14);margin:.1rem .15rem 0 0}
.smg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.4rem}.smg-clip{border:1px solid var(--line);border-radius:8px;padding:.4rem;font-size:.75rem;text-align:left;background:none;color:inherit;cursor:pointer}.smg-clip:hover{border-color:var(--accent,#0d9488)}
.smg-scroll{max-height:60vh;overflow:auto}.smg-kpi{display:flex;flex-wrap:wrap;gap:.6rem}.smg-kpi div{border:1px solid var(--line);border-radius:8px;padding:.4rem .6rem;min-width:90px}.smg-kpi b{display:block;font-size:1.05rem}
@media (max-width:640px){.smg-kb{grid-template-columns:repeat(7,80vw)}}`;
  const PI = { facebook_page: '📘', instagram: '📸', tiktok: '🎵', youtube: '▶️', threads: '🧵' }, PN = { facebook_page: 'Facebook Page', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', threads: 'Threads' };
  const COLS = [['idea', '💡 Ý tưởng'], ['draft', '📝 Nháp'], ['review', '👀 Chờ duyệt'], ['approved', '✅ Đã duyệt'], ['scheduled', '🕒 Đã lên lịch'], ['published', '🚀 Đã đăng'], ['failed', '⚠️ Lỗi']];
  const HS = { ok: ['ok', 'Hoạt động'], reconnect: ['bad', 'Cần kết nối lại'], expiring: ['warn', 'Sắp hết hạn'], near_limit: ['warn', 'Gần trần 24 giờ'], limit: ['bad', 'Hết lượt 24 giờ'], private_only: ['muted', 'Chỉ riêng tư (chờ duyệt app)'] };
  const uid = () => ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  // Gộp các khung cùng clip + cùng giờ thành 1 bài nhiều kênh (1 bài GrabCast = 1 lần duyệt)
  const groupSlots = slots => { const m = new Map(); for (const s of slots) { const k = s.clip + '|' + s.at; const g = m.get(k) || m.set(k, { clip: s.clip, at: s.at, account_ids: [] }).get(k); g.account_ids.push(String(s.account_id)); } return [...m.values()].sort((a, b) => a.at - b.at); };
  const parseCsv = t => { const ls = String(t || '').trim().split(/\r?\n/).filter(Boolean); if (!ls.length) return []; const h = ls[0].toLowerCase().split(',').map(x => x.trim()); const hasH = h.includes('post_id'); const cols = hasH ? h : ['post_id', 'platform', 'views', 'likes', 'comments', 'saves', 'shares', 'watch_s']; return (hasH ? ls.slice(1) : ls).map(l => { const v = l.split(','); return Object.fromEntries(cols.map((c, i) => [c, (v[i] || '').trim()])); }).filter(r => r.post_id); };
  const parseQueueCsv = t => String(t || '').split(/\r?\n/).map(l => l.split(/[,\t]/).map(x => x.trim())).filter(c => /^[a-z0-9-]{3,120}$/.test(c[0] || '') && c[1] && c[2]).map(c => ({ clip: c[0], account_ids: c[1].split(/[;|\s]+/).filter(x => /^[A-Za-z0-9_-]{1,40}$/.test(x)), at: +new Date(c[2]) })).filter(x => x.account_ids.length && x.at > Date.now());
  const rate = r => (r.views ? ((r.saves || 0) * 3 + (r.shares || 0) * 4 + (r.comments || 0) * 2 + (r.likes || 0)) / r.views : 0);
  const sumBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = key(r) || '–'; const o = m.get(k) || m.set(k, { k, views: 0, likes: 0, comments: 0, saves: 0, shares: 0, watch_s: 0, n: 0 }).get(k); for (const f of ['views', 'likes', 'comments', 'saves', 'shares', 'watch_s']) o[f] += +r[f] || 0; o.n++; } return [...m.values()].sort((a, b) => b.views - a.views); };
  // Phát hiện kênh mới sau khi kết nối (popup GrabCast)
  const newAccounts = (before, after) => { const b = new Set(before.map(a => String(a.id))); return after.filter(a => !b.has(String(a.id))); };

  function mk(ctx) {
    const esc = ctx.esc, M = (vi, vars) => { if (ctx.lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return ctx.L(vi, vars); let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s; };
    if (!document.getElementById('admSmgCss')) { const st = document.createElement('style'); st.id = 'admSmgCss'; st.textContent = CSS; document.head.appendChild(st); }
    const err = e => M('✗ {e}', { e: ctx.errText(e) });
    const pill = (c, t) => `<span class="pill ${c}">${esc(t)}</span>`;
    const accN = id => { const a = ctx.accById(id); return a ? (PI[String(a.platform)] || '•') + ' ' + (a.display_name || a.username || a.name || id) : '#' + id; };
    return { M, esc, err, pill, accN };
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
    const focus = () => { if (!ctx.focus) return; const c = el.querySelector(`.smg-card[data-id="${CSS.escape(ctx.focus)}"]`); if (c) { c.style.outline = '2px solid #0d9488'; c.scrollIntoView({ block: 'nearest', inline: 'center' }); } ctx.focus = null; };
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
    const { M, esc, err } = mk(ctx); let A = null;
    const when = ms => (ms ? new Date(ms).toLocaleString(ctx.lang() === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
    const STOP = { off: 'Đang tắt', breaker: 'Cầu dao đang mở', 'no-key': 'Thiếu khóa GrabCast', budget: 'Hết ngân sách hôm nay' };
    const DS = { planned: 'Đã xếp lịch', pushed: 'Đã đẩy lên GrabCast', published: 'Đã đăng', failed: 'Lỗi', cancelled: 'Đã hủy' }, BS = Object.fromEntries(COLS);
    const msg = (t, c) => { const m = box.querySelector('#apM'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { A = await ctx.sapi('GET', 'lk/auto'); paint(); } catch (e) { box.innerHTML = `<p class="small bad-t">${esc(err(e))}</p>`; } };
    function paint() {
      const c = A.cfg, st = A.state || {}, lr = st.last_run, br = st.breaker && st.breaker.until > A.now ? st.breaker : null;
      const stopTxt = lr ? (lr.stop ? (STOP[lr.stop] ? M(STOP[lr.stop]) : M('Dừng: {c}', { c: lr.stop })) : M('Bình thường')) : '';
      box.innerHTML = `<h3 style="margin-top:0">${M('🛰️ Autopilot đăng social')}</h3><p class="small muted">${M('Chạy nền trên máy chủ mỗi 2 giờ (máy anh tắt vẫn chạy): lấy bài đến hạn trong lịch Kênh & phân phối, tạo bài trên GrabCast và lên lịch đúng giờ – GrabCast tự đăng khi tới giờ.')}</p>
        ${A.key ? '' : `<p class="small bad-t">${M('Máy chủ chưa có khóa GrabCast (secret GRABCAST_API_KEY).')}</p>`}
        ${br ? `<p class="small bad-t">${M('⛔ Cầu dao mở tới {d} (mã {c}) – GrabCast trả lỗi nên autopilot đã dừng cả lượt, không thử lại.', { d: esc(when(br.until)), c: esc(br.code) })} <button type="button" class="btn sm ghost" id="apReset">${M('Mở lại')}</button></p>` : ''}
        <p class="small"><b>${M('Lần chạy cuối')}:</b> ${lr ? `${esc(when(lr.at))} · ${esc(stopTxt)}` : M('Chưa chạy lần nào.')} · <b>${M('Đồng bộ trạng thái')}:</b> ${esc(when(st.last_sync && st.last_sync.at))} · <b>${M('Webhook GrabCast')}:</b> ${A.webhook ? M('sẵn sàng') : M('chưa cấu hình')}</p>
        <div class="smg-kpi">${[['Đến hạn', lr ? lr.due : 0], ['Đã tạo', lr ? lr.created : 0], ['Đã lên lịch', lr ? lr.scheduled : 0], ['Chờ duyệt', lr ? lr.review : 0], ['Lượt GrabCast còn hôm nay', A.budget_left + '/' + c.daily_calls]].map(([k, v]) => `<div><b>${esc(String(v))}</b><span class="tiny muted">${M(k)}</span></div>`).join('')}</div>
        <div class="soc-form" style="margin-top:.6rem"><label class="row" style="gap:.3rem"><input type="checkbox" id="apOn" ${c.on ? 'checked' : ''}>${M('Bật autopilot (công tắc khẩn: tắt = dừng mọi lượt gọi GrabCast)')}</label>
          <label class="row" style="gap:.3rem"><input type="checkbox" id="apAA" ${c.auto_approve ? 'checked' : ''}>${M('Tự động duyệt')}</label>
          <label>${M('Duyệt tay trước (bài/nền tảng)')}<input type="number" min="1" max="50" id="apN" value="${c.manual_first}"></label></div>
        <p class="tiny muted">${M('Tắt: mọi bài autopilot vào cột Chờ duyệt, anh duyệt tay (giữ đúng giờ đã xếp). Bật: chỉ nền tảng đã có đủ số bài duyệt tay mới tự lên lịch.')}</p>
        <div class="small" style="font-weight:600;margin:.4rem 0 .2rem">${M('Nền tảng tự đăng')}</div><div class="soc-targets">${Object.keys(PN).map(p => `<label><input type="checkbox" data-ap="${p}" ${c.plats[p] ? 'checked' : ''}> ${PI[p]} ${PN[p]} <span class="tiny muted">${M('Đã duyệt tay {m}/{n}', { m: (A.manual || {})[p] || 0, n: c.manual_first })}${p === 'tiktok' || p === 'youtube' ? ' · ' + M('chỉ bật khi app GrabCast được duyệt') : ''}</span></label>`).join('')}</div>
        <div class="row" style="gap:.4rem;margin-top:.5rem"><button type="button" class="btn sm" id="apSave">${M('💾 Lưu cài đặt')}</button><button type="button" class="btn sm ghost" id="apRun" ${A.key && c.on ? '' : 'disabled'}>${M('▶️ Chạy ngay')}</button></div>
        <p class="small" id="apM" role="status" aria-live="polite"></p>
        <details${(A.upcoming || []).length ? ' open' : ''}><summary class="small" style="font-weight:600">${M('Sắp đăng (72 giờ)')}</summary>${(A.upcoming || []).length ? `<div class="smg-scroll"><table class="soc-tbl"><thead><tr><th>${M('Giờ')}</th><th>${M('Clip')}</th><th>${M('Kênh')}</th><th>${M('Trạng thái')}</th></tr></thead><tbody>${A.upcoming.map(r => `<tr><td>${esc(when(r.slot_ms))}</td><td>${esc(r.clip)}</td><td>${PI[r.platform] || ''} ${esc(r.channel || r.channel_id)}</td><td>${esc(r.board && BS[r.board] ? M(BS[r.board]) : DS[r.state] ? M(DS[r.state]) : r.state || '')}${r.err ? ` <span class="tiny bad-t">${esc(r.err)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted">${M('Chưa có bài nào trong lịch – chạy “Lập lịch” ở Kênh & phân phối.')}</p>`}</details>`;
      const $ = s => box.querySelector(s);
      $('#apSave').onclick = async () => {
        const cfg = { on: $('#apOn').checked, auto_approve: $('#apAA').checked, manual_first: +$('#apN').value || 1, plats: Object.fromEntries([...box.querySelectorAll('[data-ap]')].map(i => [i.dataset.ap, i.checked])) };
        if (cfg.auto_approve && !A.cfg.auto_approve && !confirm(M('Bật tự động duyệt? Bài autopilot sẽ được lên lịch công khai không cần anh duyệt – chỉ cho nền tảng đã có đủ bài duyệt tay.'))) return;
        try { A.cfg = (await ctx.sapi('POST', 'lk/auto/save', { cfg })).cfg; paint(); msg(M('✓ Đã lưu cài đặt'), true); } catch (e) { msg(err(e), false); }
      };
      $('#apRun').onclick = async () => {
        if (!confirm(M('Chạy 1 lượt autopilot ngay (tính vào ngân sách GrabCast hôm nay)?'))) return;
        $('#apRun').disabled = true; msg(M('Đang tải…'));
        try { const r = (await ctx.sapi('POST', 'lk/auto/run', {})).run || {}; await load(); msg(M('Xong: tạo {c} · lên lịch {s} · chờ duyệt {r} · {n} lượt GrabCast', { c: r.created || 0, s: r.scheduled || 0, r: r.review || 0, n: r.calls || 0 }), !r.stop); } catch (e) { msg(err(e), false); const b = $('#apRun'); if (b) b.disabled = false; }
      };
      const rs = $('#apReset'); if (rs) rs.onclick = async () => { try { await ctx.sapi('POST', 'lk/auto/reset', {}); await load(); } catch (e) { msg(err(e), false); } };
    }
    await load();
  }
  async function queue(el, ctx) {
    const { M, esc, err, accN } = mk(ctx); let R = null, plan = null, sel = ctx.LS.get('qacc', null);
    el.innerHTML = `<section class="card" id="smgAP"><p class="small muted">${M('Đang tải…')}</p></section><section class="card"><h3 style="margin-top:0">${M('🤖 Hàng đợi tự động')}</h3><p class="small muted">${M('Rải clip ĐÃ DUYỆT trong kho Lexkite vào khung giờ vàng từng kênh, theo trần/ngày, giãn cách và chống trùng. Kết quả là bài NHÁP chờ duyệt – không tự đăng.')}</p>
      <div id="smgR"><p class="small muted">${M('Đang tải…')}</p></div><div class="row" style="gap:.4rem;margin-top:.6rem"><button type="button" class="btn sm" id="smgPlan">${M('📋 Lập kế hoạch')}</button><button type="button" class="btn sm ghost" id="smgCsv">${M('⬆️ Nhập CSV')}</button><button type="button" class="btn sm primary" id="smgGo" disabled>${M('Tạo {n} bài nháp & gửi duyệt', { n: 0 })}</button></div>
      <p class="small" id="smgQm" role="status" aria-live="polite"></p><div id="smgOut" class="smg-scroll"></div></section>`;
    const $ = s => el.querySelector(s), msg = (t, c) => { const m = $('#smgQm'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const accs = () => (ctx.D.accounts || []).filter(a => PN[String(a.platform)]);
    autoCard($('#smgAP'), ctx);
    try { R = (await ctx.sapi('GET', 'lk/rules')).rules; } catch (e) { return msg(err(e), false); }
    if (!sel) sel = accs().map(a => String(a.id));
    const paintR = () => {
      $('#smgR').innerHTML = `<details open><summary class="small" style="font-weight:600">${M('Luật chống spam')}</summary><p class="tiny muted">${M('Đây là trần riêng của Lexkite (chống spam), luôn thấp hơn trần nền tảng.')}</p>
        <div class="soc-form">${Object.keys(PN).map(p => `<label>${PI[p]} ${PN[p]} – ${M('Tối đa/ngày')}<input type="number" min="0" max="30" data-pd="${p}" value="${R.perDay[p] || 0}"></label>`).join('')}
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
    el.innerHTML = `<section class="card"><h3 style="margin-top:0">${M('🩺 Sức khỏe kênh')}</h3><p class="small muted">${M('YouTube & TikTok trên GrabCast đang “Riêng tư đến khi được duyệt”: bài lên ở chế độ riêng tư (TikTok SELF_ONLY, YouTube private) cho tới khi Google/TikTok duyệt app GrabCast.')}</p>
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
      <div class="smg-flt"><select id="sBy">${[['post', 'Theo bài'], ['account', 'Theo kênh'], ['template', 'Theo template'], ['hook', 'Theo hook'], ['cefr', 'Theo độ khó']].map(([k, t]) => `<option value="${k}" ${by === k ? 'selected' : ''}>${M(t)}</option>`).join('')}</select>
      <button type="button" class="btn sm" id="sSync">${M('🔄 Đồng bộ số liệu')}</button><button type="button" class="btn sm ghost" id="sCsv">${M('⬆️ Nhập CSV')}</button><button type="button" class="btn sm ghost" id="sExp">${M('⬇️ Xuất báo cáo CSV')}</button></div><p class="small" id="sMsg" role="status" aria-live="polite"></p><div id="sOut"><p class="small muted">${M('Đang tải…')}</p></div></section>`;
    const $ = s => el.querySelector(s), msg = (t, c) => { const m = $('#sMsg'); if (m) { m.textContent = t; m.className = 'small ' + (c === true ? 'ok-t' : c === false ? 'bad-t' : 'muted'); } };
    const load = async () => { try { D = await ctx.sapi('GET', 'lk/metrics'); paint(); } catch (e) { msg(err(e), false); } };
    const n = x => (+x || 0).toLocaleString();
    function paint() {
      const rows = (D.rows || []).filter(r => r.platform !== 'web' || by === 'template' || by === 'hook' || by === 'cefr');
      if (!rows.length) { $('#sOut').innerHTML = `<p class="small muted">${M('Chưa có số liệu.')}</p>`; return; }
      const t = sumBy(rows, () => 'all')[0], key = { post: r => r.post_id || r.clip, account: r => (r.platform === 'web' ? 'web' : (PI[r.platform] || '') + ' ' + r.account_id), template: r => r.template, hook: r => r.hook, cefr: r => r.cefr }[by];
      const g = sumBy(rows, key).slice(0, 300), W = D.weights && D.weights.by && D.weights.by[by];
      $('#sOut').innerHTML = `<div class="smg-kpi">${[['Lượt xem', n(t.views)], ['Thích', n(t.likes)], ['Bình luận', n(t.comments)], ['Lưu lại', n(t.saves)], ['Chia sẻ', n(t.shares)], ['Thời gian xem', Math.round(t.watch_s / 60) + ' min'], ['Tỉ lệ tương tác', (rate(t) * 100).toFixed(1) + '%']].map(([k, v]) => `<div><span class="tiny muted">${M(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        <div class="smg-scroll"><table class="soc-tbl" style="margin-top:.6rem"><thead><tr><th>${M('Nhóm/khóa')}</th><th>${M('Lượt xem')}</th><th>${M('Thích')}</th><th>${M('Bình luận')}</th><th>${M('Lưu lại')}</th><th>${M('Chia sẻ')}</th><th>${M('Tỉ lệ tương tác')}</th>${W ? `<th>${M('Trọng số')}</th>` : ''}</tr></thead>
        <tbody>${g.map(r => `<tr><td>${esc(r.k)}</td><td>${n(r.views)}</td><td>${n(r.likes)}</td><td>${n(r.comments)}</td><td>${n(r.saves)}</td><td>${n(r.shares)}</td><td>${(rate(r) * 100).toFixed(1)}%</td>${W ? `<td>${W[r.k] ? W[r.k].w : '–'}</td>` : ''}</tr>`).join('')}</tbody></table></div>
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
  window.AdminSocialMgr = { paint: (t, el, ctx) => TABS[t](el, ctx), pickClip, aiSuggest, setsBar, _t: { groupSlots, parseCsv, parseQueueCsv, rate, sumBy, newAccounts, COLS, EN } };
})();
