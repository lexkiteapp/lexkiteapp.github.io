// Perf budget for the admin clip grid on a 5 000-clip fixture (real Chromium via Playwright; CI: .github/workflows/clips-perf.yml).
// first paint < 800 ms · scroll without long tasks (> 50 ms) · filter change < 200 ms · select all 5 000 < 100 ms · layout shift ≈ 0 (fixed thumbnail boxes) · DOM < 300 nodes.
// Run: node scripts/test/clips-perf.mjs   (needs `npm i playwright` + `npx playwright install chromium`; PW_CHANNEL=chrome uses installed Chrome)
import fs from 'node:fs';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('clips-perf: playwright not installed – skipped'); process.exit(0); }
const budget = { paint: 800, filter: 200, selectAll: 100, nodes: 300, cls: 0.02 };
const browser = await pw.chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}).catch(e => { console.log('clips-perf: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(60000);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
await page.route('https://img.test/**', async r => { await new Promise(x => setTimeout(x, 40)); r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
page.on('pageerror', e => console.log('pageerror:', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
await page.route('https://lexkite.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>:root{--line:#ddd;--surface:#fff;--surface-2:#f5f5f5;--text:#111;--muted:#666;--accent:#0a7;--accent-soft:#e6f7f2}body{margin:0;font:14px system-ui;background:var(--surface-2);color:var(--text)}#h{padding:16px}</style><div id=h></div>` }));
await page.goto('https://lexkite.test/admin.html');
await page.addScriptTag({ content: fs.readFileSync('web/js/admin-clips.js', 'utf8') });
const R = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms)), until = async (f, what) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > 8000) throw new Error('timeout waiting for ' + what); await wait(2); } }, raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const all = Array.from({ length: 5000 }, (_, i) => ({ id: 'clip-' + String(i).padStart(4, '0'), title: 'Clip number ' + i + ' with a fairly long title that must be cut with an ellipsis', scene: 'cafe', template: ['choose', 'listen', 'news'][i % 3], created: '2026-10-' + String(1 + i % 28).padStart(2, '0') + 'T00:00:00Z', qa: { status: 'pass', ok: 40, fail: 0 }, cover_url: 'https://img.test/c' + i + '.png', _v: {} }));
  const capi = async (op, b) => {
    if (op === 'query') { const rows = all.filter(x => (!b.filter.q || x.title.includes(b.filter.q)) && (!b.filter.template || x.template === b.filter.template)); const at = b.cursor || 0; return { rows: rows.slice(at, at + b.limit), total: rows.length, next: at + b.limit < rows.length ? at + b.limit : null, counts: { pending: rows.length, approved: 0, live: 0, fail: 0, archive: 0 }, facets: { template: ['choose', 'listen', 'news'] } }; }
    if (op === 'ids') return { ids: all.map(x => x.id) }; return { results: [] };
  };
  let cls = 0, longTasks = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); new PerformanceObserver(l => longTasks.push(...l.getEntries().map(e => Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) { /* unsupported */ }
  const out = {}, host = document.getElementById('h'); let t = performance.now();
  window.AdminClips.mount(host, { capi, esc: x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`), lang: () => 'vi', toast() {}, open() {} });
  await until(() => host.querySelector('.cl-c'), 'first card'); await raf(); out.paint = performance.now() - t;
  await wait(300); longTasks.length = 0; const vp = host.querySelector('#cl-vp'), frames = []; let last = performance.now(), maxNodes = 0;
  for (let i = 0; i < 120; i++) { vp.scrollTop += 330; await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); frames.push(n - last); last = n; maxNodes = Math.max(maxNodes, host.querySelectorAll('*').length); }
  out.longTasks = longTasks.slice(); out.slowFrames = frames.filter(f => f > 34).length; out.frames = frames.length; out.nodes = maxNodes; out.loaded = host.querySelectorAll('.cl-c').length;
  vp.scrollTop = 0; await raf(); t = performance.now();
  const tpl = host.querySelector('#cl-tpl'); tpl.value = 'news'; tpl.dispatchEvent(new Event('change'));
  await until(() => /1,667|1\.667|1667/.test(host.querySelector('#cl-n').textContent), 'filtered count'); await raf(); out.filter = performance.now() - t;
  t = performance.now(); host.querySelector('#cl-all').click(); await until(() => !host.querySelector('#cl-bar').hidden && /selected|đã chọn/.test(host.querySelector('#cl-bar').textContent), 'selection bar'); out.selectAll = performance.now() - t;
  const tc = host.querySelector('.cl-c b'); out.ellipsis = getComputedStyle(tc).textOverflow === 'ellipsis' && !!tc.title; out.cls = cls; return out;
});
await browser.close();
const fail = [];
if (R.paint > budget.paint) fail.push(`first paint ${R.paint.toFixed(0)} ms > ${budget.paint}`);
if (R.longTasks.some(d => d > 50)) fail.push('long tasks while scrolling: ' + R.longTasks.join(','));
if (R.slowFrames > R.frames * 0.05) fail.push(`slow frames ${R.slowFrames}/${R.frames}`);
if (R.filter > budget.filter) fail.push(`filter change ${R.filter.toFixed(0)} ms > ${budget.filter}`);
if (R.selectAll > budget.selectAll) fail.push(`select all ${R.selectAll.toFixed(0)} ms > ${budget.selectAll}`);
if (R.nodes >= budget.nodes) fail.push(`DOM ${R.nodes} nodes ≥ ${budget.nodes}`);
if (R.cls > budget.cls) fail.push(`layout shift ${R.cls.toFixed(3)} > ${budget.cls}`);
if (!R.ellipsis) fail.push('title lacks ellipsis/tooltip');
console.log(`clips-perf: paint ${R.paint.toFixed(0)} ms · filter ${R.filter.toFixed(0)} ms · select-all ${R.selectAll.toFixed(0)} ms · nodes ${R.nodes} · slow frames ${R.slowFrames}/${R.frames} · long tasks ${R.longTasks.length} · CLS ${R.cls.toFixed(3)}`);
if (fail.length) { console.log('✗ ' + fail.join('\n✗ ')); process.exit(1); }
console.log('✓ clips-perf: budgets met');
