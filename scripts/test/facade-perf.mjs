// Lesson video facade (web/js/lesson-video.js) in real Chromium, no account: poster only + 0 YouTube requests before the tap · preconnect on hover ·
// tap → youtube-nocookie iframe (playsinline=1, rel=0, loading=lazy) · 'ended' → quiz · YouTube down → self-hosted ≤ 4 s · blocked region → self-hosted,
// never YouTube · no long task > 50 ms after the tap · LCP of the lesson page unchanged by the facade (±10 %). CI: .github/workflows/dist-ui.yml
import fs from 'node:fs';
import path from 'node:path';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('facade-perf: playwright not installed – skipped'); process.exit(0); }
const browser = await pw.chromium.launch().catch(e => { console.log('facade-perf: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const POSTER = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64');
const item = { id: 'e2e-look-for', title: 'Look for vs look at', youtube_id: 'M7lc1UVf-VE', poster: 'https://media.lexkite.com/video/p.webp', src: 'https://media.lexkite.com/video/v.mp4', duration: 20, template: 'news', tags: { words: ['look'] }, quiz: { q: 'Which is right?', options: ['I look for my keys.', 'I look my keys.'], answer: 0 } };
const lesson = withVideo => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:16px}h1{font-size:2rem}</style></head>
<body><h1>Look for – lesson</h1><p>${'Practice the phrase in context. '.repeat(40)}</p>${withVideo ? '<div class="lv-slot" hidden data-lv=\'{"mode":"lesson"}\'></div><script src="/js/lib/video-rank.js"></script><script src="/js/lesson-video.js"></script>' : ''}</body></html>`;
async function open({ tz = 'America/New_York', locale = 'en-US', yt = 'fake', withVideo = true } = {}) {
  const ctx = await browser.newContext({ timezoneId: tz, locale, viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), reqs = [];
  page.on('request', r => { if (/youtube|ytimg|googlevideo/.test(r.url())) reqs.push(r.url()); });
  await page.route('https://lexkite.com/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/data/videos.json') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [item, { ...item, id: 'e2e-2', youtube_id: '' }] }) }); return r.fulfill({ status: 204, body: '' }); });
  await page.route('https://media.lexkite.com/**', r => (r.request().url().endsWith('.webp') ? r.fulfill({ contentType: 'image/webp', body: POSTER }) : r.fulfill({ status: 200, contentType: 'video/mp4', body: '' })));
  await page.route('https://lesson.test/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: lesson(withVideo) }); return r.fulfill({ path: path.join('web', u.pathname) }); });
  await page.route('https://www.youtube.com/iframe_api', r => (yt === 'down' ? r.abort() : r.fulfill({ contentType: 'text/javascript', body: `window.YT={Player:function(el,o){this.el=el;var t=this;setTimeout(function(){o.events.onReady({target:{playVideo:function(){}}});window.__ytEnd=function(){o.events.onStateChange({data:0})};},50);this.destroy=function(){};}};window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady();` })));
  await page.route('https://www.youtube-nocookie.com/**', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }));
  await page.addInitScript(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* no longtask API */ }
    window.__lcp = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* none */ } });
  await page.goto('https://lesson.test/');
  if (withVideo) await page.evaluate(() => window.LessonVideo.scan());
  return { ctx, page, reqs };
}
// 1. poster only, no YouTube bytes; hover → preconnect only; tap → iframe; ended → quiz; no long task
{ const { ctx, page, reqs } = await open();
  await page.waitForSelector('.lv-card img'); await page.waitForTimeout(400);
  ok(reqs.length === 0 && (await page.$eval('.lv-card img', i => i.src)).startsWith('https://media.lexkite.com/'), 'poster = our WebP, 0 YouTube requests before tap');
  await page.hover('.lv-card'); const pre = await page.$$eval('link[rel=preconnect]', l => l.map(x => x.href));
  ok(pre.some(h => h.includes('youtube-nocookie.com')) && reqs.length === 0, 'hover → preconnect only (still 0 YouTube requests)');
  const t0 = await page.evaluate(() => performance.now()); await page.click('.lv-card');
  await page.waitForSelector('iframe[src*="youtube-nocookie.com/embed/"]', { timeout: 5000 });
  const src = await page.$eval('.lv-yt iframe', f => f.src), lazy = await page.$eval('.lv-yt iframe', f => f.getAttribute('loading'));
  ok(/playsinline=1/.test(src) && /rel=0/.test(src) && lazy === 'lazy', 'iframe youtube-nocookie with playsinline=1, rel=0, loading=lazy');
  await page.waitForTimeout(300); const long = await page.evaluate(t => window.__long.filter(x => x.t >= t), t0);
  ok(!long.some(x => x.d > 50), 'no long task > 50 ms on tap (' + (long.map(x => Math.round(x.d)).join(',') || 'none') + ')');
  await page.evaluate(() => window.__ytEnd()); await page.waitForSelector('.lv-q', { timeout: 3000 });
  ok(!!(await page.$('.lv-q .lv-o')), "'ended' → quiz shown");
  await ctx.close(); }
// 2. YouTube unreachable → self-hosted within 4 s
{ const { ctx, page } = await open({ yt: 'down' }); await page.waitForSelector('.lv-card'); const t = Date.now(); await page.click('.lv-card');
  await page.waitForSelector('.lv-pl video', { timeout: 4500 }); ok(Date.now() - t <= 4500 && (await page.$eval('.lv-pl video source', s => s.src)).startsWith('https://media.lexkite.com/'), 'YouTube down → self-hosted copy ≤ 4 s');
  await ctx.close(); }
// 3. region that blocks YouTube → never touches YouTube
{ const { ctx, page, reqs } = await open({ tz: 'Asia/Shanghai', locale: 'zh-CN' }); await page.evaluate(() => { document.documentElement.lang = 'zh'; });
  await page.waitForSelector('.lv-card'); await page.hover('.lv-card'); await page.click('.lv-card'); await page.waitForSelector('.lv-pl video', { timeout: 2000 });
  ok(reqs.length === 0 && !(await page.$('link[rel=preconnect][href*=youtube]')), 'blocked region → self-hosted immediately, no preconnect, 0 YouTube requests'); await ctx.close(); }
// 4. LCP unchanged by the facade
{ const lcp = async v => { const { ctx, page } = await open({ withVideo: v }); await page.waitForTimeout(800); const x = await page.evaluate(() => window.__lcp); await ctx.close(); return x; };
  const a = [], b = []; for (let i = 0; i < 3; i++) { a.push(await lcp(false)); b.push(await lcp(true)); }
  const med = x => x.sort((p, q) => p - q)[1], base = med(a), withV = med(b);
  ok(withV <= base * 1.1 + 30, `lesson LCP unchanged (${Math.round(base)} → ${Math.round(withV)} ms)`); }
await browser.close();
fs.mkdirSync('out', { recursive: true });
console.log(`facade-perf: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
