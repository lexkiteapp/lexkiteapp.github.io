// Ảnh trước/sau màn đọc (#/read/<id>): 375 px + desktop, sáng/tối. Phục vụ thẳng từ thư mục web/ (page.route), ?sandbox=1. Chạy trên CI (.github/workflows/read-shots.yml).
// Dùng: node scripts/test/read-shots.mjs <web-sau> <web-trước> [id=ocean-microplastics] [out=out/read]
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const [AFTER, BEFORE, ID = 'ocean-microplastics', OUT = 'out/read'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const browser = await chromium.launch(), errs = [];
for (const [TAG, ROOT] of [['before', BEFORE], ['after', AFTER]]) for (const [vn, vp] of [['m375', { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1366, height: 900 } }]]) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => TAG === 'after' && errs.push(`${vn}-${scheme}: ${e.message}`));
  await page.goto('https://lk.test/app/?sandbox=1&hl=vi#/home', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.goto(`https://lk.test/app/?sandbox=1&hl=vi#/read/${ID}`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `${TAG}-${vn}-${scheme}.png`) });
  if (TAG === 'after') { // bật thêm các lớp để xem đủ chú giải
    for (const k of ['awl', 'link']) await page.click(`[data-hl="${k}"]:not(.on)`, { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `after-${vn}-${scheme}-all.png`) });
    const w = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (vn === 'm375' && w > 2) errs.push(`${vn}-${scheme}: tràn ngang +${w}px`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errs }, null, 2));
console.log('lỗi/tràn:', JSON.stringify(errs)); if (errs.length) process.exit(1);
