// 🖼 Vẽ HTML Stitch v2 (brand/stitch/v2/<màn>-dark|light.html) ở 390×844, TẮT hoạt ảnh (prefers-reduced-motion + CSS ép) → PNG
//   tĩnh, đủ phần tử (ảnh PNG của Stitch chụp giữa hoạt ảnh nên thiếu). Xuất tờ duyệt: mỗi cột 1 màn, hàng trên tối, hàng dưới sáng.
//   Chủ duyệt tờ này, KHÔNG duyệt PNG Stitch. Ảnh vẽ ra cũng là mẫu chuẩn cho SSIM của stitch-diff.mjs (cùng job CI).
// Dùng: node scripts/test/stitch-render.mjs [brand/stitch/v2] [out/stitch-v2]   (cần playwright + imagemagick; CI: stitch-diff.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { chromium } from 'playwright'; import { PNG } from 'pngjs';
const [SRC = 'brand/stitch/v2', OUT = 'out/stitch-v2'] = process.argv.slice(2); fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
export const ORDER = ['path', 'lesson-question', 'feedback-correct', 'feedback-wrong', 'lesson-complete', 'story-duo', 'review', 'practice', 'leagues', 'streak', 'me', 'teacher-call', 'exam-readiness'];
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const done = {}, info = {};
// ---- Rà đồng bộ tối ↔ sáng (tự động): thanh tab, đầu trang, nút, chữ, nút chỉ-icon thiếu tên, tương phản chữ thật (pixel) ----
const STAT = () => { const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const txt = e => [...e.querySelectorAll('*')].concat(e).filter(x => [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !/material-symbols/.test(x.className) && vis(x)).map(x => [...x.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim()).filter(Boolean);
  const navs = [...document.querySelectorAll('nav')].filter(n => n.getBoundingClientRect().top > 400), nav = navs[navs.length - 1];
  const tabs = nav ? [...nav.querySelectorAll('a,button')].filter(vis) : [];
  const hdr = document.querySelector('header');
  const iconOnly = [...document.querySelectorAll('a,button,[role=button],[role=switch]')].filter(vis).filter(b => !txt(b).length && !b.getAttribute('aria-label') && !b.getAttribute('title') && !b.getAttribute('aria-labelledby')).map(b => (b.className.toString().match(/\S+/g) || []).slice(0, 2).join('.') + '@' + Math.round(b.getBoundingClientRect().top));
  const boxes = [...document.querySelectorAll('body *')].filter(x => [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !/material-symbols/.test(x.className) && vis(x)).map(x => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x), fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
    let op = 1; for (let q = x; q && q.nodeType === 1; q = q.parentElement) op *= +getComputedStyle(q).opacity;
    const hh = Math.min(r.height, fs * 1.2), cy = r.top + r.height / 2 + scrollY; return { t: x.textContent.trim().slice(0, 30), x: r.left, y: cy - hh / 2, w: r.width, h: hh, c: cs.color, op, large: fs >= 24 || (fs >= 18.66 && fw >= 700) }; });
  return { navLabels: tabs.map(t => txt(t).join(' ')).filter(Boolean), navAria: tabs.map(t => t.getAttribute('aria-label')).filter(Boolean), navN: tabs.length,
    header: hdr ? txt(hdr) : [], buttons: [...document.querySelectorAll('button,a')].filter(vis).map(b => txt(b).join(' ')).filter(Boolean), words: txt(document.body), iconOnly, boxes }; };
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// màu nền THẬT từ ảnh: cụm màu chiếm ≥ 15 % hộp chữ (trừ điểm gần màu chữ) → lấy tương phản XẤU NHẤT (bắt chữ trên gradient/ảnh)
function contrast(png, boxes) { const p = PNG.sync.read(fs.readFileSync(png)), bad = [];
  for (const b of boxes) { const m = (b.c.match(/[\d.]+/g) || []).map(Number), a = (m[3] ?? 1) * b.op; if (m.length < 3 || a < 0.05) continue;
    const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y)), x1 = Math.min(p.width, Math.ceil(b.x + b.w)), y1 = Math.min(p.height, Math.ceil(b.y + b.h)); if (x1 - x0 < 3 || y1 - y0 < 3) continue;
    const H = new Map(); let far = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * p.width + x) * 4, R = p.data[i], G = p.data[i + 1], B = p.data[i + 2];
      if (Math.abs(R - m[0]) + Math.abs(G - m[1]) + Math.abs(B - m[2]) < 90) continue; far++; const q = ((R >> 3) << 10) | ((G >> 3) << 5) | (B >> 3); H.set(q, (H.get(q) || 0) + 1); }
    if (far < 6) continue; let w = 99;
    for (const [q, c] of H) { if (c < far * 0.15) continue; const bg = [(q >> 10) * 8 + 4, ((q >> 5) & 31) * 8 + 4, (q & 31) * 8 + 4]; w = Math.min(w, cr([0, 1, 2].map(k => m[k] * a + bg[k] * (1 - a)), bg)); }
    const need = b.large ? 3 : 4.5; if (w < need - 0.05) bad.push(`"${b.t}" ${w.toFixed(2)}<${need}`); }
  return bad; }
