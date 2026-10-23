// 🔁 Ảnh trước/sau [P2-1.2 + P2-1.1-UI] ôn tập đa chế độ + thẻ "Câu của bạn": web + mobile, sáng/tối, vi/en/ar (RTL).
// Phục vụ file thẳng từ thư mục web/ (page.route, không cần máy chủ), ?sandbox=1, thẻ mẫu ghi vào Store. Chạy trên CI (.github/workflows/review-shots.yml).
// Dùng: node scripts/test/review-shots.mjs <web-sau> <web-trước> [out=out/p2] · đỏ khi lỗi JS ở bản mới hoặc tràn ngang trên điện thoại.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const [AFTER, BEFORE, OUT = 'out/p2'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const browser = await chromium.launch();
const errs = [];
async function run(TAG, ROOT, vn, scheme, lang, modes) {
  const vp = vn === 'mobile' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => TAG === 'after' && errs.push(`${vn}-${lang}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const C = Core.Cards, map = {}; const now = Date.now();
    const mk = (e, srs, x) => { const c = C.make(e); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 4, ...srs }; Object.assign(c, x || {}); map[c.word.toLowerCase()] = c; };
    mk({ word: 'accomplish', ipa: '/əˈkʌmplɪʃ/', pos: 'verb', vi: 'hoàn thành, đạt được', def: 'to succeed in doing something', ex: 'She accomplished her goal.' }, { D: 8 }, { ctx: 'After months of practice, the team finally accomplished what nobody thought was possible in such a short time.', src: 'bbc.co.uk', contexts: [{ text: 'After months of practice, the team finally accomplished what nobody thought was possible in such a short time.', source: 'https://www.bbc.co.uk/news/x', at: now }] });
    mk({ word: 'borrow', ipa: '/ˈbɒrəʊ/', pos: 'verb', vi: 'mượn', def: 'to take something that you will give back', ex: 'Can I borrow your pen?' }, { D: 6 });
    mk({ word: 'sustainable', ipa: '/səˈsteɪnəbl/', pos: 'adjective', vi: 'bền vững', def: 'able to continue over a period of time', ex: 'We need sustainable energy.' }, { D: 3, reps: 4 });
    for (const [w, v] of [['river', 'dòng sông'], ['window', 'cửa sổ'], ['decline', 'suy giảm'], ['habit', 'thói quen']]) mk({ word: w, pos: 'noun', vi: v, ex: '' }, { due: now + 9e9 });
    for (const c of Object.values(map)) await C.update(c); // Store không phải biến toàn cục → ghi qua API Core
  });
  for (const m of modes) {
    await page.goto(url('home')); await page.goto(url('review'), { waitUntil: 'load' }); await page.waitForTimeout(1800);
    if (m !== 'auto') { await page.selectOption('#rmSel', m).catch(() => {}); await page.waitForTimeout(700); }
    if (m === 'audio') { await page.click('[data-opt="0"]').catch(() => {}); await page.waitForTimeout(500); await page.evaluate(() => scrollTo(0, 0)); }
    if (m === 'type') { await page.fill('#typeIn', 'acomplish').catch(() => {}); await page.keyboard.press('?').catch(() => {}); await page.waitForTimeout(300); }
    const name = `${TAG}-${vn}-${scheme}-${lang}-${m}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: vn === 'desktop' ? false : true });
    if (vn === 'mobile') { const w = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (w > 2) errs.push(`${name}: tràn ngang +${w}px`); }
  }
  await ctx.close();
}
for (const [TAG, ROOT] of [['before', BEFORE], ['after', AFTER]]) {
  const after = TAG === 'after';
  await run(TAG, ROOT, 'desktop', 'light', 'en', after ? ['auto', 'type', 'audio'] : ['auto']);
  await run(TAG, ROOT, 'mobile', 'light', 'vi', after ? ['auto', 'type', 'audio'] : ['auto']);
  await run(TAG, ROOT, 'mobile', 'dark', 'en', after ? ['auto', 'audio'] : ['auto']);
  if (after) await run(TAG, ROOT, 'mobile', 'light', 'ar', ['auto', 'audio']);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errs }, null, 2));
console.log('lỗi/tràn:', JSON.stringify(errs));
if (errs.length) process.exit(1);
