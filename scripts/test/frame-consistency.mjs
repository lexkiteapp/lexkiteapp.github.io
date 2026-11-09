// 🧱 frame-consistency – mọi ROUTE của app thật theo MỘT khung (docs/DESIGN-SYSTEM.md §5d, docs/METHODS.md "Một khung app").
// Khác stitch-diff/stitch-quality-qc (so từng màn với ref Stitch): cổng này so các route CỦA APP với nhau và với chuẩn biến thể.
// Mỗi route × 390/1280 × sáng/tối, đọc computed style/box của:
//   thanh trên (biến thể, cao, nút Back/X ≥ 44 và đích Back = trang cha) · thanh 5 tab (có/không theo biến thể, đúng thứ tự, tab đang chọn)
//   khung nội dung (max-width, lề ngang) · thẻ .card (bán kính, bóng) · tiêu đề (font, cỡ) · CTA chính (vị trí) · màu (chỉ token, không hex lẻ)
//   nhất quán logic: cùng khái niệm (Ôn tập, chuỗi ngày, XP) cùng icon ở mọi trang.
// Chuẩn biến thể: hằng số §5d (thanh trên 56, thanh tab 64, nút ≥ 44, 5 tab Today/Vocab/Skills/Tests/Me) + giá trị đa số của biến thể
// (một CSS dùng chung → mọi route cùng số; route lệch đa số = có chỗ ghi đè riêng). Bảng route → biến thể: scripts/test/frame-variants.json.
// Ratchet (chỉ giảm): scripts/test/frame-consistency.known.json = số lệch đã biết theo khóa route|khổ|thuộc tính. Đỏ khi có khóa MỚI,
// khi số lệch của một khóa tăng, hoặc khi khóa đã hết lệch/giảm mà known chưa hạ (chạy --write-known rồi commit → baseline chỉ đi xuống).
// Chỉ chạy trên CI (frame-consistency.yml).
// Dùng: node scripts/test/frame-consistency.mjs [--root dist | --base URL] [--out out/frame-consistency] [--only home,vocab] [--write-known]
import { chromium } from 'playwright';
import { SCAN_ROOTS } from '../lib/scan-roots.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { noProd } from './lib/no-prod.mjs';
import { serve } from '../quality/serve.mjs';
import { FIXED } from './lib/learn-samples.mjs';
import { waitFn } from '../lib/pw-wait.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('root', 'dist'), OUT = path.resolve(arg('out', 'out/frame-consistency')), ONLY = arg('only', '');
const SPEC = { top: 56, tab: 64, hit: 44, tabs: ['home', 'vocab', 'skills', 'tests', 'me'] };
const VAR = JSON.parse(fs.readFileSync(new URL('./frame-variants.json', import.meta.url), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let srv = null, O = arg('base', '');
if (!O) { srv = await serve(ROOT, 0); O = srv.origin; }
O = O.replace(/\/$/, '');

// ---------- đo trong trang ----------
const probe = (SPEC) => {
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && !el.closest('[hidden]'); };
  const px = v => Math.round(parseFloat(v) || 0);
  const sel = el => el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 3).map(c => '.' + c).join('') : '';
  const iconOf = el => { const u = el && el.querySelector('svg use'); return u ? (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^.*#/, '') : (el && el.querySelector('svg, img') ? 'inline' : ''); };
  const vw = innerWidth, view = document.querySelector('#view');
  const hash = location.hash, name = (/^#\/([^/?]*)/.exec(hash) || [])[1] || 'home', argv = (/^#\/[^/?]*\/([^?]*)/.exec(hash) || [])[1] || '';
  const [navTab] = window.App && App.navOf ? App.navOf(name, argv && decodeURIComponent(argv)) : [null];
  // thanh trên: thanh chung header.topbar, hoặc thanh riêng của màn (thanh học/inner) ở đầu #view
  const gtop = document.querySelector('header.topbar');
  const own = view && [...view.querySelectorAll('.study-top, .st-top, .lsn-top, .lk-top, .page-top, .inner-top, header, [data-topbar]')].find(e => vis(e) && e.getBoundingClientRect().top < 140);
  const bar = vis(gtop) ? gtop : own || null;
  const br = bar && bar.getBoundingClientRect();
  // nút Back/X: [data-exit] hoặc nút/link biểu tượng ở góc trên-trái (≤ 140 px)
  const BACKRX = /back|quay lại|trở về|close|đóng|thoát|quit|exit/i;
  const cands = [...document.querySelectorAll('[data-exit], .crumb a, a.back, button.back, .icon-btn, a[aria-label], button[aria-label]')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.top < 140 && r.left < vw / 2 && !e.closest('#bnav, #nav, .side-foot, .gsearch, .top-stats, a.brand') && (e.matches('[data-exit], .crumb a, .back') || BACKRX.test(e.getAttribute('aria-label') || e.title || '')); });
  const back = cands[0] || null, bkr = back && back.getBoundingClientRect();
  // thanh 5 tab
  const bnav = document.querySelector('#bnav'), bOn = vis(bnav);
  const tabs = bOn ? [...bnav.querySelectorAll('a[data-tab]')].filter(vis).map(a => a.dataset.tab) : [];
  const active = bOn ? [...bnav.querySelectorAll('a.active')].map(a => a.dataset.tab) : [];
  const side = vis(document.querySelector('#nav'));
  // khung nội dung
  const first = view && [...view.children].find(vis);
  const fr = first && first.getBoundingClientRect(), vcs = view && getComputedStyle(view), fcs = first && getComputedStyle(first);
  const vr = view && view.getBoundingClientRect();
  // tiêu đề
  const h = view && ([...view.querySelectorAll('h1')].find(vis) || [...view.querySelectorAll('h2')].find(vis));
  const hcs = h && getComputedStyle(h);
  // thẻ .card dùng chung
  const cards = view ? [...view.querySelectorAll('.card')].filter(vis).slice(0, 40) : [];
  const cardSig = [...new Set(cards.map(c => { const s = getComputedStyle(c); return s.borderTopLeftRadius + '|' + (s.boxShadow === 'none' ? 'none' : 'shadow'); }))];
  // CTA chính
  const p = (window.ExitGuard && ExitGuard.primary && ExitGuard.primary()) || (view && [...view.querySelectorAll('.btn.primary')].find(vis));
  let ctaPos = '';
  if (p && vis(p)) { let e = p, fixed = false; while (e && e !== document.body) { const ps = getComputedStyle(e).position; if (ps === 'fixed' || ps === 'sticky') { fixed = true; break; } e = e.parentElement; }
    ctaPos = fixed ? 'bottom-dock' : 'inline'; }
  // màu: token = mọi biến --* là màu (đọc từ stylesheet), so màu computed (bỏ alpha) của phần tử nhìn thấy
  const toks = new Set(), tokName = {};
  const probeEl = document.createElement('i'); document.body.appendChild(probeEl);
  const names = new Set();
  for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch { continue; }
    const walk = rs => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.style) for (const k of r.style) if (k.startsWith('--')) names.add(k); } }; walk(rules); }
  const rgb = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(v); return m && (m[4] === undefined || +m[4] > 0.02) ? `${m[1]},${m[2]},${m[3]}` : null; };
  for (const n of names) { probeEl.style.color = ''; probeEl.style.color = `var(${n})`; const c = rgb(getComputedStyle(probeEl).color); if (c && getComputedStyle(document.documentElement).getPropertyValue(n).trim()) { toks.add(c); tokName[c] = tokName[c] || n; } }
  probeEl.remove();
  ['255,255,255', '0,0,0'].forEach(c => toks.add(c)); // trắng/đen tuyệt đối: chữ trên nút màu, ảnh – coi như token gốc
  const offTok = {}, inlineHex = [];
  const els = [bar, bnav, ...(view ? view.querySelectorAll('*') : [])].filter(Boolean).slice(0, 2500);
  for (const e of els) { if (!vis(e) || e.closest('svg, img, video, canvas, .teacher-slot, [data-art]')) continue;
    const s = getComputedStyle(e);
    const st = e.getAttribute('style') || ''; if (/#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i.test(st)) inlineHex.push(sel(e) + ' {' + st.slice(0, 80) + '}');
    const cs = [['color', s.color], ['bg', s.backgroundColor], ...(px(s.borderTopWidth) > 0 ? [['border', s.borderTopColor]] : [])];
    if (e.childNodes.length && ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) cs.shift(); // chỉ chấm màu chữ khi có chữ
    for (const [k, v] of cs) { const c = rgb(v); if (c && !toks.has(c)) { const key = k + ':rgb(' + c + ')'; (offTok[key] = offTok[key] || []).length < 3 && offTok[key].push(sel(e)); } } }
  // khái niệm: Ôn tập / chuỗi ngày / XP → icon
  const concept = {};
  const add = (k, el) => { if (!vis(el)) return; const ic = iconOf(el); if (ic) (concept[k] = concept[k] || new Set()).add(ic); };
  document.querySelectorAll('a[href="#/review"]').forEach(a => add('review', a));
  document.querySelectorAll('a[href="#/streak"], #streakPill, [class~="streak-pill"]').forEach(a => add('streak', a));
  document.querySelectorAll('#xpPill, [class~="xp-pill"]').forEach(a => add('xp', a));
  return {
    hash, name, navTab, vw, theme: document.documentElement.dataset.theme || 'auto',
    body: [...document.body.classList].filter(c => /^(focus|lk-learn|modal-open)$/.test(c)),
    top: bar ? { el: sel(bar), global: bar === gtop, h: Math.round(br.height), y: Math.round(br.top), pos: getComputedStyle(bar).position } : null,
    back: back ? { el: sel(back), w: Math.round(bkr.width), h: Math.round(bkr.height), href: back.getAttribute('href') || '', exit: back.matches('[data-exit]') } : null,
    bnav: bOn ? { h: Math.round(bnav.getBoundingClientRect().height), tabs, active } : null, side,
    frame: view ? { maxW: vcs.maxWidth, padL: px(vcs.paddingLeft), padR: px(vcs.paddingRight), left: Math.round(fr ? fr.left - vr.left : 0), right: Math.round(fr ? vr.right - fr.right : 0), w: Math.round(fr ? fr.width : 0), firstMaxW: fcs ? fcs.maxWidth : '' } : null,
    title: h ? { tag: h.tagName.toLowerCase(), font: hcs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: px(hcs.fontSize), weight: hcs.fontWeight } : null,
    cards: cardSig, cta: ctaPos, offTok, inlineHex: inlineHex.slice(0, 5), concept: Object.fromEntries(Object.entries(concept).map(([k, s]) => [k, [...s]])),
  };
};