for (const s of ORDER) for (const m of ['dark', 'light']) { const f = path.join(SRC, `${s}-${m}.html`); if (!fs.existsSync(f)) continue;
  const p = await ctx.newPage(); await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' }).catch(() => {});
  await p.addStyleTag({ content: STILL });
  // Lỗi xuất của Stitch (feedback-correct-dark): class material-symbols-outlined nhưng chỉ nạp font Rounded → dùng Rounded (app cũng tự host Rounded)
  await p.evaluate(() => { const h = [...document.querySelectorAll('link[href*="Material+Symbols"]')].map(l => l.href).join(' ');
    if (!/Outlined/.test(h) && /Rounded/.test(h)) document.head.insertAdjacentHTML('beforeend', '<style>.material-symbols-outlined{font-family:"Material Symbols Rounded"!important}</style>'); });
  // font icon (display=swap) tải muộn → ép tải MỌI font khai báo rồi mới chụp, nếu không icon hiện thành chữ ("close", "check")
  await p.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => {}))); await document.fonts.ready; });
  // màn tối Stitch cuộn TRONG khung cao 844 (h-screen + overflow-y-auto) → mở bung các khung cuộn lớn (≥ 300 px) để chụp đủ nội dung
  await p.evaluate(() => { for (let k = 0; k < 3; k++) for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e);
    if (e.clientHeight >= 300 && e.scrollHeight > e.clientHeight + 4 && /auto|scroll|hidden/.test(cs.overflowY)) Object.assign(e.style, { height: 'auto', maxHeight: 'none', overflowY: 'visible' }); } });
  // thanh tab "fixed bottom" phải nằm cuối trang: kéo khung nhìn cao bằng cả trang (chụp fullPage giữ fixed ở mép khung 844 → chèn giữa trang)
  const H = await p.evaluate(() => Math.max(844, document.documentElement.scrollHeight, document.body.scrollHeight)); await p.setViewportSize({ width: 390, height: H }); await p.waitForTimeout(500);
  const miss = await p.evaluate(() => [...document.querySelectorAll('[class*="material-symbols"]')].filter(e => e.textContent.trim() && e.getBoundingClientRect().width > 1.6 * parseFloat(getComputedStyle(e).fontSize)).length);
  if (miss) { console.error(`✗ ${s}-${m}: ${miss} icon chưa thành hình (font icon lỗi)`); process.exitCode = 1; }
  const st = await p.evaluate(STAT);
  const o = path.join(OUT, 'png', `${s}-${m}.png`); await p.screenshot({ path: o, fullPage: true }); done[`${s}-${m}`] = o; await p.close();
  st.lowContrast = contrast(o, st.boxes); delete st.boxes; (info[s] ||= {})[m] = st; }
