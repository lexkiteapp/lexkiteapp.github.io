// 🎞️ Cổng chuyển động giáo viên trên WebKit (Safari): clip WebGL của chỗ giáo viên (web/js/teacher-slot.js) phải MƯỢT và VIỀN NÉT (live 3/11 iPhone:
// tay Ama giật, viền đen méo khi cử động). Chạy trên macOS (WebKit Linux không giải mã H.264 → cổng sẽ rỗng). Lộ trình #/learn, 390×844, nền tối, DPR 3.
//  · mượt: texImage2D chỉ khi video sang khung mới (số lần tải ≤ số khung video + 2), khoảng rAF p95 ≤ 34 ms, khung > 50 ms ≤ 3 % trong 3 s
//  · viền: canvas không bị phóng to – chiều cao nguồn ≥ 0,9 × chiều cao hiển thị × DPR (bản -hd 2× ở l/xl màn retina), clip đúng -hd
//  · ảnh cận khung giáo viên ở 4 thời điểm cử động → teacher-motion-*.png (trước/sau cho PR)
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
  const m = await page.evaluate(async () => {
    const slot = document.querySelector('.tslot.live'), cv = slot.querySelector('canvas.tslot-img'), v = window.__vids.find(x => /teach\//.test(x.currentSrc || x.src)) || null;
    const r = cv.getBoundingClientRect(), t0 = window.__tex, f0 = v && v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality().totalVideoFrames : 0, vt0 = v ? v.currentTime : 0;
    const gaps = []; let last = performance.now(); const end = last + 3000;
    await new Promise(res => { const tick = now => { gaps.push(now - last); last = now; now < end ? requestAnimationFrame(tick) : res(); }; requestAnimationFrame(tick); });
    const vt = v ? v.currentTime - vt0 : 0, fps = 24, frames = v && v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality().totalVideoFrames - f0 : Math.round(Math.max(0, vt) * fps);
    gaps.sort((a, b) => a - b);
    return { clip: slot.dataset.clip || (v && v.currentSrc) || '', src: v ? v.currentSrc : '', cvH: cv.height, cvW: cv.width, shownH: r.height, dpr: devicePixelRatio, tex: window.__tex - t0, frames, vt, p95: gaps[Math.floor(gaps.length * 0.95)] || 0, long: gaps.filter(g => g > 50).length / Math.max(1, gaps.length), n: gaps.length };
  });
  md.push(`- clip: ${m.src.split('/').slice(-2).join('/')} · canvas ${m.cvW}×${m.cvH} · hiển thị ${Math.round(m.shownH)} px × DPR ${m.dpr} = ${Math.round(m.shownH * m.dpr)} px thiết bị`,
    `- 3 s: ${m.n} khung rAF, p95 ${m.p95.toFixed(1)} ms, khung > 50 ms ${(m.long * 100).toFixed(1)} % · video ${m.frames} khung (${m.vt.toFixed(2)} s) · texImage2D ${m.tex} lần`);
  if (m.cvH < 0.9 * m.shownH * m.dpr) errs.push(`viền: clip ${m.cvH} px phóng to lên ${Math.round(m.shownH * m.dpr)} px thiết bị (cần bản -hd 2× ở l/xl màn retina) → nét viền nhòe/méo khi cử động`);
  if (!/-hd\.mp4/.test(m.src)) errs.push(`viền: chỗ giáo viên cỡ l trên màn DPR ${m.dpr} phải dùng clip -hd (đang ${m.src.split('/').pop()})`);
  if (m.tex > m.frames + 2) errs.push(`mượt: texImage2D ${m.tex} lần cho ${m.frames} khung video – tải thừa mỗi rAF (WebKit chép video chậm → giật)`);
  if (m.p95 > 34 || m.long > 0.03) errs.push(`mượt: rAF p95 ${m.p95.toFixed(1)} ms / khung > 50 ms ${(m.long * 100).toFixed(1)} % (ngưỡng 34 ms / 3 %)`);
  // ảnh cận ở 4 thời điểm cử động (tay đang chuyển động – chỗ viền dễ méo nhất)
  for (let i = 0; i < 4; i++) { const b = await page.evaluate(() => { const r = document.querySelector('.tslot').getBoundingClientRect(); return { x: Math.max(0, r.left - 40), y: Math.max(0, r.top - 30), w: Math.min(innerWidth, r.right + 40) - Math.max(0, r.left - 40), h: r.height + 50 }; });
    await page.screenshot({ path: path.join(OUT, `teacher-motion-${i}.png`), clip: { x: b.x, y: b.y, width: b.w, height: b.h } }); await page.waitForTimeout(450); }
}
await browser.close();
md.push('', errs.length ? '## ĐỎ\n' + errs.map(e => '- ' + e).join('\n') : '✓ mượt + viền nét');
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
if (errs.length && !REPORT) { console.error(`✗ teacher-motion-webkit: ${errs.length} lỗi`); process.exit(1); }
