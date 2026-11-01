/* Cập nhật bản web qua mạng (OTA) + nhắc cập nhật app gốc – CHỈ chạy trong app Capacitor, nạp lười (gói 'ota', js/native.js; docs/OTA.md).
 * OTA: @capgo/capacitor-updater chế độ thủ công, tự lưu trữ. /api/ota trả {version,url,sha256,signature,minNative}; chữ ký ECDSA P-256 (khóa công khai js/ota-key.js)
 *   phủ version+url+sha256+minNative. Chỉ tải khi chữ ký đúng, url đúng kho phát hành, native ≥ minNative; plugin kiểm sha256 của gói.
 *   Tải nền → đặt làm bản kế (next = áp dụng ở lần mở nguội) hoặc áp ngay lúc app xuống nền nếu không ở giữa bài. notifyAppReady (native.js) + plugin tự quay lại bản cũ nếu bản mới lỗi.
 * Gốc: Android = Play In-App Updates (mềm; ngay khi dưới mức tối thiểu), iOS = so bản App Store + nút "Mở App Store" (@capawesome/capacitor-app-update). */
(function (g) {
  const t = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k), PRE = 'lk.ota.', HOUR = 36e5;
  const ls = { get(k) { try { return localStorage.getItem(PRE + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(PRE + k, v); } catch (e) { /* bỏ qua */ } } };
  const URL_OK = /^https:\/\/github\.com\/lexkiteapp\/lexkiteapp\.github\.io\/releases\/download\/ota-[\w.-]+\/bundle\.zip$/;
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const canon = m => ['lexkite-ota-v1', m.version, m.url, m.sha256, m.minNative || '0'].join('\n'); // PHẢI khớp scripts/ota/lib.mjs
  const num = v => String(v || '0').split(/[-+]/)[0].split('.').map(x => parseInt(x, 10) || 0);
  const cmp = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; };
  const shapeOk = m => !!m && /^[\w.-]{1,64}$/.test(m.version || '') && URL_OK.test(m.url || '') && /^[0-9a-f]{64}$/.test(m.sha256 || '') && /^[A-Za-z0-9+/=]{80,100}$/.test(m.signature || '') && /^[\d.]{1,20}$/.test(m.minNative || '0');
  async function verify(m, keyB64) {
    if (!keyB64 || !shapeOk(m)) return false;
    try {
      const key = await g.crypto.subtle.importKey('spki', bytes(keyB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return await g.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes(m.signature), new TextEncoder().encode(canon(m)));
    } catch (e) { return false; }
  }
  const badList = () => { try { return JSON.parse(ls.get('bad') || '[]'); } catch (e) { return []; } };
  const markBad = v => { if (v) ls.set('bad', JSON.stringify([...new Set([...badList(), v])].slice(-20))); };
  /** Quyết định (sau khi chữ ký đúng): 'same' đã chạy bản này · 'bad' từng lỗi · 'native' app gốc quá cũ (cần cập nhật cửa hàng) · 'ok' */
  const decide = (m, ctx) => (m.version === ctx.current ? 'same' : badList().includes(m.version) ? 'bad' : cmp(ctx.native, m.minNative || '0') < 0 ? 'native' : 'ok');
  // Giữa bài học/phiên ôn thì KHÔNG áp bản mới (bản đã tải sẽ chạy ở lần mở nguội kế tiếp)
  const SAFE = /^#?\/?(home|settings|stats|me|profile|dict(\/.*)?)?$/;
  const busy = () => !SAFE.test(g.location ? g.location.hash || '' : '') || !!(g.VBOta && g.VBOta.isBusy && g.VBOta.isBusy());
  const plug = n => (g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins[n]) || null;
  let pending = null, wired = false;

  async function context() {
    const U = plug('CapacitorUpdater'), A = plug('App');
    const cur = U ? await U.current().catch(() => null) : null;
    const info = A && A.getInfo ? await A.getInfo().catch(() => null) : null;
    return { platform: g.VBNative ? g.VBNative.platform : 'web', native: (info && info.version) || (cur && cur.native) || '0', current: (cur && cur.bundle && cur.bundle.version) || 'builtin' };
  }
  async function fetchManifest(ctx) {
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test((g.location && g.location.hostname) || '') ? '' : 'https://lexkite.com';
    const r = await g.fetch(`${base}/api/ota?p=${ctx.platform}&n=${encodeURIComponent(ctx.native)}&v=${encodeURIComponent(ctx.current)}`, { cache: 'no-store' });
    return r.ok ? r.json() : null;
  }
  /** Kiểm tra bản web mới. Trả về 'ok' (đã tải, chờ áp), hoặc lý do bỏ qua. {native:true} khi app gốc dưới mức tối thiểu. */
  async function checkWeb(ctx) {
    const U = plug('CapacitorUpdater'); if (!U) return 'noplugin';
    const m = await fetchManifest(ctx).catch(() => null);
    if (!m || !m.version) return 'none';
    if (!(await verify(m, g.LK_OTA_KEY))) return 'badsig';
    const d = decide(m, ctx); if (d !== 'ok') return d;
    try {
      const b = await U.download({ url: m.url, version: m.version, checksum: m.sha256 });
      if (!b || !b.id) throw new Error('download');
      await U.next({ id: b.id }); // áp dụng ở lần mở nguội kế tiếp
      pending = { id: b.id, version: m.version };
      return 'ok';
    } catch (e) { markBad(m.version); return 'fail'; }
  }
  /** Áp ngay (tải lại WebView) nếu có bản chờ và không ở giữa bài. */
  async function applyIfIdle() {
    const U = plug('CapacitorUpdater'); if (!pending || !U || busy()) return false;
    const p = pending; pending = null;
    try { await U.set({ id: p.id }); return true; } catch (e) { markBad(p.version); return false; }
  }

  // ---- Hộp thoại ----
  function dialog(title, body, btns) {
    return new Promise(res => {
      const d = g.document, o = d.createElement('div'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px';
      const c = d.createElement('div'); c.style.cssText = 'max-width:340px;width:100%;background:var(--card,#fff);color:var(--text,#111);border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.3)';
      const h = d.createElement('h2'); h.style.cssText = 'margin:0 0 8px;font-size:1.1rem'; h.textContent = title;
      const p = d.createElement('p'); p.style.cssText = 'margin:0 0 16px;opacity:.8'; p.textContent = body;
      const row = d.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
      c.append(h, p, row); o.append(c);
      btns.forEach((b, i) => { const x = d.createElement('button'); x.type = 'button'; x.textContent = b; x.className = i === btns.length - 1 ? 'btn primary' : 'btn'; x.onclick = () => { o.remove(); res(i); }; row.append(x); });
      d.body.append(o);
    });
  }
  const FLEX_DONE = 11; // Play: InstallStatus.DOWNLOADED
  async function nativePrompt(ctx, force) {
    const AU = plug('AppUpdate'); if (!AU) return 'noplugin';
    const i = await AU.getAppUpdateInfo().catch(() => null); if (!i) return 'none';
    const ios = ctx.platform === 'ios', avail = i.updateAvailability === 2 || (ios && i.availableVersionName && cmp(i.availableVersionName, i.currentVersionName || ctx.native) > 0);
    if (!avail) return 'uptodate';
    if (!force && Date.now() - (+ls.get('nag') || 0) < 72 * HOUR) return 'nag';
    const title = force ? t('Cần cập nhật để tiếp tục dùng Lexkite.') : t('Có bản Lexkite mới'), body = t('Cập nhật để có tính năng mới và bản sửa lỗi.');
    if (!ios && force && i.immediateUpdateAllowed) { await AU.performImmediateUpdate().catch(() => {}); return 'immediate'; }
    const store = ios || !i.flexibleUpdateAllowed;
    const pick = await dialog(title, body, force ? [store ? t('Mở App Store') : t('Cập nhật')] : [t('Để sau'), store ? t('Mở App Store') : t('Cập nhật')]);
    if (!force && pick === 0) { ls.set('nag', String(Date.now())); return 'later'; }
    if (store) { await AU.openAppStore().catch(() => {}); return 'store'; }
    AU.addListener('onFlexibleUpdateStateChange', async s => { if (s && s.installStatus === FLEX_DONE && (await dialog(t('Bản cập nhật đã sẵn sàng'), '', [t('Để sau'), t('Khởi động lại')])) === 1) AU.completeFlexibleUpdate().catch(() => {}); });
    await AU.startFlexibleUpdate().catch(() => {});
    return 'flexible';
  }

  async function check(force) {
    if (!force && Date.now() - (+ls.get('t') || 0) < 6 * HOUR) return 'throttle';
    ls.set('t', String(Date.now()));
    const ctx = await context(), web = await checkWeb(ctx);
    if (web === 'native' || (web !== 'ok' && ctx.platform !== 'web')) await nativePrompt(ctx, web === 'native').catch(() => {});
    return web;
  }
  function start() {
    if (wired) return; wired = true;
    const U = plug('CapacitorUpdater'), A = plug('App');
    if (U && U.addListener) { U.addListener('updateFailed', e => markBad(e && e.bundle && e.bundle.version)); U.addListener('downloadFailed', e => markBad(e && e.version)); }
    if (A && A.addListener) A.addListener('appStateChange', s => { if (s && s.isActive) check().catch(() => {}); else applyIfIdle().catch(() => {}); });
    return check().catch(() => {});
  }
  g.VBOta = { start, check, applyIfIdle, verify, decide, canon, cmp, shapeOk, busy, nativePrompt, checkWeb, markBad, isBusy: null };
})(typeof self !== 'undefined' ? self : this);
