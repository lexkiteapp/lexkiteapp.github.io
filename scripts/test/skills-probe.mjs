// Sonde tạm (26/11): #/skills ở 390px trống trên live – theo dõi route, ux1On, #view mỗi 500 ms; Chromium + WebKit × người mới / người cũ (đã có dữ liệu)
import { chromium, webkit } from 'playwright';
import { routeCiHeader } from '../lib/http.mjs';
const BASE = 'https://lexkite.com', CI = (process.env.LEXKITE_CI_HEADER || '').trim();
for (const [bn, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  const br = await bt.launch();
  for (const mode of ['exact', 'exactload']) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true });
    await routeCiHeader(ctx, BASE, CI);
    const pg = await ctx.newPage(), logs = [];
    pg.on('console', m => logs.push(m.type() + ':' + m.text().slice(0, 120))); pg.on('pageerror', e => logs.push('PAGEERR ' + e.message.slice(0, 160)));
    await pg.addInitScript(() => { window.__rt = []; const w = () => { if (window.App && App.route && !App.route.__w) { const o = App.route; App.route = function () { __rt.push(Math.round(performance.now()) + ' ' + location.hash); return o.apply(this, arguments); }; App.route.__w = 1; } }; const iv = setInterval(w, 5); setTimeout(() => clearInterval(iv), 15000); });
    if (mode === 'old') { await pg.goto(`${BASE}/app/?sandbox=1&hl=en#/home`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(2500); }
    const t0 = Date.now(), T = () => Date.now() - t0, snap = () => pg.evaluate(() => `${(document.querySelector('#view') || { innerText: '' }).innerText.trim().length}/${window.App && App.ux1On ? +!!App.ux1On() : 'x'}`).catch(() => 'ERR'), ck = [];
    if (mode.startsWith('exact')) { await pg.goto(`${BASE}/app/?sandbox=1&hl=en#/skills`, { waitUntil: mode === 'exact' ? 'networkidle' : 'load', timeout: 45000 }); ck.push('idle@' + T() + ' ' + await snap()); await pg.waitForTimeout(1500); ck.push('+1.5s@' + T() + ' ' + await snap());
      await pg.evaluate(async () => { const h = document.scrollingElement.scrollHeight; for (let y = 0; y < Math.min(h, 12000); y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); ck.push('scrolled@' + T() + ' ' + await snap()); await pg.waitForTimeout(800); ck.push('end@' + T() + ' ' + await snap()); for (let k = 0; k < 8; k++) { await pg.waitForTimeout(1000); ck.push('+' + (k + 1) + 's@' + T() + ' ' + await snap()); }
      ck.push(await pg.evaluate(() => `rs=${document.readyState} app=${typeof window.App} js=` + performance.getEntriesByType('resource').filter(e => /\.js/.test(e.name)).map(e => e.name.split('/').pop().slice(0, 14) + ':' + Math.round(e.startTime) + '-' + Math.round(e.responseEnd)).slice(0, 14).join(',') + ' sw=' + (navigator.serviceWorker && navigator.serviceWorker.controller ? 1 : 0))); console.log(`### ${bn} exact: ${ck.join(' | ')} | nav entries: ${await pg.evaluate(() => performance.getEntriesByType('navigation').length + ' reload=' + performance.getEntriesByType('navigation')[0].type)}`); await ctx.close(); continue; }
    await pg.goto(`${BASE}/app/?sandbox=1&hl=en#/skills`, { waitUntil: 'load' }).catch(e => logs.push('goto ' + e.message));
    const tl = [];
    for (let i = 0; i < 20; i++) { await pg.waitForTimeout(500); tl.push(await pg.evaluate(() => `${(document.querySelector('#view') || { innerText: '' }).innerText.trim().length}/${window.App && App.ux1On ? +!!App.ux1On() : 'x'}/${document.body.className}/${typeof (window.App && App.skillsV2)}/${(window.__rt || []).length}`).catch(e => 'ERR')); }
    console.log(`### ${bn} ${mode} 390px\ntimeline(view/ux1On/bodyclass/skillsV2/routeCalls): ${[...new Set(tl)].join(' → ')}\nroutes: ${await pg.evaluate(() => (window.__rt || []).join(' | ')).catch(() => '?')}\nlogs: ${logs.slice(-12).join(' ¦ ')}`);
    await ctx.close();
  }
  await br.close();
}
