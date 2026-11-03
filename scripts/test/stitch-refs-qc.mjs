// 🏭 QC mẫu Stitch v2.1 "đi trước" (kho ref cho các phiên port): brand/stitch/v2/<surface>/<page>-light|dark.html, danh sách ở <surface>/.index.txt.
// Vẽ HTML Stitch thật trên Chromium (tắt hoạt ảnh) ở bề rộng thiết bị (DESKTOP 1280, MOBILE 390) rồi chặn:
//   1. tương phản chữ theo pixel: chữ thường ≥ 4.5, chữ lớn ≥ 3 (scripts/lib/pixel-contrast.mjs) – cả sáng lẫn tối;
//   2. bản tối không có thẻ/tấm sáng lớn (diện tích chói > MAX_BRIGHT_DARK), bản sáng không bị tối hoá (< MIN_BRIGHT_LIGHT);
//   3. 0 lỗi JS khi tải; 4. sáng ↔ tối cùng nội dung (số chữ lệch ≤ 20 %); 5. màn có ô giáo viên ('teacher-slot') phải còn ô đó
//      (người thật do code vẽ bằng Chars.*, Stitch KHÔNG được vẽ người – chủ duyệt bằng mắt trên tờ duyệt).
//   6. KHUNG APP (chủ 31/10, docs/DESIGN-SYSTEM.md §5d): mỗi ref app gắn 'frame-hub|inner|modal|focus' (+ 'tab-<tên>'); ảnh Stitch phải là khổ điện thoại
//      (khung desktop = trượt), không tràn ngang ở 390 px, thanh trên ~56 px, hub/inner có đúng 5 tab Today/Vocab/Skills/Tests/Me (cố định đáy),
//      modal/focus không có thanh tab; thanh trên + thanh tab so với khung mẫu frame-<biến thể>-<theme> cùng thư mục: SSIM + màu nền thanh.
// Ngưỡng chỉ được NÂNG (docs/no-cuts). Xuất: out/stitch-refs-qc/{png,sheet-<surface>.jpg,report.json,SUMMARY.md}.
// Dùng: node scripts/test/stitch-refs-qc.mjs [brand/stitch/v2] [out/stitch-refs-qc]   (CI: .github/workflows/stitch-refs-qc.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { chromium } from 'playwright';
import { textBoxes, contrastMiss, brightShare } from '../lib/pixel-contrast.mjs';
import { PNG } from 'pngjs'; import { frameScores, btnScore, TABS } from '../lib/frame-check.mjs';
const [SRC = 'brand/stitch/v2', OUT = 'out/stitch-refs-qc'] = process.argv.slice(2);
const SURF = ['web', 'email', 'addon', 'admin', 'app', 'store'], MAX_BRIGHT_DARK = 0.12, MIN_BRIGHT_LIGHT = 0.35, WORD_DRIFT = 0.2;
// khung: SSIM tối thiểu (đo 31/10 trên cặp khung mẫu dẫn xuất: tab 0.66–0.77; thanh tab sai kiểu Kit 0.50–0.53), lệch màu nền thanh tối đa (RGB)
const FRAME_MIN = { tabs: 0.62, hubTop: 0.6, btn: 0.6 }, FRAME_BG = 24, FRAME_VARIANTS = ['hub', 'inner', 'modal', 'focus'];
const pngWidth = f => { try { const b = fs.readFileSync(f); return b.readUInt32BE(16); } catch { return 0; } };
// dò khung trong DOM: thanh trên = phần tử đầu trang rộng ≥ 300 px cao 40–90; thanh tab = phần tử cố định đáy viewport có ≥ 3 nhãn tab
const probeFrame = TABS => { const H = innerHeight, els = [...document.querySelectorAll('body *')], vis = e => { const r = e.getBoundingClientRect(); return r.width >= 300 && r.height > 0; };
  const top = els.find(e => { const r = e.getBoundingClientRect(); return vis(e) && r.top <= 2 && r.height >= 40 && r.height <= 90; });
  const bars = els.filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return vis(e) && (cs.position === 'fixed' || cs.position === 'sticky') && Math.abs(r.bottom - H) <= 4 && r.height <= 110
    && TABS.filter(t => new RegExp('\\b' + t + '\\b').test(e.innerText)).length >= 3; });
  const bar = bars.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
  return { topH: top ? Math.round(top.getBoundingClientRect().height) : 0, tabH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
    btn: (() => { const c = els.map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.left < 72 && r.top < 56 && r.width >= 28 && r.width <= 60 && r.height >= 28 && r.height <= 60 && Math.abs(r.width - r.height) <= 8)
      .sort((a, b) => a[1].left + a[1].top - b[1].left - b[1].top)[0]; return c ? { x: c[1].left, y: c[1].top, w: c[1].width, h: c[1].height } : null; })(),
    tabWords: bar ? (bar.innerText.match(/[A-Za-z]+/g) || []).filter(w => TABS.includes(w)) : [], scrollW: document.documentElement.scrollWidth }; };
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
const rows = [];
for (const s of SURF) { const f = path.join(SRC, s, '.index.txt'); if (!fs.existsSync(f)) continue;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.trim() || l.startsWith('#')) continue;
    const [head] = l.split(' | '), tok = head.split(/\s+/); if (/^\d+$/.test(tok[3])) tok.splice(3, 1); // cột 4 = project Stitch (key1/2/3) nếu có
    const [page, , , dev, verdict, ...flags] = tok;
    if (verdict === 'PASS') rows.push({ s, page, w: dev === 'DESKTOP' ? 1280 : 390, teacher: flags.includes('teacher-slot'),
      frame: (flags.find(f => f.startsWith('frame-')) || '').slice(6) || null, tab: ((flags.find(f => f.startsWith('tab-')) || '').slice(4) || null) }); } }
