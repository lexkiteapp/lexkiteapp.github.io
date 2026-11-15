// Cổng TeacherRig trên bản LIVE (bước của post-deploy-check.yml, chạy sau mỗi lượt Pages deploy; chạy tay: workflow_dispatch).
// Chromium + WebKit × 390px/1280px × sáng/tối: màn câu hỏi bài học (#/lesson/go?demo=1) + màn Call (#/call/bakery, chỉ Chromium: micro giả) đều phải chạy canvas rig,
// 0 lỗi JS/console same-origin, không tràn ngang; fps CPU 1× ≥ 55 và 4× ≥ 50 (Chromium, trung vị, đo lại đúng 1 lần – ngưỡng giống teacher-rig-browser.mjs, KHÔNG hạ);
// khớp miệng: rig nói mốc CI thật (LK_CUES) → lệch hình-so-mốc ≤ ±33 ms; giảm chuyển động → rig đứng yên (calm). Ảnh từng màn + report.md → <out>/rig.
// Dùng: node scripts/test/rig-live.mjs [base=https://lexkite.com] [thư-mục-ra=out/post-deploy]   Env: LEXKITE_CI_HEADER, RIG_LIVE_ONLY=chromium|webkit
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import { routeCiHeader } from '../lib/http.mjs';
const BASE = (process.argv[2] || 'https://lexkite.com').replace(/\/$/, ''), OUT = (process.argv[3] || 'out/post-deploy') + '/rig';
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = new URL(BASE).origin, CI = process.env.LEXKITE_CI_HEADER ? process.env.LEXKITE_CI_HEADER.trim() : '';
const FPS_MIN = { 1: 55, 4: 50 }, LAG_MAX = 33, AGREE_MIN = 0.8; // ngưỡng KHÔNG hạ (scripts/test/ci-policy.mjs)
const IGNORE = /favicon|\/cdn-cgi\/|\/api\/hit|\[Report Only\]|report-only policy|Content Security Policy/; // CSP ở chế độ report-only (header bản live) in ra console như 'error' nhưng không chặn gì – không phải lỗi JS của rig
const APP = `${BASE}/app/?sandbox=1&hl=en`;
const lines = [], fails = [], ok = (c, m) => { lines.push((c ? '✅ ' : '❌ ') + m); if (!c) fails.push(m); };
const info = m => lines.push('• ' + m);
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];

const ENGINES = [['chromium', chromium, { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }], ['webkit', webkit, {}]]
  .filter(e => !process.env.RIG_LIVE_ONLY || process.env.RIG_LIVE_ONLY === e[0]);
const VPS = [{ id: '390', width: 390, height: 844, isMobile: true, hasTouch: true }, { id: '1280', width: 1280, height: 800 }];

async function open(browser, vp, scheme, reduce) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: scheme, reducedMotion: reduce ? 'reduce' : 'no-preference', permissions: browser.browserType().name() === 'chromium' ? ['microphone'] : [] }); // WebKit không có quyền 'microphone' (newPage ném lỗi)
  await routeCiHeader(ctx, BASE, CI);
  const page = await ctx.newPage(), errs = [];
  const same = u => { try { return new URL(u).origin === ORIGIN; } catch (e) { return false; } };
  page.on('pageerror', e => errs.push('exception: ' + String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && (!m.location().url || same(m.location().url)) && !IGNORE.test(m.text() + m.location().url)) errs.push('console: ' + m.text().slice(0, 200)); });
  return { ctx, page, errs };
}
const rigReady = (page, ms = 40000) => page.waitForFunction(() => (window.__lkRigs || []).some(r => r.stats.ready && !r.stats.failed && r.stats.frames > 20) && !!document.querySelector('.tch-rig canvas.tch-face.trig-cv'), null, { timeout: ms });

