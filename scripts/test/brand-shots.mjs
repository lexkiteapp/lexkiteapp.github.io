// 🎨 Ảnh trước/sau đổi bảng màu (docs/UX-BENCHMARK.md §5, brand/tokens.json): popup add-on + 1 bài học (sáng/tối) và icon 48/96/512 trên màn hình chính sáng/tối.
// Hermetic: phục vụ thẳng thư mục repo (page.route), API add-on giả lập → 0 lượt chạm prod. Bản app/bản đồ đã có ở ux-shots.yml (nhánh ux-shots-ux1*).
// Dùng: node scripts/test/brand-shots.mjs <repo-sau> [repo-trước] [out=out/brand]   (CI: .github/workflows/brand-build.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const [AFTER, BEFORE, OUT = 'out/brand'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const serve = (ctx, map) => ctx.route('**/*', r => {
  const u = new URL(r.request().url()), root = map[u.hostname]; if (!root) return r.abort();
  let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html';
  if (u.hostname === 'lk.test' && p.startsWith('/app/') && !fs.existsSync(path.join(root, p))) p = p.slice(4); // /app/js/x → web/js/x
  const f = path.join(root, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
  r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' });
});
// API chrome.* tối thiểu cho popup.html chạy ngoài trình duyệt add-on
const CHROME = () => { const ev = { addListener() {}, removeListener() {} }, store = { get: (k, cb) => (cb && cb({}), Promise.resolve({})), set: (o, cb) => (cb && cb(), Promise.resolve()), remove: (k, cb) => (cb && cb(), Promise.resolve()) };
  window.chrome = { runtime: { id: 'x', sendMessage: (m, cb) => (typeof cb === 'function' && cb({}), Promise.resolve({})), getURL: p => '/' + p, onMessage: ev, getManifest: () => ({ version: '0' }), lastError: null }, storage: { local: store, sync: store, session: store, onChanged: ev }, tabs: { query: (q, cb) => (cb && cb([]), Promise.resolve([])), create() {}, sendMessage() {} }, i18n: { getMessage: () => '', getUILanguage: () => 'en' }, action: { setBadgeText() {} } }; };
const browser = await chromium.launch(), errs = [], shots = { before: [], after: [] };
for (const [TAG, REPO] of [['before', BEFORE], ['after', AFTER]]) if (REPO) for (const scheme of ['light', 'dark']) {
  // popup add-on: cửa sổ máy tính 380 px (popup không có thẻ viewport → không giả lập điện thoại)
  const pc = await browser.newContext({ viewport: { width: 380, height: 600 }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block' });
  await serve(pc, { 'ext.test': path.join(REPO, 'extension'), 'lk.test': path.join(REPO, 'web') }); await pc.addInitScript(CHROME);
  const pp = await pc.newPage(); pp.on('pageerror', e => errs.push(`${TAG}-${scheme}-popup: ${e.message}`));
  await pp.goto('https://ext.test/popup.html', { waitUntil: 'load' }); await pp.waitForTimeout(1500);
  const pop = path.join(OUT, `${TAG}-popup-${scheme}.jpg`); await pp.screenshot({ path: pop, type: 'jpeg', quality: 72 }); shots[TAG].push(pop); await pc.close();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, serviceWorkers: 'block' });
  await serve(ctx, { 'lk.test': path.join(REPO, 'web') });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`${TAG}-${scheme}: ${e.message}`));
  // bản đồ chặng + 1 bài học thật (?demo=1: chạy được cả khi cờ bài học trộn tắt)
  for (const h of ['lesson?demo=1', 'lesson/go?demo=1']) {
    await page.goto(`https://lk.test/app/?sandbox=1&hl=en#/${h}`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
    const f = path.join(OUT, `${TAG}-${h.replace(/[/?=]/g, '_')}-${scheme}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 72 }); shots[TAG].push(f);
  }
  await ctx.close();
}
// Icon 48/96/512 trên màn hình chính sáng (#EEF1F4) và tối (#0B0B0C): mỗi hàng = bản trước | bản sau
const ctx = await browser.newContext({ viewport: { width: 2100, height: 900 }, deviceScaleFactor: 1 });
await serve(ctx, { 'a.test': AFTER, 'b.test': BEFORE || AFTER }); const page = await ctx.newPage();
const cell = (host, n) => `<figure><img src="https://${host}/web/icons/icon.svg" width="${n}" height="${n}" style="border-radius:${n * .225}px"><figcaption>${n}px</figcaption></figure>`;
const row = (bg, fg, label) => `<section style="background:${bg};color:${fg}"><h2>${label}</h2>${['b.test', 'a.test'].map(h => `<div class="set"><b>${h[0] === 'b' ? 'TRƯỚC' : 'SAU'}</b>${[48, 96, 512].map(n => cell(h, n)).join('')}<img src="https://${h}/web/icons/icon-48.png" width="48" height="48"><small>PNG 48</small></div>`).join('')}</section>`;
await page.setContent(`<!doctype html><style>body{margin:0;font:600 15px system-ui}section{display:flex;width:max-content;min-width:100%;gap:40px;align-items:center;padding:24px}h2{writing-mode:vertical-rl;margin:0}.set{display:flex;gap:22px;align-items:end}figure{margin:0;text-align:center}figcaption,small{font-size:12px;opacity:.8}</style>${row('#EEF1F4', '#111', 'Sáng')}${row('#0B0B0C', '#eee', 'Tối')}`);
await page.waitForTimeout(800); await page.screenshot({ path: path.join(OUT, 'sheet-icon.jpg'), type: 'jpeg', quality: 80, fullPage: true });
await browser.close();
try { for (const TAG of ['before', 'after']) if (shots[TAG].length) execFileSync('montage', [...shots[TAG], '-tile', '6x1', '-geometry', '300x+6+6', '-background', '#888', '-quality', '72', path.join(OUT, `sheet-brand-${TAG}.jpg`)]); }
catch (e) { console.log('montage bỏ qua:', e.message); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errs }, null, 1));
console.log('lỗi JS:', errs.length, JSON.stringify(errs.slice(0, 12)));
