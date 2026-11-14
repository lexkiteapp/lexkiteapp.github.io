// ✨ QC mẫu Stitch "nâng chất lượng" (báo cáo tuần, huy hiệu, ảnh chia sẻ, OG, email): brand/stitch/v2q/<surface>/<page>-light|dark.html, danh sách ở <surface>/.index.txt.
// Cùng chuẩn với stitch-refs-qc.mjs (xưởng ref) + cổng tên icon Material hiện thành chữ (font ligature không nạp).
// Vẽ HTML Stitch thật trên Chromium (tắt hoạt ảnh) ở bề rộng thiết bị (DESKTOP 1280, MOBILE 390) rồi chặn:
//   1. tương phản chữ theo pixel: chữ thường ≥ 4.5, chữ lớn ≥ 3 (scripts/lib/pixel-contrast.mjs) – cả sáng lẫn tối;
//   2. bản tối không có thẻ/tấm sáng lớn (diện tích chói > MAX_BRIGHT_DARK), bản sáng không bị tối hoá (< MIN_BRIGHT_LIGHT);
//   3. 0 lỗi JS khi tải; 4. sáng ↔ tối cùng nội dung (số chữ lệch ≤ 20 %); 5. màn có ô giáo viên ('teacher-slot') phải còn ô đó
//      (người thật do code vẽ bằng Chars.*, Stitch KHÔNG được vẽ người – chủ duyệt bằng mắt trên tờ duyệt).
// Ngưỡng chỉ được NÂNG (docs/no-cuts). Xuất: out/stitch-refs-qc/{png,sheet-<surface>.jpg,report.json,SUMMARY.md}.
// Dùng: node scripts/test/stitch-refs-qc.mjs [brand/stitch/v2q] [out/stitch-quality-qc]   (CI: .github/workflows/stitch-quality-qc.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { chromium } from 'playwright';
import { textBoxes, contrastMiss, brightShare } from '../lib/pixel-contrast.mjs';
const [SRC = 'brand/stitch/v2q', OUT = 'out/stitch-quality-qc'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
// --strict-layout (kho v3): tràn ngang + vùng chạm < 44px là LỖI; kho cũ chỉ ghi vào info (cảnh báo) cho tới khi sửa xong.
const STRICT = process.argv.includes('--strict-layout'), TAP = 44;
// --all: chấm cả màn chưa PASS (verdict QC/PICK, kho v3) để biết cần sửa gì – chỉ màn PASS/PICK làm CI đỏ.
const ALL = process.argv.includes('--all'), GATED = v => v === 'PASS' || v === 'PICK';
const SURF = ['app', 'email', 'share', 'og', 'ext', 'admin'], MAX_BRIGHT_DARK = 0.12, MIN_BRIGHT_LIGHT = 0.35, WORD_DRIFT = 0.2;
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
const rows = [];
for (const s of SURF) { const f = path.join(SRC, s, '.index.txt'); if (!fs.existsSync(f)) continue;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.trim() || l.startsWith('#')) continue;
    if (!/^\S+ [0-9a-f]{32} [0-9a-f]{32} (DESKTOP|MOBILE) /.test(l)) { console.error(`✗ ${s}/.index.txt: dòng hỏng (ghi chú có xuống dòng?) "${l.slice(0, 60)}" – sửa bằng scripts/stitch/import-v3.mjs`); process.exitCode = 1; continue; }
    const [head] = l.split(' | '), [page, , , dev, verdict, ...flags] = head.split(/\s+/);
    if (GATED(verdict) || ALL) rows.push({ s, page, gated: GATED(verdict), w: dev === 'DESKTOP' ? 1280 : 390, teacher: flags.includes('teacher-slot') }); } }