// khung rig/giây trong `ms` (rig vẽ vòng rAF riêng: stats.frames tăng mỗi khung)
const fpsOnce = (page, ms = 2000) => page.evaluate(async ms => { const r = window.__lkRigs.find(x => x.stats.ready), f0 = r.stats.frames, t0 = performance.now(); await new Promise(ok => setTimeout(ok, ms)); return (r.stats.frames - f0) / ((performance.now() - t0) / 1000); }, ms);
async function fpsGate(page, tag) {
  const cdp = await page.context().newCDPSession(page);
  for (const rate of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const set = async n => { const a = []; await fpsOnce(page, 1000); for (let i = 0; i < n; i++) a.push(await fpsOnce(page)); return a; };
    let a = await set(rate === 1 ? 5 : 9), retried = false;
    if (med(a) < FPS_MIN[rate]) { retried = true; a = await set(rate === 1 ? 5 : 9); }
    ok(med(a) >= FPS_MIN[rate], `${tag}: rig CPU ${rate}× – ${med(a).toFixed(0)} fps (≥ ${FPS_MIN[rate]}; trung vị ${a.length} mẫu${retried ? ', đã đo lại 1 lần' : ''}: ${a.map(x => x.toFixed(0)).join('/')})`);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}

// rig nói câu có mốc CI thật (không tiếng: đồng hồ = giờ tường) → so hình miệng từng khung với stateAt(mốc, t) ở mọi độ lệch −100…+100 ms, lấy độ lệch khớp nhất
async function lipGate(page, tag) {
  const r = await page.evaluate(async () => {
    const need = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    if (!window.LK_CUES) await need('js/call/cues.js');
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:220px;opacity:.02;pointer-events:none'; document.body.appendChild(host);
    const rig = TeacherRig.mount(host, 'carlos'); await rig.ready;
    const key = Object.keys(LK_CUES.k).find(k => LK_CUES.k[k][0] > 2500 && LK_CUES.k[k][0] < 6000) || Object.keys(LK_CUES.k)[0];
    const cue = TeacherRig.core.cuesOf(LK_CUES.k[key]), LS = window.LipSync, rec = [];
    const done = rig.speak(null, LK_CUES.k[key], { text: key }), t0 = performance.now();
    await new Promise(ok => { (function f() { const t = performance.now() - t0; rec.push([t, rig.stats.shape, rig.stats.open]); if (t < cue.dur * 1000 + 100) requestAnimationFrame(f); else ok(); })(); });
    await done; rig.quiet();
    const exp = t => { const s = LS.stateAt(cue.cues, Math.max(0, t / 1000)); return s.k < 0.5 ? s.a : s.b; };
    let best = { lag: 0, agree: 0 };
    for (let lag = -100; lag <= 100; lag += 4) { let n = 0, m = 0; for (const [t, sh] of rec) { if (t < 150 || t > cue.dur * 1000 - 150) continue; n++; if (sh === exp(t - lag)) m++; } const ag = n ? m / n : 0; if (ag > best.agree) best = { lag, agree: ag }; }
    const shapes = new Set(rec.map(x => x[1])); rig.destroy(); host.remove();
    return { key, dur: cue.dur, frames: rec.length, lag: best.lag, agree: best.agree, shapes: shapes.size, maxOpen: Math.max(...rec.map(x => x[2])) };
  });
  ok(r.frames > 20 && r.shapes >= 3 && r.maxOpen > 0.2, `${tag}: miệng chuyển động khi nói (${r.frames} khung, ${r.shapes} hình, há tối đa ${r.maxOpen})`);
  ok(Math.abs(r.lag) <= LAG_MAX && r.agree >= AGREE_MIN, `${tag}: khớp miệng–mốc CI lệch ${r.lag} ms (≤ ±${LAG_MAX}), khớp ${(r.agree * 100).toFixed(0)} % khung (≥ ${AGREE_MIN * 100} %)`);
}

async function lessonScreen(browser, name, vp, scheme) {
  const tag = `${name} ${vp.id}px ${scheme} · bài học`, { ctx, page, errs } = await open(browser, vp, scheme, false);
  try {
    await page.goto(`${APP}#/lesson/go?demo=1`, { waitUntil: 'load', timeout: 45000 });
    await rigReady(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/lesson-${name}-${vp.id}-${scheme}.png` });
    const g = await page.evaluate(() => { const c = document.querySelector('.tch-rig canvas.tch-face.trig-cv'), b = c.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), over: document.documentElement.scrollWidth - innerWidth, failed: (window.__lkRigs || []).some(r => r.stats.failed) }; });
    ok(g.w >= 60 && g.h >= 60 && !g.failed, `${tag}: rig đang chạy (canvas ${g.w}×${g.h})`);
    ok(g.over <= 1, `${tag}: không tràn ngang (${g.over} px)`);
    if (name === 'chromium' && scheme === 'light') await fpsGate(page, tag);
    if (scheme === 'dark' || name === 'webkit') await lipGate(page, tag);
    ok(!errs.length, `${tag}: 0 lỗi JS/console${errs.length ? ' – ' + errs.slice(0, 3).join(' | ') : ''}`);
  } catch (e) { ok(false, `${tag}: ${String(e.message).split('\n')[0]}`); try { await page.screenshot({ path: `${OUT}/lesson-${name}-${vp.id}-${scheme}-FAIL.png` }); } catch (x) { /* bỏ qua */ } }
  await ctx.close();
}

async function callScreen(browser, name, vp, scheme) {
  const tag = `${name} ${vp.id}px ${scheme} · Call`, { ctx, page, errs } = await open(browser, vp, scheme, false);
  try {
    await page.goto(`${APP}#/call/bakery`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForSelector('#callGo', { timeout: 30000 });
    if (name !== 'chromium') { ok(true, `${tag}: màn chuẩn bị gọi hiện (WebKit không có micro giả – không vào cuộc gọi)`); await page.screenshot({ path: `${OUT}/call-${name}-${vp.id}-${scheme}.png` }); }
    else {
      await page.click('#callGo'); await page.waitForSelector('.call-ov', { timeout: 20000 });
      await rigReady(page); await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/call-${name}-${vp.id}-${scheme}.png` });
      const s = await page.evaluate(() => ({ rig: !!(window.TeacherRig && document.querySelector('.tch-rig canvas.tch-face.trig-cv')), lip: window.__callState ? window.__callState().lip : null, over: document.documentElement.scrollWidth - innerWidth }));
      ok(s.rig && s.lip && s.lip.frames > 30, `${tag}: Call chạy TeacherRig (${s.lip ? s.lip.frames : 0} khung, chế độ ${s.lip && s.lip.mode})`);
      ok(s.over <= 1, `${tag}: Call không tràn ngang (${s.over} px)`);
    }
    ok(!errs.length, `${tag}: 0 lỗi JS/console${errs.length ? ' – ' + errs.slice(0, 3).join(' | ') : ''}`);
  } catch (e) { ok(false, `${tag}: ${String(e.message).split('\n')[0]}`); try { await page.screenshot({ path: `${OUT}/call-${name}-${vp.id}-${scheme}-FAIL.png` }); } catch (x) { /* bỏ qua */ } }
  await ctx.close();
}

async function reducedMotion(browser) {
  const vp = VPS[1], tag = `chromium ${vp.id}px · giảm chuyển động`, { ctx, page, errs } = await open(browser, vp, 'light', true);
  try {
    await page.goto(`${APP}#/lesson/go?demo=1`, { waitUntil: 'load', timeout: 45000 }); await rigReady(page); await page.waitForTimeout(2500);
    const r = await page.evaluate(() => { const s = window.__lkRigs.find(x => x.stats.ready).stats; return { calm: s.calm, tilt: s.tilt, nod: s.nod }; });
    ok(r.calm === true && !r.tilt && !r.nod, `${tag}: rig đứng yên (calm=${r.calm}, nghiêng ${r.tilt || 0}, gật ${r.nod || 0})`);
    ok(!errs.length, `${tag}: 0 lỗi JS/console`);
  } catch (e) { ok(false, `${tag}: ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}

for (const [name, type, opt] of ENGINES) {
  const browser = await type.launch(opt);
  for (const vp of VPS) for (const scheme of ['light', 'dark']) { await lessonScreen(browser, name, vp, scheme); await callScreen(browser, name, vp, scheme); }
  if (name === 'chromium') await reducedMotion(browser);
  await browser.close();
}
const md = `### 🎭 TeacherRig trên bản live (${BASE})\n\n${lines.join('\n')}\n\n${fails.length ? `❌ ${fails.length} mục trượt` : '✅ đạt'} · ảnh: artifact post-deploy-check/rig\n`;
fs.writeFileSync(`${OUT}/report.md`, md); console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + md);
if (fails.length) process.exit(1);
