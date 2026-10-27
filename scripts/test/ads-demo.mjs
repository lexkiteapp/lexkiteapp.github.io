// Video có thưởng web với quảng cáo DEMO THẬT của Google (GPT, ô công khai /22639388115/rewarded_web_example) – GỌI MẠNG THẬT.
// KHÔNG nằm trong npm test. CI: .github/workflows/ads-demo.yml (workflow_dispatch + hằng tuần). Không bao giờ dùng ô thật ở đây.
// Kiểm: rewardedSlotReady (có fill) · lớp phủ hiện · ghi lại granted (demo có thể cần xem hết) · CLS = 0 · đi đúng đường vỏ Ads.rewarded → run.js → GPT.
import fs from 'node:fs';
const OUT = process.env.ADS_DEMO_OUT || 'ads-demo-out';
fs.mkdirSync(OUT, { recursive: true });
const pw = await import('playwright');
// Google Chrome thật (channel 'chrome'): Chromium của Playwright thiếu codec H.264 → video demo không chạy, không bao giờ tới rewardedSlotGranted
const browser = await pw.chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"></head>
<body><main id="view"><h1>Result</h1><p>${'You got 7 of 10 right. '.repeat(30)}</p><button id="go" class="btn primary">Watch video to retry</button><p id="below">${'Keep going with your review queue. '.repeat(30)}</p></main>
<script>window.t=s=>s;localStorage.setItem('lk.cfg',JSON.stringify({at:Date.now(),v:{ads_web:'1'}}));localStorage.setItem('lk.vid','aaaaaaaa');
window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});
window.__gpt=[];window.googletag=window.googletag||{cmd:[]};googletag.cmd.push(()=>['rewardedSlotReady','rewardedSlotGranted','rewardedSlotClosed','slotRenderEnded','slotRequested','slotResponseReceived'].forEach(n=>googletag.pubads().addEventListener(n,e=>__gpt.push({n,t:Math.round(performance.now()),empty:e.isEmpty}))));</script>
<script src="/js/ads.js"></script></body></html>`;
const dev = pw.devices['Pixel 7'];
const ctx = await browser.newContext({ ...dev });
const p = await ctx.newPage(), reqs = [];
await p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })); // Playwright đặt webdriver=true → vỏ coi là bot (đúng thiết kế)
// Trang + mã của repo phục vụ tại https://ads.test; config.js được bật enabled + web.testing (ô demo) chỉ trong test này
await p.route('https://ads.test/**', r => {
  const u = new URL(r.request().url());
  if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: page });
  const f = 'web' + u.pathname; if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
  let body = fs.readFileSync(f, 'utf8');
  if (u.pathname === '/js/ads/config.js') body += '\nADS_CONFIG.enabled=true;ADS_CONFIG.web.testing=true;';
  return r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body });
});
p.on('request', r => { if (/doubleclick|googlesyndication|googletagservices|google\.com\/(pagead|ads)/.test(r.url())) reqs.push(r.url()); });
p.on('console', m => { if (m.type() === 'error') console.log('  [console]', m.text().slice(0, 200)); });
await p.goto('https://ads.test/');
const y0 = await p.evaluate(() => document.getElementById('below').getBoundingClientRect().top);
const t0 = Date.now();
// Người dùng bấm (đi qua vỏ: Ads.rewarded → tải js/ads/* → run.js → GPT)
await p.evaluate(() => { window.__res = 'pending'; Ads.rewarded('retry').then(v => { window.__res = v; }, e => { window.__res = 'err:' + e; }); });
const ready = await p.waitForFunction(() => (window.__gpt || []).some(e => e.n === 'rewardedSlotReady' || (e.n === 'slotRenderEnded' && e.empty)), null, { timeout: 25e3 }).then(() => true, () => false);
const ev1 = await p.evaluate(() => window.__gpt);
const filled = ev1.some(e => e.n === 'rewardedSlotReady');
ok(reqs.some(u => /securepubads\.g\.doubleclick\.net\/tag\/js\/gpt\.js/.test(u)), 'GPT tải từ securepubads.g.doubleclick.net (sau cổng CMP)');
ok(ready && filled, `rewardedSlotReady: quảng cáo demo có fill (${filled ? 'sau ' + (ev1.find(e => e.n === 'rewardedSlotReady').t) + ' ms trên trang' : 'không – ' + JSON.stringify(ev1)})`);
// Lớp phủ: iframe phủ gần kín màn hình, hiển thị
let overlay = false;
for (let i = 0; i < 20 && filled && !overlay; i++) {
  overlay = await p.evaluate(() => [...document.querySelectorAll('iframe, ins, div')].some(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.8 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0 && (el.tagName === 'IFRAME' || cs.position === 'fixed') && !el.closest('#view'); }));
  if (!overlay) await p.waitForTimeout(500);
}
ok(overlay, 'lớp phủ quảng cáo có thưởng hiện (makeRewardedVisible)');
await p.screenshot({ path: OUT + '/web-rewarded.png' });
// Granted: demo thường cấp thưởng sau khi xem đủ – chờ tối đa 45 s, chỉ GHI LẠI (không bắt buộc)
const granted = filled && await p.waitForFunction(() => window.__gpt.some(e => e.n === 'rewardedSlotGranted'), null, { timeout: 45e3 }).then(() => true, () => false);
await p.screenshot({ path: OUT + '/web-rewarded-after.png' });
const out = await p.evaluate(() => ({ cls: window.__cls, below: document.getElementById('below').getBoundingClientRect().top, gpt: window.__gpt, res: window.__res, ev: window.AdsRun ? AdsRun._ev() : null, consent: window.AdsRun ? AdsRun._consent() : null }));
if (filled && !granted) console.log('::warning::GPT demo: chưa có rewardedSlotGranted sau 45 s (Google không trả thưởng lần này) – chỉ cảnh báo');
console.log(`  granted: ${granted ? 'CÓ' : 'chưa (demo cần xem hết / bấm)'} · kết quả Ads.rewarded: ${out.res} · đồng ý: ${out.consent} · sự kiện run.js: ${JSON.stringify(out.ev)}`);
ok(out.ev && out.ev['req:rew'] === 1 && (!filled || out.ev['show:rew'] === 1), 'run.js đếm req:rew/show:rew đúng 1 lần');
ok(out.cls === 0 && out.below === y0, `CLS = ${out.cls}, nội dung trang không xê dịch khi lớp phủ hiện`);
fs.writeFileSync(OUT + '/web-rewarded.json', JSON.stringify({ filled, overlay, granted, ms: Date.now() - t0, ...out, reqs: reqs.length }, null, 1));
await browser.close();
console.log(fails ? `✗ ads-demo: ${fails} lỗi / ${n}` : `✓ ads-demo: ${n} kiểm tra đạt (quảng cáo demo thật của Google)`);
process.exit(fails ? 1 : 0);
