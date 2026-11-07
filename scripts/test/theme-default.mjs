// 🌗 Mặc định giao diện (chủ chốt 07/11): người CHƯA chọn → TỰ THEO MÁY (prefers-color-scheme, như #754); đã chọn Sáng/Tối thì giữ; màn học có nút đổi sáng/tối.
// Chạy trên Chromium thật, TẮT cờ tự động hóa (navigator.webdriver=false) như người dùng thật – các test khác giữ webdriver để phủ cả 2 chế độ theo colorScheme.
// Dùng: node scripts/test/theme-default.mjs [dist|web] [--shots dir]   (CI: theme-qa.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const args = process.argv.slice(2), ROOT = path.resolve(args.find(a => !a.startsWith('--') && a !== args[args.indexOf('--shots') + 1]) || 'dist');
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://lexkite.test', TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const file = u => { let p = decodeURIComponent(new URL(u).pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); return f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null; };
const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
const bad = []; let n = 0; const ok = (c, m) => { n++; if (!c) { bad.push(m); console.error('✗ ' + m); } };
const ctxOf = async (seed = {}, vp = { width: 390, height: 844 }, scheme = 'light') => {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, serviceWorkers: 'block', locale: 'vi' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith(BASE)) return r.abort(); const f = file(u); return f ? r.fulfill({ path: f, contentType: TYPES[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } } catch { /* */ } }, seed);
  return ctx;
};
const theme = p => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
const lum = c => { const [r, g, b] = (c.match(/[\d.]+/g) || []).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
// [tên, seed localStorage, data-theme mong đợi theo máy sáng, theo máy tối] – null = không đặt thuộc tính (CSS theo prefers-color-scheme)
const CASES = [
  ['khách mới (chưa chọn)', {}, null, null],
  ['bản cũ settings=auto, chưa từng chọn', { 'ielts.settings': '{"theme":"auto"}', 'ielts.settingsAt': '1' }, null, null],
  ['đã chọn Sáng', { 'lk.theme': 'light', 'lk.themeAt': '1' }, 'light', 'light'],
  ['đã chọn Tối', { 'lk.theme': 'dark', 'lk.themeAt': '1' }, 'dark', 'dark'],
];
for (const scheme of ['light', 'dark']) for (const [name, seed, wantL, wantD] of CASES) for (const url of ['/', '/app/']) {
  const want = scheme === 'light' ? wantL : wantD, dark = want ? want === 'dark' : scheme === 'dark';
  const ctx = await ctxOf(seed, undefined, scheme), page = await ctx.newPage();
  ok(await page.evaluate(() => navigator.webdriver) === false, 'test phải chạy với webdriver=false');
  await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(600);
  ok(await theme(page) === want, `${name} máy ${scheme} ${url}: data-theme=${await theme(page)}, cần ${want}`);
  const L = lum(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  ok(dark ? L < .05 : L > .5, `${name} máy ${scheme} ${url}: độ sáng nền ${L.toFixed(3)} không khớp`);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
  ok(await theme(page) === want, `${name} máy ${scheme} ${url}: tải lại đổi thành ${await theme(page)}`);
  await ctx.close();
}
// Màn học: nút hiện, ≥ 44 px, không đè nội dung header, đổi được và nhớ – điện thoại + máy tính
for (const [tag, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 900 }]]) {
  const ctx = await ctxOf({ 'lk.ux1': '1', 'ielts.settings': JSON.stringify({ onboarded: true }) }, vp), page = await ctx.newPage();
  await page.goto(`${BASE}/app/#/lesson/go?demo=1`, { waitUntil: 'load' });
  const b = page.locator('#view #lkTheme:visible').first();
  try { await b.waitFor({ state: 'visible', timeout: 15000 }); } catch { ok(false, `${tag}: màn học không có nút sáng/tối (${page.url()})`); console.error(await page.evaluate(() => { const h = document.querySelector('#view header'); const x = document.querySelector('#lkTheme'); return 'DOM: header=' + (h ? h.outerHTML.slice(0, 600) + ' display=' + getComputedStyle(h).display + ' rect=' + JSON.stringify(h.getBoundingClientRect()) : 'none') + ' | #lkTheme=' + (x ? JSON.stringify(x.getBoundingClientRect()) + ' disp=' + getComputedStyle(x).display : 'none') + ' | view=' + (document.querySelector('#view') || {}).className + ' body=' + document.body.className; })); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-missing.png`) }); await ctx.close(); continue; }
  const box = await b.boundingBox(); ok(box.width >= 44 && box.height >= 44, `${tag}: nút ${box.width}×${box.height} < 44 px`);
  const hit = await page.evaluate(() => { const x = [...document.querySelectorAll('#view #lkTheme')].find(e => e.getClientRects().length), r = x.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return x.contains(t); }); ok(hit, `${tag}: nút bị che`);
  const over = await page.evaluate(() => { const x = [...document.querySelectorAll('#view #lkTheme')].find(e => e.getClientRects().length), r = x.getBoundingClientRect(); return [...document.querySelectorAll('#view .lsn-x, #lsnPct, #lsnFill, [data-href="#/me"]')].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }).map(e => e.id || e.className).slice(0, 3); });
  ok(!over.length, `${tag}: nút đè lên ${over}`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-auto.png`) });
  ok(await theme(page) === null, `${tag}: màn học chưa chọn phải theo máy (không đặt data-theme)`);
  await b.click(); ok(await theme(page) === 'dark', `${tag}: bấm nút (máy sáng) không sang tối`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-toggled.png`) });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800); ok(await theme(page) === 'dark', `${tag}: tải lại mất lựa chọn tối`);
  await ctx.close();
}
await browser.close();
if (bad.length) { console.error(`✗ theme-default: ${bad.length}/${n} lỗi`); process.exit(1); }
console.log(`✓ theme-default: ${n} kiểm – khách mới theo máy (sáng/tối), lựa chọn được giữ, nút trong màn học OK`);
