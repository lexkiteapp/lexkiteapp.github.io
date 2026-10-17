/* Quản trị → "Báo lỗi": hộp báo lỗi người dùng (functions/api/report.js) – tải lười khi mở tab (admin.js).
 *   AdminReports.render(container, L, { esc, num, when, lang })  → chip trạng thái + số lượng, tìm kiếm, lọc khu vực/loại/nền tảng,
 *     danh sách, ngăn chi tiết (ngữ cảnh, lỗi console, ảnh chụp, phản hồi, giao việc, gộp trùng, spam, lịch sử), xuất CSV, chế độ thư.
 *   AdminReports.card(container, L, { esc, num, lang })     → thẻ chất lượng: theo trạng thái, theo khu vực, 7 ngày, thời gian sửa trung vị.
 * Mọi lệnh qua /api/report (cổng adminGate, ghi admin_log). Mọi dữ liệu người dùng hiển thị qua esc(). Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    '🐞 Báo lỗi người dùng': '🐞 User reports', 'Tất cả đang mở': 'All open', 'Mới': 'New', 'Đã tiếp nhận': 'Acknowledged', 'Đang xử lý': 'In progress', 'Đã sửa': 'Fixed', 'Không sửa': "Won't fix", 'Trùng lặp': 'Duplicate', 'Spam': 'Spam',
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
    'Mọi mức': 'All severities', 'Ưu tiên (mức → số người)': 'Priority (severity → people)', '💡 Đề xuất': '💡 Suggestions', '🤖 Phân loại AI': '🤖 AI triage', 'Phân loại theo luật (AI không sẵn sàng)': 'Rule-based triage (AI unavailable)',
    'Nguyên nhân có thể': 'Likely cause', 'Đề xuất sửa': 'Suggested fix', 'Độ tin cậy {p}%': 'Confidence {p}%', 'Cần người duyệt': 'Needs human review', 'AI gợi ý trùng với {id}': 'AI suggests duplicate of {id}', 'Chưa phân loại': 'Not triaged yet',
    '🤖 AI phân loại lại': '🤖 Re-run AI triage', '🧑‍💻 Giao Claude Code': '🧑‍💻 Assign to Claude Code', 'Issue GitHub ↗': 'GitHub issue ↗', '{n} người gặp': '{n} people',
    'Chưa đặt GH_ISSUES_TOKEN: Cloudflare Pages → Settings → Variables → thêm secret GH_ISSUES_TOKEN (PAT fine-grained, repo lexkiteapp.github.io, quyền Issues: Read & write) rồi triển khai lại.': 'GH_ISSUES_TOKEN is not set: Cloudflare Pages → Settings → Variables → add secret GH_ISSUES_TOKEN (fine-grained PAT on lexkiteapp.github.io with Issues: Read & write), then redeploy.',
    'Đề xuất chỉ giao Claude Code sau khi Duyệt.': 'Suggestions go to Claude Code only after approval.', '✅ Duyệt': '✅ Approve', '✖ Từ chối': '✖ Reject', '⏸ Để sau': '⏸ Later', 'Duyệt đề xuất này? Sẽ tạo Issue "feature-approved" (xếp sau mọi lỗi đang mở).': 'Approve this suggestion? A "feature-approved" issue will be created (queued after all open bugs).',
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
  const PLATS = { web: '🌐 Web', pwa: '📲 PWA', ext: '🧩 Add-on', ios: '🍎 iOS', android: '🤖 Android', app: '📱 App' };
  const ACTS = { create: 'tạo', status: 'đổi trạng thái', reply: 'phản hồi', note: 'ghi chú', assign: 'giao việc', merge: 'gộp vào', merged: 'nhận gộp', mailed: 'đã gửi thư', 'mail-failed': 'gửi thư lỗi', spam: 'spam', 'not-spam': 'bỏ spam', triage: 'phân loại', issue: 'issue', 'issue-failed': 'issue lỗi', idea: 'đề xuất', resolve: 'đã sửa (Claude Code)' };
  const SEVC = { P0: '#dc2626', P1: '#ea580c', P2: '#ca8a04', P3: '#64748b' };
  const sevChip = v => v ? `<span class="rp-sev" style="--c:${Object.prototype.hasOwnProperty.call(SEVC, v) ? SEVC[v] : '#64748b'}">${Object.prototype.hasOwnProperty.call(SEVC, v) ? v : '?'}</span>` : ''; // chỉ P0–P3 (dữ liệu D1/AI không được chèn HTML)
  let lang = () => 'vi';
  const T = (vi, v) => { let s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : vi; if (v) s = s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m)); return s; };
  const stName = k => T((STS.find(x => x[0] === k) || [k, k])[1]);

  async function api(op, body = {}) {
    const u = window.firebase && firebase.auth().currentUser; if (!u) throw new Error('auth');
    const r = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
  }

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.rp-wrap{display:grid;gap:.8rem}.rp-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between}.rp-head h3{margin:0}
.rp-chips{display:flex;flex-wrap:wrap;gap:.4rem}.rp-chip{display:inline-flex;gap:.35rem;align-items:center;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:.35rem .75rem;font:inherit;font-size:.82rem;cursor:pointer;min-height:34px}
.rp-chip b{font-size:.75rem;background:var(--surface-3);border-radius:999px;padding:.05rem .45rem}.rp-chip.on{border-color:var(--primary);background:var(--primary-soft);font-weight:700}
.rp-tools{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}.rp-tools input[type=search]{flex:1 1 220px;min-width:0}.rp-tools input,.rp-tools select,.rp-dr textarea,.rp-dr input,.rp-dr select{font:inherit;padding:.45rem .6rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text)}
.rp-list{display:grid;gap:.4rem}.rp-row{display:grid;grid-template-columns:auto 1fr;gap:.6rem;align-items:center;padding:.3rem .5rem;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.rp-row:focus-within,.rp-row:hover{border-color:var(--primary)}
.rp-open{display:grid;grid-template-columns:auto 1fr auto;gap:.6rem;align-items:center;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;padding:.3rem 0;min-width:0}
.rp-open .m{min-width:0}.rp-open .p{display:block;margin-top:.15rem;font-size:.85rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rp-open .r{text-align:right;font-size:.75rem;color:var(--muted);white-space:nowrap}
.rp-st{display:inline-block;padding:.12rem .55rem;border-radius:999px;font-size:.72rem;font-weight:700;background:var(--surface-3)}.rp-st.new{background:var(--accent-soft)}.rp-st.ack,.rp-st.prog{background:var(--gold-soft)}.rp-st.fixed{background:var(--good-soft)}
.rp-tid{font-weight:800;font-variant-numeric:tabular-nums}.rp-bulk{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;padding:.5rem .7rem;border-radius:12px;background:var(--primary-soft)}
.rp-dr{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);z-index:80;background:var(--surface);color:var(--text);box-shadow:var(--shadow-lg,0 0 40px rgba(0,0,0,.3));overflow-y:auto;padding:1rem 1.1rem calc(1.2rem + env(safe-area-inset-bottom));display:grid;gap:.9rem;align-content:start}
.rp-dim{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:79}.rp-dr h4{margin:0 0 .35rem;font-size:.9rem}.rp-dr .msg{white-space:pre-wrap;word-break:break-word;background:var(--surface-2);padding:.6rem .7rem;border-radius:10px}
.rp-kv{display:grid;grid-template-columns:max-content 1fr;gap:.25rem .8rem;font-size:.84rem}.rp-kv dt{color:var(--muted)}.rp-kv dd{margin:0;word-break:break-word}
.rp-errs{margin:0;padding:.5rem .7rem;background:#111;color:#f5f5f5;border-radius:10px;font:12px/1.45 ui-monospace,Menlo,monospace;max-height:220px;overflow:auto;white-space:pre-wrap}.rp-shot img{max-width:100%;border-radius:10px;border:1px solid var(--line)}
.rp-sts{display:flex;flex-wrap:wrap;gap:.35rem}.rp-sts button[aria-pressed=true]{border-color:var(--primary);background:var(--primary-soft);font-weight:700}.rp-dr textarea{width:100%;box-sizing:border-box;min-height:70px}
.rp-ev{list-style:none;margin:0;padding:0;font-size:.8rem;display:grid;gap:.2rem;color:var(--muted)}.rp-card .bars{display:flex;gap:4px;align-items:flex-end;height:64px}.rp-card .bars div{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end}
.rp-card .bars i{display:block;width:100%;background:var(--primary);border-radius:4px 4px 0 0;min-height:2px}.rp-card .bars small{font-size:.65rem;color:var(--muted)}.rp-hbar{display:grid;grid-template-columns:7rem 1fr 2.5rem;gap:.5rem;align-items:center;font-size:.8rem}.rp-hbar span.b{height:8px;border-radius:4px;background:var(--primary-soft);overflow:hidden}.rp-hbar span.b i{display:block;height:100%;background:var(--primary)}
.rp-sev{display:inline-block;padding:.08rem .45rem;border-radius:6px;font-size:.7rem;font-weight:800;color:#fff;background:var(--c)}.rp-ai{border:1px solid var(--line);border-radius:12px;padding:.6rem .75rem;background:var(--surface-2);display:grid;gap:.3rem;font-size:.86rem}.rp-ai p{margin:0}.rp-warn{font-size:.8rem;color:var(--muted)}
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem}
@media (max-width:640px){.rp-open{grid-template-columns:auto 1fr}.rp-open .r{grid-column:1/-1;text-align:left}.rp-dr{width:100vw}}`;
    document.head.appendChild(s);
  }

  // ---------- Hộp báo lỗi ----------
  function render(main, L, o) {
    style(); lang = o.lang || lang; const esc = o.esc, num = o.num || (n => n), when = o.when || (x => new Date(x).toLocaleString());
    const F = { status: 'open', area: '', cat: '', plat: '', sev: '', q: '', sort: 'sev', spam: 0, sandbox: 0, offset: 0 };
    let data = null, sel = new Set(), rows = [];
    const ago = x => { const m = Math.round((Date.now() - x) / 6e4); return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    main.innerHTML = `<div class="rp-wrap card"><div class="rp-head"><h3>${T('🐞 Báo lỗi người dùng')}</h3><div class="rp-tools">
        <label class="small">${T('Thư báo quản trị')} <select id="rpMode" aria-label="${T('Thư báo quản trị')}"><option value="instant">${T('Ngay khi có')}</option><option value="digest">${T('Tóm tắt hằng ngày')}</option><option value="off">${T('Tắt')}</option></select></label>
        <button class="btn ghost sm" id="rpCsv">⬇ ${T('Xuất CSV')}</button><button class="btn ghost sm" id="rpRe">↻ ${T('Tải lại')}</button></div></div>
      <div class="rp-chips" id="rpChips" role="group" aria-label="${T('Trạng thái')}"></div>
      <div class="rp-tools"><input type="search" id="rpQ" placeholder="${T('Tìm mã LX-…, nội dung, email, trang, phiên bản')}" aria-label="${T('Tìm mã LX-…, nội dung, email, trang, phiên bản')}">
        <select id="rpArea" aria-label="${T('Mọi khu vực')}"></select>
        <select id="rpCat" aria-label="${T('Mọi loại')}"><option value="">${T('Mọi loại')}</option>${Object.entries(CATS).map(([k, [i, l]]) => `<option value="${k}">${i} ${T(l)}</option>`).join('')}</select>
        <select id="rpPlat" aria-label="${T('Mọi nền tảng')}"><option value="">${T('Mọi nền tảng')}</option>${Object.entries(PLATS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <select id="rpSev" aria-label="${T('Mọi mức')}"><option value="">${T('Mọi mức')}</option>${['P0', 'P1', 'P2', 'P3'].map(v => `<option>${v}</option>`).join('')}</select>
        <select id="rpSort" aria-label="${T('Mới nhất')}"><option value="sev">${T('Ưu tiên (mức → số người)')}</option><option value="new">${T('Mới nhất')}</option><option value="old">${T('Cũ nhất')}</option><option value="upd">${T('Vừa cập nhật')}</option></select>
        <label class="small"><input type="checkbox" id="rpSb"> ${T('Gồm báo lỗi thử (sandbox)')}</label></div>
      <details class="small"><summary>${T('Mốc xử lý dự kiến (giờ)')}</summary><div class="rp-tools" style="margin-top:.4rem"><label>${T('Nghiêm trọng')} <input type="number" id="rpE1" min="1" max="2160" style="width:5.5rem"></label><label>${T('Lỗi thường')} <input type="number" id="rpE2" min="1" max="2160" style="width:5.5rem"></label><label>${T('Nội dung/dịch')} <input type="number" id="rpE3" min="1" max="2160" style="width:5.5rem"></label><button class="btn ghost sm" id="rpEs">${T('Lưu mốc')}</button></div></details>
      <div id="rpBulk"></div><div class="rp-list" id="rpList" aria-live="polite"><p class="muted small">${T('Đang tải…')}</p></div><div id="rpMore"></div></div>`;
    const $ = s => main.querySelector(s);
    const chips = () => {
      const c = data.counts || {}, open = (c.new || 0) + (c.ack || 0) + (c.prog || 0);
      const list = [['open', T('Tất cả đang mở'), open], ...['P0', 'P1'].filter(v => (data.sevs || {})[v]).map(v => ['sev:' + v, v, data.sevs[v]]), ...STS.map(([k, l]) => [k, T(l), c[k] || 0]), ['ideas', T('💡 Đề xuất'), c.ideas || 0], ['spam', T('Spam'), data.spam || 0]];
      $('#rpChips').innerHTML = list.map(([k, l, n]) => `<button type="button" class="rp-chip${(k === 'spam' ? F.spam : !F.spam && F.status === k) ? ' on' : ''}" data-st="${k}" aria-pressed="${(k === 'spam' ? !!F.spam : !F.spam && F.status === k)}">${esc(l)} <b>${num(n)}</b></button>`).join('');
      $('#rpChips').querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const k = b.dataset.st; if (k === 'spam') { F.spam = 1; F.status = ''; } else if (k.startsWith('sev:')) { F.spam = 0; F.status = 'open'; F.sev = k.slice(4); $('#rpSev').value = F.sev; } else { F.spam = 0; F.status = k; if (F.sev && k !== 'open') { F.sev = ''; $('#rpSev').value = ''; } } load(); });
      const a = data.areas || {}, cur = F.area;
      $('#rpArea').innerHTML = `<option value="">${T('Mọi khu vực')}</option>` + Object.entries(AREAS).map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(T(l))}${a[k] ? ' · ' + T('{n} đang mở', { n: a[k] }) : ''}</option>`).join('');
      const badge = document.getElementById('repN'); if (badge) badge.textContent = c.new || '';
    };
    const rowHtml = r => `<div class="rp-row"><input type="checkbox" class="c" data-sel="${esc(r.tid)}" aria-label="${esc(r.tid)}" ${sel.has(r.tid) ? 'checked' : ''}>
        <button type="button" class="rp-open" data-id="${esc(r.tid)}"><span class="rp-tid">${esc(r.tid)}</span>
        <span class="m">${sevChip(r.sev)} <span class="rp-st ${esc(r.status)}">${esc(stName(r.status))}</span>${r.people > 1 ? ` <span class="small">👥 ${esc(T('{n} người gặp', { n: r.people }))}</span>` : ''}${r.feat ? ` <span class="small">· ${esc(T(r.feat === 'approved' ? 'đã duyệt' : r.feat === 'later' ? 'để sau' : r.feat))}</span>` : ''}${r.issue ? ' · 🧑‍💻' : ''} ${(CATS[r.cat] || ['❔'])[0]} <span class="small">${esc(T(AREAS[r.area] || r.area || ''))}</span>${r.dup ? ` · <span class="small">${esc(T('Trùng với {id}', { id: r.dup }))}</span>` : ''}<span class="p">${esc(r.ai_sum || r.msg)}</span></span>
        <span class="r">${esc(PLATS[r.plat] || r.plat || '')} ${esc(r.ver || '')}<br>${esc(r.lang || '')} · ${ago(r.at)}${r.has_shot ? ' · 📎' : ''}${r.notify ? ' · ✉️' : ''}${r.asg ? ' · 👤' + esc(r.asg.split('@')[0]) : ''}</span></button></div>`;
    const bulk = () => {
      if (sel.size < 2) { $('#rpBulk').innerHTML = ''; return; }
      const ids = [...sel];
      $('#rpBulk').innerHTML = `<div class="rp-bulk"><span>${T('Gộp {n} mục đã chọn vào…', { n: ids.length })}</span><select id="rpInto" aria-label="${T('Gộp')}">${ids.map(i => `<option>${esc(i)}</option>`).join('')}</select><button class="btn sm primary" id="rpMg">${T('Gộp')}</button><button class="btn sm ghost" id="rpClr">${T('Bỏ chọn')}</button></div>`;
      $('#rpClr').onclick = () => { sel.clear(); paint(); };
      $('#rpMg').onclick = async () => { const into = $('#rpInto').value, from = ids.filter(i => i !== into); if (!confirm(T('Gộp {a} vào {b}? Người báo (nếu đồng ý nhận thư) sẽ được báo là trùng lặp.', { a: from.join(', '), b: into }))) return; try { await api('merge', { ids: from, into }); sel.clear(); load(); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    };
    const paint = () => {
      $('#rpList').innerHTML = rows.length ? rows.map(rowHtml).join('') : `<p class="muted small">${T('Không có báo lỗi nào khớp bộ lọc.')}</p>`;
      $('#rpMore').innerHTML = rows.length < data.total ? `<button class="btn ghost sm" id="rpMoreB">${T('Xem thêm')} (${num(rows.length)}/${num(data.total)})</button>` : `<p class="small muted">${T('{n} báo lỗi', { n: num(data.total) })}</p>`;
      const mb = $('#rpMoreB'); if (mb) mb.onclick = () => { F.offset = rows.length; load(true); };
      $('#rpList').querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); bulk(); });
      $('#rpList').querySelectorAll('.rp-open').forEach(b => b.onclick = () => drawer(b.dataset.id));
      bulk();
    };
    async function load(more) {
      if (!more) F.offset = 0;
      try { const j = await api('list', { ...F, status: F.spam ? '' : F.status }); data = j; rows = more ? rows.concat(j.rows) : j.rows; chips(); paint(); }
      catch (e) { $('#rpList').innerHTML = `<p class="small bad-t">${esc(T('Lỗi: {e}', { e: e.message }))}</p>`; }
    }
    let tq; $('#rpQ').oninput = () => { clearTimeout(tq); tq = setTimeout(() => { F.q = $('#rpQ').value.trim(); load(); }, 300); };
    $('#rpArea').onchange = e => { F.area = e.target.value; load(); }; $('#rpCat').onchange = e => { F.cat = e.target.value; load(); }; $('#rpPlat').onchange = e => { F.plat = e.target.value; load(); };
    $('#rpSort').onchange = e => { F.sort = e.target.value; load(); }; $('#rpSb').onchange = e => { F.sandbox = e.target.checked ? 1 : 0; load(); }; $('#rpRe').onclick = () => load();
    $('#rpCsv').onclick = async () => { try { const j = await api('export', { ...F, status: F.spam ? '' : F.status }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + j.csv], { type: 'text/csv;charset=utf-8' })); a.download = `lexkite-reports-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    api('cfg').then(c => { $('#rpMode').value = c.notify; if (c.eta) { $('#rpE1').value = c.eta.serious; $('#rpE2').value = c.eta.normal; $('#rpE3').value = c.eta.content; } }).catch(() => {});
    $('#rpEs').onclick = async () => { try { await api('cfg', { eta: { serious: +$('#rpE1').value, normal: +$('#rpE2').value, content: +$('#rpE3').value } }); $('#rpEs').textContent = T('✓ Đã lưu'); } catch (e) { alert(T('Lỗi: {e}', { e: e.message })); } };
    $('#rpSev').onchange = e => { F.sev = e.target.value; load(); };
    $('#rpMode').onchange = async e => { try { await api('cfg', { notify: e.target.value }); } catch (x) { alert(T('Lỗi: {e}', { e: x.message })); } };

    // ---------- Ngăn chi tiết ----------
    let dr = null, dim = null, back = null;
    const closeDr = () => { if (dr) { dr.remove(); dim.remove(); dr = dim = null; document.removeEventListener('keydown', esck); if (back) back.focus(); } };
    const esck = e => { if (e.key === 'Escape') closeDr(); };
    async function drawer(id) {
      closeDr(); back = document.activeElement;
      dim = document.createElement('div'); dim.className = 'rp-dim'; dim.onclick = closeDr;
      dr = document.createElement('aside'); dr.className = 'rp-dr'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', id); dr.tabIndex = -1;
      dr.innerHTML = `<p class="muted small">${T('Đang tải…')}</p>`;
      document.body.append(dim, dr); document.addEventListener('keydown', esck); dr.focus();
      let r; try { r = await api('get', { id }); } catch (e) { dr.innerHTML = `<p class="bad-t">${esc(T('Lỗi: {e}', { e: e.message }))}</p><button class="btn ghost" id="rpX">${T('Đóng')}</button>`; dr.querySelector('#rpX').onclick = closeDr; return; }
      const c = r.ctx || {}, kv = (k, v) => v ? `<dt>${T(k)}</dt><dd>${v}</dd>` : '';
      const page = c.route ? `<a href="/#/${esc(c.route)}" target="_blank" rel="noopener">#/${esc(c.route)}</a>` : '';
      dr.innerHTML = `<div class="rp-head"><h3><span class="rp-tid">${esc(r.tid)}</span> ${sevChip(r.sev)} <span class="rp-st ${esc(r.status)}">${esc(stName(r.status))}</span></h3><button class="btn ghost sm" id="rpX" aria-label="${T('Đóng')}">✕</button></div>
        <div><h4>${T('Trạng thái')}</h4><div class="rp-sts">${STS.map(([k, l]) => `<button type="button" class="rp-chip" data-set="${k}" aria-pressed="${r.status === k}">${esc(T(l))}</button>`).join('')}</div></div>
        <div><h4>${(CATS[r.cat] || ['❔', r.cat])[0]} ${esc(T((CATS[r.cat] || ['', r.cat])[1]))} · ${esc(T(AREAS[r.area] || r.area || ''))} · ${esc(when(r.at))}</h4><div class="msg">${esc(r.msg)}</div>
          ${r.dup ? `<p class="small">${esc(T('Trùng với {id}', { id: r.dup }))}</p>` : ''}${r.dups && r.dups.length ? `<p class="small">${esc(T('Các mục trùng: {ids}', { ids: r.dups.join(', ') }))}</p>` : ''}</div>
        <div class="rp-ai"><h4 style="margin:0">${r.ai && r.ai.by === 'rules' ? T('Phân loại theo luật (AI không sẵn sàng)') : T('🤖 Phân loại AI')} ${r.people > 1 ? `· 👥 ${esc(T('{n} người gặp', { n: r.people }))}` : ''}</h4>
          ${r.ai ? `<p><b>${esc(r.ai.summary_vi || '')}</b></p><p class="small">${sevChip(r.ai.severity)} ${esc(r.ai.area || '')} · ${esc(r.ai.type || '')} · ${esc(T('Độ tin cậy {p}%', { p: Math.round((r.ai.confidence || 0) * 100) }))}${r.ai.needs_human ? ' · ⚠️ ' + esc(T('Cần người duyệt')) : ''}</p>
          ${r.ai.likely_cause ? `<p><b>${T('Nguyên nhân có thể')}:</b> ${esc(r.ai.likely_cause)}</p>` : ''}${r.ai.suggested_fix ? `<p><b>${T('Đề xuất sửa')}:</b> ${esc(r.ai.suggested_fix)}</p>` : ''}${r.ai.duplicate_of ? `<p class="small">${esc(T('AI gợi ý trùng với {id}', { id: r.ai.duplicate_of }))}</p>` : ''}` : `<p class="small muted">${T('Chưa phân loại')}</p>`}
          <div class="rp-tools"><button class="btn ghost sm" id="rpRt">${T('🤖 AI phân loại lại')}</button>${r.issue ? `<a class="btn ghost sm" href="${esc(r.issue)}" target="_blank" rel="noopener">${T('Issue GitHub ↗')}</a>` : r.cat === 'idea' ? '' : `<button class="btn primary sm" id="rpCc">${T('🧑‍💻 Giao Claude Code')}</button>`}</div>
          ${!r.gh && !r.issue && r.cat !== 'idea' ? `<p class="rp-warn">${T('Chưa đặt GH_ISSUES_TOKEN: Cloudflare Pages → Settings → Variables → thêm secret GH_ISSUES_TOKEN (PAT fine-grained, repo lexkiteapp.github.io, quyền Issues: Read & write) rồi triển khai lại.')}</p>` : ''}
          ${r.cat === 'idea' ? `<p class="rp-warn">${T('Đề xuất chỉ giao Claude Code sau khi Duyệt.')}</p><div class="rp-tools"><button class="btn primary sm" data-idea="approve">${T('✅ Duyệt')}</button><button class="btn ghost sm" data-idea="reject">${T('✖ Từ chối')}</button><button class="btn ghost sm" data-idea="later">${T('⏸ Để sau')}</button></div>` : ''}</div>
        <div><h4>${T('Ngữ cảnh')}</h4><dl class="rp-kv">${kv('Trang', page)}${kv('Mã nội dung', esc(c.cid))}${kv('Tên miền (add-on)', esc(c.dom))}${kv('Nền tảng', esc(PLATS[r.plat] || r.plat))}${kv('Phiên bản', esc(r.ver))}${kv('Ngôn ngữ', esc(r.lang))}${kv('Khung nhìn', esc(c.vw ? c.vw + (c.dpr ? ' @' + c.dpr + 'x' : '') : ''))}${kv('Múi giờ', esc(c.tz))}${kv('Trình duyệt', esc(c.ua))}${kv('Đăng nhập', T(r.signed ? 'có' : 'không'))}${r.sandbox ? kv('Thử nghiệm (sandbox)', T('có')) : ''}${kv('Email người báo', r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a> ${T(r.notify ? '(đồng ý nhận cập nhật)' : '(không nhận thư)')}` : '')}</dl></div>
        <div><h4>${T('Lỗi console ({n})', { n: (r.errs || []).length })}</h4>${(r.errs || []).length ? `<pre class="rp-errs">${esc(r.errs.join('\n'))}</pre>` : `<p class="small muted">${T('Không có lỗi console.')}</p>`}</div>
        ${r.has_shot ? `<div class="rp-shot"><h4>${T('Ảnh chụp màn hình')}</h4><button class="btn ghost sm" id="rpShot">🖼 ${T('Xem ảnh')}</button></div>` : ''}
        <div><label for="rpReply"><h4>${T('Phản hồi cho người báo (họ thấy trong trang trạng thái)')}</h4></label><textarea id="rpReply" maxlength="2000">${esc(r.reply || '')}</textarea><button class="btn primary sm" id="rpReplyB" style="margin-top:.4rem">${T('Gửi phản hồi')}</button></div>
        <div><label for="rpNote"><h4>${T('Ghi chú nội bộ (chỉ quản trị thấy)')}</h4></label><textarea id="rpNote" maxlength="2000">${esc(r.note || '')}</textarea><button class="btn ghost sm" id="rpNoteB" style="margin-top:.4rem">${T('Lưu ghi chú')}</button></div>
        <div class="rp-tools"><label class="small">${T('Giao cho')} <select id="rpAsg"><option value="">${T('— chưa giao —')}</option>${(data && data.admins || []).map(a => `<option${a === r.asg ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
          <input id="rpInto2" placeholder="LX-…" aria-label="${T('Gộp vào mã (LX-…)')}" size="9"><button class="btn ghost sm" id="rpMg2">${T('Gộp')}</button>
          <button class="btn ghost sm" id="rpSpam">${r.spam ? T('Không phải spam') : T('Đánh dấu spam')}</button></div>
        <p class="small" id="rpMsg" role="status"></p>
        <div><h4>${T('Lịch sử')}</h4><ul class="rp-ev">${(r.events || []).map(e => `<li>${esc(when(e.at))} · ${esc(String(e.by || '').split('@')[0])} · ${esc(T(ACTS[e.act] || e.act))}${e.note ? ' – ' + esc(e.note) : ''}</li>`).join('')}</ul></div>`;
      const q = s => dr.querySelector(s), msg = (m, ok = true) => { q('#rpMsg').textContent = m; q('#rpMsg').className = 'small ' + (ok ? 'good-t' : 'bad-t'); };
      const run = async (op, body, reopen = true) => { try { const j = await api(op, { id: r.tid, ...body }); msg(j.mailed ? T('✓ Đã lưu · đã gửi thư cho người báo') : T('✓ Đã lưu')); load(); if (reopen) setTimeout(() => drawer(r.tid), 500); } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); } };
      q('#rpX').onclick = closeDr;
      q('#rpRt').onclick = () => run('retriage', {});
      const cc = q('#rpCc'); if (cc) cc.onclick = () => run('claude', {});
      dr.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { if (b.dataset.idea === 'approve' && !confirm(T('Duyệt đề xuất này? Sẽ tạo Issue "feature-approved" (xếp sau mọi lỗi đang mở).'))) return; run('idea', { decision: b.dataset.idea, reply: q('#rpReply').value.trim() || undefined }); });
      dr.querySelectorAll('[data-set]').forEach(b => b.onclick = () => run('set', { status: b.dataset.set }));
      q('#rpReplyB').onclick = () => run('set', { reply: q('#rpReply').value.trim() });
      q('#rpNoteB').onclick = () => run('set', { note: q('#rpNote').value.trim() }, false);
      q('#rpAsg').onchange = e => run('set', { asg: e.target.value }, false);
      q('#rpSpam').onclick = () => run('spam', { spam: !r.spam });
      q('#rpMg2').onclick = async () => { const into = q('#rpInto2').value.trim().toUpperCase(); if (!/^LX-\d+$/.test(into)) return; if (!confirm(T('Gộp {a} vào {b}? Người báo (nếu đồng ý nhận thư) sẽ được báo là trùng lặp.', { a: r.tid, b: into }))) return; try { await api('merge', { ids: [r.tid], into }); load(); drawer(r.tid); } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); } };
      const sb = q('#rpShot'); if (sb) sb.onclick = async () => { sb.disabled = true; try { const j = await api('shot', { id: r.tid }); if (/^data:image\/(jpeg|webp|png);base64,/.test(j.data || '')) { const img = new Image(); img.alt = T('Ảnh chụp màn hình'); img.src = j.data; sb.replaceWith(img); } } catch (e) { msg(T('Lỗi: {e}', { e: e.message }), false); sb.disabled = false; } };
    }
    load();
    const open = new URLSearchParams(location.search).get('r'); if (/^\d{1,9}$/.test(open || '')) drawer('LX-' + (1000 + +open)); // liên kết từ thư báo quản trị
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
        <div class="card kpi"><div class="l">${T('Theo trạng thái')}</div><div class="s">${STS.map(([k, l]) => `<span class="rp-st ${k}">${esc(T(l))} ${num(s.byStatus[k] || 0)}</span>`).join(' ')}</div></div></div>
      <div class="rp-kpis" style="margin-top:.6rem"><div><h4 style="margin:.2rem 0 .4rem">${T('7 ngày qua')}</h4><div class="bars" role="img" aria-label="${esc(s.days7.map(d => d.day + ': ' + d.n).join(', '))}">${s.days7.map(d => `<div title="${esc(d.day)}: ${d.n} ${T('mới')} · ${d.fixed} ${T('đã sửa')}"><i style="height:${Math.max(3, d.n / m7 * 100)}%"></i><small>${esc(d.day.slice(8))}</small></div>`).join('')}</div></div>
        <div><h4 style="margin:.2rem 0 .4rem">${T('Theo khu vực (30 ngày)')}</h4>${s.byArea.length ? s.byArea.slice(0, 8).map(a => `<div class="rp-hbar"><span>${esc(T(AREAS[a.area] || a.area))}</span><span class="b"><i style="width:${a.n / mA * 100}%"></i></span><span>${num(a.n)}</span></div>`).join('') : `<p class="small muted">${T('chưa có')}</p>`}</div></div>`;
    el.querySelector('a[href="#reports"]').onclick = e => { e.preventDefault(); const b = document.querySelector('#tabs [data-tab="reports"]'); if (b) b.click(); };
  }

  window.AdminReports = { render, card, _t: { T, EN } };
})();
