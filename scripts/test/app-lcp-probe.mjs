// Dò phần tử LCP màn đầu /app/ (Playwright, mạng 4G chậm + CPU ×4 như Lighthouse mobile): in mọi ứng viên LCP (thời điểm, thẻ, cỡ),
// thời điểm font tải xong và FCP – để biết LCP bị đẩy muộn vì cái gì. Dùng: node scripts/test/app-lcp-probe.mjs <base> [path…]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080', paths = process.argv.slice(3).length ? process.argv.slice(3) : ['app/?hl=en', 'app/?hl=vi'];
const b = await chromium.launch();
for (const p of paths) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.addInitScript(() => {
    window.__lcp = []; const d = el => el ? (el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' "' + (el.textContent || '').trim().slice(0, 40) + '"') : '(removed)';
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__lcp.push({ t: Math.round(e.startTime), size: e.size, el: d(e.element), url: e.url || '' }))).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__lcp.push({ t: Math.round(e.startTime), paint: e.name }))).observe({ type: 'paint', buffered: true });
    document.fonts && document.fonts.addEventListener('loadingdone', () => window.__lcp.push({ t: Math.round(performance.now()), fonts: 'loadingdone' }));
  });
  await pg.goto(base + '/' + p, { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(4000);
  const r = await pg.evaluate(() => ({ ev: window.__lcp.sort((a, b) => a.t - b.t), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd), res: performance.getEntriesByType('resource').filter(x => x.startTime < 6000).map(x => Math.round(x.startTime) + '→' + Math.round(x.responseEnd) + ' ' + x.name.replace(location.origin, '').slice(0, 70)) }));
  console.log('== ' + p + ' dcl=' + r.dcl); r.ev.forEach(e => console.log('  ' + JSON.stringify(e))); console.log('  resources:\n   ' + r.res.join('\n   '));
  await ctx.close();
}
await b.close();
