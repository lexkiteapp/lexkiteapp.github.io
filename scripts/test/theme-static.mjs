// 🌗 Trang tĩnh ngoài app trên Chromium thật × 4 chế độ: tự động (máy sáng), tự động (máy tối), ép tối trên máy sáng, ép sáng trên máy tối.
// Kiểm: data-theme đúng lựa chọn đã lưu, nền đúng sáng/tối NGAY khi <body> xuất hiện (không nháy), bấm nút → vòng tự động/sáng/tối + lưu,
// tương phản chữ/nền WCAG AA (axe color-contrast) = 0 lỗi ở mọi chế độ. Kèm ảnh --shots <thư mục> (cho chủ duyệt).
// Dùng: node scripts/test/theme-static.mjs [thư mục=dist|web] [--shots dir] [--chrome]   (CI: theme-qa.yml; --chrome = Chrome cài sẵn trên máy)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url), AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const args = process.argv.slice(2), opt = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const ROOT = path.resolve(args.find((a, i) => !a.startsWith('--') && !/^--/.test(args[i - 1] || '')) || (fs.existsSync('dist') ? 'dist' : 'web'));
const SHOTS = opt('--shots');
const has = p => fs.existsSync(path.join(ROOT, p));
const first = (dir, re) => { try { const d = path.join(ROOT, dir); const e = fs.readdirSync(d).find(x => re.test(x) && fs.existsSync(path.join(d, x, 'index.html'))); return e ? `/${dir}/${e}/` : null; } catch { return null; } };
// Mẫu đại diện mỗi loại trang (đủ LTR/RTL, Latin/CJK/Cyrillic; mọi bố cục: landing, pháp lý, 404, blog, công cụ, SEO, từ điển, uy tín, video)
const PAGES = [['/', 'landing-vi'], ['/en/', 'landing-en'], ['/ar/', 'landing-ar'], ['/ru/', 'landing-ru'], ['/en/privacy.html', 'legal-en'], ['/es/terms.html', 'legal-es-draft'], ['/404.html', '404'], ['/bye.html', 'bye'],
  ['/en/blog/', 'blog-en'], [first('en/blog', /^[a-z0-9-]{8,}$/), 'blog-post-en'], ['/ja/blog/', 'blog-ja'], ['/tu-vung/', 'seo-vi'], ['/en/vocabulary/', 'seo-en'], [first('en/samples', /^[a-z0-9-]+$/), 'sample-en'],
  [first('es/words', /^[a-z]+$/), 'words-es'], [first('ar/conversations', /^[a-z0-9-]+$/), 'conv-ar'], ['/en/english-level-test/', 'tools-en'], ['/ar/english-level-test/', 'tools-ar'], ['/en/about/', 'authority-en'], [first('video', /^[a-z0-9-]+$/), 'video-en'], [first('ja/video', /^[a-z0-9-]+$/), 'video-ja']]
  .filter(([p]) => p && has(p.endsWith('/') ? p + 'index.html' : p));