// ---------- chạy ----------
const browser = await chromium.launch();
const mk = async (w, theme) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600, locale: 'en-US', serviceWorkers: 'block', colorScheme: theme });
  await noProd(ctx);
  await ctx.addInitScript(th => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th })); localStorage.setItem('lk.ux1', '0'); localStorage.setItem('lk.ub', '99'); } catch { /* */ } }, theme);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
  await page.goto(`${O}/app/?sandbox=1&hl=en#/home`, { waitUntil: 'load', timeout: 60000 });
  await waitFn(page, () => window.App && App.routes && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 45000 });
  await sleep(800);
  return { ctx, page, errs, w, theme };
};
const go = async (P, h) => {
  await P.page.evaluate(x => { if (window.UI && UI.closeModal) UI.closeModal(); if (window.App && App.state.settings) App.state.settings.onboarded = !/^#?\/welcome/.test(x); /* người có dữ liệu không thấy lại trang giới thiệu (docs/specs/welcome.md) → chỉ trong bộ nhớ */ location.hash = x; window.scrollTo(0, 0); }, h);
  await waitFn(P.page, x => location.hash === '#' + x.split('#').pop() || true, h).catch(() => {});
  await sleep(1100);
  // Gói lười nạp nguội (vd. #/speak → 'pas' + 3 CSS) có thể quá 1.1s trên runner bận → đo lúc còn khung xương, thanh dưới chưa đánh dấu tab (lệch giả). Chờ App.route vẽ xong.
  await waitFn(P.page, () => { const v = document.querySelector('#view'); return v && v.children.length && !v.querySelector(':scope > .skel-page, :scope > .skel-study'); }, null, { timeout: 15000 }).catch(() => {});
  await P.page.evaluate(() => window.scrollTo(0, 0));
};

const P0 = await mk(390, 'light');
const live = await P0.page.evaluate(() => ({ routes: Object.keys(App.routes).filter(r => r && !/^_/.test(r)), withArg: (window.ExitGuard && ExitGuard.WITH_ARG) || [] }));
// route cần tham số → bài mẫu (như exit-sweep/nav-sweep); còn lại mở không tham số
const target = r => FIXED[r] ? FIXED[r] : '/' + r;
// App.routes chỉ có route của gói đã nạp (gói lười tự đăng ký khi mở) → danh sách đủ = route trong mã nguồn ∪ route đang sống.
// Quét THẲNG web/js (cùng regex scripts/codemap.mjs §4): docs/codemap.json chỉ được bot dựng lại sau khi gộp → route lười mới của PR (vd. #/watch) từng bị báo "không còn trong app".
const srcRoutes = () => { const out = new Set(), walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'i18n') walk(p); } else if (e.name.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\broutes(?:\.([A-Za-z_$][\w$]*)|\[\s*['"]([\w-]+)['"]\s*\])\s*=[^=]/g)) out.add(m[1] || m[2]); } }; SCAN_ROOTS.filter(r => fs.existsSync(r)).forEach(walk); return out; };
const SRC_ROUTES = [...new Set([...Object.keys(JSON.parse(fs.readFileSync('docs/codemap.json', 'utf8')).routes || {}).map(h => h.replace(/^#\//, '')), ...srcRoutes()])];
let ROUTES = [...new Set([...SRC_ROUTES, ...live.routes])].sort();
if (ONLY) ROUTES = ROUTES.filter(r => ONLY.split(',').includes(r));
const unknown = ROUTES.filter(r => !VAR.routes[r]);
const stale = Object.keys(VAR.routes).filter(r => !SRC_ROUTES.includes(r) && !live.routes.includes(r));

const res = {}; // res[route][w-theme] = probe
const runCombo = async (P) => {
  for (const r of ROUTES) { await go(P, target(r));
    let m; try { m = await P.page.evaluate(probe, SPEC); } catch (e) { m = { error: String(e.message).slice(0, 120) }; }
    (res[r] = res[r] || {})[`${P.w}-${P.theme}`] = m; }
};
const combos = [P0, await mk(390, 'dark'), await mk(1280, 'light'), await mk(1280, 'dark')];
await Promise.all(combos.map(runCombo));

// ---------- chấm ----------
const dev = []; // { route, combo, prop, got, want }
const D = (route, combo, prop, got, want) => dev.push({ route, combo, prop, got: String(got), want: String(want) });
for (const r of unknown) D(r, '-', 'variant', 'chưa có trong frame-variants.json', 'hub|inner|focus');
for (const r of stale) D(r, '-', 'variant', 'route không còn trong app', 'xóa khỏi frame-variants.json');
const mode = arr => { const c = {}; arr.forEach(v => { if (v !== undefined && v !== null && v !== '') c[v] = (c[v] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
const combosK = combos.map(P => `${P.w}-${P.theme}`);
// chuẩn đa số theo biến thể × khổ (sáng/tối dùng chung chuẩn hình học)
const NORM = {};
for (const v of ['hub', 'inner', 'focus']) for (const w of [390, 1280]) {
  const ms = ROUTES.filter(r => VAR.routes[r]?.variant === v).flatMap(r => [`${w}-light`, `${w}-dark`].map(k => res[r]?.[k])).filter(m => m && !m.error);
  NORM[`${v}-${w}`] = {
    topH: mode(ms.map(m => m.top?.h)), topEl: mode(ms.map(m => m.top?.el)), maxW: mode(ms.map(m => m.frame?.maxW)), padL: mode(ms.map(m => m.frame?.padL)),
    left: mode(ms.map(m => m.frame?.left)), font: mode(ms.map(m => m.title?.font)), size: mode(ms.map(m => m.title?.size)), cta: mode(ms.map(m => m.cta)),
  };
}
const cardNorm = mode(Object.values(res).flatMap(o => Object.values(o)).flatMap(m => m.cards || []));
const conceptAll = {};
for (const r of ROUTES) { const v = VAR.routes[r]?.variant; if (!v) continue;
  for (const k of combosK) { const m = res[r][k], w = +k.split('-')[0], N = NORM[`${v}-${w}`]; if (!m) continue;
    if (m.error) { D(r, k, 'probe', m.error, 'đo được'); continue; }
    // thanh trên
    if (!m.top) D(r, k, 'topbar', 'không có', 'có thanh trên');
    else {
      if (w === 390 && m.top.h !== SPEC.top) D(r, k, 'topbar.h', m.top.h, SPEC.top);
      if (m.top.global !== (v !== 'focus')) D(r, k, 'topbar.variant', m.top.el, v === 'focus' ? 'thanh riêng của màn học (không header.topbar chung)' : 'header.topbar');
      if (m.top.y > 1) D(r, k, 'topbar.y', m.top.y, 0);
    }
    // Back/X
    if (v !== 'hub') {
      if (!m.back) D(r, k, 'back', 'không có nút Back/X', `≥ ${SPEC.hit}×${SPEC.hit}`);
      else {
        if (m.back.w < SPEC.hit || m.back.h < SPEC.hit) D(r, k, 'back.size', `${m.back.w}×${m.back.h} (${m.back.el})`, `≥ ${SPEC.hit}×${SPEC.hit}`);
        const parent = m.navTab ? '#/' + m.navTab : null;
        if (m.back.href && /^#\//.test(m.back.href) && parent && m.back.href.split('?')[0] !== parent && !m.hash.startsWith(m.back.href.split('?')[0] + '/') && m.back.href !== '#/home')
          D(r, k, 'back.target', m.back.href, parent);
      }
    }
    // thanh 5 tab (điện thoại)
    if (w === 390) {
      const want = v !== 'focus';
      if (want !== !!m.bnav) D(r, k, 'tabbar', m.bnav ? 'có' : 'không', want ? 'có' : 'không (màn tập trung)');
      if (m.bnav) {
        if (m.bnav.h !== SPEC.tab) D(r, k, 'tabbar.h', m.bnav.h, SPEC.tab);
        if (m.bnav.tabs.join() !== SPEC.tabs.join()) D(r, k, 'tabbar.order', m.bnav.tabs.join(), SPEC.tabs.join());
        const wantA = m.navTab ? [m.navTab] : [];
        if (m.bnav.active.join() !== wantA.join() || !m.navTab) D(r, k, 'tabbar.active', m.bnav.active.join() || '(không tab nào)', m.navTab || 'route phải thuộc 1 trong 5 tab (App.navOf)');
      }
    } else if (v !== 'focus' && !m.side) D(r, k, 'sidenav', 'không', 'có (máy tính)');
    // khung nội dung
    if (m.frame) {
      if (m.frame.maxW !== N.maxW) D(r, k, 'frame.max-width', m.frame.maxW, N.maxW);
      if (Math.abs(m.frame.left - N.left) > 1) D(r, k, 'frame.inset-left', m.frame.left, N.left);
      if (Math.abs(m.frame.left - m.frame.right) > 1 && w === 390) D(r, k, 'frame.inset-symmetry', `${m.frame.left}/${m.frame.right}`, 'trái = phải');
    }
    if (m.title) { if (m.title.font !== N.font) D(r, k, 'title.font', m.title.font, N.font); if (String(m.title.size) !== N.size) D(r, k, 'title.size', m.title.size, N.size); }
    for (const c of m.cards || []) if (c !== cardNorm) D(r, k, 'card.radius|shadow', c, cardNorm);
    if (m.cta && N.cta && m.cta !== N.cta) D(r, k, 'cta.position', m.cta, N.cta);
    for (const [c, where] of Object.entries(m.offTok || {})) D(r, k, 'color.non-token', c, 'token --* (' + where.join(', ') + ')');
    for (const s of m.inlineHex || []) D(r, k, 'color.inline-literal', s, 'var(--token)');
    for (const [c, ics] of Object.entries(m.concept || {})) for (const ic of ics) ((conceptAll[c] = conceptAll[c] || {})[ic] = conceptAll[c][ic] || []).push(r);
  } }
for (const [c, ics] of Object.entries(conceptAll)) { const ks = Object.keys(ics); if (ks.length > 1) { const top = ks.sort((a, b) => ics[b].length - ics[a].length)[0];
  for (const ic of ks) if (ic !== top) for (const r of [...new Set(ics[ic])]) D(r, '*', 'concept.' + c + '.icon', ic, top); } }

// ---------- báo cáo ----------
const byProp = {};
dev.forEach(d => { (byProp[d.prop] = byProp[d.prop] || new Set()).add(d.route); });
const errs = combos.flatMap(P => P.errs);
const lines = [`# frame-consistency – ${ROUTES.length} route × ${combosK.length} khổ/theme`, '',
  `Lệch: **${dev.length}** ở ${new Set(dev.map(d => d.route)).size} route. Chuẩn biến thể (đa số):`, '', '```', JSON.stringify(NORM, null, 1), 'card: ' + cardNorm, '```', '',
  '## Theo thuộc tính', ...Object.entries(byProp).sort((a, b) => b[1].size - a[1].size).map(([p, s]) => `- **${p}** (${s.size}): ${[...s].join(', ')}`), '',
  '## Chi tiết (route · khổ · thuộc tính · có → cần)', ...dev.slice(0, 1500).map(d => `- ${d.route} · ${d.combo} · ${d.prop} · \`${d.got}\` → \`${d.want}\``),
  errs.length ? '\n## Lỗi JS\n' + [...new Set(errs)].slice(0, 30).map(e => '- ' + e).join('\n') : ''];
fs.writeFileSync(OUT + '/report.md', lines.join('\n'));
fs.writeFileSync(OUT + '/raw.json', JSON.stringify({ NORM, cardNorm, res, dev }, null, 1));
console.log(`frame-consistency: ${ROUTES.length} route, ${dev.length} lệch ở ${new Set(dev.map(d => d.route)).size} route`);
Object.entries(byProp).sort((a, b) => b[1].size - a[1].size).forEach(([p, s]) => {
  console.log(`  ${p}: ${s.size} route – ${[...s].slice(0, 14).join(', ')}${s.size > 14 ? '…' : ''}`);
  const g = {}; dev.filter(d => d.prop === p).forEach(d => { const k = `${d.got} → ${d.want}`.slice(0, 150); (g[k] = g[k] || new Set()).add(d.route + '@' + d.combo); });
  Object.entries(g).sort((a, b) => b[1].size - a[1].size).slice(0, 6).forEach(([k, v]) => console.log(`      ${k}  ×${v.size} (${[...v].slice(0, 4).join(' ')})`)); });
await browser.close(); if (srv) srv.close();
// ---------- ratchet ----------
const KNOWN_F = new URL('./frame-consistency.known.json', import.meta.url);
const cur = {}; dev.forEach(d => { const k = `${d.route}|${d.combo}|${d.prop}`; cur[k] = (cur[k] || 0) + 1; });
const sorted = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
if (process.argv.includes('--write-known')) {
  const doc = { _note: 'Baseline ratchet của scripts/test/frame-consistency.mjs – CHỈ được giảm (mỗi PR sửa một cụm thì hạ số). Sinh bằng --write-known.', total: dev.length, keys: sorted(cur) };
  fs.writeFileSync(KNOWN_F, JSON.stringify(doc, null, 0).replace(/,"/g, ',\n"') + '\n'); console.log('đã ghi known:', dev.length, 'lệch,', Object.keys(cur).length, 'khóa');
}
const known = fs.existsSync(KNOWN_F) ? JSON.parse(fs.readFileSync(KNOWN_F, 'utf8')) : { total: 0, keys: {} };
const worse = Object.entries(cur).filter(([k, n]) => n > (known.keys[k] || 0)).map(([k, n]) => `${k}: ${known.keys[k] || 0} → ${n}`);
const better = Object.entries(known.keys).filter(([k, n]) => (cur[k] || 0) < n).map(([k, n]) => `${k}: ${n} → ${cur[k] || 0}`);
console.log(`ratchet: hiện ${dev.length} lệch / baseline ${known.total}`);
if (worse.length) console.log('✗ lệch MỚI hoặc tăng (sửa gốc, không nâng baseline):\n  ' + worse.slice(0, 80).join('\n  '));
if (better.length) console.log('✗ đã giảm – hạ baseline: node scripts/test/frame-consistency.mjs --write-known rồi commit known.json:\n  ' + better.slice(0, 80).join('\n  '));
if (!worse.length && !better.length) console.log('✓ frame-consistency khớp baseline');
fs.writeFileSync(OUT + '/known-now.json', JSON.stringify({ total: dev.length, keys: sorted(cur) }));
process.exit(worse.length || better.length ? 1 : 0);
