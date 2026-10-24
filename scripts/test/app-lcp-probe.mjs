// Dò phần tử LCP màn đầu /app/ (Playwright, mạng 4G chậm + CPU ×4 như Lighthouse mobile): in mọi ứng viên LCP (thời điểm, thẻ, cỡ),
// thời điểm font tải xong và FCP – để biết LCP bị đẩy muộn vì cái gì. Dùng: node scripts/test/app-lcp-probe.mjs <base> [path…]
import { chromium } from 'playwright';
const FUNC = process.argv.includes('--func'); const argv = process.argv.filter(a => a !== '--func');
const base = argv[2] || 'http://localhost:8080', paths = FUNC ? [] : argv.slice(3).length ? argv.slice(3) : ['app/?hl=en', 'app/?hl=vi'];
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
// Cổng chức năng (dist thật, không giới hạn mạng): app khởi động sau khi JS nạp sau lần vẽ đầu; khách cũ vào #/home; SW cài xong → offline vẫn mở được app
let bad = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
{
  const ctx = await b.newContext(), pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await pg.goto(base + '/app/?hl=en', { waitUntil: 'load' });
  await pg.waitForFunction(() => window.App && App.route && location.hash === '#/welcome' && document.querySelector('#wCard'), null, { timeout: 20000 }).then(() => ok(1, 'khách mới: app khởi động, #/welcome + thẻ demo')).catch(() => ok(0, 'khách mới: app không khởi động (hash=' + '?)'));
  ok(await pg.evaluate(() => document.title !== '' && document.documentElement.lang === 'en' && !!document.querySelector('.lk-rep')), 'i18n en + report-pill (DOMContentLoaded giả) chạy');
  await pg.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.getRegistration('/app/').then(r => !!(r && r.active)), null, { timeout: 30000 }).then(() => ok(1, 'SW /app/ đã kích hoạt')).catch(() => ok(0, 'SW /app/ không kích hoạt'));
  await pg.evaluate(() => localStorage.setItem('lk.onb', '1'));
  await pg.goto(base + '/app/#/vocab', { waitUntil: 'load' });
  await pg.waitForFunction(() => window.App && App.route && document.querySelector('#view').children.length && !document.body.classList.contains('bare'), null, { timeout: 20000 }).then(() => ok(1, 'khách cũ: #/vocab vẽ xong (SW điều khiển: ' + '…)')).catch(() => ok(0, 'khách cũ: #/vocab không vẽ'));
  console.log('  ctrl trước offline: ' + await pg.evaluate(() => !!navigator.serviceWorker.controller));
  await ctx.setOffline(true);
  await pg.reload({ waitUntil: 'load' }).catch(() => {});
  await pg.waitForFunction(() => window.App && App.route && document.querySelector('#view').children.length, null, { timeout: 20000 }).then(() => ok(1, 'offline: app mở từ cache SW')).catch(async () => ok(0, 'offline: app không mở – ' + await pg.evaluate(() => location.href + ' ctrl=' + !!(navigator.serviceWorker && navigator.serviceWorker.controller) + ' App=' + !!window.App + ' | ' + document.body.innerText.slice(0, 160)).catch(e => String(e))));
  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close();
process.exit(bad ? 1 : 0);