const browser = await chromium.launch(), report = [];
async function frameCheck(r, m, p, res) { const F = msg => res.fails.push(`${m}: khung – ${msg}`);
  if (!r.frame) return F("chưa gắn 'frame-hub|inner|modal|focus' trong .index.txt");
  if (r.frame === 'desktop') return; // mô phỏng thi máy tính (CBT) – khổ desktop có chủ đích
  const pw = pngWidth(path.join(SRC, r.s, `${r.page}-${m}.png`)); if (pw > 420) F(`ảnh Stitch khổ desktop (${pw * 2} px) – phải là màn điện thoại`);
  const d = await p.evaluate(probeFrame, TABS); res.info[m].frame = d;
  if (d.scrollW > 392) F(`tràn ngang ở 390 px (rộng ${d.scrollW})`);
  if (d.topH < 48 || d.topH > 72) F(`thanh trên ${d.topH} px (chuẩn 56)`);
  const withTabs = r.frame === 'hub' || r.frame === 'inner';
  if (withTabs && d.tabWords.join(' ') !== TABS.join(' ')) F(`thanh tab phải là ${TABS.join('/')} cố định đáy, đang thấy '${d.tabWords.join('/') || 'không có'}'`);
  if (withTabs && d.tabH && (d.tabH < 56 || d.tabH > 84)) F(`thanh tab cao ${d.tabH} px (chuẩn 64)`);
  if (!withTabs && d.tabWords.length >= 3) F(`${r.frame} không được có thanh tab`);
  const T = TPL[r.frame + '-' + m]; if (!T) return F(`thiếu khung mẫu frame-${r.frame}-${m}.html`);
  const sc = frameScores(await shot(p), T.png, r.frame, cap(r.tab), T.tab); res.info[m].frameScores = sc;
  if (r.frame === 'hub' && sc.top < FRAME_MIN.hubTop) F(`thanh trên hub lệch khung mẫu (SSIM ${sc.top} < ${FRAME_MIN.hubTop})`);
  if (r.frame !== 'hub') { const nm = r.frame === 'inner' ? 'quay lại' : 'đóng';
    if (!d.btn || !T.probe.btn) F(`không thấy nút ${nm} tròn ở góc trái thanh trên`);
    else { sc.btn = btnScore(await shot(p), d.btn, T.png, T.probe.btn); if (sc.btn < FRAME_MIN.btn) F(`nút ${nm} lệch khung mẫu (SSIM ${sc.btn} < ${FRAME_MIN.btn})`);
      if (Math.abs(d.btn.w - T.probe.btn.w) > 8 || Math.abs(d.btn.y + d.btn.h / 2 - T.probe.btn.y - T.probe.btn.h / 2) > 8) F(`nút ${nm} sai cỡ/vị trí (${Math.round(d.btn.w)} px, mẫu ${Math.round(T.probe.btn.w)} px)`); } }
  if (sc.topBg > FRAME_BG) F(`màu nền thanh trên lệch token (ΔRGB ${sc.topBg} > ${FRAME_BG})`);
  if (withTabs && sc.tabs < FRAME_MIN.tabs) F(`thanh tab lệch khung mẫu (SSIM ${sc.tabs} < ${FRAME_MIN.tabs})`);
  if (withTabs && sc.tabBg > FRAME_BG) F(`màu nền thanh tab lệch token (ΔRGB ${sc.tabBg} > ${FRAME_BG})`); }