const MODES = [['auto-light', 'light', null], ['auto-dark', 'dark', null], ['forced-dark', 'light', 'dark'], ['forced-light', 'dark', 'light']];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
// Phục vụ file qua page.route (không mở cổng mạng – chạy được cả trong sandbox); mọi host khác bị chặn (0 mạng ngoài: quảng cáo/phân tích/CDN)
const BASE = 'http://lexkite.test', fileOf = u => { let p = decodeURIComponent(new URL(u).pathname); if (p.endsWith('/')) p += 'index.html'; let f = path.join(ROOT, p); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; return f.startsWith(ROOT) && fs.existsSync(f) && !fs.statSync(f).isDirectory() ? f : null; };
const serve = ctx => ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith(BASE)) return r.abort(); const f = fileOf(u); return f ? r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
const browser = await chromium.launch(args.includes('--chrome') ? { channel: 'chrome' } : {});
const bad = [], lum = c => { const m = (c.match(/[\d.]+/g) || []).map(Number); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let checks = 0;
for (const [mode, scheme, stored] of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: 'reduce' });
  await serve(ctx);
  await ctx.addInitScript(([s]) => { try { if (s) localStorage.setItem('lk.theme', s); else localStorage.removeItem('lk.theme'); } catch (e) { /* */ }
    new MutationObserver((_, o) => { if (document.body) { window.__bg0 = getComputedStyle(document.body).backgroundColor; window.__th0 = document.documentElement.getAttribute('data-theme'); o.disconnect(); } }).observe(document, { childList: true, subtree: true }); }, [stored]);
  const darkWanted = (stored || scheme) === 'dark';
  for (const [p, name] of PAGES) {
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + p, { waitUntil: 'load' }).catch(e => errs.push(e.message));
    if (p === '/bye.html' || p.startsWith('/blog-lang')) await page.waitForTimeout(500); // thẻ hiện sau 0,4 s
    const st = await page.evaluate(() => ({ th: document.documentElement.getAttribute('data-theme'), th0: window.__th0, bg0: window.__bg0, bg: getComputedStyle(document.body).backgroundColor, btn: !!document.querySelector('[data-tsw]') }));
    const tag = `${name} [${mode}]`; checks++;
    if (st.th !== (stored || null) || st.th0 !== (stored || null)) bad.push(`${tag}: data-theme=${st.th} (lúc vẽ đầu ${st.th0}), muốn ${stored || 'không có'}`);
    if (st.bg0 && !/rgba\(0, 0, 0, 0\)/.test(st.bg0) && (lum(st.bg0) < .2) !== darkWanted) bad.push(`${tag}: nháy – nền lúc vẽ đầu ${st.bg0} không phải ${darkWanted ? 'tối' : 'sáng'}`);
    if (!/rgba\(0, 0, 0, 0\)/.test(st.bg) && (lum(st.bg) < .2) !== darkWanted) bad.push(`${tag}: nền ${st.bg} không phải ${darkWanted ? 'tối' : 'sáng'}`);
    if (errs.length) bad.push(`${tag}: lỗi JS ${errs[0]}`);
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async () => (await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] })).violations.flatMap(x => x.nodes.map(n => `${n.target.join(' ')} – ${(n.any[0] || {}).message || ''}`.slice(0, 200))));
    for (const x of v.slice(0, 5)) bad.push(`${tag}: tương phản ${x}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}-${mode}.png`), fullPage: false });
    if (st.btn && mode === 'auto-light' && name.startsWith('landing-en')) { // vòng bấm trên trang thật: tự động → sáng → tối → tự động, có lưu + nhãn đổi
      const seq = [];
      for (let i = 0; i < 3; i++) { await page.click('[data-tsw] >> visible=true'); seq.push(await page.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('lk.theme'), document.querySelector('[data-tsw]').getAttribute('aria-label')].join('|'))); }
      if (!/^light\|light\|.+: Light theme$/.test(seq[0]) || !/^dark\|dark\|.+: Dark theme$/.test(seq[1]) || !/^\|\|.+: Theme: match system$/.test(seq[2])) bad.push(`landing-en: vòng nút sai ${seq.join(' → ')}`);
      await page.click('[data-tsw] >> visible=true'); await page.reload({ waitUntil: 'load' });
      if (await page.evaluate(() => document.documentElement.getAttribute('data-theme')) !== 'light') bad.push('landing-en: tải lại không giữ lựa chọn sáng');
      const box = await page.locator('[data-tsw] >> visible=true').boundingBox(); if (!box || box.width < 44 || box.height < 44) bad.push(`landing-en: nút giao diện ${box && Math.round(box.width)}×${box && Math.round(box.height)} < 44 px trên điện thoại`);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0) bad.push(`landing-en: tràn ngang ${ov}px @390`);
    }
    await page.close();
  }
  await ctx.close();
}
// Tràn ngang đầu trang ở 360 px (điện thoại nhỏ): logo + nút + giao diện + ngôn ngữ phải vừa
{ const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, colorScheme: 'light' }); await serve(ctx);
  for (const [p, name] of PAGES) { const page = await ctx.newPage(); await page.goto(BASE + p, { waitUntil: 'load' }).catch(() => {});
    const r = await page.evaluate(() => { const b = document.querySelector('[data-tsw]'); if (!b) return null; const q = b.getBoundingClientRect(); return { ov: document.documentElement.scrollWidth - innerWidth, right: q.right, vis: q.width > 0 && q.right <= innerWidth + .5 && q.left >= -.5 }; });
    if (r && (r.ov > 0 || !r.vis)) bad.push(`${name} @360: ${r.ov > 0 ? `tràn ngang ${r.ov}px` : 'nút giao diện ra ngoài màn hình'}`); await page.close(); }
  await ctx.close(); }
await browser.close();
if (bad.length) { console.log(`✗ theme-static: ${bad.length} lỗi (${PAGES.length} trang × ${MODES.length} chế độ)\n  - ` + bad.slice(0, 60).join('\n  - ')); process.exit(1); }
console.log(`✓ theme-static: ${PAGES.length} trang × ${MODES.length} chế độ (${checks} lượt) – đúng data-theme, không nháy, tương phản AA 0 lỗi, nút vòng/lưu/44 px, không tràn @360${SHOTS ? ` · ảnh: ${SHOTS}/` : ''}`);
