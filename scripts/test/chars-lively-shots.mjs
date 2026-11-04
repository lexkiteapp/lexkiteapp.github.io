// 🎞 Ama/Carlos sinh động: chụp + quay MỌI màn có nhân vật (390 + desktop × sáng + tối), kèm số đo chuyển động. CI: .github/workflows/chars-lively.yml. Không chạy trên Mac.
// Dùng: node scripts/test/chars-lively-shots.mjs [web=web] [out=out/chars-lively] [--report] · --sheet <trước> <sau> <out> ghép trước/sau
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { DRIVE, DRIVEN, SEED_STREAK, FIX_CLOCK, MIME } from './stitch-screens.mjs';
const argv = process.argv.slice(2), REPORT = argv.includes('--report');
const VIEWS = [['390', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['desk', { width: 1280, height: 900, isMobile: false, hasTouch: false }]], THEMES = ['light', 'dark'];
const SURF = { landing: { page: '/index.html' }, home: { route: 'home' }, 'today-new': { route: 'home', drive: 'today-new' }, learn: { route: 'learn' }, lesson: { route: 'lesson/go?demo=1', drive: 'lesson' }, feedback: { route: 'lesson/go?demo=1', drive: 'feedback' }, 'feedback-wrong': { route: 'lesson/go?demo=1', drive: 'feedback-wrong' }, complete: { route: 'lesson/go?demo=1', drive: 'complete' }, story: { route: 'lesson/go?demo=1', drive: 'story' }, call: { route: 'call/coffee', drive: 'call' }, 'speak-sit': { route: 'speak/cafe' }, 'speak-drill': { route: 'speak/cafe/drill' } };
const browser = await chromium.launch();
if (argv[0] === '--sheet') {
  const [, A, B, O] = argv; fs.mkdirSync(O, { recursive: true }); const uri = f => (fs.existsSync(f) ? `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}` : '');
  for (const [vn] of VIEWS) for (const th of THEMES) { const cell = (d, k) => { const s = uri(path.join(d, `${k}-${vn}-${th}.jpg`)); return s ? `<img src="${s}" style="width:${vn === '390' ? 234 : 500}px;display:block">` : '–'; };
    const rows = Object.keys(SURF).map(k => `<tr><th>${k}</th><td>${cell(A, k)}</td><td>${cell(B, k)}</td></tr>`).join('');
    const p = await browser.newPage({ viewport: { width: vn === '390' ? 640 : 1160, height: 900 } }); await p.setContent(`<!doctype html><meta charset=utf-8><style>body{font:13px system-ui;margin:12px;background:#fff}td,th{border:1px solid #bbb;padding:4px;vertical-align:top}table{border-collapse:collapse}</style><table><tr><th></th><th>TRƯỚC</th><th>SAU</th></tr>${rows}</table>`); await p.screenshot({ path: path.join(O, `sheet-${vn}-${th}.jpg`), type: 'jpeg', quality: 72, fullPage: true }); await p.close(); }
  await browser.close(); process.exit(0);
}
const [WEB = 'web', OUT = 'out/chars-lively'] = argv.filter(a => !a.startsWith('--')); fs.mkdirSync(OUT, { recursive: true });
const route = ctx => ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(WEB, p); if (!fs.existsSync(f)) return r.fulfill({ status: 404 }); const b = fs.readFileSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream', range = r.request().headers().range;
  if (range) { const [, a, e] = /bytes=(\d+)-(\d*)/.exec(range), s = +a, t = e ? +e : b.length - 1; return r.fulfill({ status: 206, headers: { 'content-type': mime, 'content-range': `bytes ${s}-${t}/${b.length}`, 'accept-ranges': 'bytes' }, body: b.subarray(s, t + 1) }); }
  r.fulfill({ contentType: mime, headers: { 'accept-ranges': 'bytes' }, body: b }); });
const seed = page => page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.speak', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings(); });
const log = [], errs = [];
for (const [vn, vp] of VIEWS) for (const th of THEMES) {
  const { width, height, ...o } = vp, ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1.5, colorScheme: th, serviceWorkers: 'block', ...o }); await route(ctx);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`${vn}/${th}: ${e.message}`)); await FIX_CLOCK(page);
  const url = h => `https://lk.test/app/?sandbox=1&hl=vi#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2200); await seed(page).catch(e => errs.push('seed ' + e.message));
  for (const [k, c] of Object.entries(SURF)) { const tag = `${k}-${vn}-${th}`;
    try {
      if (c.page) { await page.goto('https://lk.test' + c.page + '?hl=vi', { waitUntil: 'load' }); await page.waitForTimeout(1800); }
      else { await page.goto(url(c.route), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), th); await FIX_CLOCK(page); await page.evaluate(SEED_STREAK).catch(() => {}); await page.evaluate(() => App.route()).catch(() => {}); await page.waitForTimeout(800); if (c.drive) { await page.evaluate(DRIVE, c.drive); await page.waitForTimeout(700); } }
      await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); }).catch(() => {});
      await page.screenshot({ path: path.join(OUT, `${tag}.jpg`), type: 'jpeg', quality: 78, scale: 'css', fullPage: k === 'landing' || k === 'home' || k === 'learn' });
      log.push(`| ${tag} | ok |`);
    } catch (e) { log.push(`| ${tag} | ${e.message.split('\n')[0].slice(0, 120)} |`); }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.md'), ['# chars-lively', '', '| màn | kết quả |', '|---|---|', ...log, '', ...new Set(errs)].join('\n') + '\n'); console.log(log.join('\n'));
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
