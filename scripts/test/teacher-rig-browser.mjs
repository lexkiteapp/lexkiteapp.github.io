// Cổng TeacherRig trong trình duyệt THẬT (CI teacher-rig.yml, không chạy trên Mac): docs/specs/teacher-rive-rig.md §Cổng QC
// fps/jank (CPU 1× và 4×) · so khung liên tiếp lúc chuyển trạng thái (không nhảy hình) · alpha nền sạch (không quầng xanh, không bẩn nền, không cắt đỉnh)
// · giảm chuyển động · 0 lỗi JS · 0 thay đổi DOM mỗi khung. Ảnh mỗi trạng thái → qa/teacher-rig/*.png (artifact).
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
import { waitFn } from '../lib/pw-wait.mjs';
const ROOT = path.resolve('web'), OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'qa/teacher-rig';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { js: 'text/javascript', json: 'application/json', webp: 'image/webp', png: 'image/png', html: 'text/html', css: 'text/css' };
const res = [], ok = (c, m) => { res.push((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
const PAGE = who => `<!doctype html><meta charset=utf-8><body style="margin:0;background:var(--bg,#fff)"><div id=t style="width:320px;margin:20px"></div>
<script src="js/characters.js"></script><script src="js/call/cues.js"></script><script src="js/teacher-rig.js"></script>
<script>window.rig=TeacherRig.mount(document.getElementById('t'),'${who}');window.mut=0;new MutationObserver(m=>{window.mut+=m.length}).observe(document.getElementById('t'),{subtree:true,childList:true,attributes:true});</script>`;
const browser = await chromium.launch();
async function open(who, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 520 }, deviceScaleFactor: 2, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url()); if (u.pathname === '/rig.html') return r.fulfill({ body: PAGE(who), contentType: 'text/html' });
    const f = path.join(ROOT, decodeURIComponent(u.pathname)); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f).slice(1)] || 'application/octet-stream' });
  });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('http://lk.test/rig.html'); await waitFn(page, () => window.rig && window.rig.stats.ready, null, { timeout: 15000 });
  return { ctx, page, errs };
}
// mỗi khung: thu nhỏ canvas còn 96 px rộng, ghép lên nền trang, trả trung bình |Δ| so với khung trước (0..255); alpha thô riêng cho cổng độ đục. f0 đặt lại mỗi lần đo – đo trong trang, không chụp màn
const DIFF = `(() => { const c = document.querySelector('.trig-cv'), w = 96, h = Math.round(96 * c.height / c.width), o = new OffscreenCanvas(w, h), x = o.getContext('2d', { willReadFrequently: true });
  let prev = null; window.diffs = []; window.blinks = []; window.alphas = []; window.tele = []; window.t0 = performance.now(); window.firstLast = null; window.f0 = null; const bg = getComputedStyle(document.body).backgroundColor;
  const step = () => { x.clearRect(0, 0, w, h); x.drawImage(c, 0, 0, w, h); const a = x.getImageData(0, 0, w, h).data;
  let al = 0; for (let i = 3; i < a.length; i += 4) al += a[i]; window.alphas.push(al);
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data; // so ẢNH NGƯỜI XEM THẤY (ghép lên nền trang): RGBA chưa nhân alpha thì điểm alpha 0,09 (gần vô hình) nhảy RGB 0 → đủ màu
  if (prev) { let s = 0; for (let i = 0; i < d.length; i++) s += Math.abs(d[i] - prev[i]); window.diffs.push(s / d.length); window.blinks.push(window.rig.stats.blink || 0); const S = window.rig.stats; window.tele.push(Math.round(performance.now() - window.t0) + 'ms w' + (S.poseW || 0).toFixed(2) + ' d' + S.draws + ' f' + S.prof.full + ' p' + S.prof.part + ' ' + S.shape + (S.speaking ? ' nói' : '')); } if (!window.f0) window.f0 = d.slice(); window.fN = d; prev = d.slice(); if (window.diffOn) requestAnimationFrame(step); };
  window.diffOn = true; requestAnimationFrame(step); })()`;
