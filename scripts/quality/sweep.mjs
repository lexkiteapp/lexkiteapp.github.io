// quality-sweep: quét lỗi tiềm ẩn của web + app bằng Playwright (không tốn token LLM). Chạy trong .github/workflows/quality-sweep.yml (mỗi ngôn ngữ 1 phần).
// Bắt: lỗi console, promise không bắt, request 4xx/5xx, tràn ngang, chữ bị cắt, nút đè nhau, vùng chạm < 44px, axe serious/critical, CLS > 0.1, tác vụ dài > 200ms.
// Hermetic: /api/* (mọi origin) trả {} và request ra ngoài trả rỗng → 0 lượt đọc D1/AI thật. Lệnh:
//   node scripts/quality/sweep.mjs --root dist --lang vi --out qs-out/vi [--baseline qs-baseline/vi] [--quick]
// Ra: findings.json (đã gộp theo loại+phần tử), pages.json, shots/ (ảnh trang lỗi), diffs/ + visual.json (so ảnh với nền).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', 'dist')), LANG = arg('lang', 'en'), OUT = path.resolve(arg('out', `qs-out/${LANG}`));
const BASELINE = arg('baseline', ''), QUICK = process.argv.includes('--quick'), SHOT_CAP = +arg('shot-cap', 60);
const LANGS15 = 'vi en es pt fr de id th zh ja ko hi ar ru tr'.split(' ');
fs.mkdirSync(OUT + '/shots', { recursive: true });

// ---------- danh sách trang ----------
const BASE_ROUTES = ['home', 'path', 'day/1', 'review', 'vocab', 'dict/sustainable', 'library', 'grammar', 'tests', 'cbt', 'qstats', 'quick', 'stats', 'resources', 'method', 'me', 'settings', 'contact',
  'practice', 'practice/learn', 'skills', 'phrases', 'models', 'pron', 'listening', 'reading', 'speaking', 'write', 'task1', 'letters', 'toeic', 'toefl', 'placement', 'topic/ngsl1', 'topic/office-email',
  'model/t1-travel', 'handsfree', 'reflex', 'roleplay', 'roleplay/manager', 'call', 'call/coffee', 'courses', 'course/ielts-writing', 'paraphrase', 'mistakes', 'goal', 'verb/take', 'fix', 'usage', 'usage/interested'];
function discoverRoutes() { // mọi routes.xxx = … trong mã nguồn web/js (bản dist đã rút gọn nên không đọc được tên)
  const found = new Set(), dir = 'web/js';
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.js')) { const s = fs.readFileSync(f, 'utf8'); for (const m of s.matchAll(/\broutes\.([a-zA-Z_]+)\s*=(?!=)/g)) found.add(m[1]); for (const m of s.matchAll(/\broutes\[['"]([a-z0-9_-]+)['"]\]\s*=(?!=)/g)) found.add(m[1]); } } };
  try { walk(dir); } catch { /* không có nguồn → chỉ dùng danh sách cố định */ }
  found.delete('welcome');
  return [...found];
}
const have = new Set(BASE_ROUTES.map(r => r.split('/')[0]));
const ROUTES = [...BASE_ROUTES, ...discoverRoutes().filter(r => !have.has(r))];

