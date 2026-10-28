// 🎯 Cổng "bám mẫu Stitch": vẽ 4 màn của app ở cùng khổ với mẫu Google Stitch (brand/stitch/*.jpg) rồi so cấu trúc:
//   SSIM ảnh xám thu nhỏ + tương quan "nhịp hàng" (hàng nào có nội dung) → điểm 0..1 mỗi màn × sáng/tối.
// Ngưỡng ở scripts/test/stitch-diff.json – CHỈ được nâng (ratchet), không hạ. Xuất tờ "Stitch | app" cho chủ duyệt.
// Hermetic (phục vụ thẳng web/, ?sandbox=1, 0 lượt chạm prod). Dùng: node scripts/test/stitch-diff.mjs [web] [out=out/stitch-diff]
// CI: .github/workflows/stitch-diff.yml (cần playwright + pngjs + imagemagick). docs/DESIGN-SYSTEM.md §0.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright'; import { PNG } from 'pngjs'; import { createRequire } from 'node:module';
const AXE = createRequire(path.resolve('package.json')).resolve('axe-core/axe.min.js'), a11y = {}; // WCAG 2.2 AA (axe-core) trong vùng màn Stitch (.st)
const [ROOT = 'web', OUT = 'out/stitch-diff'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const LIM = JSON.parse(fs.readFileSync('scripts/test/stitch-diff.json', 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const SCREENS = { home: 'home', lesson: 'lesson/go?demo=1', feedback: 'lesson/go?demo=1', readiness: 'goal' };
const W = 390, G = 6;
// Bài thử: trả lời ĐÚNG (App._lsn) tới câu trắc nghiệm đầu tiên – giống bối cảnh mẫu Stitch (câu 3/5, đã chọn đáp án đúng); feedback = bấm Kiểm tra
const DRIVE = async k => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms));
  const pick = it => { const o = qa('.lsn-opts .lsn-opt').find(b => b.dataset.o === String(it.answer)); if (o) o.click(); return !!o; };
  for (let n = 0; n < 10 && !q('.lsn-opts .lsn-opt'); n++) { const it = App._lsn && App._lsn.sess.cur; if (!it) break;
    if (q('#lsnGo')) { q('#lsnGo').click(); await w(300); continue; }
    if (q('#lsnBank')) { const used = new Set(); for (const x of String(it.answer).split(/\s+/)) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && t.textContent.trim() === x); if (b) { used.add(b); b.click(); } } }
    else if (q('#lsnIn')) { q('#lsnIn').value = it.answer; q('#lsnIn').dispatchEvent(new Event('input')); }
    else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
    else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(300); continue; }
    await w(120); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(400); }
  const it = App._lsn && App._lsn.sess.cur; if (it) pick(it); await w(150);
  if (k === 'feedback') { const c = q('#lsnCheck'); if (c && !c.disabled) c.click(); await w(900); if (document.activeElement) document.activeElement.blur(); }
  scrollTo(0, 0); }; // so ở 390 px, thu nhỏ 6× → lưới ~65 px

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
    localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]);
    localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 }));
  }).catch(e => errs.push(`${scheme}: seed ${e.message}`));
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
    if (k === 'lesson' || k === 'feedback') await page.evaluate(DRIVE, k).catch(e => errs.push('drive ' + e.message));
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    // ảnh trọn màn như mẫu: khung cao bằng nội dung → thanh dưới/chân cố định nằm đúng đáy, không lọt giữa ảnh; cuộn về đầu, bỏ focus
    const fullH = await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); const v = document.getElementById('view'); return Math.max(document.documentElement.scrollHeight, v ? v.scrollHeight + v.getBoundingClientRect().top : 0); });
    await page.setViewportSize({ width: W, height: Math.min(2600, Math.max(844, Math.ceil(fullH))) }); await page.waitForTimeout(300);
    const buf = await page.screenshot(); await page.setViewportSize({ width: W, height: 844 }); fs.writeFileSync(path.join(OUT, `app-${k}-${scheme}.png`), buf);
    await page.addScriptTag({ path: AXE }).catch(() => {});
    a11y[`${k}-${scheme}`] = await page.evaluate(async () => { if (!window.axe || !document.querySelector('.st')) return { skipped: true };
      const r = await axe.run({ include: [...document.querySelectorAll('.st')] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 2).map(x => x.target.join(' ') + ' ' + (x.failureSummary || '').split('\n')[1]) })), passes: r.passes.length }; }).catch(e => ({ error: e.message }));
    const ref = `brand/stitch/${k}-${scheme}.jpg`;
    if (fs.existsSync(ref)) res[`${k}-${scheme}`] = score(ref, buf);
  }
  await ctx.close();
}
// ---- gallery (mọi component/dạng bài · màn hoàn thành) sáng + tối: soi đủ dạng bài mà 4 màn chính không chụp tới ----
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`gallery ${scheme}: ${e.message}`));
  await page.goto(`https://lk.test/design/gallery.html?theme=${scheme}&dir=ltr`, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const h = await page.evaluate(() => document.documentElement.scrollHeight); await page.setViewportSize({ width: W, height: Math.min(9000, h) }); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `gallery-${scheme}.png`) }); await ctx.close();
}
try { execFileSync('montage', [path.join(OUT, 'gallery-dark.png'), path.join(OUT, 'gallery-light.png'), '-tile', '2x1', '-geometry', '+8+8', '-background', '#e9e9e9', path.join(OUT, 'gallery.png')]); execFileSync('convert', [path.join(OUT, 'gallery.png'), '-resize', 'x2400>', '-quality', '72', path.join(OUT, 'sm-gallery.jpg')]); } catch (e) { /* bỏ qua */ }

