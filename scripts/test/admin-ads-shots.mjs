// Ảnh + soát hình tự động Quản trị › Quảng cáo › Tổng quan trên DỮ LIỆU MẪU (fixture giả, không số thật): Playwright Chromium trên CI (.github/workflows/dist-ui.yml).
// 2 trạng thái (có số / chưa nối Google) × sáng/tối × 1280 / 360 px → <out>/ads-<state>-<theme>-<vp>.png + report.json.
// Chặn (exit 1): lỗi JS, tràn ngang, nút/ô bấm đè nhau, chữ bị cắt (scrollWidth > clientWidth khi overflow ẩn), số vô nghĩa (NaN/undefined/Infinity, KPI $0.00 khi có số), axe serious/critical.
// Chạy: node scripts/test/admin-ads-shots.mjs [out=out/admin-ads]   (cần `npm i playwright` + `npx playwright install chromium`)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildRows, readFixture, unitMap } from '../ads/report.mjs';
import { stats, guardOf, revPack } from '../../functions/api/_ads.js';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-ads-shots: playwright not installed – skipped'); process.exit(0); }
const OUT = process.argv[2] || 'out/admin-ads'; fs.mkdirSync(OUT, { recursive: true });
const browser = await pw.chromium.launch().catch(e => { console.log('admin-ads-shots: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
// Dữ liệu mẫu: fixture 20→26/10 + tuần trước (×0,9) để có ▲▼; ngày báo cáo hôm nay = 27/10
const today = '2026-10-27', { rows } = buildRows(readFixture('scripts/test/fixtures/ads-report'), unitMap());
const shift = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const rev = [...rows, ...rows.map(r => ({ ...r, day: shift(r.day, -7), earn: Math.round(r.earn * 0.9), imp: Math.round(r.imp * 0.95) }))];
const ev = []; for (let i = 1; i <= 30; i++) { const d = shift(today, -i); ev.push({ day: d, kind: 'ad:imp:web:home', n: 900 }, { day: d, kind: 'ad:req:web:home', n: 1000 }, { day: d, kind: 'ad:show:android:inter', n: 120 }, { day: d, kind: 'adc:a:ses', n: 300 }, { day: d, kind: 'adc:a:n1', n: 40 }, { day: d, kind: 'adc:h:n1', n: 40 }, { day: d, kind: 'adc:a:r1', n: 14 }, { day: d, kind: 'adc:h:r1', n: 15 }); }
ev.push({ day: today, kind: 'ad:imp:web:home', n: 312 }, { day: today, kind: 'ad:click:web:home', n: 4 }, { day: today, kind: 'ad:rewok:android:rew', n: 9 });
const ecpm = { web: 2, android: 6, ios: 6 }, base = { at: Date.now(), today, ...stats(ev, today, ecpm), guard: guardOf(ev, today, { prev: 1 }), ecpm };
const STATES = {
  data: { ...base, real: revPack(rev, { at: Date.parse('2026-10-27T13:41:00Z'), srcs: ['adsense', 'admob'] }, { balance: '$42.17', last: { amount: '$118.40', date: '2026-09-21' } }, ev, ecpm, today, today), reporting: { connected: true } },
  empty: { ...base, real: revPack([], null, null, [], ecpm, today, today), reporting: { connected: false } },
};
const page0 = `<!doctype html><html lang="vi" style="--a-top:0px"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/admin.css"></head>
<body class="adm"><main class="adm-main" id="main" style="padding:16px"></main><script src="/js/admin-ads.js"></script></body></html>`;
const report = [], fails = [];
for (const [state, S] of Object.entries(STATES)) for (const theme of ['light', 'dark']) for (const [vp, size] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 360, height: 780 }]]) {
  const ctx = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.route('https://lexkite.test/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/admin.html') return r.fulfill({ contentType: 'text/html', body: page0 }); const f = path.join('web', u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await page.goto('https://lexkite.test/admin.html#ads/overview');
  await page.evaluate(([S, theme]) => { document.documentElement.dataset.theme = theme; const esc = x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    window.AdminAds.render(document.getElementById('main'), async op => (op === 'adsStats' ? S : op === 'config' ? { keys: [], values: { ads_web: { v: '1' } } } : { ok: true }), (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s), { esc, lang: () => 'vi', toast() {}, confirm: async () => true }); }, [S, theme]);
  await page.waitForSelector(state === 'data' ? '.ax-kpis' : '[data-howto]'); await page.waitForTimeout(200);
  if (state === 'data' && vp === 'desktop') { const b = await page.$('.ax-lc'); const bb = await b.boundingBox(); await page.mouse.move(bb.x + bb.width * 0.6, bb.y + 40); await page.waitForTimeout(80); }
  const v = await page.evaluate(st => {
    const out = { overflow: document.scrollingElement.scrollWidth - window.innerWidth, overlap: [], clipped: [], junk: [] };
    const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]') && !el.closest('details:not([open]) > :not(summary)'); };
    // vùng nhìn thấy thật: cắt theo khung cuộn tổ tiên (thanh mục con cuộn ngang, bảng .tbl-x)
    const clip = el => { const r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom; for (let p = el.parentElement; p; p = p.parentElement) { if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)) { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); R = Math.min(R, q.right); T = Math.max(T, q.top); B = Math.min(B, q.bottom); } } return { left: L, top: T, right: R, bottom: B }; };
    const hits = [...document.querySelectorAll('#main button, #main select, #main input, #main a, #main summary')].filter(vis).map(el => ({ el, r: clip(el) })).filter(h => h.r.right - h.r.left > 1 && h.r.bottom - h.r.top > 1);
    for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) { const a = hits[i].r, b = hits[j].r; if (hits[i].el.contains(hits[j].el) || hits[j].el.contains(hits[i].el)) continue; const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 2 && y > 2) out.overlap.push((hits[i].el.textContent || hits[i].el.name || '').trim().slice(0, 20) + ' × ' + (hits[j].el.textContent || hits[j].el.name || '').trim().slice(0, 20)); }
    for (const el of document.querySelectorAll('#main *')) { if (!vis(el) || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(el); if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && !el.closest('.tbl-x') && !el.classList.contains('ax-sr')) out.clipped.push(el.className + ': ' + el.textContent.trim().slice(0, 30)); }
    const txt = document.getElementById('main').innerText; for (const w of ['NaN', 'undefined', 'Infinity', 'null']) if (new RegExp('\\b' + w + '\\b').test(txt)) out.junk.push(w);
    if (st === 'data') for (const k of document.querySelectorAll('.ax-kpis .kpi .v')) if (/^\$?0([.,]00)?%?$/.test(k.textContent.trim())) out.junk.push('KPI 0: ' + k.closest('.kpi').querySelector('.l').textContent.trim());
    return out;
  }, state);
  await page.addScriptTag({ content: AXE });
  const ax = await page.evaluate(async () => (await window.axe.run(document.getElementById('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.filter(x => x.impact === 'serious' || x.impact === 'critical').map(x => x.id + '×' + x.nodes.length));
  const file = path.join(OUT, `ads-${state}-${theme}-${vp}.png`); await page.screenshot({ path: file, fullPage: true });
  const tag = `${state} ${theme} ${vp}`;
  report.push({ state, theme, vp, file, ...v, axe: ax });
  if (v.overflow > 1) fails.push(`${tag}: tràn ngang ${v.overflow}px`);
  if (v.overlap.length) fails.push(`${tag}: đè nhau – ${v.overlap.slice(0, 4).join(' | ')}`);
  if (v.clipped.length) fails.push(`${tag}: chữ bị cắt – ${v.clipped.slice(0, 4).join(' | ')}`);
  if (v.junk.length) fails.push(`${tag}: số vô nghĩa – ${v.junk.join(', ')}`);
  if (ax.length) fails.push(`${tag}: axe ${ax.join(', ')}`);
  if (errs.length) fails.push(`${tag}: lỗi JS ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report, fails }, null, 1));
console.log(report.map(r => `${r.file} overflow=${r.overflow} overlap=${r.overlap.length} clipped=${r.clipped.length} axe=${r.axe.length}`).join('\n'));
if (fails.length) { console.log('✗ ' + fails.join('\n✗ ')); process.exit(1); }
console.log(`✓ admin-ads-shots: ${report.length} ảnh (dữ liệu mẫu) – không lỗi JS, tràn, đè, cắt chữ, số vô nghĩa, axe`);
