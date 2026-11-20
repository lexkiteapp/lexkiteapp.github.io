// 🧭 Thanh trên hub THỐNG NHẤT trên điện thoại (docs/DESIGN-SYSTEM.md §5d): đo render thật 5 tab × WebKit(iPhone)+Chromium × sáng/tối × 360/390 px.
// Đỏ khi: tab nào không có đúng MỘT thanh hub nhìn thấy (logo · tra từ · chuông · 🌐 · avatar; viên số trừ Hôm nay) / còn thanh trên cũ hoặc phần tử dính-cố định khác ở mép trên;
// thanh hub thiếu env(safe-area-inset-top) (chữ đè thanh trạng thái iOS – chủ báo 15/11); hai nút chồng nhau / nút bị phần tử khác che / vùng chạm < 44; tràn ngang;
// nhãn thanh tab dưới không cùng một kiểu (HOA ↔ thường) hoặc bị cắt ra ngoài màn; > 1 nút ngôn ngữ. Ảnh từng màn lưu ra thư mục ảnh.
// Dùng: node scripts/test/hub-bar.mjs [web=web] [out=out/hub-bar] [--engine=webkit|chromium]   (CI: .github/workflows/hub-bar.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from 'playwright';
const argv = process.argv.slice(2), eng = (argv.find(a => a.startsWith('--engine=')) || '').slice(9), [ROOT = 'web', OUT = 'out/hub-bar'] = argv.filter(a => !a.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const ROUTES = ['home', 'vocab', 'skills', 'tests', 'me'], fails = []; let n = 0;
const measure = () => {
  const vis = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const W = document.documentElement.clientWidth, hbs = [...document.querySelectorAll('header.hb')].filter(vis), hb = hbs[0];
  const o = { W, sw: document.documentElement.scrollWidth, hbN: hbs.length, css: (document.getElementById('stHbCss') || {}).textContent || '' };
  o.oldTop = [...document.querySelectorAll('.topbar')].filter(vis).length;
  o.langs = [...document.querySelectorAll('#langBtn, [data-act="lang"], [data-lsw] > button')].filter(vis).filter(e => !e.closest('.v2s-me main')).length;
  // phần tử cố định/dính ở mép trên ngoài thanh hub (lớp thứ hai đè lên / thanh trên cũ còn sót)
  o.stray = [...document.querySelectorAll('body *')].filter(e => { if (hb && hb.contains(e)) return false; const c = getComputedStyle(e); if (!/^(fixed|sticky)$/.test(c.position) || !vis(e)) return false; const r = e.getBoundingClientRect(); return r.top <= 1 && r.bottom > 0 && r.bottom < 200 && r.width > W * .5; }).map(e => e.tagName + '.' + String(e.className).split(' ')[0]);
  if (hb) {
    const items = [...hb.querySelectorAll('a, button')].filter(vis), kinds = { logo: '.hb-logo', search: '[data-act="search"]', bell: '[data-act="notif"]', lang: '[data-act="lang"]', av: '.hb-av' };
    o.missing = Object.entries(kinds).filter(([, s]) => !hb.querySelector(s) || !vis(hb.querySelector(s))).map(([k]) => k);
    o.chips = [...hb.querySelectorAll('[data-hdr]')].filter(vis).length;
    o.top = box(hb).t; o.padTop = parseFloat(getComputedStyle(hb).paddingTop);
    o.small = items.filter(e => box(e).h < 43.5 || (e.matches('button, .hb-b') && box(e).w < 43.5)).map(e => (e.getAttribute('data-act') || e.getAttribute('data-hdr') || e.className) + ' ' + box(e).w.toFixed(0) + '×' + box(e).h.toFixed(0));
    o.out = items.filter(e => { const b = box(e); return b.l < -.5 || b.r > W + .5; }).length;
    const bs = items.map(box); o.overlap = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1) o.overlap.push(i + '/' + j); }
    o.covered = items.filter(e => { const b = box(e), x = (b.l + b.r) / 2, y = (b.t + b.b) / 2, h = document.elementFromPoint(x, y); return !(h && (h === e || e.contains(h))); }).map(e => e.getAttribute('data-act') || e.getAttribute('data-hdr') || e.className);
  }
  const nav = [...document.querySelectorAll('nav a[data-tab], #bnav a[data-tab]')].filter(vis);
  o.nav = nav.map(a => { const sp = a.querySelector('span:not(.badge), bdi'), c = sp ? getComputedStyle(sp) : {}, b = box(a); return { k: a.getAttribute('data-tab'), tt: c.textTransform, l: b.l, r: b.r }; });
  return o;
};
const run = async (name, type, ctxOpts, th, w, route) => {
  const browser = await type.launch(); const ctx = await browser.newContext({ ...ctxOpts, colorScheme: th, serviceWorkers: 'block' });
  await ctx.addInitScript(([t]) => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: t, exam: 'ielts', examTarget: '6.5' })); localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ } }, [th]);
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); return r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const tag = `${name}/${th}/${w}/${route}`, bad = s => fails.push(`${tag}: ${s}`);
  await page.goto(`https://lk.test/app/?sandbox=1&hl=vi#/${route}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('view') && document.getElementById('view').children.length > 0, null, { timeout: 15000 }).catch(() => bad('#view trống sau 15 s'));
  await page.waitForTimeout(1800);
  const m = await page.evaluate(measure); n++;
  if (m.hbN !== 1) bad(`${m.hbN} thanh hub nhìn thấy (cần đúng 1)`);
  if (m.oldTop) bad(`còn ${m.oldTop} thanh trên cũ (.topbar) nhìn thấy`);
  if (m.stray.length) bad(`phần tử dính/cố định thứ hai ở mép trên: ${m.stray.join(', ')}`);
  if (!/safe-area-inset-top/.test(m.css) || !(m.padTop >= 0)) bad('thanh hub thiếu env(safe-area-inset-top)');
  if (m.hbN === 1) {
    if (m.missing.length) bad(`thanh hub thiếu: ${m.missing.join(', ')}`);
    if (route !== 'home' && m.chips !== 4) bad(`${m.chips}/4 viên số`);
    if (m.small.length) bad(`vùng chạm < 44 px: ${m.small.join('; ')}`);
    if (m.out) bad(`${m.out} nút ra ngoài màn`);
    if (m.overlap.length) bad(`nút chồng nhau: ${m.overlap.join(', ')}`);
    if (m.covered.length) bad(`nút bị phần tử khác che: ${m.covered.join(', ')}`);
  }
  if (m.langs > 1) bad(`${m.langs} nút ngôn ngữ`);
  if (m.sw > m.W) bad(`tràn ngang ${m.sw} > ${m.W}`);
  if (m.nav.length !== 5) bad(`thanh tab dưới có ${m.nav.length}/5 tab`); else { if (new Set(m.nav.map(x => x.tt)).size > 1) bad(`nhãn tab dưới lẫn kiểu: ${m.nav.map(x => x.k + '=' + x.tt).join(' ')}`); if (m.nav.some(x => x.tt === 'uppercase')) bad('nhãn tab dưới viết HOA (chuẩn: một kiểu chữ thường)'); if (m.nav.some(x => x.l < -.5 || x.r > m.W + .5)) bad('nhãn tab dưới bị cắt ra ngoài màn'); }
  if (errs.length) bad(`lỗi JS: ${errs[0]}`);
  await page.screenshot({ path: `${OUT}/${name}-${th}-${w}-${route}.png` });
  await browser.close();
};
const E = { webkit: [webkit, { ...devices['iPhone 14'] }], chromium: [chromium, { ...devices['Pixel 7'] }] };
for (const name of eng ? [eng] : Object.keys(E)) for (const th of ['dark', 'light']) for (const w of [390, 360]) for (const route of ROUTES) {
  const [type, o] = E[name], vp = { width: w, height: 800 };
  await run(name, type, { ...o, viewport: vp, screen: vp }, th, w, route).catch(e => fails.push(`${name}/${th}/${w}/${route}: ${e.message.split('\n')[0]}`));
}
console.log(`hub-bar: ${n} lượt đo, ${fails.length ? fails.length + ' lỗi' : 'đạt'}`); fails.forEach(f => console.error('✗', f));
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ n, fails }, null, 1));
if (fails.length) process.exit(1);