const shot = async (p) => PNG.sync.read(await p.screenshot({ clip: { x: 0, y: 0, width: 390, height: 844 } }));
const cap = t => t && t[0].toUpperCase() + t.slice(1);
// khung mẫu: chụp viewport 390×844 mỗi biến thể × theme (frame-<v>-<m>.html cùng thư mục app)
const TPL = {}; for (const v of FRAME_VARIANTS) for (const m of ['light', 'dark']) { const f = path.join(SRC, 'app', `frame-${v}-${m}.html`); if (!fs.existsSync(f)) continue;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: m }), p = await ctx.newPage();
  await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}); await p.addStyleTag({ content: STILL }); await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(300);
  TPL[v + '-' + m] = { probe: await p.evaluate(probeFrame, TABS), png: await shot(p), tab: cap((fs.readFileSync(path.join(SRC, 'app', '.index.txt'), 'utf8').match(new RegExp('^frame-' + v + ' .*? tab-(\\w+)', 'm')) || [])[1]) || null }; await ctx.close(); }

for (const r of rows) { const res = { surface: r.s, page: r.page, fails: [], info: {} }, words = {};
  for (const m of ['light', 'dark']) { const f = path.join(SRC, r.s, `${r.page}-${m}.html`); if (!fs.existsSync(f)) { res.fails.push(`${m}: thiếu file`); continue; }
    const ctx = await browser.newContext({ viewport: { width: r.w, height: r.w > 800 ? 900 : 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: m });
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 120)));
    await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle', timeout: 60000 }).catch(e => errs.push('load: ' + e.message.slice(0, 80)));
    await p.addStyleTag({ content: STILL }); await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(300);
    const png = path.join(OUT, 'png', `${r.s}-${r.page}-${m}.png`); await p.screenshot({ path: png, fullPage: true });
    const boxes = await p.evaluate(textBoxes), txt = await p.evaluate(() => document.body.innerText);
    words[m] = (txt.match(/\S+/g) || []).length;
    const miss = contrastMiss(png, boxes), br = brightShare(png);
    res.info[m] = { texts: boxes.length, words: words[m], bright: +br.toFixed(3), contrastMiss: miss.slice(0, 12), jsErrors: errs };
    if (miss.length) res.fails.push(`${m}: tương phản ${miss.length} chữ (vd "${miss[0].t}" ${miss[0].r}<${miss[0].need})`);
    if (errs.length) res.fails.push(`${m}: lỗi JS ${errs[0]}`);
    if (m === 'dark' && br > MAX_BRIGHT_DARK) res.fails.push(`dark: mảng sáng ${(br * 100).toFixed(0)}% > ${MAX_BRIGHT_DARK * 100}% (thẻ trắng trong nền tối?)`);
    if (m === 'light' && br < MIN_BRIGHT_LIGHT) res.fails.push(`light: chỉ ${(br * 100).toFixed(0)}% sáng < ${MIN_BRIGHT_LIGHT * 100}% (bản sáng bị tối?)`);
    if (r.teacher && !/teacher/i.test(txt) && !(await p.evaluate(() => [...document.querySelectorAll('*')].some(e => getComputedStyle(e).borderStyle === 'dashed'))))
      res.fails.push(`${m}: mất ô giáo viên (teacher slot)`);
    if (r.s === 'app') await frameCheck(r, m, p, res);
    await ctx.close(); }
  if (words.light && words.dark && Math.abs(words.light - words.dark) / Math.max(words.light, words.dark) > WORD_DRIFT) res.fails.push(`sáng/tối lệch nội dung: ${words.light} vs ${words.dark} chữ`);
  report.push(res); console.log((res.fails.length ? '✗' : '✓'), r.s + '/' + r.page, res.fails.join(' · ')); }
await browser.close();
for (const s of SURF) { const imgs = fs.readdirSync(path.join(OUT, 'png')).filter(f => f.startsWith(s + '-')).sort(); if (!imgs.length) continue;
  try { execFileSync('montage', [...imgs.flatMap(f => ['-label', f.replace(/\.png$/, ''), path.join(OUT, 'png', f)]), '-tile', '8x', '-geometry', '320x900>+6+6', '-pointsize', '12', '-background', '#888', '-quality', '75', path.join(OUT, `sheet-${s}.jpg`)]); } catch {} }
const bad = report.filter(r => r.fails.length);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const md = `### Stitch refs QC – ${report.length - bad.length}/${report.length} màn đạt\n\n` + (bad.length ? '| màn | lỗi |\n|---|---|\n' + bad.map(r => `| ${r.surface}/${r.page} | ${r.fails.join('<br>')} |`).join('\n') : 'Tất cả đạt.') + '\n';
fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md); process.exit(bad.length ? 1 : 0);
