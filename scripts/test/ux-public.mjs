// UX audit of the public entry pages (docs/UX-PUBLIC.md): /en/vocabulary/, /en/samples/, /en/speaking/ (+ vi twins) and the app
// first screen (/app/?hl=en|vi|ar). Matrix: 1280 desktop + 375 phone × light/dark × en/vi/ar (ar only where a page exists).
// Per case: first-screen screenshot + 3-screen tall shot, LCP, CLS, page weight, INP proxy (typing in the filter), axe AA,
// touch targets < 44 px (inline text links exempt, WCAG 2.5.8), horizontal scroll, h1 + primary CTA + search in the first screen.
// Runs on GitHub Actions (ux-public.yml). Usage: node scripts/test/ux-public.mjs <base> <out-dir>  → report.json + report.md + shots/
import { chromium } from 'playwright';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const BASE = (process.argv[2] || 'https://lexkite.com').replace(/\/$/, '');
const OUT = process.argv[3] || 'ux-out';
fs.mkdirSync(OUT + '/shots', { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const PAGES = {
  vocab: { en: '/en/vocabulary/', vi: '/tu-vung/', search: true },
  samples: { en: '/en/samples/', vi: '/samples/', search: true },
  speaking: { en: '/en/speaking/', vi: '/speaking/', search: true },
  app: { en: '/app/?hl=en', vi: '/app/?hl=vi', ar: '/app/?hl=ar' },
};
const VPS = { d: { width: 1280, height: 800 }, m: { width: 375, height: 812, isMobile: true, hasTouch: true } };

function probe() {
  const W = innerWidth, H = innerHeight, vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && +cs.opacity > 0 ? r : null; };
  const inFirst = e => { const r = e && vis(e); return !!r && r.top < H && r.bottom > 0; };
  const small = [];
  for (const e of document.querySelectorAll('a[href],button,input,select,summary,[role=button],[role=tab]')) {
    const r = vis(e); if (!r) continue;
    const cs = getComputedStyle(e);
    if (e.tagName === 'A' && cs.display === 'inline' && e.closest('p,td,li:not(nav li),figcaption')) continue; // inline text link: exempt
    if (r.height < 44 || r.width < 44) small.push(`${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24)}"`);
  }
  const h1 = document.querySelector('h1');
  const ctas = [...document.querySelectorAll('a.btn,button.btn,.btn-primary,a[class*=cta],button[class*=primary],.hero a,.welcome a, [data-primary]')].filter(inFirst);
  const fonts = new Set(), radii = new Set();
  for (const e of document.querySelectorAll('body *')) { const r = vis(e); if (!r || r.top > H * 3) continue; const cs = getComputedStyle(e); if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) fonts.add(cs.fontSize); if (cs.borderRadius !== '0px' && cs.borderStyle !== 'none') radii.add(cs.borderRadius); }
  const nav = performance.getEntriesByType('navigation')[0] || {}, res = performance.getEntriesByType('resource');
  return {
    title: document.title, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
    h1: h1 ? h1.innerText.trim().slice(0, 80) : '', h1First: inFirst(h1), h1Size: h1 ? getComputedStyle(h1).fontSize : '',
    ctaFirst: ctas.length, ctaText: ctas.slice(0, 3).map(e => e.innerText.trim().slice(0, 30)),
    searchFirst: inFirst(document.querySelector('input[type=search],#q')),
    hscroll: document.scrollingElement.scrollWidth > W + 1, small: small.length, smallEx: small.slice(0, 8),
    fontSizes: fonts.size, radii: radii.size, top: res.slice().sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 12).map(r => `${Math.round((r.transferSize || 0) / 1024)}KB ${r.name.replace(location.origin, '').slice(0, 70)} @${Math.round(r.startTime)}`),
    kb: Math.round((res.reduce((a, r) => a + (r.transferSize || 0), 0) + (nav.transferSize || 0)) / 1024), req: res.length + 1,
    lcp: Math.round(window.__lcp || 0), cls: +(window.__cls || 0).toFixed(3), lcpEl: window.__lcpEl || '',
  };
}

const browser = await chromium.launch();
const rows = [];
for (const [pg, def] of Object.entries(PAGES)) for (const l of ['en', 'vi', 'ar']) for (const [v, vp] of Object.entries(VPS)) for (const s of ['light', 'dark']) {
  if (!def[l]) continue;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1, colorScheme: s, locale: l, userAgent: vp.isMobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await ctx.addInitScript(() => {
    window.__cls = 0; try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lcp = e.startTime; const el = e.element; window.__lcpEl = el ? el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') : ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      window.__inp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__inp = Math.max(window.__inp, e.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) {}
  });
  const page = await ctx.newPage(), name = `${pg}-${l}-${v}-${s}`;
  const t0 = Date.now();
  await page.goto(BASE + def[l], { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(pg === 'app' ? 1800 : 600);
  await page.screenshot({ path: `${OUT}/shots/${name}.png` });
  const r = await page.evaluate(probe);
  // INP proxy: type into the list filter (static pages) and read the longest event duration
  if (def.search && await page.$('#q')) { await page.click('#q').catch(() => {}); await page.keyboard.type('env', { delay: 60 }); await page.waitForTimeout(400); r.inp = Math.round(await page.evaluate(() => window.__inp || 0)); r.filterShown = await page.evaluate(() => document.querySelectorAll('[data-k]:not([hidden])').length); r.filterMsg = await page.evaluate(() => (document.getElementById('qn') || {}).textContent || ''); await page.fill('#q', ''); }
  await page.evaluate(AXE);
  const ax = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => ({ id: x.id, n: x.nodes.length, impact: x.impact })));
  r.axe = ax.reduce((a, x) => a + x.n, 0); r.axeIds = ax.map(x => `${x.id}×${x.n}`);
  // tall shot (3 screens) for hierarchy / rhythm review
  const full = await page.evaluate(() => document.scrollingElement.scrollHeight);
  await page.screenshot({ path: `${OUT}/shots/${name}-tall.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(full, vp.height * 3) }, fullPage: true }).catch(() => {});
  rows.push({ name, pg, l, v, s, ms: Date.now() - t0, ...r });
  console.log(name, JSON.stringify({ lcp: r.lcp, cls: r.cls, kb: r.kb, axe: r.axe, small: r.small, cta: r.ctaFirst, h1: r.h1First, search: r.searchFirst, inp: r.inp }));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 1));
const md = ['| case | LCP ms | CLS | KB | axe | <44px | h1 1st | CTA 1st | search 1st | INP | fonts | hscroll |', '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.name} | ${r.lcp} | ${r.cls} | ${r.kb} | ${r.axe} ${r.axeIds.join(' ')} | ${r.small} | ${r.h1First ? '✓' : '✗'} | ${r.ctaFirst} | ${r.searchFirst ? '✓' : '–'} | ${r.inp ?? '–'} | ${r.fontSizes} | ${r.hscroll ? '✗' : '✓'} |`)];
fs.writeFileSync(`${OUT}/report.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
