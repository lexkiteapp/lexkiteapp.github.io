// 🎯 Cổng "bám mẫu Stitch": vẽ 4 màn của app ở cùng khổ với mẫu Google Stitch (brand/stitch/*.jpg) rồi so cấu trúc:
//   SSIM ảnh xám thu nhỏ + tương quan "nhịp hàng" (hàng nào có nội dung) → điểm 0..1 mỗi màn × sáng/tối.
// Ngưỡng ở scripts/test/stitch-diff.json – CHỈ được nâng (ratchet), không hạ. Xuất tờ "Stitch | app" cho chủ duyệt.
// Hermetic (phục vụ thẳng web/, ?sandbox=1, 0 lượt chạm prod). Dùng: node scripts/test/stitch-diff.mjs [web] [out=out/stitch-diff]
// CI: .github/workflows/stitch-diff.yml (cần playwright + pngjs + imagemagick). docs/DESIGN-SYSTEM.md §0.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright'; import { SCREENS, V2REF, DRIVE, DRIVEN, READY, SEED_STREAK, FIX_CLOCK, SEED_LEAGUE, MIME } from './stitch-screens.mjs'; import { PNG } from 'pngjs'; import { createRequire } from 'node:module';
const AXE = createRequire(path.resolve('package.json')).resolve('axe-core/axe.min.js'), a11y = {}; // WCAG 2.2 AA (axe-core) trong vùng màn Stitch (.st)
const [ROOT = 'web', OUT = 'out/stitch-diff'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const LIM = JSON.parse(fs.readFileSync('scripts/test/stitch-diff.json', 'utf8'));
const W = 390, G = 6;
const V2PNG = process.env.STITCH_V2_PNG || 'out/stitch-v2/png';
const refOf = (k, sc) => { const v = path.join(V2PNG, `${V2REF[k] || k}-${sc}.png`); return fs.existsSync(v) ? v : `brand/stitch/${k}-${sc}.jpg`; };

// ---- Tương phản thật (pixel): mỗi chữ/icon nhìn thấy trong .st/topbar/tab bar → màu chữ (computed, nhân opacity) so với NỀN THẬT lấy từ ảnh chụp
//   (các màu nền chiếm ≥15 % vùng chữ, trừ điểm ảnh gần màu chữ → lấy màu XẤU NHẤT: bắt được chữ trên gradient/ảnh). Chữ thường ≥4.5, chữ lớn/đậm & icon ≥3.
//   Bỏ: sr-only, phần tử bị che (elementFromPoint), nút disabled (WCAG miễn), phần câu hỏi lùi sau tấm phản hồi (.st-dim).
const CSCAN = () => { const out = [];
  for (const e of document.querySelectorAll('.st *, .topbar *, .bottom-nav *')) {
    const icon = e.classList.contains('material-symbols-outlined') || e.classList.contains('material-symbols-rounded'); if (!icon && ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!icon && /^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(e.textContent)) continue; // chỉ emoji = ảnh nhiều màu, không dùng màu chữ CSS → đo màu chữ là sai (chữ/icon khác vẫn đo đủ)
    if (e.closest('.sr-only,[disabled],[aria-disabled="true"],[hidden],.brand,.wordmark') || (e.closest('.st-dim') && !e.closest('.lsn-foot'))) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    let op = 1; for (let q = e; q && q.nodeType === 1; q = q.parentElement) op *= +getComputedStyle(q).opacity; if (op < 0.05) continue;
    let r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3 || r.bottom < 0 || r.top > innerHeight) continue;
    const h = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); if (h && !(e.contains(h) || h.contains(e))) continue;
    const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
    // hộp chữ thật: bỏ phần line-height thừa (icon = ô vuông cỡ chữ, chữ = cao 1.2× cỡ chữ quanh tâm) → không lấy nhầm nền ngoài huy hiệu/viên
    { const cy = r.top + r.height / 2, hh = Math.min(r.height, fs * (icon ? 0.75 : 1.2)), cx = r.left + r.width / 2, ww = icon ? Math.min(r.width, fs * 0.75) : r.width; r = { left: cx - ww / 2, top: cy - hh / 2, width: ww, height: hh }; }
    out.push({ cls: (e.className.toString().match(/text-\S+/g) || []).slice(-2).join(' ') + (e.closest('[aria-pressed]') ? ' p=' + e.closest('[aria-pressed]').getAttribute('aria-pressed') : '') + (e.closest('.ok,.bad') ? ' fb' : ''), t: (icon ? '⟨' + e.textContent.trim() + '⟩' : e.textContent.trim()).slice(0, 28), x: r.left, y: r.top, w: r.width, h: r.height, c: cs.color, op, large: icon || fs >= 24 || (fs >= 18.66 && fw >= 700) }); }
  return out; };
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const cratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const contrast = {}; // tag → { n, miss:[{t,cr,need}] }
async function auditContrast(page, buf, tag) {
  const items = await page.evaluate(CSCAN).catch(() => []), p = PNG.sync.read(buf), miss = []; let n = 0;
  for (const it of items) { const m = (it.c.match(/[\d.]+/g) || []).map(Number); if (m.length < 3) continue; const a = (m[3] ?? 1) * it.op; if (a < 0.05) continue; // trong suốt = cố ý ẩn (vòng ✓ chưa chọn)
    const x0 = Math.max(0, Math.floor(it.x)), y0 = Math.max(0, Math.floor(it.y)), x1 = Math.min(p.width, Math.ceil(it.x + it.w)), y1 = Math.min(p.height, Math.ceil(it.y + it.h)); if (x1 - x0 < 3 || y1 - y0 < 3) continue;
    const H = new Map(); let far = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * p.width + x) * 4, R = p.data[i], G2 = p.data[i + 1], B = p.data[i + 2];
      if (Math.abs(R - m[0]) + Math.abs(G2 - m[1]) + Math.abs(B - m[2]) < 90) continue; far++; const q = ((R >> 3) << 10) | ((G2 >> 3) << 5) | (B >> 3); H.set(q, (H.get(q) || 0) + 1); }
    if (far < 6) continue; let cr = 99;
    // icon nét mảnh (calendar_today 16 px…): điểm khử răng cưa ở mép nét = màu TRỘN giữa icon và nền chính, không phải nền → bỏ cụm nằm trên đoạn icon–nền chính
    //   (WCAG 1.4.11 so màu icon với nền kề; nền thật khác nền chính – gradient, ảnh, viên – vẫn đo đủ)
    const rgb = q => [(q >> 10) * 8 + 4, ((q >> 5) & 31) * 8 + 4, (q & 31) * 8 + 4], top = [...H].sort((x, y) => y[1] - x[1])[0][0], B0 = rgb(top);
    const blend = c => { const d = [0, 1, 2].map(k => B0[k] - m[k]), L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2; if (!L) return false; const t = [0, 1, 2].reduce((s, k) => s + (c[k] - m[k]) * d[k], 0) / L; if (t <= 0.04 || t >= 0.96) return false; return Math.hypot(...[0, 1, 2].map(k => m[k] + t * d[k] - c[k])) < 20; };
    for (const [q, c] of H) { if (c < far * 0.15) continue; const bg = rgb(q); if (it.t[0] === '⟨' && q !== top && blend(bg)) continue; const fg = [0, 1, 2].map(k => m[k] * a + bg[k] * (1 - a)); cr = Math.min(cr, cratio(fg, bg)); }
    if (cr === 99) continue; n++; const need = it.large ? 3 : 4.5; if (cr < need - 0.05) miss.push({ t: it.t, cr: +cr.toFixed(2), need, at: `${Math.round(it.x)},${Math.round(it.y)}`, cls: it.cls, fg: it.c }); }
  contrast[tag] = { n, miss }; }
