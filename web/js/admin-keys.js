/* Quản trị → "Khóa API": kho khóa nhà cung cấp (Gemini, Groq, OpenRouter, Resend, Brevo, Cloudflare…) – docs/API-KEYS.md.
 * Tải lười khi mở tab (admin.js). AdminKeys.render(container, kapi, L, { esc, num, when, lang }) – kapi(op, body) → /api/keys (functions/api/keys.js).
 * Thẻ tổng hợp theo nhà cung cấp, băng cảnh báo (0 khóa sống / < 20 % dung lượng), dán nhiều khóa (tự nhận diện theo tiền tố, ô che,
 * lưu mã hóa ngay rồi xóa ô – không bao giờ hiện lại giá trị), bảng lọc/sắp xếp/phân trang (trạng thái lọc lưu trên #keys?…),
 * thao tác hàng loạt (kiểm, bật/tắt, trọng số, xóa – xác nhận + đăng nhập lại), xuất CSV (không có khóa), nhật ký thao tác. */
(function () {
  const EN = {
    '🔑 Khóa API': '🔑 API keys', 'Kho khóa của các nhà cung cấp AI & thư. Khóa được mã hóa (AES-GCM) ngay khi lưu; trang này chỉ thấy 4 ký tự cuối.': 'Provider keys for AI & mail. Keys are encrypted (AES-GCM) as soon as they are saved; this page only ever sees the last 4 characters.',
    '🩺 Kiểm tất cả': '🩺 Test all', '⬇️ Xuất CSV': '⬇️ Export CSV', '🔄 Tải lại': '🔄 Reload', 'Đang tải…': 'Loading…', 'Lỗi: {e}': 'Error: {e}', 'Kiểm gần nhất: {t}': 'Last health check: {t}', 'chưa kiểm': 'never checked',
    '⚙️ Chưa cấu hình mã hóa khóa': '⚙️ Key encryption is not set up', 'Thiếu secret {k}. Khóa trong biến môi trường vẫn hiện dạng chỉ đọc; muốn thêm khóa ở đây:': 'Missing secret {k}. Keys from environment variables still show as read-only; to add keys here:',
    'Tạo khóa 32 byte: {c}': 'Generate a 32-byte key: {c}', 'Cloudflare → Pages → lexkite → Settings → Variables and Secrets (Production) → thêm secret {k} → triển khai lại.': 'Cloudflare → Pages → lexkite → Settings → Variables and Secrets (Production) → add secret {k} → redeploy.',
    'Danh sách Gemini cũ (Cài đặt) sẽ tự được nhập và mã hóa.': 'The old Gemini list (Settings) is imported and encrypted automatically.',
    'Cảnh báo': 'Alerts', 'sống': 'live', 'chết': 'dead', 'hết lượt': 'quota', 'đã tắt': 'disabled', 'Hôm nay {u} / {c} lượt': 'Today {u} / {c} calls', 'Hôm nay {u} lượt': 'Today {u} calls', '{n} lỗi / 24 h': '{n} errors / 24 h', 'còn {p}%': '{p}% left',
    '➕ Thêm khóa': '➕ Add keys', 'Nhà cung cấp': 'Provider', 'Tự nhận diện': 'Auto-detect', 'Nhãn (tùy chọn)': 'Label (optional)', 'Trọng số': 'Weight', 'Dán khóa – mỗi dòng 1 khóa': 'Paste keys – one per line',
    'Hiện': 'Show', 'Lưu & kiểm': 'Save & test', 'Nhận diện: {s}': 'Detected: {s}', 'không rõ': 'unknown', 'Đang lưu…': 'Saving…',
    '✓ Đã thêm {n} khóa': '✓ Added {n} key(s)', 'bỏ qua {n}': 'skipped {n}', 'dòng {l}: {r}': 'line {l}: {r}', 'trùng': 'duplicate', 'sai định dạng': 'bad format', 'không nhận ra nhà cung cấp': 'unknown provider',
    'Khóa chỉ đi tới máy chủ qua HTTPS, được mã hóa rồi xóa khỏi ô này. Tiền tố: AIza/AQ. (Gemini), gsk_ (Groq), sk-or- (OpenRouter), re_ (Resend), xkeysib- (Brevo); token Cloudflare: chọn nhà cung cấp.': 'Keys travel to the server over HTTPS only, get encrypted, and are cleared from this box. Prefixes: AIza/AQ. (Gemini), gsk_ (Groq), sk-or- (OpenRouter), re_ (Resend), xkeysib- (Brevo); Cloudflare tokens: pick the provider.',
    'Tất cả': 'All', 'Sống': 'Live', 'Chết': 'Dead', 'Hết lượt': 'Quota', 'Đã tắt': 'Disabled', 'Biến env': 'Env', 'Mọi nhà cung cấp': 'All providers', '🔎 Tìm nhãn, 4 số cuối, id…': '🔎 Search label, last 4, id…', 'Tìm khóa': 'Search keys',
    'Mới thêm': 'Newest', 'Lượt hôm nay': 'Uses today', 'Lần OK cuối': 'Last OK', 'Lỗi': 'Errors', 'Sắp xếp': 'Sort', 'Đảo chiều': 'Reverse order',
    'Đã chọn {n}': '{n} selected', 'Kiểm ngay': 'Test now', 'Bật': 'Enable', 'Tắt': 'Disable', 'Đặt trọng số': 'Set weight', 'Xóa': 'Delete', 'Chọn tất cả': 'Select all', 'Chọn': 'Select',
    'Nhãn': 'Label', 'Khóa': 'Key', 'Trạng thái': 'Status', 'Dùng hôm nay': 'Used today', 'OK cuối': 'Last OK', 'Lỗi cuối': 'Last error', 'Thêm lúc': 'Added', 'Không có khóa nào khớp bộ lọc.': 'No keys match the filters.',
    'chỉ đọc (env)': 'read-only (env)', 'chỉ đọc (cũ)': 'read-only (legacy)', 'nghỉ đến {t}': 'cooling until {t}', 'Trang {p}/{n} · {t} khóa': 'Page {p}/{n} · {t} keys', '‹ Trước': '‹ Prev', 'Sau ›': 'Next ›',
    'Trọng số mới (0–1000, 0 = không dùng):': 'New weight (0–1000, 0 = never used):', 'Xóa vĩnh viễn {n} khóa? Khóa trong biến env không xóa được (chỉ tắt).\nGõ DELETE để xác nhận:': 'Permanently delete {n} key(s)? Env keys cannot be deleted (only disabled).\nType DELETE to confirm:',
    'Chưa xóa gì.': 'Nothing was deleted.', '✓ Đã xóa {n}': '✓ Deleted {n}', '✓ Đã cập nhật': '✓ Updated', '✓ Đã kiểm {n} khóa': '✓ Tested {n} key(s)', 'Thao tác quá nhanh – thử lại sau 1 phút': 'Too fast – try again in a minute',
    'Chưa cấu hình KEYS_ENC_KEY': 'KEYS_ENC_KEY is not configured', 'Không dán khóa vào nhãn/ghi chú': 'Do not paste keys into labels/notes',
    '🧮 Sức chứa AI việc nền': '🧮 Background AI capacity', 'Tuyến': 'Route', 'Khóa sống': 'Keys live', 'Lượt/ngày (ước)': 'Calls/day (est.)',
    'Hàng đợi: {g} lượt soạn ({o} chỉ Gemini/gpt-oss) + {j} lượt chấm · từ: {w} từ, {x} câu lời giải, {sc} kịch bản': 'Queue: {g} generation calls ({o} Gemini/gpt-oss only) + {j} judging calls · words: {w}, explanation questions: {x}, scripts: {sc}',
    '≈ {d} ngày để xong hàng đợi với {k} khóa Gemini sống': '≈ {d} days to finish the queue with {k} live Gemini keys', 'Giới hạn hiện tại: kích thước lượt hằng ngày của việc nền (không phải khóa)': 'Current limit: daily run size of the jobs (not keys)', 'Không xong được: không tuyến soạn nào sống (Gemini / GrabCast gpt-oss / tài khoản 2)': 'Cannot finish: no live generation route (Gemini / GrabCast gpt-oss / account 2)',
    'Thêm khóa → số ngày': 'More keys → days', 'Mỗi khóa phải từ một dự án Google Cloud riêng. Số đo {t}; sinh bởi scripts/ai-capacity.mjs.': 'Each key must come from its own Google Cloud project. Measured {t}; generated by scripts/ai-capacity.mjs.', 'chưa có số liệu sức chứa (scripts/ai-capacity.mjs)': 'no capacity data yet (scripts/ai-capacity.mjs)',
    '📜 Nhật ký thao tác': '📜 Audit log', 'Lúc': 'Time', 'Người': 'Who', 'Thao tác': 'Action', 'Chi tiết': 'Details', 'Chưa có thao tác': 'No actions yet', 'Ghi chú': 'Notes', 'Sửa nhãn/ghi chú': 'Edit label/notes', 'Nhãn mới:': 'New label:', 'Ghi chú:': 'Notes:',
  };
  const ST = { live: ['ok', 'Sống'], dead: ['bad', 'Chết'], quota: ['warn', 'Hết lượt'], disabled: ['muted', 'Đã tắt'] };
  // Nhận diện phía máy khách (chỉ để xem trước số lượng) – PHẢI khớp PROVIDERS trong functions/api/_keys.js (scripts/test/keys.mjs kiểm)
  const RE = [['anthropic', /^sk-ant-[\w-]{20,}$/], ['openrouter', /^sk-or-(v1-)?[A-Za-z0-9]{20,}$/], ['gemini', /^(AIza[\w-]{30,}|AQ\.[\w.-]{20,})$/], ['groq', /^gsk_[A-Za-z0-9]{20,}$/], ['resend', /^re_[A-Za-z0-9_]{16,}$/], ['brevo', /^xkeysib-[a-f0-9]{32,}-[A-Za-z0-9]{8,}$/], ['openai', /^sk-(proj-|svcacct-)?[\w-]{20,}$/]];
  const clean = l => { let s = String(l || '').trim(); const m = s.match(/^[A-Z][A-Z0-9_]{1,40}\s*[=:]\s*(.+)$/); if (m) s = m[1].trim(); return s.replace(/^["'`]+|["'`,;]+$/g, '').trim(); };
  const detect = k => { k = clean(k); const x = RE.find(([, re]) => re.test(k)); return x ? x[0] : ''; };
  const SORTS = [['created', 'Mới thêm'], ['uses', 'Lượt hôm nay'], ['last_ok', 'Lần OK cuối'], ['errors', 'Lỗi']];
  const readHash = () => { const i = location.hash.indexOf('?'), q = new URLSearchParams(i >= 0 ? location.hash.slice(i + 1) : ''); return { provider: q.get('p') || '', status: q.get('s') || '', q: q.get('q') || '', sort: q.get('sort') || 'created', dir: q.get('dir') === 'asc' ? 'asc' : 'desc', page: +q.get('page') || 1 }; };
  const writeHash = f => { const q = new URLSearchParams(); if (f.provider) q.set('p', f.provider); if (f.status) q.set('s', f.status); if (f.q) q.set('q', f.q); if (f.sort !== 'created') q.set('sort', f.sort); if (f.dir === 'asc') q.set('dir', 'asc'); if (f.page > 1) q.set('page', f.page); const s = q.toString(); try { history.replaceState(null, '', '#keys' + (s ? '?' + s : '')); } catch (e) { /* bỏ qua */ } };
  let gen = 0, css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.kk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem;margin-top:1rem}.kk-card h4{margin:0 0 .3rem}.kk-mask{-webkit-text-security:disc;font-family:ui-monospace,monospace;width:100%;min-height:6rem}.kk-mask.show{-webkit-text-security:none}
      .kk-alert{border-left:4px solid #d97706;padding:.6rem .8rem;margin:.4rem 0;border-radius:6px;background:rgba(217,119,6,.08)}.kk-alert.crit{border-color:#dc2626;background:rgba(220,38,38,.08)}.pill.bad{background:rgba(220,38,38,.12);color:#b91c1c}
      .kk-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.8rem 0}.kk-bar select,.kk-bar input[type=search]{max-width:14rem}.kk-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.6rem}.kk-form .wide{grid-column:1/-1}.kk-tbl td,.kk-tbl th{white-space:nowrap}.kk-tbl td.lb{white-space:normal;min-width:9rem}`;
    document.head.appendChild(s);
  }
  function render(box, kapi, L, h) {
    const esc = h.esc, num = h.num || (n => String(n)), lang = h.lang || (() => 'vi'), when = h.when || (t => (t ? new Date(t).toLocaleString() : '–')), my = ++gen;
    const S = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const f = readHash(); let sel = new Set(), D = null, note = '';
    style();
    const ERR = { 'not-configured': 'Chưa cấu hình KEYS_ENC_KEY', 'too-fast': 'Thao tác quá nhanh – thử lại sau 1 phút', 'secret-in-label': 'Không dán khóa vào nhãn/ghi chú', 'secret-in-notes': 'Không dán khóa vào nhãn/ghi chú' };
    const msgOf = e => S(ERR[e.code] || 'Lỗi: {e}', { e: e.code || e.message });
    const load = () => { writeHash(f); return kapi('list', f).then(d => { if (my !== gen) return; D = d; draw(); }).catch(e => { if (my === gen) box.innerHTML = `<div class="card"><p class="small">${esc(msgOf(e))}</p></div>`; }); };
    box.innerHTML = `<div class="card"><p class="small muted">${S('Đang tải…')}</p></div>`;
    load();

    // Thẻ sức chứa (docs/API-KEYS.md §9): /data/ai-capacity.json (repo: hàng đợi + số đo) × số khóa Gemini SỐNG trong kho (trang này) – công thức = scripts/ai-capacity.mjs daysFor
    let CAP;
    const capDays = (k, c) => { const M = c.measured, W = c.workload, T = W.total, flash = k * M.gemini.flashRpdPerKey * M.gemini.flashModels, lite = k * M.gemini.liteRpdPerKey;
      const gc = Math.max(0, M['gc-cf'].ciCallsPerDay * M['gc-cf'].keep - M['gc-cf'].vocabImgShare), cf2 = /^chờ/.test(M.cf2.status) ? 0 : M.cf2.grants / M.cf2.neuronsPerCall, J = M.jobs || {};
      const api = Math.max(T.genGeminiOnly / Math.max(1e-9, flash + gc + cf2), (T.gen + T.judge) / Math.max(1e-9, flash + lite + gc + cf2));
      const job = J.lexiconWordsPerDay ? Math.max(W.lexicon.words / J.lexiconWordsPerDay, (W.explain.gen + W.explain.judgeA) / J.explainCallsPerDay, W.scriptBank.scripts / J.scriptsPerDay) : 0;
      const d = Math.max(api, job); return Number.isFinite(d) && d < 1e5 ? d : null; };
    function capCard() {
      if (CAP === undefined) { CAP = null; fetch('/data/ai-capacity.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : false)).catch(() => false).then(c => { CAP = c; const el = box.querySelector('#kkCap'); if (el && my === gen) el.innerHTML = capCard(); }); return ''; }
      if (!CAP) return CAP === false ? `<div class="card" style="margin-top:1rem"><p class="small muted">${S('chưa có số liệu sức chứa (scripts/ai-capacity.mjs)')}</p></div>` : '';
      const c = CAP, M = c.measured, W = c.workload, g = ((D && D.summary) || []).find(x => x.provider === 'gemini') || {}, k = g.usable ?? g.live ?? 0, d = capDays(k, c);
      const gc = Math.max(0, M['gc-cf'].ciCallsPerDay * M['gc-cf'].keep - M['gc-cf'].vocabImgShare), cf2ok = !/^chờ/.test(M.cf2.status);
      const rows = [['Gemini (kho Lexkite)', k, num(k * (M.gemini.flashRpdPerKey * M.gemini.flashModels + M.gemini.liteRpdPerKey)), M.gemini.note],
        ['GrabCast · Groq + Cloudflare', M['gc-cf'].keys + M['gc-groq'].keys, num(Math.round(gc)), M['gc-cf'].model + ' – ' + M['gc-cf'].note],
        ['Workers AI tài khoản 2', cf2ok ? 1 : 0, num(cf2ok ? Math.round(M.cf2.grants / M.cf2.neuronsPerCall) : 0), M.cf2.model + ' – ' + M.cf2.status],
      ];
      const tbl = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${S('Tuyến')}</th><th>${S('Khóa sống')}</th><th>${S('Lượt/ngày (ước)')}</th><th>${S('Ghi chú')}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${num(r[1])}</td><td>${r[2]}</td><td class="small muted">${esc(r[3])}</td></tr>`).join('')}</tbody></table></div>`;
      const more = [1, 5, 10, 20].map(n => `${n} → ${capDays(n, c) == null ? '∞' : capDays(n, c).toFixed(1)}`).join(' · ');
      return `<div class="card" style="margin-top:1rem"><h4 style="margin:0 0 .3rem">${S('🧮 Sức chứa AI việc nền')}</h4>
        <p class="${d == null ? '' : 'small'}" style="margin:.2rem 0"><b>${d == null ? '⛔ ' + S('Không xong được: không tuyến soạn nào sống (Gemini / GrabCast gpt-oss / tài khoản 2)') : S('≈ {d} ngày để xong hàng đợi với {k} khóa Gemini sống', { d: d.toFixed(1), k })}</b></p>
        <p class="small muted" style="margin:.2rem 0">${S('Hàng đợi: {g} lượt soạn ({o} chỉ Gemini/gpt-oss) + {j} lượt chấm · từ: {w} từ, {x} câu lời giải, {sc} kịch bản', { g: num(W.total.gen), o: num(W.total.genGeminiOnly), j: num(W.total.judge), w: num(W.lexicon.words), x: num(W.explain.items), sc: num(W.scriptBank.scripts) })}</p>
        ${d != null && Math.abs(d - (capDays(k + 20, c) || 0)) < 0.05 ? `<p class="small muted" style="margin:.2rem 0">${S('Giới hạn hiện tại: kích thước lượt hằng ngày của việc nền (không phải khóa)')}</p>` : ''}${tbl}<p class="small" style="margin:.4rem 0 0">${S('Thêm khóa → số ngày')}: ${more}</p><p class="tiny muted" style="margin:.2rem 0 0">${S('Mỗi khóa phải từ một dự án Google Cloud riêng. Số đo {t}; sinh bởi scripts/ai-capacity.mjs.', { t: esc(M._at) })}</p></div>`;
    }
    function draw() {
      const d = D, P = d.providers || {}, pname = p => (P[p] && P[p].name) || p, code = s => `<code style="word-break:break-all">${esc(s)}</code>`;
      const guide = d.configured.enc ? '' : `<div class="card" style="margin-top:1rem;border-left:4px solid #d97706"><h3 style="margin-top:0">${S('⚙️ Chưa cấu hình mã hóa khóa')}</h3><p class="small">${S('Thiếu secret {k}. Khóa trong biến môi trường vẫn hiện dạng chỉ đọc; muốn thêm khóa ở đây:', { k: code('KEYS_ENC_KEY') })}</p>
        <ol class="small" style="padding-left:1.2rem;line-height:1.6"><li>${S('Tạo khóa 32 byte: {c}', { c: code('openssl rand -base64 32') })}</li><li>${S('Cloudflare → Pages → lexkite → Settings → Variables and Secrets (Production) → thêm secret {k} → triển khai lại.', { k: code('KEYS_ENC_KEY') })}</li><li>${S('Danh sách Gemini cũ (Cài đặt) sẽ tự được nhập và mã hóa.')}</li></ol></div>`;
      const alerts = (d.alerts || []).length ? `<div class="card" role="alert" style="margin-top:1rem"><b>${S('Cảnh báo')}</b>${d.alerts.map(a => `<div class="kk-alert ${a.level === 'crit' ? 'crit' : ''}">${a.level === 'crit' ? '⛔' : '⚠️'} ${esc(a.msg)}</div>`).join('')}</div>` : '';
      const cards = (d.summary || []).map(s => { const pc = Math.round((s.capacity || 0) * 100), bar = s.cap ? Math.min(100, Math.round(s.uses / s.cap * 100)) : 0;
        return `<div class="card kk-card"><h4>${esc(s.name)}</h4><div class="small"><span class="pill ok">${s.live || 0} ${S('sống')}</span> <span class="pill bad">${s.dead || 0} ${S('chết')}</span> <span class="pill warn">${s.quota || 0} ${S('hết lượt')}</span> <span class="pill muted">${s.disabled || 0} ${S('đã tắt')}</span></div>
          <div class="meter ${pc < 20 ? 'crit' : pc < 40 ? 'warn' : ''}" style="margin-top:.5rem"><div class="row between small"><span>${s.cap ? S('Hôm nay {u} / {c} lượt', { u: num(s.uses), c: num(s.cap) }) : S('Hôm nay {u} lượt', { u: num(s.uses) })}</span><b>${S('còn {p}%', { p: pc })}</b></div><div class="bar"><i style="width:${bar}%"></i></div></div>
          <div class="tiny ${s.err24 ? '' : 'muted'}" style="margin-top:.3rem">${S('{n} lỗi / 24 h', { n: num(s.err24) })}</div></div>`; }).join('');
      const opts = Object.keys(P).map(p => `<option value="${esc(p)}" ${f.provider === p ? 'selected' : ''}>${esc(pname(p))}</option>`).join('');
      const add = `<details class="card" style="margin-top:1rem" ${d.total || (d.summary || []).length ? '' : 'open'} ${d.configured.enc ? '' : 'hidden'}><summary><b>${S('➕ Thêm khóa')}</b></summary>
        <form class="kk-form" id="kkAdd" autocomplete="off" style="margin-top:.6rem"><label>${S('Nhà cung cấp')}<select name="provider"><option value="auto">${S('Tự nhận diện')}</option>${Object.keys(P).map(p => `<option value="${esc(p)}">${esc(pname(p))}</option>`).join('')}</select></label>
          <label>${S('Nhãn (tùy chọn)')}<input name="label" maxlength="60" autocomplete="off"></label><label>${S('Trọng số')}<input name="weight" type="number" min="0" max="1000" value="100"></label>
          <label class="wide">${S('Dán khóa – mỗi dòng 1 khóa')}<textarea class="kk-mask" name="lines" rows="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore data-form-type="other"></textarea></label>
          <div class="wide row between" style="gap:.5rem;flex-wrap:wrap"><span class="small muted" id="kkDet" aria-live="polite"></span><span class="row" style="gap:.5rem"><label class="small"><input type="checkbox" id="kkShow"> ${S('Hiện')}</label><button class="btn primary" id="kkSave" type="submit">${S('Lưu & kiểm')}</button></span></div>
          <p class="wide tiny muted" style="margin:0">${S('Khóa chỉ đi tới máy chủ qua HTTPS, được mã hóa rồi xóa khỏi ô này. Tiền tố: AIza/AQ. (Gemini), gsk_ (Groq), sk-or- (OpenRouter), re_ (Resend), xkeysib- (Brevo); token Cloudflare: chọn nhà cung cấp.')}</p></form><p class="small" id="kkAddMsg" aria-live="polite"></p></details>`;
      const chips = [['', 'Tất cả'], ['live', 'Sống'], ['dead', 'Chết'], ['quota', 'Hết lượt'], ['disabled', 'Đã tắt'], ['env', 'Biến env']].map(([k, l]) => `<button type="button" class="chip-f ${f.status === k ? 'on' : ''}" data-st="${k}">${S(l)}</button>`).join('');
      const bar = `<div class="kk-bar"><select id="kkProv" aria-label="${S('Nhà cung cấp')}"><option value="">${S('Mọi nhà cung cấp')}</option>${opts}</select><div class="svc-chips">${chips}</div>
        <input type="search" id="kkQ" value="${esc(f.q)}" placeholder="${S('🔎 Tìm nhãn, 4 số cuối, id…')}" aria-label="${S('Tìm khóa')}"><select id="kkSort" aria-label="${S('Sắp xếp')}">${SORTS.map(([k, l]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${S(l)}</option>`).join('')}</select><button class="btn ghost sm" id="kkDir" title="${S('Đảo chiều')}" aria-label="${S('Đảo chiều')}">${f.dir === 'asc' ? '↑' : '↓'}</button></div>`;
      const bulk = `<div class="kk-bar" id="kkBulk"><b class="small" id="kkSel">${S('Đã chọn {n}', { n: sel.size })}</b><button class="btn sm" data-b="test">${S('Kiểm ngay')}</button><button class="btn sm" data-b="on">${S('Bật')}</button><button class="btn sm" data-b="off">${S('Tắt')}</button><button class="btn sm" data-b="weight">${S('Đặt trọng số')}</button><button class="btn sm ghost danger" data-b="del">${S('Xóa')}</button><span class="small" id="kkMsg" aria-live="polite">${esc(note)}</span></div>`;
      const row = r => { const [pc, pl] = ST[r.status] || ST.live, ro = r.source === 'env' ? S('chỉ đọc (env)') : r.source === 'legacy' ? S('chỉ đọc (cũ)') : '';
        return `<tr><td><input type="checkbox" data-id="${esc(r.id)}" ${sel.has(r.id) ? 'checked' : ''} aria-label="${S('Chọn')} ${esc(r.label)}"></td><td>${esc(pname(r.provider))}</td><td class="lb">${esc(r.label)}${ro ? ` <span class="pill muted">${ro}</span>` : ''}${r.notes ? `<div class="tiny muted">${esc(r.notes)}</div>` : ''}</td>
          <td><code>${r.last4 ? '…' + esc(r.last4) : '—'}</code></td><td><span class="pill ${pc}">${S(pl)}</span>${r.cooldown_until ? `<div class="tiny muted">${S('nghỉ đến {t}', { t: esc(when(r.cooldown_until)) })}</div>` : ''}</td><td>${num(r.weight)}</td>
          <td>${num(r.uses_today)}${r.cap ? ' / ' + num(r.cap) : ''}</td><td class="small">${r.last_ok ? esc(when(r.last_ok)) : '–'}</td><td>${r.err24 ? `<b>${num(r.err24)}</b>` : '0'}<span class="tiny muted"> (${num(r.err_count)})</span></td><td class="small">${esc(r.last_err || '–')}</td><td class="small">${r.created ? esc(when(r.created)) : '–'}</td>
          <td><button class="btn ghost sm" data-one="${esc(r.id)}" title="${S('Kiểm ngay')}" aria-label="${S('Kiểm ngay')} ${esc(r.label)}">🩺</button><button class="btn ghost sm" data-edit="${esc(r.id)}" title="${S('Sửa nhãn/ghi chú')}" aria-label="${S('Sửa nhãn/ghi chú')} ${esc(r.label)}">✎</button></td></tr>`; };
      const table = d.rows.length ? `<div class="tbl-wrap"><table class="tbl kk-tbl"><thead><tr><th><input type="checkbox" id="kkAll" aria-label="${S('Chọn tất cả')}"></th><th>${S('Nhà cung cấp')}</th><th>${S('Nhãn')}</th><th>${S('Khóa')}</th><th>${S('Trạng thái')}</th><th>${S('Trọng số')}</th><th>${S('Dùng hôm nay')}</th><th>${S('OK cuối')}</th><th>${S('Lỗi')}</th><th>${S('Lỗi cuối')}</th><th>${S('Thêm lúc')}</th><th></th></tr></thead><tbody>${d.rows.map(row).join('')}</tbody></table></div>` : `<p class="small muted">${S('Không có khóa nào khớp bộ lọc.')}</p>`;
      const pager = `<div class="row between small" style="margin-top:.6rem"><span>${S('Trang {p}/{n} · {t} khóa', { p: d.page, n: d.pages, t: num(d.total) })}</span><span class="row" style="gap:.4rem"><button class="btn ghost sm" id="kkPrev" ${d.page <= 1 ? 'disabled' : ''}>${S('‹ Trước')}</button><button class="btn ghost sm" id="kkNext" ${d.page >= d.pages ? 'disabled' : ''}>${S('Sau ›')}</button></span></div>`;
      box.innerHTML = `<div class="card"><div class="row between" style="flex-wrap:wrap;gap:.5rem"><div><h3 style="margin:0">${S('🔑 Khóa API')}</h3><p class="small muted" style="margin:.3rem 0 0">${S('Kho khóa của các nhà cung cấp AI & thư. Khóa được mã hóa (AES-GCM) ngay khi lưu; trang này chỉ thấy 4 ký tự cuối.')} · ${d.health ? S('Kiểm gần nhất: {t}', { t: esc(when(d.health)) }) : S('chưa kiểm')}</p></div>
        <span class="row" style="gap:.4rem"><button class="btn sm" id="kkHealth">${S('🩺 Kiểm tất cả')}</button><button class="btn ghost sm" id="kkCsv">${S('⬇️ Xuất CSV')}</button><button class="btn ghost sm" id="kkReload">${S('🔄 Tải lại')}</button></span></div></div>
        ${guide}${alerts}<div class="kk-grid">${cards}</div><div id="kkCap">${capCard()}</div>${add}<div class="card" style="margin-top:1rem">${bar}${bulk}${table}${pager}</div>
        <details class="card" style="margin-top:1rem" id="kkAudit"><summary><b>${S('📜 Nhật ký thao tác')}</b></summary><div id="kkAuditBody"></div></details>`;
      wire();
    }
    const $ = s => box.querySelector(s);
    const busy = async (btn, fn) => { if (btn) btn.disabled = true; try { await fn(); } catch (e) { if (e.message !== 'reauth') note = msgOf(e); } finally { if (btn) btn.disabled = false; } await load(); };
    function wire() {
      const go = patch => { Object.assign(f, patch); if (!('page' in patch)) f.page = 1; sel = new Set(); note = ''; load(); };
      $('#kkReload').onclick = () => go({});
      $('#kkHealth').onclick = e => busy(e.target, async () => { const r = await kapi('health'); note = S('✓ Đã kiểm {n} khóa', { n: r.results.length }); });
      $('#kkCsv').onclick = async () => { try { const r = await kapi('export', f), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv' })); a.download = 'lexkite-api-keys-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch (e) { note = msgOf(e); draw(); } };
      $('#kkProv').onchange = e => go({ provider: e.target.value });
      box.querySelectorAll('[data-st]').forEach(b => b.onclick = () => go({ status: b.dataset.st }));
      let t; $('#kkQ').oninput = e => { clearTimeout(t); t = setTimeout(() => go({ q: e.target.value.trim() }), 350); };
      $('#kkSort').onchange = e => go({ sort: e.target.value });
      $('#kkDir').onclick = () => go({ dir: f.dir === 'asc' ? 'desc' : 'asc' });
      if ($('#kkPrev')) $('#kkPrev').onclick = () => go({ page: f.page - 1 });
      if ($('#kkNext')) $('#kkNext').onclick = () => go({ page: f.page + 1 });
      const paintSel = () => { $('#kkSel').textContent = S('Đã chọn {n}', { n: sel.size }); };
      box.querySelectorAll('[data-id]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); paintSel(); });
      if ($('#kkAll')) $('#kkAll').onchange = e => { box.querySelectorAll('[data-id]').forEach(c => { c.checked = e.target.checked; c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); }); paintSel(); };
      box.querySelectorAll('[data-one]').forEach(b => b.onclick = () => busy(b, async () => { await kapi('test', { ids: [b.dataset.one] }); note = S('✓ Đã kiểm {n} khóa', { n: 1 }); }));
      box.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const r = D.rows.find(x => x.id === b.dataset.edit); if (!r) return; const label = prompt(S('Nhãn mới:'), r.label); if (label == null) return; const notes = prompt(S('Ghi chú:'), r.notes || ''); if (notes == null) return; busy(b, async () => { await kapi('set', { ids: [r.id], label, notes }); note = S('✓ Đã cập nhật'); }); });
      box.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
        const ids = [...sel]; if (!ids.length) return;
        const k = b.dataset.b;
        if (k === 'test') return busy(b, async () => { const r = await kapi('test', { ids }); note = S('✓ Đã kiểm {n} khóa', { n: r.results.length }); });
        if (k === 'on' || k === 'off') return busy(b, async () => { await kapi('set', { ids, enabled: k === 'on' }); note = S('✓ Đã cập nhật'); });
        if (k === 'weight') { const w = prompt(S('Trọng số mới (0–1000, 0 = không dùng):'), '100'); if (w == null || !/^\d{1,4}$/.test(w.trim()) || +w > 1000) return; return busy(b, async () => { await kapi('set', { ids, weight: +w }); note = S('✓ Đã cập nhật'); }); }
        if (k === 'del') { if (prompt(S('Xóa vĩnh viễn {n} khóa? Khóa trong biến env không xóa được (chỉ tắt).\nGõ DELETE để xác nhận:', { n: ids.length })) !== 'DELETE') { note = S('Chưa xóa gì.'); return draw(); } return busy(b, async () => { const r = await kapi('delete', { ids, confirm: 'DELETE' }); sel = new Set(); note = S('✓ Đã xóa {n}', { n: r.deleted.length }) + (r.skipped.length ? ' · ' + S('bỏ qua {n}', { n: r.skipped.length }) : ''); }); }
      });
      // Thêm khóa: che ô, xem trước số lượng theo nhà cung cấp (không hiện giá trị), lưu xong xóa ô ngay
      const form = $('#kkAdd');
      if (form) {
        const ta = form.querySelector('textarea'), det = $('#kkDet'), fp = form.querySelector('[name=provider]'), fl = form.querySelector('[name=label]'), fw = form.querySelector('[name=weight]');
        $('#kkShow').onchange = e => ta.classList.toggle('show', e.target.checked);
        ta.oninput = () => { const lines = ta.value.split(/\r?\n/).map(clean).filter(Boolean), forced = fp.value, c = {}; for (const l of lines) { const p = forced !== 'auto' ? forced : detect(l) || '?'; c[p] = (c[p] || 0) + 1; } det.textContent = lines.length ? S('Nhận diện: {s}', { s: Object.entries(c).map(([p, n]) => `${p === '?' ? S('không rõ') : (D.providers[p] || {}).name || p} × ${n}`).join(', ') }) : ''; };
        fp.onchange = ta.oninput;
        form.onsubmit = async e => {
          e.preventDefault();
          const lines = ta.value; if (!lines.trim()) return ta.focus();
          ta.value = ''; det.textContent = ''; $('#kkShow').checked = false; ta.classList.remove('show'); // xóa ô ngay – giá trị không giữ lại trên trang
          const msg = $('#kkAddMsg'), btn = $('#kkSave'); btn.disabled = true; msg.textContent = S('Đang lưu…');
          const WHY = { duplicate: 'trùng', format: 'sai định dạng', unknown: 'không nhận ra nhà cung cấp' };
          try {
            const r = await kapi('add', { lines, provider: fp.value, label: fl.value.trim(), weight: +fw.value });
            note = S('✓ Đã thêm {n} khóa', { n: r.added.length }) + (r.added.length ? ': ' + r.added.map(a => `${(D.providers[a.provider] || {}).name || a.provider} …${a.last4} (${S((ST[a.status] || ST.live)[1])})`).join(', ') : '') + (r.skipped.length ? ' · ' + S('bỏ qua {n}', { n: r.skipped.length }) + ' – ' + r.skipped.map(x => S('dòng {l}: {r}', { l: x.line, r: S(WHY[x.reason] || x.reason) })).join('; ') : '');
            fl.value = ''; await load();
          } catch (x) { msg.textContent = msgOf(x); btn.disabled = false; }
        };
      }
      // Nhật ký (tải khi mở)
      const au = $('#kkAudit'); let ap = 1;
      const loadAudit = () => kapi('audit', { page: ap }).then(r => { $('#kkAuditBody').innerHTML = r.rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${S('Lúc')}</th><th>${S('Người')}</th><th>${S('Thao tác')}</th><th>${S('Chi tiết')}</th></tr></thead><tbody>${r.rows.map(x => `<tr${x.ok ? '' : ' style="color:#dc2626"'}><td class="small">${esc(when(x.at))}</td><td class="small">${esc(x.email)}</td><td><code>${esc(x.op)}</code></td><td class="tiny" style="white-space:normal;word-break:break-all">${esc(x.detail || '')}</td></tr>`).join('')}</tbody></table></div><div class="row between small" style="margin-top:.4rem"><span>${S('Trang {p}/{n} · {t} khóa', { p: r.page, n: r.pages, t: num(r.total) }).replace(/ khóa$| keys$/, '')}</span><span class="row" style="gap:.4rem"><button class="btn ghost sm" id="kaPrev" ${r.page <= 1 ? 'disabled' : ''}>${S('‹ Trước')}</button><button class="btn ghost sm" id="kaNext" ${r.page >= r.pages ? 'disabled' : ''}>${S('Sau ›')}</button></span></div>` : `<p class="small muted">${S('Chưa có thao tác')}</p>`;
        const pv = $('#kaPrev'), nx = $('#kaNext'); if (pv) pv.onclick = () => { ap--; loadAudit(); }; if (nx) nx.onclick = () => { ap++; loadAudit(); }; }).catch(e => { $('#kkAuditBody').textContent = msgOf(e); });
      au.ontoggle = () => { if (au.open) loadAudit(); };
    }
  }
  window.AdminKeys = { render, _detect: detect, _clean: clean, _hash: { readHash, writeHash } };
})();
