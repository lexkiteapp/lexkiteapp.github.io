// Hồ sơ tải trang cho quality-sweep (tắt mặc định; bật bằng QS_PROFILE=<lang>:<route>, vd ar:#/library). Tìm HÀM gây tác vụ dài (CDP Profiler + Tracing),
// ghi <out>/prof/*.cpuprofile, trace.json và summary.txt (self-time theo hàm/tệp + việc trình duyệt trong từng RunTask > 50 ms). Không đổi ngưỡng của sweep.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [spec, root = 'dist', out = 'qs-out/prof'] = process.argv.slice(2);
const [lang, route = '#/home'] = String(spec || 'ar:#/home').split(/:(.*)/s);
fs.mkdirSync(out, { recursive: true });
const srv = await serve(root, 0);
const browser = await chromium.launch();
const LOCALE = { vi: 'vi-VN', en: 'en-US', ar: 'ar-SA' }[lang] || lang;
const lines = [`profile ${lang} ${route}`];
// Lượt TẢI ĐẦU (cold): Profiler + Tracing bật TRƯỚC khi mở trang → thấy cả nạp/dịch en.js + <lang>.js, parse, bố cục đầu tiên
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: LOCALE });
  await ctx.addInitScript(() => { try { localStorage.setItem('vb-onboarded', '1'); } catch { /* */ } });
  await ctx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await browser.startTracing(page, { path: `${out}/trace-cold.json`, categories: ['devtools.timeline', 'v8.execute', 'v8', 'disabled-by-default-devtools.timeline'] });
  await cdp.send('Profiler.start');
  await page.goto(`${srv.origin}/app/?sandbox=1&hl=${lang}#/welcome/setup`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2500);
  const { profile } = await cdp.send('Profiler.stop'); await browser.stopTracing();
  fs.writeFileSync(`${out}/cold.cpuprofile`, JSON.stringify(profile));
  const by = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  profile.samples.forEach((id, i) => { const f = by.get(id).callFrame, k = `${f.functionName || '(anon)'} ${String(f.url || '').split('/').slice(-2).join('/')}:${f.lineNumber}`; self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000); });
  lines.push('\n== COLD (tải đầu, mobile): self-time hàng đầu (ms)'); for (const [k, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) lines.push(`${Math.round(ms)}\t${k}`);
  const ev = JSON.parse(fs.readFileSync(`${out}/trace-cold.json`, 'utf8')).traceEvents.filter(e => e.ph === 'X' && e.dur);
  const tasks = ev.filter(e => e.name === 'RunTask' && e.dur > 50000).sort((a, b) => b.dur - a.dur).slice(0, 10);
  lines.push(`\n== COLD: RunTask > 50 ms (${tasks.length})`);
  for (const t of tasks) {
    const inn = ev.filter(e => e.tid === t.tid && e.pid === t.pid && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t && e.name !== 'RunTask'), agg = new Map();
    for (const e of inn) { const k = e.name + (e.args && e.args.data && (e.args.data.url || e.args.data.fileName) ? ' ' + String(e.args.data.url || e.args.data.fileName).split('/').slice(-2).join('/') : ''); agg.set(k, Math.max(agg.get(k) || 0, e.dur / 1000)); }
    lines.push(`${Math.round(t.dur / 1000)} ms: ` + [...agg].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, ms]) => `${k} ${Math.round(ms)}`).join(' | '));
  }
  await ctx.close();
}
for (const mobile of [true, false]) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: LOCALE } : { viewport: { width: 1280, height: 800 }, locale: LOCALE });
  await ctx.addInitScript(() => { try { localStorage.setItem('vb-onboarded', '1'); } catch { /* */ } });
  await ctx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await page.goto(`${srv.origin}/app/?sandbox=1&hl=${lang}#/welcome/setup`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1200); }
  const tag = mobile ? 'm' : 'd';
  await browser.startTracing(page, { path: `${out}/trace-${tag}.json`, categories: ['devtools.timeline', 'v8.execute', 'v8', 'disabled-by-default-devtools.timeline', 'blink.user_timing'] });
  await cdp.send('Profiler.start');
  await page.evaluate(h => { location.hash = h; }, route);
  await page.waitForTimeout(2500);
  const { profile } = await cdp.send('Profiler.stop');
  await browser.stopTracing();
  fs.writeFileSync(`${out}/${tag}.cpuprofile`, JSON.stringify(profile));
  const by = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  profile.samples.forEach((id, i) => { const f = by.get(id).callFrame, k = `${f.functionName || '(anon)'} ${String(f.url || '').split('/').slice(-2).join('/')}:${f.lineNumber}`; self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000); });
  lines.push(`\n== ${tag}: self-time hàng đầu (ms)`); for (const [k, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) lines.push(`${Math.round(ms)}\t${k}`);
  const ev = JSON.parse(fs.readFileSync(`${out}/trace-${tag}.json`, 'utf8')).traceEvents.filter(e => e.ph === 'X' && e.dur);
  const tasks = ev.filter(e => e.name === 'RunTask' && e.dur > 50000).sort((a, b) => b.dur - a.dur).slice(0, 8);
  lines.push(`\n== ${tag}: RunTask > 50 ms (${tasks.length})`);
  for (const t of tasks) {
    const inn = ev.filter(e => e.tid === t.tid && e.pid === t.pid && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t && e.name !== 'RunTask'), agg = new Map();
    for (const e of inn) { const k = e.name + (e.args && e.args.data && (e.args.data.url || e.args.data.fileName) ? ' ' + String(e.args.data.url || e.args.data.fileName).split('/').slice(-2).join('/') : ''); agg.set(k, Math.max(agg.get(k) || 0, e.dur / 1000)); }
    lines.push(`${Math.round(t.dur / 1000)} ms @${Math.round(t.ts / 1000) % 100000}: ` + [...agg].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, ms]) => `${k} ${Math.round(ms)}`).join(' | '));
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/summary.txt`, lines.join('\n') + '\n'); console.log(lines.join('\n'));
await browser.close(); await srv.close?.();
