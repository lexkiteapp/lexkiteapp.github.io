// 🧈 scroll-perf: cuộn THẬT (cử chỉ chạm qua CDP) qua các màn học chính → đo khung rớt, task dài, CLS khi tải + khi cuộn, phần tử gây xê dịch,
// listener chặn cuộn, layout/paint/composite, thanh dính đổi cỡ, cuộn tự nhảy, canvas/video chạy khi đã ngoài màn, vị trí sau Back. docs/PERF-SCROLL.md
// Hermetic: dist cục bộ, context riêng + ?demo=1 (dữ liệu mẫu; KHÔNG dùng ?sandbox=1 vì sandbox không ghi lk.onb → shell ẩn lúc tải, CLS giả, và luôn có toast thử nghiệm), /api/* = {}, host ngoài = rỗng (ảnh ngoài = ảnh 640×480 về CHẬM để lộ chỗ thiếu giữ chỗ) → 0 tài khoản thật.
// CHỈ chạy trên CI (scroll-perf.yml) – không chạy trên Mac.
// Dùng: node scripts/test/scroll-perf.mjs --root dist --device phone|desktop|webkit [--themes light,dark] [--only today,vocab] [--out sp-out] [--check]
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', 'dist')), OUT = path.resolve(arg('out', 'sp-out')), DEVICE = arg('device', 'phone');
const THEMES = arg('themes', DEVICE === 'webkit' ? 'light' : 'light,dark').split(','), ONLY = arg('only', '') ? arg('only', '').split(',') : null, CHECK = process.argv.includes('--check');
const VARIANT = arg('variant', ''); // noblur|noshadow|nocv|noanim|nofilter
const BUDGET = JSON.parse(fs.readFileSync(new URL('./scroll-perf.budget.json', import.meta.url), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

// Các màn học chính (brief: Hôm nay, bài học, ôn tập, luyện, hội thoại/nhân vật, thi thử, Từ vựng, Tôi). enter = bấm để vào phiên trong màn.
export const SCREENS = [
  { id: 'today', hash: '#/home' }, { id: 'path', hash: '#/path' }, { id: 'day', hash: '#/day/1' }, { id: 'lesson', hash: '#/lesson/go' },
  { id: 'review', hash: '#/review' }, { id: 'practice', hash: '#/train' }, { id: 'skills', hash: '#/skills' }, { id: 'grammar', hash: '#/grammar' },
  { id: 'reading', hash: '#/reading' }, { id: 'listening', hash: '#/listening' }, { id: 'say', hash: '#/say' }, { id: 'say-card', hash: '#/say', enter: '#sayList a' },
  { id: 'roleplay', hash: '#/roleplay' }, { id: 'call', hash: '#/call' }, { id: 'tests', hash: '#/tests' }, { id: 'mock', hash: '#/mock' },
  { id: 'vocab', hash: '#/vocab' }, { id: 'dict', hash: '#/dict/hello' }, { id: 'me', hash: '#/me' }, { id: 'stats', hash: '#/stats' },
  // Đang trong phiên học (điện thoại nhỏ 360×640: màn focus mới cuộn được, đúng máy dễ giật nhất)
  { id: 'map', hash: '#/lesson' }, { id: 'review-hub', hash: '#/review?hub=1' }, { id: 'lesson-s', hash: '#/lesson/go', small: 1 }, { id: 'review-s', hash: '#/review', small: 1 }, { id: 'say-s', hash: '#/say', enter: '#sayList a', small: 1 },
  { id: 'learn', hash: '#/day/1', enter: 'ol.day-steps a[data-step="learn"]', small: 1 }, { id: 'read-item', hash: '#/reading', enter: '#view a[href^="#/read/"]' }, { id: 'listen-item', hash: '#/listening', enter: '#view a[href^="#/listen/"]' },
  { id: 'grammar-item', hash: '#/grammar', enter: '#view a[href^="#/grammar/"]' }, { id: 'role-item', hash: '#/roleplay', enter: '#view a[href^="#/roleplay/"]', small: 1 }, { id: 'call-item', hash: '#/call', enter: '#view a[href^="#/call/"]', small: 1 },
  { id: 'mock-run', hash: '#/mock', enter: '#view a[href^="#/mock"]:not([href="#/mock"]), #view a[href^="#/toeic-test"], #view a[href^="#/cbt"], #view button.primary', small: 1 }, { id: 'goal', hash: '#/goal' }, { id: 'league', hash: '#/league' }, { id: 'library', hash: '#/library' }, { id: 'topic', hash: '#/topic/environment' }, { id: 'mistakes', hash: '#/mistakes' },
];
const DEV = {
  phone: { launcher: chromium, cpu: 4, net: { latency: 150, down: 1.6e6 / 8 * 0.9, up: 750e3 / 8 * 0.9 }, touch: true, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' } },
  desktop: { launcher: chromium, cpu: 1, touch: false, ctx: { viewport: { width: 1280, height: 800 } } },
  webkit: { launcher: webkit, touch: false, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }, // WebKit Linux ≠ iOS thật: chỉ bắt nhảy cuộn/đổi chiều cao, không có CLS/CDP; bản mobile của Playwright không hỗ trợ wheel nên dùng cột 390 px
}[DEVICE];

// Chạy trước mọi script của trang: ghi xê dịch, listener, lệnh cuộn, mutation, rAF, lượt vẽ canvas.
const INJECT = () => {
  const S = window.__sp = { phase: 'load', shifts: [], listeners: [], prog: [], muts: {}, mutN: 0, raf: {}, draws: new WeakMap(), canv: new Set() };
  const label = e => { if (!e || !e.nodeName) return e === window ? 'window' : e === document ? 'document' : String(e); const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return e.nodeName.toLowerCase() + (e.id ? '#' + e.id : '') + (c ? '.' + c : ''); };
  S.label = label;
  const caller = () => { const l = String(new Error().stack).split('\n').slice(3, 5).map(x => x.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')); return l.join(' < ').slice(0, 120); };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) S.shifts.push({ phase: S.phase, t: Math.round(e.startTime), v: +e.value.toFixed(4), input: e.hadRecentInput, src: (e.sources || []).slice(0, 4).map(s => ({ n: label(s.node), from: s.previousRect && [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.width), Math.round(s.previousRect.height)], to: s.currentRect && [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.width), Math.round(s.currentRect.height)] })) }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { S.noLS = 1; }
  const SCROLLISH = new Set(['scroll', 'touchstart', 'touchmove', 'wheel', 'mousewheel']), add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (SCROLLISH.has(type) && !/HitTarget|InjectedScript/.test(String(new Error().stack))) { const passive = o && typeof o === 'object' ? o.passive : undefined, root = this === window || this === document || this === document.documentElement || this === document.body; // Chrome/Safari: touch/wheel trên gốc mặc định passive
      S.listeners.push({ type, on: label(this), passive: passive === undefined ? (root && type !== 'scroll' ? 'default' : false) : passive, blocking: type !== 'scroll' && !(passive === true || (passive === undefined && root)), at: caller() }); }
    return add.call(this, type, fn, o);
  };
  const wrap = (obj, k, name) => { const f = obj[k]; if (!f) return; obj[k] = function () { if (S.phase === 'down' || S.phase === 'up') S.prog.push({ name, phase: S.phase, at: caller() }); return f.apply(this, arguments); }; };
  wrap(window, 'scrollTo', 'scrollTo'); wrap(window, 'scrollBy', 'scrollBy'); wrap(Element.prototype, 'scrollIntoView', 'scrollIntoView'); wrap(Element.prototype, 'scrollTo', 'el.scrollTo');
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (fn) { if (!S.inSampler && (S.phase === 'down' || S.phase === 'up' || S.phase === 'off')) { const k = caller(); S.raf[k] = (S.raf[k] || 0) + 1; } return raf.call(window, fn); };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext, window.CanvasRenderingContext2D]) { if (!C) continue; for (const k of ['drawArrays', 'drawElements', 'drawImage', 'fillRect', 'clearRect']) { const f = C.prototype[k]; if (!f) continue; C.prototype[k] = function () { const c = this.canvas; if (c) { S.draws.set(c, (S.draws.get(c) || 0) + 1); S.canv.add(c); } return f.apply(this, arguments); }; } }
  document.addEventListener('DOMContentLoaded', () => { new MutationObserver(ms => { if (S.phase !== 'down' && S.phase !== 'up') return; for (const m of ms) { S.mutN++; const k = label(m.target) + (m.attributeName ? '@' + m.attributeName : ''); S.muts[k] = (S.muts[k] || 0) + 1; } }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); });
  // Lấy mẫu mỗi khung khi cuộn: Δt, vị trí cuộn; mỗi 6 khung: chiều cao tài liệu + cỡ thanh dính (đo thưa để không tự gây layout).
  S.start = scroller => {
    const el = scroller === 'doc' ? null : document.querySelector(scroller), R = S.rec = { dt: [], ys: [], hs: [], bars: {} };
    const Y = () => el ? el.scrollTop : scrollY, H = () => el ? el.scrollHeight : document.documentElement.scrollHeight;
    const bars = [...document.querySelectorAll('body *')].filter(e => { const p = getComputedStyle(e).position; if (p !== 'sticky' && p !== 'fixed') return false; const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 8 && r.bottom > 0 && r.top < innerHeight && !e.matches('canvas, #toast, .toast'); }).slice(0, 12);
    let last = performance.now(), n = 0; R.on = 1;
    const tick = t => { if (!R.on) return; R.dt.push(+(t - last).toFixed(1)); last = t; R.ys.push([S.phase === 'up' ? 1 : 0, Math.round(Y())]); if (!R.liveAnim && Y() > 200 && document.getAnimations) R.liveAnim = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity && !(a.effect.target && a.effect.target.closest && a.effect.target.closest('.skel, .tslot')) && (a.effect.target instanceof SVGElement || a.effect.getKeyframes().some(k => Object.keys(k).some(p => !/^(offset|easing|composite|computedOffset|transform|opacity|scale|rotate|translate)$/.test(p))))).map(a => (a.animationName || '?') + '@' + label(a.effect.target)); if (!(n++ % 6)) { R.hs.push(H()); for (const b of bars) { const k = label(b), h = Math.round(b.getBoundingClientRect().height); (R.bars[k] = R.bars[k] || []).push(h); } } S.inSampler = 1; raf.call(window, tick); S.inSampler = 0; };
    raf.call(window, tick);
  };
};

const pctl = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
/** CLS chuẩn Web Vitals: cửa sổ phiên lớn nhất (khoảng cách < 1 s, dài < 5 s). */
function clsOf(shifts) { let best = 0, cur = 0, st = 0, last = 0; for (const e of shifts) { if (e.t - last > 1000 || e.t - st > 5000) { cur = 0; st = e.t; } cur += e.v; last = e.t; if (cur > best) best = cur; } return +best.toFixed(4); }

/** Tổng hợp trace giữa 2 mốc (User Timing) trên luồng chính của trang. */
function traceWindow(ev, a, b) {
  const ma = ev.find(e => e.name === a), mb = ev.find(e => e.name === b); if (!ma || !mb) return null;
  const { pid, tid } = ma, S = {}, longs = [], layoutAt = {}, scripts = {};
  for (const e of ev) {
    if (e.ts < ma.ts || e.ts > mb.ts) continue;
    if (e.pid === pid && /DroppedFrame|DrawFrame/.test(e.name)) { S[e.name] = S[e.name] || { n: 0, ms: 0 }; S[e.name].n++; }
    if (e.pid !== pid || e.tid !== tid || e.ph !== 'X' || !e.dur) continue;
    const ms = e.dur / 1000, nm = /RunTask$/.test(e.name) ? 'RunTask' : e.name;
    (S[nm] = S[nm] || { n: 0, ms: 0 }).n++; S[nm].ms += ms;
    if (nm === 'RunTask' && ms >= 50) longs.push({ ts: e.ts, end: e.ts + e.dur, ms: Math.round(ms), parts: {} });
    if (nm === 'Layout') { const st = e.args && e.args.beginData && e.args.beginData.stackTrace; if (st && st[0]) { const k = `${st[0].functionName || '(anon)'} ${String(st[0].url).replace(/https?:\/\/[^/]+\//, '')}:${st[0].lineNumber}`; layoutAt[k] = (layoutAt[k] || 0) + ms; } }
    if (nm === 'FunctionCall' && e.args && e.args.data) { const k = `${e.args.data.functionName || '(anon)'} ${String(e.args.data.url).replace(/https?:\/\/[^/]+\//, '')}:${e.args.data.lineNumber}`; scripts[k] = (scripts[k] || 0) + ms; }
    if (nm === 'EventDispatch' && e.args && e.args.data && /^(scroll|touchmove|touchstart|wheel)$/.test(e.args.data.type)) { const k = 'evt:' + e.args.data.type; (S[k] = S[k] || { n: 0, ms: 0 }).n++; S[k].ms += ms; }
  }
  for (const e of ev) { if (e.pid !== pid || e.tid !== tid || e.ph !== 'X' || !e.dur || /RunTask$/.test(e.name)) continue; const k = longs.find(x => e.ts >= x.ts && e.ts + e.dur <= x.end); if (!k) continue; const d = e.args && e.args.data, nm = e.name === 'FunctionCall' && d ? `fn:${d.functionName || 'anon'}@${String(d.url).split('/').pop()}:${d.lineNumber}` : e.name === 'EvaluateScript' && d ? `eval:${String(d.url).split('/').pop()}` : e.name; k.parts[nm] = (k.parts[nm] || 0) + e.dur / 1000; }
  const top = (o, n = 4) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => `${v.toFixed(1)}ms ${k}`);
  const g = k => S[k] || { n: 0, ms: 0 };
  return { longN: longs.length, longMax: longs.reduce((m, x) => Math.max(m, x.ms), 0), tbt: longs.reduce((s, x) => s + x.ms - 50, 0), layoutN: g('Layout').n, layoutMs: +g('Layout').ms.toFixed(1), styleMs: +g('UpdateLayoutTree').ms.toFixed(1), prePaintMs: +g('PrePaint').ms.toFixed(1), paintN: g('Paint').n, paintMs: +g('Paint').ms.toFixed(1), layerizeMs: +g('Layerize').ms.toFixed(1), commitMs: +g('Commit').ms.toFixed(1), scriptMs: +g('FunctionCall').ms.toFixed(1), scrollEvtMs: +g('evt:scroll').ms.toFixed(1), touchEvtMs: +((g('evt:touchmove').ms + g('evt:touchstart').ms).toFixed(1)), longs: longs.sort((x, y) => y.ms - x.ms).slice(0, 3).map(k => ({ ms: k.ms, parts: top(k.parts, 5) })), drawN: g('DrawFrame').n, droppedN: g('DroppedFrame').n, layoutAt: top(layoutAt), scripts: top(scripts) };
}

