// 🎞️ Cổng chuyển động giáo viên trên WebKit (Safari): clip WebGL của chỗ giáo viên (web/js/teacher-slot.js) phải MƯỢT và VIỀN NÉT (live 3/11 iPhone:
// tay Ama giật, viền đen méo khi cử động). Chạy trên macOS (WebKit Linux không giải mã H.264 → cổng sẽ rỗng). Lộ trình #/learn, 390×844, nền tối, DPR 3.
//  · mượt: texImage2D chỉ khi video sang khung mới (số lần tải ≤ số khung video + 2), khoảng rAF p95 ≤ 34 ms, khung > 50 ms ≤ 3 % trong 3 s
//  · viền: canvas không bị phóng to – chiều cao nguồn ≥ 0,9 × chiều cao hiển thị × DPR; cỡ l/xl trên retina phải dùng clip -hd (m không cần: 480 px ≥ 403 px thiết bị)
//  · đo cả 2 clip của Home: wave (đầu trang) + point (lộ trình, lỗi chủ báo); khung vung tay méo đo ở motion_smear.py (job clips)
//  · ảnh cận khung giáo viên → teacher-motion-*.png, ảnh tay đang vung nhanh của point → arm-*.png (trước/sau cho PR)
// Dùng: node scripts/test/teacher-motion-webkit.mjs [web=web] [out=out/teacher-motion] [--report]   (--report: chỉ chụp + báo, không chặn – ảnh "trước")
import fs from 'node:fs'; import path from 'node:path';
import { webkit } from 'playwright';
const args = process.argv.slice(2), REPORT = args.includes('--report'), [WEB = 'web', OUT = 'out/teacher-motion'] = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const browser = await webkit.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark', serviceWorkers: 'block' });
await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(WEB, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream', headers: { 'accept-ranges': 'bytes' } }); });
const page = await ctx.newPage(), errs = [], md = ['# teacher-motion (WebKit, 390 tối, DPR 3)', ''];
// đếm texImage2D trên canvas giáo viên (trước khi app chạy)
await page.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); } catch (e) {} window.__tex = 0; window.__vids = []; const ce = Document.prototype.createElement; Document.prototype.createElement = function (t, ...a) { const e = ce.call(this, t, ...a); if (String(t).toLowerCase() === 'video') window.__vids.push(e); return e; }; /* video của clip không gắn vào DOM */ const o = WebGLRenderingContext.prototype.texImage2D; WebGLRenderingContext.prototype.texImage2D = function (...a) { if (a[a.length - 1] instanceof HTMLVideoElement) window.__tex++; return o.apply(this, a); }; });
const url = q => `https://lk.test/app/?sandbox=1&hl=en&ux1=1${q}`;
await page.goto(url('#/home'), { waitUntil: 'load' }); await page.waitForTimeout(2000);
await page.evaluate(async () => { App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '6.5'; App.state.settings.theme = 'dark'; await App.saveSettings(); }).catch(e => errs.push('setup ' + e.message));
await page.goto(url('#/learn'), { waitUntil: 'load' }); await page.waitForTimeout(800);
await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); const s = document.querySelector('.tslot'); s && s.scrollIntoView({ block: 'center' }); });
const live = await page.waitForFunction(() => document.querySelector('.tslot.live canvas.tslot-img'), null, { timeout: 15000 }).then(() => true, () => false);
if (!live) errs.push('clip giáo viên không chạy trên WebKit (không có .tslot.live canvas) – không đo được');
else {
  // đo một chỗ giáo viên: pose = data-pose của slot (Home có wave đầu trang + point ở lộ trình)
  const measure = pose => page.evaluate(async pose => {
    const slot = document.querySelector(`.tslot[data-pose="${pose}"].live`), cv = slot.querySelector('canvas.tslot-img'), v = window.__vids.find(x => (x.currentSrc || x.src).includes(`/${pose}`)) || null;
    const r = cv.getBoundingClientRect(), t0 = window.__tex, vt0 = v ? v.currentTime : 0;
    const gaps = []; let last = performance.now(); const end = last + 3000;
    await new Promise(res => { const tick = now => { gaps.push(now - last); last = now; now < end ? requestAnimationFrame(tick) : res(); }; requestAnimationFrame(tick); });
    const vt = v ? v.currentTime - vt0 : 0, fps = 24, frames = Math.round(Math.max(0, vt) * fps); // clip 24 fps: totalVideoFrames của WebKit đếm thiếu (ra 0–50 cho 3 s video không gắn DOM) nên không dùng
    gaps.sort((a, b) => a - b);
    return { big: /tslot-(l|xl)\b/.test(slot.className), src: v ? v.currentSrc : '', cvH: cv.height, cvW: cv.width, shownH: r.height, dpr: devicePixelRatio, tex: window.__tex - t0, frames, vt, p95: gaps[Math.floor(gaps.length * 0.95)] || 0, long: gaps.filter(g => g > 50).length / Math.max(1, gaps.length), n: gaps.length };
  }, pose);
  const judge = (pose, m) => {
    md.push(`- ${pose}: clip ${m.src.split('/').slice(-2).join('/')} · canvas ${m.cvW}×${m.cvH} · hiển thị ${Math.round(m.shownH)} px × DPR ${m.dpr} = ${Math.round(m.shownH * m.dpr)} px thiết bị`,
      `- ${pose}, 3 s: ${m.n} khung rAF, p95 ${m.p95.toFixed(1)} ms, khung > 50 ms ${(m.long * 100).toFixed(1)} % · video ${m.frames} khung (${m.vt.toFixed(2)} s) · texImage2D ${m.tex} lần`);
    if (m.cvH < 0.9 * m.shownH * m.dpr) errs.push(`viền ${pose}: clip ${m.cvH} px phóng to lên ${Math.round(m.shownH * m.dpr)} px thiết bị (cần bản -hd 2×)`);
    if (m.big && !/-hd\.mp4/.test(m.src)) errs.push(`viền ${pose}: chỗ giáo viên cỡ l/xl trên màn DPR ${m.dpr} phải dùng clip -hd (đang ${m.src.split('/').pop()})`);
    if (m.tex > m.frames + 2) errs.push(`mượt ${pose}: texImage2D ${m.tex} lần cho ${m.frames} khung video – tải thừa mỗi rAF (WebKit chép video chậm → giật)`);
    if (m.p95 > 34 || m.long > 0.03) errs.push(`mượt ${pose}: rAF p95 ${m.p95.toFixed(1)} ms / khung > 50 ms ${(m.long * 100).toFixed(1)} % (ngưỡng 34 ms / 3 %)`);
  };
  const first = await page.evaluate(() => document.querySelector('.tslot.live').dataset.pose);
  judge(first, await measure(first));
  const shot = async name => { const b = await page.evaluate(() => { const r = (document.querySelector('.tslot.live[data-shot]') || document.querySelector('.tslot.live')).getBoundingClientRect(); return { x: Math.max(0, r.left - 40), y: Math.max(0, r.top - 30), w: Math.min(innerWidth, r.right + 40) - Math.max(0, r.left - 40), h: r.height + 50 }; });
    await page.screenshot({ path: path.join(OUT, name), clip: { x: b.x, y: b.y, width: b.w, height: b.h } }); };
  for (let i = 0; i < 4; i++) { await shot(`teacher-motion-${i}.png`); await page.waitForTimeout(450); }
  // clip point ở lộ trình Home (đúng chỗ chủ báo): đo + chụp đúng đoạn tay hạ nhanh 3,95–4,20 s (khung 95–100, nguồn méo nặng nhất)
  const hasPoint = await page.evaluate(() => { const s = document.querySelector('.tslot[data-pose="point"]'); if (!s) return false; s.setAttribute('data-shot', '1'); s.scrollIntoView({ block: 'center' }); return true; });
  if (!hasPoint) errs.push('Home: không thấy clip point ở lộ trình – không đo được chỗ chủ báo');
  else if (!await page.waitForFunction(() => document.querySelector('.tslot[data-pose="point"].live canvas.tslot-img'), null, { timeout: 15000 }).then(() => true, () => false)) errs.push('clip point không chạy trên WebKit');
  else {
    judge('point', await measure('point'));
    for (const [i, at] of [3.95, 4.0, 4.04, 4.08, 4.12, 4.2].entries()) {
      await page.evaluate(at => new Promise(res => { const v = window.__vids.find(x => (x.currentSrc || x.src).includes('/point')); v.pause(); v.currentTime = at; v.play().catch(() => {}); const done = () => { v.pause(); res(); }; if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => v.requestVideoFrameCallback(() => done())); else setTimeout(done, 120); setTimeout(res, 1500); }), at);
      await page.waitForTimeout(120); await shot(`arm-${i}.png`);
    }
  }
}
await browser.close();
md.push('', errs.length ? '## ĐỎ\n' + errs.map(e => '- ' + e).join('\n') : '✓ mượt + viền nét');
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
if (errs.length && !REPORT) { console.error(`✗ teacher-motion-webkit: ${errs.length} lỗi`); process.exit(1); }
