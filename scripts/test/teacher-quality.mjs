// Cổng chất lượng giáo viên Ama/Carlos (chủ 05/11: lag · vệt đen · lệch miệng). CI: .github/workflows/teacher-quality.yml (Chromium + WebKit). Không nới ngưỡng.
//  1. Dung lượng (tĩnh, chạy cả npm test): mỗi clip ≤ 260 KB, idle.webm ≤ 150 KB, ảnh tĩnh ≤ 48 KB; trang có 2 chỗ giáo viên im lặng tải ≤ 120 KB tài sản giáo viên.
//  2. Vệt/khung đen (trình duyệt): canvas WebGL ghép alpha KHÔNG có điểm mờ ngoài người (0 < alpha < 8/255 → khung xám-đen trên nền sáng) – trước sửa: 4–5,5 nghìn điểm/khung;
//     viền tối (mép bán trong suốt tối hơn ½ phần thân kề bên) ≤ 10 %.
//  3. Lag: tải texture = số khung video mới (≤ 24/s + dư), không phải mỗi rAF (trước: 60/s); CPU chậm 4× (Chromium): ≥ 50 fps, tác vụ dài > 50 ms ≤ 2 trong 4 s
//     với 2 chỗ giáo viên + mặt vẽ đang nói. 4. Lệch miệng: chỗ giáo viên im lặng không phát clip nhép miệng (0 video). Khớp miệng có tiếng: lip-clock.mjs (±33 ms).
// Chạy: node scripts/test/teacher-quality.mjs [--static]   (trình duyệt: cần playwright; thiếu → chỉ phần tĩnh)
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
import { waitFn } from '../lib/pw-wait.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), WEB = path.join(ROOT, 'web');
const errs = [], R = JSON.parse(fs.readFileSync(path.join(WEB, 'teach/characters.json'), 'utf8'));
const CAP = { clip: 260 * 1024, webm: 150 * 1024, still: 48 * 1024, page: 120 * 1024 };
for (const who of Object.keys(R.people)) for (const f of fs.readdirSync(path.join(WEB, 'teach', who))) {
  const n = fs.statSync(path.join(WEB, 'teach', who, f)).size, k = `${who}/${f}`;
  if (/^[a-z_]+\.mp4$/.test(f) && n > CAP.clip) errs.push(`${k}: ${n >> 10} KB > ${CAP.clip >> 10} KB (clip tư thế)`);
  if (f === 'idle.webm' && n > CAP.webm) errs.push(`${k}: ${n >> 10} KB > ${CAP.webm >> 10} KB`);
  if (/^still-[a-z_]+\.webp$/.test(f) && n > CAP.still) errs.push(`${k}: ${n >> 10} KB > ${CAP.still >> 10} KB (ảnh tĩnh)`);
}
// chỗ giáo viên im lặng: clip chỉ được phát nếu ở QUIET (miệng ngậm, scripts/teach/mouth_motion.py --check); data-talk (có lời) mới được clip nói
const live = fs.readFileSync(path.join(WEB, 'js/teacher-live.js'), 'utf8');
if (!/const QUIET = new Set\(\[/.test(live) || !/if \(!quiet && !talk\) return;/.test(live)) errs.push('teacher-live.js: thiếu chặn clip nhép miệng khi im lặng (QUIET)');
if (!/requestVideoFrameCallback/.test(live) || !/visibilitychange/.test(live)) errs.push('teacher-live.js: phải tải texture theo khung video mới (requestVideoFrameCallback) và dừng khi tab ẩn');
for (const [f, s] of [['teacher-live.js', live], ['lesson/teacher.js', fs.readFileSync(path.join(WEB, 'js/lesson/teacher.js'), 'utf8')]]) {
  if (/precision mediump/.test(s) || !/a0>\.03\?255\.\/219\.:1\./.test(s) || !/\(a-\.06\)\/\.94/.test(s)) errs.push(`${f}: shader ghép alpha phải highp + tự đo mức đen + cắt nhiễu (vệt đen)`);
}
if (!/LS\.clock\(/.test(fs.readFileSync(path.join(WEB, 'js/lesson/teacher.js'), 'utf8'))) errs.push('lesson/teacher.js: mặt vẽ phải dùng LipSync.clock (đồng hồ = tiếng thật, ±33 ms)');
if (errs.length) { console.error('✗ teacher-quality (tĩnh):\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ teacher-quality tĩnh: dung lượng, QUIET, rVFC, shader, đồng hồ khớp miệng');
if (process.argv.includes('--static')) process.exit(0);

let pw; try { pw = await import('playwright'); } catch (e) { console.log('teacher-quality: playwright chưa cài – bỏ qua phần trình duyệt'); process.exit(0); }
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.html': 'text/html' };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=390"><style>body{margin:0;background:#fbf3ea}#row{display:flex;gap:24px;align-items:flex-end;padding:40px 20px}#lt{width:200px;height:240px;position:relative}.tch-rig{position:relative;width:100%;height:100%}.tch-rig img{width:100%;height:100%;object-fit:contain;object-position:50% 100%}.tch-cv{position:absolute;inset:0;width:100%;height:100%}</style>
<div id="row"></div><div id="lt"></div><script src="js/characters.js"></script><script src="js/teacher-slot.js"></script><script src="js/lesson/teacher.js"></script>`;
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (u === '/__tq.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end(HARNESS); }
  const p = path.join(WEB, u); if (!p.startsWith(WEB) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  const n = fs.statSync(p).size, h = { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'access-control-allow-origin': '*', 'accept-ranges': 'bytes' };
  const m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || ''); // WebKit chỉ phát video qua Range
  if (m) { const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : n - 1; s.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${n}`, 'content-length': b - a + 1 }); return fs.createReadStream(p, { start: a, end: b }).pipe(s); }
  s.writeHead(200, { ...h, 'content-length': n }); fs.createReadStream(p).pipe(s);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
// Chromium: dùng Google Chrome (có sẵn trên runner ubuntu, có H.264) – bản Chromium của Playwright không có codec độc quyền → clip không phát
// đo trong trang: điểm mờ (khung) + viền tối trên ảnh đọc lại từ canvas WebGL của chỗ giáo viên
const PROBE = `(() => { const o = document.createElement('canvas'), x = o.getContext('2d', { willReadFrequently: true });
  return [...document.querySelectorAll('#row canvas')].map(c => { o.width = c.width; o.height = c.height; x.clearRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0);
    const W = o.width, H = o.height, d = x.getImageData(0, 0, W, H).data, A = i => d[i * 4 + 3], L = i => (d[i * 4] * .2126 + d[i * 4 + 1] * .7152 + d[i * 4 + 2] * .0722) / 255;
    let haze = 0, hzNear = 0, band = 0, dark = 0, op = 0;
    for (let i = 0; i < W * H; i++) { const a = A(i); if (a > 0 && a < 8) { haze++; let near = 0; const y = (i / W) | 0, xx = i % W; for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) { const j = (y + dy) * W + xx + dx; if (j >= 0 && j < W * H && A(j) > 128) { near = 1; break; } } if (near) hzNear++; } if (a > 247) op++;
      if (a > 12 && a < 230) { let nb = 0; const y = (i / W) | 0, xx = i % W; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = (y + dy) * W + xx + dx; if (j >= 0 && j < W * H && A(j) > 247) nb = Math.max(nb, L(j)); }
        if (nb > 0.25) { band++; if (L(i) < 0.5 * nb) dark++; } } }
    return { haze, hzNear, band, dark, op }; }); })()`;
const results = {};
for (const name of ['chromium', 'webkit']) {
  const br = await (name === 'chromium' ? pw.chromium.launch({ channel: 'chrome' }).catch(() => pw.chromium.launch()) : pw[name].launch()).catch(e => { console.log(`teacher-quality: không mở được ${name} – ${String(e).split('\n')[0]}`); return null; }); if (!br) { if (name === 'chromium') process.exit(1); continue; }
  const page = await br.newPage({ viewport: { width: 390, height: 844 } });
  // đọc lại canvas WebGL ở task khác (PROBE) cần giữ buffer: không có thì trình duyệt trả buffer đã xoá → "0 điểm đục" giả. Chỉ trong harness.
  await page.addInitScript(() => { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return gc.call(this, t, /webgl/.test(t) ? { ...(o || {}), preserveDrawingBuffer: true } : o); }; });
  const perr = [], bytes = { teach: 0 };
  page.on('pageerror', e => perr.push(String(e))); page.on('response', async r => { if (/\/teach\//.test(r.url())) { const b = await r.body().catch(() => null); if (b) bytes.teach += b.length; } });
  await page.goto(BASE + '/__tq.html'); await waitFn(page, () => window.Chars && Chars.slot && window.LessonTeacher);
  // (a) 2 chỗ giáo viên IM LẶNG như Home/lộ trình (vòng nghỉ + cử chỉ point) → phải là ảnh tĩnh, 0 video, dung lượng nhỏ
  await page.evaluate(() => { document.getElementById('row').innerHTML = Chars.slot('ama', { idle: true, size: 'l', lazy: false }) + Chars.slot('carlos', { pose: 'point', size: 'l', clip: true, loop: true, lazy: false }); });
  await page.waitForTimeout(2500);
  const silent = await page.evaluate(() => ({ videos: document.querySelectorAll('#row video').length, canvases: document.querySelectorAll('#row canvas').length, stills: [...document.querySelectorAll('#row img.tslot-img')].filter(i => i.complete && i.naturalWidth).length }));
  const silentBytes = bytes.teach;
  if (silent.videos || silent.canvases) errs.push(`${name}: chỗ giáo viên im lặng vẫn phát clip nhép miệng (${silent.videos} video, ${silent.canvases} canvas) – lệch miệng + giải mã thừa`);
  if (silent.stills !== 2) errs.push(`${name}: chỗ giáo viên im lặng phải hiện đủ 2 ảnh tĩnh (có ${silent.stills})`);
  if (silentBytes > CAP.page) errs.push(`${name}: 2 chỗ giáo viên im lặng tải ${silentBytes >> 10} KB > ${CAP.page >> 10} KB`);
  // (b) có lời (data-talk) → clip phát qua WebGL: đo khung đen / viền tối / số lần tải texture
  await page.evaluate(() => { const row = document.getElementById('row'); row.innerHTML = Chars.slot('ama', { pose: 'point', size: 'xl', lazy: false }) + Chars.slot('carlos', { pose: 'point', size: 'xl', lazy: false });
    row.querySelectorAll('.tslot').forEach(s => { s.dataset.clip = Chars.clip(s.dataset.teacher, 'point'); s.dataset.talk = Chars.clip(s.dataset.teacher, 'talk'); }); });
  await waitFn(page, () => window.TeacherLive || document.querySelector('script[src*="teacher-live"]'), null, { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => new Promise(r => { const go = () => { document.querySelectorAll('#row .tslot[data-clip]').forEach(TeacherLive); r(); }; if (window.TeacherLive) go(); else { const s = document.createElement('script'); s.src = 'js/teacher-live.js'; s.onload = go; document.head.appendChild(s); } }));
  const played = await waitFn(page, () => document.querySelectorAll('#row .tslot.live').length === 2, null, { timeout: 8000 }).then(() => true, () => false);
  const res = results[name] = { silent, silentKB: silentBytes >> 10, played };
  if (played) {
    const f0 = await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => s.lkFrames || 0)), t0 = Date.now();
    let worst = { haze: 0, darkPct: 0 };
    for (let k = 0; k < 6; k++) { await page.waitForTimeout(400); for (const m of await page.evaluate(PROBE)) { worst.haze = Math.max(worst.haze, m.haze); worst.hzNear = Math.max(worst.hzNear || 0, m.hzNear); worst.darkPct = Math.max(worst.darkPct, m.band ? Math.round(m.dark / m.band * 1000) / 10 : 0); if (m.op < 1000) errs.push(`${name}: canvas giáo viên gần như trống (${m.op} điểm đục) – mất hình`); } }
    const secs = (Date.now() - t0) / 1000, up = (await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => s.lkFrames || 0))).map((n, i) => (n - f0[i]) / secs);
    Object.assign(res, { uploadMaxMs: await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => Math.round(s.lkMs || 0))), uploadAvgMs: await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => +((s.lkSum || 0) / Math.max(1, s.lkFrames || 0)).toFixed(1))), hazeNear3px: worst.hzNear, haze: worst.haze, darkPct: worst.darkPct, uploadsPerSec: up.map(x => Math.round(x)) });
    if (worst.haze > 20) errs.push(`${name}: ${worst.haze} điểm mờ ngoài người (khung xám-đen trên nền sáng) > 20`);
    if (worst.darkPct > 10) errs.push(`${name}: viền tối ${worst.darkPct} % mép > 10 %`);
    if (up.some(x => x > 24 * 1.15 + 2)) errs.push(`${name}: tải texture ${up.map(Math.round)} lần/s > khung video (24/s) – vẽ theo rAF thay vì theo khung mới`);
  } else if (name === 'chromium') errs.push('chromium: clip có lời không phát được (WebGL/H.264) – không đo được khung đen');
  else res.note = 'không phát H.264 trong WebKit Linux → giữ ảnh tĩnh (đúng hạ cấp)';
  // (c) mặt vẽ khớp miệng trong bài học + CPU chậm 4× (chỉ Chromium có CDP)
  res.slow1x = await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].filter(s => s.lkSlow).length);
  if (played && res.slow1x) errs.push(`${name}: máy thường (1×) đã hạ cấp ${res.slow1x} clip về ảnh tĩnh – tải texture quá chậm`);
  const u0 = await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => [s.lkSum || 0, s.lkFrames || 0]));
  const cdp = name === 'chromium' ? await page.context().newCDPSession(page) : null; if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__lt = LessonTeacher.mount(document.getElementById('lt'), 'ama', { lip: true }); });
  await waitFn(page, () => window.__lt.lip() && window.__lt.lip().frames > 10, null, { timeout: 15000 }).catch(() => {});
  const perf = await page.evaluate(() => new Promise(r => { let lt = 0; try { new PerformanceObserver(l => { lt += l.getEntries().filter(e => e.duration > 50).length; }).observe({ type: 'longtask' }); } catch (e) { /* WebKit không có longtask */ }
    window.__lt.say('Hello there, let us practise this sentence together right now, nice and slow.', { dur: 4 });
    const s0 = window.__lt.lip() ? window.__lt.lip().frames : 0; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else r({ fps: Math.round(n / ((performance.now() - t0) / 1000)), long: lt, face: window.__lt.lip() ? window.__lt.lip().frames - s0 : -1 }); }; requestAnimationFrame(f); }));
  if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  res.perf = perf; res.slow4x = await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].filter(s => s.lkSlow).length); res.upload4x = (await page.evaluate(() => [...document.querySelectorAll('#row .tslot')].map(s => [s.lkSum || 0, s.lkFrames || 0]))).map(([a, n], i) => (n - u0[i][1] ? +((a - u0[i][0]) / (n - u0[i][1])).toFixed(1) + 'ms×' + (n - u0[i][1]) : 0));
  if (perf.face < 0) errs.push(`${name}: mặt vẽ khớp miệng không chạy`);
  if (name === 'chromium' && (perf.fps < 50 || perf.long > 2)) errs.push(`chromium CPU 4×: ${perf.fps} fps, ${perf.long} tác vụ dài – cần ≥ 50 fps, ≤ 2`);
  if (perr.length) errs.push(`${name}: lỗi JS: ${perr.slice(0, 3).join(' | ')}`);
  await br.close();
}
srv.close();
console.log('teacher-quality số đo: ' + JSON.stringify(results));
if (errs.length) { console.error('✗ teacher-quality:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ teacher-quality: không khung/viền đen, không nhép miệng khi im, tải theo khung video, CPU 4× đạt');
