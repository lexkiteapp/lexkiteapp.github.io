// UX pattern sweep of every app route (docs/UX-PUBLIC.md § App patterns): 1280 + 375 × light/dark (en, + ar phone).
// Detectors (role tokens = docs/UX-PUBLIC.md § Tokens):
//   linkrow-wrap   – a row of ≥3 secondary links/chips wrapping onto > 2 lines
//   text-token     – secondary text (.small/.muted/small/.side-foot/footer/.chip…) above 14 px, or chip/badge text above 14 px
//   empty-space    – a vertical gap with no content > 30% of the first screen
//   stacked-banner – ≥ 2 banners/notices/nudges visible in the first screen
//   card-padding   – card padding > 24 px (phone) / 32 px (desktop)
//   dup-nav        – two visible navs sharing ≥ 3 destinations
//   font-role      – the same role (tag + first class) rendered at > 1 font size on one screen
// Usage: node scripts/test/ux-sweep.mjs <base> <out> [--check]   (--check: fail when linkrow-wrap / text-token exceed scripts/test/ux-sweep.budget.json)
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = process.argv[3] || 'ux-sweep';
const CHECK = process.argv.includes('--check');
fs.mkdirSync(OUT + '/shots', { recursive: true });
export const ROUTES = ['home', 'path', 'day/1', 'review', 'vocab', 'dict/hello', 'library', 'grammar', 'tests', 'cbt', 'qstats', 'quick', 'stats', 'resources', 'method', 'me', 'settings', 'contact'];
const VPS = { d: { width: 1280, height: 800 }, m: { width: 375, height: 812, isMobile: true, hasTouch: true } };
const combos = [];
for (const v of ['d', 'm']) for (const s of ['light', 'dark']) combos.push({ v, s, l: 'en' });
combos.push({ v: 'm', s: 'light', l: 'ar' });
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important}#toast,.lkr-toast,body>canvas{display:none!important}';

