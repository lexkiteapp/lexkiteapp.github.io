// ⏱ Hồ sơ CPU lần tải lạnh của 1 route (CPU chậm 4× như Lighthouse mobile) → các "task dài" > 50 ms và hàm ngốn thời gian trong từng task.
// Chạy trên CI (perf-profile.yml) – không chạy trên Mac. Dùng bản web/ CHƯA rút gọn để còn tên hàm.
// node scripts/test/profile-route.mjs http://localhost:8080 path [lần=2]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8080', ROUTE = process.argv[3] || 'path', N = +process.argv[4] || 1;
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const short = u => (u || '').replace(/^https?:\/\/[^/]+\//, '');
const browser = await chromium.launch();
for (let run = 0; run < N; run++) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: UA });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Mạng như Lighthouse mobile (4G chậm: RTT 150 ms, 1,6 Mbps) → script về rải rác, thứ tự task giống lúc đo thật
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9 });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  // Đếm số lần trang được vẽ lại (#view thay .page-head) – vẽ 2 lần lúc khởi động = tác vụ dài thừa
  await page.addInitScript(() => { window.__draws = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('page-head') && n.parentElement && n.parentElement.id === 'view') window.__draws.push(Math.round(performance.now()) + ':' + (n.textContent || '').trim().slice(0, 30) + ':' + new Error().stack.split('\n').slice(2, 6).join(' < ')); }).observe(document, { childList: true, subtree: true }); });
  await page.goto(`${BASE}/app/?sandbox=1&hl=en#/${ROUTE}`, { waitUntil: 'load' });
  await page.waitForTimeout(14000);
  console.log('lần vẽ trang:', JSON.stringify(await page.evaluate(() => ({ draws: window.__draws, drawn: window.App && App.drawn && App.drawn() }))));
  const { profile: p } = await cdp.send('Profiler.stop');
  const byId = new Map(p.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const IDLE = new Set(['(idle)', '(root)']); // (program) = việc gốc của trình duyệt (style/layout/parse HTML) – vẫn tính là bận như Lighthouse
  // Ghép mẫu liên tiếp "bận" (khoảng hở < 2 ms) thành task
  let t = p.startTime, cur = null; const tasks = [];
  p.samples.forEach((id, i) => {
    t += p.timeDeltas[i]; const n = byId.get(id), busy = !IDLE.has(n.callFrame.functionName);
    if (busy) { if (!cur || t - cur.end > 2000) { cur = { start: t, end: t, s: [] }; tasks.push(cur); } cur.end = t; cur.s.push([id, p.timeDeltas[i + 1] || 200]); }
  });
  console.log(`\n===== #/${ROUTE} lần ${run + 1} =====`);
  for (const k of tasks.filter(k => k.end - k.start > 40000)) {
    const self = new Map(), incl = new Map();
    for (const [id, dt] of k.s) {
      const n = byId.get(id), f = n.callFrame, key = `${f.functionName || '(anon)'} ${short(f.url)}:${f.lineNumber + 1}`;
      self.set(key, (self.get(key) || 0) + dt);
      const seen = new Set(); let x = id;
      while (x != null) { const cf = byId.get(x).callFrame; const kk = `${cf.functionName || '(anon)'} ${short(cf.url)}:${cf.lineNumber + 1}`; if (!seen.has(kk) && !IDLE.has(cf.functionName)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + dt); } x = parent.get(x); }
    }
    // Dòng nóng nhất (positionTicks) của 3 hàm self lớn nhất
    const lines = new Map();
    for (const [id] of k.s) { const n = byId.get(id); for (const pt of n.positionTicks || []) { const kk = `${short(n.callFrame.url)}:${pt.line}`; lines.set(kk, (lines.get(kk) || 0) + pt.ticks); } }
    const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `    ${(v / 1000).toFixed(1).padStart(6)} ms  ${k}`).join('\n');
    console.log(`\n-- task @${((k.start - p.startTime) / 1000).toFixed(0)} ms dài ${((k.end - k.start) / 1000).toFixed(0)} ms (CPU 4×)\n  self:\n${top(self)}\n  inclusive:\n${top(incl)}\n  dòng nóng (số mẫu):\n${[...lines].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `    ${String(v).padStart(5)}  ${k}`).join('\n')}`);
  }
  await ctx.close();
}
// ---- Trace timeline (như Lighthouse main-thread-tasks): mỗi task > 50 ms → thời gian TỰ THÂN theo loại việc (Layout, Style, Compile, EvaluateScript url, FunctionCall hàm…)
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: UA });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9 });
  const ev = []; cdp.on('Tracing.dataCollected', d => ev.push(...d.value));
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,toplevel,blink.user_timing,loading', transferMode: 'ReportEvents' });
  await page.goto(`${BASE}/app/?sandbox=1&hl=en#/${ROUTE}`, { waitUntil: 'load' });
  await page.waitForTimeout(14000);
  await cdp.send('Tracing.end'); await done;
  const nav = ev.find(e => e.name === 'navigationStart' && e.args && e.args.data && /\/app\//.test(e.args.data.documentLoaderURL || ''));
  const main = ev.find(e => e.name === 'thread_name' && e.args.name === 'CrRendererMain' && nav && e.pid === nav.pid) || ev.find(e => e.name === 'thread_name' && e.args.name === 'CrRendererMain');
  const T0 = nav ? nav.ts : 0, th = ev.filter(e => e.pid === main.pid && e.tid === main.tid && e.ph === 'X' && e.dur != null).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const key = e => { const d = (e.args && (e.args.data || e.args.beginData)) || {}; return e.name + (d.url ? ' ' + short(d.url) : '') + (d.functionName ? ' ' + d.functionName + ':' + d.lineNumber : '') + (d.type ? ' ' + d.type : ''); };
  console.log(`\n===== TRACE #/${ROUTE} (task > 50 ms, mốc tính từ lúc điều hướng) =====`);
  for (const task of th.filter(e => e.name === 'RunTask' && e.dur > 50000)) {
    const kids = th.filter(e => e !== task && e.ts >= task.ts && e.ts + e.dur <= task.ts + task.dur), self = new Map(), stack = [];
    for (const e of kids) {
      while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
      if (stack.length) stack[stack.length - 1].self -= e.dur;
      e.self = e.dur; stack.push(e);
    }
    for (const e of kids) self.set(key(e), (self.get(key(e)) || 0) + e.self);
    const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `    ${(v / 1000).toFixed(1).padStart(6)} ms  ${k}`).join('\n');
    console.log(`-- task @${((task.ts - T0) / 1000).toFixed(0)} ms dài ${(task.dur / 1000).toFixed(0)} ms\n${top}`);
  }
  await ctx.close();
}
await browser.close();
