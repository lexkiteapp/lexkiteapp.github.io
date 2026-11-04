// 🌙 Mặc định giao diện (chủ 4/11): khách mới vào = tối xanh chủ đạo kể cả máy đang sáng; đã chọn thì giữ; màn học có nút đổi sáng/tối.
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
const ctxOf = async (seed = {}, vp = { width: 390, height: 844 }) => {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'light', serviceWorkers: 'block', locale: 'vi' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith(BASE)) return r.abort(); const f = file(u); return f ? r.fulfill({ path: f, contentType: TYPES[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } } catch { /* */ } }, seed);
  return ctx;
};
const theme = p => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
const lum = c => { const [r, g, b] = (c.match(/[\d.]+/g) || []).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const CASES = [
  ['khách mới', {}, 'dark'],
  ['bản cũ settings=auto, chưa từng chọn', { 'ielts.settings': '{"theme":"auto"}', 'ielts.settingsAt': '1' }, 'dark'],
  ['đã chọn Sáng', { 'lk.theme': 'light', 'lk.themeAt': '1' }, 'light'],
  ['đã chọn Tối', { 'lk.theme': 'dark', 'lk.themeAt': '1' }, 'dark'],
  ['đã chọn Tự động (máy sáng)', { 'lk.theme': 'auto', 'lk.themeAt': '1' }, null],
];
for (const [name, seed, want] of CASES) for (const url of ['/', '/app/']) {
  const ctx = await ctxOf(seed), page = await ctx.newPage();
  ok(await page.evaluate(() => navigator.webdriver) === false, 'test phải chạy với webdriver=false');
  await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(600);
  ok(await theme(page) === want, `${name} ${url}: data-theme=${await theme(page)}, cần ${want}`);
  const L = lum(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  ok(want === 'dark' ? L < .05 : L > .5, `${name} ${url}: độ sáng nền ${L.toFixed(3)} không khớp`);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
  ok(await theme(page) === want, `${name} ${url}: tải lại đổi thành ${await theme(page)}`);
  await ctx.close();
}
// Màn học: nút hiện, ≥ 44 px, không đè nội dung header, đổi được và nhớ – điện thoại + máy tính
for (const [tag, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 900 }]]) {
  const ctx = await ctxOf({ 'lk.ux1': '1', 'ielts.settings': JSON.stringify({ onboarded: true }) }, vp), page = await ctx.newPage();
  await page.goto(`${BASE}/app/#/lesson/go?demo=1`, { waitUntil: 'load' });
  const b = page.locator('#view #lkTheme:visible, #view .lk-ftheme:visible').first();
  try { await b.waitFor({ state: 'visible', timeout: 15000 }); } catch { ok(false, `${tag}: màn học không có nút sáng/tối (${page.url()})`); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-missing.png`) }); await ctx.close(); continue; }
  const box = await b.boundingBox(); ok(box.width >= 44 && box.height >= 44, `${tag}: nút ${box.width}×${box.height} < 44 px`);
  const hit = await page.evaluate(() => { const x = [...document.querySelectorAll('#view #lkTheme, #view .lk-ftheme')].find(e => e.getClientRects().length), r = x.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return x.contains(t); }); ok(hit, `${tag}: nút bị che`);
  const over = await page.evaluate(() => { const x = [...document.querySelectorAll('#view #lkTheme, #view .lk-ftheme')].find(e => e.getClientRects().length), r = x.getBoundingClientRect(); return [...document.querySelectorAll('#view .lsn-x, #lsnPct, #lsnFill, [data-href="#/me"]')].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }).map(e => e.id || e.className).slice(0, 3); });
  ok(!over.length, `${tag}: nút đè lên ${over}`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-dark.png`) });
  ok(await theme(page) === 'dark', `${tag}: màn học mặc định phải tối`);
  await b.click(); ok(await theme(page) === 'light', `${tag}: bấm nút không sang sáng`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lesson-${tag}-light.png`) });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800); ok(await theme(page) === 'light', `${tag}: tải lại mất lựa chọn sáng`);
  await ctx.close();
}
await browser.close();
if (bad.length) { console.error(`✗ theme-default: ${bad.length}/${n} lỗi`); process.exit(1); }
console.log(`✓ theme-default: ${n} kiểm – khách mới tối xanh, lựa chọn được giữ, nút trong màn học OK`);
