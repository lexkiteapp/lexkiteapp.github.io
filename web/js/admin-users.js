/* Quản trị → "Người dùng" (tải lười từ admin.js): bảng chuyên sâu kiểu Stripe/Linear.
 *   AdminUsers.render(main, ctx) – ctx = tiện ích của admin.js (api, L, esc, num, rel, tile, spark, confirmDlg, modal, toast, userDialog…).
 * - Chọn hàng loạt: ô chọn từng dòng, chọn cả trang, shift-click chọn dải, "chọn cả N theo bộ lọc" (máy chủ tự tính lại).
 * - Thanh thao tác nổi: gắn/gỡ nhãn, cấp/gỡ quyền AI, gửi thông báo, xuất CSV, khóa/mở, xóa mềm (thùng rác 30 ngày), khôi phục, xóa vĩnh viễn.
 *   Mọi thao tác chạy ở /api/admin op usersBulk (kiểm quyền, giới hạn tốc độ, ghi admin_log); nguy hiểm → gõ đúng số người; có Hoàn tác.
 * - Bảng: sắp xếp theo cột, chọn cột, lọc nhiều điều kiện, chế độ xem đã lưu (máy này), tìm tức thì, cỡ trang, phím tắt (?).
 * - Trực quan: KPI + đường mini, đăng ký 90 ngày, giữ chân theo nhóm tuần, phễu kích hoạt, huy hiệu trạng thái.
 * - PII: chế độ riêng tư che email/tên khi chia sẻ màn hình; CSV chặn công thức; không đưa dữ liệu cá nhân lên URL. Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    'Chọn tất cả trên trang': 'Select all on this page', 'Chọn {e}': 'Select {e}', 'Đã chọn {n}': ['{n} selected', '{n} selected'],
    'Đã chọn {n} người trên trang này.': ['{n} user on this page is selected.', 'All {n} users on this page are selected.'], 'Chọn cả {n} người khớp bộ lọc': 'Select all {n} matching users',
    'Đã chọn cả {n} người khớp bộ lọc.': 'All {n} matching users are selected.', 'Bỏ chọn': 'Clear selection', 'Gắn nhãn': 'Add tag', 'Gỡ nhãn': 'Remove tag',
    'Cấp quyền AI': 'Grant AI', 'Gỡ quyền AI': 'Revoke AI', 'Khóa': 'Block', 'Mở khóa': 'Unblock', 'Xóa': 'Delete', 'Khôi phục': 'Restore', 'Xóa vĩnh viễn': 'Delete forever',
    'Gửi thông báo': 'Send notice', 'Xuất CSV': 'Export CSV', 'Thao tác hàng loạt': 'Bulk actions', 'Hoàn tác': 'Undo', 'Đã hoàn tác': 'Undone',
    'Nhãn': 'Tag', 'Tên nhãn (≤ 30 ký tự)': 'Tag name (≤ 30 characters)', 'Ghi chú (tùy chọn)': 'Note (optional)', 'Áp dụng': 'Apply', 'Hủy': 'Cancel',
    'Gắn nhãn cho {n} người': ['Tag {n} user', 'Tag {n} users'], 'Gỡ nhãn khỏi {n} người': ['Remove a tag from {n} user', 'Remove a tag from {n} users'],
    'Cấp quyền AI không giới hạn cho {n} người?': ['Grant unlimited AI to {n} user?', 'Grant unlimited AI to {n} users?'],
    'Họ không bị giới hạn lượt chấm Viết/Nói và hội thoại AI (bảng quota_allow). Có hiệu lực trong ~1 phút. Thao tác được ghi nhật ký kiểm toán.': 'They get no daily limit on Writing/Speaking grading and AI chat (quota_allow). Takes effect within ~1 minute. The action is written to the audit log.',
    'Gỡ quyền AI của {n} người?': ['Revoke AI for {n} user?', 'Revoke AI for {n} users?'], 'Họ quay về hạn mức miễn phí thường.': 'They go back to the normal free limits.',
    'Khóa đồng bộ {n} người?': ['Block sync for {n} user?', 'Block sync for {n} users?'], 'Tài khoản bị khóa không kéo/đẩy được dữ liệu (403). Tài khoản quản trị luôn được bỏ qua. Có Hoàn tác; thao tác được ghi nhật ký kiểm toán.': 'Blocked accounts cannot pull or push data (403). Admin accounts are always skipped. You can undo; the action is written to the audit log.',
    'Mở khóa {n} người?': ['Unblock {n} user?', 'Unblock {n} users?'],
    'Xóa dữ liệu {n} người dùng?': ['Delete data of {n} user?', 'Delete data of {n} users?'],
    'Xóa mềm: chuyển vào Thùng rác và khóa đồng bộ ngay; khôi phục được trong 30 ngày, sau đó dữ liệu bị xóa vĩnh viễn. Tài khoản quản trị luôn được bỏ qua. Thao tác được ghi nhật ký kiểm toán (ai, lúc nào, bao nhiêu người).': 'Soft delete: moves them to Trash and blocks sync now; restorable for 30 days, then the data is erased for good. Admin accounts are always skipped. The action is written to the audit log (who, when, how many).',
    'Khôi phục {n} người từ Thùng rác?': ['Restore {n} user from Trash?', 'Restore {n} users from Trash?'], 'Mở lại đồng bộ, dữ liệu còn nguyên.': 'Sync is re-enabled; their data is intact.',
    'Xóa vĩnh viễn {n} người?': ['Delete {n} user forever?', 'Delete {n} users forever?'], 'Xóa ngay mọi dữ liệu đồng bộ, bảng xếp hạng, lớp học, lượt đọc thông báo của những người đang ở Thùng rác. Không thể hoàn tác.': 'Erases all synced data, leagues, classes and notice reads of these users in Trash right now. This cannot be undone.',
    'Xuất CSV {n} người?': ['Export {n} user to CSV?', 'Export {n} users to CSV?'], 'Tệp chứa email và tên (dữ liệu cá nhân). Chỉ lưu ở nơi an toàn; lượt xuất được ghi nhật ký kiểm toán.': 'The file contains emails and names (personal data). Store it securely; the export is written to the audit log.',
    'Gửi thông báo tối đa 500 người một lần. Hãy thu hẹp bộ lọc.': 'Notices go to at most 500 users at a time. Narrow the filter.',
    'Đã {a}: {n} người': ['{a}: {n} user', '{a}: {n} users'], '{n} không đổi (đã như vậy)': '{n} unchanged (already so)', '{n} tài khoản quản trị được bỏ qua': '{n} admin accounts skipped',
    'Số người khớp bộ lọc vừa đổi ({n}). Hãy xem lại rồi thử lại.': 'The number of matching users just changed ({n}). Review and try again.', 'Thao tác quá nhanh – chờ một phút.': 'Too many actions – wait a minute.',
    'gắn nhãn': 'tagged', 'gỡ nhãn': 'untagged', 'cấp quyền AI': 'granted AI', 'gỡ quyền AI': 'revoked AI', 'khóa': 'blocked', 'mở khóa': 'unblocked', 'xóa (Thùng rác)': 'moved to Trash', 'khôi phục': 'restored', 'xóa vĩnh viễn': 'deleted forever',
    'Trạng thái': 'Status', 'Hoạt động': 'Active', 'Ngủ đông': 'Dormant', 'Mới': 'New', 'Bị khóa': 'Blocked', 'Chờ xóa': 'Pending deletion', 'AI ∞': 'AI ∞',
    'Cột': 'Columns', 'Cột hiển thị': 'Visible columns', 'Nhãn & huy hiệu': 'Tags & badges', 'Chế độ xem': 'View', 'Lưu chế độ xem…': 'Save view…', 'Xóa chế độ xem này': 'Delete this view',
    'Tên chế độ xem': 'View name', 'Lưu': 'Save', 'Đã lưu chế độ xem': 'View saved', 'Chế độ xem của tôi': 'My views', 'Có sẵn': 'Built-in',
    'Tất cả người dùng': 'All users', 'Mới 7 ngày': 'New (7 days)', 'Có nguy cơ rời bỏ': 'At risk of churn', 'Có quyền AI': 'With AI access', 'Thùng rác': 'Trash',
    'Chế độ riêng tư': 'Privacy mode', 'Che email và tên khi chia sẻ màn hình': 'Hide emails and names while screen sharing',
    'Hoạt động gần nhất@@filter': 'Last active', 'Mọi lúc': 'Any time', 'Trong 24 giờ': 'Within 24 h', 'Trong 7 ngày': 'Within 7 days', 'Trong 30 ngày': 'Within 30 days', 'Im lặng > 30 ngày': 'Silent > 30 days', 'Im lặng > 90 ngày': 'Silent > 90 days',
    'Số lần vào': 'Visits', 'Bất kỳ': 'Any', '≥ {n} lần': '≥ {n} visits', 'Mọi nhãn': 'All tags', 'Quyền': 'Access', 'Mọi quyền': 'Any access', 'Quyền AI ∞': 'Unlimited AI',
    'Chọn tất cả': 'Select all', 'Khóa đồng bộ': 'Sync block', 'Đang khóa': 'Blocked', 'Không khóa': 'Not blocked', 'Mỗi trang': 'Per page',
    'Đăng ký 90 ngày': 'Sign-ups (90 days)', 'người đăng ký mới mỗi ngày (giờ VN)': 'new sign-ups per day (VN time)',
    'Giữ chân theo nhóm tuần đăng ký': 'Retention by sign-up week', 'Tỉ lệ người còn quay lại ít nhất 1 / 7 / 30 ngày sau khi đăng ký.': 'Share of users who came back at least 1 / 7 / 30 days after signing up.',
    'Tuần': 'Week', 'Người': 'Users', 'chưa đủ ngày': 'not yet', 'Phễu kích hoạt': 'Activation funnel', 'Đăng ký': 'Signed up', 'Đồng bộ ≥ 2 lần': 'Synced ≥ 2 times',
    'Quay lại sau 1 ngày': 'Back after 1 day', 'Quay lại sau 7 ngày': 'Back after 7 days', 'Hoạt động 7 ngày qua': 'Active last 7 days', 'Cập nhật {t} · đệm 10 phút': 'Updated {t} · cached 10 min',
    'Phím tắt': 'Keyboard shortcuts', 'Tìm kiếm': 'Search', 'Dòng kế / trước': 'Next / previous row', 'Chọn dòng': 'Select row', 'Mở chi tiết': 'Open details', 'Bỏ chọn / đóng': 'Clear selection / close', 'Chọn cả trang': 'Select page', 'Trang sau / trước': 'Next / previous page', 'Hiện bảng này': 'Show this help',
    'Đóng': 'Close', 'Tài khoản': 'Accounts', 'trong Thùng rác': 'in Trash', 'đang bị khóa': 'blocked', 'Không có người dùng trong Thùng rác': 'Trash is empty', 'Người bị xóa mềm nằm đây 30 ngày trước khi bị xóa vĩnh viễn.': 'Soft-deleted users stay here for 30 days before being erased.',
    'Bỏ lọc': 'Clear filters', 'Không tải được biểu đồ': 'Could not load charts', '{p}% tổng': '{p}% of total', 'Sắp xếp theo {c}': 'Sort by {c}', 'Lỗi: {e}': 'Error: {e}',
  };
  const BULK = { // nhãn nút · câu xác nhận · mô tả · nguy hiểm (gõ số người) · lớp nút · hiện ở thùng rác?
    tagAdd: { b: '🏷️ Gắn nhãn', t: 'Gắn nhãn cho {n} người', ask: 'tag', past: 'gắn nhãn' },
    tagRemove: { b: '🏷️ Gỡ nhãn', t: 'Gỡ nhãn khỏi {n} người', ask: 'tag', past: 'gỡ nhãn' },
    aiGrant: { b: '✨ Cấp quyền AI', t: 'Cấp quyền AI không giới hạn cho {n} người?', d: 'Họ không bị giới hạn lượt chấm Viết/Nói và hội thoại AI (bảng quota_allow). Có hiệu lực trong ~1 phút. Thao tác được ghi nhật ký kiểm toán.', danger: true, ask: 'note', past: 'cấp quyền AI' },
    aiRevoke: { b: 'Gỡ quyền AI', t: 'Gỡ quyền AI của {n} người?', d: 'Họ quay về hạn mức miễn phí thường.', past: 'gỡ quyền AI' },
    block: { b: '⛔ Khóa', t: 'Khóa đồng bộ {n} người?', d: 'Tài khoản bị khóa không kéo/đẩy được dữ liệu (403). Tài khoản quản trị luôn được bỏ qua. Có Hoàn tác; thao tác được ghi nhật ký kiểm toán.', danger: true, past: 'khóa' },
    unblock: { b: '✅ Mở khóa', t: 'Mở khóa {n} người?', past: 'mở khóa' },
    delete: { b: '🗑 Xóa', t: 'Xóa dữ liệu {n} người dùng?', d: 'Xóa mềm: chuyển vào Thùng rác và khóa đồng bộ ngay; khôi phục được trong 30 ngày, sau đó dữ liệu bị xóa vĩnh viễn. Tài khoản quản trị luôn được bỏ qua. Thao tác được ghi nhật ký kiểm toán (ai, lúc nào, bao nhiêu người).', danger: true, cls: 'danger', past: 'xóa (Thùng rác)' },
    restore: { b: '↩ Khôi phục', t: 'Khôi phục {n} người từ Thùng rác?', d: 'Mở lại đồng bộ, dữ liệu còn nguyên.', past: 'khôi phục', trash: 1 },
    purge: { b: '🗑 Xóa vĩnh viễn', t: 'Xóa vĩnh viễn {n} người?', d: 'Xóa ngay mọi dữ liệu đồng bộ, bảng xếp hạng, lớp học, lượt đọc thông báo của những người đang ở Thùng rác. Không thể hoàn tác.', danger: true, cls: 'danger', past: 'xóa vĩnh viễn', trash: 1 },
  };
  const NORMAL = ['tagAdd', 'tagRemove', 'aiGrant', 'aiRevoke', 'block', 'unblock', 'delete'], TRASH = ['restore', 'purge'];
  const COLW = { ck: 2.75, user: 13.5, role: 6.5, status: 7.5, plat: 6.5, cc: 7.75, created: 6.5, seen: 7.25, n: 4, act: matchMedia('(pointer: coarse)').matches ? 11.5 : 10.5 }; // rem; cột Người dùng lấy phần dư, tối thiểu user
  const COLS = [['role', 'Vai trò'], ['status', 'Trạng thái'], ['plat', 'Nền tảng'], ['cc', 'Quốc gia'], ['created', 'Ngày tạo'], ['seen', 'Hoạt động gần nhất'], ['n', 'Số lần vào']];
  const FKEYS = ['q', 'role', 'status', 'plat', 'cc', 'from', 'to', 'tag', 'perk', 'blocked', 'seen', 'nMin', 'trash'];
  const BLANK = { q: '', role: '', status: '', plat: '', cc: '', from: '', to: '', tag: '', perk: '', blocked: '', seen: '', nMin: '', trash: '', sort: 'seen', dir: '', offset: 0, limit: 50 };
  const VIEWS = [ // chế độ xem có sẵn
    ['all', 'Tất cả người dùng', {}], ['new', 'Mới 7 ngày', { status: 'new7', sort: 'created', dir: 'desc' }],
    ['risk', 'Có nguy cơ rời bỏ', { seen: 'out30', nMin: '3', sort: 'n', dir: 'desc' }], ['ai', 'Có quyền AI', { perk: 'ai' }],
    ['blk', 'Bị khóa', { blocked: '1' }], ['trash', 'Thùng rác', { trash: '1', sort: 'deleted', dir: 'desc' }],
  ];
  const SEEN = { in1: { seenIn: 1 }, in7: { seenIn: 7 }, in30: { seenIn: 30 }, out30: { seenOut: 30 }, out90: { seenOut: 90 } };
  const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* riêng tư/đầy: bỏ qua */ } } };

  function render(main, c) {
    const { api, esc, num, rel, tile, spark, confirmDlg, modal, closeDlg, toast, emptyState, errBox, $ } = c;
    const T = (vi, v) => { let s = c.lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : null; if (s == null) return c.L(vi, v); if (Array.isArray(s)) s = s[v && +v.n === 1 ? 0 : 1]; return v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m)) : s; };
    let f; try { f = JSON.parse(sessionStorage.getItem('adm.uf') || '{}'); } catch (e) { f = {}; }
    f = { ...BLANK, ...f };
    let cols = ls.get('adm.ucols', COLS.map(x => x[0])), views = ls.get('adm.uviews', []), priv = !!ls.get('adm.upriv', false);
    const sel = new Set(); let lastK = {}, lastT = 0, allMode = false, lastIdx = -1, rows = [], filtered = 0, stats = null, kb = -1, my = 0;
    const flagOf = x => c.realCC(x) ? String.fromCodePoint(...[...x].map(ch => 127397 + ch.charCodeAt(0))) : x === 'T1' ? '🧅' : '🌐';
    const ccName = x => (x ? c.cname(x) : T('Chưa rõ quốc gia'));
    const ccCell = x => `<span aria-hidden="true">${flagOf(x)}</span> ${x ? esc(ccName(x)) : `<span class="muted">${T('Chưa rõ')}</span>`}`;
    const mask = s => { s = String(s || ''); if (!priv) return s; const [a, b] = s.split('@'); return b ? a.charAt(0) + '•••@' + b.charAt(0) + '•••' : s.charAt(0) + '•••'; };
    const tagsOf = u => Array.isArray(u.tags) ? u.tags : (() => { try { const t = JSON.parse(u.tags || '[]'); return Array.isArray(t) ? t : []; } catch (e) { return []; } })();
    const badges = u => {
      const now = Date.now(), b = [];
      if (u.deleted) b.push(['bad', '🗑 ' + T('Chờ xóa')]); else if (u.blocked) b.push(['bad', '⛔ ' + T('Bị khóa')]);
      if (now - u.created < 7 * 864e5) b.push(['info', T('Mới')]);
      b.push(now - u.seen < 7 * 864e5 ? ['ok', T('Hoạt động')] : now - u.seen > 30 * 864e5 ? ['muted', T('Ngủ đông')] : ['warn', T('Hoạt động')]);
      if (u.ai) b.push(['info', T('AI ∞')]);
      return b.map(([k, t]) => `<span class="chip ${k} sm">${esc(t)}</span>`).join(' ');
    };
    const query = () => { const q = { ...f, ...(SEEN[f.seen] || {}), trash: f.trash ? 1 : '' }; delete q.seen; return q; };
    const save = () => { try { sessionStorage.setItem('adm.uf', JSON.stringify(f)); } catch (e) { /* bỏ qua */ } };
    const selN = () => (allMode ? filtered : sel.size);
    const opt = (id, label, opts, key) => `<label class="u-sel"><span title="${esc(T(label))}">${T(label)}</span><select id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(f[key]) === String(v) ? 'selected' : ''}>${esc(T(t))}</option>`).join('')}</select></label>`;

    c.setActions(`<label class="u-sel u-view"><span class="sr-only">${T('Chế độ xem')}</span><select id="uview" aria-label="${esc(T('Chế độ xem'))}"></select></label>
      <button type="button" class="btn sm" id="ucolsb" aria-haspopup="true" aria-expanded="false">▦ ${T('Cột')}</button>
      <button type="button" class="btn sm" id="upriv" aria-pressed="${priv}" title="${esc(T('Che email và tên khi chia sẻ màn hình'))}">🙈 ${T('Chế độ riêng tư')}</button>
      <button type="button" class="btn sm" id="ucsv" title="${esc(T('Tải CSV theo bộ lọc hiện tại (tối đa 5.000 dòng)'))}">⬇ CSV</button>
      <button type="button" class="btn ghost sm" id="ukeys" aria-label="${esc(T('Phím tắt'))}" title="${esc(T('Phím tắt'))}">⌨ ?</button>`);
    main.innerHTML = `
      <div class="tiles" id="uKpi">${'<span class="sk sk-tile"></span>'.repeat(5)}</div>
      <div class="u-charts mt" id="uCharts">
        <section class="card" aria-labelledby="uSgH"><div class="card-h"><h2 class="h3" id="uSgH">${T('Đăng ký 90 ngày')}</h2><span class="small muted">${T('người đăng ký mới mỗi ngày (giờ VN)')}</span></div><div id="uSg"><span class="sk sk-block" style="margin:0"></span></div></section>
        <section class="card" aria-labelledby="uFnH"><div class="card-h"><h2 class="h3" id="uFnH">${T('Phễu kích hoạt')}</h2></div><div id="uFn"><span class="sk sk-block" style="margin:0"></span></div></section>
        <section class="card u-wide" aria-labelledby="uRtH"><div class="card-h"><h2 class="h3" id="uRtH">${T('Giữ chân theo nhóm tuần đăng ký')}</h2><span class="small muted">${T('Tỉ lệ người còn quay lại ít nhất 1 / 7 / 30 ngày sau khi đăng ký.')}</span></div><div id="uRt"><span class="sk sk-block" style="margin:0"></span></div></section>
      </div>
      <div class="card mt">
        <div class="u-tools">
          <input type="search" id="uq" placeholder="${esc(T('🔎 Tìm email, tên hoặc UID'))}" value="${esc(f.q)}" aria-label="${esc(T('Tìm người dùng'))}" aria-keyshortcuts="/">
          ${opt('frole', 'Vai trò', [['', 'Tất cả'], ['admin', 'Quản trị'], ['learner', 'Người học']], 'role')}
          ${opt('fstatus', 'Trạng thái', [['', 'Tất cả'], ['active7', 'Hoạt động 7 ngày'], ['dormant', 'Ngủ đông >30 ngày'], ['new7', 'Mới 7 ngày']], 'status')}
          ${opt('fplat', 'Nền tảng', [['', 'Tất cả'], ['web', 'Web'], ['ios', 'iOS'], ['android', 'Android'], ['ext', 'Add-on Chrome'], ['app', 'App (cũ)']], 'plat')}
          <label class="u-sel"><span>${T('Quốc gia')}</span><select id="fcc"><option value="">${T('Tất cả')}</option>${f.cc ? `<option value="${esc(f.cc)}" selected>${esc(f.cc === '??' ? T('Chưa rõ quốc gia') : ccName(f.cc))}</option>` : ''}</select></label>
          ${opt('fseen', 'Hoạt động gần nhất@@filter', [['', 'Mọi lúc'], ['in1', 'Trong 24 giờ'], ['in7', 'Trong 7 ngày'], ['in30', 'Trong 30 ngày'], ['out30', 'Im lặng > 30 ngày'], ['out90', 'Im lặng > 90 ngày']], 'seen')}
          <label class="u-sel"><span>${T('Số lần vào')}</span><select id="fn">${[['', T('Bất kỳ')], ...[2, 5, 10, 20].map(n => [String(n), T('≥ {n} lần', { n })])].map(([v, t]) => `<option value="${v}" ${String(f.nMin) === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
          <label class="u-sel"><span>${T('Nhãn')}</span><select id="ftag"><option value="">${T('Mọi nhãn')}</option>${f.tag ? `<option value="${esc(f.tag)}" selected>${esc(f.tag)}</option>` : ''}</select></label>
          ${opt('fperk', 'Quyền', [['', 'Mọi quyền'], ['ai', 'Quyền AI ∞']], 'perk')}
          ${opt('fblk', 'Khóa đồng bộ', [['', 'Tất cả'], ['1', 'Đang khóa'], ['0', 'Không khóa']], 'blocked')}
          <label class="u-sel"><span>${T('Tham gia từ')}</span><input type="date" id="ffrom" value="${esc(f.from)}"></label>
          <label class="u-sel"><span>${T('đến ngày')}</span><input type="date" id="fto" value="${esc(f.to)}"></label>
          ${opt('fsort', 'Sắp xếp', [['seen', 'Hoạt động gần nhất'], ['new', 'Mới nhất'], ['old', 'Tham gia sớm nhất'], ['n', 'Vào nhiều nhất'], ['email', 'Email'], ['name', 'Người dùng']], 'sort')}
          <button type="button" class="btn ghost sm" id="uclr" hidden>${T('Bỏ lọc')}</button>
        </div>
        <div class="u-selbar" id="uSelBar" role="status" aria-live="polite" hidden></div>
        <div class="tbl-wrap scroll" id="uTable" aria-busy="true"><span class="sk sk-block" style="margin:0"></span></div>
        <div class="u-pager" id="uPager"></div>
      </div>
      <section class="card mt" aria-labelledby="uCcH"><div class="card-h"><h2 class="h3" id="uCcH">${T('🌍 Người dùng theo quốc gia')}</h2><span class="small muted">${T('Lần đồng bộ gần nhất · bấm để lọc')}</span></div><div id="uCc"><span class="sk sk-block" style="margin:0"></span></div></section>
      <div class="u-bulk" id="uBulk" role="toolbar" aria-label="${esc(T('Thao tác hàng loạt'))}" hidden></div>`;
    const anyF = () => FKEYS.some(k => f[k]);

    // ---------- Chế độ xem (có sẵn + của tôi, lưu ở máy này) ----------
    const viewSel = $('#uview');
    const sameView = v => FKEYS.concat(['sort', 'dir']).every(k => String(f[k] ?? '') === String({ ...BLANK, ...v }[k] ?? ''));
    const drawViews = () => {
      const cur = VIEWS.find(v => sameView(v[2])), mine = views.find(v => sameView(v.f));
      viewSel.innerHTML = `<optgroup label="${esc(T('Có sẵn'))}">${VIEWS.map(([k, l]) => `<option value="b:${k}">${esc(T(l))}</option>`).join('')}</optgroup>
        ${views.length ? `<optgroup label="${esc(T('Chế độ xem của tôi'))}">${views.map((v, i) => `<option value="m:${i}">${esc(v.name)}</option>`).join('')}</optgroup>` : ''}
        <option value="" ${cur || mine ? '' : 'selected'} disabled>—</option><option value="save">${esc(T('Lưu chế độ xem…'))}</option>${mine ? `<option value="del">${esc(T('Xóa chế độ xem này'))}</option>` : ''}`;
      viewSel.value = cur ? 'b:' + cur[0] : mine ? 'm:' + views.indexOf(mine) : '';
    };
    const applyF = o => { Object.assign(f, BLANK, o, { offset: 0, limit: f.limit }); syncInputs(); clearSel(); load(); };
    viewSel.onchange = async () => {
      const v = viewSel.value;
      if (v.startsWith('b:')) applyF(VIEWS.find(x => x[0] === v.slice(2))[2]);
      else if (v.startsWith('m:')) applyF(views[+v.slice(2)].f);
      else if (v === 'del') { const i = views.findIndex(x => sameView(x.f)); if (i >= 0) { views.splice(i, 1); ls.set('adm.uviews', views); } drawViews(); }
      else if (v === 'save') {
        const name = await ask(T('Lưu chế độ xem…'), T('Tên chế độ xem'), '', 40); drawViews(); if (!name) return;
        const keep = {}; FKEYS.concat(['sort', 'dir']).forEach(k => { if (f[k] !== '' && f[k] != null) keep[k] = f[k]; });
        views = views.filter(x => x.name !== name).concat([{ name, f: keep }]).slice(-20); ls.set('adm.uviews', views); drawViews(); toast(T('Đã lưu chế độ xem'));
      }
    };

    // Hỏi 1 dòng chữ (+ tùy chọn ô thứ 2) trong hộp thoại của trang quản trị
    function ask(title, label, val = '', max = 30, label2 = '') {
      return new Promise(res => {
        let done = false;
        const d = modal(`<form class="key-box" method="dialog"><h3 id="uaT">${esc(title)}</h3><label class="dlg-typed">${esc(label)}<input id="uaIn" maxlength="${max}" value="${esc(val)}" autocomplete="off" required></label>
          ${label2 ? `<label class="dlg-typed">${esc(label2)}<input id="uaIn2" maxlength="200" autocomplete="off"></label>` : ''}
          <div class="dlg-act"><button type="button" class="btn ghost" data-close>${T('Hủy')}</button><button type="submit" class="btn primary">${T('Áp dụng')}</button></div></form>`, 'cf-dlg', title);
        const fin = v => { if (done) return; done = true; closeDlg(d); res(v); };
        d.querySelector('form').onsubmit = e => { e.preventDefault(); const v = d.querySelector('#uaIn').value.trim(); if (!v) return; fin(label2 ? { v, v2: d.querySelector('#uaIn2').value.trim() } : v); };
        d.addEventListener('close', () => fin(null)); d.querySelector('#uaIn').focus();
      });
    }

    // ---------- Cột hiển thị ----------
    $('#ucolsb').onclick = () => {
      const d = modal(`<div class="key-box"><h3>${T('Cột hiển thị')}</h3><div class="u-colpick">${COLS.map(([k, l]) => `<label><input type="checkbox" value="${k}" ${cols.includes(k) ? 'checked' : ''}> ${esc(T(l))}</label>`).join('')}</div>
        <div class="dlg-act"><button type="button" class="btn primary" data-close>${T('Đóng')}</button></div></div>`, 'cf-dlg', T('Cột hiển thị'));
      d.querySelectorAll('input').forEach(i => { i.onchange = () => { cols = [...d.querySelectorAll('input:checked')].map(x => x.value); ls.set('adm.ucols', cols); drawTable(); }; });
    };
    $('#upriv').onclick = () => { priv = !priv; ls.set('adm.upriv', priv); $('#upriv').setAttribute('aria-pressed', String(priv)); drawTable(); };
    $('#ukeys').onclick = () => help();
    function help() {
      const K = [['/', 'Tìm kiếm'], ['j / k', 'Dòng kế / trước'], ['x', 'Chọn dòng'], ['Shift + x', 'Chọn cả trang'], ['Enter', 'Mở chi tiết'], ['Esc', 'Bỏ chọn / đóng'], ['[ / ]', 'Trang sau / trước'], ['?', 'Hiện bảng này']];
      modal(`<div class="key-box"><h3>${T('Phím tắt')}</h3><dl class="u-keys">${K.map(([k, l]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(T(l))}</dd></div>`).join('')}</dl><div class="dlg-act"><button type="button" class="btn primary" data-close>${T('Đóng')}</button></div></div>`, 'cf-dlg', T('Phím tắt'));
    }

    // ---------- Bộ lọc ----------
    const syncInputs = () => {
      $('#uq').value = f.q; [['#frole', 'role'], ['#fstatus', 'status'], ['#fplat', 'plat'], ['#fseen', 'seen'], ['#fn', 'nMin'], ['#fperk', 'perk'], ['#fblk', 'blocked'], ['#ffrom', 'from'], ['#fto', 'to'], ['#fsort', 'sort']].forEach(([id, k]) => { const el = $(id); if (el) el.value = f[k] ?? ''; });
      ensure($('#fcc'), f.cc, f.cc === '??' ? T('Chưa rõ quốc gia') : ccName(f.cc)); ensure($('#ftag'), f.tag, f.tag);
    };
    const ensure = (s, v, label) => { if (v && ![...s.options].some(o => o.value === v)) s.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(label)}</option>`); s.value = v || ''; };
    let deb; $('#uq').oninput = () => { clearTimeout(deb); deb = setTimeout(() => { f.q = $('#uq').value.trim(); f.offset = 0; clearSel(); load(); }, 250); };
    [['#frole', 'role'], ['#fstatus', 'status'], ['#fplat', 'plat'], ['#fcc', 'cc'], ['#ffrom', 'from'], ['#fto', 'to'], ['#fseen', 'seen'], ['#fn', 'nMin'], ['#ftag', 'tag'], ['#fperk', 'perk'], ['#fblk', 'blocked']].forEach(([id, k]) => { $(id).onchange = () => { f[k] = $(id).value; f.offset = 0; clearSel(); load(); }; });
    $('#fsort').onchange = () => { f.sort = $('#fsort').value; f.dir = ''; f.offset = 0; load(); };
    $('#uclr').onclick = () => applyF({ sort: f.sort, dir: f.dir });

    // ---------- Chọn ----------
    function clearSel() { sel.clear(); allMode = false; lastIdx = -1; drawSel(); }
    function drawSel() {
      main.querySelectorAll('.u-ck').forEach(x => { x.checked = allMode || sel.has(x.dataset.ck); x.closest('tr').classList.toggle('sel', x.checked); });
      const all = $('#uAll'), onPage = rows.filter(u => sel.has(u.uid)).length;
      if (all) { all.checked = allMode || (rows.length > 0 && onPage === rows.length); all.indeterminate = !all.checked && onPage > 0; }
      const bar = $('#uSelBar'), pageAll = rows.length && onPage === rows.length && filtered > rows.length;
      bar.hidden = !(pageAll || allMode);
      bar.innerHTML = allMode ? `${esc(T('Đã chọn cả {n} người khớp bộ lọc.', { n: num(filtered) }))} <button type="button" class="linkbtn" id="uSelNone">${T('Bỏ chọn')}</button>`
        : pageAll ? `${esc(T('Đã chọn {n} người trên trang này.', { n: num(onPage) }))} <button type="button" class="linkbtn" id="uSelAll">${esc(T('Chọn cả {n} người khớp bộ lọc', { n: num(filtered) }))}</button>` : '';
      if ($('#uSelAll')) $('#uSelAll').onclick = () => { allMode = true; drawSel(); };
      if ($('#uSelNone')) $('#uSelNone').onclick = clearSel;
      drawBulk();
    }
    function drawBulk() {
      const n = selN(), bar = $('#uBulk'); bar.hidden = !n; document.body.classList.toggle('u-bulk-on', !!n);
      if (!n) { bar.innerHTML = ''; return; }
      const acts = f.trash ? TRASH : NORMAL;
      bar.innerHTML = `<span class="u-bulk-n"><b>${esc(T('Đã chọn {n}', { n: num(n) }))}</b>${!allMode && filtered > n ? `<button type="button" class="linkbtn" data-bulk="all">${esc(T('Chọn cả {n} người khớp bộ lọc', { n: num(filtered) }))}</button>` : ''}</span>
        <span class="u-bulk-acts">${acts.map(a => `<button type="button" class="btn sm ${BULK[a].cls === 'danger' ? 'danger-fill' : ''}" data-bulk="${a}">${esc(T(BULK[a].b))}</button>`).join('')}
        ${f.trash ? '' : `<button type="button" class="btn sm" data-bulk="notify">📣 ${T('Gửi thông báo')}</button>`}<button type="button" class="btn sm" data-bulk="csv">⬇ ${T('Xuất CSV')}</button></span>
        <button type="button" class="btn ghost sm" data-bulk="clear" aria-keyshortcuts="Escape">✕ ${T('Bỏ chọn')}</button>`;
    }
    $('#uBulk').addEventListener('click', ev => { const b = ev.target.closest('[data-bulk]'); if (!b) return; const a = b.dataset.bulk; if (a === 'clear') clearSel(); else if (a === 'all') { allMode = true; drawSel(); } else if (a === 'csv') csv(true); else if (a === 'notify') notify(); else bulk(a); });
    const target = () => (allMode ? { all: true, filter: query() } : { uids: [...sel] });

    async function bulk(a, again) {
      const B = BULK[a], n = selN(); let extra = {};
      if (!again) {
        if (B.ask === 'tag') { const t = await ask(T(B.t, { n: num(n) }), T('Tên nhãn (≤ 30 ký tự)'), f.tag || ''); if (!t) return; extra.tag = t; }
        else if (B.ask === 'note') {
          if (!(await confirmDlg({ title: T(B.t, { n: num(n) }), body: T(B.d), typed: String(n), ok: T(B.b), danger: true }))) return;
          const note = await ask(T(B.t, { n: num(n) }), T('Ghi chú (tùy chọn)'), '', 200); extra.note = note || '';
        } else if (!(await confirmDlg({ title: T(B.t, { n: num(n) }), body: B.d ? T(B.d) : '', typed: B.danger ? String(n) : '', ok: T(B.b), danger: !!B.danger }))) return;
      } else extra = again;
      let r; try { r = await api('usersBulk', { action: a, ...target(), confirm: n, ...extra }); } catch (e) { return fail(e); }
      if (r.error === 'confirm') { filtered = r.n; toast(T('Số người khớp bộ lọc vừa đổi ({n}). Hãy xem lại rồi thử lại.', { n: num(r.n) }), 'bad', 6000); return load(); }
      done(a, r, extra);
    }
    function fail(e) { const m = String(e && e.message || e); if (m !== 'reauth') toast(m === 'too-fast' ? T('Thao tác quá nhanh – chờ một phút.') : T('Lỗi: {e}', { e: m }), 'bad', 6000); }
    function done(a, r, extra) {
      const ch = r.changed || [], parts = [T('Đã {a}: {n} người', { a: T(BULK[a].past), n: num(ch.length) })];
      if (r.n - ch.length - (r.skipped || 0) > 0) parts.push(T('{n} không đổi (đã như vậy)', { n: num(r.n - ch.length - (r.skipped || 0)) }));
      if (r.skipped) parts.push(T('{n} tài khoản quản trị được bỏ qua', { n: num(r.skipped) }));
      clearSel(); load();
      undoToast(parts.join(' · '), r.undo && ch.length ? async () => {
        try { const u = await api('usersBulk', { action: r.undo, uids: ch, confirm: ch.length, ...extra }); toast(T('Đã hoàn tác') + ' · ' + num((u.changed || []).length)); load(); } catch (e) { fail(e); }
      } : null);
    }
    // Thông báo kèm nút Hoàn tác (10 giây) – cùng hộp #toasts của trang quản trị
    function undoToast(msg, undo) {
      const box = document.getElementById('toasts'); if (!box) return;
      const t = document.createElement('div'); t.className = 'a-toast ok u-undo';
      t.innerHTML = `<span>✓</span><span class="tm"></span>${undo ? `<button type="button" class="btn sm" data-undo>${T('Hoàn tác')}</button>` : ''}<button type="button" aria-label="${esc(T('Đóng'))}">✕</button>`;
      t.querySelector('.tm').textContent = msg; box.appendChild(t);
      t.querySelector('button:not([data-undo])').onclick = () => t.remove();
      if (undo) t.querySelector('[data-undo]').onclick = () => { t.remove(); undo(); };
      setTimeout(() => t.remove(), 10000);
    }
    async function uidsOf() { // uid của lựa chọn (chọn cả bộ lọc → hỏi máy chủ, ≤ 5.000)
      if (!allMode) return [...sel];
      const r = await api('usersExport', { ...query(), offset: 0 }); return (r.rows || []).map(x => x.uid).filter(Boolean);
    }
    async function notify() {
      if (selN() > 500) { toast(T('Gửi thông báo tối đa 500 người một lần. Hãy thu hẹp bộ lọc.'), 'bad', 6000); return; }
      let ids; try { ids = await uidsOf(); } catch (e) { return fail(e); }
      try { sessionStorage.setItem('adm.targetUsers', JSON.stringify({ uids: ids.slice(0, 500) })); } catch (e) { /* bỏ qua */ }
      c.show('notices');
    }
    async function csv(onlySel) {
      const n = onlySel ? selN() : filtered;
      if (!(await confirmDlg({ title: T('Xuất CSV {n} người?', { n: num(Math.min(n, 5000)) }), body: T('Tệp chứa email và tên (dữ liệu cá nhân). Chỉ lưu ở nơi an toàn; lượt xuất được ghi nhật ký kiểm toán.'), ok: T('Xuất CSV') }))) return;
      const b = $('#ucsv'); b.disabled = true;
      try {
        const r = await api('usersExport', onlySel && !allMode ? { uids: [...sel], sort: f.sort, dir: f.dir } : { ...query(), offset: 0 });
        const cell = v => { let x = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return /[",\n\r;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
        const iso = t => t ? new Date(t).toISOString() : '';
        const lines = [['uid', 'email', 'name', 'role', 'plat', 'country', 'created', 'seen', 'n', 'tags', 'blocked', 'ai'], ...r.rows.map(u => [u.uid, u.email, u.name, u.isAdmin ? 'admin' : 'learner', u.plat, u.cc || '', iso(u.created), iso(u.seen), u.n, tagsOf(u).join('|'), u.blocked ? 1 : 0, u.ai ? 1 : 0])].map(x => x.map(cell).join(','));
        const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = `lexkite-users-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(T('Đã xuất {n} dòng', { n: num(r.rows.length) }));
      } catch (e) { toast(T('Lỗi xuất CSV'), 'bad'); }
      b.disabled = false;
    }
    $('#ucsv').onclick = () => csv(false);

    // ---------- Bảng ----------
    const SORTABLE = { user: 'name', plat: 'plat', cc: 'cc', created: 'created', seen: 'seen', n: 'n' };
    const curSort = () => ({ new: ['created', 'desc'], old: ['created', 'asc'] }[f.sort] || [f.sort, f.dir || 'desc']);
    const th = (k, label, cls = '') => {
      const s = SORTABLE[k]; if (!s) return `<th scope="col" class="${cls}">${label}</th>`;
      const [sk, sd] = curSort(), on = sk === s;
      return `<th scope="col" class="${cls}" aria-sort="${on ? (sd === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="u-sort" data-sort="${s}" aria-label="${esc(T('Sắp xếp theo {c}', { c: label }))}">${label}<span class="u-sort-i" data-dir="${on ? sd : ''}" aria-hidden="true"></span></button></th>`; // mũi tên vẽ bằng CSS (chữ tiêu đề giữ nguyên)
    };
    function drawTable() {
      const show = k => cols.includes(k);
      $('#uTable').setAttribute('aria-busy', 'false');
      $('#uTable').innerHTML = `<table class="tbl u-tbl" data-cards><thead><tr><th scope="col" class="u-ckc"><label class="u-ckh"><input type="checkbox" id="uAll" aria-label="${esc(T('Chọn tất cả trên trang'))}"><span class="u-all-t" aria-hidden="true">${T('Chọn tất cả')}</span></label></th>${th('user', T('Người dùng'))}${show('role') ? th('role', T('Vai trò')) : ''}${show('status') ? th('status', T('Trạng thái')) : ''}${show('plat') ? th('plat', T('Nền tảng')) : ''}${show('cc') ? th('cc', T('Quốc gia')) : ''}${show('created') ? th('created', T('Ngày tạo')) : ''}${show('seen') ? th('seen', T('Hoạt động gần nhất')) : ''}${show('n') ? th('n', T('Lần vào'), 'num') : ''}<th scope="col"><span class="sr-only">${T('Thao tác')}</span></th></tr></thead><tbody>
        ${rows.map((u, i) => {
          const tg = tagsOf(u), nm = u.name || T('(không tên)');
          return `<tr data-i="${i}" data-row="${esc(u.uid)}" tabindex="-1"><td class="u-ckc" data-label=""><label class="u-ckh"><input type="checkbox" class="u-ck" data-ck="${esc(u.uid)}" aria-label="${esc(T('Chọn {e}', { e: mask(u.email || u.name || u.uid) }))}"></label></td>
          <td class="u-c-who" data-label=""><div class="u-who"><span class="u-av" aria-hidden="true">${esc((u.name || u.email || '?').trim().charAt(0).toUpperCase())}</span><span class="u-who-t"><b class="u-nm ${priv ? 'u-pii' : ''}" title="${esc(mask(nm))}">${esc(mask(nm))}</b> ${!show('status') && u.blocked ? `<span class="chip bad sm">⛔ ${T('Bị khóa')}</span>` : ''}<span class="small muted u-em ${priv ? 'u-pii' : ''}" title="${esc(mask(u.email || u.uid))}">${esc(mask(u.email || u.uid))}</span>${tg.length ? `<div class="u-tags">${tg.map(t => `<button type="button" class="chip sm" data-tagf="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}</span></div></td>
          ${show('role') ? `<td>${c.rolePill(u.isAdmin)}</td>` : ''}${show('status') ? `<td class="u-badges"><div class="u-bw">${badges(u)}</div></td>` : ''}
          ${show('plat') ? `<td class="nowrap u-clip" title="${esc(c.platName(u.plat))}">${c.platIcon(u.plat)} ${esc(c.platName(u.plat))}</td>` : ''}${show('cc') ? `<td class="nowrap u-clip" title="${esc(u.cc ? ccName(u.cc) : T('Chưa rõ'))}">${ccCell(u.cc)}</td>` : ''}${show('created') ? `<td class="small nowrap">${rel(u.created)}</td>` : ''}
          ${show('seen') ? `<td class="small nowrap"><span class="dot ${Date.now() - u.seen < 7 * 864e5 ? 'ok' : Date.now() - u.seen > 30 * 864e5 ? '' : 'warn'}"></span>${rel(u.seen)}</td>` : ''}${show('n') ? `<td class="num">${num(u.n)}</td>` : ''}
          <td class="nowrap u-c-act" data-label=""><button type="button" class="btn ghost sm" data-uid="${esc(u.uid)}">${T('Chi tiết')}</button>${u.deleted ? '' : ` <button type="button" class="btn ghost sm" data-notif="${esc(u.uid)}" data-em="${esc(u.email || u.name || '')}" title="${esc(T('Gửi thông báo'))}" aria-label="${esc(T('Gửi thông báo'))}"><span aria-hidden="true">📣</span><span class="u-bl"> ${T('Gửi')}</span></button> <button type="button" class="btn ghost sm danger" data-del="${esc(u.uid)}" data-em="${esc(u.email || '')}" title="${esc(T('Xóa dữ liệu'))}" aria-label="${esc(T('Xóa dữ liệu'))}"><span aria-hidden="true">🗑</span><span class="u-bl"> ${T('Xóa dữ liệu')}</span></button>`}</td></tr>`;
        }).join('') || `<tr><td colspan="${3 + cols.length}">${f.trash ? emptyState(T('Không có người dùng trong Thùng rác'), T('Người bị xóa mềm nằm đây 30 ngày trước khi bị xóa vĩnh viễn.'), '🗑') : emptyState(T('Không có người dùng khớp bộ lọc'), T('Thử bỏ bớt bộ lọc hoặc từ khóa.'))}${anyF() ? `<p class="center"><button type="button" class="btn sm" data-clrf>${T('Bỏ lọc')}</button></p>` : ''}</td></tr>`}</tbody></table>`;
      const cw = [COLW.ck, COLW.user, ...COLS.filter(([k]) => show(k)).map(([k]) => COLW[k]), COLW.act], tb = $('#uTable table');
      tb.style.setProperty('--u-min', cw.reduce((a, x) => a + x, 0) + 'rem'); tb.insertAdjacentHTML('afterbegin', `<colgroup>${cw.map((x, i) => i === 1 ? '<col>' : `<col style="width:${x}rem">`).join('')}</colgroup>`);
      kb = -1; drawSel();
    }
    const T_ = $('#uTable');
    T_.addEventListener('click', ev => {
      const t = ev.target;
      if (t.id === 'uAll') { rows.forEach(u => (t.checked ? sel.add(u.uid) : sel.delete(u.uid))); if (!t.checked) allMode = false; drawSel(); return; }
      if (t.classList.contains('u-ck')) {
        const i = +t.closest('tr').dataset.i;
        if (allMode) { allMode = false; rows.forEach(u => sel.add(u.uid)); }
        if (ev.shiftKey && lastIdx >= 0) { const [a, b] = [Math.min(lastIdx, i), Math.max(lastIdx, i)], on = t.checked; for (let k = a; k <= b; k++) (on ? sel.add(rows[k].uid) : sel.delete(rows[k].uid)); }
        else (t.checked ? sel.add(t.dataset.ck) : sel.delete(t.dataset.ck));
        lastIdx = i; drawSel(); return;
      }
      const s = t.closest('[data-sort]'); if (s) { const [sk, sd] = curSort(); f.sort = s.dataset.sort; f.dir = sk === f.sort && sd === 'desc' ? 'asc' : 'desc'; f.offset = 0; $('#fsort').value = [...$('#fsort').options].some(o => o.value === f.sort) ? f.sort : ''; load(); return; }
      const tf = t.closest('[data-tagf]'); if (tf) { f.tag = tf.dataset.tagf; f.offset = 0; syncInputs(); clearSel(); load(); return; }
      if (t.closest('[data-clrf]')) { applyF({ sort: f.sort, dir: f.dir }); return; }
      const d = t.closest('[data-uid]'); if (d) { c.userDialog(d.dataset.uid, load); return; }
      const x = t.closest('[data-del]'); if (x) { c.userDel(x.dataset.del, x.dataset.em, load); return; }
      const nt = t.closest('[data-notif]'); if (nt) { try { sessionStorage.setItem('adm.targetUser', JSON.stringify({ uid: nt.dataset.notif, email: nt.dataset.em })); } catch (e) { /* bỏ qua */ } c.show('notices'); }
    });
    // shift-click trên ô chọn: chặn bôi đen chữ
    T_.addEventListener('mousedown', ev => { if (ev.shiftKey && ev.target.classList && ev.target.classList.contains('u-ck')) ev.preventDefault(); });

    // ---------- Phím tắt ----------
    const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    const focusRow = i => { const trs = [...main.querySelectorAll('#uTable tbody tr[data-i]')]; if (!trs.length) return; kb = Math.max(0, Math.min(trs.length - 1, i)); trs.forEach((r, k) => r.classList.toggle('kb', k === kb)); trs[kb].focus(); };
    const onKey = e => {
      if (c.tab() !== 'users' || !main.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape' && selN() && !typing(e)) { clearSel(); return; }
      if (typing(e)) return;
      if (e.key === '/') { e.preventDefault(); $('#uq').focus(); }
      else if (e.key === 'j' || e.key === 'ArrowDown' && kb >= 0) { e.preventDefault(); focusRow(kb + 1); }
      else if (e.key === 'k' || e.key === 'ArrowUp' && kb >= 0) { e.preventDefault(); focusRow(kb - 1); }
      else if ((e.key === 'x' || e.key === ' ') && kb >= 0) { e.preventDefault(); const ck = main.querySelectorAll('.u-ck')[kb]; if (ck) ck.click(); }
      else if (e.key === 'X') { e.preventDefault(); const a = $('#uAll'); if (a) a.click(); }
      else if (e.key === 'Enter' && kb >= 0) { e.preventDefault(); const r = rows[kb]; if (r) c.userDialog(r.uid, load); }
      else if (e.key === ']' && $('#unext') && !$('#unext').disabled) $('#unext').click();
      else if (e.key === '[' && $('#uprev') && !$('#uprev').disabled) $('#uprev').click();
      else if (e.key === '?') help();
    };
    document.addEventListener('keydown', onKey);

    // ---------- Tải dữ liệu ----------
    async function load() {
      save(); drawViews(); const me = ++my; let r;
      $('#uTable').setAttribute('aria-busy', 'true');
      try { r = await api('users', query()); } catch (e) { if (me === my && c.tab() === 'users') { $('#uTable').innerHTML = errBox(e); const rt = main.querySelector('#uTable [data-retry]'); if (rt) rt.onclick = load; } return; }
      if (me !== my || c.tab() !== 'users') return;
      const k = r.kpi || {}, tot = r.total || 0; rows = r.rows || []; filtered = r.filtered || 0;
      if (allMode && !filtered) allMode = false;
      const ccs = r.countries || [], known = ccs.filter(x => x.k), top = known.slice(0, 15), unk = (ccs.find(x => !x.k) || {}).n || 0;
      const fcc = $('#fcc'); fcc.innerHTML = `<option value="">${T('Tất cả')}</option>${[...known].sort((a, b) => ccName(a.k).localeCompare(ccName(b.k), c.LOC())).map(x => `<option value="${esc(x.k)}">${flagOf(x.k)} ${esc(ccName(x.k))} (${num(x.n)})</option>`).join('')}${unk ? `<option value="??">${esc(T('Chưa rõ quốc gia'))} (${num(unk)})</option>` : ''}`;
      ensure(fcc, f.cc, ccName(f.cc));
      const max = Math.max(1, ...ccs.map(x => x.n)), sum = ccs.reduce((t, x) => t + x.n, 0) || 1;
      const ccRow = (x, lbl) => `<button type="button" class="row2 u-ccrow" data-cc="${esc(x.k || '??')}" aria-pressed="${f.cc === (x.k || '??')}"><span class="k">${lbl}</span><span class="track"><i style="width:${x.n / max * 100}%"></i></span><span class="v">${num(x.n)}<small> · ${Math.round(x.n / sum * 100)}%</small></span></button>`;
      $('#uCc').innerHTML = ccs.length ? `<div class="hbars u-cc">${top.map(x => ccRow(x, ccCell(x.k))).join('')}${unk ? ccRow({ k: '', n: unk }, `<span aria-hidden="true">🌐</span> <span class="muted">${T('Chưa rõ quốc gia')}</span>`) : ''}</div>
        <p class="small muted">${T('{n} quốc gia', { n: num(known.length) })}${known.length > top.length ? ' · ' + T('xem tất cả trong ô lọc Quốc gia') : ''}${unk ? ' · ' + T('"Chưa rõ" = tài khoản chưa đồng bộ lại từ khi có thống kê quốc gia') : ''}</p>` : c.NODATA();
      $('#uCc').querySelectorAll('[data-cc]').forEach(b => { b.onclick = () => { f.cc = f.cc === b.dataset.cc ? '' : b.dataset.cc; f.offset = 0; clearSel(); load(); }; });
      $('#uclr').hidden = !anyF();
      drawKpi(k, tot);
      drawTable();
      const from = filtered ? f.offset + 1 : 0, to = Math.min(f.offset + rows.length, filtered), lim = r.limit || f.limit || 50;
      $('#uPager').innerHTML = `<span>${num(from)}–${num(to)} / ${num(filtered)}${filtered !== tot && !f.trash ? T(' (lọc từ {n})', { n: num(tot) }) : ''}</span>
        <span class="u-pg"><label class="u-sel u-inline"><span>${T('Mỗi trang')}</span><select id="upsz">${[25, 50, 100, 200].map(n => `<option ${n === lim ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <button type="button" class="btn sm" id="uprev" ${f.offset ? '' : 'disabled'} aria-keyshortcuts="[">${T('← Trước')}</button> <button type="button" class="btn sm" id="unext" ${to < filtered ? '' : 'disabled'} aria-keyshortcuts="]">${T('Sau →')}</button></span>`;
      $('#uprev').onclick = () => { f.offset = Math.max(0, f.offset - lim); load(); };
      $('#unext').onclick = () => { f.offset += lim; load(); };
      $('#upsz').onchange = () => { f.limit = +$('#upsz').value; f.offset = 0; load(); };
    }
    function drawKpi(k, tot) {
      lastK = k; lastT = tot; // vẽ lại khi usersStats về (đường mini)
      const sg = stats ? stats.signups : null, days = [...Array(30)].map((_, i) => { const d = new Date(Date.now() + 7 * 3600e3 - (29 - i) * 864e5).toISOString().slice(0, 10); return (sg && (sg.find(x => x.day === d) || {}).n) || 0; });
      let run = tot - days.reduce((a, b) => a + b, 0); const cum = days.map(v => (run += v));
      $('#uKpi').innerHTML = `
        ${tile({ l: T('Tổng người dùng'), v: num(tot), s: T('tài khoản đã đồng bộ'), sp: sg ? spark(cum) : '' })}
        ${tile({ l: T('Hoạt động hôm nay'), v: num(k.act1), s: T('24 giờ qua') })}
        ${tile({ l: T('Hoạt động 7 / 30 ngày'), v: `${num(k.act7)} <small>/ ${num(k.act30)}</small>`, s: T('{p}% còn hoạt động trong tháng', { p: tot ? Math.round((k.act30 || 0) / tot * 100) : 0 }) })}
        ${tile({ l: T('Mới 7 ngày'), v: num(k.new7), s: T('tài khoản đăng ký mới'), sp: sg ? spark(days) : '' })}
        ${tile({ l: T('Tài khoản'), v: `${num(k.blocked)} <small>/ ${num(k.trash)}</small>`, s: `${T('đang bị khóa')} / ${T('trong Thùng rác')}`, cls: 'u-kpi-link' })}`;
    }
    async function loadStats() {
      try { stats = await api('usersStats'); } catch (e) { ['#uSg', '#uFn', '#uRt'].forEach(id => { const el = $(id); if (el) el.innerHTML = `<p class="small muted">${T('Không tải được biểu đồ')}</p>`; }); return; }
      if (c.tab() !== 'users' || !main.isConnected) return;
      const sg = stats.signups || [], by = Object.fromEntries(sg.map(x => [x.day, x.n]));
      const series = [...Array(90)].map((_, i) => { const d = new Date(Date.now() + 7 * 3600e3 - (89 - i) * 864e5).toISOString().slice(0, 10); return { day: d, n: by[d] || 0 }; });
      $('#uSg').innerHTML = window.AdminChart ? AdminChart.bars(series, { x: r => r.day.slice(5), aria: T('Đăng ký 90 ngày'), empty: '–', h: 160 }) : '';
      const F = stats.funnel || {}, top = Math.max(1, +F.signed || 0);
      const steps = [['Đăng ký', F.signed], ['Đồng bộ ≥ 2 lần', F.synced2], ['Quay lại sau 1 ngày', F.back1], ['Quay lại sau 7 ngày', F.back7], ['Hoạt động 7 ngày qua', F.active7]];
      $('#uFn').innerHTML = `<div class="hbars u-funnel">${steps.map(([l, v]) => `<div class="row2"><span class="k">${esc(T(l))}</span><span class="track"><i style="width:${(+v || 0) / top * 100}%"></i></span><span class="v">${num(v)}<small> · ${esc(T('{p}% tổng', { p: Math.round((+v || 0) / top * 100) }))}</small></span></div>`).join('')}</div>`;
      const pc = (a, n) => (n ? Math.round(a / n * 100) : 0), now = Date.now();
      const cell = (a, n, start, d) => { if (start + d * 864e5 > now) return `<td class="u-rc na">${T('chưa đủ ngày')}</td>`; const p = pc(a, n); return `<td class="u-rc" style="--p:${p}"><b>${p}%</b><small>${num(a)}</small></td>`; };
      const co = (stats.cohorts || []).slice().reverse();
      $('#uRt').innerHTML = co.length ? `<div class="tbl-wrap"><table class="tbl u-ret"><thead><tr><th scope="col">${T('Tuần')}</th><th scope="col" class="num">${T('Người')}</th><th scope="col">D1</th><th scope="col">D7</th><th scope="col">D30</th></tr></thead><tbody>${co.map(x => `<tr><th scope="row" class="nowrap">${esc(new Date(x.start).toLocaleDateString(c.LOC(), { day: '2-digit', month: '2-digit' }))}</th><td class="num">${num(x.n)}</td>${cell(x.d1, x.n, x.start, 1)}${cell(x.d7, x.n, x.start, 7)}${cell(x.d30, x.n, x.start, 30)}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">${esc(T('Cập nhật {t} · đệm 10 phút', { t: new Date(stats.at).toLocaleTimeString(c.LOC(), { hour: '2-digit', minute: '2-digit' }) }))}</p>` : c.NODATA();
      const ft = $('#ftag'); (stats.tags || []).forEach(t => { if (![...ft.options].some(o => o.value === t.k)) ft.insertAdjacentHTML('beforeend', `<option value="${esc(t.k)}">${esc(t.k)} (${num(t.n)})</option>`); }); ft.value = f.tag || '';
      drawKpi(lastK, lastT);
    }
    return Promise.all([load(), loadStats()]);
  }
  window.AdminUsers = { render, EN };
})();
