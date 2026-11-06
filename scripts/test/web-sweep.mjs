// Cổng "lỗi ẩn" cho MỌI loại trang công khai (không phải app /app/, admin có admin-guard riêng) – docs/WEB-PAGES.md §Cổng.
// Tự gom loại trang từ dist/ (đường dẫn → khuôn: /<lang>/ → /L/, đoạn cuối → *), lấy 1 trang mẫu mỗi loại (+ vi, ar nếu có),
// rồi đo ở 390 × 844 và 1280 × 800, sáng + tối:
//  err (lỗi console/pageerror) · http (tài nguyên cùng gốc ≥ 400, trừ /api/) · hscroll · clip/overlap/spill/stack/cell/orphan (scripts/lib/layout-scan.mjs, tự kiểm layout-scan-selftest.mjs)
//  tap (< 44 px, link trong câu được miễn – WCAG 2.5.8) · contrast + axe (axe-core AA) · cls (> 0.1) · lcp (> 2500 ms)
//  theme (tối mà nền sáng / sáng mà nền tối) · meta (title, description, viewport, canonical, og:title/description/image trên trang index được)
//  lang (html lang khớp thư mục ngôn ngữ, ar có dir=rtl). Lỗi tải tài nguyên chỉ tính ở http (máy chủ tĩnh CI không có /api/).
//  Lỗi CORS của máy chủ ngoài đang trả 429/5xx (vd. media.lexkite.com hết hạn mức Workers – Cloudflare 1027) → báo riêng
//  "⚠ máy chủ ngoài không phục vụ", không tính err (giống net::ERR); 404/thiếu CORS thật vẫn là err (scripts/lib/qa-classify.mjs).
// Ngưỡng = scripts/test/web-sweep.known.json: số lỗi mỗi loại×kiểm chỉ được GIẢM (cái mới = 0). Hết lỗi → hạ số trong file (không bao giờ nâng).
// Dùng: node scripts/test/web-sweep.mjs <base-url> <dist> <out> [--write-known]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { noProd, warm } from './lib/no-prod.mjs';
import { scan } from '../lib/layout-scan.mjs';
import { selftest } from '../lib/layout-scan-selftest.mjs';
import { extUnavailable, splitConsoleErrors, corsBlockedUrl } from '../lib/qa-classify.mjs';
const require = createRequire(import.meta.url);
const [BASE = 'http://localhost:8080', DIST = 'dist', OUT = 'web-sweep-out'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const WRITE = process.argv.includes('--write-known');
const KNOWN_F = new URL('./web-sweep.known.json', import.meta.url);
const LANGS = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'vi', 'zh'];
const SKIP = /^(app|admin|design|templates|js|css|img|fonts|icons|audio|data|i18n|packs|sfx|teach|screenshots)\//;
const WEB_SEL = '.card, .btn, button, a.chip, .chip, input, select, textarea, h1, h2, h3, nav a, header a, footer a';
fs.mkdirSync(OUT, { recursive: true });

