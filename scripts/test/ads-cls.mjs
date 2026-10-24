// Ô quảng cáo trong Chromium thật: CLS = 0 khi quảng cáo về muộn / không có quảng cáo, không yêu cầu quảng cáo trước khi CMP trả lời,
// EEA từ chối → không gọi quảng cáo, DNT → không cá nhân hóa. AdSense được giả lập (route) – 0 mạng thật. CI: .github/workflows/dist-ui.yml
import fs from 'node:fs';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('ads-cls: playwright not installed – skipped'); process.exit(0); }
const browser = await pw.chromium.launch().catch(e => { console.log('ads-cls: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const rd = f => fs.readFileSync(f, 'utf8');
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"></head>
<body><main id="view"><h1>Today</h1><p>${'Your review queue and streak. '.repeat(30)}</p><div id="slotHere"></div><p id="below">${'More content below the ad. '.repeat(30)}</p></main>
<script>window.t=s=>s==='Quảng cáo'?'Advertisement':s;localStorage.setItem('lk.cfg',JSON.stringify({at:Date.now(),v:{ads_web:'1'}}));localStorage.setItem('lk.vid','aaaaaaaa');
window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});</script>
<script src="/js/ads.js"></script><script>document.getElementById('slotHere').outerHTML=Ads.slot('home')</script>
<script>window.ADS_CONFIG_OVERRIDE=1</script><script src="/js/ads/config.js"></script><script>ADS_CONFIG.enabled=true;ADS_CONFIG.web.client='ca-pub-0000000000000000';ADS_CONFIG.web.slots.home='1234567890'</script>
<script src="/js/ads/policy.js"></script><script src="/js/ads/run.js"></script></body></html>`;
async function run({ cmp = 'none', fill = true, dnt = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: dnt ? { DNT: '1' } : {} }), p = await ctx.newPage(), reqs = [];
  await p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })); // Playwright đặt webdriver=true → vỏ coi là bot và tắt (đúng thiết kế); giả lập người thật
  if (dnt) await p.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
  await p.route('https://pagead2.googlesyndication.com/**', r => r.fulfill({ contentType: 'text/javascript', body: `
    (function(){var q=window.adsbygoogle=window.adsbygoogle||[];var cmp=${JSON.stringify(cmp)};
      if(cmp!=='none')window.__tcfapi=function(c,v,cb){setTimeout(function(){cb(cmp==='gdpr-deny'?{gdprApplies:true,eventStatus:'useractioncomplete',purpose:{consents:{}}}:cmp==='gdpr-ok'?{gdprApplies:true,eventStatus:'useractioncomplete',purpose:{consents:{1:true,3:true,4:true}}}:{gdprApplies:false},true)},300)};
      var real=q.push.bind(q);q.push=function(o){window.__pushes=(window.__pushes||[]).concat([{o:o,paused:q.pauseAdRequests,npa:q.requestNonPersonalizedAds}]);
        if(o&&o.params)return;var ins=document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');if(!ins)return;ins.setAttribute('data-adsbygoogle-status','done');
        setTimeout(function(){if(${fill}){var f=document.createElement('iframe');f.style.cssText='width:300px;height:250px;border:0';ins.appendChild(f);ins.setAttribute('data-ad-status','filled')}else ins.setAttribute('data-ad-status','unfilled')},800)};})();` }));
  await p.route('https://ads.test/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: page }); const f = 'web' + u.pathname; return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: rd(f) }) : r.fulfill({ status: 404, body: '' }); });
  p.on('request', r => { if (/googlesyndication/.test(r.url())) reqs.push(r.url()); });
  await p.goto('https://ads.test/');
  const y0 = await p.evaluate(() => document.getElementById('below').getBoundingClientRect().top);
  await p.evaluate(() => AdsRun.start());
  await p.waitForTimeout(4500);
  const out = await p.evaluate(() => ({ cls: window.__cls, pushes: window.__pushes || [], below: document.getElementById('below').getBoundingClientRect().top, label: (document.querySelector('.ad-slot') || {}).getAttribute && document.querySelector('.ad-slot').getAttribute('aria-label'), h: document.querySelector('.ad-slot').getBoundingClientRect().height }));
  await ctx.close(); return { ...out, y0, reqs };
}
{ const r = await run({ cmp: 'none' }); ok(r.cls === 0 && r.below === r.y0, `ngoài EEA, có quảng cáo: CLS = ${r.cls}, nội dung dưới ô không xê dịch`); ok(r.label === 'Advertisement' && Math.round(r.h) === 290, 'ô có nhãn Advertisement, cao cố định 290px');
  ok(r.pushes.some(x => !x.o.params && x.paused === 0), 'yêu cầu quảng cáo chỉ sau khi hết tạm dừng (pauseAdRequests = 0)'); }
{ const r = await run({ cmp: 'none', fill: false }); ok(r.cls === 0 && r.below === r.y0, `không có quảng cáo (unfilled): CLS = ${r.cls}`); }
{ const r = await run({ cmp: 'gdpr-deny' }); ok(!r.pushes.some(x => !x.o.params), 'EEA từ chối: không gửi yêu cầu quảng cáo'); ok(r.cls === 0, 'EEA từ chối: CLS = 0'); }
{ const r = await run({ cmp: 'gdpr-ok' }); ok(r.pushes.some(x => !x.o.params && !x.npa), 'EEA đồng ý: quảng cáo cá nhân hóa được phép'); }
{ const r = await run({ cmp: 'none', dnt: true }); ok(r.pushes.some(x => !x.o.params && x.npa === 1) && r.pushes.some(x => x.o.params && x.o.params.google_restrict_data_processing === 1), 'Do Not Track: không cá nhân hóa + hạn chế xử lý dữ liệu'); }
await browser.close();
console.log(fails ? `✗ ads-cls: ${fails} lỗi / ${n}` : `✓ ads-cls: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
