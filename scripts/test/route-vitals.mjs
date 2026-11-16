// Đo Web Vitals 6 route chính trên bản THẬT (mặc định https://lexkite.com), điện thoại 4G chậm như Lighthouse mobile
// (RTT 150 ms, 1,6 Mbps, CPU ×4, 412×823): LCP, CLS, TBT (long task sau FCP), INP (chạm thật 2 nút), tổng byte qua mạng
// + 10 tài nguyên nặng nhất. Mỗi route 3 lần, lấy lần LCP trung vị. Tab khách cũ: dữ liệu mẫu (?demo=1) giữ trong máy,
// nhưng xoá HTTP cache + service worker trước mỗi lần đo (lần tải lạnh của người học quay lại). Máy đo đặt lk.noTrack=1 → không gửi phiên.
// Dùng: node scripts/test/route-vitals.mjs [base] [out.json]   – số ghi vào docs (mục "Tải trang – 6 route").
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = (process.argv[2] || 'https://lexkite.com').replace(/\/$/, ''), out = process.argv[3] || 'out/route-vitals.json';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const ROUTES = [
  { key: 'welcome', path: '/app/?hl=vi#/welcome', fresh: true },
  { key: 'today', path: '/app/?hl=vi#/home' },
  { key: 'review', path: '/app/?hl=vi#/review' },
  { key: 'lesson', path: '/app/?hl=vi#/lesson/go?demo=1' },
  { key: 'dict', path: '/app/?hl=vi#/dict/hello' },
  { key: 'landing', path: '/', fresh: true },
  { key: 'blog', path: '/vi/blog/gerund-va-to-infinitive/', fresh: true },
];
const RUNS = +process.env.RUNS || 3;
const WARM = process.env.WARM === '1'; // 1 = khách quay lại còn cache (mở 1 lượt trước khi đo); mặc định xoá HTTP cache + SW (lần tải lạnh)
const b = await chromium.launch();
const mkCtx = () => b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const UX1 = process.env.UX1 === '1'; // bản dựng cục bộ không có /api/config → bật giao diện 5 tab (ux1) như lexkite.com
const init = UX1 => {
  try { localStorage.setItem('lk.noTrack', '1'); if (UX1) localStorage.setItem('lk.ux1', '1'); } catch (e) { /* trang không có localStorage */ }
  const V = window.__v = { lcp: 0, lcpEl: '', cls: 0, lt: [], ev: [], fcp: 0 };
  let sw = 0, sv = 0, last = 0, first = 0;
  const po = (type, fn, o = {}) => { try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...o }); } catch (e) { /* không hỗ trợ */ } };
  po('largest-contentful-paint', e => { V.lcp = Math.round(e.startTime); const el = e.element; V.lcpEl = el ? el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + (e.url ? ' ' + e.url.slice(-60) : ' "' + (el.textContent || '').trim().slice(0, 30) + '"') : ''; });
  po('paint', e => { if (e.name === 'first-contentful-paint') V.fcp = Math.round(e.startTime); });
  po('layout-shift', e => { if (e.hadRecentInput) return; if (sw && e.startTime - last < 1000 && e.startTime - first < 5000) sw += e.value; else { sw = e.value; first = e.startTime; } last = e.startTime; sv = Math.max(sv, sw); V.cls = +sv.toFixed(3); });
  po('longtask', e => V.lt.push([Math.round(e.startTime), Math.round(e.duration)]));
  po('event', e => { if (e.interactionId) V.ev.push([e.name, Math.round(e.duration), e.interactionId]); }, { durationThreshold: 16 });
};
async function measure(ctx, path) {
  const pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg), req = new Map();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let frozen = false;
  cdp.on('Network.responseReceived', e => { if (!frozen) req.set(e.requestId, { url: e.response.url, type: e.type, cache: e.response.fromDiskCache || e.response.fromServiceWorker }); });
  cdp.on('Network.loadingFinished', e => { const r = req.get(e.requestId); if (r && !frozen) r.bytes = e.encodedDataLength; });
  await pg.addInitScript(init, UX1);
  const t0 = Date.now();
  await pg.goto(base + path, { waitUntil: 'load', timeout: 90000 });
  // chờ yên: 3 s không long task mới (tối đa 20 s) – như cửa sổ TTI
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(500); const q = await pg.evaluate(() => { const l = __v.lt.at(-1); return !l || performance.now() - (l[0] + l[1]) > 3000; }); if (q && i >= 5) break; }
  frozen = true;
  const v0 = await pg.evaluate(() => ({ ...__v, url: location.href, wf: performance.getEntriesByType('resource').map(x => [Math.round(x.startTime), Math.round(x.responseEnd), x.name.replace(location.origin, '').slice(0, 80)]) }));
  // INP: chạm thật tối đa 2 nút hiển thị trong vùng nội dung (không mở trang ngoài)
  const sel = path.startsWith('/app/') ? '#view button:visible, #view [role=button]:visible' : 'main button:visible, header button:visible, nav button:visible';
  const btns = await pg.locator(sel).all();
  let taps = 0;
  for (const bt of btns) { if (taps >= 2) break; try { if (!(await bt.isEnabled())) continue; await bt.tap({ timeout: 3000 }); taps++; await pg.waitForTimeout(1500); } catch (e) { /* nút bị che/biến mất */ } }
  const ev = await pg.evaluate(() => __v.ev).catch(() => []);
  const byId = {}; for (const [, d, id] of ev) byId[id] = Math.max(byId[id] || 0, d);
  const tbt = v0.lt.filter(([s]) => s >= v0.fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  const rs = [...req.values()].filter(r => r.bytes != null);
  const byType = {}; for (const r of rs) byType[r.type] = (byType[r.type] || 0) + r.bytes;
  await pg.close();
  return { lcp: v0.lcp, fcp: v0.fcp, cls: v0.cls, tbt, inp: Object.values(byId).length ? Math.max(...Object.values(byId)) : null, taps, lcpEl: v0.lcpEl, url: v0.url.replace(base, ''),
    kb: Math.round(rs.reduce((a, r) => a + r.bytes, 0) / 1024), reqs: rs.length, byType: Object.fromEntries(Object.entries(byType).map(([k, x]) => [k, Math.round(x / 1024)])),
    wf: v0.wf, top: rs.sort((x, y) => y.bytes - x.bytes).slice(0, 10).map(r => [Math.round(r.bytes / 1024), r.type, r.url.replace(base, '').slice(0, 110)]), ms: Date.now() - t0 };
}
// tab khách cũ: nạp dữ liệu mẫu một lần
const seeded = await mkCtx();
{
  const pg = await seeded.newPage(); await pg.addInitScript(init, UX1);
  await pg.goto(base + '/app/?hl=vi&demo=1#/home', { waitUntil: 'load', timeout: 90000 });
  await pg.waitForFunction(() => window.App && App.state && App.state.settings && App.state.settings.onboarded, null, { timeout: 60000 }).catch(e => console.log('⚠ seed: ' + e.message.slice(0, 120)));
  console.log('seed: cards=' + await pg.evaluate(() => Object.keys((App.state && App.state.cards) || {}).length).catch(() => '?'));
  await pg.close();
}
const res = {};
for (const r of ROUTES.filter(x => !ONLY || ONLY.includes(x.key))) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    let ctx = seeded;
    if (r.fresh) ctx = await mkCtx();
    else if (WARM) { const pg = await seeded.newPage(); await pg.goto(base + r.path, { waitUntil: 'load', timeout: 90000 }); await pg.waitForTimeout(4000); await pg.close(); } // khách quay lại thật: HTTP cache + SW còn nguyên sau 1 lượt mở
    else { const pg = await seeded.newPage(), cdp = await seeded.newCDPSession(pg); await pg.goto(base + '/robots.txt'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'service_workers,cache_storage' }); await pg.close(); }
    try { runs.push(await measure(ctx, r.path)); } catch (e) { console.log('✗ ' + r.key + ' #' + i + ': ' + e.message.slice(0, 160)); }
    if (r.fresh) await ctx.close();
  }
  if (!runs.length) continue;
  runs.sort((x, y) => x.lcp - y.lcp);
  const m = runs[Math.floor((runs.length - 1) / 2)];
  m.runs = runs.map(x => `${x.lcp}/${x.tbt}/${x.cls}/${x.inp}`);
  res[r.key] = m;
  console.log(`== ${(r.key + (WARM && !r.fresh ? '·ấm' : '')).padEnd(10)} LCP ${m.lcp} ms · FCP ${m.fcp} · TBT ${m.tbt} ms · CLS ${m.cls} · INP ${m.inp} ms (${m.taps} chạm) · ${m.kb} KB/${m.reqs} req · lần: ${m.runs.join(' | ')}`);
  console.log(`   LCP el: ${m.lcpEl} · url ${m.url} · theo loại ${JSON.stringify(m.byType)}`);
  m.top.forEach(t => console.log(`   ${String(t[0]).padStart(5)} KB ${t[1].padEnd(10)} ${t[2]}`));
  // TRACE=1: thác tài nguyên tới LCP (bắt đầu→xong ms) – tìm chuỗi chặn lần vẽ
  if (process.env.TRACE) m.wf.filter(w => w[0] <= m.lcp).forEach(w => console.log(`   ⏱ ${String(w[0]).padStart(5)}→${String(w[1]).padStart(5)} ${w[2]}`));
}
await b.close();
fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ base, at: new Date().toISOString(), net: '4G chậm 150ms/1.6Mbps, CPU×4, 412×823', routes: res }, null, 1));
// bảng markdown cho docs
console.log('\n| Route | LCP | TBT | CLS | INP | KB (req) |\n|---|---|---|---|---|---|');
for (const [k, m] of Object.entries(res)) console.log(`| ${k} | ${(m.lcp / 1000).toFixed(2)} s | ${m.tbt} ms | ${m.cls} | ${m.inp ?? '–'} ms | ${m.kb} (${m.reqs}) |`);