// gate: không ô giữ chỗ giáo viên / ảnh vỡ trong màn Stitch
const PHSCAN = () => { const bad = []; for (const s of document.querySelectorAll('.st')) { if (/TEACHER SLOT|\[teacher\]|placeholder/i.test(s.innerText)) bad.push('chữ giữ chỗ');
    // lẫn ngôn ngữ: trang chụp ở hl=en → chữ hiện ra có chữ cái riêng tiếng Việt = chuỗi chưa dịch (lọt khóa Việt)
    if (document.documentElement.lang !== 'vi') { const vi = (s.innerText.match(/[^\s]*[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ][^\s]*/g) || []); if (vi.length) bad.push('lẫn tiếng Việt: ' + [...new Set(vi)].slice(0, 6).join(' ')); } for (const i of s.querySelectorAll('img')) if (i.complete && !i.naturalWidth && i.getBoundingClientRect().width) bad.push('ảnh vỡ ' + (i.getAttribute('src') || '').slice(-40)); } return bad; };
const ph = {};

// ---- ảnh: giải mã PNG/JPG (JPG đổi sang PNG bằng ImageMagick) → ma trận xám W×H ----
const toPng = f => { if (f.endsWith('.png')) return fs.readFileSync(f); const o = path.join(OUT, path.basename(f) + '.png'); execFileSync('convert', [f, o]); return fs.readFileSync(o); };
function gray(buf) { const p = PNG.sync.read(buf), s = W / p.width, h = Math.round(p.height * s), g = new Float32Array(W * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) { const sx = Math.min(p.width - 1, Math.floor(x / s)), sy = Math.min(p.height - 1, Math.floor(y / s)), i = (sy * p.width + sx) * 4; g[y * W + x] = .299 * p.data[i] + .587 * p.data[i + 1] + .114 * p.data[i + 2]; }
  return { g, h }; }