const srv = await serve(ROOT, 0), O = srv.origin;
const ONEIMG = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#8aa"/></svg>';
const browser = await DEV.launcher.launch(DEVICE === 'webkit' ? {} : { args: ['--autoplay-policy=no-user-gesture-required'] });

async function newCtx(theme) {
  const ctx = await browser.newContext({ ...DEV.ctx, colorScheme: theme, locale: 'en-US', serviceWorkers: 'block', reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); } catch (e) { /* trang lỗi */ } }); // cờ ux1 (vỏ Stitch 5 tab – bản người dùng thấy) đến từ /api/config, hermetic = rỗng → phải bật tay, không thì đo nhầm giao diện cũ
  const AB = { noblur: 'backdrop-filter:none!important;-webkit-backdrop-filter:none!important', noshadow: 'box-shadow:none!important;text-shadow:none!important', nocv: 'content-visibility:visible!important', noanim: 'animation:none!important;transition:none!important', nofilter: 'filter:none!important' }[VARIANT];
  if (AB) await ctx.addInitScript(css => addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = `*,*::before,*::after{${css}}`; document.head.appendChild(st); }), AB); // A/B: đo cái giá của từng hiệu ứng, không dùng cho cổng
  await ctx.addInitScript(INJECT);
  await ctx.route('**/*', async r => { const q = r.request(), u = new URL(q.url()); if (u.origin === O) return r.continue(); if (q.resourceType() === 'image') { await sleep(500); return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: ONEIMG }).catch(() => {}); } return r.fulfill({ status: 200, contentType: 'text/plain', body: '' }).catch(() => {}); });
  return ctx;
}
// Khung học chính: tìm vùng cuộn thật (tài liệu, hay khung cuộn lồng lớn nhất).
const findScroller = () => {
  const de = document.documentElement, S = window.__sp; const dist = de.scrollHeight - innerHeight;
  if (dist > 40 && getComputedStyle(de).overflowY !== 'hidden') return { sel: 'doc', dist, nested: 0 };
  let best = null, bd = 0, i = 0; for (const e of document.querySelectorAll('#view *, body > *')) { if (i++ > 6000) break; const d = e.scrollHeight - e.clientHeight; if (d > 40 && d > bd && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) { best = e; bd = d; } }
  if (!best) return { sel: 'doc', dist: Math.max(0, dist), nested: 0 };
  best.setAttribute('data-sp-scroller', '1'); const r = best.getBoundingClientRect();
  return { sel: '[data-sp-scroller]', dist: bd, nested: 1, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
};

async function measure(ctx, sc, cold) {
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)));
  const cdp = DEV.launcher === chromium ? await ctx.newCDPSession(page) : null, ev = [];
  if (cdp) {
    if (DEV.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: DEV.cpu });
    if (DEV.net) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: DEV.net.latency, downloadThroughput: DEV.net.down, uploadThroughput: DEV.net.up }); }
    cdp.on('Tracing.dataCollected', d => ev.push(...d.value));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,toplevel,blink.user_timing', transferMode: 'ReportEvents' });
  }
  const res = { id: sc.id };
  const vp = sc.small && DEVICE === 'phone' ? { width: 360, height: 640 } : DEV.ctx.viewport; if (vp !== DEV.ctx.viewport) await page.setViewportSize(vp);
  await page.goto(`${O}/app/?demo=1&hl=en${sc.hash}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view').children.length > 0 && !document.querySelector('#view .skel-page, #view .skel-study, #view [aria-busy="true"]'), null, { timeout: 45000 }).catch(() => { res.noRender = 1; });
  if (sc.enter) { await page.locator(sc.enter).first().click({ timeout: 15000 }).catch(() => { res.noEnter = 1; }); await sleep(1500); if (cdp) await page.evaluate(() => { window.__sp.shifts.length = 0; }); } // CLS của màn trong phiên: tính từ sau khi bấm vào
  await sleep(1200); // người học bắt đầu cuộn ngay sau khi trang hiện, không đợi mọi thứ tải xong – cố ý để phần tải lười rơi vào lúc cuộn
  res.hash = await page.evaluate(() => location.hash); res.text = await page.evaluate(() => (document.getElementById('view') || {}).innerText?.trim().length || 0);
  const sc2 = await page.evaluate(findScroller); Object.assign(res, { dist: sc2.dist, nested: sc2.nested });
  await page.evaluate(sel => { const S = window.__sp; S.loadEnd = performance.now(); S.h0 = (sel === 'doc' ? document.documentElement : document.querySelector(sel)).scrollHeight; S.phase = 'down'; performance.mark('lk-sp-a'); S.start(sel); }, sc2.sel);
  const dist = Math.min(sc2.dist, 5000), cx = sc2.x || Math.round(vp.width / 2), cy = sc2.y || Math.round(vp.height / 2);
  const gest = async dy => { if (Math.abs(dy) < 40) return sleep(400); if (cdp) return Promise.race([cdp.send('Input.synthesizeScrollGesture', { x: cx, y: cy, yDistance: dy, speed: DEVICE === 'phone' ? 1400 : 2000, gestureSourceType: DEV.touch ? 'touch' : 'mouse', preventFling: true }), sleep(25000)]); await page.mouse.move(cx, cy); const steps = Math.ceil(Math.abs(dy) / 60); for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy < 0 ? 60 : -60); await sleep(16); } };
  await gest(-dist);
  await sleep(300);
  // Đang ở cuối trang: canvas/video của phần trên đã ngoài màn → không được vẽ/phát nữa.
  const off0 = await page.evaluate(() => { const S = window.__sp; S.phase = 'off'; const m = new Map(); for (const c of S.canv) m.set(c, S.draws.get(c) || 0); S.snap = m; return 1; });
  await sleep(600);
  res.offscreen = await page.evaluate(() => { const S = window.__sp, out = []; for (const [c, n] of S.snap) { const r = c.getBoundingClientRect(), d = (S.draws.get(c) || 0) - n; if (d > 0 && (r.bottom < 0 || r.top > innerHeight)) out.push(`canvas ${S.label(c)} ${d} lượt/600ms`); } for (const v of document.querySelectorAll('video')) { const r = v.getBoundingClientRect(); if (!v.paused && (r.bottom < 0 || r.top > innerHeight)) out.push(`video ${S.label(v)} đang phát`); } S.phase = 'up'; return out; });
  await gest(dist);
  await sleep(350);
  const m = await page.evaluate(() => {
    const S = window.__sp; S.rec.on = 0; performance.mark('lk-sp-b'); S.phase = 'idle';
    const R = S.rec, dt = R.dt.slice(2); // bỏ 2 khung khởi động
    let reversal = 0; for (let i = 1; i < R.ys.length; i++) { const [up, y] = R.ys[i], [up0, y0] = R.ys[i - 1]; if (up === up0 && (up ? y - y0 > 3 : y0 - y > 3)) reversal++; }
    const barDelta = {}; for (const k in R.bars) { const a = R.bars[k], d = Math.max(...a) - Math.min(...a); if (d > 0) barDelta[k] = d; }
    const hs = R.hs, heightChange = hs.length ? Math.max(...hs) - Math.min(...hs) : 0;
    const anim = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).map(a => { const props = [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)))].filter(p => !/^(offset|easing|composite|computedOffset)$/.test(p)); return { on: S.label(a.effect.target), name: a.animationName || a.transitionProperty || '?', nonComp: props.filter(p => !/^(transform|opacity|filter|backdropFilter|scale|rotate|translate)$/.test(p)) }; }) : [];
    let blur = 0, i = 0; for (const e of document.querySelectorAll('body *')) { if (i++ > 4000) break; const c = getComputedStyle(e); if ((c.backdropFilter && c.backdropFilter !== 'none') || (c.webkitBackdropFilter && c.webkitBackdropFilter !== 'none')) blur++; }
    const cs = getComputedStyle(document.documentElement), cv = [...document.querySelectorAll('.word-row,.model-row,.md-item')].length;
    return { cv, liveAnim: R.liveAnim || [], dt, n: dt.length, frames: dt, reversal, barDelta, heightChange, shifts: S.shifts, listeners: S.listeners, prog: S.prog, mutN: S.mutN, muts: Object.entries(S.muts).sort((a, b) => b[1] - a[1]).slice(0, 5), raf: Object.entries(S.raf).sort((a, b) => b[1] - a[1]).slice(0, 5), anim, blur, smooth: cs.scrollBehavior, overscroll: cs.overscrollBehaviorY, noLS: S.noLS };
  });
  if (cdp) { const done = new Promise(r => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); await done; res.trace = traceWindow(ev, 'lk-sp-a', 'lk-sp-b'); }
  const dropped = m.dt.reduce((s, d) => s + Math.max(0, Math.round(d / 16.67) - 1), 0);
  const inScroll = s => s.phase === 'down' || s.phase === 'up' || s.phase === 'off', sum = a => +a.reduce((x, s) => x + s.v, 0).toFixed(4);
  const nonInput = m.shifts.filter(s => !s.input);
  Object.assign(res, { liveAnim: m.liveAnim, cvRows: m.cv, frames: m.n, droppedPct: m.n ? +(dropped / (dropped + m.n) * 100).toFixed(1) : 0, p95: pctl(m.dt, .95), worst: Math.round(Math.max(0, ...m.dt)), jank50: m.dt.filter(d => d > 50).length,
    cls: clsOf(nonInput), loadCls: sum(nonInput.filter(s => s.phase === 'load')), scrollCls: sum(m.shifts.filter(inScroll)), shiftTop: [...m.shifts].sort((a, b) => b.v - a.v).slice(0, 4),
    reversal: m.reversal, barDelta: m.barDelta, heightChange: m.heightChange, blocking: m.listeners.filter(l => l.blocking), listeners: m.listeners.length, scrollLis: m.listeners.filter(l => l.type === 'scroll').map(l => l.at), prog: m.prog, mutN: m.mutN, muts: m.muts, raf: m.raf, anim: m.anim, blur: m.blur, smooth: m.smooth, overscroll: m.overscroll, errs });
  await page.close();
  return res;
}

// Back: cuộn xuống → sang màn khác → Back → phải về đúng chỗ (app hàng đầu giữ vị trí).
async function backTest(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${O}/app/?demo=1&hl=en#/vocab`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.App && document.querySelector('#view')?.children.length > 0 && !document.querySelector('#view > .skel-page'), null, { timeout: 45000 }).catch(() => {});
  await sleep(2500);
  const target = await page.evaluate(() => { const d = document.documentElement.scrollHeight - innerHeight, y = Math.min(600, Math.floor(d * .6)); scrollTo(0, y); return scrollY; });
  await sleep(300);
  await page.evaluate(() => { location.hash = '#/me'; }); await sleep(1800);
  const mid = await page.evaluate(() => scrollY);
  await page.goBack(); await sleep(2200);
  const after = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }));
  await page.close();
  return { target, midY: mid, afterBack: after.y, off: Math.abs(after.y - target) };
}