// ---- máy tính 1280 px (Stitch chỉ có mẫu điện thoại → tờ duyệt đặt cạnh mẫu điện thoại để so phong cách) ----
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`desk ${scheme}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]);
    localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); }).catch(() => {});
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
    if (k === 'lesson' || k === 'feedback') await page.evaluate(DRIVE, k).catch(e => errs.push('drive ' + e.message));
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); }).catch(() => {}); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `desk-${k}-${scheme}.png`) });
  }
  await ctx.close();
}
await browser.close();

// ---- tờ "Stitch | app" (sáng + tối) ----
try { for (const k of Object.keys(SCREENS)) { const f = [`brand/stitch/${k}-dark.jpg`, path.join(OUT, `app-${k}-dark.png`), `brand/stitch/${k}-light.jpg`, path.join(OUT, `app-${k}-light.png`)];
  const lab = ['Stitch – tối', 'Lexkite – tối', 'Stitch – sáng', 'Lexkite – sáng'], args = []; f.forEach((x, i) => { if (fs.existsSync(x)) args.push('-label', lab[i], x.endsWith('.png') ? x + '[390x1700+0+0]' : x); else args.push('-label', lab[i] + ' (chưa có mẫu)', 'xc:#ccc'); });
  execFileSync('montage', [...args, '-tile', '4x1', '-geometry', '390x1300>+8+8', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '80', path.join(OUT, `side-${k}.jpg`)]);
  const d = [`brand/stitch/${k}-dark.jpg`, path.join(OUT, `desk-${k}-dark.png`), path.join(OUT, `desk-${k}-light.png`)], dl = ['Stitch (điện thoại, tối)', 'Lexkite máy tính – tối', 'Lexkite máy tính – sáng'], da = [];
  d.forEach((x, i) => { if (fs.existsSync(x)) da.push('-label', dl[i], x); });
  if (da.length) execFileSync('montage', [...da, '-tile', `${da.length / 3}x1`, '-geometry', '+8+8', '-resize', 'x900', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '80', path.join(OUT, `desk-${k}.jpg`)]); } } catch (e) { console.log('montage bỏ qua:', e.message); }

// ---- cổng ----
const bad = [];
for (const [k, v] of Object.entries(res)) { const l = LIM[k] || {}; for (const m of ['ssim', 'rows']) if (l[m] != null && v[m] < l[m]) bad.push(`${k} ${m} ${v[m]} < ${l[m]}`); }
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify({ res, errs, a11y }, null, 1));
for (const [k, v] of Object.entries(a11y)) { const sv = (v.violations || []).filter(x => x.impact === 'serious' || x.impact === 'critical'); console.log(`axe ${k}: ${(v.violations || []).length} vi phạm (${sv.length} nghiêm trọng) · ${v.passes || 0} đạt`); sv.forEach(x => bad.push(`axe ${k}: ${x.id} ×${x.n} – ${x.sample.join(' | ')}`)); }
console.log(Object.entries(res).map(([k, v]) => `${k}: ssim ${v.ssim} · nhịp hàng ${v.rows}`).join('\n'));
// Tóm tắt ngắn (đọc thay cho log/ảnh lớn): điểm SSIM, axe, dung lượng CSS
{ const css = ['home', 'lesson', 'goal'].map(g => { const f = path.join(ROOT, 'css', `st-${g}.css`); if (!fs.existsSync(f)) return `st-${g}: –`; const b = fs.readFileSync(f); return `st-${g}.css ${(b.length / 1024).toFixed(1)} KB · gz ${(zlib.gzipSync(b, { level: 9 }).length / 1024).toFixed(2)} KB`; });
  const md = ['## Stitch diff', '| màn | SSIM | nhịp hàng | axe (nghiêm trọng/tổng) |', '|---|---|---|---|',
    ...Object.keys({ ...res, ...a11y }).sort().map(k => { const r = res[k] || {}, a = a11y[k] || {}, v = a.violations || []; return `| ${k} | ${r.ssim ?? '–'} | ${r.rows ?? '–'} | ${v.filter(x => x.impact === 'serious' || x.impact === 'critical').length}/${v.length}${v.length ? ' ' + v.map(x => x.id).join(',') : ''} |`; }),
    '', ...css.map(x => '- ' + x), errs.length ? '- lỗi JS: ' + errs.slice(0, 5).join(' | ') : '- lỗi JS: 0', bad.length ? '- ✗ ' + bad.slice(0, 12).join('\n- ✗ ') : '- ✓ đạt ngưỡng'].join('\n');
  fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md + '\n'); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  try { for (const k of Object.keys(SCREENS)) for (const f of [`side-${k}.jpg`, `desk-${k}.jpg`]) if (fs.existsSync(path.join(OUT, f))) execFileSync('convert', [path.join(OUT, f), '-resize', '900x900>', '-quality', '70', path.join(OUT, 'sm-' + f)]); } catch (e) { /* bỏ qua */ } }
if (errs.length) console.log('lỗi JS:', errs.slice(0, 10));
if (bad.length || errs.length) { console.error('✗ stitch-diff:\n  - ' + bad.concat(errs).join('\n  - ')); process.exit(1); }
console.log('✓ stitch-diff: bám mẫu Stitch đạt ngưỡng (scripts/test/stitch-diff.json, chỉ được nâng)');
