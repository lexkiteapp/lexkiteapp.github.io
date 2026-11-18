// ⚡ lesson-perf: đi TRỌN 1 bài học thật (Hôm nay → bài → trắc nghiệm/ghép/xếp từ/gõ/nghe → chấm điểm → màn kết quả) trên máy yếu GIẢ LẬP
// (điện thoại 390 px, CPU 4×/6× đã hiệu chuẩn theo runner, mạng 4G chậm) và ghi hồ sơ hiệu năng: độ trễ chạm→khung vẽ (xấp xỉ INP) từng lần bấm,
// long task / LoAF (kèm script gây ra + thời gian ép layout), khung rớt lúc CHUYỂN CÂU, FPS, GC, giải mã ảnh, layout/style, số lần tải lười giữa bài.
// Xếp nguyên nhân theo ms mất → lesson-perf.md + lesson-perf.json. CHỈ chạy trên CI (lesson-perf.yml). Hermetic: dist cục bộ, /api/* offline, media→GitHub qua noProd.
// Dùng: node scripts/test/lesson-perf.mjs --root dist --rate 4 [--out lp-out] [--check] [--lessons 1] [--width 390] [--flow lesson|review|practice]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';
import { noProd } from './lib/no-prod.mjs';
import { rateFor } from './lib/perf-calibrate.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NOMINAL = +arg('rate', '4'), OUT = path.resolve(arg('out', 'lp-out')), CHECK = process.argv.includes('--check'), LESSONS = +arg('lessons', '1'), WIDTH = +arg('width', '390'), FLOW = arg('flow', 'lesson'), TAG = `${FLOW}-${WIDTH}-${arg('rate', '4')}x${arg('tag', '')}`, ROOT = arg('root', 'dist'), VARIANT = arg('variant', ''); // thử nghiệm nguyên nhân: nohas (bỏ :has() gốc html/body/#view) · noanim (tắt animation/transition) · nohas+noanim
const BUDGET = JSON.parse(fs.readFileSync(new URL('./lesson-perf.budget.json', import.meta.url), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1';

export const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };

// Chạy trước mọi script của trang: long task + LoAF, nhịp khung, độ trễ chạm→khung vẽ, mốc chuyển câu.
const INJECT = () => {
  const P = window.__lp = { long: [], loaf: [], frames: [], taps: [], trans: [], ev: [], on: false, t0: 0 };
  const obs = (type, fn, o = {}) => { try { new PerformanceObserver(l => { if (P.on) for (const e of l.getEntries()) fn(e); }).observe({ type, buffered: false, ...o }); } catch { /* trình duyệt không có */ } };
  obs('event', e => P.ev.push({ n: e.name, d: Math.round(e.duration), i: Math.round(e.processingStart - e.startTime), p: Math.round(e.processingEnd - e.processingStart), v: Math.round(e.startTime + e.duration - e.processingEnd), t: String(e.target && (e.target.id ? '#' + e.target.id : e.target.className) || '').slice(0, 40) }), { durationThreshold: 16 });
  obs('longtask', e => P.long.push({ s: Math.round(e.startTime), d: Math.round(e.duration) }));
  obs('long-animation-frame', e => P.loaf.push({ s: Math.round(e.startTime), d: Math.round(e.duration), b: Math.round(e.blockingDuration || 0), fl: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
    sc: (e.scripts || []).map(x => ({ c: x.sourceCharPosition, u: String(x.sourceURL || '').replace(/^https?:\/\/[^/]+\//, '').slice(0, 80), f: String(x.sourceFunctionName || x.invoker || '').slice(0, 50), d: Math.round(x.duration), fl: Math.round(x.forcedStyleAndLayoutDuration || 0) })) }));
  let last = 0; const tick = t => { if (P.on) { if (last) P.frames.push([Math.round(t), +(t - last).toFixed(1)]); last = t; } else last = 0; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const click = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function () {
    const t0 = performance.now(), lab = (this.id ? '#' + this.id : '') + '.' + String(this.className || '').trim().split(/\s+/).slice(0, 2).join('.');
    if (P.on) { if (this.id === 'lsnNext' || this.id === 'lsnCheck') P.trans.push(Math.round(t0)); requestAnimationFrame(() => setTimeout(() => P.taps.push({ l: lab.slice(0, 40), ms: Math.round(performance.now() - t0), at: Math.round(t0) }), 0)); }
    return click.apply(this, arguments);
  };
};

// Lái 1 bài học tới màn kết thúc (cùng cách qa-bot.mjs PLAY: đúng/sai luân phiên, nghe 1 lần, bỏ qua câu nói). Trả số liệu đếm.
const PLAY = async ({ wrongEvery = 2, maxSteps = 60 } = {}) => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms)), nz = s => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '');
  const seen = { right: 0, wrong: 0, skip: 0, audio: 0, steps: 0, kinds: {} };
  for (let n = 0; n < maxSteps && !q('.lsn-end'); n++) {
    const it = window.App && App._lsn && App._lsn.sess && App._lsn.sess.cur; if (!it) { if (n === 3 && window.App && App.need) { await App.need('lesson'); await App.routes.lesson('go'); } await w(400); continue; }
    seen.steps++;
    if (q('#lsnGo')) { q('#lsnGo').click(); await w(400); continue; }
    if (!seen.audio && q('#lsnPlay')) { q('#lsnPlay').click(); seen.audio++; await w(300); }
    if (!seen.skip && (q('#lsnNoL') || q('#lsnNoS'))) { (q('#lsnNoL') || q('#lsnNoS')).click(); seen.skip++; await w(500); continue; }
    const wrong = (seen.right + seen.wrong) % wrongEvery === 1, kind = q('.lsn-opts .lsn-opt') ? 'choose' : q('#lsnBank') ? 'arrange' : q('#lsnIn') ? 'type' : q('.lsn-match') ? 'match' : 'other'; seen.kinds[kind] = (seen.kinds[kind] || 0) + 1;
    if (q('.lsn-opts .lsn-opt')) { const os = qa('.lsn-opts .lsn-opt'); const o = wrong ? os.find(b => b.dataset.o !== String(it.answer)) : os.find(b => b.dataset.o === String(it.answer)); (o || os[0]).click(); }
    else if (q('#lsnBank')) { const used = new Set(), ws = String(it.answer).split(/\s+/); if (wrong) ws.reverse(); for (const x of ws) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); await w(60); } } }
    else if (q('#lsnIn')) { q('#lsnIn').value = wrong ? 'zzz' : it.answer; q('#lsnIn').dispatchEvent(new Event('input', { bubbles: true })); }
    else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
    else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(400); continue; }
    await w(150);
    if (q('#lsnCheck') && !q('#lsnCheck').disabled) { q('#lsnCheck').click(); wrong ? seen.wrong++ : seen.right++; }
    await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(500);
  }
  await w(1800); // màn kết quả: hiệu ứng/ăn mừng chạy xong
  return { ...seen, end: !!q('.lsn-end') };
};

const srv = await serve(ROOT, 0), O = srv.origin.replace(/\/$/, ''), HOST = new URL(O).host;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const { rate, factor, scaled, bench } = await rateFor(browser, NOMINAL);
const DAY = 864e5, NOW = Date.now();
const CARDS = Object.fromEntries(['sustainable', 'negotiate', 'budget', 'deadline', 'resilience', 'strategy'].map((w, i) => [w, { word: w, vi: w, pos: 'noun', ex: '', contexts: [], added: NOW - 9 * DAY, mod: NOW - 2 * DAY, srs: { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: NOW - 5 * DAY + i * 36e5, last: NOW - 4 * DAY, step: 0 } }]));
const ctx = await browser.newContext({ bypassCSP: true, ...devices['Pixel 7'], viewport: { width: WIDTH, height: 844 }, locale: 'en-US', reducedMotion: 'no-preference' });
await noProd(ctx, { off: false });
await ctx.addInitScript(({ s }) => { try { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* */ } }, { s: { 'sbx.settings': JSON.stringify({ onboarded: true, theme: 'light' }), 'sbx.cards': JSON.stringify(CARDS), 'lk.ux1': '1' } });
await ctx.addInitScript(INJECT);
await ctx.route('**/*', async r => { const u = new URL(r.request().url());
  if (u.origin === O && VARIANT.includes('nohas') && /\.css$/.test(u.pathname)) { const resp = await r.fetch(); let b = await resp.text(); b = b.replace(/[^{}]*(?:html|body|#view|\.lsn-fx|:root \.lsn-fx)[^{},]*:has\([^{}]*\{[^{}]*\}/g, ''); return r.fulfill({ response: resp, body: b }); }
  if (u.origin !== O) { const t = r.request().resourceType(); return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : 'text/plain', body: t === 'image' ? '' : '' }); } return r.fallback(); });
const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page), errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
const reqs = []; page.on('request', rq => { const u = new URL(rq.url()); if (u.host === HOST) reqs.push({ t: Date.now(), p: u.pathname }); });

if (VARIANT.includes('noanim')) await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); }));
await page.goto(`${O}/app/?sandbox=1&hl=en#/home`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 40000 }); await sleep(1500);

