// Audit tổng – quét trình duyệt một shard, ghi số đo THÔ (chấm ở score.mjs). Chỉ chạy trên CI. Tái dùng đầu dò có sẵn: QAB (qa-bot/detect.js), LKJM (journey-matrix/probe.js), axe, noProd.
// Dùng: node scripts/audit/scan.mjs --kind app|page|ext --shard 0/12 [--root dist] [--out out/audit] [--only id,id]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../quality/serve.mjs';
import { noProd } from '../test/lib/no-prod.mjs';
import { HUBS } from '../test/lib/learn-samples.mjs';
import { LEARNER, EMPTY, NEWBIE, seedOf } from '../test/lib/seeds.mjs';
import { appItems, pageItems, extItems, shardOf } from './items.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const KIND = arg('kind', 'app'), ROOT = path.resolve(arg('root', 'dist')), OUT = path.resolve(arg('out', 'out/audit')), [SI, SN] = arg('shard', '0/1').split('/').map(Number), ONLY = arg('only', '');
const LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
const req = createRequire(import.meta.url), AXE = fs.readFileSync(req.resolve('axe-core'), 'utf8');
const DETECT = fs.readFileSync(new URL('../test/qa-bot/detect.js', import.meta.url), 'utf8'), PROBE = fs.readFileSync(new URL('../test/journey-matrix/probe.js', import.meta.url), 'utf8');
const LCP = 'try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:"largest-contentful-paint",buffered:true})}catch(e){}';
const NET_NOISE = /Failed to load resource|net::ERR_|ERR_INTERNET_DISCONNECTED|ERR_FAILED/;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = id => id.replace(/[^\w.-]+/g, '_');
fs.mkdirSync(OUT + '/shots', { recursive: true });

const INIT = seed => { try { for (const [k, v] of Object.entries(seed)) if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* */ } window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String((e.reason && e.reason.message) || e.reason).slice(0, 200))); };
const srv = KIND === 'ext' ? null : await serve(ROOT, 0), O = srv ? srv.origin : '';
const browser = KIND === 'ext' ? null : await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const VARIANTS = [{ tag: '390l', w: 390, h: 844, th: 'light' }, { tag: '390d', w: 390, h: 844, th: 'dark' }, { tag: '1440l', w: 1440, h: 900, th: 'light' }, { tag: '1440d', w: 1440, h: 900, th: 'dark' }];

async function context({ w = 390, h = 844, th = 'light', seed = LEARNER, media = true } = {}) {
  const mobile = w < 500;
  const ctx = await browser.newContext({ ...(mobile ? devices['Pixel 7'] : {}), viewport: { width: w, height: h }, screen: { width: w, height: h }, colorScheme: th, locale: 'en-US', serviceWorkers: 'block' });
  await noProd(ctx);
  await ctx.route(u => !u.href.startsWith(O) && !/lexkite\.com$/.test(u.hostname), r => r.fulfill({ status: 204, body: '' }));
  if (!media) await ctx.route(/(media|audio)\.lexkite\.com/, r => r.fulfill({ status: 204, body: '' }));
  await ctx.addInitScript(INIT, { ...seedOf('sbx.', { ...seed, settings: { ...seed.settings, theme: th } }), 'lk.exitbar': '1' });
  for (const s of [DETECT, PROBE, AXE, LCP]) await ctx.addInitScript(s);
  return ctx;
}
function track(page) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !NET_NOISE.test(m.text())) errs.push(m.text().slice(0, 200)); });
  return errs;
}
const appUrl = (hash, lang = 'en') => `${O}/app/?sandbox=1&hl=${lang}#${hash}`;
const ready = page => page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view > :not(.skel-page):not(.skel-study)'), null, { timeout: 15000 }).catch(() => {}).then(() => sleep(900));
const painted = page => page.evaluate(() => { const v = document.querySelector('#view'); return { viewText: (v || document.body).innerText.trim().length, err: !!(v && v.querySelector('.err-state')), skel: !!(v && v.querySelector('.skel-page,.skel-study,.skel')) }; });
const scanNow = page => page.evaluate(async () => {
  const scan = window.QAB ? QAB.scan({ tap: 44, align: [] }) : [];
  const axe = await window.axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] }).then(a => a.violations.flatMap(v => v.nodes.map(n => n.target.join(' '))).slice(0, 40)).catch(() => []);
  return { scan: scan.map(i => ({ k: i.k, sev: i.sev, sig: i.sig, msg: i.msg })).slice(0, 80), axe };
});
const rejections = page => page.evaluate(() => window.__rej || []).catch(() => []);
const go = (page, url) => page.goto(url, { waitUntil: 'load', timeout: 45000 });

