/* Lexkite iOS E2E – bộ chạy kiểm thử NẰM TRONG app (chỉ chèn vào bản build giả lập của workflow ios-e2e.yml, KHÔNG vào bản phát hành).
 * Chạy trong WKWebView thật của app Capacitor: đi lần lượt mọi trang/tính năng, ghi lỗi JS, yêu cầu mạng hỏng, tràn bố cục,
 * chữ chưa dịch, màn hình trắng, gọi plugin gốc (TTS, Share, thông báo, Filesystem)…
 * Kênh với máy chủ (scripts/test/ios-e2e.mjs): ghi sự kiện JSONL vào Documents/e2e/events.jsonl qua plugin Filesystem;
 * máy chủ chụp màn hình / chạy lệnh simctl rồi ghi file Documents/e2e/ack-<id> để báo xong.
 * Trạng thái (bước đang chạy) lưu localStorage → chạy tiếp được sau khi đổi ngôn ngữ (tải lại trang) hoặc app bị khởi động lại. */
(function () {
  'use strict';
  const W = window, KEY = '__e2e', DOC = 'DOCUMENTS';
  try { Object.defineProperty(navigator, 'webdriver', { get: () => true }); } catch (e) { /* tắt thống kê truy cập của app khi kiểm thử */ }
  const Cap = W.Capacitor, P = () => (W.Capacitor && W.Capacitor.Plugins) || {};
  const now = () => Date.now();
  const inApp = () => !!document.getElementById('view'); // app gốc: app học nằm ở www/index.html (gốc), không phải /app/
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } })() || { i: 0, n: 0 };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* bỏ qua */ } };
  let cur = { step: '(load)', route: location.pathname + location.hash };
  // ---------- kênh ghi sự kiện ----------
  let q = Promise.resolve(), seq = 0;
  const emit = ev => {
    ev.t = now(); ev.step = ev.step || cur.step; ev.lang = (W.I18N && W.I18N.lang && W.I18N.lang()) || '';
    const line = JSON.stringify(ev) + '\n';
    q = q.then(() => {
      const FS = P().Filesystem; if (!FS) return;
      return FS.appendFile({ path: 'e2e/events.jsonl', data: line, directory: DOC, encoding: 'utf8' }).catch(() => FS.writeFile({ path: 'e2e/events.jsonl', data: line, directory: DOC, encoding: 'utf8', recursive: true }).catch(() => {}));
    });
    return q;
  };
  const waitAck = async (id, ms) => {
    const FS = P().Filesystem, end = now() + ms;
    while (now() < end) {
      try { const r = await FS.readFile({ path: 'e2e/ack-' + id, directory: DOC, encoding: 'utf8' }); return r.data; } catch (e) { /* chưa có */ }
      await sleep(250);
    }
    return null;
  };
  const host = async (cmd, extra, ms) => { const id = 'h' + st.n + '-' + (++seq); await emit({ type: 'host', id, cmd, ...(extra || {}) }); return waitAck(id, ms || 20000); };
  const shot = async name => { const id = 's' + st.n + '-' + (++seq); await emit({ type: 'shot', id, name }); return waitAck(id, 15000); };

  // ---------- thu lỗi ----------
  const issues = []; // lỗi trong bước hiện tại
  const add = (kind, msg, extra) => { const m = String(msg || '').slice(0, 400); if (issues.some(x => x.kind === kind && x.msg === m)) return; issues.push({ kind, msg: m, ...(extra || {}) }); };
  const IGN = /ResizeObserver loop|E2E\||e2e\/(ack-|events)/; // e2e/ack-*: harness dò file báo xong (plugin Filesystem tự ghi console.error khi chưa có)
  W.addEventListener('error', e => {
    const tg = e.target;
    if (tg && tg !== W && (tg.src || tg.href)) { add('resource', (tg.tagName || '') + ' ' + (tg.currentSrc || tg.src || tg.href)); return; }
    if (!IGN.test(e.message)) add('js', (e.message || 'error') + (e.filename ? ' @' + String(e.filename).replace(/^.*\/\/[^/]+/, '') + ':' + e.lineno : ''));
  }, true);
  W.addEventListener('unhandledrejection', e => { const r = e.reason; add('promise', r && (r.stack || r.message) ? String(r.message || r) + ' ' + String(r.stack || '').split('\n')[1] : String(r)); });
  document.addEventListener('securitypolicyviolation', e => add('csp', e.violatedDirective + ' ' + e.blockedURI));
  ['error', 'warn'].forEach(lv => { const o = console[lv]; console[lv] = function (...a) { try { const s = a.map(x => x && x.stack ? x.stack : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '); if (!IGN.test(s)) add('console.' + lv, s); } catch (e) { /* bỏ qua */ } return o.apply(this, a); }; });
  const net = [];
  const of = W.fetch;
  if (of) W.fetch = function (input, init) {
    const url = String(input && input.url || input), t0 = now();
    return of.apply(this, arguments).then(r => { net.push({ url, status: r.status, ms: now() - t0 }); if (net.length > 400) net.shift(); if (!r.ok && r.status !== 0 && r.type !== 'opaque') add('http', r.status + ' ' + url); return r; },
      err => { net.push({ url, err: String(err && err.message || err) }); add('fetch-fail', url + ' – ' + (err && err.message || err)); throw err; });
  };
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = String(u); return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () { this.addEventListener('loadend', () => { if (!this.status || this.status >= 400) add('xhr-fail', (this.status || 'network') + ' ' + this.__u); }); return XS.apply(this, arguments); };
  const opened = [];
  const WO = W.open; W.open = function (u, tg) { opened.push(String(u)); add('window.open', String(u) + ' target=' + (tg || '')); return WO ? WO.apply(this, arguments) : null; };
  const MP = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { const src = this.currentSrc || this.src; const p = MP.apply(this, arguments); if (p && p.catch) p.catch(e => e && e.name !== 'AbortError' && add('media.play', (e && e.name) + ': ' + (e && e.message) + ' ' + String(src).slice(-80))); return p; };
  // Gọi plugin gốc: ghi lại; Share/thông báo bị CHẶN trong vòng chính (hộp hệ thống sẽ che màn hình) – có bước gọi thật riêng ở cuối
  const nativeCalls = [];
  let stubNative = true;
  // navigator.share (Web Share của WKWebView) mở bảng chia sẻ hệ thống che màn hình → cũng chặn trong vòng chính
  const NS = navigator.share && navigator.share.bind(navigator);
  if (NS) try { Object.defineProperty(navigator, 'share', { configurable: true, value: o => { nativeCalls.push({ plugin: 'navigator', method: 'share', arg: JSON.stringify(o || {}).slice(0, 160), step: cur.step, stubbed: stubNative }); return stubNative ? Promise.resolve() : NS(o); } }); } catch (e) { /* bỏ qua */ }
  function wrapPlugins() {
    const ps = P(); const spec = { TextToSpeech: ['speak'], Share: ['share', 'canShare'], LocalNotifications: ['requestPermissions', 'schedule', 'checkPermissions'], Filesystem: ['writeFile'], Haptics: ['vibrate', 'impact'], StatusBar: ['setStyle'] };
    for (const [pn, ms] of Object.entries(spec)) {
      const pl = ps[pn]; if (!pl || pl.__e2e) continue;
      for (const m of ms) {
        const orig = pl[m]; if (typeof orig !== 'function') continue;
        try {
          const f = function (o) {
            if (pn === 'Filesystem' && o && /^e2e\//.test(o.path || '')) return orig.apply(pl, arguments);
            const rec = { plugin: pn, method: m, arg: JSON.stringify(o || {}).slice(0, 160), step: cur.step }; nativeCalls.push(rec);
            if (stubNative && ((pn === 'Share' && m === 'share') || (pn === 'LocalNotifications' && m === 'requestPermissions'))) { rec.stubbed = true; return Promise.resolve(pn === 'Share' ? {} : { display: 'denied' }); }
            const p = orig.apply(pl, arguments);
            if (p && p.then) p.then(() => { rec.ok = true; }, e => { rec.err = String(e && e.message || e); add('native.' + pn + '.' + m, rec.err); });
            return p;
          };
          Object.defineProperty(pl, m, { configurable: true, writable: true, value: f });
        } catch (e) { /* proxy không cho ghi */ }
      }
      try { pl.__e2e = 1; } catch (e) { /* bỏ qua */ }
    }
  }
  wrapPlugins();

  // ---------- kiểm tra 1 màn hình ----------
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ chữ riêng tiếng Việt (bỏ â ê ô – có trong pt/fr)
  const PLACEHOLDER = /(coming soon|arrives with the official|official release|sắp ra mắt|chưa hỗ trợ trong app|not available in the app|not supported in this app)/i;
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  function safeInsets() {
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none';
    document.body.appendChild(d); const cs = getComputedStyle(d); const r = { top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight) }; d.remove(); return r;
  }
  function audit(name) {
    const out = { name, hash: location.hash, path: location.pathname };
    const v = document.getElementById('view');
    const modal = document.getElementById('modal'), modalOpen = modal && !modal.hidden;
    out.text = v ? (v.innerText || '').trim().length : (document.body.innerText || '').trim().length;
    if (!v) add('page', 'Không ở trong app: ' + location.href);
    if (out.text < 20 && !modalOpen) add('blank', 'Màn hình trống/gần trống (' + out.text + ' ký tự)');
    const vv = W.visualViewport; if (vv && vv.scale > 1.02) add('zoom', `Trang bị phóng to ${vv.scale.toFixed(2)}× (iOS tự zoom khi chạm ô nhập chữ < 16px) – phải chụm tay mới thu lại`);
    const sw = document.documentElement.scrollWidth, iw = document.documentElement.clientWidth;
    if (sw > iw + 2) {
      const wide = [...document.querySelectorAll('#view *, .topbar *, .bottom-nav *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > iw + 2 && r.width > 0 && vis(e); }).slice(0, 3).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' r=' + Math.round(e.getBoundingClientRect().right));
      add('overflow-x', `Trang rộng ${sw}px > màn hình ${iw}px: ${wide.join(' | ')}`);
    }
    // vùng an toàn (tai thỏ/Dynamic Island, thanh Home)
    const ins = safeInsets(); out.safe = ins;
    const tb = document.querySelector('.topbar');
    if (tb && vis(tb) && scrollY < 5) { const kids = [...tb.querySelectorAll('input,button,a')].filter(vis); const minTop = Math.min(...kids.map(k => k.getBoundingClientRect().top)); if (kids.length && minTop < ins.top - 1) add('safe-area', `Thanh trên (${Math.round(minTop)}px) nằm dưới tai thỏ/thanh trạng thái (vùng an toàn ${ins.top}px)`); }
    if (ins.top > 0 && scrollY < 5) { // trang toàn màn (ôn thẻ/thi – thanh trên ẩn) hoặc cột trái iPad: nội dung không được nằm dưới thanh trạng thái
      const under = [...document.querySelectorAll('#view *, .sidebar *')].filter(e => { if (!vis(e) || e.children.length) return false; const r = e.getBoundingClientRect(); return r.top < ins.top - 1 && r.bottom > 2 && r.height < 200 && ((e.innerText || '').trim() || /^(BUTTON|IMG|SVG|INPUT)$/i.test(e.tagName)); }).slice(0, 3);
      if (under.length) add('safe-area', `Nội dung nằm dưới thanh trạng thái/tai thỏ (vùng an toàn ${ins.top}px): ` + under.map(e => e.tagName.toLowerCase() + '"' + (e.innerText || '').trim().slice(0, 20) + '"@' + Math.round(e.getBoundingClientRect().top)).join(' | '));
    }
    const bn = document.getElementById('bnav');
    if (bn && vis(bn)) { const items = [...bn.querySelectorAll('a,button')].filter(vis); const maxB = Math.max(...items.map(k => k.getBoundingClientRect().bottom)); if (items.length && maxB > innerHeight - ins.bottom + 1) add('safe-area', `Thanh dưới (${Math.round(maxB)}px) đè lên vạch Home (giới hạn ${innerHeight - ins.bottom}px)`); }
    // chữ chưa dịch (giao diện không phải tiếng Việt mà còn chữ Việt)
    const L = W.I18N && W.I18N.lang && W.I18N.lang();
    if (L && L !== 'vi') {
      const scope = [v, document.querySelector('.topbar'), document.getElementById('bnav'), modalOpen && modal].filter(Boolean);
      const leaks = new Set();
      for (const s of scope) {
        const tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
        let n; while ((n = tw.nextNode())) { const x = n.nodeValue.trim(); if (x && VI.test(x) && n.parentElement && vis(n.parentElement) && !n.parentElement.closest('[lang="vi"],.vi,[data-vi],.meaning-vi,input,textarea')) leaks.add(x.slice(0, 60)); if (leaks.size > 6) break; }
        [...s.querySelectorAll('[placeholder],[title],[aria-label]')].forEach(e => ['placeholder', 'title', 'aria-label'].forEach(a => { const x = e.getAttribute(a); if (x && VI.test(x) && vis(e)) leaks.add('@' + a + ': ' + x.slice(0, 50)); }));
      }
      if (leaks.size) add('i18n', `Chữ tiếng Việt chưa dịch (${L}): ` + [...leaks].slice(0, 6).join(' ‖ '));
    }
    const body = ((v && v.innerText) || '') + ' ' + (modalOpen ? modal.innerText : '');
    const ph = PLACEHOLDER.exec(body); if (ph) add('placeholder', 'Thông báo "chưa có": …' + body.slice(Math.max(0, ph.index - 60), ph.index + 80).replace(/\s+/g, ' ') + '…');
    // ảnh hỏng
    const badImg = [...document.querySelectorAll('#view img')].filter(i => i.complete && i.naturalWidth === 0 && vis(i)).map(i => i.currentSrc || i.src).slice(0, 3);
    if (badImg.length) add('img', 'Ảnh không tải được: ' + badImg.join(' | '));
    // liên kết thoát khỏi app (trang web tĩnh trong WebView, không có nút Back) hoặc mở cửa sổ mới
    const links = [...document.querySelectorAll('#view a[href], .topbar a[href], #bnav a[href], #nav a[href], #modal:not([hidden]) a[href]')].filter(vis).map(a => ({ h: a.getAttribute('href'), tg: a.getAttribute('target') || '', tx: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 40) }))
      .filter(l => l.h && !/^(#|javascript:|mailto:|tel:)/.test(l.h));
    out.links = links.slice(0, 30);
    out.modal = modalOpen ? (modal.innerText || '').trim().slice(0, 200) : '';
    return out;
  }
  async function settle(maxMs) {
    const end = now() + (maxMs || 8000); let last = -1, stable = 0;
    await sleep(350);
    while (now() < end) {
      const v = document.getElementById('view'); const n = v ? (v.innerText || '').length + v.querySelectorAll('*').length : 0;
      if (n === last && n > 0) { if (++stable >= 3) break; } else stable = 0;
      last = n; await sleep(250);
    }
  }
  const closeModal = () => { const m = document.getElementById('modal'); if (m && !m.hidden) { try { if (W.UI && W.UI.closeModal) W.UI.closeModal(); else m.hidden = true; } catch (e) { m.hidden = true; } } };
  const DANGER = /(delete|remove|reset|erase|clear|sign|log ?out|google|apple|account|export|import|backup|restore|report|contact|send|submit|buy|upgrade|premium|install|download|share|chia sẻ|xóa|đăng|xuất|nhập|gửi|tải|báo lỗi|privacy|terms|blog|uninstall|copy)/i;
  const clickables = () => [...document.querySelectorAll('#view button:not([disabled]), #view [role=button], #view .chip, #view [data-v]')].filter(b => vis(b) && !b.closest('a[href]:not([href^="#"])')).filter(b => !DANGER.test((b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.id || '')));

  // ---------- kịch bản ----------
  const MAIN = ['home', 'vocab', 'library', 'deck', 'practice', 'review', 'dict', 'dict/sustainable', 'path', 'goal', 'mistakes', 'phrases', 'grammar', 'pron', 'usage', 'verb', 'fix', 'paraphrase',
    'skills', 'skill/reading', 'skill/listening', 'skill/speaking', 'skill/writing', 'reading', 'listening', 'dictation', 'speaking', 'write', 'task1', 'models', 'ideas', 'letters', 'roleplay', 'call', 'handsfree', 'reflex',
    'tests', 'placement', 'mock', 'rtype', 'cbt', 'method', 'toeic', 'toeic-r', 'toeic-sw', 'toefl', 'courses', 'resources',
    'me', 'stats', 'league', 'settings', 'handoff', 'report', 'contact'];
  const LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const LANG_ROUTES = ['home', 'vocab', 'skills', 'tests', 'me', 'settings'];
  const IPAD = /iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) || Math.min(screen.width, screen.height) >= 700;
  function plan() {
    const S = [];
    S.push({ k: 'launch' });
    S.push({ k: 'toapp' });
    S.push({ k: 'lang', l: 'en' });
    S.push({ k: 'onboard' });
    for (const r of MAIN) S.push({ k: 'route', r, probe: true });
    S.push({ k: 'subpages' });
    S.push({ k: 'search' }); S.push({ k: 'review' }); S.push({ k: 'practice' }); S.push({ k: 'placement' }); S.push({ k: 'tts' }); S.push({ k: 'speakcheck' });
    S.push({ k: 'deeplink' }); S.push({ k: 'extlink' });
    S.push({ k: 'offline' });
    S.push({ k: 'dark' });
    for (const l of LANGS) { S.push({ k: 'lang', l }); S.push({ k: 'langcheck', l }); }
    S.push({ k: 'lang', l: 'en' });
    S.push({ k: 'realshare' }); S.push({ k: 'realnotify' });
    S.push({ k: 'done' });
    return S;
  }
  const visited = new Set();
  async function visit(route, label, opts) {
    opts = opts || {};
    closeModal();
    const h = '#/' + route;
    if (location.hash !== h) location.hash = h; else W.dispatchEvent(new HashChangeEvent('hashchange'));
    await settle(opts.wait || 9000);
    if (opts.scroll !== false) { W.scrollTo(0, 0); await sleep(150); }
    const a = audit(label || route);
    if (opts.shot !== false) await shot(label || route);
    return a;
  }
  async function probe(route) {
    // bấm thử tối đa 3 nút an toàn trong trang (mở hộp thoại/chuyển thẻ…) → bắt lỗi khi tương tác
    const done = []; const startHash = location.hash;
    for (let k = 0; k < 3; k++) {
      const c = clickables().filter(b => !done.includes(b.innerText.trim().slice(0, 30) || b.className))[0]; if (!c) break;
      const lab = (c.innerText || c.getAttribute('aria-label') || c.className || '').trim().replace(/\s+/g, ' ').slice(0, 30); done.push(c.innerText.trim().slice(0, 30) || c.className);
      const before = issues.length;
      try { c.scrollIntoView({ block: 'center' }); c.click(); } catch (e) { add('js', 'click ' + lab + ': ' + e.message); }
      await sleep(900);
      for (let i = before; i < issues.length; i++) issues[i].msg = '[bấm "' + lab + '"] ' + issues[i].msg;
      const m = document.getElementById('modal'); if (m && !m.hidden) { audit(route + ' › ' + lab); closeModal(); await sleep(200); }
      if (location.hash !== startHash || !inApp()) { if (!inApp()) return; location.hash = startHash; await settle(4000); }
    }
  }
  const btnByText = re => [...document.querySelectorAll('#view button, #view a, #view [role=button]')].filter(b => vis(b) && re.test((b.innerText || '') + ' ' + (b.getAttribute('aria-label') || ''))).at(0);
  async function runStep(s) {
    switch (s.k) {
      case 'launch': {
        await sleep(1500);
        const a = audit('launch');
        emit({ type: 'info', key: 'launch', path: location.pathname, hash: location.hash, ua: navigator.userAgent, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, safe: a.safe, platform: Cap && Cap.getPlatform && Cap.getPlatform(),
          sw: 'serviceWorker' in navigator, speech: typeof (W.SpeechRecognition || W.webkitSpeechRecognition), gum: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), synth: 'speechSynthesis' in W, plugins: Object.keys(P()), ipad: IPAD });
        await shot('launch');
        if (!inApp()) { add('launch', 'Mở app lần đầu hiện TRANG GIỚI THIỆU web (' + location.pathname + ') thay vì app học – người dùng phải bấm "Bắt đầu"'); }
        return;
      }
      case 'toapp': {
        if (inApp()) return;
        st.i++; st.inStep = null; save(); location.href = '/index.html#/home'; await sleep(15000); add('flow', 'Không vào được /app/ từ trang giới thiệu'); return;
      }
      case 'lang': {
        if (W.I18N.lang() === s.l) return;
        st.i++; save(); W.I18N.set(s.l); await sleep(15000); add('lang', 'Đổi ngôn ngữ sang ' + s.l + ' không tải lại trang'); return;
      }
      case 'onboard': {
        await visit('welcome', 'welcome');
        await visit('welcome/setup', 'welcome-setup');
        const go = document.getElementById('go');
        if (go && go.disabled) { const chip = document.querySelector('#view [data-topic], #view .chip'); chip && chip.click(); await sleep(300); }
        if (go && !go.disabled) { go.click(); await sleep(4500); } else add('flow', 'Không tìm thấy/bấm được nút "Bắt đầu học" (#go) ở màn thiết lập');
        await settle(6000); audit('after-setup'); await shot('after-setup');
        return;
      }
      case 'route': { const a = await visit(s.r); visited.add(s.r); emit({ type: 'links', route: s.r, links: a.links }); if (s.probe) await probe(s.r); return; }
      case 'subpages': {
        // trang con: theo liên kết nội bộ đầu tiên của từng trang trung tâm
        const hubs = ['vocab', 'library', 'grammar', 'pron', 'skills', 'reading', 'listening', 'speaking', 'write', 'tests', 'toeic', 'me', 'courses', 'usage', 'phrases'];
        let n = 0;
        for (const hb of hubs) {
          await visit(hb, hb, { shot: false });
          const subs = [...new Set([...document.querySelectorAll('#view a[href^="#/"]')].filter(vis).map(a => a.getAttribute('href').slice(2)))].filter(r => !visited.has(r) && !/^(welcome|home)/.test(r)).slice(0, IPAD ? 2 : 3);
          for (const r of subs) { visited.add(r); cur.step = 'sub:' + r; issues.length = 0; await visit(r, 'sub ' + r.replace(/[^\w-]+/g, '_')); flush('sub:' + r); n++; }
        }
        cur.step = 'subpages'; emit({ type: 'info', key: 'subpages', n }); return;
      }
      case 'search': {
        await visit('home', 'home', { shot: false });
        const inp = document.getElementById('gq'); if (!inp || !vis(inp)) { add('flow', 'Ô tra từ (#gq) không hiển thị trên màn hình này'); }
        if (inp) { inp.focus(); inp.value = 'resilient'; inp.dispatchEvent(new Event('input', { bubbles: true })); await sleep(1500); const sug = document.getElementById('suggest'); emit({ type: 'info', key: 'suggest', shown: !!(sug && !sug.hidden), n: sug ? sug.querySelectorAll('a').length : 0 }); await shot('search-suggest');
          inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle(8000); inp.blur(); }
        const a = audit('search-result'); if (!/dict/.test(location.hash)) add('flow', 'Tra từ "resilient" + Enter không mở trang từ điển (hash=' + location.hash + ')');
        await shot('search-result'); return a;
      }
      case 'review': {
        await visit('review', 'review-start');
        for (let k = 0; k < 6; k++) {
          const b = btnByText(/(show|reveal|answer|flip|good|easy|got it|again|hard|start|bắt đầu|xem đáp án|lật|nhớ|dễ|khó)/i) || document.querySelector('#view .btn.primary');
          if (!b) break; const lab = (b.innerText || '').trim().slice(0, 24); b.click(); await sleep(900);
          if (k === 1) await shot('review-card');
          emit({ type: 'info', key: 'review-click', lab });
        }
        audit('review-after'); await shot('review-after'); return;
      }
      case 'practice': {
        await visit('practice', 'practice');
        const g = [...document.querySelectorAll('#view a[href^="#/practice/"], #view [data-game], #view .game, #view .card a, #view button')].filter(vis).find(x => !DANGER.test(x.innerText || ''));
        if (g) { g.click(); await settle(5000); await shot('practice-game'); for (let k = 0; k < 4; k++) { const o = document.querySelector('#view .opt, #view .choice, #view [data-opt], #view .options button, #view .choices button'); if (!o) break; o.click(); await sleep(1000); } audit('practice-play'); await shot('practice-play'); }
        else add('flow', 'Không tìm thấy trò chơi nào trong trang Luyện tập');
        return;
      }
      case 'placement': {
        await visit('placement', 'placement');
        const b = btnByText(/(start|begin|bắt đầu)/i) || document.querySelector('#view .btn.primary'); if (b) { b.click(); await settle(5000); }
        for (let k = 0; k < 5; k++) { const o = [...document.querySelectorAll('#view .opt, #view .choice, #view [data-opt], #view [data-i], #view .options button, #view .choices button, #view li button')].filter(vis)[0]; if (!o) break; o.click(); await sleep(1100); const nx = btnByText(/(next|continue|tiếp)/i); if (nx) { nx.click(); await sleep(700); } }
        audit('placement-q'); await shot('placement-q'); return;
      }
      case 'tts': {
        await visit('dict/sustainable', 'tts-dict', { shot: false });
        const before = nativeCalls.length;
        const sp = [...document.querySelectorAll('#view button, #view [role=button], #view .say, #view [data-say]')].filter(b => vis(b) && /🔊|speak|listen|play|phát|nghe|pronounce/i.test((b.innerText || '') + (b.getAttribute('aria-label') || '') + (b.title || '') + (b.className || ''))).slice(0, 2);
        for (const b of sp) { b.click(); await sleep(2500); }
        const calls = nativeCalls.slice(before);
        emit({ type: 'info', key: 'tts', buttons: sp.length, calls });
        if (!sp.length) add('flow', 'Không thấy nút phát âm 🔊 trên trang từ');
        else if (!calls.some(c => c.plugin === 'TextToSpeech') && !performance.getEntriesByType('resource').some(e => /\.(mp3|m4a|ogg|wav)/.test(e.name))) add('tts', 'Bấm nút phát âm nhưng không gọi TTS gốc và không tải file âm thanh nào');
        await shot('tts'); return;
      }
      case 'speakcheck': {
        await visit('pron', 'pron', { shot: false });
        const mic = [...document.querySelectorAll('#view button')].filter(b => vis(b) && /🎤|🎙|mic|record|ghi âm|nói/i.test((b.innerText || '') + (b.getAttribute('aria-label') || '') + (b.title || ''))).at(0);
        emit({ type: 'info', key: 'speech', api: typeof (W.SpeechRecognition || W.webkitSpeechRecognition), gum: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), micButton: !!mic });
        if (mic) { mic.click(); await sleep(3500); audit('pron-mic'); await shot('pron-mic'); closeModal(); }
        return;
      }
      case 'deeplink': {
        await visit('home', 'home', { shot: false });
        // simctl openurl lexkite://… luôn hiện hộp hệ thống "Mở bằng Lexkite?" (không bấm được khi chạy tự động) → kiểm đường xử lý JS của appUrlOpen
        if (!(W.VBNative && W.VBNative.openDeep)) add('deeplink', 'VBNative.openDeep không có');
        else { W.VBNative.openDeep('lexkite://review?w=sustainable'); await settle(5000); if (!/#\/review\?w=sustainable/.test(location.hash)) add('deeplink', 'lexkite://review?w=… không mở trang ôn tập (hash=' + location.hash + ')'); }
        audit('deeplink'); await shot('deeplink'); return;
      }
      case 'extlink': {
        // liên kết trang tĩnh (/privacy): không được làm app tải lại/về trang chủ (bước bị đánh dấu "stall" nếu trang tải lại)
        await visit('settings', 'settings', { shot: false });
        const mark = Math.random(); W.__e2eMark = mark;
        const a = document.querySelector('.side-foot a[data-l="privacy"]') || [...document.querySelectorAll('#view a[href*="/privacy"]')][0];
        if (!a) { add('extlink', 'Không thấy liên kết Chính sách quyền riêng tư'); return; }
        const o0 = opened.length, href = a.getAttribute('href'); a.click(); await sleep(1500);
        const r = await host('checksafari', {}, 30000); await sleep(2500);
        emit({ type: 'info', key: 'extlink', href, opened: opened.slice(o0), safari: r, hash: location.hash });
        if (W.__e2eMark !== mark) add('extlink', 'App tải lại khi bấm liên kết Chính sách (' + href + ')');
        if (!/running/.test(r || '')) add('extlink', 'Bấm "Chính sách quyền riêng tư" không mở Safari (' + (opened.slice(o0)[0] || href) + ')');
        for (let i = issues.length - 1; i >= 0; i--) if (issues[i].kind === 'window.open') issues.splice(i, 1); // mở trang ngoài là đúng ý
        await shot('extlink'); return;
      }
      case 'offline': {
        // Giả lập mất mạng TRONG trang (máy chủ CI không tắt mạng được): fetch/XHR ra ngoài lỗi, navigator.onLine=false, phát sự kiện offline
        const realFetch = W.fetch; W.fetch = function (u) { const s = String(u && u.url || u); if (/^https?:/.test(s)) return Promise.reject(new TypeError('Load failed (offline-sim)')); return realFetch.apply(this, arguments); };
        try { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); } catch (e) { /* bỏ qua */ }
        W.dispatchEvent(new Event('offline'));
        for (const r of ['home', 'dict/serendipity', 'review', 'skill/reading']) { await visit(r, 'offline ' + r.replace(/\//g, '_')); }
        W.fetch = realFetch; try { delete navigator.onLine; } catch (e) { /* bỏ qua */ } W.dispatchEvent(new Event('online'));
        // lỗi mạng giả lập là chủ ý → bỏ khỏi danh sách, chỉ giữ lỗi JS/trắng màn hình
        for (let i = issues.length - 1; i >= 0; i--) if (/offline-sim|fetch-fail|xhr-fail|promise/.test(issues[i].kind + issues[i].msg) && !/TypeError: (undefined|null)|is not a function|Cannot read/.test(issues[i].msg)) issues.splice(i, 1);
        return;
      }
      case 'dark': {
        await host('appearance', { mode: 'dark' }); await sleep(1500);
        if (!matchMedia('(prefers-color-scheme: dark)').matches) add('dark', 'Giả lập đã bật Dark mode nhưng WebView không nhận prefers-color-scheme: dark');
        for (const r of ['home', 'review', 'skills', 'settings']) await visit(r, 'dark ' + r);
        const bg = getComputedStyle(document.body).backgroundColor; emit({ type: 'info', key: 'dark-bg', bg });
        await host('appearance', { mode: 'light' }); await sleep(800); return;
      }
      case 'langcheck': {
        if (W.I18N.lang() !== s.l) add('lang', 'Ngôn ngữ giao diện là ' + W.I18N.lang() + ', mong đợi ' + s.l);
        const dir = document.documentElement.dir; if (s.l === 'ar' && dir !== 'rtl') add('rtl', 'Tiếng Ả Rập nhưng <html dir> = ' + dir);
        for (const r of LANG_ROUTES) { await visit(r, s.l + ' ' + r, { shot: r === 'home' || r === 'me' }); }
        return;
      }
      case 'realshare': {
        stubNative = false;
        await visit('dict/sustainable', 'share-src', { shot: false });
        const b = [...document.querySelectorAll('#view button, #view a')].filter(x => vis(x) && /share|chia sẻ|📤/i.test((x.innerText || '') + (x.getAttribute('aria-label') || '') + (x.title || ''))).at(0);
        if (b) { const n0 = nativeCalls.length; b.click(); await sleep(3500); emit({ type: 'info', key: 'share', calls: nativeCalls.slice(n0) }); await shot('share'); closeModal(); }
        else { const r = await (P().Share ? P().Share.share({ title: 'Lexkite', text: 'test', url: 'https://lexkite.com/' }).then(() => 'ok', e => 'err ' + e.message) : Promise.resolve('no plugin')); emit({ type: 'info', key: 'share', direct: r, note: 'không có nút chia sẻ trên trang từ' }); await sleep(2500); await shot('share'); }
        return relaunchNext();
      }
      case 'realnotify': {
        stubNative = false;
        await visit('settings', 'settings', { shot: false });
        if (W.VBNative && W.VBNative.scheduleReminder) { W.VBNative.scheduleReminder({ ask: true }); await sleep(3000); await shot('notify-permission'); }
        else add('notify', 'VBNative.scheduleReminder không có');
        emit({ type: 'info', key: 'notify', calls: nativeCalls.filter(c => c.plugin === 'LocalNotifications') });
        return relaunchNext();
      }
    }
  }
  async function relaunchNext() { // app bị tắt & mở lại bởi máy chủ (đóng bảng chia sẻ/hộp quyền hệ thống) → ghi kết quả & sang bước sau trước
    flush(cur.step); st.i++; st.inStep = null; save(); await q; await host('relaunch', {}, 60000); await sleep(60000);
  }
  function flush(step) {
    emit({ type: 'step', step, issues: issues.slice(), native: nativeCalls.filter(c => c.step === step).slice(0, 10) });
    issues.length = 0;
  }
  async function main() {
    if (st.i === 0 && !st.started) { st.started = now(); save(); }
    if (st.inStep != null && st.inStep === st.i) { // bước trước làm app chết/đi khỏi app/treo → ghi lỗi rồi bỏ qua bước đó
      const S0 = plan()[st.i]; emit({ type: 'step', step: stepName(S0), issues: [{ kind: 'stall', msg: 'Bước này làm app khởi động lại/treo/rời khỏi app (lần cuối ở ' + (st.lastLoc || '?') + ')' }] });
      st.i++; st.inStep = null; save();
    }
    st.n++; save();
    if (W.I18N && W.I18N.whenReady) await W.I18N.whenReady();
    await sleep(1200);
    wrapPlugins();
    const S = plan();
    while (st.i < S.length) {
      const s = S[st.i]; const name = stepName(s);
      if (s.k === 'done') { const hosts = {}; for (const n of net) { const h = (/^\w+:\/\/([^/]+)/.exec(n.url) || [, 'local'])[1]; const o = hosts[h] = hosts[h] || { ok: 0, fail: 0, codes: {} }; if (n.err) o.fail++; else { o.ok++; o.codes[n.status] = (o.codes[n.status] || 0) + 1; } } emit({ type: 'info', key: 'net', hosts }); emit({ type: 'done', visited: [...visited] }); st.i = S.length; save(); return; }
      cur.step = name; st.inStep = st.i; st.lastLoc = location.pathname + location.hash; save();
      emit({ type: 'begin', step: name });
      try { await runStep(s); } catch (e) { add('harness', 'Lỗi kịch bản: ' + (e && e.message)); }
      flush(name);
      st.i++; st.inStep = null; save();
    }
  }
  const stepName = s => s ? s.k + (s.r ? ':' + s.r : '') + (s.l ? ':' + s.l : '') : '?';
  // Chặn rời app: ghi lại nơi sắp tới trước khi bỏ trang
  W.addEventListener('pagehide', () => { st.lastLoc = location.href; save(); });
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) { const h = a.getAttribute('href'); if (h && !h.startsWith('#')) { st.lastLoc = 'bấm liên kết ' + h + ' (target=' + (a.target || '') + ')'; save(); } } }, true);
  const start = () => setTimeout(() => main().catch(e => emit({ type: 'fatal', msg: String(e && e.stack || e) })), 300);
  if (document.readyState === 'complete') start(); else W.addEventListener('load', start);
})();
