/* Quản trị → "Video & Social": Drive lưu video, kênh đã kết nối, bài đăng (lên lịch / đăng ngay / hủy lịch / thử lại / hủy), tạo bài mới.
 * Gọi GrabCast qua proxy /api/social (functions/api/social.js) – khóa API chỉ nằm ở máy chủ. admin.js chỉ gọi
 * AdminSocial.render(container, sapi, L, { esc, num, when, lang }), sapi(method, path, body?, { query, idem }) → JSON hoặc ném lỗi (err.code).
 * Kết nối/ngắt kênh & Drive làm trên grabcast.click (khóa không có quyền đó). Chữ tiếng Anh nằm trong bảng EN riêng ở đây. */
(function () {
  const GC = 'https://grabcast.click/scheduler.html', GC_KEY = 'https://grabcast.click/account.html#api';
  const EN = {
    '🎬 Video & Social': '🎬 Video & Social', 'Lưu video trên Drive và đăng lên các kênh qua GrabCast.': 'Store videos on Drive and post to channels via GrabCast.',
    'Kết nối kênh/Drive trên GrabCast ↗': 'Connect channels/Drive on GrabCast ↗', '🔄 Tải lại': '🔄 Reload', 'Đang tải…': 'Loading…',
    // Chưa cấu hình
    '⚙️ Chưa kết nối GrabCast': '⚙️ GrabCast is not connected', 'Máy chủ chưa có khóa GrabCast. Làm 1 lần:': 'The server has no GrabCast key yet. One-time setup:',
    'Mở {link} → tạo khóa API với quyền <b>social:read, social:write, storage:read, storage:write</b>.': 'Open {link} → create an API key with scopes <b>social:read, social:write, storage:read, storage:write</b>.',
    'Cloudflare Pages → lexkite → Settings → Variables and Secrets: thêm <b>secret</b> {k} (giá trị khóa) và biến {w} (mã workspace).': 'Cloudflare Pages → lexkite → Settings → Variables and Secrets: add the <b>secret</b> {k} (key value) and the variable {w} (workspace id).',
    'Triển khai lại bản mới nhất (Retry deployment) rồi tải lại tab này.': 'Redeploy the latest build (Retry deployment), then reload this tab.',
    '🔒 Khóa chỉ máy chủ dùng, không bao giờ gửi xuống trình duyệt. Không dán khóa vào đây hay vào repo.': '🔒 The key is used only by the server and is never sent to the browser. Do not paste it here or into the repo.',
    // Drive
    '💾 Drive lưu video': '💾 Video storage (Drive)', 'Tổng': 'Total',
    '{u} / {t} · còn trống {f}': '{u} / {t} · {f} free', 'Sắp đầy': 'Almost full', 'Gần đầy': 'Filling up', 'Đầy': 'Full',
    '⚠️ {n} Drive đã dùng ≥ 80% – dọn bớt hoặc thêm Drive trên GrabCast.': ['⚠️ {n} Drive is ≥ 80% full – clean up or add a Drive on GrabCast.', '⚠️ {n} Drives are ≥ 80% full – clean up or add a Drive on GrabCast.'],
    // Kênh
    '📡 Kênh đã kết nối': '📡 Connected channels', 'cần kết nối lại': 'needs reconnect',
    // Bài đăng
    '🗓️ Bài đăng': '🗓️ Posts', 'Tất cả': 'All', 'Nháp': 'Draft', 'Đã lên lịch': 'Scheduled', 'Đã đăng': 'Published', 'Lỗi': 'Failed', 'Đã hủy': 'Cancelled', 'Khác': 'Other',
    'Không có bài nào.': 'No posts.', '(không tiêu đề)': '(untitled)', 'Lên lịch': 'Schedule', 'Đăng ngay': 'Publish now', 'Hủy lịch': 'Unschedule', 'Thử lại': 'Retry', 'Hủy': 'Cancel', 'Xem ↗': 'View ↗',
    'Lên lịch bài “{t}” lúc {d}?': 'Schedule “{t}” for {d}?', 'Đăng ngay bài “{t}” lên {p}? Bài sẽ công khai ngay.': 'Publish “{t}” to {p} now? It goes public immediately.',
    'Hủy lịch bài “{t}”? Bài trở về nháp.': 'Unschedule “{t}”? It goes back to draft.', 'Thử đăng lại bài “{t}”?': 'Retry publishing “{t}”?', 'Hủy bài “{t}”? Bài sẽ không được đăng.': 'Cancel “{t}”? It will not be published.',
    '✓ Xong': '✓ Done', '✗ {e}': '✗ {e}', 'Chọn giờ đăng': 'Choose a publish time', 'Giờ đăng (giờ máy bạn)': 'Publish time (your local time)', 'Gợi ý giờ vàng ở Mỹ (giờ New York):': 'Suggested US prime times (New York time):',
    'Đóng': 'Close', 'Chọn giờ trước.': 'Pick a time first.', 'Giờ đăng phải ở tương lai.': 'The publish time must be in the future.',
    // Tạo bài
    '➕ Tạo bài mới': '➕ New post', 'Video': 'Video', 'Chọn video đã lưu': 'Choose a stored video', '— chọn video —': '— choose a video —', 'hoặc tải video mới': 'or upload a new video',
    'Tiêu đề': 'Title', 'Caption': 'Caption', 'Bình luận đầu tiên': 'First comment', 'Link': 'Link', 'Đăng lên kênh': 'Post to channels', 'Giờ đăng (để trống = lưu nháp)': 'Publish time (empty = save as draft)',
    'Kiểm tra': 'Validate', 'Lưu nháp': 'Save draft', 'Tạo & lên lịch': 'Create & schedule',
    'Chọn hoặc tải 1 video.': 'Choose or upload a video.', 'Nhập caption.': 'Enter a caption.', 'Chọn ít nhất 1 kênh.': 'Select at least one channel.',
    '⏳ Đang tải lên {p}%…': '⏳ Uploading {p}%…', '⏳ Đang chuẩn bị video…': '⏳ Preparing video…', '⏳ Đang kiểm tra…': '⏳ Validating…', '⏳ Đang tạo bài…': '⏳ Creating post…', '⏳ Đang lên lịch…': '⏳ Scheduling…',
    '✓ Hợp lệ': '✓ Valid', 'Chưa hợp lệ:': 'Not valid:', '✓ Đã lưu nháp': '✓ Draft saved', '✓ Đã lên lịch {d}': '✓ Scheduled for {d}',
    'Tạo bài nháp trên {n} kênh?': ['Create a draft for {n} channel?', 'Create a draft for {n} channels?'], 'Tạo bài và lên lịch đăng lên {n} kênh lúc {d}?': ['Create and schedule for {n} channel at {d}?', 'Create and schedule for {n} channels at {d}?'],
    'Tải lên thất bại ({s})': 'Upload failed ({s})', 'GrabCast không trả về link tải lên.': 'GrabCast returned no upload URL.', 'GrabCast không trả về mã media.': 'GrabCast returned no media id.',
    'Quá giới hạn GrabCast (60 lượt/phút) – đợi 1 phút rồi thử lại.': 'GrabCast rate limit hit (60/min) – wait a minute and retry.', 'GrabCast không phản hồi trong 15 giây.': 'GrabCast did not respond within 15 seconds.',
    'Đã tạo bài nhưng chưa lên lịch được: {e}': 'Post created but not scheduled: {e}',
    'Khóa GrabCast không hợp lệ hoặc đã bị thu hồi – tạo khóa mới tại {link} rồi cập nhật secret GRABCAST_API_KEY trên Cloudflare Pages.': 'The GrabCast key is invalid or revoked – create a new one at {link} and update the GRABCAST_API_KEY secret on Cloudflare Pages.',
    'Khóa GrabCast không có quyền cho thao tác này (hoặc không thuộc workspace Lexkite) – cấp thêm quyền social/storage cho khóa tại {link}.': 'The GrabCast key is not allowed to do this (or is not in the Lexkite workspace) – grant social/storage scopes to the key at {link}.',
    'Workspace Lexkite chưa có kênh nào.': 'The Lexkite workspace has no channels yet.', 'Workspace Lexkite chưa có Drive nào.': 'The Lexkite workspace has no Drive yet.',
    'Kết nối tại {link} (chọn workspace <b>Lexkite</b>).': 'Connect at {link} (choose the <b>Lexkite</b> workspace).',
  };
  const CSS = `.soc-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin-bottom:1rem}.soc-head h2{margin:0;font-size:1.25rem}.soc-head .acts{display:flex;gap:.5rem;flex-wrap:wrap}
.soc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-bottom:1rem}.soc-grid>.card{margin:0;min-width:0}
.soc-drv{margin:.6rem 0 .9rem}.soc-drv .t{display:flex;justify-content:space-between;gap:.5rem;font-size:.85rem;flex-wrap:wrap}.soc-drv .t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
.soc-bar{height:9px;border-radius:99px;background:var(--line,#e5e7eb);overflow:hidden;margin:.3rem 0}.soc-bar i{display:block;height:100%;background:#16a34a;border-radius:99px}
.soc-drv.warn .soc-bar i{background:#f59e0b}.soc-drv.crit .soc-bar i{background:#dc2626}.soc-drv.full .soc-bar i{background:#991b1b}.soc-drv.total{border-top:1px solid var(--line,#e5e7eb);padding-top:.6rem}
.soc-acc{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0 0;padding:0;list-style:none}.soc-acc li{display:flex;align-items:center;gap:.35rem;border:1px solid var(--line,#e5e7eb);border-radius:999px;padding:.3rem .7rem;font-size:.85rem;max-width:100%}
.soc-acc li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.soc-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.soc-form label{display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;font-weight:600;min-width:0}.soc-form .wide{grid-column:1/-1}
.soc-form input,.soc-form textarea,.soc-form select{font:inherit;font-weight:400;padding:.5rem .6rem;border:1.5px solid var(--line,#e5e7eb);border-radius:10px;background:var(--surface,#fff);color:inherit;width:100%;box-sizing:border-box;min-width:0}
.soc-targets{display:flex;flex-wrap:wrap;gap:.4rem}.soc-targets label{flex-direction:row;align-items:center;font-weight:500;border:1px solid var(--line,#e5e7eb);border-radius:999px;padding:.35rem .7rem;cursor:pointer}
.soc-times{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}.soc-times .chip-f{font-size:.78rem;padding:.3rem .6rem;text-align:left;line-height:1.25}
.soc-prog{height:6px;border-radius:99px;background:var(--line,#e5e7eb);overflow:hidden;margin-top:.4rem}.soc-prog i{display:block;height:100%;width:0;background:var(--primary)}
.soc-msg{min-height:1.2em;margin-top:.5rem;white-space:pre-line}.soc-btns{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}
.soc-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0 .8rem}
.soc-post{border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:.75rem .85rem;margin-bottom:.6rem}.soc-post h4{margin:0;font-size:.95rem;overflow-wrap:anywhere}
.soc-post .meta{display:flex;flex-wrap:wrap;gap:.35rem .8rem;font-size:.8rem;margin:.3rem 0}.soc-post .err{font-size:.8rem;color:var(--again,#d1343a);margin:.2rem 0;overflow-wrap:anywhere}
.soc-post .acts{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.45rem}.soc-post a{overflow-wrap:anywhere}
.soc-steps{margin:.6rem 0;padding-left:1.2rem;line-height:1.6}.soc-steps code{font-size:.85em}
.pill.bad{background:#fee2e2;color:#b91c1c}.warn-t{color:#b45309}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .pill.bad{background:#450a0a;color:#fecaca}:root:not([data-theme="light"]) .warn-t{color:#fbbf24}}:root[data-theme="dark"] .pill.bad{background:#450a0a;color:#fecaca}:root[data-theme="dark"] .warn-t{color:#fbbf24}
@media (max-width:760px){.soc-grid{grid-template-columns:1fr}}@media (max-width:560px){.soc-form{grid-template-columns:1fr}.soc-btns .btn,.soc-head .acts .btn{flex:1 1 auto;text-align:center}}`;
  const ICON = { youtube: '▶️', tiktok: '🎵', instagram: '📸', facebook: '📘', threads: '🧵', x: '𝕏', twitter: '𝕏', linkedin: '💼', pinterest: '📌', drive: '💾', google: '💾' };
  const icon = p => ICON[String(p || '').toLowerCase().replace(/[^a-z]/g, '')] || '📡';
  // GrabCast có thể trả { items: [] } / { data: [] } / mảng trần – đọc mềm dẻo
  const arr = j => (Array.isArray(j) ? j : (j && (j.items || j.data || j.results || j.accounts || j.posts || j.stores || j.objects)) || []);
  const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined; };
  const GROUP = s => { s = String(s || '').toLowerCase(); return /fail|error/.test(s) ? 'failed' : /cancel/.test(s) ? 'cancelled' : /publish|posted|done|success|complete|live/.test(s) ? 'published' : /schedul|queue|pending|processing/.test(s) ? 'scheduled' : /draft|new|^$/.test(s) ? 'draft' : 'other'; };
  const GLBL = { draft: ['muted', 'Nháp'], scheduled: ['warn', 'Đã lên lịch'], published: ['ok', 'Đã đăng'], failed: ['bad', 'Lỗi'], cancelled: ['muted', 'Đã hủy'], other: ['muted', 'Khác'] };
  const GB = b => { b = +b || 0; return b >= 1e12 ? (b / 1e12).toFixed(2) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(0) + ' MB' : Math.round(b / 1e3) + ' KB'; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  // Giờ New York (tự xử lý EST/EDT): giờ tường h của ngày y-m-d ở NY → Date
  const NY = 'America/New_York';
  const nyParts = d => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: NY, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  const nyAt = (y, m, d, h) => { const want = Date.UTC(y, m - 1, d, h); let t = want + 5 * 36e5; for (let i = 0; i < 3; i++) { const p = nyParts(new Date(t)); t += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); } return new Date(t); };
  const SLOTS = [7, 8, 12, 19, 20];
  const suggest = (n = 5) => { const out = [], p = nyParts(new Date()), now = Date.now(); for (let dd = 0; dd < 3 && out.length < n; dd++) { const b = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + dd)); for (const h of SLOTS) { const t = nyAt(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate(), h); if (+t > now + 15 * 6e4 && out.length < n) out.push({ h, t }); } } return out; };
  const localInput = d => new Date(+d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

  let gen = 0;
  function render(box, sapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN');
    const S = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const when = t => (t ? new Date(t).toLocaleString(LOC(), { dateStyle: 'short', timeStyle: 'short' }) : '–');
    const lnk = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
    const errHtml = e => (e && e.code === 'api_key_invalid' ? S('Khóa GrabCast không hợp lệ hoặc đã bị thu hồi – tạo khóa mới tại {link} rồi cập nhật secret GRABCAST_API_KEY trên Cloudflare Pages.', { link: lnk(GC_KEY, 'grabcast.click/account.html#api') })
      : e && e.code === 'api_key_not_allowed' ? S('Khóa GrabCast không có quyền cho thao tác này (hoặc không thuộc workspace Lexkite) – cấp thêm quyền social/storage cho khóa tại {link}.', { link: lnk(GC_KEY, 'grabcast.click/account.html#api') }) : esc(errText(e)));
    const errText = e => (e && e.code === 'api_key_invalid' ? S('Khóa GrabCast không hợp lệ hoặc đã bị thu hồi – tạo khóa mới tại {link} rồi cập nhật secret GRABCAST_API_KEY trên Cloudflare Pages.', { link: 'grabcast.click/account.html#api' })
      : e && e.code === 'api_key_not_allowed' ? S('Khóa GrabCast không có quyền cho thao tác này (hoặc không thuộc workspace Lexkite) – cấp thêm quyền social/storage cho khóa tại {link}.', { link: 'grabcast.click/account.html#api' })
      : e && e.code === 'grabcast-rate' ? S('Quá giới hạn GrabCast (60 lượt/phút) – đợi 1 phút rồi thử lại.') : e && e.code === 'timeout' ? S('GrabCast không phản hồi trong 15 giây.') : String((e && e.message) || e).slice(0, 300));
    if (!document.getElementById('admSocialCss')) { const st = document.createElement('style'); st.id = 'admSocialCss'; st.textContent = CSS; document.head.appendChild(st); }
    const slotLabel = s => `${s.h}:00 ET · ${s.t.toLocaleString(LOC(), { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
    const chipsHtml = () => suggest().map(s => `<button type="button" class="chip-f" data-at="${+s.t}" title="${esc(s.t.toLocaleString(LOC(), { timeZone: NY, dateStyle: 'medium', timeStyle: 'short' }))} (New York)">${esc(slotLabel(s))}</button>`).join('');

    const head = `<div class="soc-head"><div><h2>${S('🎬 Video & Social')}</h2><p class="small muted" style="margin:.2rem 0 0">${S('Lưu video trên Drive và đăng lên các kênh qua GrabCast.')}</p></div>
      <div class="acts"><a class="btn ghost sm" href="${GC}" target="_blank" rel="noopener">${S('Kết nối kênh/Drive trên GrabCast ↗')}</a><button class="btn sm" id="socReload">${S('🔄 Tải lại')}</button></div></div>`;
    box.innerHTML = head + `<p class="small muted">${S('Đang tải…')}</p>`;
    const bindReload = () => { const b = box.querySelector('#socReload'); if (b) b.onclick = () => render(box, sapi, L, h); };
    bindReload();

    Promise.allSettled([sapi('GET', 'storage/stores'), sapi('GET', 'accounts'), sapi('GET', 'posts', null, { query: { limit: 50 } }), sapi('GET', 'storage/objects', null, { query: { limit: 100 } })]).then(res => {
      if (my !== gen || !box.isConnected) return;
      if (res.some(r => r.status === 'rejected' && r.reason && r.reason.code === 'not-configured')) return setup();
      const val = (i) => (res[i].status === 'fulfilled' ? arr(res[i].value) : null), bad = i => (res[i].status === 'rejected' ? `<p class="small bad-t">${S('✗ {e}', { e: errHtml(res[i].reason) })}</p>` : '');
      const stores = val(0) || [], accounts = val(1) || [], posts = val(2) || [], objects = val(3) || [];
      const accById = Object.fromEntries(accounts.map(a => [String(a.id), a]));
      box.innerHTML = head + `<div class="soc-grid"><section class="card">${drives(stores)}${bad(0)}</section><section class="card">${channels(accounts)}${bad(1)}</section></div>
        <section class="card" style="margin-bottom:1rem">${form(accounts, objects)}${bad(3)}</section>
        <section class="card"><h3 style="margin:0">${S('🗓️ Bài đăng')}</h3><div class="soc-chips" role="tablist">${['all', 'draft', 'scheduled', 'published', 'failed'].map((k, i) => `<button type="button" class="chip-f ${i ? '' : 'on'}" data-pf="${k}">${S(k === 'all' ? 'Tất cả' : GLBL[k][1])} <small>${k === 'all' ? posts.length : posts.filter(p => GROUP(pick(p, 'status', 'state')) === k).length}</small></button>`).join('')}</div>${bad(2)}<div id="socPosts"></div></section>`;
      bindReload();
      let pf = 'all';
      const paintPosts = () => { const rows = posts.filter(p => pf === 'all' || GROUP(pick(p, 'status', 'state')) === pf); box.querySelector('#socPosts').innerHTML = rows.map(p => postCard(p, accById)).join('') || `<p class="small muted">${S('Không có bài nào.')}</p>`; };
      paintPosts();
      box.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { pf = b.dataset.pf; box.querySelectorAll('[data-pf]').forEach(x => x.classList.toggle('on', x === b)); paintPosts(); });
      box.querySelector('#socPosts').onclick = e => { const b = e.target.closest('button[data-act]'); if (b) act(b, posts.find(p => String(p.id) === b.dataset.id), accById); };
      wireForm(accounts);
    });

    function setup() {
      box.innerHTML = head + `<section class="card"><h3 style="margin:0">${S('⚙️ Chưa kết nối GrabCast')}</h3><p class="small" style="margin:.5rem 0 0">${S('Máy chủ chưa có khóa GrabCast. Làm 1 lần:')}</p>
        <ol class="soc-steps small"><li>${S('Mở {link} → tạo khóa API với quyền <b>social:read, social:write, storage:read, storage:write</b>.', { link: `<a href="${GC_KEY}" target="_blank" rel="noopener">grabcast.click/account.html#api</a>` })}</li>
        <li>${S('Cloudflare Pages → lexkite → Settings → Variables and Secrets: thêm <b>secret</b> {k} (giá trị khóa) và biến {w} (mã workspace).', { k: '<code>GRABCAST_API_KEY</code>', w: '<code>GRABCAST_WORKSPACE</code> = <code>4</code>' })}</li>
        <li>${S('Triển khai lại bản mới nhất (Retry deployment) rồi tải lại tab này.')}</li></ol><p class="tiny muted" style="margin:0">${S('🔒 Khóa chỉ máy chủ dùng, không bao giờ gửi xuống trình duyệt. Không dán khóa vào đây hay vào repo.')}</p></section>`;
      bindReload();
    }

    const empty = t => `<p class="small muted" style="margin:.5rem 0 0">${S(t)} ${S('Kết nối tại {link} (chọn workspace <b>Lexkite</b>).', { link: lnk(GC, 'grabcast.click/scheduler.html') })}</p>`;
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
      return `<h3 style="margin:0">${S('💾 Drive lưu video')}</h3>${hot ? `<p class="small warn-t" style="margin:.4rem 0 0">${S('⚠️ {n} Drive đã dùng ≥ 80% – dọn bớt hoặc thêm Drive trên GrabCast.', { n: hot })}</p>` : ''}
        ${rows || empty('Workspace Lexkite chưa có Drive nào.')}${stores.length > 1 ? row(S('Tổng'), U, T, Math.max(0, T - U), 'total') : ''}`;
    }
    const accName = a => pick(a, 'name', 'display_name', 'username', 'handle', 'title', 'id') || '?';
    const accPlat = a => pick(a, 'platform', 'provider', 'network', 'type') || '';
    function channels(accounts) {
      return `<h3 style="margin:0">${S('📡 Kênh đã kết nối')} <span class="small muted">${accounts.length}</span></h3>${accounts.length ? `<ul class="soc-acc">${accounts.map(a => { const broken = /expired|error|revoked|reconnect|disconnected/i.test(String(pick(a, 'status', 'state') || '')); return `<li title="${esc(accPlat(a))}">${icon(accPlat(a))} <span>${esc(accName(a))}</span>${broken ? ` <span class="pill warn">${S('cần kết nối lại')}</span>` : ''}</li>`; }).join('')}</ul>` : empty('Workspace Lexkite chưa có kênh nào.')}`;
    }

    // ---------- Bài đăng ----------
    const titleOf = p => String(pick(p, 'title') || String(pick(p, 'caption') || '').slice(0, 70) || S('(không tiêu đề)'));
    const platsOf = (p, accById) => [...new Set((p.targets || []).map(t => pick(t, 'platform', 'provider') || accPlat(accById[String(t.account_id)] || {})).filter(Boolean))];
    function postCard(p, accById) {
      const g = GROUP(pick(p, 'status', 'state')), [pc, pl] = GLBL[g], plats = platsOf(p, accById);
      const t = g === 'published' ? pick(p, 'published_at', 'scheduled_at', 'updated_at') : pick(p, 'scheduled_at', 'publish_at', 'created_at', 'updated_at');
      const links = [...new Set([pick(p, 'url', 'permalink'), ...(p.targets || []).map(x => pick(x, 'url', 'permalink', 'post_url', 'external_url'))].filter(u => /^https:\/\//.test(String(u || ''))))];
      const errs = [pick(p, 'error', 'last_error', 'error_message'), ...(p.targets || []).map(x => pick(x, 'error', 'last_error', 'error_message'))].filter(Boolean).map(x => (typeof x === 'object' ? x.message || JSON.stringify(x) : x));
      const A = { draft: ['schedule', 'publish', 'cancel'], scheduled: ['unschedule', 'publish', 'cancel'], failed: ['retry', 'cancel'], published: [], cancelled: [], other: ['schedule', 'publish', 'unschedule', 'retry', 'cancel'] }[g];
      const LB = { schedule: 'Lên lịch', publish: 'Đăng ngay', unschedule: 'Hủy lịch', retry: 'Thử lại', cancel: 'Hủy' };
      return `<article class="soc-post"><div class="row between" style="gap:.5rem;align-items:flex-start"><h4>${esc(titleOf(p))}</h4><span class="pill ${pc}">${S(pl)}</span></div>
        <div class="meta muted"><span>${plats.map(x => icon(x) + ' ' + esc(x)).join(' · ') || '—'}</span><span>🕒 ${esc(when(t))}</span></div>
        ${errs.map(e => `<p class="err">⚠️ ${esc(String(e).slice(0, 240))}</p>`).join('')}
        ${links.map(u => `<a class="small" href="${esc(u)}" target="_blank" rel="noopener">${S('Xem ↗')} ${esc(u.replace(/^https:\/\//, '').slice(0, 60))}</a>`).join('<br>')}
        ${A.length ? `<div class="acts">${A.map(a => `<button class="btn sm ${a === 'publish' ? 'primary' : a === 'cancel' ? 'ghost danger' : 'ghost'}" data-act="${a}" data-id="${esc(p.id)}">${S(LB[a])}</button>`).join('')}</div>` : ''}</article>`;
    }
    async function act(btn, p, accById) {
      if (!p) return;
      const t = titleOf(p).slice(0, 60), id = encodeURIComponent(String(p.id)), a = btn.dataset.act;
      let path, body = {};
      if (a === 'schedule') { const at = await pickTime(); if (!at) return; if (!confirm(S('Lên lịch bài “{t}” lúc {d}?', { t, d: when(at) }))) return; path = 'schedule'; body = { scheduled_at: at.toISOString(), consent: true }; }
      else if (a === 'publish') { if (!confirm(S('Đăng ngay bài “{t}” lên {p}? Bài sẽ công khai ngay.', { t, p: platsOf(p, accById).join(', ') || '?' }))) return; path = 'publish-now'; body = { consent: true }; }
      else if (a === 'unschedule') { if (!confirm(S('Hủy lịch bài “{t}”? Bài trở về nháp.', { t }))) return; path = 'unschedule'; }
      else if (a === 'retry') { if (!confirm(S('Thử đăng lại bài “{t}”?', { t }))) return; path = 'retry'; }
      else if (a === 'cancel') { if (!confirm(S('Hủy bài “{t}”? Bài sẽ không được đăng.', { t }))) return; path = 'cancel'; }
      else return;
      const acts = btn.closest('.acts'); acts.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try { await sapi('POST', `posts/${id}/${path}`, body); btn.textContent = S('✓ Xong'); setTimeout(() => { if (my === gen && box.isConnected) render(box, sapi, L, h); }, 700); }
      catch (e) { acts.querySelectorAll('button').forEach(b => { b.disabled = false; }); alert(S('✗ {e}', { e: errText(e) })); }
    }
    // Hộp thoại chọn giờ (giờ máy) + gợi ý giờ vàng New York
    function pickTime() {
      return new Promise(resolve => {
        const d = document.createElement('dialog'); d.className = 'key-dlg';
        d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><h3 style="margin:0">${S('Chọn giờ đăng')}</h3><button class="icon-x" value="x" aria-label="${S('Đóng')}">✕</button></div>
          <div class="soc-form" style="margin-top:.7rem"><label class="wide">${S('Giờ đăng (giờ máy bạn)')}<input type="datetime-local" id="ptAt"></label></div>
          <p class="small muted" style="margin:.6rem 0 0">${S('Gợi ý giờ vàng ở Mỹ (giờ New York):')}</p><div class="soc-times">${chipsHtml()}</div>
          <p class="small bad-t" id="ptMsg" style="min-height:1.2em"></p><div class="row between"><span></span><span class="row" style="gap:.5rem"><button class="btn ghost" value="x">${S('Hủy')}</button><button type="button" class="btn primary" id="ptOk">${S('Lên lịch')}</button></span></div></form>`;
        document.body.appendChild(d); d.showModal();
        let out = null;
        d.addEventListener('close', () => { d.remove(); resolve(out); }); d.addEventListener('click', e => { if (e.target === d) d.close(); });
        d.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { d.querySelector('#ptAt').value = localInput(new Date(+b.dataset.at)); d.querySelectorAll('[data-at]').forEach(x => x.classList.toggle('on', x === b)); });
        d.querySelector('#ptOk').onclick = () => { const v = d.querySelector('#ptAt').value, at = v ? new Date(v) : null; if (!at || isNaN(at)) { d.querySelector('#ptMsg').textContent = S('Chọn giờ trước.'); return; } if (+at < Date.now() + 6e4) { d.querySelector('#ptMsg').textContent = S('Giờ đăng phải ở tương lai.'); return; } out = at; d.close(); };
      });
    }

    // ---------- Tạo bài ----------
    const isVideo = o => /^video\//.test(String(pick(o, 'content_type', 'mime_type', 'mime') || '')) || /\.(mp4|mov|webm|m4v)$/i.test(String(pick(o, 'filename', 'name', 'key') || ''));
    function form(accounts, objects) {
      const vids = objects.filter(isVideo);
      return `<h3 style="margin:0 0 .7rem">${S('➕ Tạo bài mới')}</h3><div class="soc-form" id="socForm">
        <label class="wide">${S('Chọn video đã lưu')}<select id="sfObj"><option value="">${S('— chọn video —')}</option>${vids.map(o => `<option value="${esc(o.id)}">${esc(String(pick(o, 'filename', 'name', 'key', 'id')).slice(0, 80))} · ${GB(pick(o, 'size', 'size_bytes', 'bytes'))} · ${esc(when(pick(o, 'created_at', 'updated_at')))}</option>`).join('')}</select></label>
        <label class="wide">${S('hoặc tải video mới')}<input type="file" id="sfFile" accept="video/*"><div class="soc-prog" hidden id="sfProg"><i></i></div></label>
        <label class="wide">${S('Tiêu đề')}<input id="sfTitle" maxlength="200"></label>
        <label class="wide">${S('Caption')}<textarea id="sfCap" rows="4" maxlength="5000"></textarea></label>
        <label>${S('Bình luận đầu tiên')}<input id="sfCmt" maxlength="1000"></label>
        <label>${S('Link')}<input id="sfLink" type="url" value="https://lexkite.com/"></label>
        <div class="wide"><div class="small" style="font-weight:600;margin-bottom:.3rem">${S('Đăng lên kênh')}</div><div class="soc-targets">${accounts.map(a => `<label><input type="checkbox" value="${esc(a.id)}" data-sft> ${icon(accPlat(a))} ${esc(accName(a))}</label>`).join('') || `<span class="small muted">${S('Workspace Lexkite chưa có kênh nào.')} ${S('Kết nối tại {link} (chọn workspace <b>Lexkite</b>).', { link: lnk(GC, 'grabcast.click/scheduler.html') })}</span>`}</div></div>
        <label class="wide">${S('Giờ đăng (để trống = lưu nháp)')}<input type="datetime-local" id="sfAt"><span class="small muted" style="font-weight:400">${S('Gợi ý giờ vàng ở Mỹ (giờ New York):')}</span><div class="soc-times" id="sfTimes">${chipsHtml()}</div></label>
      </div><div class="soc-btns"><button class="btn ghost" id="sfVal">${S('Kiểm tra')}</button><button class="btn" id="sfDraft">${S('Lưu nháp')}</button><button class="btn primary" id="sfSched">${S('Tạo & lên lịch')}</button></div><div class="soc-msg small" id="sfMsg" role="status" aria-live="polite"></div>`;
    }
    function wireForm(accounts) {
      const $ = s => box.querySelector(s), msg = (t, okk) => { const m = $('#sfMsg'); m.textContent = t; m.className = 'soc-msg small ' + (okk === true ? 'ok-t' : okk === false ? 'bad-t' : 'muted'); };
      if (!$('#socForm')) return;
      let idem = uid(), mediaId = null, mediaFor = null; // mediaFor: video đã "use" → không tạo media lại khi bấm nhiều lần
      $('#sfTimes').onclick = e => { const b = e.target.closest('[data-at]'); if (!b) return; $('#sfAt').value = localInput(new Date(+b.dataset.at)); $('#sfTimes').querySelectorAll('[data-at]').forEach(x => x.classList.toggle('on', x === b)); };
      $('#sfObj').onchange = () => { if ($('#sfObj').value) $('#sfFile').value = ''; };
      $('#sfFile').onchange = () => { if ($('#sfFile').files[0]) $('#sfObj').value = ''; };
      const buttons = on => ['#sfVal', '#sfDraft', '#sfSched'].forEach(s => { $(s).disabled = !on; });
      const payload = mids => {
        const kind = a => { const k = a && (a.kinds || a.supported_kinds || a.post_kinds); return Array.isArray(k) && k.length ? String(k[0]) : 'video'; };
        const targets = [...box.querySelectorAll('[data-sft]:checked')].map(c => ({ account_id: c.value, kind: kind(accounts.find(a => String(a.id) === c.value)), options: {} }));
        const p = { caption: $('#sfCap').value.trim(), media_ids: mids, targets };
        const title = $('#sfTitle').value.trim(), cmt = $('#sfCmt').value.trim(), link = $('#sfLink').value.trim();
        if (title) p.title = title; if (cmt) p.first_comment = cmt; if (link) p.link = link;
        return p;
      };
      const check = () => { if (!$('#sfObj').value && !($('#sfFile').files || [])[0]) return S('Chọn hoặc tải 1 video.'); if (!$('#sfCap').value.trim()) return S('Nhập caption.'); if (!box.querySelector('[data-sft]:checked')) return S('Chọn ít nhất 1 kênh.'); return ''; };
      // Tải lên kho (begin → PUT → complete) rồi "use" → mã media cho bài đăng
      const upload = file => new Promise((resolve, reject) => {
        sapi('POST', 'storage/objects', { filename: file.name, size: file.size, content_type: file.type || 'video/mp4' }).then(st => {
          const o = st.object || st.data || st, oid = pick(o, 'object_id', 'id'), up = st.upload || o.upload || {};
          const url = pick(st, 'upload_url', 'url', 'put_url') || pick(o, 'upload_url', 'url') || pick(up, 'url', 'upload_url');
          if (!oid || !/^https:\/\//.test(String(url || ''))) return reject(new Error(S('GrabCast không trả về link tải lên.')));
          const x = new XMLHttpRequest(), prog = $('#sfProg'); x.open(String(pick(st, 'method') || pick(up, 'method') || 'PUT').toUpperCase(), url);
          const hd = st.headers || st.upload_headers || up.headers || {}; let ct = false;
          for (const [k, v] of Object.entries(hd)) { if (/^(host|content-length)$/i.test(k)) continue; if (/^content-type$/i.test(k)) ct = true; x.setRequestHeader(k, String(v)); }
          if (!ct) x.setRequestHeader('Content-Type', file.type || 'video/mp4');
          prog.hidden = false;
          x.upload.onprogress = e => { if (e.lengthComputable) { const p = Math.round(e.loaded / e.total * 100); prog.firstElementChild.style.width = p + '%'; msg(S('⏳ Đang tải lên {p}%…', { p })); } };
          const abort = err => { sapi('POST', `storage/objects/${encodeURIComponent(oid)}/abort`, {}).catch(() => {}); reject(err); };
          x.onerror = () => abort(new Error(S('Tải lên thất bại ({s})', { s: 'network' })));
          x.onload = () => { if (x.status < 200 || x.status >= 300) return abort(new Error(S('Tải lên thất bại ({s})', { s: x.status }))); const lease = pick(st, 'lease_id', 'lease') || pick(o, 'lease_id', 'lease'); sapi('POST', `storage/objects/${encodeURIComponent(oid)}/complete`, lease ? { lease_id: typeof lease === 'object' ? lease.id : lease, size: file.size } : { size: file.size }).then(() => resolve(oid), reject); };
          x.send(file);
        }, reject);
      });
      const media = async () => {
        const file = ($('#sfFile').files || [])[0], key = file ? 'f:' + file.name + ':' + file.size + ':' + file.lastModified : 'o:' + $('#sfObj').value;
        if (mediaId && mediaFor === key) return mediaId;
        const oid = file ? await upload(file) : $('#sfObj').value;
        msg(S('⏳ Đang chuẩn bị video…'));
        const u = await sapi('POST', `storage/objects/${encodeURIComponent(oid)}/use`, {});
        const mid = pick(u, 'media_id') || pick(u.media || {}, 'id') || pick(u, 'id');
        if (!mid) throw new Error(S('GrabCast không trả về mã media.'));
        mediaId = mid; mediaFor = key; return mid;
      };
      const validate = async p => {
        msg(S('⏳ Đang kiểm tra…'));
        const v = await sapi('POST', 'posts/validate', p), errs = [...(v.errors || []), ...((v.targets || []).flatMap(t => t.errors || []))].map(e => (typeof e === 'object' ? [e.field || e.path, e.message || e.code].filter(Boolean).join(': ') : String(e)));
        if (v.valid === false || v.ok === false || errs.length) { msg(S('Chưa hợp lệ:') + '\n• ' + (errs.join('\n• ') || JSON.stringify(v).slice(0, 300)), false); return false; }
        return (v.warnings || []).map(w => (typeof w === 'object' ? w.message || JSON.stringify(w) : String(w)));
      };
      const run = async mode => {
        const bad = check(); if (bad) return msg(bad, false);
        let at = null;
        if (mode === 'sched') { const v = $('#sfAt').value; at = v ? new Date(v) : null; if (!at || isNaN(at)) return msg(S('Chọn giờ trước.'), false); if (+at < Date.now() + 6e4) return msg(S('Giờ đăng phải ở tương lai.'), false); }
        const n = box.querySelectorAll('[data-sft]:checked').length;
        if (mode === 'draft' && !confirm(S('Tạo bài nháp trên {n} kênh?', { n }))) return;
        if (mode === 'sched' && !confirm(S('Tạo bài và lên lịch đăng lên {n} kênh lúc {d}?', { n, d: when(at) }))) return;
        buttons(false);
        try {
          const p = payload([await media()]);
          const warns = await validate(p); if (warns === false) return;
          if (mode === 'val') return msg(S('✓ Hợp lệ') + (warns.length ? '\n⚠️ ' + warns.join('\n⚠️ ') : ''), true);
          msg(S('⏳ Đang tạo bài…'));
          const c = await sapi('POST', 'posts', p, { idem }), pid = pick(c, 'id') || pick(c.post || c.data || {}, 'id');
          idem = uid(); mediaId = null; mediaFor = null; // bài đã tạo: lần sau là bài mới
          if (mode === 'sched' && pid) {
            msg(S('⏳ Đang lên lịch…'));
            try { await sapi('POST', `posts/${encodeURIComponent(pid)}/schedule`, { scheduled_at: at.toISOString(), consent: true }); }
            catch (e) { msg(S('Đã tạo bài nhưng chưa lên lịch được: {e}', { e: errText(e) }), false); return; }
            msg(S('✓ Đã lên lịch {d}', { d: when(at) }), true);
          } else msg(S('✓ Đã lưu nháp'), true);
          setTimeout(() => { if (my === gen && box.isConnected) render(box, sapi, L, h); }, 1200);
        } catch (e) { msg(S('✗ {e}', { e: errText(e) }), false); }
        finally { if (box.isConnected && $('#sfVal')) buttons(true); }
      };
      $('#sfVal').onclick = () => run('val'); $('#sfDraft').onclick = () => run('draft'); $('#sfSched').onclick = () => run('sched');
    }
  }
  window.AdminSocial = { render, _t: { nyAt, suggest, GROUP } };
})();