async function resolveHash(item) { // route cần tham số: lấy bài đầu tiên ở trang trung tâm (cùng cách exit-sweep/nav-sweep)
  if (item.hash !== '/' + item.route || !HUBS[item.route]) return item.hash;
  const ctx = await context(), page = await ctx.newPage();
  try {
    for (const hub of HUBS[item.route]) {
      await go(page, appUrl('/' + hub)); await ready(page);
      const h = await page.evaluate(r => { const a = document.querySelector(`#view a[href^="#/${r}/"]`); return a && a.getAttribute('href').slice(1); }, item.route);
      if (h) return h;
    }
  } catch { /* */ } finally { await ctx.close(); }
  return item.hash;
}

async function measureVariant(item, v, target) {
  const ctx = await context({ ...v, seed: item.fresh ? NEWBIE : LEARNER }), page = await ctx.newPage(), errs = track(page);
  try {
    await page.setDefaultTimeout(8000);
    const resp = await go(page, target); if (item.kind === 'app') await ready(page); else await sleep(1400);
    const m = { tag: v.tag, ...await scanNow(page), painted: await painted(page), errs };
    if (resp && resp.status() >= 400) m.painted.err = true;
    for (const e of await rejections(page)) errs.push(e);
    const shot = `shots/${slug(item.id)}-${v.tag}.jpg`;
    await page.screenshot({ path: path.join(OUT, shot), type: 'jpeg', quality: 70, scale: 'css' });
    m.shot = shot;
    if (v.tag === '390l' && item.kind === 'app') m.cta = await tryCta(page);
    return m;
  } finally { await ctx.close(); }
}
async function tryCta(page) {
  const h = await page.evaluateHandle(() => { const e = [...document.querySelectorAll('#view .btn.primary, #view button.primary')].find(x => { const r = x.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !x.disabled; }); if (e) { window.__mut = 0; new MutationObserver(() => window.__mut++).observe(document.body, { subtree: true, childList: true, attributes: true }); } return e; });
  const el = h.asElement(); if (!el) return { found: false };
  const label = (await el.innerText().catch(() => '')).slice(0, 40), url0 = page.url();
  await el.click({ timeout: 3000 }).catch(() => {}); await sleep(1200);
  const live = page.url() !== url0 || await page.evaluate(() => window.__mut > 0).catch(() => true);
  return { found: true, live, label };
}

async function perf(item, target) {
  const ctx = await context({ media: false }), page = await ctx.newPage();
  try {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 90 * 1024 }); // Fast-4G như Lighthouse di động
    await page.goto(target, { waitUntil: 'load', timeout: 60000 }); if (item.kind === 'app') await ready(page); await sleep(2500);
    const p = await page.evaluate(() => { const q = window.QAB ? QAB.perf() : { cls: 0, long: [] }; return { lcp: Math.round(window.__lcp || 0), cls: q.cls, tbt: q.long.reduce((a, x) => a + Math.max(0, x.d - 50), 0) }; });
    return p.lcp ? p : null;
  } catch { return null; } finally { await ctx.close(); }
}