const all = [], fails = [];
for (const theme of THEMES) {
  const ctx = await newCtx(theme);
  { const p = await ctx.newPage(); await p.goto(`${O}/app/?demo=1&hl=en#/home`, { waitUntil: 'load', timeout: 120000 }).catch(() => {}); await sleep(3000); await p.close(); } // nạp demo + bộ nhớ đệm HTTP (lần sau = người dùng quay lại)
  for (const sc of SCREENS) {
    if (ONLY && !ONLY.includes(sc.id)) continue;
    let r; try { r = await measure(ctx, sc); } catch (e) { r = { id: sc.id, crash: String(e.message).split('\n')[0].slice(0, 200) }; }
    // Runner CI ồn: khung rớt/task dài vượt ngưỡng → đo lại 1 lần, lấy lượt tốt hơn. CLS, nhảy cuộn, listener… là tất định, không đo lại.
    const noisy = x => !x.crash && DEVICE !== 'webkit' && x.dist > 40 && (x.droppedPct > (BUDGET[DEVICE] || {}).droppedPct || ((x.trace || {}).longMax ?? 0) > (BUDGET[DEVICE] || {}).longMaxMs);
    if (noisy(r)) { try { const r2 = await measure(ctx, sc); if (!r2.crash && r2.droppedPct <= r.droppedPct) { r2.retried = 1; r = r2; } } catch (e) { /* giữ lượt đầu */ } }
    r.theme = theme; r.device = DEVICE; all.push(r);
    const t = r.trace || {};
    console.log(`${DEVICE}/${theme} ${sc.id.padEnd(10)} ${r.crash ? 'CRASH ' + r.crash : `h=${r.dist}${r.nested ? ' lồng' : ''} rớt ${r.droppedPct}% p95 ${r.p95} worst ${r.worst} | CLS ${r.cls} (cuộn ${r.scrollCls}) | long ${t.longN ?? '–'}/${t.longMax ?? '–'}ms | layout ${t.layoutN ?? '–'}×${t.layoutMs ?? '–'}ms paint ${t.paintN ?? '–'}×${t.paintMs ?? '–'}ms | nhảy ${r.reversal} Δcao ${r.heightChange} bar ${JSON.stringify(r.barDelta)} | chặn ${r.blocking.length} blur ${r.blur} mut ${r.mutN} ${r.hash}${r.noEnter ? ' KHÔNG-VÀO-ĐƯỢC' : ''}`}`);
    for (const s of (r.shiftTop || []).filter(s => s.v >= 0.005)) console.log(`    ↕ ${s.v} [${s.phase}${s.input ? ' input' : ''}] ${s.src.map(x => `${x.n} ${JSON.stringify(x.from)}→${JSON.stringify(x.to)}`).join(' ; ')}`);
    for (const k of (t.layoutAt || []).slice(0, 2)) console.log(`    ▦ layout ${k}`);
    for (const k of (t.longs || []).slice(0, 1)) console.log(`    ⏱ ${k.ms}ms: ${k.parts.join(' · ')}`);
    for (const k of (r.offscreen || [])) console.log(`    👻 ${k}`);
    for (const b of (r.blocking || [])) console.log(`    ⛔ ${b.type} on ${b.on} passive=${b.passive} ${b.at}`);
    for (const p of (r.prog || []).slice(0, 2)) console.log(`    ⤵ ${p.name} khi cuộn ${p.at}`);
  }
  let back = null; try { back = await backTest(ctx); } catch (e) { back = { crash: String(e.message).slice(0, 120) }; }
  all.push({ id: '__back', theme, device: DEVICE, back }); console.log(`${DEVICE}/${theme} Back:`, JSON.stringify(back));
  await ctx.close();
}
await browser.close(); srv.close();