const SKIP_DIRS = new Set(['app', 'templates', 'audio', 'data', 'packs', 'img', 'icons', 'css', 'js', 'screenshots', 'i18n', 'node_modules', 'lexicon', 'media', 'fonts']);
function typeOf(rel) { // rel = đường dẫn thư mục/tệp so với gốc ngôn ngữ → "loại" trang
  const segs = rel.replace(/index\.html$/, '').split('/').filter(Boolean);
  if (segs.length <= 1) return segs[0] || '(home)';
  return segs.length === 2 ? `${segs[0]}/*` : `${segs[0]}/${segs[1]}/*`;
}
function listStatic() {
  const bases = [{ dir: path.join(ROOT, LANG), prefix: '/' + LANG + '/', root: false }];
  if (LANG === 'vi') bases.push({ dir: ROOT, prefix: '/', root: true });
  const types = new Map();
  for (const b of bases) {
    const walk = (d, rel) => {
      let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) { if (b.root && !rel && (SKIP_DIRS.has(e.name) || LANGS15.includes(e.name) || e.name.startsWith('.'))) continue; walk(path.join(d, e.name), r); }
        else if (e.name.endsWith('.html')) {
          if (b.root && !rel && /^(admin|bye|blog-lang|index)\.html$/.test(e.name) && e.name !== 'index.html') continue;
          if (/(^|\/)(admin|embed|googl[a-z0-9]+)\.html$/.test(r)) continue;
          const k = (b.root ? 'root:' : '') + typeOf(r);
          (types.get(k) || types.set(k, []).get(k)).push(b.prefix + r.replace(/index\.html$/, ''));
        }
      }
    };
    walk(b.dir, '');
  }
  const out = [];
  for (const [k, urls] of [...types].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 45)) {
    urls.sort(); const n = urls.length, idx = [...new Set([0, Math.floor(n / 2), n - 1])];
    for (const i of idx) out.push({ type: k, url: urls[i], n });
  }
  return out;
}
const STATIC = listStatic();
fs.writeFileSync(OUT + '/types.json', JSON.stringify([...new Set(STATIC.map(s => s.type + ' (' + s.n + ')'))], null, 1));

// ---------- bộ dò trong trang ----------
function probe(mobile) {
  const W = innerWidth, H = innerHeight, out = [], seen = new Set();
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return null; return r; };
  const sel = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + (e.id && !/\d/.test(e.id) ? '#' + e.id : '');
  const add = (t, e, x = '') => { const k = t + '|' + sel(e); if (seen.has(k)) return; seen.add(k); out.push({ t, k: sel(e), x: String(x || (e.innerText || '').replace(/\s+/g, ' ').trim()).slice(0, 80) }); };
  const own = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const de = document.documentElement;
  // 1. tràn ngang cả trang
  if (de.scrollWidth > W + 1) {
    let n = 0;
    for (const e of document.body.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1 && (r.right > W + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden=true],[hidden]') && !(e.closest('[style*="overflow"]') && getComputedStyle(e.parentElement).overflowX !== 'visible')) { add('hscroll', e, `rộng ${Math.round(r.right)}px > ${W}px`); if (++n >= 3) break; } }
    if (!n) add('hscroll', de, `scrollWidth ${de.scrollWidth} > ${W}`);
  }
  // 2. chữ bị cắt (overflow ẩn nhưng nội dung rộng hơn khung; bỏ qua dấu "…" chủ ý)
  for (const e of document.body.querySelectorAll('*')) {
    if (!own(e) && !e.matches('button,a,label,li,td,th')) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'inline' || !/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp) continue;
    if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && vis(e) && (e.innerText || '').trim()) add('text-clip', e, `${e.scrollWidth}px trong khung ${e.clientWidth}px: "${(e.innerText || '').trim().slice(0, 40)}"`);
  }
  // 3. nút/liên kết đè nhau + 4. vùng chạm < 44px
  const items = [];
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link]')) {
    const r = vis(e); if (!r || r.bottom < 0 || r.top > H * 3 || r.right < 0 || r.left > W || e.closest('[aria-hidden=true],[hidden],[inert]')) continue;
    const cs = getComputedStyle(e);
    if (e.type === 'checkbox' || e.type === 'radio') { const lab = e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]')); if (lab) continue; }
    items.push({ e, r, fixed: cs.position === 'fixed' || !!e.closest('[style*="position: fixed"],header,.tabbar,nav[class*=bottom]') && cs.position === 'sticky', inline: e.tagName === 'A' && cs.display === 'inline' });
  }
  if (mobile) for (const it of items) {
    if (it.inline && it.e.closest('p,td,li,figcaption,dd,small,span')) continue; // WCAG 2.5.8: liên kết trong câu được miễn
    if (it.r.height < 44 || it.r.width < 44) add('touch-target', it.e, `${Math.round(it.r.width)}x${Math.round(it.r.height)}px "${(it.e.innerText || it.e.getAttribute('aria-label') || it.e.getAttribute('title') || '').trim().slice(0, 30)}"`);
  }
  const cap = items.slice(0, 250);
  for (let i = 0; i < cap.length; i++) for (let j = i + 1; j < cap.length; j++) {
    const a = cap[i], b = cap[j]; if (a.fixed !== b.fixed || a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix <= 2 || iy <= 2) continue;
    const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
    if (ix * iy > 0.25 * small) add('overlap', b.e, `${sel(a.e)} ⟷ ${sel(b.e)} (${Math.round(ix)}x${Math.round(iy)}px)`);
  }
  return out;
}

