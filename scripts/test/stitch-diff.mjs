// 🎯 Cổng "bám mẫu Stitch": vẽ 4 màn của app ở cùng khổ với mẫu Google Stitch (brand/stitch/*.jpg) rồi so cấu trúc:
//   SSIM ảnh xám thu nhỏ + tương quan "nhịp hàng" (hàng nào có nội dung) → điểm 0..1 mỗi màn × sáng/tối.
// Ngưỡng ở scripts/test/stitch-diff.json – CHỈ được nâng (ratchet), không hạ. Xuất tờ "Stitch | app" cho chủ duyệt.
// Hermetic (phục vụ thẳng web/, ?sandbox=1, 0 lượt chạm prod). Dùng: node scripts/test/stitch-diff.mjs [web] [out=out/stitch-diff]
// CI: .github/workflows/stitch-diff.yml (cần playwright + pngjs + imagemagick). docs/DESIGN-SYSTEM.md §0.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright'; import { PNG } from 'pngjs';
const [ROOT = 'web', OUT = 'out/stitch-diff'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const LIM = JSON.parse(fs.readFileSync('scripts/test/stitch-diff.json', 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const SCREENS = { home: 'home', lesson: 'lesson/go?demo=1', feedback: 'lesson/go?demo=1', readiness: 'goal' };
const W = 390, G = 6; // so ở 390 px, thu nhỏ 6× → lưới ~65 px

// ---- ảnh: giải mã PNG/JPG (JPG đổi sang PNG bằng ImageMagick) → ma trận xám W×H ----
const toPng = f => { if (f.endsWith('.png')) return fs.readFileSync(f); const o = path.join(OUT, path.basename(f) + '.png'); execFileSync('convert', [f, o]); return fs.readFileSync(o); };
function gray(buf) { const p = PNG.sync.read(buf), s = W / p.width, h = Math.round(p.height * s), g = new Float32Array(W * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) { const sx = Math.min(p.width - 1, Math.floor(x / s)), sy = Math.min(p.height - 1, Math.floor(y / s)), i = (sy * p.width + sx) * 4; g[y * W + x] = .299 * p.data[i] + .587 * p.data[i + 1] + .114 * p.data[i + 2]; }
  return { g, h }; }
const shrink = (a, h) => { const w2 = Math.floor(W / G), h2 = Math.floor(h / G), o = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { let t = 0; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) t += a[(y * G + j) * W + x * G + i]; o[y * w2 + x] = t / (G * G); }
  return { o, w: w2, h: h2 }; };
function ssim(A, B, w, h) { const C1 = 6.5025, C2 = 58.5225, n = 8; let s = 0, k = 0; // cửa sổ 8×8, bước 4
  for (let y = 0; y + n <= h; y += 4) for (let x = 0; x + n <= w; x += 4) { let ma = 0, mb = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ma += A[(y + j) * w + x + i]; mb += B[(y + j) * w + x + i]; } ma /= n * n; mb /= n * n;
    let va = 0, vb = 0, cv = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = A[(y + j) * w + x + i] - ma, b = B[(y + j) * w + x + i] - mb; va += a * a; vb += b * b; cv += a * b; } va /= n * n - 1; vb /= n * n - 1; cv /= n * n - 1;
    s += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); k++; }
  return k ? s / k : 0; }
const rows = (A, w, h) => Array.from({ length: h }, (_, y) => { let m = 0, v = 0; for (let x = 0; x < w; x++) m += A[y * w + x]; m /= w; for (let x = 0; x < w; x++) v += (A[y * w + x] - m) ** 2; return Math.sqrt(v / w); });
const corr = (a, b) => { const n = Math.min(a.length, b.length), ma = a.slice(0, n).reduce((s, x) => s + x, 0) / n, mb = b.slice(0, n).reduce((s, x) => s + x, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : 0; };
function score(refFile, ourBuf) { const r = gray(toPng(refFile)), o = gray(ourBuf), h = Math.min(r.h, o.h), R = shrink(r.g, h), O = shrink(o.g, h);
  return { ssim: +ssim(R.o, O.o, R.w, R.h).toFixed(3), rows: +corr(rows(R.o, R.w, R.h), rows(O.o, O.w, O.h)).toFixed(3) }; }

// ---- vẽ app ----
const browser = await chromium.launch(), res = {}, errs = [];
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`${scheme}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => { // dữ liệu mẫu giống bối cảnh Stitch: IELTS mục tiêu 7.5, 1 lần thi thử có điểm 4 kỹ năng
    localStorage.setItem('lk.ux1', '1'); App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]);
    localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 }));
  }).catch(e => errs.push(`${scheme}: seed ${e.message}`));
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
    if (k === 'feedback') await page.evaluate(async () => { const q = s => document.querySelector(s), b = q('.lsn-opts .lsn-opt') || q('.lsn-bank .lsn-tile') || q('.lsn-match .lsn-opt'), i = q('#lsnIn');
      if (b) b.click(); if (i) { i.value = 'x'; i.dispatchEvent(new Event('input')); } await new Promise(r => setTimeout(r, 150)); const c = q('#lsnCheck'); if (c && !c.disabled) c.click(); await new Promise(r => setTimeout(r, 900)); }).catch(() => {});
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    const buf = await page.screenshot({ fullPage: true }); fs.writeFileSync(path.join(OUT, `app-${k}-${scheme}.png`), buf);
    const ref = `brand/stitch/${k}-${scheme}.jpg`;
    if (fs.existsSync(ref)) res[`${k}-${scheme}`] = score(ref, buf);
  }
  await ctx.close();
}
await browser.close();

// ---- tờ "Stitch | app" (sáng + tối) ----
try { for (const k of Object.keys(SCREENS)) { const f = [`brand/stitch/${k}-dark.jpg`, path.join(OUT, `app-${k}-dark.png`), `brand/stitch/${k}-light.jpg`, path.join(OUT, `app-${k}-light.png`)];
  const lab = ['Stitch – tối', 'App – tối', 'Stitch – sáng', 'App – sáng'], args = []; f.forEach((x, i) => { if (fs.existsSync(x)) args.push('-label', lab[i], x); else args.push('-label', lab[i] + ' (chưa có mẫu)', 'xc:#ccc'); });
  execFileSync('montage', [...args, '-tile', '4x1', '-geometry', '390x1300>+8+8', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '80', path.join(OUT, `side-${k}.jpg`)]); } } catch (e) { console.log('montage bỏ qua:', e.message); }

// ---- cổng ----
const bad = [];
for (const [k, v] of Object.entries(res)) { const l = LIM[k] || {}; for (const m of ['ssim', 'rows']) if (l[m] != null && v[m] < l[m]) bad.push(`${k} ${m} ${v[m]} < ${l[m]}`); }
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify({ res, errs }, null, 1));
console.log(Object.entries(res).map(([k, v]) => `${k}: ssim ${v.ssim} · nhịp hàng ${v.rows}`).join('\n'));
if (errs.length) console.log('lỗi JS:', errs.slice(0, 10));
if (bad.length || errs.length) { console.error('✗ stitch-diff:\n  - ' + bad.concat(errs).join('\n  - ')); process.exit(1); }
console.log('✓ stitch-diff: bám mẫu Stitch đạt ngưỡng (scripts/test/stitch-diff.json, chỉ được nâng)');
