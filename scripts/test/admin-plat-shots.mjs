// Ảnh + gác thẻ "📱 Nền tảng" (#analytics) – khung thật web/admin.html, Firebase giả, /api/* = dữ liệu mẫu (số thật của owner 1/11), 0 mạng.
// 360/390 px × sáng/tối. Chỉ ở tag=after, FAIL khi: trang tràn ngang, nhãn xuống dòng / dòng cao không đều, thanh không cùng dòng với số,
// dòng < 44 px, dòng 0 có thanh, dòng > 0 thanh < 3 px, thanh không cùng thang (tỉ lệ độ dài ≠ tỉ lệ số), thiếu dòng Tổng, axe (WCAG A/AA) > 0 lỗi.
// Dùng: node scripts/test/admin-plat-shots.mjs [web=web] [out=out/admin-plat] [tag=after]  ·  --compare out/admin-plat → sheet-*.jpg (TRƯỚC | SAU)
// CI: .github/workflows/admin-guard.yml (bước "Thẻ Nền tảng").
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { FX } from './fixtures/admin-fx.mjs';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-plat-shots: playwright chưa cài – bỏ qua'); process.exit(0); }
const require = createRequire(import.meta.url);
let AXE = ''; try { AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { /* thiếu axe-core → báo lỗi ở tag=after */ }
const CONFIGS = [[360, 'light', 'vi'], [360, 'dark', 'vi'], [390, 'light', 'en'], [390, 'dark', 'en']];
const browser = await pw.chromium.launch();
const name = (w, th, l) => `plat-${w}-${th}-${l}.png`;

if (process.argv[2] === '--compare') {
  const OUT = process.argv[3] || 'out/admin-plat', made = [];
  for (const [w, th, l] of CONFIGS) {
    const fb = path.join(OUT, 'before-' + name(w, th, l)), fa = path.join(OUT, 'after-' + name(w, th, l)); if (!fs.existsSync(fa)) continue;
    const img = f => fs.existsSync(f) ? `<img style="width:${w}px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '<div style="width:360px;padding:20px">(không có ảnh)</div>';
    const page = await browser.newPage({ viewport: { width: w * 2 + 48, height: 300 }, deviceScaleFactor: 2 });
    await page.setContent(`<body style="margin:0;background:#777;font:600 14px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', fb], ['SAU', fa]].map(([t, f]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${t} · ${w}px ${th} ${l.toUpperCase()}</figcaption>${img(f)}</figure>`).join('')}</body>`);
    const f = path.join(OUT, `sheet-${w}-${th}-${l}.jpg`); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 80 }); made.push(f); await page.close();
  }
  await browser.close(); console.log(made.join('\n') || 'không có ảnh'); process.exit(0);
}

