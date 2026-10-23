/* Quản trị → Video → Thư viện ở quy mô lớn (hàng nghìn clip): các mục (Chờ duyệt · Đã duyệt · Đã đăng · Lỗi QA · Lưu trữ) + đếm, nhóm thu gọn được, ngăn "Bộ lọc",
 * lưới ẢO HÓA (≤ ~300 nút DOM, thẻ cao cố định → không nhảy bố cục), phân trang con trỏ qua /api/admin-clips, chọn nhiều O(1) ("chọn tất cả N kết quả" không tải id),
 * thanh thao tác hàng loạt (chia lô 100, tiến độ, tiếp tục khi gián đoạn, kết quả từng clip). Hàm thuần ở AdminClips.pure (scripts/test/clip-bulk.mjs).
 * AdminClips.mount(host, { capi, yapi, L, lang, esc, toast, open }) — capi(op, body) → POST /api/admin-clips. Chữ EN ở bảng EN. */
(function () {
  const EN = {
    'Chờ duyệt': 'To review', 'Đã duyệt': 'Approved', 'Đã đăng': 'Published', 'Lỗi QA': 'QA failed', 'Lưu trữ': 'Archive', 'Tìm tiêu đề, ý chính, mã…': 'Search title, point, id…', 'Sắp xếp': 'Sort', 'Mới nhất': 'Newest', 'Cũ nhất': 'Oldest', 'Điểm QA cao': 'QA high', 'Điểm QA thấp': 'QA low', 'Lịch đăng': 'Schedule', 'Lượt xem': 'Views', 'Tỉ lệ xem hết': 'Completion',
    'Nhóm theo': 'Group by', 'Không nhóm': 'No grouping', 'Mẫu': 'Template', 'Chủ đề / cảnh': 'Topic / scene', 'Ngày': 'Date', 'Tất cả mẫu': 'All templates', 'Bộ lọc': 'Filters', 'Bộ lọc nâng cao': 'Advanced filters', 'Xóa lọc': 'Clear filters', 'Đóng': 'Close', 'Trạng thái': 'Status', 'Tất cả': 'All',
    'QA đạt': 'QA pass', 'QA chưa đạt': 'QA fail', 'Đã duyệt (xếp hàng đăng)': 'Approved (queued)', 'Bị loại': 'Rejected', 'Tạm dừng': 'Paused', 'Gói đăng sẵn sàng': 'Pack ready', 'Đã đăng (dò thấy)': 'Uploaded (detected)', 'Trên web': 'On web', 'Đã tới lịch': 'Schedule due', 'Đã lên lịch': 'Scheduled', 'Chưa xếp lịch': 'Unscheduled',
    'Định dạng': 'Format', 'Loại nội dung': 'Content type', 'Video dài': 'Long videos', 'Chủ đề › chủ đề con': 'Topic › subtopic', 'Kỹ năng': 'Skill', 'Kỳ thi': 'Exam', 'Chưa xác nhận – không xóa.': 'Not confirmed – nothing deleted.', 'Xóa hẳn {n} video: file trên Kho Drive vào thùng rác và bỏ công thức – không hoàn tác. Gõ "{w}" để xác nhận.': 'Permanently delete {n} videos: Drive files go to the trash and the recipe is dropped – cannot be undone. Type "{w}" to confirm.', 'Cảnh/chủ đề': 'Scene/topic', 'Kiểu mở đầu': 'Hook type', 'Người dẫn': 'Host', 'Bối cảnh': 'Background', 'Độ khó': 'Difficulty', 'Kênh YouTube': 'YouTube channel', 'Điểm QA từ': 'QA score from', 'đến': 'to', 'Theo ngày': 'By date', 'Ngày dựng': 'Rendered', 'Ngày lịch đăng': 'Scheduled', 'Từ ngày': 'From', 'Đến ngày': 'To', 'Hiện cả clip bị loại / tạm dừng': 'Show rejected / paused clips',
    'Chế độ xem đã lưu': 'Saved views', 'Lưu bộ lọc hiện tại': 'Save current filters', 'Tên chế độ xem': 'View name', '{n} video': '{n} videos', 'Không có video nào khớp.': 'No videos match.', 'Đang tải…': 'Loading…', 'Không tải được: {e}': 'Could not load: {e}',
    'Chọn trang': 'Select page', 'Chọn tất cả {n} kết quả': 'Select all {n} results', 'Bỏ chọn': 'Clear', '{n} đã chọn': '{n} selected', 'Chọn thao tác…': 'Choose action…', 'Chạy': 'Run',
    'Duyệt & tạo gói đăng': 'Approve & build upload pack', 'Bỏ duyệt': 'Unapprove', 'Bỏ tạm dừng': 'Resume', 'Loại…': 'Reject…', 'Khôi phục': 'Restore', 'Đưa lên web': 'Put on web', 'Gỡ khỏi web': 'Take off web', 'Đổi lịch đăng…': 'Reschedule…', 'Chọn kênh YouTube…': 'Set YouTube channel…', 'Xuất CSV': 'Export CSV', 'Xóa…': 'Delete…',
    'Lý do loại': 'Reason', 'Bắt đầu': 'Start', 'Số ngày': 'Days', 'Từ giờ': 'From', 'Đến giờ': 'To', 'Kênh mặc định': 'Default channel', 'Xóa hẳn (bỏ cả công thức)': 'Delete permanently (also drop the recipe)',
    '{a} cho {n} video?': '{a} for {n} videos?', 'Thao tác nguy hiểm: xóa {n} video. Tiếp tục?': 'Dangerous: delete {n} videos. Continue?', 'Đang chạy {p}/{n}…': 'Running {p}/{n}…', 'Xong: {d} thành công · {f} bỏ qua/lỗi': 'Done: {d} succeeded · {f} skipped/failed', 'Tác vụ dang dở: {a} {p}/{n}': 'Unfinished job: {a} {p}/{n}', 'Tiếp tục': 'Resume', 'Hủy': 'Cancel',
    'Thao tác nhạy cảm: đăng xuất rồi đăng nhập lại, sau đó thử lại.': 'Sensitive action: sign out and sign in again, then retry.', 'Cần nhập lý do loại.': 'A reason is required.', 'Lịch không hợp lệ.': 'Invalid schedule.', 'Chưa chọn video nào.': 'Nothing selected.', 'Đã tải CSV.': 'CSV downloaded.',
    'Chờ duyệt, QA đạt': 'QA passed, awaiting review', 'Chưa có video ở mục này.': 'No videos in this section.',
  };
  const KEYS = ['q', 'type', 'topic', 'skill', 'exam', 'format', 'template', 'scene', 'cefr', 'hook', 'host', 'bg', 'diff', 'channel', 'status', 'section', 'group', 'qmin', 'qmax', 'from', 'to', 'dt', 'hidden', 'sort', 'dir'];
  const NUM = new Set(['qmin', 'qmax']);
  // ---- pure helpers (scripts/test/clip-bulk.mjs) ----
  const pure = {
    /** filter object → URL query (defaults omitted) */
    toQuery(f) { const u = new URLSearchParams(); for (const k of KEYS) { let v = f && f[k]; if (v === '' || v == null || v === false) continue; if ((k === 'sort' && v === 'created') || (k === 'dir' && v === 'desc') || (k === 'dt' && v !== 'slot')) continue; u.set(k, v === true ? '1' : String(v)); } return u.toString(); },
    fromQuery(s) { const u = new URLSearchParams(String(s || '').replace(/^\?/, '')), f = {}; for (const k of KEYS) { if (!u.has(k)) continue; const v = u.get(k); if (v === '') continue; f[k] = NUM.has(k) ? (Number.isFinite(+v) ? +v : undefined) : k === 'hidden' ? v === '1' : v.slice(0, 80); if (f[k] === undefined) delete f[k]; } return f; },
    makeSel() {
      const s = { ids: new Set(), all: false, excl: new Set() };
      s.has = id => (s.all ? !s.excl.has(id) : s.ids.has(id));
      s.toggle = id => { if (s.all) { s.excl.has(id) ? s.excl.delete(id) : s.excl.add(id); } else s.ids.has(id) ? s.ids.delete(id) : s.ids.add(id); };
      s.add = ids => { for (const id of ids) s.all ? s.excl.delete(id) : s.ids.add(id); };
      s.setAll = () => { s.all = true; s.ids.clear(); s.excl.clear(); };
      s.clear = () => { s.all = false; s.ids.clear(); s.excl.clear(); };
      s.count = total => (s.all ? Math.max(0, total - s.excl.size) : s.ids.size);
      return s;
    },
    /** ids between two positions (inclusive) of the displayed order — shift-click range */
    range(order, a, b) { const i = order.indexOf(a), j = order.indexOf(b); if (i < 0 || j < 0) return j < 0 ? [] : [b]; return order.slice(Math.min(i, j), Math.max(i, j) + 1); },
    groupKey(it, g) { return (g === 'date' ? String(it.created || '').slice(0, 10) : g === 'scene' ? it.scene : g === 'template' ? it.template : '') || '–'; },
    csv(rows) { const cols = rows.length ? Object.keys(rows[0]) : [], cell = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }; return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n'); },
  };
  const CSS = `.cl{--g:12px}.cl-tabs{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.6rem}.cl-tab{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .75rem;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;font-size:.85rem;cursor:pointer}.cl-tab[aria-pressed=true]{border-color:var(--primary);background:var(--primary-soft);color:var(--primary-text);font-weight:700}.cl-tab:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.cl-hd{display:flex;flex-wrap:wrap;align-items:center;gap:0 1.2rem;margin-bottom:.2rem}.cl-hd .cl-tabs{margin-bottom:.6rem}.cl-types .cl-tab{padding:.25rem .65rem;font-size:.8rem}.cl-tab i{font-style:normal;font-size:.75rem;color:var(--muted);font-variant-numeric:tabular-nums}
.cl-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.6rem}.cl-row input[type=search]{flex:1 1 220px;min-width:0;min-height:34px}.cl-row select,.cl-row .btn{min-height:34px;max-width:100%}.cl-row select{width:auto;flex:0 1 auto}.cl-n{color:var(--muted);font-size:.8rem;margin-left:auto}
.cl-dr{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:.8rem 1rem;margin-bottom:.6rem}.cl-dr[hidden]{display:none}.cl-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.6rem}.cl-dg label{display:grid;gap:.2rem;font-size:.76rem;color:var(--muted);min-width:0}.cl-dg select,.cl-dg input{min-height:32px;min-width:0;width:100%}.cl-dr .cl-row{margin:.7rem 0 0}
.cl-vp{position:relative;overflow:auto;height:calc(100vh - 300px);min-height:420px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);contain:strict}.cl-in{position:relative;width:100%}.cl-r{position:absolute;left:0;right:0}.cl-h{display:flex;align-items:center;gap:.5rem;padding:0 .8rem;font-weight:600;font-size:.88rem;cursor:pointer;background:var(--surface);border-bottom:1px solid var(--line)}.cl-h i{font-style:normal;color:var(--muted);font-weight:400;font-size:.78rem}
.cl-c{position:absolute;top:0;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden;cursor:pointer;min-width:0}.cl-c.on{outline:2px solid var(--accent);outline-offset:-2px}.cl-th{position:relative;height:170px;flex:none;background:var(--surface-2);display:grid;place-items:center;font-size:1.6rem;overflow:hidden}.cl-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cl-ck{position:absolute;top:6px;left:6px;z-index:2;width:26px;height:26px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--surface) 88%,transparent);cursor:pointer}.cl-ck input{width:16px;height:16px;margin:0;cursor:pointer}
.cl-m{padding:.4rem .55rem;display:grid;gap:.1rem;min-width:0;font-size:.8rem}.cl-m b,.cl-m span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cl-m span{color:var(--muted);font-size:.74rem}.cl-th::after{content:attr(data-qa);position:absolute;right:6px;bottom:6px;font-size:.7rem;padding:.1rem .4rem;border-radius:6px;background:color-mix(in srgb,var(--surface) 88%,transparent)}.cl-th[data-bad]::after{color:var(--bad,#c0392b)}
.cl-bar{position:sticky;bottom:0;z-index:5;margin-top:.6rem;padding:.6rem .8rem;border:1px solid var(--accent);border-radius:12px;background:var(--surface);box-shadow:0 -4px 18px rgba(0,0,0,.12);display:grid;gap:.5rem}.cl-bar[hidden]{display:none}.cl-bar .cl-row{margin:0}.cl-bar progress{width:100%;height:8px}.cl-res{max-height:140px;overflow:auto;font-size:.76rem;color:var(--muted)}
.cl-empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);text-align:center;padding:1rem}@media(max-width:560px){.cl-vp{height:calc(100vh - 340px)}}`;
  function mount(host, ctx) {
    const { capi, esc, toast = () => {} } = ctx, lang = ctx.lang || (() => 'vi'), L = ctx.L || ((s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s));
    const V = (vi, vars) => { let s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : vi; if (lang() !== 'en') return L(vi, vars); return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    if (!document.getElementById('cl-css')) { const st = document.createElement('style'); st.id = 'cl-css'; st.textContent = CSS; document.head.appendChild(st); }
    const LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN'), CH = 262, HH = 36, GAP = 12, PAGE = 60, SECS = ctx.sections || ['pending', 'approved', 'live', 'fail', 'archive']; // ctx.sections: mục hiện ('' = tất cả trừ Lưu trữ)
    const SN = { '': 'Tất cả', pending: 'Chờ duyệt', approved: 'Đã duyệt', live: 'Đã đăng', fail: 'Lỗi QA', archive: 'Lưu trữ' };
    let f = pure.fromQuery(location.search); if (!SECS.includes(f.section || '')) f.section = ctx.section != null ? ctx.section : SECS[0]; if (!f.section) delete f.section;
    const sel = pure.makeSel(), S = { rows: [], total: 0, next: null, counts: {}, facets: {}, groups: {}, busy: false, tok: 0, lay: null, last: null }, collapsed = new Set(), els = new Map(); let channels = [];
    const store = { get(k) { try { return JSON.parse(localStorage.getItem('lk.cl.' + k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem('lk.cl.' + k) : localStorage.setItem('lk.cl.' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
    const num = n => Number(n || 0).toLocaleString(LOC());
    const opts = (vals, cur, all) => `<option value="">${esc(all)}</option>` + vals.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
    const stOpts = [['', 'Tất cả'], ['pass', 'QA đạt'], ['fail', 'QA chưa đạt'], ['approved', 'Đã duyệt (xếp hàng đăng)'], ['rejected', 'Bị loại'], ['paused', 'Tạm dừng'], ['ready', 'Gói đăng sẵn sàng'], ['uploaded', 'Đã đăng (dò thấy)'], ['web', 'Trên web'], ['sched', 'Đã lên lịch'], ['due', 'Đã tới lịch'], ['none', 'Chưa xếp lịch']];
    const sortOpts = [['created:desc', 'Mới nhất'], ['created:asc', 'Cũ nhất'], ['qa:desc', 'Điểm QA cao'], ['qa:asc', 'Điểm QA thấp'], ['slot:asc', 'Lịch đăng'], ['views:desc', 'Lượt xem'], ['completion:desc', 'Tỉ lệ xem hết']];
    host.innerHTML = `<div class="cl"><div class="cl-hd">
      <div class="cl-tabs cl-types" role="group" aria-label="${esc(V('Loại nội dung'))}">${[['', 'Tất cả'], ['short', 'Shorts'], ['long', 'Video dài'], ['podcast', 'Podcast']].map(([k, t]) => `<button class="cl-tab" type="button" data-type="${k}" aria-pressed="false">${esc(V(t))} <i data-tcnt="${k}"></i></button>`).join('')}</div>
      <div class="cl-tabs" role="group" aria-label="${esc(V('Trạng thái'))}"${SECS.length > 1 ? '' : ' hidden'}>${SECS.map(k => `<button class="cl-tab" type="button" data-sec="${k}" aria-pressed="false">${esc(V(SN[k]))} <i data-cnt="${k}">0</i></button>`).join('')}</div></div>
      <div class="cl-row"><input type="search" id="cl-q" placeholder="${esc(V('Tìm tiêu đề, ý chính, mã…'))}" aria-label="${esc(V('Tìm tiêu đề, ý chính, mã…'))}">
        <select id="cl-sort" aria-label="${esc(V('Sắp xếp'))}">${sortOpts.map(([v, t]) => `<option value="${v}">${esc(V(t))}</option>`).join('')}</select>
        <select id="cl-grp" aria-label="${esc(V('Nhóm theo'))}"><option value="">${esc(V('Không nhóm'))}</option><option value="template">${esc(V('Mẫu'))}</option><option value="scene">${esc(V('Chủ đề / cảnh'))}</option><option value="date">${esc(V('Ngày'))}</option></select>
        <select id="cl-tpl" aria-label="${esc(V('Mẫu'))}"></select>
        <button class="btn sm ghost" id="cl-fb" type="button" aria-expanded="false">⚙ ${esc(V('Bộ lọc'))}<span id="cl-fn"></span></button><span class="cl-n" id="cl-n" aria-live="polite"></span></div>
      <div class="cl-dr" id="cl-dr" hidden><div class="cl-dg" id="cl-dg"></div><div class="cl-row"><select id="cl-sv" aria-label="${esc(V('Chế độ xem đã lưu'))}"></select><button class="btn sm ghost" id="cl-svs" type="button">${esc(V('Lưu bộ lọc hiện tại'))}</button><button class="btn sm ghost" id="cl-clr" type="button">${esc(V('Xóa lọc'))}</button><button class="btn sm" id="cl-fx" type="button">${esc(V('Đóng'))}</button></div></div>
      <div class="cl-row"><button class="btn sm ghost" id="cl-pg" type="button">☑ ${esc(V('Chọn trang'))}</button><button class="btn sm ghost" id="cl-all" type="button"></button></div>
      <div class="cl-vp" id="cl-vp" tabindex="0"><div class="cl-in" id="cl-in"></div></div>
      <div class="cl-bar" id="cl-bar" hidden></div></div>`;
    const $ = s => host.querySelector(s), vp = $('#cl-vp'), inn = $('#cl-in');
    const q = () => { const s = pure.toQuery(f); return location.pathname + (s ? '?' + s : '') + location.hash; };
    const sync = () => { try { history.replaceState(null, '', q()); } catch (e) { /* bỏ qua */ } };
    const nActive = () => ['status', 'topic', 'skill', 'exam', 'format', 'scene', 'cefr', 'hook', 'host', 'bg', 'diff', 'channel', 'qmin', 'qmax', 'from', 'to', 'hidden'].filter(k => f[k] !== undefined && f[k] !== '' && f[k] !== false).length;
    // ---- data ----
    async function load(reset) {
      if (S.busy && !reset) return; const tok = reset ? ++S.tok : S.tok; S.busy = true;
      if (reset) { S.rows = []; S.next = null; els.forEach(e => e.remove()); els.clear(); vp.scrollTop = 0; }
      try {
        const r = await capi('query', { filter: f, cursor: reset ? 0 : S.next, limit: PAGE });
        if (tok !== S.tok) return;
        S.rows = reset ? r.rows : S.rows.concat(r.rows); S.total = r.total; S.next = r.next; S.counts = r.counts || S.counts; if (r.facets) S.facets = r.facets; if (r.taxonomy) S.tax = r.taxonomy; if (r.typeCounts) paintTypes(r.typeCounts); if (r.groups) S.groups = r.groups;
        S.err = null;
      } catch (e) { if (tok === S.tok) { S.err = e.message || e.code || 'error'; } }
      S.busy = false; if (tok === S.tok) { head(); relayout(); }
    }
    const reload = () => { sync(); load(true); };
    // ---- virtual grid ----
    const gk = it => pure.groupKey(it, f.group);
    function relayout() {
      const W = vp.clientWidth || 900, cols = Math.max(1, Math.floor((W + GAP) / (190 + GAP))), cw = (W - GAP * (cols - 1)) / cols, rowsV = []; let y = GAP;
      const cards = idx => { for (let i = 0; i < idx.length; i += cols) { rowsV.push({ y, h: CH, cards: idx.slice(i, i + cols) }); y += CH + GAP; } };
      if (!f.group) cards(S.rows.map((_, i) => i));
      else for (let i = 0; i < S.rows.length;) { const k = gk(S.rows[i]), idx = []; let j = i; while (j < S.rows.length && gk(S.rows[j]) === k) idx.push(j++); rowsV.push({ y, h: HH, head: k }); y += HH + 6; if (!collapsed.has(k)) cards(idx); i = j; }
      S.lay = { cols, cw, rowsV, H: y + (S.next != null || S.busy ? 56 : 0) }; inn.style.height = S.lay.H + 'px'; els.forEach(e => e.remove()); els.clear(); paint();
    }
    function cardHtml(it, c) {
      const v = it._v || {}, bad = !it.qa || it.qa.status !== 'pass', on = sel.has(it.id), title = it.title || it.point || it.id, sub = [it.scene, it.template, it.cefr].filter(Boolean).join(' · ');
      const st = v.rejected ? '⛔ ' + (v.reason || V('Bị loại')) : v.paused ? '⏸ ' + V('Tạm dừng') : v.web ? '🌐 ' + V('Trên web') : v.uploaded ? '▶ ' + V('Đã đăng') : v.approved ? '✓ ' + V('Đã duyệt') : v.slot ? '📅 ' + v.slot.date : '';
      return `<div class="cl-c${on ? ' on' : ''}" data-id="${esc(it.id)}" style="left:${c.x}px;width:${c.w}px;height:${CH}px"><div class="cl-ck"><input type="checkbox" data-ck${on ? ' checked' : ''} aria-label="${esc(title)}"></div>
        <div class="cl-th" data-qa="${bad ? '✗' : '✓'} QA${v.score != null ? ' ' + v.score : ''}"${bad ? ' data-bad' : ''}>${it.cover_url ? `<img loading="lazy" decoding="async" alt="" width="${Math.round(c.w)}" height="170" src="${esc(it.cover_url)}">` : '🎬'}</div>
        <div class="cl-m"><b title="${esc(title)}">${esc(title)}</b><span title="${esc(sub)}">${esc(sub) || '&nbsp;'}</span><span title="${esc(st)}">${esc(st) || '&nbsp;'}</span></div></div>`;
    }
    function paint() {
      const lay = S.lay; if (!lay) return; const top = vp.scrollTop, bot = top + (vp.clientHeight || 700), pad = 120, R = lay.rowsV;
      let a = 0, b = R.length - 1; while (a < b) { const m = (a + b) >> 1; R[m].y + R[m].h < top - pad ? (a = m + 1) : (b = m); }
      const keep = new Set(); for (let i = a; i < R.length && R[i].y < bot + pad; i++) {
        keep.add(i); if (els.has(i)) continue; const r = R[i], d = document.createElement('div'); d.className = 'cl-r'; d.style.cssText = `top:${r.y}px;height:${r.h}px`;
        if (r.head != null) { d.innerHTML = `<div class="cl-h" data-g="${esc(r.head)}" role="button" tabindex="0" aria-expanded="${!collapsed.has(r.head)}">${collapsed.has(r.head) ? '▸' : '▾'} ${esc(r.head)} <i>${num((S.groups || {})[r.head] || 0)}</i></div>`; d.firstChild.style.height = r.h + 'px'; }
        else d.innerHTML = r.cards.map((ix, c) => cardHtml(S.rows[ix], { x: c * (lay.cw + GAP), w: lay.cw })).join('');
        inn.appendChild(d); els.set(i, d);
      }
      for (const [i, e] of els) if (!keep.has(i)) { e.remove(); els.delete(i); }
      if (S.next != null && !S.busy && bot + 1500 > lay.H) load(false);
    }
    let raf = 0; vp.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); }, { passive: true });
    if (typeof ResizeObserver !== 'undefined') { let w0 = 0; new ResizeObserver(() => { if (vp.clientWidth && vp.clientWidth !== w0) { w0 = vp.clientWidth; relayout(); } }).observe(vp); }
    // ---- header (tabs, counts, drawer, selection) ----
    function head() {
      host.querySelectorAll('[data-sec]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sec === (f.section || ''))));
      host.querySelectorAll('[data-cnt]').forEach(i => { const k = i.dataset.cnt, c = S.counts || {}; i.textContent = num(k ? c[k] : ['pending', 'approved', 'live', 'fail'].reduce((a, x) => a + (+c[x] || 0), 0)); });
      $('#cl-n').textContent = S.err ? V('Không tải được: {e}', { e: S.err }) : S.busy && !S.rows.length ? V('Đang tải…') : V('{n} video', { n: num(S.total) });
      $('#cl-sort').value = (f.sort || 'created') + ':' + (f.dir || 'desc'); $('#cl-grp').value = f.group || ''; $('#cl-q').value = f.q || '';
      const tp = $('#cl-tpl'); tp.innerHTML = opts((S.facets || {}).template || [], f.template || '', V('Tất cả mẫu'));
      const fn = nActive(); $('#cl-fn').textContent = fn ? ' · ' + fn : '';
      $('#cl-all').textContent = V('Chọn tất cả {n} kết quả', { n: num(S.total) }); $('#cl-all').hidden = !S.total;
      empty(); bar();
    }
    function empty() { let e = inn.querySelector('.cl-empty'); const none = !S.rows.length && !S.busy && !S.err; if (none && !e) { e = document.createElement('div'); e.className = 'cl-empty'; e.textContent = V(f.section ? 'Chưa có video ở mục này.' : 'Không có video nào khớp.'); inn.appendChild(e); } else if (!none && e) e.remove(); }
    function paintTypes(tc) {
      host.querySelectorAll('[data-type]').forEach(b => { const k = b.dataset.type; b.setAttribute('aria-pressed', String((f.type || '') === k)); b.querySelector('i').textContent = num(k ? tc[k] || 0 : Object.values(tc).reduce((a, x) => a + x, 0)); });
    }
    function drawer() {
      const T = S.tax || { topics: [], skills: [], exams: [] }, tsel = (k, lab, list) => `<label>${esc(V(lab))}<select data-f="${k}"><option value="">${esc(V('Tất cả'))}</option>${list.map(([v, n]) => `<option value="${esc(v)}"${f[k] === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
      const en = lang() === 'en', topics = T.topics.flatMap(x => [[x.id, en ? x.en : x.vi], ...x.sub.map(z => [x.id + '/' + z.id, '› ' + (en ? z.en : z.vi)])]);
      const tax = tsel('topic', 'Chủ đề › chủ đề con', topics) + tsel('skill', 'Kỹ năng', T.skills.map(x => [x[0], en ? x[2] : x[1]])) + tsel('exam', 'Kỳ thi', T.exams.map(x => [x, x.toUpperCase()]));
      const F = S.facets || {}, sl = (k, lab) => `<label>${esc(V(lab))}<select data-f="${k}">${opts(F[k] || [], f[k] || '', V('Tất cả'))}</select></label>`;
      $('#cl-dg').innerHTML = `<label>${esc(V('Trạng thái'))}<select data-f="status">${stOpts.map(([v, t]) => `<option value="${v}"${(f.status || '') === v ? ' selected' : ''}>${esc(V(t))}</option>`).join('')}</select></label>
        ${tax}${sl('format', 'Định dạng')}${sl('scene', 'Cảnh/chủ đề')}${sl('cefr', 'CEFR')}${sl('hook', 'Kiểu mở đầu')}${sl('host', 'Người dẫn')}${sl('bg', 'Bối cảnh')}${sl('diff', 'Độ khó')}
        <label>${esc(V('Kênh YouTube'))}<select data-f="channel"><option value="">${esc(V('Tất cả'))}</option>${channels.map(c => `<option value="${esc(c.channel_id)}"${f.channel === c.channel_id ? ' selected' : ''}>${esc(c.title || c.channel_id)}</option>`).join('')}</select></label>
        <label>${esc(V('Điểm QA từ'))}<input type="number" min="0" max="100" data-f="qmin" value="${esc(f.qmin ?? '')}"></label><label>${esc(V('đến'))}<input type="number" min="0" max="100" data-f="qmax" value="${esc(f.qmax ?? '')}"></label>
        <label>${esc(V('Theo ngày'))}<select data-f="dt"><option value="">${esc(V('Ngày dựng'))}</option><option value="slot"${f.dt === 'slot' ? ' selected' : ''}>${esc(V('Ngày lịch đăng'))}</option></select></label>
        <label>${esc(V('Từ ngày'))}<input type="date" data-f="from" value="${esc(f.from || '')}"></label><label>${esc(V('Đến ngày'))}<input type="date" data-f="to" value="${esc(f.to || '')}"></label>
        <label style="grid-column:1/-1;flex-direction:row;display:flex;align-items:center;gap:.4rem"><input type="checkbox" data-f="hidden" style="width:auto"${f.hidden ? ' checked' : ''}> ${esc(V('Hiện cả clip bị loại / tạm dừng'))}</label>`;
      const views = store.get('views') || []; $('#cl-sv').innerHTML = `<option value="">${esc(V('Chế độ xem đã lưu'))}</option>` + views.map((v, i) => `<option value="${i}">${esc(v.name)}</option>`).join('');
    }
    // ---- events ----
    let deb = 0; $('#cl-q').oninput = e => { clearTimeout(deb); deb = setTimeout(() => { f.q = e.target.value.trim() || undefined; if (!f.q) delete f.q; reload(); }, 180); };
    host.querySelectorAll('[data-sec]').forEach(b => { b.onclick = () => { if (b.dataset.sec) f.section = b.dataset.sec; else delete f.section; sel.clear(); reload(); }; });
    $('#cl-sort').onchange = e => { const [s, d] = e.target.value.split(':'); f.sort = s; f.dir = d; reload(); };
    $('#cl-grp').onchange = e => { f.group = e.target.value || undefined; if (!f.group) delete f.group; collapsed.clear(); reload(); };
    host.querySelectorAll('[data-type]').forEach(b => { b.onclick = () => { if (b.dataset.type) f.type = b.dataset.type; else delete f.type; host.querySelectorAll('[data-type]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); reload(); }; });
    $('#cl-tpl').onchange = e => { f.template = e.target.value || undefined; if (!f.template) delete f.template; reload(); };
    $('#cl-fb').onclick = () => { const d = $('#cl-dr'); d.hidden = !d.hidden; $('#cl-fb').setAttribute('aria-expanded', String(!d.hidden)); if (!d.hidden) drawer(); };
    $('#cl-fx').onclick = () => { $('#cl-dr').hidden = true; $('#cl-fb').setAttribute('aria-expanded', 'false'); };
    $('#cl-dg').onchange = e => { const k = e.target.dataset.f; if (!k) return; const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (v === '' || v === false) delete f[k]; else f[k] = NUM.has(k) ? +v : v; reload(); };
    $('#cl-clr').onclick = () => { f = f.section ? { section: f.section } : {}; reload(); drawer(); };
    $('#cl-svs').onclick = () => { const name = (prompt(V('Tên chế độ xem')) || '').trim().slice(0, 40); if (!name) return; const views = (store.get('views') || []).filter(v => v.name !== name); views.push({ name, q: pure.toQuery(f) }); store.set('views', views.slice(-20)); drawer(); };
    $('#cl-sv').onchange = e => { const v = (store.get('views') || [])[+e.target.value]; if (!v) return; f = pure.fromQuery(v.q); if (!SECS.includes(f.section || '')) f.section = ctx.section != null ? ctx.section : SECS[0]; if (!f.section) delete f.section; reload(); drawer(); };
    inn.addEventListener('click', e => {
      const g = e.target.closest('[data-g]'); if (g) { const k = g.dataset.g; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); relayout(); return; }
      const c = e.target.closest('.cl-c'); if (!c) return; const id = c.dataset.id;
      if (e.target.closest('.cl-ck')) {
        if (e.shiftKey && S.last && e.target.matches('input')) sel.add(pure.range(S.rows.map(r => r.id), S.last, id)); else if (e.target.matches('input')) sel.toggle(id); else return;
        S.last = id; refresh(); return;
      }
      const it = S.rows.find(r => r.id === id); if (it && ctx.open) ctx.open(it);
    });
    inn.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.g) { e.preventDefault(); e.target.click(); } });
    $('#cl-pg').onclick = () => { sel.add(S.rows.map(r => r.id)); refresh(); };
    $('#cl-all').onclick = () => { sel.setAll(); refresh(); };
    function refresh() { inn.querySelectorAll('.cl-c').forEach(c => { const on = sel.has(c.dataset.id); c.classList.toggle('on', on); c.querySelector('[data-ck]').checked = on; }); bar(); }
    // ---- bulk bar ----
    const ACT = [['approve', 'Duyệt & tạo gói đăng'], ['unapprove', 'Bỏ duyệt'], ['pause', 'Tạm dừng'], ['resume', 'Bỏ tạm dừng'], ['reject', 'Loại…'], ['restore', 'Khôi phục'], ['web_on', 'Đưa lên web'], ['web_off', 'Gỡ khỏi web'], ['reschedule', 'Đổi lịch đăng…'], ['channel', 'Chọn kênh YouTube…'], ['csv', 'Xuất CSV'], ['delete', 'Xóa…']];
    const tomorrow = () => new Date(Date.now() + 7 * 3600e3 + 864e5).toISOString().slice(0, 10);
    let job = store.get('job'), running = false;
    function bar() {
      const b = $('#cl-bar'), n = sel.count(S.total); if (running) return;
      if (!n && !job) { b.hidden = true; return; } b.hidden = false;
      if (!n && job) { b.innerHTML = `<div class="cl-row"><span>${esc(V('Tác vụ dang dở: {a} {p}/{n}', { a: V((ACT.find(a => a[0] === job.action) || [0, job.action])[1]), p: job.pos, n: job.ids.length }))}</span><button class="btn sm primary" id="cl-jr" type="button">${esc(V('Tiếp tục'))}</button><button class="btn sm ghost" id="cl-jc" type="button">${esc(V('Hủy'))}</button></div>`; $('#cl-jr').onclick = () => exec(job); $('#cl-jc').onclick = () => { job = null; store.set('job', null); bar(); }; return; }
      const cur = b.querySelector('#cl-act') ? b.querySelector('#cl-act').value : '';
      b.innerHTML = `<div class="cl-row"><b>${esc(V('{n} đã chọn', { n: num(n) }))}</b><button class="btn sm ghost" id="cl-bx" type="button">${esc(V('Bỏ chọn'))}</button>
        <select id="cl-act" aria-label="${esc(V('Chọn thao tác…'))}"><option value="">${esc(V('Chọn thao tác…'))}</option>${ACT.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(V(t))}</option>`).join('')}</select><span id="cl-prm" class="cl-row" style="margin:0"></span><button class="btn sm primary" id="cl-go" type="button">${esc(V('Chạy'))}</button></div><div id="cl-pr"></div>`;
      $('#cl-bx').onclick = () => { sel.clear(); refresh(); };
      const act = $('#cl-act'), prm = () => {
        const a = act.value, p = $('#cl-prm');
        p.innerHTML = a === 'reject' ? `<input id="p-reason" maxlength="200" placeholder="${esc(V('Lý do loại'))}" aria-label="${esc(V('Lý do loại'))}">`
          : a === 'reschedule' ? `<label>${esc(V('Bắt đầu'))} <input type="date" id="p-start" value="${tomorrow()}"></label><label>${esc(V('Số ngày'))} <input type="number" id="p-days" min="1" max="365" value="7" style="width:70px"></label><label>${esc(V('Từ giờ'))} <input type="time" id="p-from" value="09:00"></label><label>${esc(V('Đến giờ'))} <input type="time" id="p-to" value="21:00"></label>`
          : a === 'channel' ? `<select id="p-ch"><option value="">${esc(V('Kênh mặc định'))}</option>${channels.map(c => `<option value="${esc(c.channel_id)}">${esc(c.title || c.channel_id)}</option>`).join('')}</select>`
          : a === 'delete' ? `<label><input type="checkbox" id="p-hard"> ${esc(V('Xóa hẳn (bỏ cả công thức)'))}</label>` : '';
      };
      act.onchange = prm; prm();
      $('#cl-go').onclick = () => {
        const a = act.value; if (!a) return; const p = {};
        if (a === 'reject') { p.reason = ($('#p-reason').value || '').trim(); if (!p.reason) return toast(V('Cần nhập lý do loại.')); }
        if (a === 'reschedule') { Object.assign(p, { start: $('#p-start').value, days: +$('#p-days').value, from: $('#p-from').value, to: $('#p-to').value }); if (!p.start || !(p.days >= 1) || !p.from || !p.to || p.to < p.from) return toast(V('Lịch không hợp lệ.')); }
        if (a === 'channel') p.channel_id = $('#p-ch').value;
        if (a === 'delete') p.hard = $('#p-hard').checked;
        const n2 = sel.count(S.total), label = V((ACT.find(x => x[0] === a) || [0, a])[1]);
        if (a === 'delete' && p.hard) { const want = 'DELETE ' + n2, got = prompt(V('Xóa hẳn {n} video: file trên Kho Drive vào thùng rác và bỏ công thức – không hoàn tác. Gõ "{w}" để xác nhận.', { n: num(n2), w: want })); if (got !== want) return toast(V('Chưa xác nhận – không xóa.')); Object.assign(p, { confirm: want, total: n2 }); }
        if (!confirm(a === 'delete' ? V('Thao tác nguy hiểm: xóa {n} video. Tiếp tục?', { n: num(n2) }) : V('{a} cho {n} video?', { a: label, n: num(n2) }))) return;
        exec({ action: a, params: p, ids: null, pos: 0 });
      };
    }
    async function ids() { if (!sel.all) return [...sel.ids]; const r = await capi('ids', { filter: f }); return r.ids.filter(id => !sel.excl.has(id)); }
    async function exec(j) {
      if (running) return; running = true; const b = $('#cl-bar'); b.hidden = false;
      const tally = { done: 0, failed: 0, fails: [] };
      try {
        if (!j.ids) j.ids = await ids(); if (!j.ids.length) { toast(V('Chưa chọn video nào.')); return; }
        const total = j.ids.length, prog = () => { b.innerHTML = `<div class="cl-row"><span>${esc(V('Đang chạy {p}/{n}…', { p: num(j.pos), n: num(total) }))}</span></div><progress max="${total}" value="${j.pos}"></progress><div class="cl-res" id="cl-rs"></div>`; };
        if (j.action === 'csv') {
          const rows = []; for (; j.pos < total; j.pos += 300) { prog(); rows.push(...(await capi('export', { ids: j.ids.slice(j.pos, j.pos + 300) })).rows); }
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + pure.csv(rows)], { type: 'text/csv' })); a.download = 'lexkite-clips-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(V('Đã tải CSV.'));
        } else {
          if (total <= 5000) store.set('job', { action: j.action, params: j.params, ids: j.ids, pos: j.pos }); job = j;
          while (j.pos < total) {
            prog(); const chunk = j.ids.slice(j.pos, j.pos + 100);
            let r; try { r = await capi('bulk', { action: j.action, ids: chunk, params: { ...j.params, offset: j.pos, total } }); }
            catch (e) { toast(e.code === 'reauth' ? V('Thao tác nhạy cảm: đăng xuất rồi đăng nhập lại, sau đó thử lại.') : V('Không tải được: {e}', { e: e.code || e.message })); store.set('job', { action: j.action, params: j.params, ids: j.ids, pos: j.pos }); return; }
            j.pos += chunk.length; store.set('job', total <= 5000 ? { action: j.action, params: j.params, ids: j.ids, pos: j.pos } : null);
            for (const x of r.results || []) { if (x.ok) tally.done++; else { tally.failed++; if (tally.fails.length < 15) tally.fails.push(x.id + ': ' + x.why); } }
          }
          job = null; store.set('job', null);
          toast(V('Xong: {d} thành công · {f} bỏ qua/lỗi', { d: num(tally.done), f: num(tally.failed) }));
        }
        sel.clear(); running = false; reload(); if (tally.fails.length) { const bb = $('#cl-bar'); bb.hidden = false; bb.innerHTML = `<div class="cl-res">${tally.fails.map(esc).join('<br>')}</div><button class="btn sm ghost" id="cl-ok" type="button">${esc(V('Đóng'))}</button>`; $('#cl-ok').onclick = () => bar(); }
      } catch (e) { toast(V('Không tải được: {e}', { e: e.code || e.message })); } finally { running = false; if (!$('#cl-ok')) bar(); }
    }
    // ---- start ----
    if (ctx.yapi) ctx.yapi('status').then(s => { channels = (s.channels || []).filter(c => c.status === 'ok'); }).catch(() => {});
    head(); load(true);
    return { filter: () => f, state: S, sel, reload };
  }
  window.AdminClips = { mount, pure };
})();
