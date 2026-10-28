// 🖼️ Ảnh trước/sau các luồng chính của app (docs/UX-BENCHMARK.md): Hôm nay, Học, Ôn tập, Chủ đề từ vựng, Thi thử, Tôi, Mục tiêu, Từ điển, Tự tin.
// Điện thoại + máy tính · sáng/tối · en/vi/ar (RTL). Phục vụ thẳng thư mục web/ (page.route), ?sandbox=1, thẻ mẫu ghi qua Core → 0 lượt chạm prod.
// Đo mỗi ảnh: tràn ngang, phần tử bị cắt mép phải/trái, vùng chạm < 44 px trong khung nhìn, lỗi JS. Ghép tờ ảnh (ImageMagick montage) nếu có.
// Dùng: node scripts/test/ux-shots.mjs <web-sau> [web-trước] [out=out/ux]   (CI: .github/workflows/ux-shots.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const [AFTER, BEFORE, OUT = 'out/ux'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
// UX1=1 (nhánh ux-shots-ux1*): bật cờ ux1 ở cả 2 bản (bản trước không có → giao diện cũ); 'sau|trước' = trang tương ứng ở bản cũ; đo fps khi đổi tab
const UX1 = process.env.UX1 === '1';
const ROUTES = UX1 ? ['home?pick=1|home', 'home', 'train|skills', 'tests', 'me', 'league'] : ['home', 'skills', 'practice', 'review', 'vocab', 'library', 'tests', 'mistakes', 'quick', 'me', 'goal', 'dict/sustainable', 'confidence', 'grammar', 'pron/th-sounds'];
const CONFIGS = UX1 ? [['mobile', 'light', 'en'], ['mobile', 'dark', 'en'], ['mobile', 'light', 'ar'], ['desktop', 'light', 'en'], ['desktop', 'dark', 'en']] : [['mobile', 'light', 'en'], ['mobile', 'dark', 'en'], ['mobile', 'light', 'ar'], ['desktop', 'light', 'en'], ['desktop', 'dark', 'vi']];
const browser = await chromium.launch();
const report = { errs: [], metrics: {} };
async function run(TAG, ROOT, vn, scheme, lang) {
  const vp = vn === 'mobile' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => report.errs.push(`${TAG}-${vn}-${lang}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const C = Core.Cards, now = Date.now();
    const mk = async (e, srs) => { const c = C.make(e); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 4, ...srs }; await C.update(c); };
    await mk({ word: 'accomplish', ipa: '/əˈkʌmplɪʃ/', pos: 'verb', vi: 'hoàn thành, đạt được', def: 'to succeed in doing something', ex: 'She accomplished her goal.' }, { D: 8 });
    await mk({ word: 'borrow', ipa: '/ˈbɒrəʊ/', pos: 'verb', vi: 'mượn', def: 'to take something that you will give back', ex: 'Can I borrow your pen?' }, { D: 6 });
    await mk({ word: 'sustainable', ipa: '/səˈsteɪnəbl/', pos: 'adjective', vi: 'bền vững', def: 'able to continue over a period of time', ex: 'We need sustainable energy.' }, { D: 3, reps: 4 });
    for (const [w, v] of [['river', 'dòng sông'], ['window', 'cửa sổ'], ['decline', 'suy giảm'], ['habit', 'thói quen']]) await mk({ word: w, pos: 'noun', vi: v, ex: '' }, { due: now + 9e9 });
    if (UX1) { localStorage.setItem('lk.ux1', '1'); App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '6.5'; await App.saveSettings(); }
  }).catch(e => report.errs.push(`${TAG}-${vn}-${lang}: seed ${e.message}`));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  for (const r0 of ROUTES) {
    const [ra, rb] = r0.split('|'), r = ra, go = TAG === 'before' && rb ? rb : ra;
    await page.goto(url(go), { waitUntil: 'load' }); await page.waitForTimeout(1800);
    const name = `${TAG}-${vn}-${scheme}-${lang}-${r.replace(/[/?=]/g, '_')}`;
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 70 });
    report.metrics[name] = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight, out = { overflowX: document.documentElement.scrollWidth - W, clipped: [], smallTaps: [] };
      const vis = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
      const lab = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')) + ' ' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18);
      for (const el of document.querySelectorAll('#view *, .bottom-nav *, .topbar *')) {
        const b = el.getBoundingClientRect(); if (!b.width || !b.height || !vis(el)) continue;
        if ((b.right > W + 1 || b.left < -1) && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*=scroll], [class*=rail], .chips, [style*=overflow]')) out.clipped.push(lab(el) + ` ${Math.round(b.left)}..${Math.round(b.right)}`);
        if (el.matches('a[href], button, [role=button], input:not([type=hidden]), select, summary') && b.top < H && b.bottom > 0 && (b.width < 44 || b.height < 44) && !el.closest('p, li > span')) out.smallTaps.push(lab(el) + ` ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      out.clipped = out.clipped.slice(0, 12); out.smallTapsN = out.smallTaps.length; out.smallTaps = out.smallTaps.slice(0, 12);
      out.rawSvg = /<svg|<use /.test(document.body.innerText); out.h1 = (document.querySelector('#view h1, #view h2') || {}).textContent?.trim().slice(0, 40) || '';
      out.font = getComputedStyle(document.querySelector('#view h1, #view h2') || document.body).fontSize;
      return out;
    }).catch(e => ({ err: e.message }));
  }
  if (UX1 && TAG === 'after') { // fps khi đổi tab (View Transitions + keyframes): đếm khung hình rAF trong 800 ms sau khi chạm tab Luyện
    await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(1500);
    report.metrics[`fps-${vn}-${scheme}-${lang}`] = await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 800) requestAnimationFrame(f); else res({ fps: Math.round(n / ((performance.now() - t0) / 1000)) }); }; const a = document.querySelector(innerWidth < 900 ? '#bnav a[data-tab="train"]' : '#nav a[data-route="train"]'); requestAnimationFrame(f); if (a) a.click(); })).catch(e => ({ err: e.message }));
  }
  await ctx.close();
}
for (const [TAG, ROOT] of [['before', BEFORE], ['after', AFTER]]) if (ROOT) for (const [vn, sc, lang] of CONFIGS) await run(TAG, ROOT, vn, sc, lang);
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
// Tờ ảnh: mỗi cấu hình 1 tờ (cột = luồng), trước & sau
try {
  for (const TAG of ['before', 'after']) for (const [vn, sc, lang] of CONFIGS) {
    const files = ROUTES.map(r => path.join(OUT, `${TAG}-${vn}-${sc}-${lang}-${r.split('|')[0].replace(/[/?=]/g, '_')}.jpg`)).filter(f => fs.existsSync(f)); if (!files.length) continue;
    execFileSync('montage', [...files, '-tile', vn === 'mobile' ? (UX1 ? files.length + 'x1' : '13x1') : (UX1 ? '3x2' : '5x3'), '-geometry', vn === 'mobile' ? '300x+6+6' : '640x+6+6', '-background', '#888', '-quality', '72', path.join(OUT, `sheet-${TAG}-${vn}-${sc}-${lang}.jpg`)]);
  }
} catch (e) { console.log('montage bỏ qua:', e.message); }
const sum = Object.entries(report.metrics).filter(([k]) => k.startsWith('after') || k.startsWith('fps')).map(([k, m]) => m.fps != null ? `${k}: ${m.fps} fps` : `${k}: tràn ${m.overflowX} · cắt ${m.clipped?.length} · chạm<44 ${m.smallTapsN}`);
console.log(sum.join('\n')); console.log('lỗi JS:', report.errs.length, JSON.stringify(report.errs.slice(0, 20)));
if (report.errs.some(e => e.startsWith('after'))) process.exit(1);