await browser.close();
// ---- báo cáo đồng bộ: PHẢI SỬA (đỏ) vs lệch nội dung (tham khảo) ----
const W = t => new Set(t.join(' ').toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w)));
const norm = a => a.map(x => x.toLowerCase().replace(/\s+/g, ' ').trim()).sort().join(' | ');
const rep = [], must = [];
for (const s of ORDER) { const d = info[s]?.dark, l = info[s]?.light, R = [];
  if (!d && !l) { must.push(`${s}: thiếu cả hai bản`); rep.push(`## ${s}\n- ✗ thiếu cả hai bản`); continue; }
  if (!d || !l) R.push(`✗ thiếu bản ${!d ? 'tối' : 'sáng'} trong Stitch`);
  for (const [m, x] of Object.entries({ dark: d, light: l })) { if (!x) continue;
    if (x.navN && !x.navLabels.length) R.push(`✗ [${m}] thanh tab chỉ có icon, không chữ` + (x.navAria.length < x.navN ? ' VÀ thiếu aria-label (trình đọc màn hình im lặng)' : ''));
    if (x.iconOnly.length) R.push(`✗ [${m}] ${x.iconOnly.length} nút chỉ-icon không có tên (aria-label): ${x.iconOnly.slice(0, 5).join(', ')}`);
    if (x.lowContrast.length) R.push(`✗ [${m}] ${x.lowContrast.length} chữ thiếu tương phản WCAG: ${x.lowContrast.slice(0, 6).join('; ')}`); }
  if (d && l) {
    if (!!d.navN !== !!l.navN) R.push(`✗ thanh tab: tối ${d.navN ? 'có' : 'KHÔNG'} · sáng ${l.navN ? 'có' : 'KHÔNG'}`);
    else if (d.navN && norm(d.navLabels) !== norm(l.navLabels)) R.push(`✗ chữ thanh tab khác: tối [${d.navLabels.join(', ') || 'không chữ'}] · sáng [${l.navLabels.join(', ') || 'không chữ'}]`);
    if (norm(d.header) !== norm(l.header)) R.push(`✗ đầu trang khác: tối [${d.header.join(', ')}] · sáng [${l.header.join(', ')}]`);
    const bd = new Set(d.buttons.map(x => x.toLowerCase())), bl = new Set(l.buttons.map(x => x.toLowerCase())), onlyD = [...bd].filter(x => !bl.has(x)), onlyL = [...bl].filter(x => !bd.has(x));
    if (onlyD.length || onlyL.length) R.push(`✗ nút khác: chỉ tối [${onlyD.slice(0, 8).join(', ')}] · chỉ sáng [${onlyL.slice(0, 8).join(', ')}]`);
    const wd = W(d.words), wl = W(l.words), inter = [...wd].filter(x => wl.has(x)).length, jac = inter / (wd.size + wl.size - inter || 1);
    R.push(`ℹ chữ giống nhau ${(jac * 100).toFixed(0)} % · chỉ tối: ${[...wd].filter(x => !wl.has(x)).slice(0, 12).join(' ')} · chỉ sáng: ${[...wl].filter(x => !wd.has(x)).slice(0, 12).join(' ')}`); }
  for (const r of R) if (r.startsWith('✗')) must.push(`${s}: ${r.slice(2)}`);
  rep.push(`## ${s}\n${R.map(r => '- ' + r).join('\n') || '- ✓ khớp'}`); }
fs.writeFileSync(path.join(OUT, 'consistency.md'), `# Stitch v2 – rà đồng bộ tối ↔ sáng (tự động)\nPHẢI SỬA: ${must.length}\n\n${rep.join('\n\n')}\n`);
fs.writeFileSync(path.join(OUT, 'consistency.json'), JSON.stringify({ must, info }, null, 1));
console.log(`stitch-render: rà đồng bộ → ${must.length} mục PHẢI SỬA (out/…/consistency.md)`); for (const x of must) console.log('  ✗ ' + x);
if (must.length) process.exitCode = 1;
// tờ duyệt: 2 tờ (7 + 6 màn), mỗi ô thu 50 %, thiếu bản → ô xám "chưa có trong Stitch"
const cell = (s, m) => done[`${s}-${m}`] || (() => { const o = path.join(OUT, 'png', `_missing-${s}-${m}.png`);
  execFileSync('convert', ['-size', '390x844', 'xc:#777', '-gravity', 'center', '-pointsize', '28', '-fill', 'white', '-annotate', '0', `${s}\n${m}\nchưa có trong Stitch`, o]); return o; })();
for (const [i, part] of [ORDER.slice(0, 7), ORDER.slice(7)].entries()) {
  const tiles = [...part.map(s => cell(s, 'dark')), ...part.map(s => cell(s, 'light'))];
  execFileSync('montage', [...tiles, '-tile', `${part.length}x2`, '-geometry', '195x+8+8', '-gravity', 'north', '-background', '#e9eef0',
    '-title', `Stitch v2 (HTML tĩnh 390 px) · trên: tối · dưới: sáng · tờ ${i + 1}/2`, '-pointsize', '20', path.join(OUT, `sheet-${i + 1}.png`)]); }
console.log(`stitch-render: ${Object.keys(done).length} màn → ${OUT}/png, tờ ${OUT}/sheet-1.png, sheet-2.png`);