const browser = await chromium.launch(), report = [];
for (const r of rows) { const res = { surface: r.s, page: r.page, gated: r.gated, fails: [], info: {} }, words = {};
  for (const m of ['light', 'dark']) { const f = path.join(SRC, r.s, `${r.page}-${m}.html`); if (!fs.existsSync(f)) { res.fails.push(`${m}: thiếu file`); continue; }
    const sv = fs.readFileSync(f, 'utf8').match(/<svg[^>]*?\swidth="(\d+)"[^>]*?\sheight="(\d+)"/); // ảnh tĩnh SVG: khung = đúng cỡ ảnh (không tính lề trắng)
    const ctx = await browser.newContext({ viewport: sv ? { width: +sv[1], height: +sv[2] } : { width: r.w, height: r.w > 800 ? 900 : 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: m });
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 120)));
    await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle', timeout: 60000 }).catch(e => errs.push('load: ' + e.message.slice(0, 80)));
    // CDN Tailwind tải hỏng thoáng qua trên CI → màn mất hết CSS và báo đỏ oan (4/11: mistakes-loading dark). Tải lại tối đa 3 lần; hỏng cả 3 thì vẫn đỏ.
    for (let i = 0; i < 3 && errs.some(e => /tailwind is not defined/.test(e)); i++) { errs.length = 0; await p.waitForTimeout(3000 * (i + 1)); await p.reload({ waitUntil: 'networkidle', timeout: 60000 }).catch(e => errs.push('load: ' + e.message.slice(0, 80))); }
    await p.addStyleTag({ content: STILL }); await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(300);
    // Chụp fullPage: phần tử fixed (top bar, tab bar, CTA dưới) bị vẽ đè giữa trang → neo về đúng chỗ khi cuộn: thanh trên ở đầu trang, thanh dưới ở cuối trang.
    await p.evaluate(() => { const H = document.documentElement.scrollHeight, fx = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed');
      for (const e of fx) { const r = e.getBoundingClientRect(); e.style.position = 'absolute'; e.style.bottom = 'auto'; e.style.top = (r.top > innerHeight / 2 ? H - (innerHeight - r.top) : r.top) + 'px'; } });
    // 6. tràn ngang + 7. vùng chạm ≥ 44px (nút/link/ô nhập; link chữ nằm trong câu được miễn như WCAG 2.5.8)
    const lay = await p.evaluate(TAP => { const W = document.documentElement.clientWidth, over = document.documentElement.scrollWidth - W, small = [];
      for (const e of document.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,textarea,[onclick]')) {
        const b = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!b.width || !b.height || cs.visibility === 'hidden' || e.closest('[aria-hidden=true]')) continue;
        if (cs.display === 'inline' && e.parentElement && e.parentElement.textContent.trim().length > e.textContent.trim().length + 20) continue;
        if (b.width < TAP - 0.5 || b.height < TAP - 0.5) small.push(`${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24)} ${Math.round(b.width)}×${Math.round(b.height)}`); }
      return { over, small }; }, TAP);
    res.info[m + 'Layout'] = { overflowPx: lay.over, smallTaps: lay.small.slice(0, 12), smallTapCount: lay.small.length };
    if (STRICT && lay.over > 1) res.fails.push(`${m}: tràn ngang ${lay.over}px`);
    if (STRICT && lay.small.length) res.fails.push(`${m}: ${lay.small.length} vùng chạm < ${TAP}px (vd "${lay.small[0]}")`);
    const png = path.join(OUT, 'png', `${r.s}-${r.page}-${m}.png`); await p.screenshot({ path: png, fullPage: true });
    await p.evaluate(() => { for (const e of document.querySelectorAll('svg text, svg tspan')) { const fl = getComputedStyle(e).fill; if (/^rgb/.test(fl)) e.style.color = fl; } }); // chữ SVG: màu thật = fill
    const boxes = await p.evaluate(textBoxes), txt = await p.evaluate(() => document.body.innerText);
    words[m] = (txt.match(/\S+/g) || []).length;
    const miss = contrastMiss(png, boxes), br = brightShare(png);
    res.info[m] = { texts: boxes.length, words: words[m], bright: +br.toFixed(3), contrastMiss: miss.slice(0, 12), jsErrors: errs };
    if (miss.length) res.fails.push(`${m}: tương phản ${miss.length} chữ (vd "${miss[0].t}" ${miss[0].r}<${miss[0].need})`);
    if (errs.length) res.fails.push(`${m}: lỗi JS ${errs[0]}`);
    if (m === 'dark' && br > MAX_BRIGHT_DARK) res.fails.push(`dark: mảng sáng ${(br * 100).toFixed(0)}% > ${MAX_BRIGHT_DARK * 100}% (thẻ trắng trong nền tối?)`);
    if (m === 'light' && br < MIN_BRIGHT_LIGHT) res.fails.push(`light: chỉ ${(br * 100).toFixed(0)}% sáng < ${MIN_BRIGHT_LIGHT * 100}% (bản sáng bị tối?)`);
    if (r.teacher && !/teacher/i.test(txt) && !(await p.evaluate(() => /teacher/i.test(document.body.textContent) || [...document.querySelectorAll('*')].some(e => getComputedStyle(e).borderStyle === 'dashed' || (e.getAttribute('stroke-dasharray') || '').trim()))))
      res.fails.push(`${m}: mất ô giáo viên (teacher slot)`);
    const gl = await p.evaluate(() => { const out = [];
      for (const e of document.querySelectorAll('[class*="material-symbols"],[class*="material-icons"]')) { const b = e.getBoundingClientRect(); if (b.width > 0 && b.width > b.height * 1.6) out.push(e.textContent.trim()); }
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const t = n.textContent.trim(), el = n.parentElement; if (/^[a-z]+(_[a-z]+)+$/.test(t) && el && el.getClientRects().length && !el.closest('[class*="material-"]')) out.push(t); }
      return out; });
    if (gl.length) res.fails.push(`${m}: tên icon hiện thành chữ "${gl[0]}" (${gl.length})`);
    await ctx.close(); }
  if (words.light && words.dark && Math.abs(words.light - words.dark) / Math.max(words.light, words.dark) > WORD_DRIFT) res.fails.push(`sáng/tối lệch nội dung: ${words.light} vs ${words.dark} chữ`);
  report.push(res); console.log((res.fails.length ? '✗' : '✓'), r.s + '/' + r.page, res.fails.join(' · ')); }
await browser.close();
for (const s of SURF) { const imgs = fs.readdirSync(path.join(OUT, 'png')).filter(f => f.startsWith(s + '-')).sort(); if (!imgs.length) continue;
  try { execFileSync('montage', [...imgs.flatMap(f => ['-label', f.replace(/\.png$/, ''), path.join(OUT, 'png', f)]), '-tile', '8x', '-geometry', '320x900>+6+6', '-pointsize', '12', '-background', '#888', '-quality', '75', path.join(OUT, `sheet-${s}.jpg`)]); } catch {} }
const bad = report.filter(r => r.fails.length), gatedBad = bad.filter(r => r.gated);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const md = `### Stitch quality QC – ${report.length - bad.length}/${report.length} màn đạt\n\n` + (bad.length ? '| màn | lỗi |\n|---|---|\n' + bad.map(r => `| ${r.surface}/${r.page} | ${r.fails.join('<br>')} |`).join('\n') : 'Tất cả đạt.') + '\n';
fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md); process.exit(gatedBad.length ? 1 : 0);