const [WEB = 'web', OUT = 'out/admin-plat', TAG = 'after'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const R = o => Object.entries(o).map(([k, n]) => ({ k, n }));
// Số thật trong ảnh chụp của owner (1/11) + số thiết bị khác nhau server mới trả (15 máy dùng cả web và PWA)
const LIVE = { ...FX.live, platsToday: R({ web: 17, android: 2, ext: 1 }), plats30: R({ web: 209, ext: 15, pwa: 12, android: 8, ios: 1 }), devToday: { v: 20, multi: 0 }, dev30: { v: 230, multi: 15 } };
const FB = `window.firebase = { initializeApp() {}, auth: Object.assign(() => window.__AUTH, { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } }) };
  const U = { uid: 'plat', email: 'admin@example.com', displayName: 'Plat', photoURL: '', getIdToken: async () => 'x' };
  window.__AUTH = { currentUser: U, onAuthStateChanged: cb => setTimeout(() => cb(U), 0), signOut: async () => {}, signInWithPopup: async () => {} };`;
const api = (p, b) => p === '/api/admin' ? (b.op === 'live' ? LIVE : FX[b.op] || { ok: true, rows: [] }) : p === '/api/admin-prefs' ? (b.op === 'get' ? { ok: true, pref: { tab: 'analytics', lang: 'vi', theme: 'auto' } } : { ok: true, rows: [] }) : p === '/api/drive' ? { alerts: [] } : { ok: true, rows: [] };
const fails = [];
for (const [width, scheme, lang] of CONFIGS) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.addInitScript(([l, th]) => { try { localStorage.setItem('lk.admLang', l); localStorage.setItem('lk.admTheme', th); } catch (e) { /* bỏ qua */ } }, [lang, scheme]);
  await ctx.route('**/*', r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname === 'www.gstatic.com') return r.fulfill({ contentType: 'text/javascript', body: /firebase-app-compat/.test(u.pathname) ? FB : '' });
    if (u.hostname !== 'lk.test') return r.abort();
    if (u.pathname.startsWith('/api/')) { let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) { /* bỏ qua */ } return r.fulfill({ contentType: 'application/json', body: JSON.stringify(api(u.pathname, b)) }); }
    const f = path.join(WEB, decodeURIComponent(u.pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
  });
  const page = await ctx.newPage(), tag = `${width}-${scheme}-${lang}`;
  page.on('pageerror', e => fails.push(`${tag}: lỗi JS ${e.message}`));
  await page.goto('https://lk.test/admin.html#analytics', { waitUntil: 'load' });
  const ok = await page.waitForSelector('.plat-tbl', { timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok) { fails.push(`${tag}: không thấy thẻ Nền tảng`); await ctx.close(); continue; }
  const loc = page.locator('.card', { has: page.locator('.plat-tbl') }).first();
  await page.waitForTimeout(400); await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  await loc.screenshot({ path: path.join(OUT, `${TAG}-${name(width, scheme, lang)}`) });
  const card = await loc.elementHandle();
  if (TAG === 'after') {
    const res = await card.evaluate((c, W) => {
      const o = [], rows = [...c.querySelectorAll('tbody tr')], over = document.scrollingElement.scrollWidth - innerWidth;
      if (over > 1) o.push(`trang tràn ngang ${over} px`);
      const lw = document.documentElement.clientWidth;
      if (innerWidth > lw + 1 || document.scrollingElement.scrollWidth > lw + 1) {
        // phần tử sâu nhất thò quá mép phải màn thật → trình duyệt điện thoại thu nhỏ cả trang (owner thấy chữ bé, thẻ bị ép)
        const out = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > lw + 1 && ![...e.children].some(k => k.getBoundingClientRect().right > lw + 1); });
        const id = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + [...e.classList].slice(0, 2).join('.') + ` [${Math.round(r.left)}..${Math.round(r.right)} ${cs.position}${cs.transform !== 'none' ? ' tf' : ''}] "${(e.textContent || '').trim().slice(0, 16)}"`; };
        o.push(`trang bị thu nhỏ: bố cục ${lw}px, nội dung ${document.scrollingElement.scrollWidth}px, innerWidth ${innerWidth} – thò ra: ${out.slice(0, 6).map(id).join(', ')}`);
      }
      const ell = [...c.querySelectorAll('tbody th, tfoot th')].filter(th => th.scrollWidth > th.clientWidth + 1).map(th => th.textContent.trim());
      if (ell.length) o.push(`nhãn bị cắt (…): ${ell.join(', ')}`);
      const cw = c.getBoundingClientRect().width; if (cw < W * 0.8) o.push(`thẻ chỉ rộng ${Math.round(cw)}/${W} px (bị ép vào nửa lưới)`);
      if (c.scrollWidth > c.clientWidth + 1) o.push(`thẻ tràn ngang ${c.scrollWidth - c.clientWidth} px`);
      if (rows.length !== 5) o.push(`cần 5 dòng nền tảng, có ${rows.length}`);
      const hs = rows.map(r => Math.round(r.getBoundingClientRect().height));
      if (Math.max(...hs) - Math.min(...hs) > 1) o.push(`dòng cao không đều: ${hs}`);
      if (Math.min(...hs) < 44) o.push(`dòng thấp hơn 44 px: ${hs}`);
      const ws = [];
      for (const r of rows) {
        const pn = r.querySelector('.pn'), lh = parseFloat(getComputedStyle(pn).lineHeight) || 20, bar = r.querySelector('.pbar'), fill = bar && bar.querySelector('i'), n = r.querySelectorAll('td.num')[1];
        if (pn.getClientRects().length > 1 || pn.getBoundingClientRect().height > lh * 1.5) o.push(`nhãn "${pn.textContent}" xuống dòng`);
        if (!bar || !n) { o.push('thiếu thanh/số'); continue; }
        const rb = r.getBoundingClientRect(), bb = bar.getBoundingClientRect(), mid = (bb.top + bb.bottom) / 2;
        if (mid < rb.top || mid > rb.bottom || Math.abs(mid - (rb.top + rb.bottom) / 2) > 6) o.push(`thanh "${pn.textContent}" không cùng dòng với số`);
        const v = +n.textContent.replace(/[^\d]/g, ''), fw = fill.getBoundingClientRect().width;
        if (!v && fw > 0) o.push(`dòng 0 "${pn.textContent}" vẫn có thanh ${fw}px`);
        if (v && fw < 3) o.push(`dòng ${v} "${pn.textContent}" thanh chỉ ${fw}px`);
        ws.push([v, fw, bb.width]);
      }
      // thang chung: phần thanh vượt mức tối thiểu tỉ lệ với số 30 ngày
      const big = ws.filter(([v, fw]) => v && fw > 6).sort((a, b) => b[0] - a[0]);
      if (big.length >= 2) { const [a, b] = big; if (Math.abs(a[1] / b[1] - a[0] / b[0]) > 0.15 * (a[0] / b[0])) o.push(`thanh không cùng thang: ${JSON.stringify(big)}`); }
      if (ws.length && ws[0][1] >= ws[0][2] - 0.5) o.push('Web (209/230) vẫn là thanh đầy');
      const ft = c.querySelector('tfoot tr'); if (!ft || !/230/.test(ft.textContent)) o.push('thiếu dòng Tổng = 230 thiết bị khác nhau');
      return o;
    }, width);
    for (const x of res) fails.push(`${tag}: ${x}`);
    if (!AXE) fails.push(`${tag}: thiếu axe-core`);
    else {
      await page.addScriptTag({ content: AXE });
      const v = await card.evaluate(async c => (await window.axe.run(c, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(x => `${x.id}: ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`));
      for (const x of v) fails.push(`${tag}: axe ${x}`);
    }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ fails }, null, 1));
if (TAG !== 'after') { console.log(`admin-plat-shots (${TAG}): đã chụp ${CONFIGS.length} ảnh`, fails.length ? JSON.stringify(fails) : ''); process.exit(0); }
if (fails.length) { console.log('✗ admin-plat-shots:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log(`✓ admin-plat-shots: thẻ Nền tảng × ${CONFIGS.length} cấu hình (360/390, sáng/tối) – 1 dòng/nền tảng, thang chung, Tổng, ≥ 44 px, axe 0 lỗi`);
