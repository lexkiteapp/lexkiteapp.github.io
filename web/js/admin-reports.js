/* Quản trị → "Báo lỗi": hộp báo lỗi người dùng (functions/api/report.js) – tải lười khi mở tab (admin.js).
 *   AdminReports.render(container, L, { esc, num, when, lang })  → một hàng công cụ (trạng thái, tìm kiếm, nút Bộ lọc, ?, ⋯), danh sách lên đầu màn, bảng chi tiết bên cạnh (màn hẹp: ngăn trượt).
 *     Port Stitch adm-reports2 (brand/stitch/v3/admin). Nút trên từng dòng + phím tắt (j/k, f, t, m, 1–5, x, u, ?) + hàng loạt, mọi lệnh chờ Hoàn tác rồi mới gửi và báo người dùng.
 *     Mẫu trả lời theo ngôn ngữ người báo (op get.tpl, sửa được trước khi gửi). Vẫn đủ: ngữ cảnh, lỗi console, ảnh chụp, giao việc, gộp trùng, spam, lịch sử, xuất CSV, chế độ thư, mốc xử lý.
 *   AdminReports.card(container, L, { esc, num, lang })     → thẻ chất lượng: theo trạng thái, theo khu vực, 7 ngày, thời gian sửa trung vị.
 * Mọi lệnh qua /api/report (cổng adminGate, ghi admin_log). Mọi dữ liệu người dùng hiển thị qua esc(). Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    'Cài đặt & bí mật': 'Setup & secrets', 'Ảnh chụp trên R2': 'Screenshots on R2', '{p}% của 10 GB miễn phí · {n} ảnh': '{p}% of the 10 GB free tier · {n} images', '{n} ảnh còn ở D1': '{n} still in D1',
    'Pages: binding R2 REPORT_SHOTS → bucket lexkite-report-shots (wrangler.toml)': 'Pages: R2 binding REPORT_SHOTS → bucket lexkite-report-shots (wrangler.toml)', 'Pages: secret REPORT_SHOT_KEY (hoặc LEXKITE_REPORT_CLI_KEY) để ký URL xem ảnh': 'Pages: REPORT_SHOT_KEY (or LEXKITE_REPORT_CLI_KEY) secret to sign image URLs', 'Đủ': 'Ready', 'Thiếu': 'Missing', 'AI phân loại': 'AI triage', 'GitHub Issue cho Claude Code': 'GitHub issues for Claude Code', 'Tự động theo PR (LX-xxxx)': 'Auto status from PRs (LX-xxxx)',
    'Thư cho người báo': 'Reporter emails', 'Báo đẩy "đã sửa"': '"Fixed" push notifications', 'Chưa gửi thư nào – chưa biết': 'No email sent yet – unknown', 'Gửi thư đang lỗi – xem lịch sử phiếu': 'Emails are failing – check ticket history',
    'Pages: binding AI hoặc secret CF_AI_TOKEN + CF_ACCOUNT_ID': 'Pages: AI binding or CF_AI_TOKEN + CF_ACCOUNT_ID secrets', 'Pages: secret GH_ISSUES_TOKEN (PAT, Issues: Read & write)': 'Pages: GH_ISSUES_TOKEN secret (PAT, Issues: Read & write)',
    'Pages + GitHub Actions: secret LEXKITE_REPORT_CLI_KEY (≥ 32 ký tự, cùng giá trị)': 'Pages + GitHub Actions: LEXKITE_REPORT_CLI_KEY secret (≥ 32 chars, same value)', 'Worker lexkite-mail: secret RESEND_API_KEY hoặc BREVO_API_KEY': 'Worker lexkite-mail: RESEND_API_KEY or BREVO_API_KEY secret',
    'Pages: service binding MAIL → lexkite-mail': 'Pages: MAIL service binding → lexkite-mail', 'Pages: secret D1B_ACCOUNT_ID + D1B_TOKEN (D1 nội bộ)': 'Pages: D1B_ACCOUNT_ID + D1B_TOKEN secrets (internal D1)', 'Pages: biến PUSH_PCT > 0 hoặc FCM_ON = 1': 'Pages: PUSH_PCT > 0 or FCM_ON = 1 variable',
    'Mở': 'Open', 'Thêm': 'More', 'Thêm trạng thái': 'More statuses', 'Bộ lọc': 'Filters', 'Xóa bộ lọc': 'Clear filters', 'Phím tắt': 'Keyboard shortcuts', 'Tùy chọn khác': 'More options', 'Khu vực': 'Area', 'Loại': 'Type', 'Mức': 'Severity', 'Sắp xếp': 'Sort', 'Đề xuất': 'Suggestions', 'Cảm ơn': 'Thanks', 'Đánh dấu đã sửa {id}': 'Mark {id} as fixed', 'Cảm ơn {id}': 'Thank reporter of {id}', 'Chuyển {id} sang Đang xử lý': 'Move {id} to In progress', 'có ảnh': 'screenshot', 'nhận thư': 'email', 'đã xem': 'seen', '{n} đã chọn': '{n} selected', 'Chọn tất cả': 'Select all', '{w} → {s}': '{w} → {s}', 'Đã trả lời {w}': 'Replied to {w}', 'Hoàn tác': 'Undo', 'Đã hoàn tác': 'Undone', 'Thử lại': 'Retry', 'Đã báo người dùng trong app': 'Reporter notified in the app', '{n} thư': '{n} email(s)', 'kèm {n} phiếu trùng': 'with {n} duplicate(s)', 'Đề xuất dùng Duyệt / Từ chối trong bảng chi tiết.': 'Suggestions use Approve / Reject in the detail panel.', 'Mẫu trả lời': 'Reply templates', 'Cảm ơn đã báo': 'Thanks for reporting', 'Cần thêm thông tin': 'Need more info', 'Gửi bằng ngôn ngữ của người báo: {l}': 'Sent in the reporter\'s language: {l}', 'báo trong app': 'in-app notice', 'thư': 'email', 'người dùng đã xem': 'seen by reporter', 'Nghĩa: {t}': 'Meaning: {t}', 'Đánh dấu đã sửa và báo': 'Mark fixed and notify', 'Gửi trả lời': 'Send reply', 'j k di chuyển · f đã sửa · t cảm ơn · ? phím tắt': 'j k move · f fixed · t thanks · ? shortcuts',
    'Di chuyển giữa các dòng': 'Move between rows', 'Chọn dòng': 'Select row', 'Chọn tất cả / bỏ chọn': 'Select all / clear', 'Chọn nhiều dòng liên tiếp': 'Extend selection', 'Mở chi tiết': 'Open details', 'Đánh dấu đã sửa và báo người dùng': 'Mark fixed and notify the reporter', 'Gửi mẫu cảm ơn': 'Send the thank-you template', 'Gửi mẫu cần thêm thông tin': 'Send the need-more-info template', 'Soạn trả lời': 'Write a reply', 'Gán trạng thái: Mới · Tiếp nhận · Đang xử lý · Đã sửa · Không sửa': 'Set status: New · Acknowledged · In progress · Fixed · Won\'t fix', 'Hoàn tác thao tác vừa rồi': 'Undo the last action', 'Tìm kiếm': 'Search', 'Đóng / bỏ chọn': 'Close / clear selection', 'Hiện bảng phím này': 'Show this list',
    'Tất cả đang mở': 'All open', 'Mới': 'New', 'Đã tiếp nhận': 'Acknowledged', 'Đang xử lý': 'In progress', 'Đã sửa': 'Fixed', 'Không sửa': "Won't fix", 'Trùng lặp': 'Duplicate', 'Spam': 'Spam',
    'Tìm mã LX-…, nội dung, email, trang, phiên bản': 'Search LX-…, text, email, page, version', 'Mọi khu vực': 'All areas', 'Mọi loại': 'All types', 'Mọi nền tảng': 'All platforms', 'Mới nhất': 'Newest', 'Cũ nhất': 'Oldest', 'Vừa cập nhật': 'Recently updated',
    'Xuất CSV': 'Export CSV', 'Tải lại': 'Reload', 'Thư báo quản trị': 'Admin email', 'Ngay khi có': 'Instant', 'Tóm tắt hằng ngày': 'Daily digest', 'Tắt': 'Off', 'Gồm báo lỗi thử (sandbox)': 'Include sandbox reports',
    'Không có báo lỗi nào khớp bộ lọc.': 'No reports match these filters.', 'Đang tải…': 'Loading…', '{n} báo lỗi': '{n} reports', 'Xem thêm': 'Load more',
    'Gộp {n} mục đã chọn vào…': 'Merge {n} selected into…', 'Gộp': 'Merge', 'Bỏ chọn': 'Clear selection', 'Gộp {a} vào {b}? Người báo (nếu đồng ý nhận thư) sẽ được báo là trùng lặp.': 'Merge {a} into {b}? Reporters (who opted in) will be told it is a duplicate.',
    'Đóng': 'Close', 'Trạng thái': 'Status', 'Mô tả': 'Description', 'Ngữ cảnh': 'Context', 'Trang': 'Page', 'Mã nội dung': 'Content id', 'Tên miền (add-on)': 'Site (add-on)', 'Nền tảng': 'Platform', 'Phiên bản': 'Version',
    'Ngôn ngữ': 'Language', 'Khung nhìn': 'Viewport', 'Múi giờ': 'Time zone', 'Trình duyệt': 'User agent', 'Đăng nhập': 'Signed in', 'có': 'yes', 'không': 'no', 'Thử nghiệm (sandbox)': 'Sandbox', 'Email người báo': 'Reporter email',
    '(đồng ý nhận cập nhật)': '(opted in to updates)', '(không nhận thư)': '(no emails)', 'Lỗi console ({n})': 'Console errors ({n})', 'Không có lỗi console.': 'No console errors.', 'Ảnh chụp màn hình': 'Screenshot', 'Xem ảnh': 'Show screenshot',
    'Phản hồi cho người báo (họ thấy trong trang trạng thái)': 'Reply to the reporter (shown on their status page)', 'Gửi phản hồi': 'Send reply', 'Ghi chú nội bộ (chỉ quản trị thấy)': 'Internal note (admins only)', 'Lưu ghi chú': 'Save note',
    'Giao cho': 'Assignee', '— chưa giao —': '— unassigned —', 'Gộp vào mã (LX-…)': 'Merge into ticket (LX-…)', 'Đánh dấu spam': 'Mark as spam', 'Không phải spam': 'Not spam', 'Lịch sử': 'History', 'Trùng với {id}': 'Duplicate of {id}', 'Các mục trùng: {ids}': 'Duplicates: {ids}',
    '✓ Đã lưu': '✓ Saved', '✓ Đã lưu · đã gửi thư cho người báo': '✓ Saved · reporter emailed', 'Mở trang': 'Open page', 'Lỗi: {e}': 'Error: {e}',
    // AI & Claude Code & Đề xuất
    'Mọi mức': 'All severities', 'Ưu tiên (mức → số người)': 'Priority (severity → people)', 'Phân loại AI': 'AI triage', 'Phân loại theo luật (AI không sẵn sàng)': 'Rule-based triage (AI unavailable)',
    'Nguyên nhân có thể': 'Likely cause', 'Đề xuất sửa': 'Suggested fix', 'Độ tin cậy {p}%': 'Confidence {p}%', 'Cần người duyệt': 'Needs human review', 'AI gợi ý trùng với {id}': 'AI suggests duplicate of {id}', 'Chưa phân loại': 'Not triaged yet',
    'AI phân loại lại': 'Re-run AI triage', 'Giao Claude Code': 'Assign to Claude Code', 'Issue GitHub ↗': 'GitHub issue ↗', '{n} người gặp': '{n} people',
    'Chưa đặt GH_ISSUES_TOKEN: Cloudflare Pages → Settings → Variables → thêm secret GH_ISSUES_TOKEN (PAT fine-grained, repo lexkiteapp.github.io, quyền Issues: Read & write) rồi triển khai lại.': 'GH_ISSUES_TOKEN is not set: Cloudflare Pages → Settings → Variables → add secret GH_ISSUES_TOKEN (fine-grained PAT on lexkiteapp.github.io with Issues: Read & write), then redeploy.',
    'Đề xuất chỉ giao Claude Code sau khi Duyệt.': 'Suggestions go to Claude Code only after approval.', 'Duyệt': 'Approve', 'Từ chối': 'Reject', 'Để sau': 'Later', 'Duyệt đề xuất này? Sẽ tạo Issue "feature-approved" (xếp sau mọi lỗi đang mở).': 'Approve this suggestion? A "feature-approved" issue will be created (queued after all open bugs).',
    'đã duyệt': 'approved', 'để sau': 'later', 'Mốc xử lý dự kiến (giờ)': 'Expected handling time (hours)', 'Nghiêm trọng': 'Serious', 'Lỗi thường': 'Normal bug', 'Nội dung/dịch': 'Content/translation', 'Lưu mốc': 'Save',
    'AI': 'AI', 'issue': 'issue', 'issue lỗi': 'issue failed', 'đề xuất': 'suggestion', 'đã sửa (Claude Code)': 'resolved (Claude Code)', 'phân loại': 'triage',
    // Thẻ chất lượng
    '🐞 Báo lỗi người dùng – chất lượng': '🐞 User reports – quality', 'Đang mở': 'Open', 'Thời gian sửa (trung vị, 90 ngày)': 'Time to fix (median, 90 days)', '{h} giờ': '{h} h', '{d} ngày': '{d} days', 'chưa có': 'n/a',
    '7 ngày qua': 'Last 7 days', 'Theo khu vực (30 ngày)': 'By area (30 days)', 'Theo trạng thái': 'By status', 'mới': 'new', 'đã sửa': 'fixed', 'Mở hộp báo lỗi →': 'Open reports →', '{n} đang mở': '{n} open',
    // Loại & khu vực
    'Lỗi ứng dụng': 'App bug', 'Nội dung sai': 'Wrong content', 'Bản dịch': 'Translation', 'Âm thanh': 'Audio', 'Thanh toán / tài khoản': 'Payment / account', 'Góp ý': 'Suggestion',
    'Từ vựng': 'Vocabulary', 'Ngữ pháp': 'Grammar', 'Phát âm': 'Pronunciation', 'Đọc': 'Reading', 'Nghe': 'Listening', 'Viết': 'Writing', 'Nói': 'Speaking', 'Thi thử': 'Mock tests', 'Tài khoản': 'Account', 'Add-on': 'Add-on', 'Khác': 'Other',
    'tạo': 'created', 'đổi trạng thái': 'status', 'phản hồi': 'reply', 'ghi chú': 'note', 'giao việc': 'assigned', 'gộp vào': 'merged into', 'nhận gộp': 'merged', 'đã gửi thư': 'emailed', 'gửi thư lỗi': 'email failed', 'spam': 'spam', 'bỏ spam': 'not spam', 'Thử nghiệm': 'Sandbox',
  };
  const STS = [['new', 'Mới'], ['ack', 'Đã tiếp nhận'], ['prog', 'Đang xử lý'], ['fixed', 'Đã sửa'], ['wontfix', 'Không sửa'], ['dup', 'Trùng lặp']];
  const CATS = { bug: ['🐞', 'Lỗi ứng dụng'], content: ['📝', 'Nội dung sai'], i18n: ['🌐', 'Bản dịch'], audio: ['🔊', 'Âm thanh'], account: ['💳', 'Thanh toán / tài khoản'], idea: ['💡', 'Góp ý'] };
  const AREAS = { vocab: 'Từ vựng', grammar: 'Ngữ pháp', pron: 'Phát âm', reading: 'Đọc', listening: 'Nghe', writing: 'Viết', speaking: 'Nói', tests: 'Thi thử', account: 'Tài khoản', addon: 'Add-on', other: 'Khác' };
  const PLATS = { web: 'Web', pwa: 'PWA', ext: 'Add-on', ios: 'iOS', android: 'Android', app: 'App' };
  const ACTS = { create: 'tạo', status: 'đổi trạng thái', reply: 'phản hồi', note: 'ghi chú', assign: 'giao việc', merge: 'gộp vào', merged: 'nhận gộp', mailed: 'đã gửi thư', 'mail-failed': 'gửi thư lỗi', spam: 'spam', 'not-spam': 'bỏ spam', triage: 'phân loại', issue: 'issue', 'issue-failed': 'issue lỗi', idea: 'đề xuất', resolve: 'đã sửa (Claude Code)' };
  const SEVC = { P0: '#c81e1e', P1: '#c2410c', P2: '#a16207', P3: '#5b6b7f' }; // chữ trắng trên nền ≥ 4,5:1
  const svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = { check: svg('<path d="M20 6 9 17l-5-5"/>'), chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'), clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'), search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'), filter: svg('<path d="M3 6h18M7 12h10M10 18h4"/>'), more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'), x: svg('<path d="M18 6 6 18M6 6l12 12"/>') };
  const UNDO_MS = 6000, ACT_MAX = 10; // ACT_MAX = trần op act (functions/api/report.js)
  const TPLS = [['thanks', 'Cảm ơn đã báo'], ['prog', 'Đang xử lý'], ['fixed', 'Đã sửa'], ['more', 'Cần thêm thông tin']], TPL_ST = { thanks: 'ack', prog: 'prog', fixed: 'fixed', more: 'ack' };
  const KEYS = [[['j', 'k'], 'Di chuyển giữa các dòng'], [['x'], 'Chọn dòng'], [['J', 'K'], 'Chọn nhiều dòng liên tiếp'], [['X'], 'Chọn tất cả / bỏ chọn'], [['Enter'], 'Mở chi tiết'], [['f'], 'Đánh dấu đã sửa và báo người dùng'], [['t'], 'Gửi mẫu cảm ơn'], [['m'], 'Gửi mẫu cần thêm thông tin'], [['r'], 'Soạn trả lời'], [['1', '2', '3', '4', '5'], 'Gán trạng thái: Mới · Tiếp nhận · Đang xử lý · Đã sửa · Không sửa'], [['u'], 'Hoàn tác thao tác vừa rồi'], [['/'], 'Tìm kiếm'], [['Esc'], 'Đóng / bỏ chọn'], [['?'], 'Hiện bảng phím này']];
  const sevChip = v => v ? `<span class="rp-sev" style="--c:${Object.prototype.hasOwnProperty.call(SEVC, v) ? SEVC[v] : '#64748b'}">${Object.prototype.hasOwnProperty.call(SEVC, v) ? v : '?'}</span>` : ''; // chỉ P0–P3 (dữ liệu D1/AI không được chèn HTML)
  let lang = () => 'vi';
  const T = (vi, v) => { let s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : vi; if (v) s = s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m)); return s; };
  const stName = k => T((STS.find(x => x[0] === k) || [k, k])[1]);

  async function api(op, body = {}, keep) {
    const u = window.firebase && firebase.auth().currentUser; if (!u) throw new Error('auth');
    const tk = keep && tokenC ? tokenC : await u.getIdToken(); // keep: tab đang đóng → dùng token đã có, fetch keepalive vẫn đi sau khi trang biến mất
    const r = await fetch('/api/report', { method: 'POST', keepalive: !!keep, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
  }

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.rp-wrap{display:grid;gap:.6rem;min-width:0}.rp-wrap.has-bulk{padding-bottom:5.5rem}.rp-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between}.rp-head h3{margin:0}
.rp-bar{position:relative;display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}.rp-tabs{display:flex;flex-wrap:wrap;gap:.15rem;align-items:center;min-width:0;padding:.2rem;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
.rp-chip{display:inline-flex;gap:.35rem;align-items:center;border:1px solid transparent;background:transparent;color:var(--text);border-radius:9px;padding:.3rem .6rem;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;min-height:34px}.rp-chip:hover{background:var(--surface-2)}
.rp-chip b{font-size:.74rem;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}.rp-chip.on,.rp-chip[aria-pressed=true]{border-color:var(--line);background:var(--surface);font-weight:700;box-shadow:0 1px 0 var(--line)}.rp-chip.on b{color:var(--text)}.rp-chip-u b{color:var(--again)}
.rp-sts .rp-chip,.rp-tpls .rp-chip{border-color:var(--line);background:var(--surface)}.rp-tpls{display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.45rem}
.rp-more-st{font:inherit;font-size:.82rem;font-weight:600;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);padding:.28rem .5rem;min-height:34px;max-width:9.5rem}.rp-more-st.on{border-color:var(--primary);background:var(--primary-soft)}
.rp-search{flex:1 1 200px;min-width:0;display:flex;align-items:center;gap:.4rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:0 .6rem;color:var(--muted)}.rp-search:focus-within{border-color:var(--primary)}.rp-search svg{flex:none}.rp-search input{flex:1;min-width:0;border:0;background:none;color:var(--text);font:inherit;font-size:.86rem;padding:.42rem 0;outline:0}
.rp-tool{display:inline-flex;align-items:center;gap:.35rem;min-height:34px}.rp-tool b{font-size:.72rem;background:var(--primary);color:var(--primary-ink,#fff);border-radius:999px;padding:0 .4rem}.rp-ic{justify-content:center;min-width:34px;padding-inline:.45rem}
.rp-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:30;width:min(340px,100%);display:grid;gap:.55rem;padding:.8rem;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg,0 12px 32px rgba(0,0,0,.18))}.rp-pop[hidden]{display:none}
.rp-pop label{display:grid;gap:.2rem;font-size:.8rem;font-weight:600}.rp-pop label.rp-chk{display:flex;align-items:center;gap:.45rem;font-weight:500}.rp-pop select,.rp-pop input[type=number]{font:inherit;font-weight:400;font-size:.86rem;padding:.4rem .55rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);width:100%;box-sizing:border-box}.rp-pop fieldset{border:1px solid var(--line);border-radius:10px;padding:.5rem .6rem;margin:0;display:grid;gap:.4rem}.rp-pop legend{font-size:.8rem;font-weight:600;padding:0 .3rem}
.rp-split{display:grid;gap:.8rem;align-items:start;min-width:0}.rp-col{min-width:0;display:grid;gap:.5rem}.rp-pane[hidden]{display:none}
.rp-lh{display:flex;align-items:center;gap:.4rem;padding:0 .5rem 0 .35rem;font-size:.74rem;font-weight:700;letter-spacing:.02em;color:var(--muted)}.rp-lh-s{margin-inline-start:auto;font-weight:600}.rp-list{display:grid;gap:0;border:1px solid var(--line);border-radius:14px;background:var(--surface);overflow:hidden}.rp-list>p,.rp-empty{padding:1rem;margin:0;display:grid;gap:.5rem;justify-items:start}
.rp-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.15rem .4rem;align-items:center;padding:.15rem .5rem .15rem .35rem;border-bottom:1px solid var(--line);box-shadow:inset 3px 0 0 transparent}.rp-row:last-child{border-bottom:0}.rp-row:hover{background:var(--surface-2)}.rp-row.cur{box-shadow:inset 3px 0 0 var(--primary);background:color-mix(in srgb,var(--primary) 7%,transparent)}.rp-row.sel{background:color-mix(in srgb,var(--primary) 12%,transparent)}
.rp-ck{display:inline-grid;place-items:center;min-width:28px;min-height:36px;cursor:pointer}
.rp-open{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem;align-items:center;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;padding:.3rem 0;min-width:0}.rp-open:focus-visible{outline:2px solid var(--primary);outline-offset:1px;border-radius:6px}
.rp-open .m{min-width:0;display:grid;gap:.1rem}.rp-open .t{display:flex;gap:.4rem;align-items:center;min-width:0}.rp-open .p{flex:1;min-width:0;font-size:.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rp-meta{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.75rem}.rp-open .r{display:flex;gap:.45rem;align-items:center;white-space:nowrap}
.rp-acts{display:flex;gap:.15rem;opacity:0;transition:opacity .12s}.rp-row:hover .rp-acts,.rp-row:focus-within .rp-acts,.rp-row.cur .rp-acts{opacity:1}.rp-act{display:inline-grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:none;color:var(--text);cursor:pointer}.rp-act:hover{background:var(--surface-3)}.rp-act.good{color:var(--a-ok,var(--good))}.rp-act span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.rp-st{display:inline-block;padding:.1rem .5rem;border-radius:999px;font-size:.7rem;font-weight:700;background:var(--surface-3);color:var(--text)}.rp-st.new{background:var(--accent-soft)}.rp-st.ack,.rp-st.prog{background:var(--gold-soft)}.rp-st.fixed{background:var(--good-soft)}
.rp-tid{font-weight:800;font-size:.82rem;font-variant-numeric:tabular-nums;white-space:nowrap}.rp-hint-keys{margin:0}
.rp-bulk.u-bulk .rp-mg{display:inline-flex;gap:.3rem}.rp-bulk select{font:inherit;font-size:.82rem;border-radius:8px;padding:.25rem .4rem}
.rp-dr{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);z-index:80;background:var(--surface);color:var(--text);box-shadow:var(--shadow-lg,0 0 40px rgba(0,0,0,.3));overflow-y:auto;padding:1rem 1.1rem calc(1.2rem + env(safe-area-inset-bottom));display:grid;gap:.9rem;align-content:start}
.rp-pane.rp-dr{position:sticky;top:.75rem;right:auto;bottom:auto;z-index:1;width:auto;max-height:calc(100vh - 6rem);border:1px solid var(--line);border-bottom-width:3px;border-radius:14px;box-shadow:none;background:var(--surface-2)}.rp-pane.rp-dr>div:not(.rp-head):not(.rp-tools){background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.65rem .75rem}.rp-pane.rp-dr .rp-compose,.rp-pane.rp-dr .rp-ai{background:var(--surface)}
.rp-x{display:inline-grid;place-items:center;min-width:34px;min-height:34px;padding:0}
.rp-dim{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:79}.rp-dr h4{margin:0 0 .35rem;font-size:.86rem}.rp-dr .msg{white-space:pre-wrap;word-break:break-word;background:var(--surface-2);padding:.6rem .7rem;border-radius:10px}
.rp-kv{display:grid;grid-template-columns:max-content 1fr;gap:.25rem .8rem;font-size:.84rem;margin:0}.rp-kv dt{color:var(--muted)}.rp-kv dd{margin:0;word-break:break-word}
.rp-errs{margin:0;padding:.5rem .7rem;background:#111;color:#f5f5f5;border-radius:10px;font:12px/1.45 ui-monospace,Menlo,monospace;max-height:220px;overflow:auto;white-space:pre-wrap}.rp-shot img{max-width:100%;border-radius:10px;border:1px solid var(--line)}
.rp-sts{display:flex;flex-wrap:wrap;gap:.3rem}.rp-dr textarea,.rp-dr input,.rp-dr select{font:inherit;padding:.45rem .6rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text)}.rp-dr textarea{width:100%;box-sizing:border-box;min-height:84px}
.rp-compose{display:grid;gap:.1rem;padding:.7rem .75rem;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.rp-compose p{margin:.35rem 0 0}.rp-tools{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-top:.4rem}
.rp-ev{list-style:none;margin:0;padding:0;font-size:.8rem;display:grid;gap:.2rem;color:var(--muted)}.rp-card .bars{display:flex;gap:4px;align-items:flex-end;height:64px}.rp-card .bars div{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end}
.rp-card .bars i{display:block;width:100%;background:var(--primary);border-radius:4px 4px 0 0;min-height:2px}.rp-card .bars small{font-size:.65rem;color:var(--muted)}.rp-hbar{display:grid;grid-template-columns:7rem 1fr 2.5rem;gap:.5rem;align-items:center;font-size:.8rem}.rp-hbar span.b{height:8px;border-radius:4px;background:var(--primary-soft);overflow:hidden}.rp-hbar span.b i{display:block;height:100%;background:var(--primary)}
.rp-sev{display:inline-block;padding:.06rem .4rem;border-radius:6px;font-size:.68rem;font-weight:800;color:#fff;background:var(--c);flex:none}.rp-ai{border:1px solid var(--line);border-radius:12px;padding:.6rem .75rem;background:var(--surface-2);display:grid;gap:.3rem;font-size:.86rem}.rp-ai p{margin:0}.rp-warn{font-size:.8rem;color:var(--muted)}
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem}
.rp-toast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:.8rem;max-width:calc(100vw - 32px);padding:.6rem .9rem;border-radius:12px;background:var(--text);color:var(--surface);font-size:.88rem;font-weight:600;box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,.3));overflow:hidden}
.rp-undo{border:0;background:none;color:inherit;font:inherit;font-weight:800;text-decoration:underline;cursor:pointer;white-space:nowrap;padding:.2rem .1rem;min-height:32px}.rp-undo kbd{font:inherit;font-size:.72rem;opacity:.75;text-decoration:none}.rp-tbar{position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;transform-origin:left;animation:rpT linear forwards}@keyframes rpT{to{transform:scaleX(0)}}
.rp-keys{border:0;border-radius:16px;padding:1rem 1.2rem;background:var(--surface);color:var(--text);width:min(420px,calc(100vw - 32px));box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.3))}.rp-keys::backdrop{background:rgba(0,0,0,.4)}.rp-keys dl{display:grid;grid-template-columns:max-content 1fr;gap:.35rem .9rem;margin:.6rem 0 0;font-size:.86rem}.rp-keys dd{margin:0}.rp-keys kbd{display:inline-block;min-width:1.3em;text-align:center;font:600 .78rem ui-monospace,Menlo,monospace;padding:.05rem .3rem;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;background:var(--surface-2)}
@media (min-width:1180px){.rp-split:has(.rp-pane:not([hidden])){grid-template-columns:minmax(0,1fr) minmax(380px,440px)}}
@media (hover:none){.rp-acts{opacity:1}}
@media (prefers-reduced-motion:reduce){.rp-tbar{animation:none}.rp-acts{transition:none}}
@media (max-width:640px){.rp-tabs{width:100%;box-sizing:border-box}.rp-list{border:0;background:none;gap:.55rem;overflow:visible}.rp-row{border:1px solid var(--line);border-bottom-width:3px;border-radius:14px;background:var(--surface)}.rp-row:last-child{border-bottom:3px solid var(--line)}.rp-act.good{background:var(--primary);color:var(--primary-ink,#fff);border-color:var(--primary)}.rp-chip,.rp-tool,.rp-more-st,.rp-search input,.rp-undo{min-height:44px}.rp-ic{min-width:44px}.rp-search{flex-basis:100%;order:-1}.rp-pop{width:100%}.rp-hint-keys{display:none}.rp-row{grid-template-columns:auto minmax(0,1fr);padding:.3rem .5rem .4rem .3rem}.rp-ck{min-width:44px;min-height:44px}.rp-open{grid-template-columns:minmax(0,1fr);gap:.3rem}.rp-open .t{flex-wrap:wrap}.rp-open .p{flex-basis:100%;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.rp-acts{grid-column:1/-1;opacity:1;gap:.3rem}.rp-act{flex:1;width:auto;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:.3rem;border:1px solid var(--line);font-size:.8rem;font-weight:600}.rp-act span{position:static;width:auto;height:auto;clip-path:none}.rp-dr{width:100vw}.rp-x{min-width:44px;min-height:44px}.rp-dr .btn{min-height:44px}.rp-tid{font-size:.86rem}}`;
    document.head.appendChild(s);
  }

  // ---------- Hàng đợi có Hoàn tác: giữ lệnh vài giây rồi mới gửi (người báo chỉ được báo sau khi hết thời gian hoàn tác) ----------
  const pending = []; let tokenC = '', toastEl = null, toastT = 0, flushOn = false;
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const commit = async (p, keep) => {
    const i = pending.indexOf(p); if (i < 0) return; pending.splice(i, 1); clearTimeout(p.timer);
    const res = []; let err = null;
    for (const ids of chunk(p.ids, ACT_MAX)) { try { const j = await api('act', { ids, ...p.body }, keep); res.push(...(j.rows || [])); } catch (e) { err = e; } }
    p.done(res, err);
  };
  const flushAll = keep => Promise.all(pending.slice().map(p => commit(p, keep)));
  const watchFlush = () => { if (flushOn) return; flushOn = true; const f = () => { flushAll(true); }; addEventListener('pagehide', f); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') f(); }); }; // đóng/ẩn tab: gửi ngay (fetch keepalive), không mất thao tác

  // ---------- Hộp báo lỗi ----------
  function render(main, L, o) {
    style(); lang = o.lang || lang; const esc = o.esc, num = o.num || (n => n), when = o.when || (x => new Date(x).toLocaleString());
    const F = { status: 'open', area: '', cat: '', plat: '', sev: '', q: '', sort: 'sev', spam: 0, sandbox: 0, offset: 0 };
    let data = null, sel = new Set(), rows = [], cur = -1, curId = '', loadN = 0, holdPane = false;
    const drafts = new Map();
    const ago = x => { const m = Math.max(0, Math.round((Date.now() - x) / 6e4)); return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    const wideQ = window.matchMedia ? matchMedia('(min-width:1180px)') : null, wide = () => !!(wideQ && wideQ.matches);
    main.innerHTML = `<div class="rp-wrap"><div class="rp-bar">
        <div class="rp-tabs" id="rpChips" role="group" aria-label="${T('Trạng thái')}"></div>
        <label class="rp-search">${ICON.search}<input type="search" id="rpQ" placeholder="${T('Tìm mã LX-…, nội dung, email, trang, phiên bản')}" aria-label="${T('Tìm mã LX-…, nội dung, email, trang, phiên bản')}"></label>
        <button type="button" class="btn ghost sm rp-tool" id="rpFB" aria-expanded="false" aria-controls="rpFP">${ICON.filter}<span>${T('Bộ lọc')}</span><b id="rpFN" hidden></b></button>
        <button type="button" class="btn ghost sm rp-tool rp-ic" id="rpHelp" aria-label="${T('Phím tắt')}" title="${T('Phím tắt')}">?</button>
        <button type="button" class="btn ghost sm rp-tool rp-ic" id="rpMB" aria-label="${T('Tùy chọn khác')}" title="${T('Tùy chọn khác')}" aria-expanded="false" aria-controls="rpMP">${ICON.more}</button>
        <div class="rp-pop" id="rpFP" hidden><label>${T('Khu vực')} <select id="rpArea"></select></label>
          <label>${T('Loại')} <select id="rpCat"><option value="">${T('Mọi loại')}</option>${Object.entries(CATS).map(([k, [, l]]) => `<option value="${k}">${T(l)}</option>`).join('')}</select></label>
          <label>${T('Nền tảng')} <select id="rpPlat"><option value="">${T('Mọi nền tảng')}</option>${Object.entries(PLATS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <label>${T('Mức')} <select id="rpSev"><option value="">${T('Mọi mức')}</option>${['P0', 'P1', 'P2', 'P3'].map(v => `<option>${v}</option>`).join('')}</select></label>
          <label>${T('Sắp xếp')} <select id="rpSort"><option value="sev">${T('Ưu tiên (mức → số người)')}</option><option value="new">${T('Mới nhất')}</option><option value="old">${T('Cũ nhất')}</option><option value="upd">${T('Vừa cập nhật')}</option></select></label>
          <label class="rp-chk"><input type="checkbox" id="rpSb"> ${T('Gồm báo lỗi thử (sandbox)')}</label>
          <button type="button" class="btn ghost sm" id="rpFClr">${T('Xóa bộ lọc')}</button></div>
        <div class="rp-pop" id="rpMP" hidden><button type="button" class="btn ghost sm" id="rpCsv">${T('Xuất CSV')}</button><button type="button" class="btn ghost sm" id="rpRe">${T('Tải lại')}</button>
          <label>${T('Thư báo quản trị')} <select id="rpMode"><option value="instant">${T('Ngay khi có')}</option><option value="digest">${T('Tóm tắt hằng ngày')}</option><option value="off">${T('Tắt')}</option></select></label>
          <fieldset><legend>${T('Mốc xử lý dự kiến (giờ)')}</legend><label>${T('Nghiêm trọng')} <input type="number" id="rpE1" min="1" max="2160"></label><label>${T('Lỗi thường')} <input type="number" id="rpE2" min="1" max="2160"></label><label>${T('Nội dung/dịch')} <input type="number" id="rpE3" min="1" max="2160"></label><button type="button" class="btn ghost sm" id="rpEs">${T('Lưu mốc')}</button></fieldset></div></div>
      <div class="rp-split"><div class="rp-col"><div class="rp-lh"><label class="rp-ck"><input type="checkbox" id="rpAllC" aria-label="${T('Chọn tất cả')}"></label><span id="rpLhN"></span><span class="rp-lh-s" id="rpLhS"></span></div><div class="rp-list" id="rpList" aria-live="polite"><p class="muted small">${T('Đang tải…')}</p></div><div id="rpMore"></div><p class="rp-hint-keys small muted">${T('j k di chuyển · f đã sửa · t cảm ơn · ? phím tắt')}</p></div><div class="rp-pane" id="rpPane" hidden></div></div>
      <div id="rpBulk"></div></div>`;
    const $ = s => main.querySelector(s), root = $('.rp-wrap');
    const pops = [['#rpFB', '#rpFP'], ['#rpMB', '#rpMP']];
    const closePops = () => pops.forEach(([b, p]) => { $(p).hidden = true; $(b).setAttribute('aria-expanded', 'false'); });
    pops.forEach(([b, p]) => { $(b).onclick = e => { e.stopPropagation(); const was = $(p).hidden; closePops(); $(p).hidden = !was; $(b).setAttribute('aria-expanded', String(was)); }; $(p).onclick = e => e.stopPropagation(); });
    const offPop = () => { if (!root.isConnected) { document.removeEventListener('click', offPop); return; } closePops(); }; document.addEventListener('click', offPop);
    const filterN = () => [F.area, F.cat, F.plat, F.sev, F.sandbox].filter(Boolean).length;
    const TABS = [['open', 'Mở'], ['new', 'Mới'], ['prog', 'Đang xử lý'], ['fixed', 'Đã sửa'], ['ideas', 'Đề xuất']], MORE = [['ack', 'Đã tiếp nhận'], ['wontfix', 'Không sửa'], ['dup', 'Trùng lặp'], ['spam', 'Spam']];
    const tabKey = () => (F.spam ? 'spam' : F.status);
    const setTab = k => { if (k === 'spam') { F.spam = 1; F.status = ''; } else if (k.startsWith('sev:')) { F.spam = 0; F.status = 'open'; F.sev = k.slice(4); $('#rpSev').value = F.sev; } else { F.spam = 0; F.status = k; if (F.sev && k !== 'open') { F.sev = ''; $('#rpSev').value = ''; } } load(); };
    const chips = () => {
      const c = data.counts || {}, open = (c.new || 0) + (c.ack || 0) + (c.prog || 0), n = k => (k === 'open' ? open : k === 'ideas' ? c.ideas || 0 : k === 'spam' ? data.spam || 0 : c[k] || 0), key = tabKey();
      const urgent = ['P0', 'P1'].filter(v => (data.sevs || {})[v]).map(v => `<button type="button" class="rp-chip rp-chip-u${F.sev === v ? ' on' : ''}" data-st="sev:${v}" aria-pressed="${F.sev === v}">${v} <b>${num(data.sevs[v])}</b></button>`).join('');
      $('#rpChips').innerHTML = TABS.map(([k, l]) => `<button type="button" class="rp-chip${key === k && !F.sev ? ' on' : ''}" data-st="${k}" aria-pressed="${key === k && !F.sev}">${esc(T(l))} <b>${num(n(k))}</b></button>`).join('') + urgent
        + `<select id="rpMoreSt" class="rp-more-st${MORE.some(x => x[0] === key) ? ' on' : ''}" aria-label="${T('Thêm trạng thái')}"><option value="">${T('Thêm')}</option>${MORE.map(([k, l]) => `<option value="${k}"${k === key ? ' selected' : ''}>${esc(T(l))} (${num(n(k))})</option>`).join('')}</select>`;
      $('#rpChips').querySelectorAll('[data-st]').forEach(b => b.onclick = () => setTab(b.dataset.st));
      $('#rpMoreSt').onchange = e => { if (e.target.value) setTab(e.target.value); };
      const a = data.areas || {}, sc = F.area;
      $('#rpArea').innerHTML = `<option value="">${T('Mọi khu vực')}</option>` + Object.entries(AREAS).map(([k, l]) => `<option value="${k}"${k === sc ? ' selected' : ''}>${esc(T(l))}${a[k] ? ' · ' + T('{n} đang mở', { n: a[k] }) : ''}</option>`).join('');
      const fn = filterN(); $('#rpFN').hidden = !fn; $('#rpFN').textContent = fn || '';
      const badge = document.getElementById('repN'); if (badge) badge.textContent = c.new || '';
    };
    const stPill = s => `<span class="rp-st ${esc(s)}">${esc(stName(s))}</span>`;
    const seenTag = r => (r.seen_at && r.status !== 'new' && r.seen_at >= r.upd ? ` · ${esc(T('đã xem'))}` : '');
    const acts = r => r.cat === 'idea' ? '' : `<div class="rp-acts">${r.status === 'fixed' ? '' : `<button type="button" class="rp-act good" data-do="fix" title="${T('Đã sửa')} (f)" aria-label="${T('Đánh dấu đã sửa {id}', { id: esc(r.tid) })}">${ICON.check}<span>${T('Đã sửa')}</span></button>`}<button type="button" class="rp-act" data-do="thanks" title="${T('Cảm ơn')} (t)" aria-label="${T('Cảm ơn {id}', { id: esc(r.tid) })}">${ICON.chat}<span>${T('Cảm ơn')}</span></button>${r.status === 'prog' ? '' : `<button type="button" class="rp-act" data-do="prog" title="${T('Đang xử lý')} (3)" aria-label="${T('Chuyển {id} sang Đang xử lý', { id: esc(r.tid) })}">${ICON.clock}<span>${T('Đang xử lý')}</span></button>`}</div>`;
    const rowHtml = (r, i) => `<div class="rp-row${i === cur ? ' cur' : ''}${sel.has(r.tid) ? ' sel' : ''}" data-i="${i}" data-rid="${esc(r.tid)}"><label class="rp-ck"><input type="checkbox" class="c" data-sel="${esc(r.tid)}" aria-label="${esc(r.tid)}" ${sel.has(r.tid) ? 'checked' : ''}></label>
        <button type="button" class="rp-open" data-id="${esc(r.tid)}"><span class="m"><span class="t">${sevChip(r.sev)}<span class="rp-tid">${esc(r.tid)}</span><span class="p">${esc(r.ai_sum || r.msg)}</span></span>
          <span class="small rp-meta">${esc(T((CATS[r.cat] || ['', r.cat || ''])[1]))}${r.area ? ' · ' + esc(T(AREAS[r.area] || r.area)) : ''} · ${esc(PLATS[r.plat] || r.plat || '')} ${esc(r.ver || '')} · ${esc(r.lang || '')}${r.people > 1 ? ' · ' + esc(T('{n} người gặp', { n: r.people })) : ''}${r.feat ? ' · ' + esc(T(r.feat === 'approved' ? 'đã duyệt' : r.feat === 'later' ? 'để sau' : r.feat)) : ''}${r.issue ? ' · Claude Code' : ''}${r.dup ? ' · ' + esc(T('Trùng với {id}', { id: r.dup })) : ''}${r.has_shot ? ' · ' + esc(T('có ảnh')) : ''}${r.notify ? ' · ' + esc(T('nhận thư')) : ''}${r.asg ? ' · ' + esc(r.asg.split('@')[0]) : ''}${seenTag(r)}</span></span>
          <span class="r">${stPill(r.status)}<span class="small muted">${ago(r.at)}</span></span></button>${acts(r)}</div>`;
    // ---------- Thao tác: dòng đang chọn hoặc các dòng đã tick; chờ Hoàn tác rồi mới gửi ----------
    const matchesTab = st => (F.spam ? true : F.status === 'open' ? ['new', 'ack', 'prog'].includes(st) : F.status === 'ideas' || !F.status ? true : F.status === st);
    const targets = () => (sel.size ? [...sel] : rows[cur] ? [rows[cur].tid] : []);
    const VERB = { fixed: 'Đã sửa', ack: 'Đã tiếp nhận', prog: 'Đang xử lý', new: 'Mới', wontfix: 'Không sửa' };
    const labelOf = (ids, body) => { const who = ids.length > 1 ? T('{n} báo lỗi', { n: ids.length }) : ids[0]; return body.status ? T('{w} → {s}', { w: who, s: T(VERB[body.status]) }) : T('Đã trả lời {w}', { w: who }); };
    function enqueue(ids0, body) {
      const ideas = rows.filter(r => r.cat === 'idea' && ids0.includes(r.tid)).map(r => r.tid), ids = body.status === 'fixed' || body.tpl ? ids0.filter(x => !ideas.includes(x)) : ids0;
      if (!ids.length) { msgToast(T('Đề xuất dùng Duyệt / Từ chối trong bảng chi tiết.')); return; }
      watchFlush(); const u = window.firebase && firebase.auth().currentUser; if (u) u.getIdToken().then(t => { tokenC = t; }).catch(() => {});
      const snap = [], oldCur = curId; rows = rows.filter((r, i) => { if (!ids.includes(r.tid)) return true; const copy = { ...r }; snap.push({ r: copy, i }); if (body.status) r.status = body.status; if (body.status && !matchesTab(body.status)) return false; return true; });
      ids.forEach(x => sel.delete(x)); if (cur >= rows.length) cur = rows.length - 1; if (!rows[cur] || rows[cur].tid !== oldCur) { curId = rows[cur] ? rows[cur].tid : ''; } paint(); if (curId !== oldCur) focusPane();
      const p = { ids, body, label: labelOf(ids, body), timer: 0, done(res, err) {
        if (!root.isConnected) return; hideToast(p);
        if (err) { restore(); msgToast(T('Lỗi: {e}', { e: err.message }), () => enqueue(ids, body)); return; }
        ids.forEach(x => drafts.delete(x));
        const m = res.reduce((n, x) => n + (x.mailed || 0), 0), fx = res.reduce((n, x) => n + (x.dups || 0), 0);
        if (body.status === 'fixed' || body.reply != null || body.tpl) msgToast(T('Đã báo người dùng trong app') + (m ? ' · ' + T('{n} thư', { n: m }) : '') + (fx ? ' · ' + T('kèm {n} phiếu trùng', { n: fx }) : ''));
        if (!pending.length) load(true, true);
        if (dr && curId && ids.includes(curId)) drawer(curId);
      } };
      const restore = () => { const back = snap.filter(s => !rows.some(r => r.tid === s.r.tid)).sort((a, b) => a.i - b.i); back.forEach(s => rows.splice(Math.min(s.i, rows.length), 0, s.r)); snap.forEach(s => { const r = rows.find(x => x.tid === s.r.tid); if (r) r.status = s.r.status; }); if (back.length) { cur = rows.findIndex(r => r.tid === back[0].r.tid); curId = back[0].r.tid; focusPane(); } paint(); };
      p.undo = restore; p.timer = setTimeout(() => commit(p), UNDO_MS); pending.push(p); showToast(p);
    }
    const undoLast = () => { const p = pending.pop(); if (!p) return; clearTimeout(p.timer); p.undo(); hideToast(p); if (pending.length) showToast(pending[pending.length - 1]); else msgToast(T('Đã hoàn tác')); };
    function toastBox() { if (!toastEl || !toastEl.isConnected) { toastEl = document.createElement('div'); toastEl.className = 'rp-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); } return toastEl; }
    function showToast(p) { clearTimeout(toastT); const b = toastBox(); b.dataset.p = '1'; b._p = p; b.innerHTML = `<span>${esc(p.label)}</span><button type="button" class="rp-undo">${T('Hoàn tác')} <kbd>u</kbd></button><i class="rp-tbar" style="animation-duration:${UNDO_MS}ms"></i>`; b.querySelector('.rp-undo').onclick = undoLast; }
    function hideToast(p) { if (toastEl && toastEl._p === p) { toastEl.remove(); toastEl = null; } }
    function msgToast(m, retry) { if (pending.length) return; clearTimeout(toastT); const b = toastBox(); b._p = null; b.innerHTML = `<span>${esc(m)}</span>${retry ? `<button type="button" class="rp-undo">${T('Thử lại')}</button>` : ''}`; if (retry) b.querySelector('button').onclick = () => { b.remove(); retry(); }; toastT = setTimeout(() => { if (b._p == null) b.remove(); }, retry ? 8000 : 3200); }
    const doAct = (name, ids = targets()) => { if (!ids.length) return;
      const B = { fix: { status: 'fixed', tpl: 'fixed' }, thanks: { tpl: 'thanks' }, prog: { status: 'prog', tpl: 'prog' }, more: { tpl: 'more' } }[name] || { status: name };
      const body = { ...B }; if ((name === 'thanks' || name === 'more') && rows.some(r => ids.includes(r.tid) && r.status === 'new')) body.status = 'ack'; enqueue(ids, body); };
    const bulk = () => {
      root.classList.toggle('has-bulk', sel.size > 0); if (!sel.size) { $('#rpBulk').innerHTML = ''; return; }
      const ids = [...sel];
      $('#rpBulk').innerHTML = `<div class="u-bulk rp-bulk"><div class="u-bulk-n"><b>${T('{n} đã chọn', { n: ids.length })}</b><button type="button" class="linkbtn" id="rpAll">${T('Chọn tất cả')}</button></div><div class="u-bulk-acts"><button type="button" class="btn sm" data-b="fix">${T('Đã sửa')}</button><button type="button" class="btn sm" data-b="thanks">${T('Cảm ơn')}</button><button type="button" class="btn sm" data-b="prog">${T('Đang xử lý')}</button><button type="button" class="btn sm" data-b="wontfix">${T('Không sửa')}</button>${ids.length > 1 ? `<span class="rp-mg"><select id="rpInto" aria-label="${T('Gộp {n} mục đã chọn vào…', { n: ids.length })}">${ids.map(i => `<option>${esc(i)}</option>`).join('')}</select><button type="button" class="btn sm" id="rpMg">${T('Gộp')}</button></span>` : ''}</div><button type="button" class="btn sm" id="rpClr">${T('Bỏ chọn')}</button></div>`;
      $('#rpClr').onclick = () => { sel.clear(); paint(); }; $('#rpAll').onclick = () => { rows.forEach(r => sel.add(r.tid)); paint(); };
      $('#rpBulk').querySelectorAll('[data-b]').forEach(b => b.onclick = () => doAct(b.dataset.b, [...sel]));
      const mg = $('#rpMg'); if (mg) mg.onclick = async () => { const into = $('#rpInto').value, from = ids.filter(i => i !== into); if (!confirm(T('Gộp {a} vào {b}? Người báo (nếu đồng ý nhận thư) sẽ được báo là trùng lặp.', { a: from.join(', '), b: into }))) return; try { await api('merge', { ids: from, into }); sel.clear(); load(); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    };
    const paint = () => {
      const anyF = filterN() || F.q;
      $('#rpList').innerHTML = rows.length ? rows.map(rowHtml).join('') : `<div class="rp-empty"><p class="muted small">${T('Không có báo lỗi nào khớp bộ lọc.')}</p>${anyF ? `<button type="button" class="btn ghost sm" id="rpEmptyClr">${T('Xóa bộ lọc')}</button>` : ''}</div>`;
      const ec = $('#rpEmptyClr'); if (ec) ec.onclick = clearFilters;
      const total = data ? data.total : rows.length;
      $('#rpMore').innerHTML = rows.length < total ? `<button class="btn ghost sm" id="rpMoreB">${T('Xem thêm')} (${num(rows.length)}/${num(total)})</button>` : `<p class="small muted">${T('{n} báo lỗi', { n: num(total) })}</p>`;
      const mb = $('#rpMoreB'); if (mb) mb.onclick = () => { F.offset = rows.length; load(true); };
      $('#rpList').querySelectorAll('[data-sel]').forEach(c => { c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); c.closest('.rp-row').classList.toggle('sel', c.checked); bulk(); }; });
      $('#rpList').querySelectorAll('.rp-open').forEach(b => { b.onclick = () => { const i = rows.findIndex(r => r.tid === b.dataset.id); setCur(i, false); drawer(b.dataset.id, { focus: true }); }; });
      $('#rpList').querySelectorAll('.rp-row').forEach(el => { el.querySelectorAll('[data-do]').forEach(b => { b.onclick = () => doAct(b.dataset.do, [el.dataset.rid]); }); });
      $('#rpLhN').textContent = T('{n} báo lỗi', { n: num(total) }); $('#rpLhS').textContent = $('#rpSort').selectedOptions && $('#rpSort').selectedOptions[0] ? $('#rpSort').selectedOptions[0].textContent : '';
      const ac = $('#rpAllC'); ac.checked = rows.length > 0 && sel.size === rows.length; ac.indeterminate = sel.size > 0 && sel.size < rows.length; ac.onchange = () => { if (ac.checked) rows.forEach(r => sel.add(r.tid)); else sel.clear(); paint(); };
      bulk();
    };
    function setCur(i, scroll = true) {
      if (!rows.length) { cur = -1; curId = ''; return; } cur = Math.max(0, Math.min(rows.length - 1, i)); curId = rows[cur].tid;
      main.querySelectorAll('.rp-row.cur').forEach(x => x.classList.remove('cur'));
      const el = main.querySelector(`.rp-row[data-i="${cur}"]`); if (el) { el.classList.add('cur'); if (scroll && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
    }
    let paneT; const focusPane = () => { if (!wide()) return; clearTimeout(paneT); paneT = setTimeout(() => { if (curId) drawer(curId); else closeDr(); }, 140); };
    async function load(more, keep) {
      if (pending.length) await flushAll(); // đổi bộ lọc khi còn lệnh chờ → gửi trước, không để danh sách cũ đè trạng thái mới
      if (!more) F.offset = 0; if (keep) F.offset = 0;
      const n = ++loadN;
      try {
        const j = await api('list', { ...F, status: F.spam ? '' : F.status, limit: keep ? Math.max(50, Math.min(200, rows.length || 50)) : 50 }); if (n !== loadN || !root.isConnected) return;
        data = j; rows = more && !keep ? rows.concat(j.rows) : j.rows; chips();
        const at = curId ? rows.findIndex(r => r.tid === curId) : -1; cur = at >= 0 ? at : rows.length ? Math.min(Math.max(cur, 0), rows.length - 1) : -1; const prev = curId; curId = rows[cur] ? rows[cur].tid : '';
        paint(); if (holdPane) holdPane = false; else if (curId && curId !== prev) focusPane(); else if (!curId && dr && wide()) closeDr();
      } catch (e) { if (root.isConnected) $('#rpList').innerHTML = `<p class="small bad-t">${esc(T('Lỗi: {e}', { e: e.message }))}</p>`; }
    }
    function clearFilters() { Object.assign(F, { area: '', cat: '', plat: '', sev: '', sandbox: 0, q: '' }); ['#rpArea', '#rpCat', '#rpPlat', '#rpSev', '#rpQ'].forEach(s => { $(s).value = ''; }); $('#rpSb').checked = false; load(); }
    $('#rpFClr').onclick = clearFilters;
    let tq; $('#rpQ').oninput = () => { clearTimeout(tq); tq = setTimeout(() => { F.q = $('#rpQ').value.trim(); load(); }, 300); };
    $('#rpArea').onchange = e => { F.area = e.target.value; load(); }; $('#rpCat').onchange = e => { F.cat = e.target.value; load(); }; $('#rpPlat').onchange = e => { F.plat = e.target.value; load(); };
    $('#rpSort').onchange = e => { F.sort = e.target.value; load(); }; $('#rpSb').onchange = e => { F.sandbox = e.target.checked ? 1 : 0; load(); }; $('#rpRe').onclick = () => { closePops(); load(); };
    $('#rpCsv').onclick = async () => { try { const j = await api('export', { ...F, status: F.spam ? '' : F.status }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + j.csv], { type: 'text/csv;charset=utf-8' })); a.download = `lexkite-reports-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    api('cfg').then(c => { if (!root.isConnected) return; $('#rpMode').value = c.notify; if (c.eta) { $('#rpE1').value = c.eta.serious; $('#rpE2').value = c.eta.normal; $('#rpE3').value = c.eta.content; } }).catch(() => {});
    $('#rpEs').onclick = async () => { try { await api('cfg', { eta: { serious: +$('#rpE1').value, normal: +$('#rpE2').value, content: +$('#rpE3').value } }); $('#rpEs').textContent = T('✓ Đã lưu'); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    $('#rpSev').onchange = e => { F.sev = e.target.value; load(); };
    $('#rpMode').onchange = async e => { try { await api('cfg', { notify: e.target.value }); } catch (x) { alert(T('Lỗi: {e}', { e: x.message })); } };

    // ---------- Phím tắt ----------
    function help() {
      const d = document.createElement('dialog'); d.className = 'rp-keys'; d.setAttribute('aria-label', T('Phím tắt'));
      d.innerHTML = `<div class="rp-head"><h3>${T('Phím tắt')}</h3><button type="button" class="btn ghost sm" id="rpKx" aria-label="${T('Đóng')}">${ICON.x}</button></div><dl>${KEYS.map(([k, l]) => `<dt>${k.map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</dt><dd>${esc(T(l))}</dd>`).join('')}</dl>`;
      document.body.appendChild(d); const end = () => { if (d.close && d.open) d.close(); d.remove(); }; d.querySelector('#rpKx').onclick = end; d.addEventListener('cancel', e => { e.preventDefault(); end(); }); d.addEventListener('keydown', e => { if (e.key === 'Escape') end(); });
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    }
    $('#rpHelp').onclick = help;
    const typing = e => { const x = e.target; return !!(x && x.matches && x.matches('input:not([type=checkbox]),textarea,select,[contenteditable="true"],[contenteditable=""]')); };
    const ST_KEYS = { 1: 'new', 2: 'ack', 3: 'prog', 4: 'fixed', 5: 'wontfix' };
    const onKey = e => {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { if (typing(e)) { e.target.blur(); return; } if (!$('#rpFP').hidden || !$('#rpMP').hidden) { closePops(); return; } if (sel.size) { sel.clear(); paint(); } return; }
      if (typing(e) || (dr && !wide())) return;
      const k = e.key, act = fn => { e.preventDefault(); fn(); };
      if (k === 'Enter' && e.target.closest && e.target.closest('button,a,summary,label')) return; // Enter trên nút/liên kết: để nút tự chạy
      if (k === 'j' || k === 'ArrowDown') act(() => { setCur(cur + 1); focusPane(); });
      else if (k === 'k' || k === 'ArrowUp') act(() => { setCur(cur - 1); focusPane(); });
      else if (k === 'J' || k === 'K') act(() => { if (rows[cur]) sel.add(rows[cur].tid); setCur(cur + (k === 'J' ? 1 : -1)); if (rows[cur]) sel.add(rows[cur].tid); paint(); focusPane(); });
      else if (k === '/') act(() => $('#rpQ').focus());
      else if (k === '?') act(help);
      else if (k === 'u') act(undoLast);
      else if (k === 'x') act(() => { const r = rows[cur]; if (r) { sel.has(r.tid) ? sel.delete(r.tid) : sel.add(r.tid); paint(); } });
      else if (k === 'X') act(() => { if (sel.size === rows.length) sel.clear(); else rows.forEach(r => sel.add(r.tid)); paint(); });
      else if ((k === 'Enter' || k === 'o') && rows[cur]) act(() => drawer(rows[cur].tid, { focus: true }));
      else if (k === 'f') act(() => doAct('fix'));
      else if (k === 't') act(() => doAct('thanks'));
      else if (k === 'm') act(() => doAct('more'));
      else if (k === 'r' && rows[cur]) act(() => drawer(rows[cur].tid, { reply: true }));
      else if (ST_KEYS[k]) act(() => { if (k === '3') doAct('prog'); else if (k === '4') doAct('fix'); else doAct(ST_KEYS[k]); });
    };
    document.addEventListener('keydown', onKey);

    // ---------- Bảng chi tiết: bên cạnh danh sách (màn rộng) · ngăn trượt che trang (màn hẹp) ----------
    let dr = null, dim = null, back = null, drGen = 0;
    const paneEl = $('#rpPane');
    const closeDr = () => { if (!dr) return; if (dr === paneEl) { dr.hidden = true; dr.innerHTML = ''; dr = null; return; } dr.remove(); if (dim) dim.remove(); dr = dim = null; document.removeEventListener('keydown', esck); if (back && back.isConnected) back.focus(); };
    const esck = e => { if (e.key === 'Escape') closeDr(); };
    async function drawer(id, opt = {}) {
      const gen = ++drGen, inline = wide();
      if (inline) { if (dr && dr !== paneEl) closeDr(); dr = paneEl; dr.hidden = false; dr.className = 'rp-pane rp-dr'; dr.setAttribute('aria-label', id); }
      else {
        closeDr(); back = document.activeElement;
        dim = document.createElement('div'); dim.className = 'rp-dim'; dim.onclick = closeDr;
        dr = document.createElement('aside'); dr.className = 'rp-dr'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', id); dr.tabIndex = -1;
        dr.innerHTML = `<p class="muted small">${T('Đang tải…')}</p>`;
        document.body.append(dim, dr); document.addEventListener('keydown', esck); dr.focus();
      }
      const box = dr;
      let r; try { r = await api('get', { id }); } catch (e) { if (gen !== drGen) return; box.innerHTML = `<p class="bad-t">${esc(T('Lỗi: {e}', { e: e.message }))}</p><button class="btn ghost" id="rpX">${T('Đóng')}</button>`; box.querySelector('#rpX').onclick = closeDr; return; }
      if (gen !== drGen || dr !== box) return;
      const c = r.ctx || {}, kv = (k, v) => v ? `<dt>${T(k)}</dt><dd>${v}</dd>` : '', tpls = r.tpl || {}, tplVi = r.tpl_vi || {};
      const page = c.route ? `<a href="/app/#/${esc(c.route)}" target="_blank" rel="noopener">#/${esc(c.route)}</a>` : '';
      const draft = drafts.get(r.tid), isIdea = r.cat === 'idea';
      box.innerHTML = `<div class="rp-head"><h3><span class="rp-tid">${esc(r.tid)}</span> ${sevChip(r.sev)} <span class="rp-st ${esc(r.status)}">${esc(stName(r.status))}</span></h3><button class="btn ghost sm rp-x" id="rpX" aria-label="${T('Đóng')}">${ICON.x}</button></div>
        <div><h4>${esc(T((CATS[r.cat] || ['', r.cat])[1]))} · ${esc(T(AREAS[r.area] || r.area || ''))} · ${esc(when(r.at))}</h4><div class="msg">${esc(r.msg)}</div>
          ${r.dup ? `<p class="small">${esc(T('Trùng với {id}', { id: r.dup }))}</p>` : ''}${r.dups && r.dups.length ? `<p class="small">${esc(T('Các mục trùng: {ids}', { ids: r.dups.join(', ') }))}</p>` : ''}</div>
        <div class="rp-ai"><h4 style="margin:0">${r.ai && r.ai.by === 'rules' ? T('Phân loại theo luật (AI không sẵn sàng)') : T('Phân loại AI')} ${r.people > 1 ? `· ${esc(T('{n} người gặp', { n: r.people }))}` : ''}</h4>
          ${r.ai ? `<p><b>${esc(r.ai.summary_vi || '')}</b></p><p class="small">${sevChip(r.ai.severity)} ${esc(r.ai.area || '')} · ${esc(r.ai.type || '')} · ${esc(T('Độ tin cậy {p}%', { p: Math.round((r.ai.confidence || 0) * 100) }))}${r.ai.needs_human ? ' · ' + esc(T('Cần người duyệt')) : ''}</p>
          ${r.ai.likely_cause ? `<p><b>${T('Nguyên nhân có thể')}:</b> ${esc(r.ai.likely_cause)}</p>` : ''}${r.ai.suggested_fix ? `<p><b>${T('Đề xuất sửa')}:</b> ${esc(r.ai.suggested_fix)}</p>` : ''}${r.ai.duplicate_of ? `<p class="small">${esc(T('AI gợi ý trùng với {id}', { id: r.ai.duplicate_of }))}</p>` : ''}` : `<p class="small muted">${T('Chưa phân loại')}</p>`}
          <div class="rp-tools"><button class="btn ghost sm" id="rpRt">${T('AI phân loại lại')}</button>${r.issue ? `<a class="btn ghost sm" href="${esc(r.issue)}" target="_blank" rel="noopener">${T('Issue GitHub ↗')}</a>` : isIdea ? '' : `<button class="btn ghost sm" id="rpCc">${T('Giao Claude Code')}</button>`}</div>
          ${!r.gh && !r.issue && !isIdea ? `<p class="rp-warn">${T('Chưa đặt GH_ISSUES_TOKEN: Cloudflare Pages → Settings → Variables → thêm secret GH_ISSUES_TOKEN (PAT fine-grained, repo lexkiteapp.github.io, quyền Issues: Read & write) rồi triển khai lại.')}</p>` : ''}
          ${isIdea ? `<p class="rp-warn">${T('Đề xuất chỉ giao Claude Code sau khi Duyệt.')}</p><div class="rp-tools"><button class="btn primary sm" data-idea="approve">${T('Duyệt')}</button><button class="btn ghost sm" data-idea="reject">${T('Từ chối')}</button><button class="btn ghost sm" data-idea="later">${T('Để sau')}</button></div>` : ''}</div>
        <div class="rp-compose"><label for="rpReply"><h4>${T('Phản hồi cho người báo (họ thấy trong trang trạng thái)')}</h4></label>
          ${isIdea ? '' : `<div class="rp-tpls" role="group" aria-label="${T('Mẫu trả lời')}">${TPLS.map(([k, l]) => `<button type="button" class="rp-chip" data-tpl="${k}">${esc(T(l))}</button>`).join('')}</div>`}
          <textarea id="rpReply" maxlength="2000">${esc(draft != null ? draft : r.reply || '')}</textarea>
          <p class="small muted" id="rpTo">${esc(T('Gửi bằng ngôn ngữ của người báo: {l}', { l: r.lang || 'en' }))} · ${esc(T('báo trong app'))}${r.notify ? ' · ' + esc(T('thư')) : ''}${r.seen_at && r.seen_at >= r.upd ? ' · ' + esc(T('người dùng đã xem')) : ''}</p>
          <p class="small muted" id="rpViHint" hidden></p>
          <div class="rp-tools">${isIdea || r.status === 'fixed' ? '' : `<button class="btn primary sm" id="rpFix">${T('Đánh dấu đã sửa và báo')}</button>`}<button class="btn ghost sm" id="rpReplyB">${T('Gửi trả lời')}</button></div></div>
        <div><h4>${T('Trạng thái')}</h4><div class="rp-sts">${STS.map(([k, l]) => `<button type="button" class="rp-chip" data-set="${k}" aria-pressed="${r.status === k}">${esc(T(l))}</button>`).join('')}</div></div>
        <div><h4>${T('Ngữ cảnh')}</h4><dl class="rp-kv">${kv('Trang', page)}${kv('Mã nội dung', esc(c.cid))}${kv('Tên miền (add-on)', esc(c.dom))}${kv('Nền tảng', esc(PLATS[r.plat] || r.plat))}${kv('Phiên bản', esc(r.ver))}${kv('Ngôn ngữ', esc(r.lang))}${kv('Khung nhìn', esc(c.vw ? c.vw + (c.dpr ? ' @' + c.dpr + 'x' : '') : ''))}${kv('Múi giờ', esc(c.tz))}${kv('Trình duyệt', esc(c.ua))}${kv('Đăng nhập', T(r.signed ? 'có' : 'không'))}${r.sandbox ? kv('Thử nghiệm (sandbox)', T('có')) : ''}${kv('Email người báo', r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a> ${T(r.notify ? '(đồng ý nhận cập nhật)' : '(không nhận thư)')}` : '')}</dl></div>
        <div><h4>${T('Lỗi console ({n})', { n: (r.errs || []).length })}</h4>${(r.errs || []).length ? `<pre class="rp-errs">${esc(r.errs.join('\n'))}</pre>` : `<p class="small muted">${T('Không có lỗi console.')}</p>`}</div>
        ${r.has_shot ? `<div class="rp-shot"><h4>${T('Ảnh chụp màn hình')}</h4><button class="btn ghost sm" id="rpShot">${T('Xem ảnh')}</button></div>` : ''}
        <div><label for="rpNote"><h4>${T('Ghi chú nội bộ (chỉ quản trị thấy)')}</h4></label><textarea id="rpNote" maxlength="2000">${esc(r.note || '')}</textarea><button class="btn ghost sm" id="rpNoteB" style="margin-top:.4rem">${T('Lưu ghi chú')}</button></div>
        <div class="rp-tools"><label class="small">${T('Giao cho')} <select id="rpAsg"><option value="">${T('— chưa giao —')}</option>${(data && data.admins || []).map(a => `<option${a === r.asg ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
          <input id="rpInto2" placeholder="LX-…" aria-label="${T('Gộp vào mã (LX-…)')}" size="9"><button class="btn ghost sm" id="rpMg2">${T('Gộp')}</button>
          <button class="btn ghost sm" id="rpSpam">${r.spam ? T('Không phải spam') : T('Đánh dấu spam')}</button></div>
        <p class="small" id="rpMsg" role="status"></p>
        <div><h4>${T('Lịch sử')}</h4><ul class="rp-ev">${(r.events || []).map(e => `<li>${esc(when(e.at))} · ${esc(String(e.by || '').split('@')[0])} · ${esc(T(ACTS[e.act] || e.act))}${e.note ? ' – ' + esc(e.note) : ''}</li>`).join('')}</ul></div>`;
      const q = s => box.querySelector(s), msg = (m, ok = true) => { q('#rpMsg').textContent = m; q('#rpMsg').className = 'small ' + (ok ? 'good-t' : 'bad-t'); };
      const run = async (op, body, reopen = true) => { try { const j = await api(op, { id: r.tid, ...body }); msg(j.mailed ? T('✓ Đã lưu · đã gửi thư cho người báo') : T('✓ Đã lưu')); load(true, true); if (reopen) setTimeout(() => { if (dr === box) drawer(r.tid); }, 500); } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); } };
      q('#rpX').onclick = () => { closeDr(); if (inline) drGen++; };
      q('#rpRt').onclick = () => run('retriage', {});
      const cc = q('#rpCc'); if (cc) cc.onclick = () => run('claude', {});
      box.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { if (b.dataset.idea === 'approve' && !confirm(T('Duyệt đề xuất này? Sẽ tạo Issue "feature-approved" (xếp sau mọi lỗi đang mở).'))) return; run('idea', { decision: b.dataset.idea, reply: q('#rpReply').value.trim() || undefined }); });
      box.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { if (b.dataset.set === 'dup') return run('set', { status: 'dup' }); enqueue([r.tid], { status: b.dataset.set }); });
      // Mẫu: điền chữ đúng ngôn ngữ người báo vào ô (sửa được trước khi gửi); người soạn đọc được bản tiếng Việt ngay dưới. Gửi kèm trạng thái đi cùng mẫu.
      let picked = '', pickedText = '';
      const ta = q('#rpReply'); ta.oninput = () => { drafts.set(r.tid, ta.value); };
      box.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => { picked = b.dataset.tpl; pickedText = tpls[picked] || tplVi[picked] || ''; ta.value = pickedText; drafts.set(r.tid, ta.value); box.querySelectorAll('[data-tpl]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const h = q('#rpViHint'); h.hidden = (r.lang || 'vi') === 'vi' || !tplVi[picked]; h.textContent = h.hidden ? '' : T('Nghĩa: {t}', { t: tplVi[picked] }); ta.focus(); });
      // Chưa sửa chữ mẫu → gửi theo khóa mẫu; đã sửa → gửi đúng chữ anh soạn
      const payload = () => { const v = ta.value.trim(); return picked && v === pickedText.trim() ? { tpl: picked } : { reply: v }; };
      q('#rpReplyB').onclick = () => { const p = payload(), st = picked ? TPL_ST[picked] : null; const body = { ...p, ...(st && !(st === 'ack' && r.status !== 'new') && st !== r.status ? { status: st } : {}) }; if (!p.tpl && !p.reply && r.reply == null) return; enqueue([r.tid], body); };
      const fx = q('#rpFix'); if (fx) fx.onclick = () => { const v = ta.value.trim(), keep = v && v !== (r.reply || '').trim(); enqueue([r.tid], { status: 'fixed', ...(keep ? payload() : { tpl: 'fixed' }) }); };
      q('#rpNoteB').onclick = () => run('set', { note: q('#rpNote').value.trim() }, false);
      q('#rpAsg').onchange = e => run('set', { asg: e.target.value }, false);
      q('#rpSpam').onclick = () => run('spam', { spam: !r.spam });
      q('#rpMg2').onclick = async () => { const into = q('#rpInto2').value.trim().toUpperCase(); if (!/^LX-\d+$/.test(into)) return; if (!confirm(T('Gộp {a} vào {b}? Người báo (nếu đồng ý nhận thư) sẽ được báo là trùng lặp.', { a: r.tid, b: into }))) return; try { await api('merge', { ids: [r.tid], into }); load(); drawer(r.tid); } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); } };
      const sb = q('#rpShot'); if (sb) sb.onclick = async () => { sb.disabled = true; try { const j = await api('shot', { id: r.tid }), src = /^\/api\/report-shot\?id=\d+&e=\d+&s=[0-9a-f]{32}$/.test(j.url || '') ? j.url : /^data:image\/(jpeg|webp|png);base64,/.test(j.data || '') ? j.data : ''; if (src) { const img = new Image(); img.alt = T('Ảnh chụp màn hình'); img.referrerPolicy = 'no-referrer'; img.src = src; sb.replaceWith(img); } /* R2: URL ký 5 phút · D1 cũ: data URL */ } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); sb.disabled = false; } };
      if (opt.reply) ta.focus();
      else if (opt.focus && !inline) (box.querySelector('#rpX') || box).focus();
    }
    if (wideQ && wideQ.addEventListener) { const onW = () => { if (!root.isConnected) { wideQ.removeEventListener('change', onW); return; } if (dr) closeDr(); if (wide() && curId) drawer(curId); }; wideQ.addEventListener('change', onW); }
    const open = new URLSearchParams(location.search).get('r'), deep = /^\d{1,9}$/.test(open || ''); holdPane = deep;
    load(); if (deep) drawer('LX-' + (1000 + +open)); // liên kết từ thư báo quản trị
  }

  // ---------- Thẻ chất lượng ----------
  async function card(el, L, o) {
    style(); lang = o.lang || lang; const esc = o.esc, num = o.num || (n => n);
    el.className = 'card rp-card'; el.innerHTML = `<p class="muted small">${T('Đang tải…')}</p>`;
    let s; try { s = await api('stats'); } catch (e) { el.remove(); return; }
    const h = s.medianFixH, fix = h == null ? T('chưa có') : h < 48 ? T('{h} giờ', { h }) : T('{d} ngày', { d: Math.round(h / 24 * 10) / 10 });
    const m7 = Math.max(1, ...s.days7.map(d => d.n)), mA = Math.max(1, ...s.byArea.map(a => a.n));
    el.innerHTML = `<div class="rp-head"><h3>${T('🐞 Báo lỗi người dùng – chất lượng')}</h3><a href="#reports" class="small">${T('Mở hộp báo lỗi →')}</a></div>
      <div class="rp-kpis" style="margin-top:.6rem"><div class="card kpi"><div class="l">${T('Đang mở')}</div><div class="v">${num(s.open)}</div><div class="s">${STS.slice(0, 3).map(([k, l]) => `${esc(T(l))} ${num(s.byStatus[k] || 0)}`).join(' · ')}</div></div>
        <div class="card kpi"><div class="l">${T('Thời gian sửa (trung vị, 90 ngày)')}</div><div class="v">${esc(fix)}</div><div class="s">n = ${num(s.fixedN)}</div></div>
        ${s.shots ? `<div class="card kpi"><div class="l">${T('Ảnh chụp trên R2')}</div><div class="v">${esc(mb(s.shots.bytes))}</div><div class="s">${esc(T('{p}% của 10 GB miễn phí · {n} ảnh', { p: s.shots.pct, n: num(s.shots.n) }))}${s.shots.d1 ? ' · ' + esc(T('{n} ảnh còn ở D1', { n: num(s.shots.d1) })) : ''}</div></div>` : ''}
        <div class="card kpi"><div class="l">${T('Theo trạng thái')}</div><div class="s">${STS.map(([k, l]) => `<span class="rp-st ${k}">${esc(T(l))} ${num(s.byStatus[k] || 0)}</span>`).join(' ')}</div></div></div>
      <div class="rp-kpis" style="margin-top:.6rem"><div><h4 style="margin:.2rem 0 .4rem">${T('7 ngày qua')}</h4><div class="bars" role="img" aria-label="${esc(s.days7.map(d => d.day + ': ' + d.n).join(', '))}">${s.days7.map(d => `<div title="${esc(d.day)}: ${d.n} ${T('mới')} · ${d.fixed} ${T('đã sửa')}"><i style="height:${Math.max(3, d.n / m7 * 100)}%"></i><small>${esc(d.day.slice(8))}</small></div>`).join('')}</div></div>
        <div><h4 style="margin:.2rem 0 .4rem">${T('Theo khu vực (30 ngày)')}</h4>${s.byArea.length ? s.byArea.slice(0, 8).map(a => `<div class="rp-hbar"><span>${esc(T(AREAS[a.area] || a.area))}</span><span class="b"><i style="width:${a.n / mA * 100}%"></i></span><span>${num(a.n)}</span></div>`).join('') : `<p class="small muted">${T('chưa có')}</p>`}</div></div>`;
    el.querySelector('a[href="#reports"]').onclick = e => { e.preventDefault(); const b = document.querySelector('#tabs [data-tab="reports"]'); if (b) b.click(); };
    api('cfg').then(c => { const x = document.createElement('div'), list = checks(c), miss = list.filter(i => !i.ok).length; x.className = 'rp-setup';
      x.innerHTML = `<h4 style="margin:.8rem 0 .4rem">${T('Cài đặt & bí mật')} · ${miss ? `<span class="rp-warn" style="display:inline">${T('Thiếu')} ${num(miss)}</span>` : T('Đủ')}</h4><ul class="small" style="margin:0;padding-inline-start:1.1rem">${list.map(i => `<li>${i.ok ? '✅' : '⚠️'} ${esc(T(i.label))}${i.ok ? '' : ` – <span class="muted">${esc(T(i.fix))}</span>`}</li>`).join('')}</ul>`;
      el.appendChild(x); }).catch(() => {});
  }
  const mb = b => (b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(2) + ' GB' : (b / 1024 ** 2).toFixed(1) + ' MB');
  // Thẻ Chất lượng › Cài đặt & bí mật (thuần – test): cờ từ op cfg, không giá trị bí mật. Bí mật chỉ chủ app nhập (docs/REPORTS.md § Biến môi trường).
  function checks(c) {
    c = c || {};
    return [
      { k: 'ai', ok: !!c.ai, label: 'AI phân loại', fix: 'Pages: binding AI hoặc secret CF_AI_TOKEN + CF_ACCOUNT_ID' },
      { k: 'gh', ok: !!c.gh, label: 'GitHub Issue cho Claude Code', fix: 'Pages: secret GH_ISSUES_TOKEN (PAT, Issues: Read & write)' },
      { k: 'cli', ok: !!c.cli, label: 'Tự động theo PR (LX-xxxx)', fix: 'Pages + GitHub Actions: secret LEXKITE_REPORT_CLI_KEY (≥ 32 ký tự, cùng giá trị)' },
      { k: 'mail', ok: c.mail_st === 'ok', label: 'Thư cho người báo', fix: { 'no-key': 'Worker lexkite-mail: secret RESEND_API_KEY hoặc BREVO_API_KEY', 'no-binding': 'Pages: service binding MAIL → lexkite-mail', failing: 'Gửi thư đang lỗi – xem lịch sử phiếu' }[c.mail_st] || 'Chưa gửi thư nào – chưa biết' },
      { k: 'r2', ok: !!c.r2 && !!c.shot_sign, label: 'Ảnh chụp trên R2', fix: !c.r2 ? 'Pages: binding R2 REPORT_SHOTS → bucket lexkite-report-shots (wrangler.toml)' : 'Pages: secret REPORT_SHOT_KEY (hoặc LEXKITE_REPORT_CLI_KEY) để ký URL xem ảnh' },
      { k: 'push', ok: c.push === 'ok', label: 'Báo đẩy "đã sửa"', fix: c.push === 'off' ? 'Pages: biến PUSH_PCT > 0 hoặc FCM_ON = 1' : 'Pages: secret D1B_ACCOUNT_ID + D1B_TOKEN (D1 nội bộ)' },
    ];
  }

  window.AdminReports = { render, card, _t: { T, EN, checks } };
})();
