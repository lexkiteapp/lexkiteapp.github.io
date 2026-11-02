/* Vé "người thật" cho khách chưa đăng nhập (tải lười – ai.js, roleplay.js, report.js, form liên hệ gọi qua Human.load()). Tài liệu docs/HUMAN.md
 *   Human.ticket()      → Promise<vé|''>  vé còn hạn trong máy, hết thì giải Turnstile trong iframe ẩn https://lexkite.com/human.html
 *                         (hiện khung khi Cloudflare cần bấm) → POST /api/human → lưu localStorage 'lk.human' (12 h, gắn mã thiết bị UI.dev())
 *   Human.headers(h)    → thêm header X-Lexkite-Human nếu đã có vé (đồng bộ, không mở iframe)
 *   Human.token()       → Promise<token Turnstile|''> (form liên hệ/báo lỗi trong app gốc – nơi không render được widget trực tiếp)
 * Trang add-on (chrome-extension://): vé gắn cả mã thiết bị của service worker (chrome.storage 'lk.dev') và được chép vào chrome.storage
 * 'lk.human' để background.js (giải thích từ trên trang web) dùng chung – không thêm quyền mới. */
(function (w, d) {
  if (w.Human) return;
  const SITE = 'https://lexkite.com', onSite = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname);
  const API = (onSite ? '' : SITE) + '/api/human', FRAME = (onSite ? location.origin : SITE) + '/human.html', KEY = 'lk.human';
  const t = (s, v) => (w.t ? w.t(s, v) : s);
  const dev = () => { try { return (w.UI && UI.dev && UI.dev()) || localStorage.getItem('lk.dev') || ''; } catch (e) { return ''; } };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const fresh = x => !!(x && typeof x.t === 'string' && x.d === dev() && x.e - Date.now() > 10 * 60e3); // còn ≥ 10 phút
  const ext = () => { try { return location.protocol === 'chrome-extension:' && w.chrome && chrome.storage && chrome.storage.local ? chrome.storage.local : null; } catch (e) { return null; } };
  // Mã thiết bị của service worker add-on (cùng thuật toán background.js deviceId())
  async function swDev() {
    const s = ext(); if (!s) return '';
    try {
      let v = (await s.get('lk.dev'))['lk.dev'];
      if (!/^[a-z0-9]{16,64}$/.test(v || '')) { v = [...crypto.getRandomValues(new Uint8Array(20))].map(b => (b % 36).toString(36)).join(''); await s.set({ 'lk.dev': v }); }
      return v;
    } catch (e) { return ''; }
  }

  // Giải Turnstile trong iframe human.html; khung chỉ hiện khi Cloudflare cần người dùng bấm
  let tokP = null;
  function token() {
    return tokP || (tokP = new Promise(res => {
      const wrap = d.createElement('div'), f = d.createElement('iframe');
      wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', t('Xác minh nhanh để tiếp tục'));
      wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;z-index:2147483646';
      wrap.innerHTML = `<div style="background:var(--surface,#fff);color:var(--text,#111);border-radius:16px;padding:14px;max-width:340px;margin:auto;box-shadow:0 10px 40px rgba(0,0,0,.25);font:14px system-ui,sans-serif"><p style="margin:0 0 8px;font-weight:700">${t('Xác minh nhanh để tiếp tục')}</p></div>`;
      f.title = t('Xác minh nhanh để tiếp tục'); f.style.cssText = 'border:0;width:310px;height:80px;display:block;margin:auto';
      let lang = 'auto'; try { lang = (w.I18N && I18N.lang()) || 'auto'; } catch (e) { /* bỏ qua */ }
      f.src = FRAME + '?o=' + encodeURIComponent(location.origin) + '&l=' + encodeURIComponent(lang);
      let done = false;
      let to = 0; const arm = ms => { clearTimeout(to); to = setTimeout(() => end(''), ms); };
      const end = v => { if (done) return; done = true; w.removeEventListener('message', on); clearTimeout(to); wrap.remove(); tokP = null; res(v || ''); };
      const show = on => { wrap.style.cssText = on ? 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:2147483646;padding:16px' : 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;z-index:2147483646'; };
      const on = e => {
        if (e.source !== f.contentWindow || e.origin !== new URL(FRAME).origin || !e.data || e.data.lkh !== 1) return;
        const m = e.data;
        if (m.t === 'token' && typeof m.token === 'string') end(m.token);
        else if (m.t === 'show') { show(true); arm(120000); } // cần bấm → chờ người dùng tối đa 2 phút
        else if (m.t === 'hide') show(false);
        else if (m.t === 'error' || m.t === 'expired') end('');
      };
      w.addEventListener('message', on);
      arm(15000); // xác minh ngầm không xong trong 15 s (mạng chặn challenges.cloudflare.com…) → thôi, nơi gọi chạy tiếp không vé
      wrap.firstChild.appendChild(f); (d.body || d.documentElement).appendChild(wrap);
    }));
  }

  let tkP = null, failAt = 0; // xác minh ngầm vừa thất bại (mạng chặn challenges.cloudflare.com, app gốc lỗi…) → 10 phút không thử lại trừ khi force
  function ticket(force) {
    const c = read(); if (!force && fresh(c)) return Promise.resolve(c.t);
    if (!force && Date.now() - failAt < 6e5) return Promise.resolve('');
    return tkP || (tkP = (async () => {
      try {
        const me = dev(); if (!me) return '';
        const tok = await token(); if (!tok) { failAt = Date.now(); return ''; }
        const d2 = await swDev();
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lexkite-Device': me }, body: JSON.stringify(d2 && d2 !== me ? { token: tok, dev2: d2 } : { token: tok }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ticket) { failAt = Date.now(); return ''; }
        try { localStorage.setItem(KEY, JSON.stringify({ t: j.ticket, e: j.exp, d: me })); } catch (e) { /* bỏ qua */ }
        const s = ext(); if (s && d2) try { await s.set({ 'lk.human': { t: j.ticket, e: j.exp, d: d2 } }); } catch (e) { /* bỏ qua */ }
        return j.ticket;
      } catch (e) { return ''; } finally { tkP = null; }
    })());
  }
  const headers = h => { const c = read(); if (fresh(c)) h['X-Lexkite-Human'] = c.t; return h; };
  w.Human = { ticket, token, headers, clear: () => { try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ } } };
})(window, document);
