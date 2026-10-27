// Ô quảng cáo trong Chromium thật: CLS = 0 khi quảng cáo về muộn / không có quảng cáo, không yêu cầu quảng cáo trước khi CMP trả lời,
// EEA từ chối → không gọi quảng cáo, DNT → không cá nhân hóa. Trang nội dung tĩnh THẬT (bài blog dài có ô giữa bài + trang từ điển, dựng bằng
// build-blog.mjs / scripts/dict/build.mjs với config thử): CLS = 0 ở 390px, cả khi có quảng cáo lẫn khi ô bị ẩn (nhóm đối chứng). AdSense được giả lập (route) – 0 mạng thật. CI: .github/workflows/dist-ui.yml
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
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

// ---------- Trang nội dung tĩnh thật: blog dài (ô giữa + cuối bài) + trang từ điển ----------
{ const T = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-cls-')), cfgF = path.join(T, 'cfg.js');
  fs.writeFileSync(cfgF, rd('web/js/ads/config.js').replace('enabled: false', 'enabled: true').replace(/client: '[^']*'/, "client: 'ca-pub-0000000000000000'").replace(/slots: \{[^}]*\}/, "slots: { home: '', blog: '111', blog_mid: '222', dict: '333', done: '' }"));
  const sh = (f, env) => execFileSync(process.execPath, [f], { env: { ...process.env, BLOG_SKIP_CHECK: '1', ADS_CONFIG_FILE: cfgF, ...env }, stdio: 'pipe' });
  sh('scripts/build-blog.mjs', { BLOG_OUT: path.join(T, 'b') }); sh('scripts/dict/build.mjs', { DICT_OUT: path.join(T, 'd'), DICT_POOL: '40' });
  const find = (dir, re) => { const out = []; const walk = x => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const q = path.join(x, e.name); if (e.isDirectory()) walk(q); else if (e.name === 'index.html' && re.test(rd(q))) out.push(q); } }; walk(dir); return out; };
  const blogF = find(path.join(T, 'b', 'vi', 'blog'), /data-ad="blog_mid"/).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
  const dictF = find(path.join(T, 'd', 'assets', 'en'), /data-ad="dict"/)[0];
  const P = {}; P.self = P; vm.createContext(P); vm.runInContext(rd('web/js/ads/policy.js'), P);
  let hv = 'h0'; for (let i = 0; P.AdsPolicy.cohort(hv) !== 'h'; i++) hv = 'h' + i + 'zzzzzzz';
  let av = 'aaaaaaaa'; for (let i = 0; P.AdsPolicy.cohort(av) !== 'a'; i++) av = 'a' + i + 'zzzzzzz';
  async function stat(file, urlPath, vid) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
    await p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
    await p.addInitScript(v => { localStorage.setItem('lk.vid', v); window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); }, vid);
    await p.route(/^https:\/\/(?!ads\.test\/|pagead2\.googlesyndication\.com\/)/, r => r.abort()); // ảnh CDN, font… → 0 mạng thật (ảnh có width/height sẵn)
    await p.route('https://pagead2.googlesyndication.com/**', r => r.fulfill({ contentType: 'text/javascript', body: `(function(){var q=window.adsbygoogle=window.adsbygoogle||[];q.push=function(o){if(o&&o.params)return;var ins=document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');if(!ins)return;ins.setAttribute('data-adsbygoogle-status','done');
      setTimeout(function(){var f=document.createElement('iframe');f.style.cssText='width:300px;height:250px;border:0';ins.appendChild(f);ins.setAttribute('data-ad-status','filled')},600)};})();` }));
    await p.route('https://ads.test/**', r => { const u = new URL(r.request().url());
      if (u.pathname === urlPath) return r.fulfill({ contentType: 'text/html', body: rd(file) });
      if (u.pathname === '/api/config') return r.fulfill({ contentType: 'application/json', body: '{"ads_web":"1"}' });
      if (u.pathname === '/js/ads/config.js') return r.fulfill({ contentType: 'text/javascript', body: rd(cfgF) });
      const f = 'web' + u.pathname; return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : f.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
    await p.goto('https://ads.test' + urlPath, { waitUntil: 'load' });
    // cuộn để ô (đầu tiên) nằm giữa màn hình TRƯỚC khi quảng cáo về → mọi xê dịch đều bị tính
    await p.evaluate(() => { const h = document.querySelector('.ad-hold'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 300); });
    const y0 = await p.evaluate(() => { const h = document.querySelector('.ad-hold'); return Math.round(h.nextElementSibling.getBoundingClientRect().top); });
    await p.waitForTimeout(6500); // load → rảnh 3 s → static.js → policy/run → AdSense giả (600 ms)
    const out = await p.evaluate(() => { const h = document.querySelector('.ad-hold'), a = h.querySelector('.ad-slot'); return { cls: window.__cls, y: Math.round(h.nextElementSibling.getBoundingClientRect().top), hh: Math.round(h.getBoundingClientRect().height), filled: !!a.querySelector('ins[data-ad-status="filled"]'), hidden: a.hidden, n: document.querySelectorAll('.ad-slot').length }; });
    await ctx.close(); return { ...out, y0 };
  }
  const bp = '/' + path.relative(path.join(T, 'b'), path.dirname(blogF)).split(path.sep).join('/') + '/', dp = '/' + path.relative(path.join(T, 'd', 'assets'), path.dirname(dictF)).split(path.sep).join('/') + '/';
  { const r = await stat(blogF, bp, av); ok(r.filled && r.cls === 0 && r.y === r.y0 && r.hh === 290 && r.n === 2, `blog dài ${bp} (390px): ô giữa bài có quảng cáo, CLS = ${r.cls}, khung 290px, nội dung dưới ô không xê dịch, ${r.n} ô/bài`); }
  { const r = await stat(blogF, bp, hv); ok(r.hidden && r.cls === 0 && r.y === r.y0 && r.hh === 290, `blog dài, nhóm đối chứng (ô bị ẩn): khung vẫn giữ 290px, CLS = ${r.cls}`); }
  { const r = await stat(dictF, dp, av); ok(r.filled && r.cls === 0 && r.y === r.y0 && r.hh === 290 && r.n === 1, `trang từ điển ${dp} (390px): 1 ô có quảng cáo, CLS = ${r.cls}, nội dung dưới ô không xê dịch`); }
  { const r = await stat(dictF, dp, hv); ok(r.hidden && r.cls === 0 && r.y === r.y0, `trang từ điển, nhóm đối chứng: CLS = ${r.cls}`); }
  fs.rmSync(T, { recursive: true, force: true }); }
await browser.close();
console.log(fails ? `✗ ads-cls: ${fails} lỗi / ${n}` : `✓ ads-cls: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