const total = page => page.evaluate(() => { let s = 0; for (let i = 0; i < window.f0.length; i++) s += Math.abs(window.f0[i] - window.fN[i]); window.diffOn = false; return s / window.f0.length; });
for (const who of ['ama', 'carlos']) {
  const { ctx, page, errs } = await open(who);
  await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/${who}-idle.png` });
  // --- alpha nền: viền mờ (0 < a < 255) không ngả xanh phông, không bụi nền rời, không cắt đỉnh ---
  const A = await page.evaluate(() => { const c = document.querySelector('.trig-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    let edge = 0, green = 0, top = 0, dust = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, a = d[i + 3]; if (!a) continue;
      if (y < 3) top++; if (a < 250) { edge++; if (d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 40) green++; }
      if (a > 0 && a < 40) { let n = 0; for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && d[(yy * W + xx) * 4 + 3] > 0) n++; } if (!n) dust++; } }
    return { edge, green, top, dust, W, H }; });
  ok(A.edge > 0 && A.green / A.edge <= 0.01, `${who}: viền sạch – ${A.green}/${A.edge} điểm viền ngả xanh phông (≤ 1 %)`);
  ok(A.top === 0 && A.dust <= 20, `${who}: không cắt đỉnh (${A.top} điểm ở 3 hàng trên), không bụi nền rời (${A.dust})`);
  // --- fps/jank: nói (mốc CI thật) + cử chỉ + biểu cảm, CPU 1× rồi 4× ---
  const cdp = await ctx.newCDPSession(page);
  for (const rate of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await page.evaluate(async () => { const k = Object.keys(LK_CUES.k).find(x => LK_CUES.k[x]); const s0 = { ...rig.stats }, p0 = { ...rig.stats.prof }, t0 = performance.now(); let n = 0, long = 0, last = t0;
      const run = () => new Promise(done => { const f = now => { n++; if (now - last > 34) long++; last = now; if (now - t0 < 3000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
      rig.speak(null, LK_CUES.k[k], { text: k }); setTimeout(() => rig.setEmotion('praise'), 900); setTimeout(() => rig.gesture('nod'), 1300);
      await run(); const dt = performance.now() - t0, P = rig.stats.prof, d = k => P[k] - p0[k], fr = Math.max(1, d('n'));
      return { fps: Math.round(1000 * n / dt), long, n, draws: rig.stats.draws - s0.draws, prof: `JS ${(d('js') / fr).toFixed(2)} ms/khung (vẽ ${(d('paint') / fr).toFixed(2)}) · toàn ${d('full')} · vùng ${d('part')} · bỏ ${d('skip')}` }; });
    ok(r.fps >= (rate === 1 ? 55 : 50) && r.long <= r.n * 0.05, `${who}: CPU ${rate}× – ${r.fps} fps (≥ ${rate === 1 ? 55 : 50}), khung > 34 ms: ${r.long}/${r.n} (≤ 5 %), vẽ ${r.draws} · ${r.prof}`);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.screenshot({ path: `${OUT}/${who}-praise.png` });
  // --- so khung: mặt vẽ → ảnh tư thế (wave) và biểu cảm sad → happy: không khung nào nhảy quá 35 % tổng thay đổi ---
  for (const [label, act] of [['wave', () => rig.gesture('wave')], ['sad→happy', () => rig.setEmotion('happy')]]) {
    if (label !== 'wave') await page.evaluate(() => rig.setEmotion('sad')), await page.waitForTimeout(900);
    // câu nói của bài đo CPU (3,75 s) còn đuôi: cử chỉ lúc đang nói xếp hàng (đúng thiết kế) và miệng nhảy viseme (cố ý không làm mượt) → đo chuyển SAU khi im
    await waitFn(page, () => !rig.stats.speaking, null, { timeout: 8000 }); await page.waitForTimeout(150);
    await page.evaluate(DIFF); await page.evaluate(`(${act})()`); await page.waitForTimeout(label === 'wave' ? 700 : 1200);
    if (label === 'wave') await page.screenshot({ path: `${OUT}/${who}-wave.png` });
    // chớp mắt là sự kiện riêng của máy nghỉ (không phải bước chuyển): khung có mi đang khép (cả khung trước) không tính vào "nhảy" – vẫn cộng vào tổng
    const tot = await total(page), D = await page.evaluate(() => ({ d: window.diffs, b: window.blinks })), at = D.d.map((v, i) => (D.b[i] > 0.05 || D.b[i - 1] > 0.05 ? 0 : v)), mx = Math.max(0, ...at), mi = at.indexOf(mx);
    const tele = await page.evaluate(() => window.tele); // nhật ký mỗi khung: thời điểm · poseW · số lần vẽ (toàn/vùng) · hình miệng
    const top = D.d.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]).slice(0, 3).map(([v, i]) => `${v.toFixed(2)}@${i}${D.b[i] > 0.05 ? 'chớp' : ''}`).join(' ');
    ok(tot > 0.2 && mx <= Math.max(0.35 * tot, 0.6), `${who}: chuyển ${label} liền mạch – khung đổi nhiều nhất ${mx.toFixed(2)}@${mi} / tổng ${tot.toFixed(2)} (≤ 35 %) · lớn nhất ${top} / ${D.d.length} khung`);
    if (mx > Math.max(0.35 * tot, 0.6)) console.log(`${who} ${label} mỗi khung: ` + D.d.map((v, i) => `[${i}] ${v.toFixed(2)} ${tele[i]}`).slice(0, 24).join(' · '));
    // mờ chéo không làm người trong suốt giữa chừng (source-over: alpha 1 - w(1-w) → trũng ~25 %): tổng alpha mọi khung ≥ 98 % của min(đầu, cuối)
    if (label === 'wave') { const al = await page.evaluate(() => window.alphas), lo = Math.min(al[0], al[al.length - 1]), mn = Math.min(...al);
      ok(mn >= 0.98 * lo, `${who}: mờ chéo giữ độ đục – alpha nhỏ nhất ${(100 * mn / lo).toFixed(1)} % của min(đầu, cuối) (≥ 98 %)`); }
    await page.waitForTimeout(1800);
  }
  const mut = await page.evaluate(() => window.mut);
  ok(mut <= 2, `${who}: 0 thay đổi DOM mỗi khung (${mut} lần, chỉ lúc gắn canvas)`);
  ok(!errs.length, `${who}: 0 lỗi JS ${errs.slice(0, 2).join(' | ')}`);
  for (const [i, gname] of ['point', 'cheer', 'thumbs_up', 'think'].entries()) { await page.evaluate(gn => rig.gesture(gn), gname); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${who}-${i}-${gname}.png` }); await page.waitForTimeout(2200); }
  await ctx.close();
  // --- giảm chuyển động: khớp cổ đứng yên dù gọi gật/lắc ---
  const R2 = await open(who, { reduce: true });
  const m = await R2.page.evaluate(async () => { rig.gesture('nod'); rig.gesture('shake'); rig.setEmotion('praise'); let mx = 0; const t0 = performance.now();
    await new Promise(d => { const f = () => { mx = Math.max(mx, Math.abs(rig.stats.tilt || 0), Math.abs(rig.stats.nod || 0)); if (performance.now() - t0 < 1500) requestAnimationFrame(f); else d(); }; requestAnimationFrame(f); });
    return { mx, calm: rig.stats.calm }; });
  ok(m.calm && m.mx === 0, `${who}: prefers-reduced-motion – khớp cổ đứng yên (lớn nhất ${m.mx})`);
  await R2.ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/result.txt`, res.join('\n') + '\n');
console.log(res.join('\n')); console.log(process.exitCode ? '✗ teacher-rig-browser: ĐỎ' : '✓ teacher-rig-browser: đạt');