// ---------- chạy ----------
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#toast,.lkr-toast,body>canvas{display:none!important}';
const SEV = { pageerror: 'critical', rejection: 'critical', http5xx: 'critical', 'axe-critical': 'critical', console: 'high', http4xx: 'high', reqfail: 'high', hscroll: 'high', 'axe-serious': 'high', 'text-clip': 'medium', overlap: 'medium', cls: 'medium', 'touch-target': 'low', longtask: 'low' };
const VPS = { m: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }, d: { viewport: { width: 1280, height: 800 } } };
const LOCALE = { vi: 'vi-VN', en: 'en-US', ar: 'ar-SA' }[LANG] || LANG;
const srv = await serve(ROOT, 0), ORIGIN = srv.origin;
const browser = await chromium.launch();
const findings = [], pages = [], visual = [];
let shots = 0;
const slug = s => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'root';
const norm = s => String(s).replace(/https?:\/\/[^\s)'"]+/g, u => { try { return new URL(u).pathname; } catch { return u; } }).replace(/\d{3,}/g, 'N').replace(/\s+/g, ' ').slice(0, 140);
const png = (() => { try { return { PNG: require('pngjs').PNG, pm: require('pixelmatch') }; } catch { return null; } })();
fs.mkdirSync(OUT + '/vis-new', { recursive: true }); fs.mkdirSync(OUT + '/diffs', { recursive: true });

async function runCombo(c) {
  const vp = VPS[c.v], tag = `${LANG}-${c.v}-${c.s}`;
  const ctx = await browser.newContext({ ...vp, colorScheme: c.s, locale: LOCALE, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => {
    window.__cls = 0; window.__lt = []; window.__rej = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { /* */ }
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
    addEventListener('unhandledrejection', e => { window.__rej.push(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 200)); });
    try { localStorage.setItem('vb-onboarded', '1'); } catch { /* */ }
  });
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/api/') && u.origin !== ORIGIN) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (u.origin === ORIGIN) return r.continue();
    const t = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : t === 'image' ? 'image/gif' : 'text/plain', body: t === 'image' ? Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') : '' });
  });
  const page = await ctx.newPage();
  let cur = { id: '', kind: '' }, bag = [];
  const note = (type, key, msg) => bag.push({ type, key, msg });
  page.on('pageerror', e => note('pageerror', norm(e.message), norm(e.message) + ' @ ' + String(e.stack || '').split('\n')[1]?.trim().slice(0, 100)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) note('console', norm(m.text()), norm(m.text())); });
  page.on('response', r => { const u = new URL(r.url()); if (u.origin === ORIGIN && r.status() >= 400 && !(cur.kind === 'static' && cur.id === '/404.html')) note(r.status() >= 500 ? 'http5xx' : 'http4xx', r.status() + ' ' + u.pathname, `${r.status()} ${u.pathname}`); });
  page.on('requestfailed', r => { const u = new URL(r.url()); if (u.origin === ORIGIN && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) note('reqfail', u.pathname, `${r.failure()?.errorText} ${u.pathname}`); });

  async function measure(kind, id, url) {
    await page.addStyleTag({ content: STILL }).catch(() => {});
    await page.waitForTimeout(kind === 'app' ? 1100 : 900);
    const p = { kind, id, tag, bad: 0 };
    const found = [...bag]; bag = [];
    const r = await page.evaluate(probe, !!vp.isMobile).catch(e => [{ t: 'probe-error', k: '', x: String(e.message).slice(0, 80) }]);
    for (const f of r) if (f.t !== 'probe-error') found.push({ type: f.t, key: f.k, msg: f.x });
    const extra = await page.evaluate(() => ({ cls: window.__cls, lt: window.__lt, rej: window.__rej })).catch(() => ({ cls: 0, lt: [], rej: [] }));
    if (extra.cls > 0.1) found.push({ type: 'cls', key: 'layout-shift', msg: `CLS ${extra.cls.toFixed(3)} > 0.1` });
    const lt = Math.max(0, ...extra.lt); if (lt > 200) found.push({ type: 'longtask', key: 'longtask', msg: `tác vụ dài ${lt} ms > 200` });
    for (const m of extra.rej) found.push({ type: 'rejection', key: norm(m), msg: norm(m) });
    try {
      await page.addScriptTag({ content: AXE });
      const ax = await page.evaluate(async () => { const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] }); return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })); });
      for (const v of ax) found.push({ type: 'axe-' + v.impact, key: v.id + ' ' + (v.nodes[0] || '').slice(0, 60), msg: `${v.id}: ${v.help} [${v.nodes.join(' | ').slice(0, 100)}]` });
    } catch (e) { found.push({ type: 'probe-error', key: 'axe', msg: 'axe: ' + String(e.message).slice(0, 80) }); }
    let shot = '';
    if (found.length && shots < SHOT_CAP) { shot = `shots/${tag}__${slug(id)}.png`; shots++; await page.screenshot({ path: `${OUT}/${shot}` }).catch(() => { shot = ''; }); }
    for (const f of found) { if (f.type === 'probe-error') continue; p.bad++; findings.push({ ...f, sev: SEV[f.type] || 'low', page: `${kind === 'app' ? '#/' : ''}${id}`, tag, shot }); }
    pages.push(p);
    if (c.s === 'light' && BASELINE && png) await visualShot(tag, kind, id);
  }
  async function visualShot(tg, kind, id) {
    const name = `${LANG}__${c.v}__${kind}__${slug(id)}.png`, buf = await page.screenshot({ animations: 'disabled' }).catch(() => null);
    if (!buf) return;
    fs.writeFileSync(`${OUT}/vis-new/${name}`, buf);
    const bf = path.join(BASELINE, name);
    if (!fs.existsSync(bf)) return;
    try {
      const a = png.PNG.sync.read(fs.readFileSync(bf)), b = png.PNG.sync.read(buf);
      if (a.width !== b.width || a.height !== b.height) { visual.push({ name, id: (kind === 'app' ? '#/' : '') + id, vp: c.v, ratio: 1, note: `kích thước ${a.width}x${a.height} → ${b.width}x${b.height}` }); return; }
      const d = new png.PNG({ width: a.width, height: a.height }), n = png.pm(a.data, b.data, d.data, a.width, a.height, { threshold: 0.15 });
      const ratio = n / (a.width * a.height);
      if (ratio > 0.02) { fs.writeFileSync(`${OUT}/diffs/${name}`, png.PNG.sync.write(d)); visual.push({ name, id: (kind === 'app' ? '#/' : '') + id, vp: c.v, ratio: +ratio.toFixed(4) }); }
    } catch (e) { /* ảnh nền hỏng → bỏ qua, sẽ được thay mới */ }
  }

  // app: vào ngay với sandbox, đi qua từng route bằng hash
  cur = { kind: 'app', id: 'welcome' };
  await page.goto(`${ORIGIN}/app/?sandbox=1&hl=${LANG}#/welcome/setup`, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1500); }
  bag = [];
  for (const route of (QUICK ? ROUTES.slice(0, 6) : ROUTES)) {
    cur = { kind: 'app', id: route };
    await page.evaluate(() => { window.__cls = 0; window.__lt = []; window.__rej = []; }).catch(() => {});
    await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + route).catch(() => {});
    await measure('app', route);
  }
  // trang tĩnh (3 mẫu / loại)
  for (const s of (QUICK ? STATIC.slice(0, 6) : STATIC)) {
    cur = { kind: 'static', id: s.url };
    bag = [];
    const resp = await page.goto(ORIGIN + s.url, { waitUntil: 'load', timeout: 45000 }).catch(e => { note('reqfail', s.url, 'goto: ' + String(e.message).slice(0, 80)); return null; });
    await measure('static', s.url);
  }
  await ctx.close();
}

