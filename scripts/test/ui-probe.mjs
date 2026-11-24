// Dò bố cục một route ở một khổ (gỡ lỗi giao diện trên CI): node scripts/test/ui-probe.mjs <base> <out> <route,route> <WxH> [lang] [light|dark]
// Ra: <out>/<route>.json = hộp (rect) của #view, thanh trên, #bnav, mọi phần tử position:fixed/sticky, phần tử rộng hơn khung; + ảnh <route>.png
import { chromium } from 'playwright'; import fs from 'fs';
const [BASE, OUT, ROUTES, VP = '768x1024', LANG = 'vi', SCHEME = 'light'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const [W, H] = VP.split('x').map(Number), br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, colorScheme: SCHEME, locale: LANG, reducedMotion: 'reduce' });
await ctx.route(/lexkite\.com|googletagmanager|google-analytics|pagead|cloudflareinsights/, r => r.abort());
const page = await ctx.newPage();
await page.goto(`${BASE}/app/?sandbox=1&hl=${LANG}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(200); }
const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); }
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
for (const r of ROUTES.split(',')) {
  await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + r); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => { const R = e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; };
    const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const fixed = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'sticky') && e.getBoundingClientRect().width > 0; }).map(e => ({ el: sel(e), rect: R(e), pos: getComputedStyle(e).position, disp: getComputedStyle(e).display, left: getComputedStyle(e).left, right: getComputedStyle(e).right, tr: getComputedStyle(e).transform }));
    const wide = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 8).map(e => ({ el: sel(e), rect: R(e) }));
    return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, sx: scrollX, body: { cls: document.body.className, rect: R(document.body) }, view: document.getElementById('view') ? { rect: R(document.getElementById('view')), cls: document.getElementById('view').className, first: sel(document.getElementById('view').firstElementChild || document.body) } : null,
      topbar: document.querySelector('.topbar') ? { rect: R(document.querySelector('.topbar')), disp: getComputedStyle(document.querySelector('.topbar')).display } : null, bnav: document.getElementById('bnav') ? { rect: R(document.getElementById('bnav')), disp: getComputedStyle(document.getElementById('bnav')).display } : null, fixed, wide }; });
  const n = r.replace(/[^a-z0-9]+/gi, '_'); fs.writeFileSync(`${OUT}/${n}.json`, JSON.stringify(info, null, 1)); await page.screenshot({ path: `${OUT}/${n}.png` }); console.log(r, JSON.stringify(info).slice(0, 600));
}
await br.close();