const shrink = (a, h) => { const w2 = Math.floor(W / G), h2 = Math.floor(h / G), o = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { let t = 0; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) t += a[(y * G + j) * W + x * G + i]; o[y * w2 + x] = t / (G * G); }
  return { o, w: w2, h: h2 }; };
function ssim(A, B, w, h, ya = 0, yb = h) { const C1 = 6.5025, C2 = 58.5225, n = 8; let s = 0, k = 0; // cửa sổ 8×8, bước 4; ya..yb = dải hàng (SSIM theo vùng)
  for (let y = ya; y + n <= yb; y += 4) for (let x = 0; x + n <= w; x += 4) { let ma = 0, mb = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ma += A[(y + j) * w + x + i]; mb += B[(y + j) * w + x + i]; } ma /= n * n; mb /= n * n;
    let va = 0, vb = 0, cv = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = A[(y + j) * w + x + i] - ma, b = B[(y + j) * w + x + i] - mb; va += a * a; vb += b * b; cv += a * b; } va /= n * n - 1; vb /= n * n - 1; cv /= n * n - 1;
    s += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); k++; }
  return k ? s / k : 0; }
const rows = (A, w, h) => Array.from({ length: h }, (_, y) => { let m = 0, v = 0; for (let x = 0; x < w; x++) m += A[y * w + x]; m /= w; for (let x = 0; x < w; x++) v += (A[y * w + x] - m) ** 2; return Math.sqrt(v / w); });
const corr = (a, b) => { const n = Math.min(a.length, b.length), ma = a.slice(0, n).reduce((s, x) => s + x, 0) / n, mb = b.slice(0, n).reduce((s, x) => s + x, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : 0; };
function score(refFile, ourBuf) { const r = gray(toPng(refFile)), o = gray(ourBuf), h = Math.min(r.h, o.h), R = shrink(r.g, h), O = shrink(o.g, h);
  const hd = Math.round(56 / G), ct = R.h - Math.round(96 / G), bd = ct - hd, band = i => [hd + Math.round(bd * i / 3), hd + Math.round(bd * (i + 1) / 3)], // SSIM THEO VÙNG (tính trên khung Stitch): thanh đầu 56 px · thân chia 3 dải (trên = giáo viên/đầu bài, giữa = thẻ, dưới = đáp án) · chân CTA 96 px
    reg = Object.fromEntries([['header', [0, hd]], ['top', band(0)], ['mid', band(1)], ['low', band(2)], ['cta', [ct, R.h]]].map(([n, [a, b]]) => [n, +ssim(R.o, O.o, R.w, R.h, a, b).toFixed(3)]));
  return { reg, ssim: +ssim(R.o, O.o, R.w, R.h).toFixed(3), rows: +corr(rows(R.o, R.w, R.h), rows(O.o, O.w, O.h)).toFixed(3) }; }

// ---- vẽ app ----
const browser = await chromium.launch(), res = {}, errs = [];
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`${scheme}: ${e.message}`)); await FIX_CLOCK(page); // đồng hồ cố định cho MỌI màn (chữ 'còn Xh', ngày) → điểm không trôi theo giờ chạy CI
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => { // dữ liệu mẫu giống bối cảnh Stitch: IELTS mục tiêu 7.5, 1 lần thi thử có điểm 4 kỹ năng
    localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]);
    for (const [w, ctxs] of [['collocation', 'a strong collocation'], ['coherence', 'clear coherence'], ['mitigate', 'mitigate risk'], ['phrasal verb', 'a phrasal verb']]) await Core.Cards.add({ word: w, vi: w, ipa: '', def: w }, { text: ctxs, source: 'https://example.com/a' }).catch(() => {}); App.state.cards = await Core.Cards.all(); // thẻ mẫu cho màn Ôn (có thẻ đến hạn)
    localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 }));
  }).catch(e => errs.push(`${scheme}: seed ${e.message}`));
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800); { await FIX_CLOCK(page); await page.evaluate(SEED_STREAK); await page.evaluate(() => App.route()); await page.waitForTimeout(600); } if (k === 'leagues') { await page.evaluate(SEED_LEAGUE); await page.evaluate(() => App.route()); await page.waitForTimeout(900); }
    if (DRIVEN.test(k)) await page.evaluate(DRIVE, k).catch(e => errs.push('drive ' + e.message)); if (READY[k] && !(await page.$(READY[k]))) errs.push(`${k}: chưa tới trạng thái (${READY[k]}) – ảnh chụp sai màn`);
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    // ảnh trọn màn như mẫu: khung cao bằng nội dung → thanh dưới/chân cố định nằm đúng đáy, không lọt giữa ảnh; cuộn về đầu, bỏ focus
    const fullH = await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); const v = document.getElementById('view'); return Math.max(document.documentElement.scrollHeight, v ? v.scrollHeight + v.getBoundingClientRect().top : 0); });
    await page.setViewportSize({ width: W, height: Math.min(2600, Math.max(844, Math.ceil(fullH))) }); await page.waitForTimeout(300);
    const buf = await page.screenshot(); await auditContrast(page, buf, `${k}-${scheme}-390`); ph[`${k}-${scheme}`] = await page.evaluate(PHSCAN).catch(() => []); await page.setViewportSize({ width: W, height: 844 }); fs.writeFileSync(path.join(OUT, `app-${k}-${scheme}.png`), buf);
    await page.addScriptTag({ path: AXE }).catch(() => {});
    a11y[`${k}-${scheme}`] = await page.evaluate(async () => { if (!window.axe || !document.querySelector('.st')) return { skipped: true };
      const r = await axe.run({ include: [...document.querySelectorAll('.st')] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 2).map(x => x.target.join(' ') + ' ' + (x.failureSummary || '').split('\n')[1]), all: v.nodes.map(x => x.target.join(' ') + ' ' + (x.failureSummary || '').split('\n')[1]) })), passes: r.passes.length }; }).catch(e => ({ error: e.message }));
    const ref = refOf(k, scheme);
    if (fs.existsSync(ref)) res[`${k}-${scheme}`] = score(ref, buf);
  }
  await ctx.close();
}
// ---- QC khổ máy 360 / 412 (390 ở trên): tràn ngang, chữ tràn khung, chạm <44 px, logo diều – gate tràn; ảnh w-<màn>.jpg ----
const qc = {};
for (const scheme of ['dark', 'light']) for (const QW of [360, 412]) {
  const ctx = await browser.newContext({ viewport: { width: QW, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`${scheme}@${QW}: ${e.message}`)); await FIX_CLOCK(page); // đồng hồ cố định cho MỌI màn (chữ 'còn Xh', ngày) → điểm không trôi theo giờ chạy CI
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]); localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); }).catch(() => {});
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); { await FIX_CLOCK(page); await page.evaluate(SEED_STREAK); await page.evaluate(() => App.route()); await page.waitForTimeout(600); } if (k === 'leagues') { await page.evaluate(SEED_LEAGUE); await page.evaluate(() => App.route()); await page.waitForTimeout(900); }
    if (DRIVEN.test(k)) await page.evaluate(DRIVE, k).catch(() => {}); if (READY[k] && !(await page.$(READY[k]))) errs.push(`${k}: chưa tới trạng thái (${READY[k]}) – ảnh chụp sai màn`);
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    qc[`${k}-${scheme}-${QW}`] = await page.evaluate(() => { const W = innerWidth, over = [], clip = [], tap = [];
      for (const e of document.querySelectorAll('.st *, .topbar *, .bottom-nav *')) { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || cs.visibility === 'hidden' || e.closest('.sr-only')) continue;
        if (r.right > W + 1 || r.left < -1) if (!e.closest('[class*="overflow-hidden"],[class*="overflow-x"]') ) over.push(e.className.toString().slice(0, 40));
        if (e.children.length === 0 && e.textContent.trim() && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && cs.overflow !== 'visible') clip.push(e.textContent.trim().slice(0, 24));
        if (e.matches('a,button,[role=button],input') && (() => { // vùng bấm thật = khung ∪ hộp ::after (absolute: tính theo khối chứa định vị gần nhất – nới vô hình hoặc "stretched link" phủ cả thẻ)
          const x = getComputedStyle(e, '::after'); let w = r.width, h = r.height;
          if (x.content !== 'none' && x.position === 'absolute') { let cb = e; while (cb && cb !== document.body && getComputedStyle(cb).position === 'static') cb = cb.parentElement;
            const c = (cb || document.body).getBoundingClientRect(), v = k => (x[k] === 'auto' ? null : parseFloat(x[k]));
            const L = v('left') != null ? c.left + v('left') : null, R = v('right') != null ? c.right - v('right') : null, T = v('top') != null ? c.top + v('top') : null, B = v('bottom') != null ? c.bottom - v('bottom') : null;
            const aw = L != null && R != null ? R - L : parseFloat(x.width) || 0, ah = T != null && B != null ? B - T : parseFloat(x.height) || 0;
            w = Math.max(w, aw); h = Math.max(h, ah); }
          return w < 43.5 || h < 43.5; })()) tap.push(`${(e.textContent.trim() || e.getAttribute('aria-label') || e.tagName).slice(0, 14)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
      const lg = document.querySelector('.topbar .brand img'), lr = lg && lg.getBoundingClientRect();
      return { hscroll: document.documentElement.scrollWidth > W + 1, over: over.slice(0, 5), clip: clip.slice(0, 5), tap: tap.slice(0, 8), tapN: tap.length, logo: lg ? { src: lg.getAttribute('src'), w: Math.round(lr.width), h: Math.round(lr.height), nat: lg.naturalWidth } : null }; }).catch(e => ({ error: e.message }));
    const fullH = await page.evaluate(() => { scrollTo(0, 0); const v = document.getElementById('view'); return Math.max(document.documentElement.scrollHeight, v ? v.scrollHeight + v.getBoundingClientRect().top : 0); });
    await page.setViewportSize({ width: QW, height: Math.min(2600, Math.max(844, Math.ceil(fullH))) }); await page.waitForTimeout(250);
    { const b = await page.screenshot(); fs.writeFileSync(path.join(OUT, `w${QW}-${k}-${scheme}.png`), b); await auditContrast(page, b, `${k}-${scheme}-${QW}`); } await page.setViewportSize({ width: QW, height: 844 });
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
  { const b = await page.screenshot(); fs.writeFileSync(path.join(OUT, `gallery-${scheme}.png`), b); await auditContrast(page, b, `gallery-${scheme}`); ph[`gallery-${scheme}`] = await page.evaluate(PHSCAN).catch(() => []); } await ctx.close();
}
try { execFileSync('montage', [path.join(OUT, 'gallery-dark.png'), path.join(OUT, 'gallery-light.png'), '-tile', '2x1', '-geometry', '+8+8', '-background', '#e9e9e9', path.join(OUT, 'gallery.png')]); execFileSync('convert', [path.join(OUT, 'gallery.png'), '-resize', 'x2400>', '-quality', '72', path.join(OUT, 'sm-gallery.jpg')]); } catch (e) { /* bỏ qua */ }

// ---- máy tính 1280 px (Stitch chỉ có mẫu điện thoại → tờ duyệt đặt cạnh mẫu điện thoại để so phong cách) ----
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(`desk ${scheme}: ${e.message}`)); await FIX_CLOCK(page); // đồng hồ cố định cho MỌI màn (chữ 'còn Xh', ngày) → điểm không trôi theo giờ chạy CI
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
    await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]);
    localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); }).catch(() => {});
  for (const [k, h] of Object.entries(SCREENS)) {
    await page.goto(url(h), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800); { await FIX_CLOCK(page); await page.evaluate(SEED_STREAK); await page.evaluate(() => App.route()); await page.waitForTimeout(600); } if (k === 'leagues') { await page.evaluate(SEED_LEAGUE); await page.evaluate(() => App.route()); await page.waitForTimeout(900); }
    if (DRIVEN.test(k)) await page.evaluate(DRIVE, k).catch(e => errs.push('drive ' + e.message)); if (READY[k] && !(await page.$(READY[k]))) errs.push(`${k}: chưa tới trạng thái (${READY[k]}) – ảnh chụp sai màn`);
    await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {});
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); }).catch(() => {}); await page.waitForTimeout(200);
    { const b = await page.screenshot(); fs.writeFileSync(path.join(OUT, `desk-${k}-${scheme}.png`), b); await auditContrast(page, b, `${k}-${scheme}-1366`); }
  }
  await ctx.close();
}
await browser.close();

// ---- tờ "Stitch | app" (sáng + tối) ----
try { for (const k of Object.keys(SCREENS)) { const f = [refOf(k, 'dark'), path.join(OUT, `app-${k}-dark.png`), refOf(k, 'light'), path.join(OUT, `app-${k}-light.png`)];
  const lab = ['Stitch – tối', 'Lexkite – tối', 'Stitch – sáng', 'Lexkite – sáng'], args = []; f.forEach((x, i) => { if (fs.existsSync(x)) args.push('-label', lab[i], x.endsWith('.png') ? x + '[390x2600+0+0]' : x); else args.push('-label', lab[i] + ' (chưa có mẫu)', 'xc:#ccc'); });
  execFileSync('montage', [...args, '-tile', '4x1', '-geometry', '390x2600>+8+8', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '80', path.join(OUT, `side-${k}.jpg`)]);
  const d = [refOf(k, 'dark'), path.join(OUT, `desk-${k}-dark.png`), path.join(OUT, `desk-${k}-light.png`)], dl = ['Stitch (điện thoại, tối)', 'Lexkite máy tính – tối', 'Lexkite máy tính – sáng'], da = [];
  d.forEach((x, i) => { if (fs.existsSync(x)) da.push('-label', dl[i], x); });
  if (da.length) execFileSync('montage', [...da, '-tile', `${da.length / 3}x1`, '-geometry', '+8+8', '-resize', 'x900', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '80', path.join(OUT, `desk-${k}.jpg`)]); } } catch (e) { console.log('montage bỏ qua:', e.message); }
// tờ khổ máy: 360 · 390 · 412 (tối rồi sáng) cho mỗi màn
try { for (const k of Object.keys(SCREENS)) { const a = []; for (const sc of ['dark', 'light']) for (const [w, f] of [[360, `w360-${k}-${sc}.png`], [390, `app-${k}-${sc}.png`], [412, `w412-${k}-${sc}.png`]]) { const x = path.join(OUT, f); if (fs.existsSync(x)) a.push('-label', `${w} px – ${sc === 'dark' ? 'tối' : 'sáng'}`, x + `[${w}x1700+0+0]`); }
  if (a.length) execFileSync('montage', [...a, '-tile', '6x1', '-geometry', 'x1300+6+6', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '75', path.join(OUT, `w-${k}.jpg`)]); } } catch (e) { console.log('montage khổ bỏ qua:', e.message); }

// ---- cổng ----
const bad = [];
for (const [k, v] of Object.entries(res)) { const l = LIM[k] || {}; for (const m of ['ssim', 'rows']) if (l[m] != null && v[m] < l[m]) bad.push(`${k} ${m} ${v[m]} < ${l[m]}`); for (const [n, lim] of Object.entries(l.reg || {})) if (v.reg && v.reg[n] < lim) bad.push(`${k} vùng ${n} ssim ${v.reg[n]} < ${lim}`); }
for (const [k, v] of Object.entries(qc)) { if (v.hscroll || (v.over || []).length) bad.push(`tràn ngang ${k}: ${(v.over || []).join(' | ')}`); if ((v.clip || []).length) bad.push(`chữ bị cắt ${k}: ${v.clip.join(' | ')}`); if (v.logo && !/icon\.svg/.test(v.logo.src)) bad.push(`logo ${k}: ${v.logo.src}`); }
const cmiss = Object.entries(contrast).flatMap(([k, v]) => v.miss.map(m => ({ k, ...m }))).sort((a, b) => a.cr / a.need - b.cr / b.need);
if (cmiss.length) bad.push(`tương phản: ${cmiss.length} chỗ < ngưỡng (xem bảng)`);
for (const [k, v] of Object.entries(ph)) if (v.length) bad.push(`giữ chỗ ${k}: ${v.join(' | ')}`);
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify({ res, errs, a11y, qc, contrast, ph }, null, 1));
for (const [k, v] of Object.entries(a11y)) { const sv = (v.violations || []).filter(x => x.impact === 'serious' || x.impact === 'critical'); console.log(`axe ${k}: ${(v.violations || []).length} vi phạm (${sv.length} nghiêm trọng) · ${v.passes || 0} đạt`); sv.forEach(x => bad.push(`axe ${k}: ${x.id} ×${x.n} – ${x.sample.join(' | ')}`)); }
console.log(Object.entries(res).map(([k, v]) => `${k}: ssim ${v.ssim} · nhịp hàng ${v.rows} · vùng ${Object.entries(v.reg || {}).map(([n, x]) => n + ' ' + x).join(' ')}`).join('\n'));
// Tóm tắt ngắn (đọc thay cho log/ảnh lớn): điểm SSIM, axe, dung lượng CSS
{ const css = ['home', 'lesson', 'goal'].map(g => { const f = path.join(ROOT, 'css', `st-${g}.css`); if (!fs.existsSync(f)) return `st-${g}: –`; const b = fs.readFileSync(f); return `st-${g}.css ${(b.length / 1024).toFixed(1)} KB · gz ${(zlib.gzipSync(b, { level: 9 }).length / 1024).toFixed(2)} KB`; });
  const md = ['## Stitch diff', '| màn | SSIM | nhịp hàng | axe (nghiêm trọng/tổng) |', '|---|---|---|---|',
    ...Object.keys({ ...res, ...a11y }).sort().map(k => { const r = res[k] || {}, a = a11y[k] || {}, v = a.violations || []; return `| ${k} | ${r.ssim ?? '–'} | ${r.rows ?? '–'} | ${v.filter(x => x.impact === 'serious' || x.impact === 'critical').length}/${v.length}${v.length ? ' ' + v.map(x => x.id).join(',') : ''} |`; }),
    '', '| khổ | tràn | chữ cắt | chạm <44 | logo |', '|---|---|---|---|---|', ...Object.entries(qc).map(([k, v]) => `| ${k} | ${v.hscroll || (v.over || []).length ? '✗' : '✓'} | ${(v.clip || []).length || '✓'} | ${v.tapN ?? '–'}${v.tapN ? ' ' + v.tap.slice(0, 3).join(',') : ''} | ${v.logo ? v.logo.w + 'px' : '–'} |`), '', `### Tương phản (pixel thật) – ${Object.values(contrast).reduce((t, v) => t + v.n, 0)} chữ/icon · ${Object.keys(contrast).length} ảnh · trượt ${cmiss.length}`, ...(cmiss.length ? ['| ảnh | chữ | tỉ lệ | cần |', '|---|---|---|---|', ...cmiss.slice(0, 10).map(m => `| ${m.k} | ${m.t.replace(/\|/g, '/')} | ${m.cr} | ${m.need} |`)] : ['✓ mọi chữ ≥4.5, chữ lớn/icon ≥3']), '', ...css.map(x => '- ' + x), errs.length ? '- lỗi JS: ' + errs.slice(0, 5).join(' | ') : '- lỗi JS: 0', bad.length ? '- ✗ ' + bad.slice(0, 12).join('\n- ✗ ') : '- ✓ đạt ngưỡng'].join('\n');
  fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md + '\n'); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  try { for (const k of Object.keys(SCREENS)) for (const f of [`side-${k}.jpg`, `desk-${k}.jpg`, `w-${k}.jpg`]) if (fs.existsSync(path.join(OUT, f))) execFileSync('convert', [path.join(OUT, f), '-resize', '900x900>', '-quality', '70', path.join(OUT, 'sm-' + f)]); } catch (e) { /* bỏ qua */ } }
if (errs.length) console.log('lỗi JS:', errs.slice(0, 10));
if (bad.length || errs.length) { console.error('✗ stitch-diff:\n  - ' + bad.concat(errs).join('\n  - ')); process.exit(1); }
console.log('✓ stitch-diff: bám mẫu Stitch đạt ngưỡng (scripts/test/stitch-diff.json, chỉ được nâng)');
