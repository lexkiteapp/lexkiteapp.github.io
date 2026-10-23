/* ⚑ Báo lỗi – phần nặng, tải lười từ js/report-pill.js. API: functions/api/report.js · tài liệu docs/REPORTS.md
 *   LexReport.open({ dom, cat?, cid?, route? }) (cat: loại chọn sẵn, vd 'content'; cid: mã nội dung, vd 'explain:p|engaged|in') → hộp thoại gửi báo lỗi (loại, mô tả, ảnh chụp tùy chọn, email nếu muốn nhận cập nhật)
 *   LexReport.page(arg, q)   → route #/report/<mã riêng> (trạng thái) · #/report (báo lỗi của tôi) · #/report/new?d=<tên miền> (từ popup add-on)
 *   LexReport.poll()         → hỏi trạng thái các báo lỗi đã gửi từ máy này, nhắc khi có thay đổi
 * Tự gửi kèm: trang (#route, bỏ ?query), ngôn ngữ, phiên bản, nền tảng, khung nhìn, UA, 20 lỗi console gần nhất, cờ sandbox, mã nội dung.
 * Add-on: chỉ tên miền của trang đang xem (không URL đầy đủ, không nội dung trang). Không gửi dữ liệu học. */
(function (w, d) {
  const t = (s, v) => (w.t ? w.t(s, v) : s), I = w.I18N;
  const BASE = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
  const API = BASE + '/api/report', SITE = 'https://lexkite.com/';
  const CATS = [['bug', '🐞', 'Lỗi ứng dụng'], ['content', '📝', 'Nội dung sai'], ['i18n', '🌐', 'Bản dịch'], ['audio', '🔊', 'Âm thanh'], ['account', '💳', 'Thanh toán / tài khoản'], ['idea', '💡', 'Góp ý']];
  const ST = { new: 'Mới', ack: 'Đã tiếp nhận', prog: 'Đang xử lý', fixed: 'Đã sửa', wontfix: 'Không sửa', dup: 'Trùng lặp' };
  const CONTENT = /^(dict|topic|read|reading|grammar|model|task1|letters|course|toeic-test|listen-test|mock|toefl-p|roleplay|call|cbt|method|pron|phrases)$/; // trang có mã nội dung (từ, bài, đề…)
  const MAXB = 300 * 1024, KEY = 'lk.rp';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const mine = () => (Array.isArray(ls.get(KEY, [])) ? ls.get(KEY, []) : []);
  // Mốc xử lý dự kiến (máy chủ trả { kind, h } – cấu hình trong Quản trị) → chữ
  const etaText = e => !e ? '' : e.kind === 'feature' ? t('Đội ngũ sẽ xem xét đề xuất – bạn sẽ được báo nếu tính năng được làm.') : t('Dự kiến xử lý: {t}', { t: e.h < 48 ? t('trong {n} giờ', { n: e.h }) : e.h === 168 ? t('trong 1 tuần') : e.h % 24 === 0 && e.h <= 120 ? t('trong {a}–{b} ngày', { a: e.h / 24 - 1, b: e.h / 24 }) : t('trong {n} ngày', { n: Math.ceil(e.h / 24) }) });
  const LOCK = 30e3; let lastSent = 0; // chống gửi lặp: khóa nút 30 giây sau mỗi lần gửi
  const kit = (m, n) => (w.Kit && Kit.svg ? `<span class="lkr-kit" aria-hidden="true">${Kit.svg(m, n)}</span>` : '');
  const when = x => { try { return new Date(x).toLocaleString(I ? I.lang() : undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return new Date(x).toISOString(); } };

  // Bản tiếng Anh của module này nằm riêng (js/i18n/en/report.js) để khung app không phình – nạp trước khi vẽ
  let dictP;
  const have = l => w.I18N_DICT && w.I18N_DICT[l] && w.I18N_DICT[l]['Báo cáo sự cố'];
  const dict = () => dictP || (dictP = (!I || I.lang() === 'vi' || (have('en') && (I.lang() === 'en' || have(I.lang())))) ? Promise.resolve() : new Promise(r => {
    const l = I.lang(), loadOne = src => new Promise(res => { const s = d.createElement('script'); s.src = src; s.onload = s.onerror = () => res(); d.head.appendChild(s); });
    loadOne('js/i18n/en/report.js').then(() => (l !== 'en' && l !== 'vi' ? loadOne(`js/i18n/${l}/report.js`) : null)).then(r);
  }));

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = d.createElement('style');
    s.textContent = `.lkr{border:0;padding:0;border-radius:20px;width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:var(--surface,#fff);color:var(--text,#111);box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.3))}
.lkr::backdrop{background:rgba(0,0,0,.45)}.lkr form,.lkr .lkr-done{padding:1rem 1.1rem calc(1rem + env(safe-area-inset-bottom));display:grid;gap:.7rem}
.lkr-hd{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.lkr-hd h2{margin:0;font-size:1.1rem}.lkr-x{border:0;background:none;color:var(--muted);font-size:1.1rem;min-width:40px;min-height:40px;border-radius:50%;cursor:pointer}
.lkr fieldset{border:0;margin:0;padding:0}.lkr legend,.lkr .lkr-lb{font-weight:700;font-size:.85rem;margin-bottom:.35rem;padding:0}
.lkr-cats{display:flex;flex-wrap:wrap;gap:.4rem}.lkr-cats label{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .7rem;border:1px solid var(--line);border-radius:999px;font-size:.82rem;cursor:pointer;background:var(--surface-2,transparent)}
.lkr-cats input{position:absolute;opacity:0;width:1px;height:1px}.lkr-cats label:has(input:checked){border-color:var(--primary);background:var(--primary-soft);color:var(--text);font-weight:700}.lkr-cats label:has(input:focus-visible){outline:2px solid var(--primary);outline-offset:2px}
.lkr textarea,.lkr input[type=email],.lkr input[type=text]{width:100%;box-sizing:border-box;font:inherit;padding:.6rem .7rem;border:1px solid var(--line);border-radius:12px;background:var(--bg,#fff);color:var(--text)}
.lkr textarea{min-height:110px;resize:vertical}.lkr-row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.lkr-file{display:inline-flex;align-items:center;gap:.35rem;cursor:pointer;font-size:.85rem;padding:.4rem .7rem;border:1px dashed var(--line);border-radius:10px}
.lkr-file input{position:absolute;opacity:0;width:1px;height:1px}.lkr-file:focus-within{outline:2px solid var(--primary)}.lkr-prev{display:flex;gap:.5rem;align-items:center}.lkr-prev img{max-height:64px;max-width:120px;border-radius:8px;border:1px solid var(--line)}
.lkr-chk{display:flex;gap:.45rem;align-items:center;font-size:.88rem}.lkr-note{font-size:.76rem;color:var(--muted);margin:0}.lkr-err{color:var(--again,#c0392b);font-size:.85rem;margin:0;min-height:1em}
.lkr-act{display:flex;justify-content:flex-end;gap:.5rem}.lkr-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.lkr-tid{font-size:1.6rem;font-weight:800;letter-spacing:.02em;margin:.2rem 0}
.lkr-st{display:inline-block;padding:.2rem .6rem;border-radius:999px;font-size:.78rem;font-weight:700;background:var(--surface-3,#eee)}.lkr-st.new{background:var(--accent-soft)}.lkr-st.ack,.lkr-st.prog{background:var(--gold-soft)}.lkr-st.fixed{background:var(--good-soft)}.lkr-st.wontfix,.lkr-st.dup{background:var(--surface-3)}
.lkr-page{max-width:640px;margin:1.2rem auto;display:grid;gap:1rem}.lkr-reply{white-space:pre-wrap;border-left:3px solid var(--primary);padding:.4rem .8rem;background:var(--surface-2);border-radius:0 10px 10px 0}
.lkr-list{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}.lkr-list a{display:flex;justify-content:space-between;gap:.6rem;padding:.55rem .7rem;border:1px solid var(--line);border-radius:12px;color:inherit;text-decoration:none}
.lkr-thx{text-align:center;display:grid;justify-items:center;gap:.25rem}.lkr-thx h2{margin:.2rem 0;font-size:1.15rem}.lkr-kit svg{display:block}.lkr-eta{margin:.2rem 0;font-weight:600}
.lkr-tl{list-style:none;margin:.8rem 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;counter-reset:s}.lkr-tl li{position:relative;padding-top:1.6rem;font-size:.8rem;text-align:center;color:var(--muted)}
.lkr-tl li::before{counter-increment:s;content:counter(s);position:absolute;top:0;left:50%;transform:translateX(-50%);width:1.3rem;height:1.3rem;border-radius:50%;display:grid;place-items:center;font-size:.72rem;font-weight:800;background:var(--surface-3);color:var(--muted)}
.lkr-tl li.done::before{content:'✓';background:var(--good-soft);color:var(--text)}.lkr-tl li.cur{color:var(--text)}.lkr-tl li.cur::before{background:var(--primary);color:#fff}.lkr-tl small{display:block}
.lkr-toast{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));max-width:420px;margin:auto;z-index:70;padding:.75rem .9rem;border-radius:14px;background:var(--surface);color:var(--text);border:1px solid var(--line);box-shadow:var(--shadow-lg);display:flex;gap:.6rem;align-items:center;justify-content:space-between}`;
    d.head.appendChild(s);
  }

  // ---------- Ngữ cảnh kỹ thuật ----------
  const plat = () => { const c = w.Capacitor, p = c && c.getPlatform ? c.getPlatform() : ''; return /^chrome-extension:/.test(location.protocol) ? 'ext' : p === 'ios' || p === 'android' ? p : /^capacitor:/.test(location.protocol) || c ? 'app' : w.matchMedia && matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web'; };
  async function version() {
    try { if (w.chrome && chrome.runtime && chrome.runtime.getManifest) return chrome.runtime.getManifest().version; } catch (e) { /* bỏ qua */ }
    try { const A = w.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (A && A.getInfo) { const i = await A.getInfo(); return i.version + (i.build ? ' (' + i.build + ')' : ''); } } catch (e) { /* bỏ qua */ }
    try { const k = (await caches.keys()).find(x => /^lexkite-\d/.test(x)); if (k) return k.slice(8); } catch (e) { /* bỏ qua */ }
    return '';
  }
  const sandbox = () => /[?&](sandbox|demo)=/.test(location.search) || !!(w.Core && Core.Store && Core.Store.sandbox);
  async function context(o) {
    const h = (o.route != null ? o.route : location.hash.replace(/^#\/?/, '')).split('?')[0], parts = h.split('/');
    let cid = o.cid ? String(o.cid) : ''; if (!cid && CONTENT.test(parts[0]) && parts.length > 1) { try { cid = decodeURIComponent(parts.slice(1).join('/')); } catch (e) { cid = parts.slice(1).join('/'); } }
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* bỏ qua */ }
    return { route: h.slice(0, 120), lang: I ? I.lang() : '', ver: await version(), plat: plat(), vw: innerWidth + 'x' + innerHeight, dpr: w.devicePixelRatio || 1, ua: navigator.userAgent.slice(0, 300), sandbox: sandbox(), cid: cid.slice(0, 120), dom: o.dom || '', tz, online: navigator.onLine };
  }
  const device = () => { try { const v = localStorage.getItem('lk.vid') || ''; return /^[A-Za-z0-9_-]{16,64}$/.test(v) ? v : ''; } catch (e) { return ''; } };
  async function post(body, auth) {
    const h = { 'Content-Type': 'application/json' }, dv = device(); if (dv) h['X-Lexkite-Device'] = dv;
    try { const u = auth && w.Sync && Sync.user; if (u && u.getIdToken) h.Authorization = 'Bearer ' + await u.getIdToken(); } catch (e) { /* khách */ }
    const r = await fetch(API, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); j._s = r.status; return j;
  }

  // ---------- Ảnh chụp: người dùng đính kèm/dán ảnh → nén WebP/JPEG ≤ 300 KB ngay trên máy ----------
  async function shrink(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('type');
    const src = URL.createObjectURL(file);
    try {
      const img = await new Promise((y, n) => { const i = new Image(); i.onload = () => y(i); i.onerror = n; i.src = src; });
      let max = 1600, q = 0.82;
      for (let k = 0; k < 9; k++) {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = d.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/webp', q); if (!/^data:image\/webp/.test(out)) out = c.toDataURL('image/jpeg', q);
        if (out.length * 0.75 <= MAXB) return out;
        if (q > 0.5) q -= 0.12; else { q = 0.72; max = Math.round(max * 0.72); }
      }
      throw new Error('big');
    } finally { URL.revokeObjectURL(src); }
  }

  // ---------- Hộp thoại gửi ----------
  let dlg = null;
  async function open(o) {
    o = o || {}; await dict(); style();
    if (dlg) dlg.remove();
    const ctxP = context(o), ms0 = Date.now(), em = (w.Sync && Sync.user && Sync.user.email) || (w.App && App.state && App.state.user && App.state.user.email) || '';
    let shot = '';
    dlg = d.createElement('dialog'); dlg.className = 'lkr'; dlg.setAttribute('aria-labelledby', 'lkrH');
    dlg.innerHTML = `<form novalidate>
      <div class="lkr-hd"><h2 id="lkrH"><span aria-hidden="true">⚑</span> ${esc(t('Báo cáo sự cố'))}</h2><button type="button" class="lkr-x" data-x aria-label="${esc(t('Đóng'))}">✕</button></div>
      <fieldset><legend>${esc(t('Loại vấn đề'))}</legend><div class="lkr-cats">${CATS.map(([k, ic, l], i) => `<label><input type="radio" name="cat" value="${k}"${(o.cat ? k === o.cat : i === 0) ? ' checked' : ''}><span aria-hidden="true">${ic}</span> ${esc(t(l))}</label>`).join('')}</div></fieldset>
      <div><label class="lkr-lb" for="lkrMsg">${esc(t('Mô tả'))}</label><textarea id="lkrMsg" maxlength="4000" required placeholder="${esc(t('Bạn gặp chuyện gì? Bạn đang làm gì khi lỗi xảy ra?'))}"></textarea></div>
      ${o.dom ? `<p class="lkr-note">${esc(t('Trang web: {d}', { d: o.dom }))}</p>` : ''}
      <div class="lkr-row"><label class="lkr-file"><input type="file" accept="image/*" id="lkrFile"><span aria-hidden="true">📎</span> ${esc(t('Ảnh chụp màn hình (không bắt buộc)'))}</label><div class="lkr-prev" id="lkrPrev"></div></div>
      <label class="lkr-chk"><input type="checkbox" id="lkrNo"> ${esc(t('Gửi email cho tôi khi có cập nhật'))}</label>
      <div id="lkrEmW" hidden><label class="lkr-lb" for="lkrEm">${esc(t('Email của bạn'))}</label><input type="email" id="lkrEm" autocomplete="email" maxlength="200" value="${esc(em)}"></div>
      <div class="lkr-hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="lkr-note">${esc(t('Gửi kèm thông tin kỹ thuật: trang, ngôn ngữ, phiên bản, thiết bị và lỗi gần nhất. Không gửi dữ liệu học của bạn.'))}</p>
      <p class="lkr-err" id="lkrErr" role="alert"></p>
      <div class="lkr-act"><button type="button" class="btn ghost" data-x>${esc(t('Hủy'))}</button><button type="submit" class="btn primary" id="lkrGo">${esc(t('Gửi'))}</button></div>
    </form>`;
    d.body.appendChild(dlg);
    const $ = s => dlg.querySelector(s), err = m => { $('#lkrErr').textContent = m || ''; };
    const close = () => { try { dlg.close(); } catch (e) { /* bỏ qua */ } dlg.remove(); dlg = null; };
    dlg.querySelectorAll('[data-x]').forEach(b => { b.onclick = close; });
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    $('#lkrNo').onchange = () => { $('#lkrEmW').hidden = !$('#lkrNo').checked; if ($('#lkrNo').checked) $('#lkrEm').focus(); };
    const setShot = async f => {
      err(''); if (!f) return;
      try { shot = await shrink(f); $('#lkrPrev').innerHTML = `<img src="${shot}" alt="${esc(t('Ảnh chụp màn hình (không bắt buộc)'))}"><button type="button" class="btn ghost sm" id="lkrRm">${esc(t('Gỡ ảnh'))}</button>`; $('#lkrRm').onclick = () => { shot = ''; $('#lkrPrev').innerHTML = ''; $('#lkrFile').value = ''; }; }
      catch (e) { shot = ''; err(t('Ảnh quá lớn hoặc không đọc được.')); }
    };
    $('#lkrFile').onchange = e => setShot(e.target.files && e.target.files[0]);
    dlg.addEventListener('paste', e => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => /^image\//.test(x.type)); if (it) { e.preventDefault(); setShot(it.getAsFile()); } });
    $('form').onsubmit = async e => {
      e.preventDefault(); err('');
      const msg = $('#lkrMsg').value.trim(), notify = $('#lkrNo').checked, email = notify ? $('#lkrEm').value.trim() : '';
      if (msg.length < 10) { err(t('Hãy mô tả ít nhất 10 ký tự.')); $('#lkrMsg').focus(); return; }
      if (notify && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { err(t('Email không hợp lệ.')); $('#lkrEm').focus(); return; }
      const go = $('#lkrGo'); go.disabled = true; go.textContent = t('Đang gửi…');
      let r; try { r = await post({ op: 'create', cat: (dlg.querySelector('input[name=cat]:checked') || {}).value, msg, notify, email, ctx: await ctxP, errs: (w.__lkErrs || []).slice(-20), shot, hp: dlg.querySelector('input[name=website]').value, ms: Date.now() - ms0 }, true); } catch (x) { r = { _s: 0 }; }
      go.disabled = false; go.textContent = t('Gửi');
      if (!r.ok) { err(r._s === 429 ? t('Bạn gửi hơi nhiều – thử lại sau ít phút.') : r.error === 'email' ? t('Email không hợp lệ.') : r.error === 'short' ? t('Hãy mô tả ít nhất 10 ký tự.') : r.error === 'shot' ? t('Ảnh quá lớn hoặc không đọc được.') : t('Không gửi được. Kiểm tra kết nối rồi thử lại.')); return; }
      lastSent = Date.now(); ls.set('lk.rpl', lastSent);
      if (r.token) { const a = mine().filter(x => x.t !== r.token); a.push({ t: r.token, id: r.id, at: Date.now(), upd: Date.now(), st: 'new', cat: (dlg.querySelector('input[name=cat]:checked') || {}).value }); ls.set(KEY, a.slice(-20)); }
      done(r, notify);
    };
    function done(r, notify) {
      const link = r.token ? (/^https?:$/.test(location.protocol) && BASE === '' ? location.origin + location.pathname : SITE) + '#/report/' + r.token : '';
      dlg.innerHTML = `<div class="lkr-done" role="status"><div class="lkr-hd"><span></span><button type="button" class="lkr-x" data-x aria-label="${esc(t('Đóng'))}">✕</button></div>
        <div class="lkr-thx">${kit('cheer', 84)}<h2 id="lkrH">${esc(t('Cảm ơn bạn đã giúp Lexkite tốt hơn!'))}</h2>
        ${r.id ? `<div class="lkr-note">${esc(t('Mã báo lỗi'))}</div><div class="lkr-tid">${esc(r.id)}</div>` : ''}
        ${r.eta ? `<p class="lkr-eta">⏱ ${esc(etaText(r.eta))}</p>` : ''}
        ${notify ? '' : `<p class="lkr-note">${esc(t('Bạn sẽ thấy cập nhật ngay trong app (mục Báo lỗi của tôi).'))}</p>`}</div>
        ${link ? `<label class="lkr-lb" for="lkrLink">${esc(t('Lưu đường dẫn riêng này để theo dõi trạng thái:'))}</label><div class="lkr-row"><input type="text" id="lkrLink" readonly value="${esc(link)}" style="flex:1"><button type="button" class="btn ghost sm" id="lkrCp">${esc(t('Sao chép liên kết'))}</button></div>` : ''}
        <div class="lkr-act">${r.token ? `<a class="btn primary" href="#/report/${esc(r.token)}" data-x>${esc(t('Theo dõi tiến độ'))}</a>` : ''}<button type="button" class="btn ghost" data-x>${esc(t('Đóng'))}</button></div></div>`;
      dlg.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', close));
      const cp = dlg.querySelector('#lkrCp'); if (cp) cp.onclick = async () => { const i = dlg.querySelector('#lkrLink'); try { await navigator.clipboard.writeText(i.value); } catch (e) { i.select(); try { d.execCommand('copy'); } catch (x) { /* bỏ qua */ } } cp.textContent = t('Đã sao chép'); };
      (dlg.querySelector('.btn.primary') || dlg).focus();
    }
    const lockBtn = () => { const go = $('#lkrGo'), left = Math.ceil((LOCK - (Date.now() - Math.max(lastSent, +ls.get('lk.rpl', 0) || 0))) / 1000); if (!go) return; if (left > 0) { go.disabled = true; err(t('Vui lòng đợi {n} giây trước khi gửi tiếp.', { n: left })); setTimeout(lockBtn, 1000); } else if (go.disabled && go.textContent === t('Gửi')) { go.disabled = false; err(''); } };
    lockBtn();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => { const m = dlg && dlg.querySelector('#lkrMsg'); if (m) m.focus(); }, 30);
    return dlg;
  }

  // ---------- Trang trạng thái (#/report/<mã>) & "Báo lỗi của tôi" (#/report) ----------
  const chip = s => `<span class="lkr-st ${esc(s)}">${esc(t(ST[s] || s))}</span>`;
  const catName = k => { const c = CATS.find(x => x[0] === k); return c ? c[1] + ' ' + t(c[2]) : k; };
  function list() {
    const a = mine().slice().reverse();
    return a.length ? `<ul class="lkr-list">${a.map(x => `<li><a href="#/report/${esc(x.t)}"><span><b>${esc(x.id)}</b> · ${esc(catName(x.cat))}</span>${chip(x.st || 'new')}</a></li>`).join('')}</ul>` : '';
  }
  // Dòng thời gian: Đã nhận → Đang xử lý → Đã sửa (kèm phiên bản sửa)
  function timeline(r) {
    const lvl = { new: 0, ack: 0, prog: 1, fixed: 2 }[r.status];
    if (lvl == null) return '';
    const steps = [[t('Đã nhận'), when(r.at)], [t('Đang xử lý'), ''], [r.fix_ver ? t('Đã sửa trong phiên bản {v}', { v: r.fix_ver }) : t('Đã sửa'), r.fixed_at ? when(r.fixed_at) : '']];
    return `<ol class="lkr-tl" aria-label="${esc(t('Trạng thái báo lỗi'))}">${steps.map(([l, d], i) => `<li class="${i < lvl ? 'done' : i === lvl ? 'cur' : ''}"${i === lvl ? ' aria-current="step"' : ''}><b>${esc(l)}</b>${d && i <= lvl ? `<small>${esc(d)}</small>` : ''}</li>`).join('')}</ol>`;
  }
  async function page(arg, q) {
    await dict(); style();
    const view = d.getElementById('view') || d.body;
    const tok = /^[A-Za-z0-9_-]{24}$/.test(arg || '') ? arg : '';
    const newBtn = `<button type="button" class="btn primary" id="lkrNew"><span aria-hidden="true">⚑</span> ${esc(t('Báo cáo sự cố'))}</button>`;
    const wire = () => { const b = d.getElementById('lkrNew'); if (b) b.onclick = () => open({}); };
    if (!tok) {
      view.innerHTML = `<div class="lkr-page"><h1>${esc(t('Báo lỗi của tôi'))}</h1>${list() || `<p class="muted">${esc(t('Bạn chưa gửi báo lỗi nào.'))}</p>`}<div>${newBtn}</div></div>`;
      wire();
      if (arg === 'new') { const dom = String((q && q.get && q.get('d')) || '').toLowerCase(); open({ dom: /^[a-z0-9.-]{1,100}$/.test(dom) && dom.includes('.') ? dom : '', route: 'popup' }); }
      return;
    }
    view.innerHTML = `<div class="lkr-page" aria-busy="true"><h1>${esc(t('Trạng thái báo lỗi'))}</h1><p class="muted">${esc(t('Đang tải…'))}</p></div>`;
    let r; try { r = await post({ op: 'status', t: tok }); } catch (e) { r = { _s: 0 }; }
    if (!r.id) { view.innerHTML = `<div class="lkr-page"><h1>${esc(t('Trạng thái báo lỗi'))}</h1><p>${esc(r._s === 404 ? t('Không tìm thấy báo lỗi này.') : t('Không gửi được. Kiểm tra kết nối rồi thử lại.'))}</p><div>${newBtn}</div></div>`; wire(); return; }
    const a = mine(), me = a.find(x => x.t === tok); if (me) { me.st = r.status; me.upd = r.upd; me.seen = r.upd; ls.set(KEY, a); }
    view.innerHTML = `<div class="lkr-page"><h1>${esc(t('Trạng thái báo lỗi'))}</h1>
      <div class="card"><div class="lkr-row" style="justify-content:space-between"><div class="lkr-tid">${esc(r.id)}</div>${chip(r.status)}</div>
        <p class="muted small">${esc(catName(r.cat))} · ${esc(t('Gửi lúc {d}', { d: when(r.at) }))}${r.upd > r.at ? ' · ' + esc(t('Cập nhật {d}', { d: when(r.upd) })) : ''}</p>
        ${timeline(r)}
        ${r.status === 'fixed' ? `<div class="lkr-thx">${kit('win', 64)}<p><b>${esc(t('Cảm ơn bạn đã giúp Lexkite tốt hơn!'))}</b></p></div>` : r.status === 'wontfix' || r.status === 'dup' ? '' : `<p class="lkr-eta">⏱ ${esc(etaText(r.eta))}</p>`}
        ${r.dup ? `<p>${esc(t('Trùng với {id}', { id: r.dup }))}</p>` : ''}
        ${r.reply ? `<div><div class="lkr-lb">${esc(t('Phản hồi từ Lexkite'))}</div><div class="lkr-reply">${esc(r.reply)}</div></div>` : ''}
      </div>
      ${a.length > 1 ? `<h2 style="font-size:1rem;margin:0">${esc(t('Báo lỗi của tôi'))}</h2>${list()}` : ''}<div>${newBtn}</div></div>`;
    wire();
  }

  // ---------- Nhắc khi trạng thái đổi (trong app) ----------
  async function poll() {
    const a = mine(); ls.set('lk.rpc', Date.now());
    if (!a.length) return [];
    let r; try { r = await post({ op: 'mine', ts: a.map(x => x.t) }); } catch (e) { return []; }
    const rows = r.rows || [], changed = [];
    for (const x of a) { const s = rows.find(y => y.t === x.t); if (!s) continue; if (s.upd > (x.seen || x.upd || 0)) changed.push({ ...x, st: s.status }); x.st = s.status; x.upd = s.upd; }
    ls.set(KEY, a);
    if (changed.length && d.body) {
      await dict(); style();
      const c = changed[changed.length - 1], el = d.createElement('div');
      el.className = 'lkr-toast'; el.setAttribute('role', 'status');
      el.innerHTML = `<span>⚑ ${esc(t('Báo lỗi {id}: {s}', { id: c.id, s: t(ST[c.st] || c.st) }))}</span><span class="lkr-row"><a class="btn ghost sm" href="#/report/${esc(c.t)}">${esc(t('Xem trạng thái'))}</a><button type="button" class="lkr-x" aria-label="${esc(t('Đóng'))}">✕</button></span>`;
      const rm = () => el.remove();
      el.querySelector('button').onclick = rm; el.querySelector('a').addEventListener('click', rm);
      d.body.appendChild(el); setTimeout(rm, 15000);
    }
    return changed;
  }

  w.LexReport = { open, page, poll, _t: { shrink, context, etaText, timeline, CATS, ST, mine } };
})(window, document);
