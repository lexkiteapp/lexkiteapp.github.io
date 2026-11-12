// 🌗 Trang tĩnh ngoài app trên Chromium thật × 4 chế độ: tự động (máy sáng), tự động (máy tối), ép tối trên máy sáng, ép sáng trên máy tối.
// Kiểm: data-theme đúng lựa chọn đã lưu, nền đúng sáng/tối NGAY khi <body> xuất hiện (không nháy), bấm nút → vòng tự động/sáng/tối + lưu,
// tương phản chữ/nền WCAG AA (axe color-contrast) = 0 lỗi ở mọi chế độ. Kèm ảnh --shots <thư mục> (cho chủ duyệt).
// Dùng: node scripts/test/theme-static.mjs [thư mục=dist|web] [--shots dir] [--chrome]   (CI: theme-qa.yml; --chrome = Chrome cài sẵn trên máy)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { THEME_COLOR } from '../lib/site-layout.mjs';
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
const serve = (ctx, base = BASE) => ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith(base)) return r.abort(); const f = fileOf(u); return f ? r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
const browser = await chromium.launch(args.includes('--chrome') ? { channel: 'chrome' } : {});
// Tràn ngang: số px + phần tử sâu nhất thò ra ngoài (để sửa đúng chỗ)
const OVER = () => { const W = document.documentElement.clientWidth, d = document.documentElement.scrollWidth - W; if (d <= 0) return ''; const o = [...document.body.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1 && ![...e.children].some(c => c.getBoundingClientRect().right > W + 1); }).slice(0, 3).map(e => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''}→${Math.round(e.getBoundingClientRect().right)}`); return `tràn ngang ${d}px (${o.join(', ')})`; };
const bad = [], lum = c => { const m = (c.match(/[\d.]+/g) || []).map(Number); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let checks = 0;
for (const [mode, scheme, stored] of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: 'reduce' });
  await serve(ctx);
  await ctx.addInitScript(([s]) => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); if (s) localStorage.setItem('lk.theme', s); else localStorage.removeItem('lk.theme'); } } catch (e) { /* */ } // chỉ gieo lần đầu mỗi tab → tải lại giữ lựa chọn người dùng
    new MutationObserver((_, o) => { if (document.body) { window.__bg0 = getComputedStyle(document.body).backgroundColor; window.__th0 = document.documentElement.getAttribute('data-theme'); o.disconnect(); } }).observe(document, { childList: true, subtree: true }); }, [stored]);
  const darkWanted = (stored || scheme) === 'dark';
  for (const [p, name] of PAGES) {
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + p, { waitUntil: 'load' }).catch(e => errs.push(e.message));
    if (p === '/bye.html' || p.startsWith('/blog-lang')) await page.waitForTimeout(500); // thẻ hiện sau 0,4 s
    const ov = await page.evaluate(OVER); if (ov) bad.push(`${name} [${mode}] @390: ${ov}`);
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
    if (st.btn && mode === 'auto-light' && name.startsWith('landing-en')) {
      await page.waitForFunction(() => window.LkUi, null, { timeout: 5000 }).catch(() => bad.push('landing-en: /js/site-ui.js không nạp sau load')); // vòng bấm trên trang thật: tự động → sáng → tối → tự động, có lưu + nhãn đổi
      const seq = [];
      for (let i = 0; i < 3; i++) { await page.click('[data-tsw] >> visible=true'); seq.push(await page.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('lk.theme'), document.querySelector('[data-tsw]').getAttribute('aria-label')].join('|'))); }
      if (!/^light\|light\|.+: Light theme$/.test(seq[0]) || !/^dark\|dark\|.+: Dark theme$/.test(seq[1]) || !/^\|\|.+: Theme: match system$/.test(seq[2])) bad.push(`landing-en: vòng nút sai ${seq.join(' → ')}`);
      await page.click('[data-tsw] >> visible=true'); await page.reload({ waitUntil: 'load' });
      if (await page.evaluate(() => document.documentElement.getAttribute('data-theme')) !== 'light') bad.push('landing-en: tải lại không giữ lựa chọn sáng');
      const box = await page.locator('[data-tsw] >> visible=true').first().boundingBox(); if (!box || box.width < 44 || box.height < 44) bad.push(`landing-en: nút giao diện ${box && Math.round(box.width)}×${box && Math.round(box.height)} < 44 px trên điện thoại`);
    }
    await page.close();
  }
  await ctx.close();
}
// Tràn ngang đầu trang ở 360 px (điện thoại nhỏ): logo + nút + giao diện + ngôn ngữ phải vừa
{ const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, colorScheme: 'light' }); await serve(ctx);
  for (const [p, name] of PAGES) { const page = await ctx.newPage(); await page.goto(BASE + p, { waitUntil: 'load' }).catch(() => {});
    const ov = await page.evaluate(OVER), vis = await page.evaluate(() => { const b = document.querySelector('[data-tsw]'); if (!b) return true; const q = b.getBoundingClientRect(); return q.width > 0 && q.right <= innerWidth + .5 && q.left >= -.5; });
    if (ov) bad.push(`${name} @360: ${ov}`); if (!vis) bad.push(`${name} @360: nút giao diện ra ngoài màn hình`); await page.close(); }
  await ctx.close(); }
// Đồng bộ app ↔ web (cùng origin lexkite.com): app lưu ielts.settings.theme + vb.uiLang → trang tĩnh tối + link về bản vi; bấm nút web → ielts.settings đổi theo
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' }); await serve(ctx);
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); localStorage.setItem('ielts.settings', JSON.stringify({ theme: 'dark', goal: 20 })); localStorage.setItem('ielts.settingsAt', String(Date.now())); localStorage.setItem('vb.uiLang', 'vi'); } } catch (e) { /* */ } });
  for (const [p, name] of PAGES.filter(([, n]) => /^(landing-en|legal-en|404|blog-en|blog-post-en|tools-en|seo-en)$/.test(n))) {
    const page = await ctx.newPage(); await page.goto(BASE + p, { waitUntil: 'load' }); await page.waitForFunction(() => window.LkUi, null, { timeout: 5000 }).catch(() => {});
    const r = await page.evaluate(() => ({ th: document.documentElement.getAttribute('data-theme'), logo: (document.querySelector('.flogo,header .logo,.logo') || {}).getAttribute?.('href'), app: [...document.querySelectorAll('a[href^="/app/"]')].map(a => a.getAttribute('href')).filter(h => /hl=/.test(h)), blog: [...document.querySelectorAll('a[href$="/blog/"]:not([hreflang])')].filter(a => !a.closest('[data-lsw],.flang')).map(a => a.getAttribute('href')).filter(h => h !== '/vi/blog/') }));
    if (r.th !== 'dark') bad.push(`sync ${name}: app đặt tối nhưng data-theme=${r.th}`);
    if (r.logo && r.logo !== '/vi/') bad.push(`sync ${name}: app chọn vi nhưng logo → ${r.logo}`);
    if (r.app.length) bad.push(`sync ${name}: link app còn ?hl= (${r.app[0]}) – sẽ ghi đè ngôn ngữ đã chọn`);
    if (r.blog.length) bad.push(`sync ${name}: link blog chưa về bản vi (${r.blog[0]})`);
    checks++; await page.close();
  }
  const page = await ctx.newPage(); await page.goto(BASE + '/en/', { waitUntil: 'load' }); await page.waitForFunction(() => window.LkUi, null, { timeout: 5000 }).catch(() => {});
  await page.click('[data-tsw] >> visible=true'); // tối → tự động
  const a = await page.evaluate(() => JSON.parse(localStorage.getItem('ielts.settings')));
  await page.click('[data-tsw] >> visible=true'); // → sáng
  const b = await page.evaluate(() => [JSON.parse(localStorage.getItem('ielts.settings')), document.documentElement.getAttribute('data-theme')]);
  if (a.theme !== 'auto' || b[0].theme !== 'light' || b[1] !== 'light' || b[0].goal !== 20) bad.push(`sync: bấm nút web không vá ielts.settings.theme (${a.theme} → ${b[0].theme}, giữ khoá khác: ${b[0].goal})`);
  await page.reload({ waitUntil: 'load' }); if (await page.evaluate(() => document.documentElement.getAttribute('data-theme')) !== 'light') bad.push('sync: tải lại sau khi chọn sáng trên web → không còn sáng');
  checks++; await ctx.close(); }
// Chân trang (tiêu đề nhóm trên máy tính là chữ, không bấm được → không đo): 390 px gập hết (accordion), ô chạm ≥ 48 px; 1280 px 3 nhóm mở + link pháp lý hàng đáy ≥ 44 px; menu ngôn ngữ bàn phím. Ảnh footer-{sáng,tối}-{1280,390}.png
for (const [W, H] of [[1280, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: scheme, reducedMotion: 'reduce' }); await serve(ctx);
  for (const [p, name] of PAGES.filter(([, n]) => /^(landing-en|legal-en|blog-en|404)$/.test(n))) {
    const page = await ctx.newPage(); await page.goto(BASE + p, { waitUntil: 'load' }); await page.waitForFunction(() => window.LkUi, null, { timeout: 5000 }).catch(() => {});
    if (name === 'landing-en') { // landing v3: chân trang Stitch (chrome.js) – viên giao diện themePill + menu ngôn ngữ thứ hai (nút "Interface", lsw), không có nhóm .fg/.flang
      const tag = `footer ${name} @${W} ${scheme}`; checks++;
      const lf = await page.evaluate(async () => { const F = document.querySelector('footer'), g = F && F.querySelector('.tsp'); if (!g) return { none: 1 };
        const small = [...F.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.width < 44 || r.height < 44) && !e.closest('[role=menu]'); }).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20));
        g.querySelector('[data-tsv=dark]').click(); await new Promise(r => setTimeout(r, 50));
        return { small, th: document.documentElement.getAttribute('data-theme'), pr: [...g.querySelectorAll('[data-tsv]')].map(b => b.getAttribute('aria-pressed')).join() }; });
      if (lf.none) bad.push(`${tag}: thiếu viên 3 nút giao diện ở chân trang`);
      else { if (lf.th !== 'dark' || lf.pr !== 'false,false,true') bad.push(`${tag}: viên giao diện bấm Tối → ${lf.th} / aria-pressed ${lf.pr}`); if (lf.small.length) bad.push(`${tag}: ô chạm nhỏ ${JSON.stringify(lf.small.slice(0, 3))}`); }
      const fb = 'footer [data-lsw] [aria-haspopup]'; await page.focus(fb); await page.keyboard.press('Enter');
      const o = await page.evaluate(q => { const b = document.querySelector(q), m = document.getElementById(b.getAttribute('aria-controls')); return !m.hidden && m.querySelectorAll('[role=menuitem]').length; }, fb); await page.keyboard.press('Escape');
      if (o !== 15 || await page.evaluate(q => !document.getElementById(document.querySelector(q).getAttribute('aria-controls')).hidden, fb)) bad.push(`${tag}: menu ngôn ngữ chân trang bàn phím (Enter mở 15 mục, Esc đóng) sai`);
      if (SHOTS) await page.locator('footer').screenshot({ path: path.join(SHOTS, `footer-${scheme}-${W}.png`) });
      await page.close(); continue; }
    const f = await page.evaluate(W => { const g = [...document.querySelectorAll('.site-foot .fg')], small = [...document.querySelectorAll(`${W < 720 ? '.site-foot summary' : '.flang summary'}, .site-foot .fbtn, .site-foot .tsb, .site-foot .fg[open] a, .site-foot .flegal a`)].filter(e => e.getBoundingClientRect().width).map(e => [e.className || e.tagName, Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < (W < 720 ? 48 : 44)); return { n: g.length, open: g.filter(x => x.open).length, small, ul: [...document.querySelectorAll('.site-foot .fg a')].some(a => getComputedStyle(a).textDecorationLine.includes('underline')) }; }, W);
    const tag = `footer ${name} @${W} ${scheme}`; checks++;
    if (f.n !== 3) bad.push(`${tag}: ${f.n} nhóm (cần 3)`);
    if (f.open !== (W < 720 ? 0 : 3)) bad.push(`${tag}: ${f.open} nhóm mở (cần ${W < 720 ? 0 : 3})`);
    if (f.small.length) bad.push(`${tag}: ô chạm nhỏ ${JSON.stringify(f.small.slice(0, 3))}`);
    if (f.ul) bad.push(`${tag}: link chân trang gạch chân khi chưa hover`);
    const tp = await page.evaluate(async () => { const g = document.querySelector('.site-foot .tsp'); if (!g) return { none: 1 }; const b = g.querySelector('[data-tsv=dark]'); b.click(); await new Promise(r => setTimeout(r, 50)); const r = { th: document.documentElement.getAttribute('data-theme'), pr: [...g.querySelectorAll('[data-tsv]')].map(x => x.getAttribute('aria-pressed')).join(',') }; g.querySelector('[data-tsv=auto]').click(); const fb = document.querySelector('.site-foot .fbtns'), last = fb && [...fb.children].filter(e => e.getBoundingClientRect().height).pop(); r.gap = fb && last ? Math.round(fb.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom) : 0; return r; });
    if (tp.none) bad.push(`${tag}: thiếu viên 3 nút giao diện ở chân trang`);
    else { if (tp.th !== 'dark' || tp.pr !== 'false,false,true') bad.push(`${tag}: viên giao diện bấm Tối → ${tp.th} / aria-pressed ${tp.pr}`); if (tp.gap > 2) bad.push(`${tag}: khoảng trống ${tp.gap} px dưới nút chân trang (nút ẩn còn giữ chỗ)`); }
    if (name === 'landing-en') {
      await page.focus('.flang summary'); await page.keyboard.press('Enter');
      const o = await page.evaluate(() => document.querySelector('.flang').open && [...document.querySelectorAll('.flangs a')].length); await page.keyboard.press('Escape');
      if (o !== 15 || await page.evaluate(() => document.querySelector('.flang').open)) bad.push(`${tag}: menu ngôn ngữ bàn phím (Enter mở 15 mục, Esc đóng) sai`);
      if (SHOTS) await page.locator('.site-foot').screenshot({ path: path.join(SHOTS, `footer-${scheme}-${W}.png`) });
    }
    await page.close();
  }
  await ctx.close(); }
// GIF app → blog (cho chủ duyệt, chỉ khi --shots): app đặt Tối + Tiếng Việt → bấm link Blog thật trong app → blog vẫn tối + bản vi; khung ảnh app-blog-NN.png (theme-qa.yml ghép GIF)
// Origin lexkite.com (không phải lexkite.test): app chỉ coi là cùng site khi hostname khớp /(^|\.)lexkite\.(com|pages\.dev)$/ (hubs.js sameSite) → link Blog là /vi/blog/ cùng origin; trên
// lexkite.test link Blog thành URL tuyệt đối https://lexkite.com/… bị serve() chặn → trang lỗi (pathname '/', lang rỗng) – lỗi của test, không phải của site. Mọi request vẫn do serve() trả từ dist (0 mạng ngoài), SW chặn.
if (SHOTS && has('app/index.html')) {
  const APPB = 'https://lexkite.com';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' }); await serve(ctx, APPB);
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); localStorage.setItem('ielts.settings', JSON.stringify({ theme: 'dark' })); localStorage.setItem('ielts.settingsAt', String(Date.now())); localStorage.setItem('vb.uiLang', 'vi'); } } catch (e) { /* */ } });
  const page = await ctx.newPage(); let n = 0; const shot = async () => page.screenshot({ path: path.join(SHOTS, `app-blog-${String(++n).padStart(2, '0')}.png`) });
  await page.goto(APPB + '/app/', { waitUntil: 'load' }); await page.waitForTimeout(2500); await shot();
  // link Blog app tự trỏ theo ngôn ngữ đã chọn (App.blogUrl → /vi/blog/); ưu tiên link đó, rồi mới tới link blog bất kỳ đang hiện
  const link = page.locator('a[href$="/vi/blog/"]:visible').or(page.locator('a[data-blog]:visible')).first(), href = await link.getAttribute('href').catch(() => null);
  if (href) { await link.hover().catch(() => {}); await shot(); await Promise.all([page.waitForURL(/\/blog\//, { timeout: 10000 }).catch(() => {}), link.click()]); await page.waitForLoadState('load'); }
  else { bad.push('gif app→blog: app không có link Blog hiện'); await page.goto(APPB + '/vi/blog/', { waitUntil: 'load' }); }
  await page.waitForFunction(() => window.LkUi, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); await shot();
  const r = { href, ...(await page.evaluate(() => ({ th: document.documentElement.getAttribute('data-theme'), lang: document.documentElement.lang, path: location.pathname }))) };
  if (r.th !== 'dark') bad.push(`gif app→blog: blog mở từ app nhưng data-theme=${r.th}`);
  if (!/^vi/.test(r.lang)) bad.push(`gif app→blog: app chọn Tiếng Việt nhưng blog mở bản ${r.lang} (${r.path})`);
  await page.evaluate(() => scrollTo(0, innerHeight * .9)); await page.waitForTimeout(200); await shot();
  await page.locator('.site-foot').scrollIntoViewIfNeeded().catch(() => {}); await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(200); await shot();
  fs.writeFileSync(path.join(SHOTS, 'app-blog.txt'), JSON.stringify(r) + '\n'); checks++; await ctx.close();
}
// HỒI QUY lỗi chủ báo 3/11 ("đổi sáng/tối trong app, trang ngoài app không theo"): dùng APP THẬT (/app/, bấm #themeBtn như người học),
// rồi mở landing + blog cùng origin → đúng giao diện NGAY khung vẽ đầu (không nháy) + thanh trình duyệt (theme-color) theo nền;
// đồng bộ trực tiếp 2 chiều giữa tab app ↔ tab landing (sự kiện storage); tải lại app sau khi đổi ở landing → app theo, không nháy.
if (has('app/index.html')) {
  const APPB = 'https://lexkite.com', TC = THEME_COLOR;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' }); await serve(ctx, APPB);
  await ctx.addInitScript(() => new MutationObserver((_, o) => { if (document.body) { window.__th0 = document.documentElement.getAttribute('data-theme'); window.__bg0 = getComputedStyle(document.body).backgroundColor; o.disconnect(); } }).observe(document, { childList: true, subtree: true }));
  const st = pg => pg.evaluate(() => ({ th: document.documentElement.getAttribute('data-theme'), th0: window.__th0, bg0: window.__bg0, tc: [...document.querySelectorAll('meta[name=theme-color]')].map(m => m.content) }));
  const app = await ctx.newPage(); const errs = []; app.on('pageerror', e => errs.push(e.message));
  await app.goto(APPB + '/app/', { waitUntil: 'load' }); await app.waitForSelector('#themeBtn', { state: 'attached', timeout: 20000 }).catch(() => bad.push('app→web: không thấy #themeBtn'));
  await app.waitForFunction(() => document.querySelector('#themeBtn') && document.querySelector('#themeBtn').onclick, null, { timeout: 15000 }).catch(() => {});
  const tap = () => app.evaluate(() => document.querySelector('#themeBtn').click()); // 390 px: nút nằm ở thanh ẩn → gọi đúng onclick của nút app
  await tap(); await tap(); // tự động → sáng → tối (đúng thứ tự nút app)
  const a = await st(app); if (a.th !== 'dark' || a.tc.some(c => c.toUpperCase() !== TC.dark)) bad.push(`app→web: app sau 2 lần bấm data-theme=${a.th}, theme-color=${a.tc}`);
  for (const p of ['/en/', '/', '/en/blog/'].filter(p => has(p + 'index.html'))) {
    const pg = await ctx.newPage(); await pg.goto(APPB + p, { waitUntil: 'load' }); const r = await st(pg); checks++;
    if (r.th0 !== 'dark' || r.th !== 'dark') bad.push(`app→web ${p}: app chọn Tối nhưng trang vẽ đầu data-theme=${r.th0}, sau tải=${r.th}`);
    if (r.bg0 && lum(r.bg0) >= .2) bad.push(`app→web ${p}: nháy – nền lúc vẽ đầu ${r.bg0} không tối`);
    await pg.waitForFunction(() => window.LkUi, null, { timeout: 8000 }).catch(() => {});
    if ((await st(pg)).tc.some(c => c.toUpperCase() !== TC.dark)) bad.push(`app→web ${p}: theme-color không theo Tối (${(await st(pg)).tc})`);
    await pg.close();
  }
  const land = await ctx.newPage(); await land.goto(APPB + '/en/', { waitUntil: 'load' }); await land.waitForFunction(() => window.LkUi, null, { timeout: 8000 }).catch(() => {});
  await app.bringToFront(); await tap(); await land.waitForTimeout(300); // tối → tự động (máy sáng)
  if ((await st(land)).th !== null) bad.push(`app→web trực tiếp: app về Tự động nhưng tab landing data-theme=${(await st(land)).th}`);
  await land.bringToFront(); await land.click('.site-foot [data-tsv=dark]').catch(() => land.click('[data-tsw] >> visible=true')); await app.waitForTimeout(300);
  const want = (await st(land)).th; if (!want || (await st(app)).th !== want) bad.push(`web→app trực tiếp: chọn ${want} ở landing nhưng tab app data-theme=${(await st(app)).th}`);
  await app.reload({ waitUntil: 'load' }); const b = await st(app);
  if (b.th0 !== want || b.th !== want) bad.push(`web→app tải lại: chọn ${want} ở landing nhưng app vẽ đầu ${b.th0}, sau tải ${b.th}`);
  await app.waitForTimeout(800); if ((await st(app)).th !== want) bad.push(`web→app tải lại: app khởi động xong đổi lại thành ${(await st(app)).th} (ghi đè lựa chọn mới)`);
  if (errs.length) bad.push(`app→web: lỗi JS app ${errs[0]}`);
  checks += 3; await ctx.close();
}
// Chân trang: tên ngôn ngữ không đè nhau, menu không tràn màn, chân trang máy tính gọn (chủ 04/11)
for (const W of [375, 800, 1000, 1440]) { const ctx = await browser.newContext({ viewport: { width: W, height: 800 }, colorScheme: 'dark' }); await serve(ctx);
  const page = await ctx.newPage(); await page.goto(BASE + '/vi/blog/', { waitUntil: 'load' }).catch(() => {});
  const r = await page.evaluate(() => { const d = document.querySelector('.flang'); if (!d) return null; d.open = true; const n = d.querySelector('.flangs'), b = n.getBoundingClientRect(), as = [...n.querySelectorAll('a')], R = a => { const x = document.createRange(); x.selectNodeContents(a); return x.getBoundingClientRect(); }; let ov = 0; as.forEach((a, i) => as.slice(i + 1).forEach(c => { const q = R(a), w = R(c); if (q.left < w.right - 1 && w.left < q.right - 1 && q.top < w.bottom - 1 && w.top < q.bottom - 1) ov++; })); d.open = false; return { ov, l: b.left, r: b.right, foot: document.querySelector('footer.site-foot').getBoundingClientRect().height }; });
  if (!r) bad.push(`chân trang ${W}px: thiếu menu ngôn ngữ`); else { if (r.ov) bad.push(`chân trang ${W}px: ${r.ov} cặp tên ngôn ngữ đè nhau`); if (r.l < 0 || r.r > W) bad.push(`chân trang ${W}px: menu ngôn ngữ tràn màn (${Math.round(r.l)}–${Math.round(r.r)})`); if (W === 1440 && r.foot > 420) bad.push(`chân trang 1440px cao ${Math.round(r.foot)}px (> 420)`); }
  checks += 3; await ctx.close(); }
await browser.close();
if (bad.length) { console.log(`✗ theme-static: ${bad.length} lỗi (${PAGES.length} trang × ${MODES.length} chế độ)\n  - ` + bad.slice(0, 60).join('\n  - ')); process.exit(1); }
console.log(`✓ theme-static: ${PAGES.length} trang × ${MODES.length} chế độ (${checks} lượt) – đúng data-theme, không nháy, tương phản AA 0 lỗi, nút vòng/lưu/44 px, không tràn @360${SHOTS ? ` · ảnh: ${SHOTS}/` : ''}`);
