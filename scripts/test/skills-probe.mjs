// Sonde tạm (26/11): #/skills ở 390px trống trên live – theo dõi route, ux1On, #view mỗi 500 ms; Chromium + WebKit × người mới / người cũ (đã có dữ liệu)
import { chromium, webkit } from 'playwright';
import { routeCiHeader } from '../lib/http.mjs';
const BASE = 'https://lexkite.com', CI = (process.env.LEXKITE_CI_HEADER || '').trim();
for (const [bn, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  const br = await bt.launch();
  for (const mode of ['new', 'old']) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true });
    await routeCiHeader(ctx, BASE, CI);
    const pg = await ctx.newPage(), logs = [];
    pg.on('console', m => logs.push(m.type() + ':' + m.text().slice(0, 120))); pg.on('pageerror', e => logs.push('PAGEERR ' + e.message.slice(0, 160)));
    await pg.addInitScript(() => { window.__rt = []; const w = () => { if (window.App && App.route && !App.route.__w) { const o = App.route; App.route = function () { __rt.push(Math.round(performance.now()) + ' ' + location.hash); return o.apply(this, arguments); }; App.route.__w = 1; } }; const iv = setInterval(w, 5); setTimeout(() => clearInterval(iv), 15000); });
    if (mode === 'old') { await pg.goto(`${BASE}/app/?sandbox=1&hl=en#/home`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(2500); }
    const t0 = Date.now(); await pg.goto(`${BASE}/app/?sandbox=1&hl=en#/skills`, { waitUntil: 'load' }).catch(e => logs.push('goto ' + e.message));
    const tl = [];
    for (let i = 0; i < 20; i++) { await pg.waitForTimeout(500); tl.push(await pg.evaluate(() => `${(document.querySelector('#view') || { innerText: '' }).innerText.trim().length}/${window.App && App.ux1On ? +!!App.ux1On() : 'x'}/${document.body.className}/${typeof (window.App && App.skillsV2)}/${(window.__rt || []).length}`).catch(e => 'ERR')); }
    console.log(`### ${bn} ${mode} 390px\ntimeline(view/ux1On/bodyclass/skillsV2/routeCalls): ${[...new Set(tl)].join(' → ')}\nroutes: ${await pg.evaluate(() => (window.__rt || []).join(' | ')).catch(() => '?')}\nlogs: ${logs.slice(-12).join(' ¦ ')}`);
    await ctx.close();
  }
  await br.close();
}