const combos = [];
for (const v of ['m', 'd']) for (const s of ['light', 'dark']) combos.push({ v, s });
const t0 = Date.now();
for (let i = 0; i < combos.length; i += 2) await Promise.all(combos.slice(i, i + 2).map(c => runCombo(c).catch(e => console.error('combo lỗi', c, e.message))));
await browser.close(); srv.close();

// ---------- gộp ----------
const g = new Map();
for (const f of findings) {
  const k = f.type + '|' + f.key;
  const x = g.get(k) || g.set(k, { type: f.type, sev: f.sev, key: f.key, msg: f.msg, shot: f.shot, where: new Set(), lang: LANG }).get(k);
  x.where.add(`${f.page} ${f.tag.replace(LANG + '-', '')}`); if (!x.shot && f.shot) x.shot = f.shot;
}
const rows = [...g.values()].map(r => ({ ...r, where: [...r.where] })).sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.sev) - ['critical', 'high', 'medium', 'low'].indexOf(b.sev) || b.where.length - a.where.length);
fs.writeFileSync(OUT + '/findings.json', JSON.stringify(rows, null, 1));
fs.writeFileSync(OUT + '/pages.json', JSON.stringify({ lang: LANG, pages: pages.length, appRoutes: ROUTES.length, staticPages: STATIC.length, seconds: Math.round((Date.now() - t0) / 1000), routes: ROUTES }, null, 1));