const file = path.join(OUT, `${DEVICE}${VARIANT ? '-' + VARIANT : ''}.json`); fs.writeFileSync(file, JSON.stringify(all, null, 1));
const rows = all.filter(r => r.id !== '__back');
const md = [`### Cuộn – ${DEVICE}${DEV.cpu > 1 ? ` (CPU ${DEV.cpu}×)` : ''}`, '', '| màn | nền | cuộn px | rớt % | p95 ms | worst | long (n/max) | CLS | CLS cuộn | layout (n/ms) | paint (n/ms) | Δcao | nhảy | mut |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const r of rows) { const t = r.trace || {}; md.push(r.crash ? `| ${r.id} | ${r.theme} | CRASH | | | | | | | | | | | |` : `| ${r.id} | ${r.theme} | ${r.dist}${r.nested ? ' lồng' : ''} | ${r.droppedPct} | ${r.p95} | ${r.worst} | ${t.longN ?? '–'}/${t.longMax ?? '–'} | ${r.cls} | ${r.scrollCls} | ${t.layoutN ?? '–'}/${t.layoutMs ?? '–'} | ${t.paintN ?? '–'}/${t.paintMs ?? '–'} | ${r.heightChange} | ${r.reversal} | ${r.mutN} |`); }
for (const r of all.filter(r => r.id === '__back')) md.push('', `Back (${r.theme}): ${JSON.stringify(r.back)}`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n\n');
fs.writeFileSync(path.join(OUT, `${DEVICE}${VARIANT ? '-' + VARIANT : ''}.md`), md.join('\n') + '\n');

// ---------- cổng: ngưỡng trong scroll-perf.budget.json chỉ được siết (docs/PERF-SCROLL.md) ----------
const B = BUDGET[DEVICE] || {};
const fail = m => { fails.push(m); console.error('✗ ' + m); };
const good = rows.filter(r => !r.crash && !r.noRender && r.text > 20), scrollable = good.filter(r => r.dist > 40);
const perTheme = rows.length / THEMES.length;
if (good.length < rows.length * 0.8) fail(`chỉ ${good.length}/${rows.length} màn vẽ được – bộ đo hỏng, không phải xanh`);
if (!ONLY && scrollable.length / THEMES.length < Math.min(B.minScrollable ?? 6, perTheme)) fail(`chỉ ${scrollable.length} màn cuộn được – phép đo vô nghĩa`);
for (const r of rows) if (r.crash) fail(`${r.theme} ${r.id}: bộ đo lỗi – ${r.crash}`);
for (const r of good) {
  const w = `${DEVICE}/${r.theme} ${r.id}`, g = k => B[k] ?? Infinity, t = r.trace || {};
  if (DEVICE !== 'webkit') {
    if (r.cls > g('cls')) fail(`${w}: CLS ${r.cls} > ${g('cls')} ← ${JSON.stringify((r.shiftTop || []).slice(0, 2).map(s => s.src.map(x => x.n)))}`);
    if (r.scrollCls > g('scrollCls')) fail(`${w}: CLS khi cuộn ${r.scrollCls} > ${g('scrollCls')} ← ${JSON.stringify((r.shiftTop || []).filter(s => s.phase !== 'load').slice(0, 2).map(s => s.src.map(x => x.n)))}`);
    if (r.dist > 40 && r.droppedPct > g('droppedPct')) fail(`${w}: rớt khung ${r.droppedPct}% > ${g('droppedPct')}%`);
    if (r.dist > 40 && (t.longMax ?? 0) > g('longMaxMs')) fail(`${w}: task dài ${t.longMax} ms > ${g('longMaxMs')} ms khi cuộn`);
    if ((t.layoutMs ?? 0) > g('layoutMs')) fail(`${w}: layout khi cuộn ${t.layoutMs} ms > ${g('layoutMs')} ms ← ${(t.layoutAt || [])[0] || ''}`);
    if ((r.blocking || []).length > g('blocking')) fail(`${w}: ${r.blocking.length} listener chặn cuộn: ${r.blocking.map(b => b.type + ' ' + b.on + ' ' + b.at).join(' | ')}`);
    if (r.dist > 200 && (r.liveAnim || []).length > g('liveAnim')) fail(`${w}: hiệu ứng vô hạn vẫn chạy khi cuộn: ${[...new Set(r.liveAnim)].join(', ')}`);
    if ((r.offscreen || []).length > g('offscreen')) fail(`${w}: chạy khi ngoài màn: ${r.offscreen.join(', ')}`);
  }
  if (r.reversal > g('reversal')) fail(`${w}: vị trí cuộn tự nhảy ngược ${r.reversal} lần`);
  if (r.heightChange > ((B.heightChangeBy || {})[r.id] ?? g('heightChange'))) fail(`${w}: chiều cao trang đổi ${r.heightChange}px khi đang cuộn`);
  const bd = Math.max(0, ...Object.values(r.barDelta || {})); if (bd > g('barDelta')) fail(`${w}: thanh dính đổi cỡ ${bd}px: ${JSON.stringify(r.barDelta)}`);
  if (r.smooth === 'smooth') fail(`${w}: html có scroll-behavior:smooth`);
}
for (const r of all.filter(r => r.id === '__back')) if (r.back && (r.back.crash || r.back.off > (B.backOff ?? Infinity))) fail(`${DEVICE}/${r.theme}: Back lệch vị trí cuộn ${JSON.stringify(r.back)}`);
if (CHECK && fails.length) { console.error(`\n✗ scroll-perf ${DEVICE}: ${fails.length} vi phạm`); process.exit(1); }
console.log(`✓ scroll-perf ${DEVICE}: ${rows.length} phép đo${CHECK ? ', trong ngưỡng' : ` (đo, không chặn; ${fails.length} vượt ngưỡng)`}`);