async function states(item, hash) {
  const out = {};
  const verdict = (name, p, extra) => { out[name] = { ok: p.ok, msg: p.msg, ...extra }; };
  // Rỗng: người học chưa có dữ liệu
  { const ctx = await context({ seed: EMPTY }), page = await ctx.newPage(), errs = track(page);
    try { await go(page, appUrl(hash)); await ready(page); await sleep(800); const p = await painted(page); verdict('empty', { ok: p.viewText > 0 && !p.err && !p.skel && !errs.length, msg: p.viewText ? (p.skel ? 'kẹt skeleton' : p.err ? 'báo lỗi' : errs[0] || '') : 'màn trống' }); } catch (e) { out.empty = { ok: null, msg: String(e.message).slice(0, 80) }; } finally { await ctx.close(); } }
  // Lỗi: API + kho nội dung hỏng → phải có nội dung hoặc thông báo, không trắng/kẹt
  { const ctx = await context(), page = await ctx.newPage(), errs = track(page);
    await ctx.route(u => /\/api\//.test(u.pathname), r => r.fulfill({ status: 500, body: '{}' }));
    await ctx.route(u => /\/(cpack|packs|data)\//.test(u.pathname), r => r.abort());
    try { await go(page, appUrl(hash)); await ready(page); await sleep(4000); const p = await painted(page), rej = await rejections(page); const unc = errs.filter(e => !/Failed|fetch|500|load/i.test(e)).concat(rej.filter(e => !/fetch|network|load/i.test(e))); verdict('error', { ok: (p.viewText > 0 || p.err) && !p.skel && !unc.length, msg: p.skel ? 'kẹt skeleton khi mạng lỗi' : p.viewText || p.err ? (unc[0] || '') : 'trắng khi mạng lỗi' }); } catch (e) { out.error = { ok: null, msg: String(e.message).slice(0, 80) }; } finally { await ctx.close(); } }
  // Đang tải: chậm 1,5 s phải thấy skeleton/nội dung sau 0,5 s, không màn trắng
  { const ctx = await context(), page = await ctx.newPage();
    try { await go(page, appUrl('/me')); await ready(page);
      await ctx.route(u => /\/(cpack|packs|data|js)\//.test(u.pathname), async r => { await sleep(1500); await r.continue().catch(() => {}); });
      await page.evaluate(h => { location.hash = h; }, hash); await sleep(500); const p = await painted(page); verdict('loading', { ok: p.viewText > 0 || p.skel, msg: p.viewText || p.skel ? '' : 'trắng trong lúc tải' });
    } catch (e) { out.loading = { ok: null, msg: String(e.message).slice(0, 80) }; } finally { await ctx.close(); } }
  return out;
}

async function exitChecks(hash) { // cùng tiêu chí exit-sweep: màn học phải có [data-exit] ≥ 44, thoát được bằng nút / Esc / back
  const open = async () => { const ctx = await context(), page = await ctx.newPage(); await go(page, appUrl('/home')); await ready(page); await page.evaluate(h => { location.hash = h; }, hash); await page.waitForFunction(() => document.body.classList.contains('lk-learn') && document.querySelector('#view [data-exit]'), null, { timeout: 7000 }).catch(() => {}); await sleep(400); return { ctx, page }; };
  const isLearn = p => p.evaluate(() => document.body.classList.contains('lk-learn'));
  const left = async p => { await sleep(600); const go2 = await p.$('#modal:not([hidden]) [data-exit-go]'); if (go2) { await go2.click().catch(() => {}); await sleep(600); } return !(await isLearn(p)) && !p.url().endsWith('#' + hash); };
  const a = await open(); const r = {};
  try {
    if (!(await isLearn(a.page))) return { na: true };
    const box = await a.page.evaluate(() => { const e = document.querySelector('#view [data-exit]'), b = e && e.getBoundingClientRect(); return b ? { w: b.width, h: b.height } : null; });
    r.button = !!box && box.w >= 44 && box.h >= 44;
    if (box) { await a.page.click('#view [data-exit]', { timeout: 3000 }).catch(() => {}); r.click = await left(a.page); }
  } catch { /* */ } finally { await a.ctx.close(); }
  for (const [k, fn] of [['esc', p => p.keyboard.press('Escape')], ['back', p => p.evaluate(() => history.back())]]) {
    const b = await open().catch(() => null); if (!b) continue;
    try { await fn(b.page); r[k] = await left(b.page); } catch { /* */ } finally { await b.ctx.close(); }
  }
  return r;
}

async function i18nApp(hash) {
  const out = [], ctx = await context(), page = await ctx.newPage();
  try {
    for (const lang of LANGS) {
      try {
        await page.goto('about:blank'); await go(page, appUrl(hash, lang)); await ready(page);
        const r = await page.evaluate(l => ({ leak: window.LKJM ? LKJM.leak(l) : null, h: document.documentElement.scrollWidth > innerWidth + 1 }), lang);
        if (r.leak) out.push({ lang, leak: [...r.leak.slice(0, 6), ...(r.h ? ['cuộn ngang'] : [])], ok: !r.leak.length && !r.h });
      } catch { /* ngôn ngữ này chưa đo */ }
    }
  } finally { await ctx.close(); }
  return out;
}
async function i18nPage(item) {
  const out = [], ctx = await context(), page = await ctx.newPage();
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  try {
    for (const [lang, url] of Object.entries(item.langs || {})) {
      try {
        await go(page, O + url);
        const r = await page.evaluate(vi => ({ hl: document.documentElement.lang, h: document.documentElement.scrollWidth > innerWidth + 1, vi: document.documentElement.lang.slice(0, 2) !== 'vi' && new RegExp(vi, "i").test(document.body.innerText) }), VI.source);
        out.push({ lang, leak: [r.hl.split('-')[0] !== lang && `lang="${r.hl}"`, r.vi && 'chữ Việt', r.h && 'cuộn ngang'].filter(Boolean), ok: r.hl.split('-')[0] === lang && !r.vi && !r.h });
      } catch { /* */ }
    }
  } finally { await ctx.close(); }
  return out;
}
async function links(item) {
  const ctx = await context(), page = await ctx.newPage(), bad = [];
  try {
    await go(page, O + item.url);
    const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0]))].slice(0, 50));
    for (const h of hrefs) { if (!h) continue; const r = await ctx.request.get(O + h, { maxRedirects: 3 }).catch(() => null); if (!r || r.status() >= 400) bad.push(h); }
    return { checked: hrefs.length, bad };
  } catch { return null; } finally { await ctx.close(); }
}

