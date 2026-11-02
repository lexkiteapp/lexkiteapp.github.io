// Ảnh + gác trang #analytics trên điện thoại (thẻ "📱 Nền tảng" + cả trang) – khung thật web/admin.html, Firebase giả, /api/* = dữ liệu mẫu (số thật của owner 1/11), 0 mạng.
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
// Khổ web (máy tính): chỉ chụp + gác biểu đồ 14 ngày & tràn ngang (thẻ Nền tảng nằm trong lưới nhiều cột – gác 1 cột chỉ ở điện thoại)
const DESK = [[1280, 'dark', 'vi'], [1280, 'light', 'en']];
const browser = await pw.chromium.launch();
const name = (w, th, l) => `plat-${w}-${th}-${l}.png`;

if (process.argv[2] === '--compare') {
  const OUT = process.argv[3] || 'out/admin-plat', made = [];
  // biểu đồ 14 ngày (thẻ Lưu lượng trực tiếp): TRƯỚC | SAU, điện thoại + web
  for (const [w, th, l] of [...CONFIGS, ...DESK]) {
    const fb = path.join(OUT, 'before-live-' + name(w, th, l)), fa = path.join(OUT, 'after-live-' + name(w, th, l)); if (!fs.existsSync(fa)) continue;
    const cw = Math.min(w, 900), page = await browser.newPage({ viewport: { width: cw * 2 + 48, height: 300 } });
    await page.setContent(`<body style="margin:0;background:#777;font:600 14px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', fb], ['SAU', fa]].map(([t, f]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${t} · 14 ngày · ${w}px ${th} ${l.toUpperCase()}</figcaption>${fs.existsSync(f) ? `<img style="width:${cw}px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '(không có ảnh)'}</figure>`).join('')}</body>`);
    const f = path.join(OUT, `sheet-live-${w}-${th}-${l}.jpg`); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 80 }); made.push(f); await page.close();
  }
  for (const [w, th, l] of DESK) {
    const pb = path.join(OUT, 'before-page-' + name(w, th, l)), pa = path.join(OUT, 'after-page-' + name(w, th, l)); if (!fs.existsSync(pa)) continue;
    const page = await browser.newPage({ viewport: { width: 1640, height: 300 } });
    await page.setContent(`<body style="margin:0;background:#777;font:600 14px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', pb], ['SAU', pa]].map(([t, f]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${t} · #analytics web ${w}px ${th} ${l.toUpperCase()}</figcaption>${fs.existsSync(f) ? `<img style="width:800px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '(không có ảnh)'}</figure>`).join('')}</body>`);
    const f = path.join(OUT, `sheet-page-${w}-${th}-${l}.jpg`); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 72 }); made.push(f); await page.close();
  }
  for (const [w, th, l] of CONFIGS) {
    const fb = path.join(OUT, 'before-' + name(w, th, l)), fa = path.join(OUT, 'after-' + name(w, th, l)); if (!fs.existsSync(fa)) continue;
    const img = f => fs.existsSync(f) ? `<img style="width:${w}px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '<div style="width:360px;padding:20px">(không có ảnh)</div>';
    const page = await browser.newPage({ viewport: { width: w * 2 + 48, height: 300 }, deviceScaleFactor: 2 });
    await page.setContent(`<body style="margin:0;background:#777;font:600 14px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', fb], ['SAU', fa]].map(([t, f]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${t} · ${w}px ${th} ${l.toUpperCase()}</figcaption>${img(f)}</figure>`).join('')}</body>`);
    const f = path.join(OUT, `sheet-${w}-${th}-${l}.jpg`); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 80 }); made.push(f); await page.close();
    // cả trang #analytics: TRƯỚC | SAU (1×, để owner thấy tràn/thu nhỏ trên điện thoại)
    const pb = path.join(OUT, 'before-page-' + name(w, th, l)), pa = path.join(OUT, 'after-page-' + name(w, th, l));
    if (fs.existsSync(pa)) {
      const p2 = await browser.newPage({ viewport: { width: w * 2 + 48, height: 300 } });
      await p2.setContent(`<body style="margin:0;background:#777;font:600 14px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', pb], ['SAU', pa]].map(([t, f2]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${t} · #analytics ${w}px ${th} ${l.toUpperCase()}</figcaption>${fs.existsSync(f2) ? `<img style="width:${w}px;display:block" src="data:image/png;base64,${fs.readFileSync(f2).toString('base64')}">` : '(không có ảnh)'}</figure>`).join('')}</body>`);
      const f3 = path.join(OUT, `sheet-page-${w}-${th}-${l}.jpg`); await p2.screenshot({ path: f3, fullPage: true, type: 'jpeg', quality: 72 }); made.push(f3); await p2.close();
    }
  }
  await browser.close(); console.log(made.join('\n') || 'không có ảnh'); process.exit(0);
}

const [WEB = 'web', OUT = 'out/admin-plat', TAG = 'after'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const R = o => Object.entries(o).map(([k, n]) => ({ k, n }));
// Số thật trong ảnh chụp của owner (1/11) + số thiết bị khác nhau server mới trả (15 máy dùng cả web và PWA)
const LIVE = { ...FX.live, online: 3, viewing: R({ home: 1, review: 1, say: 1 }), today: { ...FX.live.today, visitors: 10 }, countries: R({ VN: 6, JP: 2, IN: 1, US: 1 }),
  pagesToday: R({ home: 8, review: 3, say: 1 }), refs: R({ 'google.com': 3, 'facebook.com': 1 }), platsToday: R({ web: 17, android: 2, ext: 1 }), plats30: R({ web: 209, ext: 15, pwa: 12, android: 8, ios: 1 }), devToday: { v: 20, multi: 0 }, dev30: { v: 230, multi: 15 },
  // 14 ngày dạng số thật 2/11 (lượt xem ~25× khách); điểm hôm nay của chuỗi đệm còn 0/0 trong khi thẻ hôm nay đã đếm
  series: FX.live.series.map((r, i, a) => i === a.length - 1 ? { ...r, views: 0, visitors: 0 } : { ...r, views: [120, 60, 70, 180, 190, 160, 140, 520, 430, 610, 1110, 887, 534, 689][i] || 300, visitors: [7, 3, 15, 12, 21, 23, 33, 31, 42, 43, 43, 41, 30, 38][i] || 20 }), day: FX.live.series[FX.live.series.length - 1].day };
const FB = `window.firebase = { initializeApp() {}, auth: Object.assign(() => window.__AUTH, { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } }) };
  const U = { uid: 'plat', email: 'admin@example.com', displayName: 'Plat', photoURL: '', getIdToken: async () => 'x' };
  window.__AUTH = { currentUser: U, onAuthStateChanged: cb => setTimeout(() => cb(U), 0), signOut: async () => {}, signInWithPopup: async () => {} };`;
const api = (p, b) => p === '/api/admin' ? (b.op === 'live' ? LIVE : FX[b.op] || { ok: true, rows: [] }) : p === '/api/admin-prefs' ? (b.op === 'get' ? { ok: true, pref: { tab: 'analytics', lang: 'vi', theme: 'auto' } } : { ok: true, rows: [] }) : p === '/api/drive' ? { alerts: [] } : { ok: true, rows: [] };
const fails = [];
for (const [width, scheme, lang] of [...CONFIGS, ...DESK]) {
  const desk = width > 900;
  const ctx = await browser.newContext({ viewport: { width, height: desk ? 900 : 844 }, deviceScaleFactor: desk ? 1 : 2, isMobile: !desk, hasTouch: !desk, colorScheme: scheme, serviceWorkers: 'block' });
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
  const live = page.locator('#liveCard'); await live.scrollIntoViewIfNeeded(); await live.screenshot({ path: path.join(OUT, `${TAG}-live-${name(width, scheme, lang)}`) });
  const card = await loc.elementHandle();
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(OUT, `${TAG}-page-${name(width, scheme, lang)}`), fullPage: true });
  if (TAG === 'after') {
    // ---- Biểu đồ 14 ngày: khách có trục riêng (không nằm sát 0 cạnh lượt xem), điểm hôm nay = thẻ hôm nay ----
    const ac = await page.evaluate(() => {
      const o = [], svg = document.querySelector('#liveCard .area-chart'); if (!svg) return ['biểu đồ 14 ngày: không có'];
      const H = svg.viewBox.baseVal.height, bb = p => { const b = p.getBBox(); return b.height / H; };
      const u = svg.querySelector('.ac-u'), v = svg.querySelector('.ac-v');
      if (bb(u) < 0.3) o.push(`biểu đồ 14 ngày: đường khách chỉ cao ${Math.round(bb(u) * 100)}% khung (trông như mất dữ liệu)`);
      if (bb(v) < 0.3) o.push(`biểu đồ 14 ngày: đường lượt xem chỉ cao ${Math.round(bb(v) * 100)}% khung`);
      if (svg.querySelectorAll('text.ac-ax-u').length !== 3) o.push('biểu đồ 14 ngày: thiếu nhãn trục phải (khách)');
      const last = [...svg.querySelectorAll('.ac-col title')].pop().textContent, tv = (document.querySelector('#liveCard .lt-grid .lt:nth-child(2) .lt-v') || {}).textContent;
      if (!last.includes(' ' + tv + ' ')) o.push(`biểu đồ 14 ngày: điểm hôm nay "${last}" khác thẻ Lượt xem hôm nay ${tv}`);
      const r = svg.getBoundingClientRect(); if (r.right > document.documentElement.clientWidth + 1) o.push('biểu đồ 14 ngày: tràn mép phải');
      return o;
    });
    for (const x of ac) fails.push(`${tag}: ${x}`);
  }
  if (TAG === 'after' && desk) {
    if (await page.evaluate(() => document.scrollingElement.scrollWidth > document.documentElement.clientWidth + 1)) fails.push(`${tag}: cả trang tràn ngang`);
  } else if (TAG === 'after') {
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
    // ---- CẢ TRANG #analytics (owner 1/11 iPhone): không tràn/thu nhỏ, đầu trang không đè + chỗ bấm ≥ 44 px, thanh mọi thẻ cùng kiểu, tên nước đủ, chú giải bản đồ 1 dải ----
    const pg = await page.evaluate(W => {
      const o = [], lw = document.documentElement.clientWidth, vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      if (document.scrollingElement.scrollWidth > lw + 1 || innerWidth > W + 1) o.push(`cả trang: tràn/thu nhỏ – scrollWidth ${document.scrollingElement.scrollWidth}, viewport ${lw}, innerWidth ${innerWidth}`);
      const top = [...document.querySelectorAll('.adm-top > *, .adm-me > *')].filter(e => vis(e) && !e.classList.contains('adm-me') && !e.classList.contains('adm-email'));
      for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) { const a = top[i].getBoundingClientRect(), b = top[j].getBoundingClientRect(); if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) o.push(`đầu trang: "${top[i].textContent.trim().slice(0, 12) || top[i].className}" đè "${top[j].textContent.trim().slice(0, 12) || top[j].className}"`); }
      for (const e of top.filter(e => e.matches('a, button'))) { const r = e.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) o.push(`đầu trang: chỗ bấm "${e.textContent.trim().slice(0, 12) || e.id}" ${Math.round(r.width)}×${Math.round(r.height)} < 44`); if (r.right > lw + 1) o.push(`đầu trang: "${e.textContent.trim().slice(0, 12)}" tràn mép phải`); }
      for (const row of document.querySelectorAll('.hbars .row2')) {
        const i = row.querySelector('.track i'), v = +(row.querySelector('.v').firstChild.textContent || '').replace(/[^\d]/g, ''), fw = i ? i.getBoundingClientRect().width : -1, k = row.querySelector('.k');
        if (!v && fw > 0) o.push(`thanh: dòng 0 "${k.textContent.trim()}" vẫn vẽ ${fw}px`);
        if (v && fw < 3) o.push(`thanh: dòng ${v} "${k.textContent.trim()}" chỉ ${Math.round(fw)}px (trông như chấm lỗi)`);
        if (k.scrollHeight > k.clientHeight + 1 && k.querySelector('.cc')) o.push(`tên nước bị cắt: "${k.textContent.trim()}"`);
      }
      const segs = [...document.querySelectorAll('.map-legend .ml-seg')];
      if (segs.length && new Set(segs.map(s => Math.round(s.getBoundingClientRect().top))).size > 1) o.push('chú giải bản đồ xuống dòng');
      const lg = document.querySelector('.map-legend'); if (lg && lg.getBoundingClientRect().height > 48) o.push(`chú giải bản đồ cao ${Math.round(lg.getBoundingClientRect().height)}px (lộn xộn)`);
      return o;
    }, width);
    for (const x of pg) fails.push(`${tag}: ${x}`);
    if (!AXE) fails.push(`${tag}: thiếu axe-core`);
    else {
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(async () => (await window.axe.run({ include: [['.adm-top'], ['.adm-content']], exclude: [['.world-map']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(x => `${x.id}: ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`));
      for (const x of v) fails.push(`${tag}: axe ${x}`);
    }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ fails }, null, 1));
if (TAG !== 'after') { console.log(`admin-plat-shots (${TAG}): đã chụp ${CONFIGS.length + DESK.length} cấu hình`, fails.length ? JSON.stringify(fails) : ''); process.exit(0); }
if (fails.length) { console.log('✗ admin-plat-shots:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log(`✓ admin-plat-shots: #analytics × ${CONFIGS.length} cấu hình (360/390, sáng/tối) + web 1280 – biểu đồ 14 ngày 2 trục, – không tràn/thu nhỏ, đầu trang ≥ 44 px không đè, thẻ Nền tảng + thanh mọi thẻ cùng thang, tên nước đủ, chú giải 1 dải, axe 0 lỗi`);