const res = { at: new Date().toISOString(), nominal: NOMINAL, rate, factor: +factor.toFixed(2), scaled, bench, lessons: [] };
for (let L = 0; L < LESSONS; L++) {
  await page.evaluate(() => { location.hash = '#/home'; }); await sleep(1200);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9 });
  await cdp.send('Performance.enable'); const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const events = []; cdp.on('Tracing.dataCollected', e => events.push(...e.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking,disabled-by-default-devtools.timeline.stack,v8,blink', transferMode: 'ReportEvents' });
  await page.evaluate(() => { const P = window.__lp; P.long = []; P.loaf = []; P.frames = []; P.taps = []; P.trans = []; P.ev = []; P.on = true; P.t0 = performance.now(); P.ev = []; });
  const r0 = reqs.length, tStart = Date.now();
  const TAP = async sel => { const l = page.locator(sel).first(); if (!(await l.count()) || !(await l.isVisible().catch(() => false))) return false; await l.tap({ timeout: 4000 }).catch(() => l.click({ timeout: 2000 }).catch(() => {})); return true; };
  let play;
  if (FLOW === 'lesson') {
    // Hôm nay → bài: bấm CTA thật nếu có, không thì vào thẳng /lesson/go
    const cta = page.locator('#view a[href^="#/day"], #view a[href*="lesson"], #view .btn.primary').first();
    if (await cta.isVisible().catch(() => false)) { await cta.click({ timeout: 5000 }).catch(() => {}); await sleep(1000); }
    await page.evaluate(() => { location.hash = '#/lesson/go'; }); await sleep(1200);
    play = await page.evaluate(PLAY, {}).catch(e => ({ error: String(e.message).slice(0, 160) }));
  } else if (FLOW === 'review') { // ôn thẻ bằng chạm THẬT (INP thật từ Event Timing)
    await page.evaluate(() => { location.hash = '#/review'; }); await sleep(1500);
    let n = 0; for (; n < 16; n++) { if (await page.locator('#view .rev-done').count()) break; if (await page.locator('#typeIn').count()) { await page.fill('#typeIn', n % 2 ? 'zzz' : ''); await page.press('#typeIn', 'Enter'); } else if (await TAP('#view [data-opt="0"]')) { /* trắc nghiệm */ } else await TAP('#view #flipBtn, #view .flash, #view .btn.primary'); await sleep(500); if (await TAP('#view [data-grade="2"]')) await sleep(600); }
    await sleep(1200); play = { steps: n, right: 0, wrong: 0, end: !!(await page.locator('#view .rev-done').count()) || n >= 6, kinds: {} };
  } else { // luyện: practice/test chủ đề
    await page.evaluate(() => { location.hash = '#/practice/test?src=topic:education'; }); await sleep(1500);
    let n = 0, done = false; for (; n < 40; n++) {
      if (await page.locator('#view .score-ring').count()) { done = true; break; }
      if (await TAP('#nextQ')) { await sleep(400); continue; }
      const inp = page.locator('#view input[type=text], #view input:not([type])').first();
      if (await inp.isVisible().catch(() => false)) { await inp.fill('zzqx'); await inp.press('Enter'); await sleep(900); continue; }
      if (await TAP('#view .option')) { await sleep(900); continue; }
      if (!(await TAP('#view .btn.primary'))) break; await sleep(500);
    }
    await sleep(1500); play = { steps: n, right: 0, wrong: 0, end: done, kinds: {} };
  }
  const wall = Date.now() - tStart, P = await page.evaluate(() => { const x = window.__lp; x.on = false; return x; });
  await cdp.send('Tracing.end'); await new Promise(r => cdp.once('Tracing.tracingComplete', r));
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  const taps = P.taps.map(t => t.ms), win = P.trans.map(t => [t, t + 900]);
  const inTrans = s => win.some(([a, b]) => s >= a && s <= b), longT = P.long.filter(l => inTrans(l.s));
  const dts = P.frames.map(f => f[1]), trFrames = P.frames.filter(f => inTrans(f[0])).map(f => f[1]);
  const fps = a => a.length ? +(1000 / (a.reduce((x, y) => x + y, 0) / a.length)).toFixed(1) : 0;
  // trace: cộng thời gian theo loại sự kiện (chỉ sự kiện hoàn chỉnh 'X') trong cửa sổ bài học
  const sum = re => Math.round(events.filter(e => e.ph === 'X' && re.test(e.name)).reduce((a, e) => a + (e.dur || 0), 0) / 1000);
  const trace = { gc: sum(/^(MinorGC|MajorGC|V8\.GC|BlinkGC)/), decode: sum(/^(Decode Image|ImageDecodeTask|Decode LazyPixelRef|ImageUploadTask)/), layout: sum(/^Layout$/), style: sum(/^UpdateLayoutTree$/), paint: sum(/^(Paint|PrePaint|Layerize)$/), raster: sum(/^(RasterTask|GPUTask)/), parse: sum(/^(ParseHTML|v8\.compile|V8\.CompileCode)/), evalScript: sum(/^EvaluateScript$/), fn: sum(/^FunctionCall$/), timers: sum(/^TimerFire$/), raf: sum(/^FireAnimationFrame$/), events: events.length };
  const inval = new Map(); for (const e of events) if (e.name === 'StyleRecalcInvalidationTracking' && e.args && e.args.data) { const d = e.args.data, k = `${d.reason}|${d.nodeName || ''}|${String(d.extraData || '').slice(0, 40)}`; inval.set(k, (inval.get(k) || 0) + 1); }
  const topInval = [...inval].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => ({ k, n }));
  const styleEls = events.filter(e => e.name === 'UpdateLayoutTree' && e.args && e.args.elementCount != null).reduce((a, e) => a + e.args.elementCount, 0);
  // ép layout/style từ script: sự kiện Layout/UpdateLayoutTree có stackTrace = chạy đồng bộ do JS đọc kích thước/ gọi focus() khi DOM bẩn → xếp theo khung gọi đầu (file:dòng hàm)
  const fl = new Map(); for (const e of events) if (e.ph === 'X' && (e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.args) { const st = (e.args.beginData && e.args.beginData.stackTrace) || e.args.stackTrace; if (!st || !st.length) continue; const f = st.find(x => /\/js\//.test(x.url || '')) || st[0], k = `${e.name} ← ${String(f.url || '').replace(/^https?:\/\/[^/]+\//, '')}:${f.lineNumber + 1} ${f.functionName || '(anon)'}`; const o = fl.get(k) || { ms: 0, n: 0 }; o.ms += (e.dur || 0) / 1000; o.n++; fl.set(k, o); }
  const topForced = [...fl].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, v]) => ({ k, ms: Math.round(v.ms), n: v.n }));
  const forced = events.filter(e => e.ph === 'X' && e.name === 'Layout' && e.args && e.args.beginData && e.args.beginData.stackTrace).length;
  const lineOf = (u, c) => { try { if (!u || !(c >= 0)) return ''; const t = fs.readFileSync(path.join(ROOT, u), 'utf8'), ln = t.slice(0, c).split('\n').length, line = t.split('\n')[ln - 1] || ''; return `:${ln} «${line.slice(Math.max(0, c - t.lastIndexOf('\n', c - 1) - 1 - 20), Math.max(0, c - t.lastIndexOf('\n', c - 1) - 1 + 60)).trim()}»`; } catch { return ''; } };
  const byScript = new Map(); for (const f of P.loaf) for (const s of f.sc) { const k = `${s.u}${lineOf(s.u, s.c)} ${s.f}`.trim() || '(anon)'; const o = byScript.get(k) || { ms: 0, forced: 0, n: 0 }; o.ms += s.d; o.forced += s.fl; o.n++; byScript.set(k, o); }
  const topScripts = [...byScript].sort((a, b) => b[1].ms - a[1].ms).slice(0, 8).map(([k, v]) => ({ k, ...v }));
  const worstTaps = [...P.taps].sort((a, b) => b.ms - a.ms).slice(0, 6);
  const lazy = reqs.slice(r0).filter(x => /\.(js|css)$/.test(x.p)).length;
  res.lessons.push({
    play, ev: { n: P.ev.length, inp: Math.max(0, ...P.ev.map(e => e.d)), p95: pct(P.ev.map(e => e.d), 95), worst: [...P.ev].sort((a, b) => b.d - a.d).slice(0, 6) }, ev: { n: P.ev.length, inp: Math.max(0, ...P.ev.map(e => e.d)), p95: pct(P.ev.map(e => e.d), 95), worst: [...P.ev].sort((a, b) => b.d - a.d).slice(0, 6) }, wallMs: wall, tap: { n: taps.length, p50: pct(taps, 50), p95: pct(taps, 95), max: Math.max(0, ...taps) }, worstTaps,
    long: { n: P.long.length, max: Math.max(0, ...P.long.map(l => l.d)), sum: P.long.reduce((a, l) => a + l.d, 0), inTransMax: Math.max(0, ...longT.map(l => l.d)), inTransN: longT.length },
    loaf: { n: P.loaf.length, max: Math.max(0, ...P.loaf.map(l => l.d)), blocking: P.loaf.reduce((a, l) => a + l.b, 0), forcedLayoutMs: P.loaf.reduce((a, l) => a + l.sc.reduce((x, s) => x + s.fl, 0), 0) },
    frames: { n: dts.length, fps: fps(dts), p95dt: pct(dts, 95), over50: dts.filter(d => d > 50).length, trN: trFrames.length, trFps: fps(trFrames), trP95dt: pct(trFrames, 95) },
    cpuMs: { task: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), script: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), layout: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000), style: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), layoutCount: m1.LayoutCount - m0.LayoutCount, styleCount: m1.RecalcStyleCount - m0.RecalcStyleCount },
    trace, topInval, topForced, styleEls, forcedReflowEvents: forced, topScripts, lazyFetches: lazy, heapMB: +((m1.JSHeapUsedSize || 0) / 1e6).toFixed(1), domNodes: m1.Nodes,
  });
  if (L === 0) await page.screenshot({ path: `${OUT}/end.png` }).catch(() => {});
}
fs.writeFileSync(`${OUT}/lesson-perf-${TAG}.json`, JSON.stringify({ ...res, errs }, null, 1));
const l = res.lessons[0], md = [
  `## ⚡ lesson-perf ${FLOW} ${WIDTH}px ${NOMINAL}× (CPU ${rate}× sau hiệu chuẩn, hệ số runner ${res.factor}) – bài ${l.play.steps || '?'} bước (${JSON.stringify(l.play.kinds || {})}), đúng ${l.play.right}/sai ${l.play.wrong}, kết thúc: ${l.play.end ? '✅' : '❌ ' + (l.play.error || '')}`, '',
  '| Chỉ số | Giá trị | Ngưỡng |', '|---|---|---|',
  `| INP thật (Event Timing ≥16 ms): lớn nhất / p95 / số | ${l.ev.inp} / ${l.ev.p95} / ${l.ev.n} | ≤ ${BUDGET.tapP95} |`,
  `| Chạm→khung vẽ p50 / p95 / max | ${l.tap.p50} / ${l.tap.p95} / ${l.tap.max} ms (${l.tap.n} lần) | p95 ≤ ${BUDGET.tapP95} |`,
  `| Long task lúc chuyển câu: lớn nhất / số | ${l.long.inTransMax} ms / ${l.long.inTransN} | ≤ ${BUDGET.transLongMax} ms |`,
  `| Long task cả bài: số / lớn nhất / tổng | ${l.long.n} / ${l.long.max} / ${l.long.sum} ms | |`,
  `| FPS cả bài / lúc chuyển câu (khung p95) | ${l.frames.fps} / ${l.frames.trFps} (${l.frames.trP95dt} ms) | chuyển câu ≥ ${BUDGET.transFps} |`,
  `| LoAF: số / lớn nhất / chặn / ép layout | ${l.loaf.n} / ${l.loaf.max} / ${l.loaf.blocking} / ${l.loaf.forcedLayoutMs} ms | |`,
  `| CPU luồng chính: task / script / layout / style | ${l.cpuMs.task} / ${l.cpuMs.script} / ${l.cpuMs.layout} (${l.cpuMs.layoutCount}×) / ${l.cpuMs.style} (${l.cpuMs.styleCount}×) ms | |`,
  `| Trace: GC / giải mã ảnh / layout / style / paint / raster | ${l.trace.gc} / ${l.trace.decode} / ${l.trace.layout} / ${l.trace.style} / ${l.trace.paint} / ${l.trace.raster} ms | |`,
  `| Layout ép từ script / tải lười JS+CSS giữa bài / heap / DOM | ${l.forcedReflowEvents} / ${l.lazyFetches} / ${l.heapMB} MB / ${l.domNodes} | |`, '',
  `Phần tử bị tính lại style: ${l.styleEls} (trong ${l.cpuMs.styleCount} lượt)`, '**Nguyên nhân làm mất hiệu lực style (reason|node|extra):**', ...l.topInval.map(x => `- ${x.n}× ${x.k}`), '',
  '**Layout/style ép từ script (khung gọi đầu, ms, lần):**', ...l.topForced.map(x => `- ${x.ms} ms ×${x.n} ${x.k}`), '',
  '**Script chiếm nhiều thời gian nhất (LoAF):**', ...l.topScripts.map(s => `- ${s.ms} ms (ép layout ${s.forced} ms, ${s.n}×) ${s.k}`), '',
  '**Sự kiện chậm nhất (Event Timing: tổng / trễ vào / xử lý / vẽ):**', ...l.ev.worst.map(e => `- ${e.d} ms (${e.i}/${e.p}/${e.v}) ${e.n} ${e.t}`), '',
  '**Lần chạm chậm nhất:**', ...l.worstTaps.map(t => `- ${t.ms} ms ${t.l}`), errs.length ? '\nLỗi trang: ' + errs.slice(0, 3).join(' | ') : ''].join('\n');
fs.writeFileSync(`${OUT}/lesson-perf-${TAG}.md`, md); console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
await browser.close(); srv.close && srv.close();
const bad = [];
if (!l.play.end) bad.push('bài học không tới màn kết thúc');
if (l.ev.inp > BUDGET.tapP95) bad.push(`INP ${l.ev.inp} ms > ${BUDGET.tapP95}`);
if (l.tap.p95 > BUDGET.tapP95) bad.push(`chạm→vẽ p95 ${l.tap.p95} ms > ${BUDGET.tapP95}`);
if (l.long.inTransMax > BUDGET.transLongMax) bad.push(`long task lúc chuyển câu ${l.long.inTransMax} ms > ${BUDGET.transLongMax}`);
if (l.frames.trN >= 5 && l.frames.trFps < BUDGET.transFps) bad.push(`FPS lúc chuyển câu ${l.frames.trFps} < ${BUDGET.transFps}`);
if (bad.length) { console.error('✗ lesson-perf: ' + bad.join(' · ')); if (CHECK) process.exit(1); } else console.log('✓ lesson-perf: trong ngân sách');
process.exit(0);