async function scanApp(item) {
  const hash = await resolveHash(item), target = appUrl(hash), rec = { ...item, resolved: hash, variants: [], shots: {} };
  for (const v of VARIANTS) { const m = await measureVariant(item, v, target); rec.shots[v.tag] = m.shot; delete m.shot; if (m.cta) { rec.cta = m.cta; delete m.cta; } rec.variants.push(m); }
  rec.perf = await perf(item, target); rec.states = await states(item, hash); rec.exit = await exitChecks(hash); rec.i18n = await i18nApp(hash);
  return rec;
}
async function scanPage(item) {
  const target = O + item.url, rec = { ...item, variants: [], shots: {} };
  for (const v of VARIANTS) { const m = await measureVariant(item, v, target); rec.shots[v.tag] = m.shot; delete m.shot; rec.variants.push(m); }
  rec.perf = await perf(item, target); rec.exit = { na: true }; rec.links = await links(item); rec.i18n = await i18nPage(item);
  return rec;
}

const testPage = (() => { let p; return () => p ||= new Promise(res => { const s = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><p style="font:20px sans-serif;margin:80px">The sustainable budget is a resilience plan.</p>'); }).listen(0, '127.0.0.1', () => { s.unref(); res({ port: s.address().port }); }); }); })();
async function scanExt(list) { // Add-on thật trong Chromium (cùng cách nạp ext-e2e)
  const EXT = path.resolve('extension'), out = [];
  for (const th of ['light', 'dark']) {
    const prof = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'audit-ext-'));
    const ctx = await chromium.launchPersistentContext(prof, { channel: 'chromium', headless: true, colorScheme: th, locale: 'en-US', viewport: { width: 1280, height: 860 }, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
    for (const s of [DETECT, PROBE, AXE]) await ctx.addInitScript(s);
    let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 30000 });
    const base = `chrome-extension://${new URL(sw.url()).host}/`;
    await sw.evaluate(() => chrome.storage.local.set({ uiLang: 'en' })).catch(() => {}); await sleep(1000);
    for (const item of list.filter(i => !i.bubble)) {
      const rec = out.find(r => r.id === item.id) || (out.push({ ...item, variants: [], shots: {}, exit: item.route ? undefined : { na: true } }), out.at(-1));
      for (const w of [390, 1280]) {
        const tag = `${w}${th[0]}`, page = await ctx.newPage(), errs = track(page);
        try {
          await page.setViewportSize({ width: w, height: 860 });
          await page.goto(base + item.page, { waitUntil: 'load', timeout: 30000 }); await sleep(item.route ? 2200 : 1200);
          const m = { tag, ...await scanNow(page), painted: await painted(page), errs };
          const shot = `shots/${slug(item.id)}-${tag}.jpg`; await page.screenshot({ path: path.join(OUT, shot), type: 'jpeg', quality: 70, scale: 'css' });
          rec.shots[tag] = shot; rec.variants.push(m);
        } catch (e) { rec.fatal = String(e.message).slice(0, 100); } finally { await page.close(); }
      }
    }
    const bubble = list.find(i => i.bubble);
    if (bubble) {
      const rec = out.find(r => r.id === bubble.id) || (out.push({ ...bubble, variants: [], shots: {}, exit: { na: true } }), out.at(-1));
      const page = await ctx.newPage(), errs = track(page), tag = `1280${th[0]}`;
      try {
        await page.goto(`http://127.0.0.1:${(await testPage()).port}/`); await sleep(800); // content script chỉ chạy trên http(s)
        await page.dblclick('p', { position: { x: 60, y: 10 } }); await sleep(3000);
        const t = await page.evaluate(() => { const h = document.querySelector('ielts-lexi-popup'), b = h && h.shadowRoot && h.shadowRoot.querySelector('.box'); return b && !b.hidden ? b.innerText.trim().length : 0; });
        if (t) { const shot = `shots/${slug(bubble.id)}-${tag}.jpg`; await page.screenshot({ path: path.join(OUT, shot), type: 'jpeg', quality: 70, scale: 'css' }); rec.shots[tag] = shot; rec.variants.push({ tag, painted: { viewText: t }, errs, scan: [], axe: [] }); } else rec.fatal = 'bong bóng không mở trong môi trường đo';
      } catch (e) { rec.fatal = String(e.message).slice(0, 100); } finally { await page.close(); }
    }
    await ctx.close();
  }
  return out;
}

const all = KIND === 'app' ? appItems('.') : KIND === 'page' ? pageItems(ROOT) : extItems();
fs.writeFileSync(path.join(OUT, `items-${KIND}.json`), JSON.stringify(all)); // danh sách đầy đủ cho report (kể cả mục shard hỏng → "chưa đo")
const list = ONLY ? all.filter(i => ONLY.split(',').includes(i.id)) : shardOf(all, SI, SN);
const started = Date.now(); let results = [];
if (KIND === 'ext') results = await scanExt(list);
else for (const item of list) {
  let rec;
  for (let attempt = 0; attempt < 2 && !rec; attempt++) {
    try { rec = await (KIND === 'app' ? scanApp : scanPage)(item); } catch (e) { if (attempt) rec = { ...item, fatal: String(e.message).slice(0, 160) }; }
  }
  results.push(rec);
  console.log(`${rec.fatal ? '✗' : '•'} ${item.id} (${Math.round((Date.now() - started) / 1000)}s)${rec.fatal ? ' ' + rec.fatal : ''}`);
}
fs.writeFileSync(path.join(OUT, `data-${KIND}-${SI}.json`), JSON.stringify(results));
if (browser) await browser.close();
if (srv && srv.close) srv.close();
const ok = results.filter(r => !r.fatal).length;
console.log(`audit ${KIND} ${SI}/${SN}: ${ok}/${results.length} mục đo được`);
if (!ok && !ONLY) { console.error('✗ shard không đo được mục nào'); process.exit(1); }