// ---------- ảnh nền: giữ ảnh cũ của trang bị cờ tối đa 3 đêm (để người xem kịp), còn lại cập nhật ----------
if (BASELINE) {
  fs.mkdirSync(BASELINE, { recursive: true });
  let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(BASELINE, 'meta.json'), 'utf8')); } catch { /* lần đầu */ }
  const flagged = new Set(visual.map(v => v.name)), next = {};
  for (const f of fs.readdirSync(OUT + '/vis-new')) {
    const streak = meta[f] || 0;
    if (flagged.has(f) && streak < 3) { next[f] = streak + 1; continue; }
    fs.copyFileSync(`${OUT}/vis-new/${f}`, path.join(BASELINE, f)); next[f] = 0;
  }
  fs.writeFileSync(path.join(BASELINE, 'meta.json'), JSON.stringify(next));
}
fs.writeFileSync(OUT + '/visual.json', JSON.stringify(visual, null, 1));
fs.rmSync(OUT + '/vis-new', { recursive: true, force: true });
const by = {}; for (const r of rows) by[r.sev] = (by[r.sev] || 0) + 1;
console.log(`quality-sweep[${LANG}]: ${pages.length} lượt trang · ${rows.length} lỗi gộp ${JSON.stringify(by)} · ${visual.length} ảnh đổi nhiều · ${Math.round((Date.now() - t0) / 1000)}s`);