// 1) loại trang từ dist
const files = [];
(function walk(d, rel = '') { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = rel + e.name; if (e.isDirectory()) { if (!SKIP.test(r + '/')) walk(path.join(d, e.name), r + '/'); } else if (e.name.endsWith('.html')) files.push(r); } })(DIST);
const typeOf = f => {
  const p = f.replace(/^assets\//, '').split('/'); let lang = '';
  if (LANGS.includes(p[0]) && p.length > 1) { lang = p[0]; p[0] = 'L'; }
  if (p.length >= 3 || (p.length === 2 && p[0] !== 'L')) p[p.length - (p.at(-1) === 'index.html' ? 2 : 1)] = '*';
  return { type: '/' + p.join('/').replace(/index\.html$/, ''), lang };
};
const byType = new Map();
for (const f of files.sort()) { const { type, lang } = typeOf(f); if (!byType.has(type)) byType.set(type, { all: [], pick: {} }); const t = byType.get(type); t.all.push(f); for (const l of [lang || 'x', 'any']) if (!t.pick[l]) t.pick[l] = f; }

// 2) kiểm tĩnh (mọi file của loại)
const res = {}; const add = (type, k, n, ex) => { if (!n) return; const r = (res[type] ||= {}); r[k] = Math.max(r[k] || 0, n); if (ex) ((r._ex ||= {})[k] ||= []).length < 3 && r._ex[k].push(ex); };
for (const [type, t] of byType) {
  let meta = 0, lang = 0, ex = '', exl = '';
  for (const f of t.all) {
    const h = fs.readFileSync(path.join(DIST, f), 'utf8').slice(0, 60000), head = h.split(/<\/head>/i)[0];
    if (/http-equiv=["']?refresh/i.test(head)) continue; // trang chuyển hướng
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(head);
    const need = ['<title>', 'name="description"', 'name="viewport"', ...(noindex ? [] : ['rel="canonical"', 'property="og:title"', 'property="og:description"', 'property="og:image"'])];
    const miss = need.filter(s => !head.replace(/'/g, '"').includes(s));
    if (miss.length) { meta++; ex ||= `${f}: thiếu ${miss.join(', ')}`; }
    const { lang: dl } = typeOf(f), hl = (h.match(/<html[^>]*\blang=["']?([\w-]+)/i) || [])[1] || '';
    // trang không thư mục ngôn ngữ: chỉ cần có lang (gốc có trang vi lẫn en)
    if ((dl ? hl.split('-')[0].toLowerCase() !== dl : !hl) || (dl === 'ar' && !/<html[^>]*dir=["']?rtl/i.test(h))) { lang++; exl ||= `${f}: lang="${hl}"${dl === 'ar' ? ' (cần dir=rtl)' : ''}`; }
  }
  add(type, 'meta', meta, ex); add(type, 'lang', lang, exl);
}

// 3) trình duyệt
const { chromium } = require('playwright'); const AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const VPS = { m: { width: 390, height: 844, isMobile: true, hasTouch: true }, d: { width: 1280, height: 800 } };
function probe(sel) {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && +cs.opacity > 0 ? r : null; };
  const small = [];
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,summary,[role=button],[role=tab]')) {
    const r = vis(e); if (!r) continue;
    if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,td,li:not(nav li),figcaption,blockquote,dd')) continue;
    if (r.height < 44 || r.width < 44) small.push(`${e.tagName.toLowerCase()}.${(typeof e.className === 'string' && e.className.split(' ')[0]) || ''} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20)}"`);
  }
  const bg = (() => { for (let e = document.body; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (c && (c[3] === undefined || +c[3] > .5)) { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; } } return 1; })();
  return { small, hscroll: document.documentElement.scrollWidth > innerWidth + 1, bg, lcp: Math.round(window.__lcp || 0), cls: +(window.__cls || 0).toFixed(3) };
}
const browser = await chromium.launch();
// máy dò phải bắt ca lỗi mẫu (bảng #users owner 5/11) và im ở ca đúng – hỏng thì đỏ ngay, không quét trang thật bằng máy dò mù
{ const st = await selftest(browser); if (!st.ok) { console.log('✗ layout-scan tự kiểm hỏng:\n  ' + st.fail.join('\n  ')); await browser.close(); process.exit(1); } console.log('✓ layout-scan tự kiểm: stack/cell/orphan bắt ca lỗi, im ở ca đúng'); }
const jobs = [];
for (const [type, t] of byType) for (const f of new Set([t.pick.en || t.pick.x || t.pick.any, t.pick.vi, t.pick.ar].filter(Boolean))) for (const vp of Object.keys(VPS)) for (const scheme of ['light', 'dark']) jobs.push({ type, f, vp, scheme });
const extSt = new Map();   // url → trạng thái HTTP (HEAD, mỗi URL hỏi 1 lần)
const extStatus = u => { if (!extSt.has(u)) extSt.set(u, fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(10000) }).then(r => r.status, () => 0)); return extSt.get(u); };
const report = [], extDown = new Map();   // host ngoài trả 429/5xx → lỗi CORS kèm theo không tính err, nhưng in cảnh báo rõ ở cuối
async function run(j) {
  const ctx = await browser.newContext({ viewport: { width: VPS[j.vp].width, height: VPS[j.vp].height }, isMobile: !!VPS[j.vp].isMobile, hasTouch: !!VPS[j.vp].hasTouch, colorScheme: j.scheme });
  await noProd(ctx); // CI: media/audio → GitHub, /api → offline (0 lượt prod)
  const page = await ctx.newPage(); const cons = [], pgErrs = [], http = [];
  page.on('console', m => m.type() === 'error' && !/favicon|ERR_CONNECTION|net::ERR|\/api\/|Failed to load resource/.test(m.text()) && cons.push(m.text()));
  page.on('pageerror', e => pgErrs.push(String(e).slice(0, 120)));
  page.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(BASE) && !u.includes('/api/')) http.push(`${r.status()} ${u.slice(BASE.length, BASE.length + 80)}`); });
  await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {} });
  const url = BASE + '/' + j.f.replace(/index\.html$/, '');
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); } catch (e) { pgErrs.push('load: ' + String(e).slice(0, 80)); }
  await page.waitForTimeout(1200);
  const p = await page.evaluate(probe).catch(() => ({ small: [], hscroll: false, bg: 1, lcp: 0, cls: 0 }));
  const lay = await page.evaluate(scan, { root: 'body', sel: WEB_SEL }).catch(() => ({ overlap: [], clip: [], spill: [], stack: [], cell: [], orphan: [] }));
  await page.addScriptTag({ content: AXE }).catch(() => {});
  const ax = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes[0]?.target?.join(' ') }))).catch(() => []);
  const c = ax.find(v => v.id === 'color-contrast'), other = ax.filter(v => v.id !== 'color-contrast');
  const k = `${j.vp}-${j.scheme}`, T = j.type;
  // lỗi CORS của URL ngoài: hỏi lại trạng thái từ Node (không bị CORS – request bị chặn CORS không chắc có sự kiện 'response' kèm mã)
  const down = new Map(); for (const m of cons) { const u = corsBlockedUrl(m); if (u && !u.startsWith(BASE)) { const st = await extStatus(u); if (extUnavailable(st)) down.set(u, st); } }
  const sp = splitConsoleErrors(cons, down), errs = [...sp.errs.map(x => x.slice(0, 120)), ...pgErrs];
  for (const x of sp.ext) { const u = corsBlockedUrl(x), h = new URL(u).host; extDown.set(h, [...(extDown.get(h) || []), `${down.get(u)} ${T} ${k}`]); }
  add(T, 'err', errs.length, `${k} ${errs[0]}`); add(T, 'http', http.length, `${k} ${http[0]}`);
  add(T, 'hscroll', +p.hscroll, `${k} ${j.f}`); add(T, 'tap', p.small.length, `${k} ${p.small[0]}`);
  for (const x of ['clip', 'overlap', 'spill', 'stack', 'cell', 'orphan']) add(T, x, lay[x]?.length || 0, `${k} ${lay[x]?.[0]}`);
  add(T, 'contrast', c?.n || 0, `${k} ${c?.t}`); add(T, 'axe', other.reduce((a, v) => a + v.n, 0), `${k} ${other.map(v => v.id + '×' + v.n).join(' ')}`);
  add(T, 'cls', +(p.cls > 0.1), `${k} CLS ${p.cls}`); add(T, 'lcp', +(p.lcp > 2500), `${k} LCP ${p.lcp}`);
  add(T, 'theme', +(j.scheme === 'dark' ? p.bg > 0.4 : p.bg < 0.2), `${k} nền L=${p.bg.toFixed(2)}`);
  if (j.vp === 'm' || j.scheme === 'light') await page.screenshot({ path: path.join(OUT, `${T.replace(/[^\w]+/g, '_')}-${j.f.split('/')[0]}-${k}.jpg`), quality: 60, type: 'jpeg' }).catch(() => {});
  report.push({ ...j, errs: errs.length, http: http.length, tap: p.small.length, contrast: c?.n || 0, cls: p.cls, lcp: p.lcp });
  await ctx.close();
}
// Làm nóng ảnh CDN là phần tử LCP (poster video, og:image trên CDN) TRƯỚC khi đo: đồng hồ LCP chỉ đo trang, không đo độ trễ đuôi của GitHub Release (sweep đỏ /L/video/*/ LCP 8-10 s dù ngưỡng 2500 giữ nguyên).
{ const urls = new Set(); for (const j of jobs) { const h = fs.readFileSync(path.join(DIST, j.f), 'utf8').slice(0, 60000); for (const m of h.matchAll(/(?:poster="|property="og:image" content=")(https:\/\/media\.lexkite\.com\/[^"]+)/g)) urls.add(m[1].replace(/&amp;/g, '&')); }
  const wctx = await noProd(await browser.newContext()); console.log(`warm CDN: ${await warm(wctx, [...urls])} ảnh`); await wctx.close(); }
const q = [...jobs]; await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await run(q.shift()); }));
await browser.close();

// 4) so với ngưỡng
const known = fs.existsSync(KNOWN_F) ? JSON.parse(fs.readFileSync(KNOWN_F, 'utf8')) : {};
const now = Object.fromEntries(Object.entries(res).sort().map(([t, r]) => [t, Object.fromEntries(Object.entries(r).filter(([k]) => k !== '_ex').sort())]));
const worse = [], better = [];
for (const [t, r] of Object.entries(now)) for (const [k, n] of Object.entries(r)) { const was = known[t]?.[k] || 0; if (n > was) worse.push(`${t} ${k}: ${n} > ${was} – ${(res[t]._ex?.[k] || []).join(' | ')}`); }
for (const [t, r] of Object.entries(known)) for (const [k, n] of Object.entries(r)) if ((now[t]?.[k] || 0) < n) better.push(`${t} ${k}: ${n} → ${now[t]?.[k] || 0}`);
fs.writeFileSync(path.join(OUT, 'now.json'), JSON.stringify(now, null, 1));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ types: [...byType.keys()], res, report }, null, 1));
const md = ['| loại trang | số trang | ' + ['err', 'http', 'hscroll', 'clip', 'overlap', 'spill', 'stack', 'cell', 'orphan', 'tap', 'contrast', 'axe', 'cls', 'lcp', 'theme', 'meta', 'lang'].join(' | ') + ' |', '|---|---|' + '---|'.repeat(17),
  ...[...byType].map(([t, x]) => `| ${t} | ${x.all.length} | ` + ['err', 'http', 'hscroll', 'clip', 'overlap', 'spill', 'stack', 'cell', 'orphan', 'tap', 'contrast', 'axe', 'cls', 'lcp', 'theme', 'meta', 'lang'].map(k => now[t]?.[k] || 0).join(' | ') + ' |')];
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## web-sweep\n' + md.join('\n') + '\n');
console.log(`web-sweep: ${byType.size} loại trang, ${files.length} file, ${jobs.length} lần đo`);
for (const [h, xs] of extDown) console.log(`::warning::⚠ máy chủ ngoài không phục vụ (${h}): ${xs.length} lỗi CORS do phản hồi ${[...new Set(xs.map(x => x.split(' ')[0]))].join('/')} không tính err – kiểm hạn mức Workers (docs/FREE-TIER.md). Vd: ${xs.slice(0, 3).join(' · ')}`);
if (better.length) console.log('↓ tốt hơn ngưỡng – hạ số trong web-sweep.known.json:\n  ' + better.join('\n  '));
if (WRITE) { fs.writeFileSync(KNOWN_F, JSON.stringify(now, null, 1) + '\n'); console.log('✓ đã ghi web-sweep.known.json'); process.exit(0); }
if (worse.length) { console.log(`✗ web-sweep: ${worse.length} lỗi mới/tăng\n  ` + worse.join('\n  ')); process.exit(1); }
console.log('✓ web-sweep: không có lỗi mới');
