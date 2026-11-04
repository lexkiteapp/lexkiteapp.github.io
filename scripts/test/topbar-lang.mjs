// 🌐 Một nút đổi ngôn ngữ + thanh trên thẳng lề (docs/DESIGN-SYSTEM.md §5d): đo render thật 360–2560 px, vi/de/ar (RTL), sáng/tối, các hub.
// Đỏ khi: > 1 nút ngôn ngữ nhìn thấy trên 1 trang; Hôm nay / hub có thanh trên mà không có nút; nút không mở được bộ chọn; tràn ngang;
// mép viên ngoài cùng ≠ mép nội dung; cột nội dung lệch trong vùng giữa hai cột bên; tiêu đề dính/bị thanh trên che; các viên khác cao / khác nền-viền / khoảng cách không đều / vùng chạm < 44 px; lỗi JS.
// Phục vụ thẳng thư mục web/ qua page.route (?sandbox=1), 0 lượt chạm prod.
// Dùng: node scripts/test/topbar-lang.mjs <web> [out=out/topbar-lang] [--label sau] [--report-only]   (CI: .github/workflows/topbar-lang.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf(n); return i < 0 ? null : argv.splice(i, 2)[1]; };
const LABEL = flag('--label') || 'sau', REPORT = argv.includes('--report-only'), [ROOT = 'web', OUT = 'out/topbar-lang'] = argv.filter(a => a !== '--report-only');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const WIDTHS = [360, 390, 430, 768, 1280, 1440], LANGS = ['vi', 'de', 'ar'], HUBS = ['home', 'vocab', 'skills', 'tests', 'me'];
// Sáng chỉ ở 390/1280 (cùng bố cục, khác màu); tiếng Việt đủ mọi hub, de/ar chỉ Hôm nay + một hub có thanh trên
const CASES = [];
for (const w of WIDTHS) for (const lang of LANGS) CASES.push({ w, lang, th: 'dark', routes: lang === 'vi' ? HUBS : ['home', 'vocab'] });
for (const w of [390, 1280]) CASES.push({ w, lang: 'vi', th: 'light', routes: ['home', 'vocab'] });
// Mốc gọn thanh trên khi có cột phải (khách có nút Google)
for (const w of [1024, 1100, 1279, 1360]) for (const lang of ['vi', 'de']) CASES.push({ w, lang, th: 'dark', routes: ['home', 'vocab'] });
// Bố cục màn rộng: chủ chụp ~2000 px (lệch trái)
for (const w of [1680, 1920, 2560]) CASES.push({ w, lang: 'vi', th: 'dark', routes: HUBS });
for (const w of [1920]) { CASES.push({ w, lang: 'ar', th: 'dark', routes: ['home', 'vocab'] }); CASES.push({ w, lang: 'vi', th: 'light', routes: ['home'] }); }
for (const w of [390, 1280]) for (const th of ['dark', 'light']) CASES.push({ w, lang: 'vi', th, routes: ['home'], fresh: true });
const browser = await chromium.launch();
const rows = [], fails = [];
const measure = () => {
  const vis = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && r.bottom > 0; };
  const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const W = document.documentElement.clientWidth, rtl = getComputedStyle(document.documentElement).direction === 'rtl';
  const langs = [...document.querySelectorAll('#langBtn, [data-act="lang"], [data-lsw] > button')].filter(vis).filter(e => !e.closest('.v2s-me')); // hàng Ngôn ngữ trong Cài đặt của Tôi được giữ (§5d), không phải nút thanh trên
  const top = document.querySelector('.topbar'), hasTop = !!top && vis(top), view = document.getElementById('view');
  const m = { W, rtl, sw: document.documentElement.scrollWidth, hasTop, langs: langs.map(e => ({ id: e.id || e.getAttribute('data-act'), ...box(e), inTop: !!e.closest('.topbar') })), v2: (view.querySelector('[class*="v2s-"]') || {}).className || '' };
  if (hasTop) {
    const tb = box(top), kids = [...top.querySelectorAll('.top-stats > *')].filter(vis).map(e => { const t = e.matches('.lsw') ? e.querySelector('button') : e, c = getComputedStyle(t); return { k: t.id || t.className.split(' ')[0], tag: t.tagName, ...box(t), bg: c.backgroundColor, bd: c.borderTopColor + ' ' + c.borderTopWidth }; });
    // Cột nội dung: khung v2 = <main>; trang thường = #view. Cột hẹp 480 px (§5d) canh giữa, không kéo tới mép thanh trên.
    const col = view.querySelector('.v2 > main') || view, cb = box(col), cc = getComputedStyle(col), reg = box(document.querySelector('.main'));
    const wide = !m.v2 || /today-desk/.test(m.v2), edge = kids.length ? (rtl ? kids[kids.length - 1].l : kids[kids.length - 1].r) : null, inner = rtl ? cb.l + parseFloat(cc.paddingLeft) : cb.r - parseFloat(cc.paddingRight);
    const first = [...col.children].find(e => vis(e) && e.getBoundingClientRect().top >= -1 && !e.matches('script,style'));
    m.top = { ...tb, kids, wide, edge, inner, gapL: cb.l - reg.l, gapR: reg.r - cb.r, firstTop: first ? first.getBoundingClientRect().top - tb.b : null };
  } else {
    const hdr = view.querySelector('.v2 > main > header'), btn = langs[0];
    if (hdr && btn) { const items = [...hdr.querySelectorAll('a, button')].filter(vis).map(box); m.hdr = { side: rtl ? Math.min(...items.map(b => b.l)) : W - Math.max(...items.map(b => b.r)), h: box(btn).h }; } // viên ngoài cùng của đầu trang (có thể là ảnh đại diện, không phải nút ngôn ngữ)
  }
  return m;
};
const check = (c, r, m, errs) => {
  const tag = `${c.th}/${c.lang}/${c.w}/${r}${c.fresh ? '/mới' : ''}`, bad = s => fails.push(`${tag}: ${s}`);
  if (m.langs.length > 1) bad(`${m.langs.length} nút ngôn ngữ (${m.langs.map(x => x.id).join(', ')})`);
  if (!m.langs.length && (r === 'home' || m.hasTop)) bad('không có nút ngôn ngữ');
  if (m.sw > m.W) bad(`tràn ngang ${m.sw} > ${m.W}`);
  for (const x of m.langs) if (x.l < 0 || x.r > m.W) bad(`nút ngôn ngữ ra ngoài màn (${x.l.toFixed(1)}–${x.r.toFixed(1)})`);
  if (m.top) {
    const { kids, wide, edge, inner, gapL, gapR, firstTop } = m.top;
    if (wide && edge != null && Math.abs(edge - inner) > 1) bad(`mép viên x=${edge.toFixed(1)} ≠ mép nội dung x=${inner.toFixed(1)}`);
    if (m.W >= 1024 && Math.abs(gapL - gapR) > 1) bad(`cột nội dung lệch trong vùng của nó: trái ${gapL.toFixed(1)}, phải ${gapR.toFixed(1)}`);
    if (firstTop != null && firstTop < 12) bad(`nội dung đầu trang cách thanh trên ${firstTop.toFixed(1)} px (< 12: dính hoặc bị che)`);
    for (const k of kids) { if (k.l < m.top.l - .5 || k.r > m.top.r + .5) bad(`${k.k} tràn khỏi thanh trên (${k.l.toFixed(1)}–${k.r.toFixed(1)}, thanh ${m.top.l.toFixed(1)}–${m.top.r.toFixed(1)})`); if (k.h < 44 - .01) bad(`${k.k} cao ${k.h} < 44`); if (/^(A|BUTTON)$/.test(k.tag) && k.w < 44 - .01) bad(`${k.k} rộng ${k.w} < 44`); }
    const hs = kids.map(k => k.h), ct = kids.map(k => k.t + k.h / 2);
    if (Math.max(...hs) - Math.min(...hs) > .5) bad(`viên khác cao: ${kids.map(k => k.k + '=' + k.h).join(' ')}`);
    if (Math.max(...ct) - Math.min(...ct) > .5) bad('viên lệch tâm dọc');
    const ord = [...kids].sort((a, b) => a.l - b.l), gaps = ord.slice(1).map((k, i) => k.l - ord[i].r);
    if (gaps.length && Math.max(...gaps) - Math.min(...gaps) > 1) bad(`khoảng cách không đều: ${gaps.map(g => g.toFixed(1)).join(' ')}`);
    const pills = kids.filter(k => !/avatar/i.test(k.k)); if (new Set(pills.map(k => k.bg + '|' + k.bd)).size > 1) bad(`viên khác nền/viền: ${pills.map(k => k.k + ' ' + k.bg + ' ' + k.bd).join(' ; ')}`);
  }
  if (m.hdr && Math.abs(m.hdr.side - 16) > 1) bad(`viên ngoài cùng đầu trang cách mép ${m.hdr.side.toFixed(1)} ≠ lề 16 px (§5d)`);
  if (errs.length) bad(`lỗi JS: ${errs[0]}`);
};
const run = async c => {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: 800 }, colorScheme: c.th, serviceWorkers: 'block', isMobile: c.w < 768, hasTouch: c.w < 768, deviceScaleFactor: 1 });
  await ctx.addInitScript(([th, fresh]) => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th, ...(fresh ? {} : { exam: 'ielts', examTarget: '6.5' }) })); localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ } }, [c.th, !!c.fresh]);
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); return r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  for (const r of c.routes) {
    await page.goto(`https://lk.test/app/?sandbox=1&hl=${c.lang}#/${r}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('view') && document.getElementById('view').children.length > 0, null, { timeout: 15000 }).catch(() => errs.push('#view trống sau 15 s'));
    await page.waitForTimeout(1200);
    if (!c.fresh) { await page.evaluate(async () => { App.state.game = App.state.game || {}; App.state.game.xp = 225; await App.route(); }); await page.waitForTimeout(800); } // người học cũ như ảnh chủ: today / today-desk, không phải khung người mới
    if (r === 'home' && !c.fresh && c.w >= 1024 && !await page.locator('.v2s-today-desk').count()) errs.push('không vào khung today-desk');
    // số lớn nhất người học thật có thể có (chiều rộng xấu nhất), khớp ảnh chủ: chip chuỗi + XP
    await page.evaluate(() => { for (const [s, v] of [['#streakPill span', '365'], ['#xpPill span', '12,345']]) { const e = document.querySelector(s); if (e) e.textContent = v; } });
    const m = await page.evaluate(measure); check(c, r, m, errs); const tag = `${r}-${c.th}-${c.lang}-${c.w}${c.fresh ? '-new' : ''}`;
    rows.push({ th: c.th, lang: c.lang, w: c.w, r, fresh: !!c.fresh, n: m.langs.length, ids: m.langs.map(x => x.id).join('+'), side: m.top ? m.top.edge : m.hdr ? m.hdr.side : null, gutter: m.top ? (m.top.wide ? m.top.inner : null) : m.hdr ? 16 : null, gaps: m.top && m.W >= 1024 ? `${m.top.gapL.toFixed(0)}/${m.top.gapR.toFixed(0)}` : '', head: m.top ? m.top.firstTop : null, hs: m.top ? [...new Set(m.top.kids.map(k => +k.h.toFixed(1)))].join('/') : m.hdr ? +m.hdr.h.toFixed(1) : '', ws: m.top ? m.top.kids.map(k => Math.round(k.w)).join(' ') : '', over: m.sw - m.W });
    if (c.th === 'light' || c.lang === 'vi' && [390, 1280, 1920].includes(c.w) || c.lang === 'ar' && [390, 1280, 1920].includes(c.w)) if (r === 'home' || r === 'vocab') await page.screenshot({ path: `${OUT}/${LABEL}-${tag}.png` });
    if (r === 'home' && m.langs.length) { // nút thật sự mở bộ chọn ngôn ngữ
      const sel = m.langs[0].id === 'langBtn' ? '#langBtn' : '[data-act="lang"]'; await page.locator(sel).first().click().catch(e => errs.push('bấm nút: ' + e.message));
      const opened = await page.waitForFunction(() => { const v = e => e && !e.hidden && e.getBoundingClientRect().height > 0; return v(document.querySelector('#langMenu')) || v(document.querySelector('.ux1-lang')); }, null, { timeout: 5000 }).then(() => true, () => false);
      if (!opened) fails.push(`${c.th}/${c.lang}/${c.w}/home: nút ngôn ngữ không mở bộ chọn`);
    }
  }
  await ctx.close();
};
const queue = [...CASES]; await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) { const c = queue.shift(); await run(c).catch(e => fails.push(`${c.th}/${c.lang}/${c.w}: ${e.message.split('\n')[0]}`)); } }));
await browser.close();
const f = v => v == null ? '–' : typeof v === 'number' ? v.toFixed(1) : v;
rows.sort((a, b) => a.w - b.w || a.lang.localeCompare(b.lang) || a.r.localeCompare(b.r));
const md = [`### ${LABEL}: ${fails.length ? fails.length + ' lỗi' : 'đạt'} (${rows.length} lượt đo)`, '', '| px | ngôn ngữ | giao diện | trang | số nút | mép viên (x; đầu trang điện thoại: cách mép) | mép nội dung | hở trái/phải cột | tiêu đề cách thanh | cao | rộng các viên | tràn |', '|---|---|---|---|---|---|---|---|---|---|---|---|', ...rows.map(x => `| ${x.w} | ${x.lang} | ${x.th} | ${x.r}${x.fresh ? ' (mới)' : ''} | ${x.n} ${x.ids} | ${f(x.side)} | ${f(x.gutter)} | ${x.gaps} | ${f(x.head)} | ${x.hs} | ${x.ws} | ${x.over} |`), '', ...fails.map(x => '- ✗ ' + x)].join('\n');
fs.writeFileSync(`${OUT}/${LABEL}.md`, md + '\n'); fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify({ rows, fails }, null, 1));
console.log(md.split('\n').filter(l => !l.startsWith('|')).join('\n'));
if (fails.length && !REPORT) process.exit(1);
