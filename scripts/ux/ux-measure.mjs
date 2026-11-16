// Đo trải nghiệm các luồng chính trên BẢN LIVE (lexkite.com/app/?sandbox=1, không tài khoản thật, không beacon): chạy trên CI (ux-measure.yml), không chạy trên Mac.
// Mỗi luồng × (390|1280) × (sáng|tối): số lần chạm, thời gian tới giá trị đầu, LCP/CLS/TBT/INP xấp xỉ, ảnh chụp. Ra ux-out/metrics.json + *.png.
// Chạy: node scripts/ux/ux-measure.mjs [--base https://lexkite.com] [--out ux-out]
import { chromium } from 'playwright';
import fs from 'node:fs';
const A = process.argv.slice(2), arg = (k, d) => (A.includes(k) ? A[A.indexOf(k) + 1] : d);
const BASE = arg('--base', 'https://lexkite.com'), OUT = arg('--out', 'ux-out'); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VPS = { m390: { width: 390, height: 844 }, d1280: { width: 1280, height: 800 } };
const SEED = { 'sbx.settings': JSON.stringify({ onboarded: true }) };
const PERF = () => {
  const w = window; w.__ux = { cls: 0, lcp: 0, tbt: 0, inp: 0, ev: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__ux.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) w.__ux.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) w.__ux.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) { w.__ux.inp = Math.max(w.__ux.inp, e.duration); w.__ux.ev.push([e.name, Math.round(e.duration)]); } }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
};
const browser = await chromium.launch();
const res = [];
for (const [vpn, vp] of Object.entries(VPS)) for (const theme of ['light', 'dark']) {
  const tag = `${vpn}-${theme}`;
  const ctx = await browser.newContext({ viewport: vp, colorScheme: theme, deviceScaleFactor: 1, serviceWorkers: 'block', permissions: ['microphone', 'notifications'] });
  await ctx.addInitScript(PERF);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
  let taps = 0, t0 = 0;
  const flow = {}; const step = async (name, fn) => { const s = Date.now(); let ok = false, note = ''; const tp = taps; try { ok = !!(await fn()); } catch (e) { note = String(e.message).split('\n')[0].slice(0, 140); } const ms = Date.now() - s; await sleep(400); const m = await page.evaluate(() => ({ ...window.__ux, ev: undefined })).catch(() => ({})); await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }).catch(() => {}); flow[name] = { ok, ms, taps: taps - tp, note, hash: await page.evaluate(() => location.hash).catch(() => ''), ...m }; };
  const click = async sel => { const l = page.locator(sel).filter({ visible: true }).first(); await l.click({ timeout: 8000 }); taps++; await sleep(350); };
  const see = (s, to = 12000) => page.waitForSelector(s, { state: 'visible', timeout: to }).then(() => true).catch(() => false);
  // 1. lần mở đầu
  t0 = Date.now();
  await page.goto(`${BASE}/app/?sandbox=1&hl=en`, { waitUntil: 'load' });
  await step('1-first-open', async () => { const ok = await see('#wCard'); flow.ttFirstScreen = Date.now() - t0; return ok; });
  // 2. onboarding
  await step('2-onboarding', async () => { await click('.w-cta a[href="#/welcome/setup"]'); await see('#obNext'); await click('[data-track]'); for (let i = 0; i < 8 && !(await page.$('#go')); i++) { if (await page.$('[data-lv]:not([data-lv="test"])')) { await click('[data-lv]:not([data-lv="test"])'); } await click('#obNext'); } await click('#go'); return page.waitForFunction(() => /^#\/(day|home|placement)/.test(location.hash), null, { timeout: 15000 }).then(() => true); });
  flow.ttValue = Date.now() - t0; flow.tapsToValue = taps;
  if (/placement/.test(await page.evaluate(() => location.hash))) { await page.click('#plSkip').catch(() => {}); await sleep(800); }
  await step('3-today', async () => { await page.evaluate(() => { location.hash = '#/home'; }); return see('#view h1, #view .card, #view [data-blk]'); });
  await step('4-lesson', async () => { await page.evaluate(() => { location.hash = '#/day'; }); await sleep(1500); const ok = await see('#view .option, #view button, #view a.btn', 15000); const n0 = taps; for (let i = 0; i < 6; i++) { const o = page.locator('#view .option:visible, #view [data-k]:visible, #view #go:visible, #view .btn.primary:visible, #view [data-next]:visible').first(); if (!(await o.count())) break; await o.click({ timeout: 4000 }).catch(() => {}); taps++; await sleep(500); } return ok && taps > n0; });
  await step('5-review-srs', async () => { await page.evaluate(() => { location.hash = '#/review'; }); await sleep(1500); const f = page.locator('#view .card, #view [data-flip], #view #front, #view .fc').first(); if (await f.count()) { await f.click({ timeout: 4000 }).catch(() => {}); taps++; } return see('#view button, #view .card'); });
  await step('6-pron', async () => { await page.evaluate(() => { location.hash = '#/pron'; }); await sleep(1500); return see('#view h1, #view .card'); });
  await step('7-result-streak', async () => { await page.evaluate(() => { location.hash = '#/me'; }); await sleep(1200); return see('#view h1, #view .card'); });
  await step('8-reminders', async () => { await page.evaluate(() => { location.hash = '#/settings'; }); await sleep(1200); return see('#view h1, #view .card'); });
  res.push({ tag, ...flow, errs });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(res, null, 1));
for (const r of res) console.log(r.tag, 'ttFirstScreen', r.ttFirstScreen, 'ttValue', r.ttValue, 'taps', r.tapsToValue, Object.entries(r).filter(([k, v]) => v && v.ok !== undefined).map(([k, v]) => `${k}:${v.ok ? 'ok' : 'FAIL'}/cls${(v.cls || 0).toFixed(3)}/tbt${Math.round(v.tbt || 0)}/inp${Math.round(v.inp || 0)}`).join(' '));