function detect(mob) {
  const H = innerHeight, out = [], seen = new Set();
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return null; return r; };
  const sel = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + (e.id && !/\d/.test(e.id) ? '#' + e.id : '');
  const add = (t, e, x = '') => { const k = t + '|' + sel(e); if (seen.has(k)) return; seen.add(k); out.push({ t, k: sel(e), x: String(x || (e.innerText || '').replace(/\s+/g, ' ').trim()).slice(0, 70) }); };
  const px = e => parseFloat(getComputedStyle(e).fontSize);
  const own = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const view = document.querySelector('.view') || document.body;
  // linkrow-wrap
  for (const c of document.querySelectorAll('nav,footer,div,p,ul,section')) {
    const r = vis(c); if (!r) continue;
    const kids = [...c.children].filter(k => /^(A|BUTTON|LI|SPAN)$/.test(k.tagName) && vis(k));
    const links = kids.filter(k => k.matches('a,button') || k.querySelector(':scope>a,:scope>button'));
    if (links.length < 3 || links.length < kids.length * 0.8) continue;
    if ([...links].some(k => vis(k).height > 64)) continue; // big tiles/cards, not a link row
    const cs = getComputedStyle(c); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.display === 'grid' || cs.flexDirection === 'column') continue; // scroll rows, grids and vertical lists are fine
    const tops = new Set(links.map(k => Math.round(vis(k).top / 6)));
    if (tops.size > 2 && links.every(k => vis(k).height < 48)) add('linkrow-wrap', c, `${links.length} links on ${tops.size} lines`);
  }
  // text-token (secondary roles ≤ 14 px; chips/badges ≤ 14 px)
  for (const e of document.querySelectorAll('.small,.muted,small,.side-foot a,footer a,footer p,.hint,.chip,.tag,.pill,.badge,.me-badge,figcaption,.sub')) {
    const r = vis(e); if (!r || !own(e) && !e.matches('a')) continue;
    if (e.closest('h1,h2,.kit-say,.big,.stat-n,.btn,.lsw-b,.w-hero h1')) continue;
    const f = px(e); if (f > 14.5) add('text-token', e, `${Math.round(f)}px "${(e.innerText || '').trim().slice(0, 40)}"`);
  }
  // first-screen gaps
  const blocks = [];
  for (const e of view.querySelectorAll('*')) { if (e.children.length && !own(e) && !/^(IMG|SVG|CANVAS|VIDEO|BUTTON|INPUT|svg)$/i.test(e.tagName)) continue; const r = vis(e); if (!r || r.bottom < 0 || r.top > H) continue; blocks.push([Math.max(0, r.top), Math.min(H, r.bottom)]); }
  blocks.sort((a, b) => a[0] - b[0]); let end = blocks.length ? blocks[0][1] : 0, gap = 0;
  for (const [t, b] of blocks) { if (t > end) gap = Math.max(gap, t - end); end = Math.max(end, b); }
  if (gap > H * 0.3) add('empty-space', view, `${Math.round(gap)}px gap (${Math.round(gap / H * 100)}% of first screen)`);
  // stacked banners
  const ban = [...document.querySelectorAll('[class*=banner],[class*=notice],[class*=nudge],[class*=promo],[role=alert],.install-nudge,.offer,.rescue')].filter(e => { const r = vis(e); return r && r.top < H && r.bottom > 0 && r.height > 30 && !e.parentElement.closest('[class*=banner],[class*=notice],[class*=nudge],[class*=promo]'); });
  if (ban.length >= 2) add('stacked-banner', ban[1], ban.map(sel).join(' + '));
  // card padding
  for (const e of view.querySelectorAll('.card')) { const r = vis(e); if (!r || r.top > H * 2) continue; const cs = getComputedStyle(e), p = Math.max(parseFloat(cs.paddingLeft), parseFloat(cs.paddingTop)); if (p > (mob ? 24 : 32)) add('card-padding', e, `padding ${Math.round(p)}px`); }
  // duplicated navigation
  const navs = [...document.querySelectorAll('nav,[role=navigation],.side-foot')].filter(vis).map(n => [n, new Set([...n.querySelectorAll('a[href]')].filter(vis).map(a => a.getAttribute('href').replace(/[?#].*$/, '') || a.getAttribute('href')))]);
  for (let i = 0; i < navs.length; i++) for (let j = i + 1; j < navs.length; j++) { if (navs[i][0].contains(navs[j][0]) || navs[j][0].contains(navs[i][0])) continue; const common = [...navs[i][1]].filter(h => navs[j][1].has(h)); if (common.length >= 3) add('dup-nav', navs[j][0], `${sel(navs[i][0])} & ${sel(navs[j][0])}: ${common.slice(0, 4).join(' ')}`); }
  // font-role consistency
  const roles = new Map();
  for (const e of view.querySelectorAll('h2,h3,h4,.set-h,.small,.muted,.chip,.btn,p')) { const r = vis(e); if (!r || r.top > H * 2 || !own(e)) continue; const k = e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : ''); (roles.get(k) || roles.set(k, new Map()).get(k)).set(Math.round(px(e)), e); }
  for (const [k, m] of roles) if (m.size > 1 && !/^p$|^\.?btn/.test(k)) add('font-role', [...m.values()][1], `${k}: ${[...m.keys()].sort((a, b) => a - b).join('/')}px`);
  return out;
}

const browser = await chromium.launch();
const all = [];
for (const c of combos) {
  const vp = VPS[c.v];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: c.s, locale: c.l, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/?sandbox=1&hl=${c.l}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1500); }
  for (const route of ROUTES) {
    await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + route).catch(() => {});
    await page.waitForTimeout(900);
    await page.addStyleTag({ content: STILL }).catch(() => {});
    const tag = `${c.l}-${c.v}-${c.s}`, name = `${route.replace(/\W+/g, '_')}-${tag}`;
    if (c.s === 'light' && c.l === 'en') await page.screenshot({ path: `${OUT}/shots/${name}.png` }).catch(() => {});
    if (route === 'home' && c.v === 'd' && c.s === 'light') { // sidebar footer close-up (closed + "More" open) for before/after review
      const sf = await page.$('.side-foot');
      if (sf) { await sf.scrollIntoViewIfNeeded().catch(() => {}); const b = await sf.boundingBox(); if (b) { const clip = { x: 0, y: Math.max(0, b.y - 300), width: 360, height: Math.min(420, b.y + b.height + 20) - Math.max(0, b.y - 300) + 300 }; clip.height = Math.min(clip.height, vp.height - clip.y); await page.screenshot({ path: `${OUT}/shots/sidefoot-${tag}.png`, clip }).catch(() => {}); const more = await page.$('.sf-more>summary'); if (more) { await more.click(); await page.waitForTimeout(200); await page.screenshot({ path: `${OUT}/shots/sidefoot-open-${tag}.png`, clip }).catch(() => {}); await page.keyboard.press('Escape'); } } }
    }
    const found = await page.evaluate(detect, !!vp.isMobile).catch(e => [{ t: 'error', k: '', x: String(e.message).slice(0, 80) }]);
    for (const f of found) all.push({ route, tag, ...f });
  }
  await ctx.close();
}
await browser.close();
// group by (type, selector) → routes
const g = new Map();
for (const f of all) { const k = f.t + '|' + f.k; const x = g.get(k) || g.set(k, { t: f.t, k: f.k, x: f.x, where: new Set() }).get(k); x.where.add(`#/${f.route} ${f.tag}`); }
const rows = [...g.values()].sort((a, b) => a.t.localeCompare(b.t) || b.where.size - a.where.size);
const count = t => rows.filter(r => r.t === t).length;
const md = ['| issue | element | example | where (n) |', '|---|---|---|---|', ...rows.map(r => `| ${r.t} | \`${r.k}\` | ${r.x.replace(/\|/g, '/')} | ${[...r.where].slice(0, 4).join(', ')} (${r.where.size}) |`)];
fs.writeFileSync(`${OUT}/report.md`, md.join('\n') + '\n');
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rows.map(r => ({ ...r, where: [...r.where] })), null, 1));
const sum = Object.fromEntries(['linkrow-wrap', 'text-token', 'empty-space', 'stacked-banner', 'card-padding', 'dup-nav', 'font-role', 'error'].map(t => [t, count(t)]));
console.log(md.join('\n')); console.log('summary', JSON.stringify(sum));
if (CHECK) {
  let b = {}; try { b = JSON.parse(fs.readFileSync(new URL('./ux-sweep.budget.json', import.meta.url))); } catch (e) { /* no budget yet */ }
  const bad = ['linkrow-wrap', 'text-token'].filter(t => sum[t] > (b[t] ?? 0));
  if (bad.length) { console.error('✗ ux-sweep: ' + bad.map(t => `${t} ${sum[t]} > ${b[t] ?? 0}`).join(', ')); process.exit(1); }
  console.log('✓ ux-sweep: secondary link rows ≤ 2 lines, secondary text ≤ role token');
}
