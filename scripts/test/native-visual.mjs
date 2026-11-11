// Native visual QC gate (docs/specs/native-apps.md §3 một nguồn, §6 CI; docs/DESIGN-SYSTEM.md §5d): ảnh snapshot iOS/Android phải dùng ĐÚNG màu token (chống trôi token / màu mặc định Material),
// cạnh ảnh web (Stitch render) trong một tờ so sánh, và các mốc bố cục (thanh 5 tab, nút chính) nằm trong dung sai suy từ token. Không phụ thuộc gói ngoài (PNG tự đọc bằng node:zlib).
// Chạy: node scripts/test/native-visual.mjs [--ios DIR] [--android DIR] [--web DIR] [--out DIR] [--langs en,vi] [--landmarks fail|warn]   |   --self-test [--write-fixtures]
// Chưa có ảnh snapshot (chưa ghi lần đầu) → qua kèm thông báo. CI: xem scripts/native/VISUAL-CI-REQUEST.md.
import { isMain } from '../lib/is-main.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../native/visual-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOKENS = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand/stitch/tokens.dtcg.json'), 'utf8'));
const FRAME = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/gen/frame.json'), 'utf8'));
const SP = k => L.px(TOKENS.spacing[k].$value), RAD = L.px;
const RADII = Object.values(TOKENS.radius).map(r => RAD(r.$value)).filter(v => v < 1000);   // 4, 8, 12 (+ "full" = nửa chiều cao)

/** Ngưỡng. Chỉ được siết, không nới (CLAUDE.md "no cuts"). */
export const THRESH = {
  mergeDE: 1.5,        // gộp các giá trị đặc gần nhau (gradient 8-bit, dither) thành 1 cụm: dưới ngưỡng nhận biết được (JND ≈ 2.3)
  paletteDE: 3,        // yêu cầu giao việc: cụm đáng kể phải ≤ ΔE2000 3 so với một token cùng theme
  blendDE: 2,          // lớp phủ/gradient pha 2 token (nền ⊕ token ≤ 60 %, banner↔banner-2) – chặt hơn paletteDE vì dải màu rộng
  failArea: 0.5,       // % diện tích: cụm ≥ 0.5 % ngoài bảng màu = LỖI (nhỏ hơn bị coi là chống răng cưa/chữ)
  warnArea: 0.1,       // 0.1–0.5 % = cảnh báo
  contrast: 4.5,       // WCAG 2.2 AA chữ thường (đúng chuẩn token: "text roles … pass AA 4.5:1")
  contrastMinArea: 0.02, textMaxArea: 3, pairMinEdge: 40,   // cặp chữ/nền phải có ≥ 40 px (đv 390) đường biên chung và cụm ≥ 0.02 % diện tích mới tính là "chữ"
  // mốc bố cục
  barRowFrac: 0.3, barBorderMax: 3, barMin: 0, barMax: 140, iconBand: 30, iconGap: 4, iconMin: 10,
  minTap: FRAME.minTap,                         // thanh tab cao ≥ vùng chạm tối thiểu (frame.json, 44)
  barHeightTol: SP('space-lg'),                 // iOS ↔ Android (↔ web) lệch chiều cao thanh tab ≤ 24 px: phần chênh safe-area/inset giữa nền tảng
  radiusTol: 2,                                 // sai số đo bán kính góc nút (viền chống răng cưa), không phải dung sai thiết kế
  radii: RADII,                                 // bán kính nút ∈ {token radius} ∪ {pill = nửa chiều cao}
  btnMinW: 100, btnH: [36, 72],
};

// ---------- lọc ảnh & đặt tên ----------
const LANGS15 = new Set(['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']);
function walk(d, acc = []) { if (!fs.existsSync(d)) return acc; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, acc) : /\.png$/i.test(e.name) && acc.push(p); } return acc; }
/** iOS `…/AppShellSnapshotTests/testToday.en-light.png`, Android `today-en-dark[-medium].png`, web `today-light.png` → {screen,lang,theme,variant}. */
export function parseName(file) {
  const base = path.basename(file, '.png').replace(/^test/i, ''), toks = base.toLowerCase().split(/[.\-_]/).filter(Boolean);
  const theme = toks.find(t => t === 'light' || t === 'dark'); if (!theme) return null;
  const lang = toks.find((t, i) => i > 0 && LANGS15.has(t)) || null, variant = toks.includes('medium') ? 'medium' : '';
  // screen = every token before the first language/theme token ('lesson-question-gap-en-light' → 'lesson-question-gap', 'Ama.pose-cheer-dark' → 'ama-pose-cheer'):
  // a single first token merged all Android lesson-* / onb-* images into one id, so a failure could not be traced to its screen
  const stop = toks.findIndex((t, i) => i > 0 && (t === theme || LANGS15.has(t)));
  return { screen: toks.slice(0, stop < 0 ? 1 : stop).join('-'), lang, theme, variant };
}
const toGlob = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
function collect(dir, platform) { return walk(dir).map(f => { const n = parseName(f); return n && { ...n, platform, file: f, id: [platform, n.screen, n.lang, n.theme, n.variant].filter(Boolean).join('-') }; }).filter(Boolean); }
const hasFrame = e => e.platform === 'ios' ? e.screen === 'appshell' : e.platform === 'android' ? ['today', 'appshell'].includes(e.screen) : false;

// ---------- phân tích ----------
export function analyze(entry, img, allow = { rects: [], colors: [] }, thresh = THRESH) {
  const scale = img.w / 390, pal = L.palette(TOKENS, entry.theme).concat(allow.colors.map(c => ({ name: 'allow:' + (c.reason || '?'), hex: c.hex.toUpperCase(), rgb: L.hex2rgb(c.hex), lab: L.rgb2lab(L.hex2rgb(c.hex)) })));
  const rects = allow.rects.filter(r => toGlob(r.match).test(entry.id)).map(r => r.rect);
  const ignore = rects.length ? (x, y) => rects.some(([a, b, c, d]) => x >= a && x < a + c && y >= b && y < b + d) : null;
  const pc = L.paletteCheck(img, { pal, scale, thresh, ignore });
  const res = { id: entry.id, file: entry.file, size: [img.w, img.h], scale: +scale.toFixed(2), fail: pc.fail, warn: pc.warn, info: pc.info, contrastBad: pc.contrastBad, landmarks: {}, lmFail: [], lmWarn: [] };
  if (entry.variant !== 'medium' && Math.abs(scale - Math.round(scale)) < 0.01 + 1e9 * 0) {
    const lm = res.landmarks; lm.firstContentY = L.firstContentY(img, scale);
    lm.button = L.primaryButton(img, pc.solid, pc.ids, pc.clusters, pal, scale, thresh);
    if (lm.button) { const b = lm.button, ok = b.pill || thresh.radii.some(r => Math.abs(r - b.radius) <= thresh.radiusTol); if (!ok) res.lmFail.push(`nút chính bo ${b.radius} px – ngoài token radius {${thresh.radii.join(', ')}} và không phải pill`); }
    if (hasFrame(entry)) {
      const tb = lm.tabBar = L.tabBar(img, scale, thresh);
      if (!tb.found) res.lmFail.push(`không thấy thanh tab (cao ${tb.height} px, cần ${thresh.barMin}–${thresh.barMax})`);
      else {
        if (tb.tabs !== FRAME.tabs.length) res.lmFail.push(`thanh tab có ${tb.tabs} icon, cần ${FRAME.tabs.length} (frame.json)`);
        if (tb.height < thresh.minTap) res.lmFail.push(`thanh tab cao ${tb.height} px < vùng chạm tối thiểu ${thresh.minTap}`);
      }
    }
  }
  delete pc.solid; delete pc.ids; delete pc.clusters;
  return res;
}
/** So chéo iOS ↔ Android (cùng màn/theme/ngôn ngữ) và với web (chỉ thông tin trừ --strict-web). */
export function crossCheck(results, thresh = THRESH) {
  const out = []; const by = new Map();
  for (const r of results) { const k = r.key; if (!k) continue; (by.get(k) || by.set(k, []).get(k)).push(r); }
  for (const [k, rs] of by) {
    const ios = rs.find(r => r.platform === 'ios' && r.landmarks.tabBar?.found), and = rs.find(r => r.platform === 'android' && r.landmarks.tabBar?.found);
    if (ios && and) { const d = Math.abs(ios.landmarks.tabBar.height - and.landmarks.tabBar.height); if (d > thresh.barHeightTol) out.push({ key: k, msg: `thanh tab iOS ${ios.landmarks.tabBar.height} px vs Android ${and.landmarks.tabBar.height} px – lệch ${d.toFixed(1)} > ${thresh.barHeightTol} (space-lg)` }); }
    const bi = rs.find(r => r.platform === 'ios' && r.landmarks.button)?.landmarks.button, ba = rs.find(r => r.platform === 'android' && r.landmarks.button)?.landmarks.button;
    if (bi && ba && !(bi.pill && ba.pill) && Math.abs(bi.radius - ba.radius) > thresh.radiusTol) out.push({ key: k, msg: `bán kính nút chính iOS ${bi.radius} vs Android ${ba.radius} px` });
  }
  return out;
}

// ---------- tờ so sánh ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function buildReport(outDir, groups, results, cross, webInfo) {
  fs.mkdirSync(outDir, { recursive: true }); const W = 390, H = 844, GAP = 12, sheets = [];
  for (const g of groups) {
    const cols = [['web', g.web], ['iOS shell', g.iosShell], ['iOS screen', g.iosScreen], ['Android', g.android]].filter(c => c[1]);
    if (cols.length < 2) continue;
    const sheet = L.newImage(cols.length * (W + GAP) + GAP, H + 2 * GAP, [128, 128, 128]);
    cols.forEach(([, f], i) => { const im = L.resizeToWidth(L.decodePng(fs.readFileSync(f)), W); L.blit(sheet, im, GAP + i * (W + GAP), GAP, H); });
    const name = `sheet-${g.screen}-${g.theme}-${g.lang}.png`; fs.writeFileSync(path.join(outDir, name), L.encodePng(sheet)); sheets.push({ name, cols: cols.map(c => c[0]), g });
  }
  const rows = results.map(r => `<tr class="${r.fail.length || r.contrastBad.length || r.lmFail.length ? 'bad' : r.warn.length ? 'warn' : 'ok'}"><td>${esc(r.id)}</td><td>${r.fail.map(f => `${f.hex} ${f.area}% ≈ ${f.nearest} ${f.nearestHex} ΔE ${f.de}`).map(esc).join('<br>')}</td><td>${r.contrastBad.map(c => `${c.fgToken} ${c.fg} / ${c.bg} = ${c.ratio}`).map(esc).join('<br>')}</td><td>${r.lmFail.map(esc).join('<br>')}</td><td>${r.warn.length} cảnh báo, ${r.info.length} pha trộn</td></tr>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>Native visual QC</title><style>body{font:14px system-ui;margin:20px;background:#fafafa}img{max-width:100%;border:1px solid #bbb;margin:6px 0}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}table{border-collapse:collapse}.bad{background:#fde}.warn{background:#ffd}.ok{background:#efe}</style>
<h1>Native ↔ web visual QC</h1><p>${webInfo}</p>${sheets.map(s => `<h3>${esc(s.g.screen)} · ${s.g.theme} · ${s.g.lang || ''} — ${s.cols.join(' | ')}</h3><img src="${s.name}">`).join('')}
<h2>Kết quả theo ảnh</h2><table><tr><th>ảnh</th><th>màu ngoài token</th><th>tương phản &lt; ${THRESH.contrast}</th><th>mốc bố cục</th><th>khác</th></tr>${rows}</table>
<h2>Lệch chéo iOS ↔ Android</h2><ul>${cross.map(c => `<li>${esc(c.key)}: ${esc(c.msg)}</li>`).join('') || '<li>không</li>'}</ul>`;
  fs.writeFileSync(path.join(outDir, 'report.html'), html); fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify({ thresh: THRESH, results, cross }, null, 1));
  return sheets.length;
}

// ---------- chạy thật ----------
function run(argv) {
  const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const iosDir = path.resolve(ROOT, opt('ios', 'native/ios/LexkiteKit/Tests/LKSnapshotTests/__Snapshots__')), andDir = path.resolve(ROOT, opt('android', 'native/android/app/src/test/snapshots')), webDir = path.resolve(ROOT, opt('web', 'out/stitch-v2/png')), outDir = path.resolve(ROOT, opt('out', 'out/native-visual'));
  const langs = opt('langs', 'en,vi').split(','), lmMode = opt('landmarks', 'fail');
  const allowFile = path.join(ROOT, 'scripts/native/visual-allow.json'), allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : { rects: [], colors: [] };
  const entries = [...collect(iosDir, 'ios'), ...collect(andDir, 'android')];
  if (!entries.length) { console.log(`::notice::native-visual: chưa có ảnh snapshot (${path.relative(ROOT, iosDir)}, ${path.relative(ROOT, andDir)}) – CI ghi lần đầu, commit ảnh chuẩn rồi cổng này mới chạy. Bỏ qua (qua).`); return 0; }
  const results = entries.map(e => { const r = analyze(e, L.decodePng(fs.readFileSync(e.file)), allow); r.platform = e.platform; r.key = e.variant ? null : `${e.screen === 'appshell' ? 'today' : e.screen}-${e.lang}-${e.theme}`; r.screen = e.screen; r.lang = e.lang; r.theme = e.theme; r.variant = e.variant; return r; });
  const cross = crossCheck(results.filter(r => hasFrame({ platform: r.platform, screen: r.screen })));
  // nhóm so sánh: web today-<theme>.png ↔ iOS appshell/today ↔ Android today
  const web = collect(webDir, 'web'), groups = [];
  for (const theme of ['light', 'dark']) for (const lang of langs) {
    const f = (p, s) => entries.find(e => e.platform === p && e.screen === s && e.theme === theme && e.lang === lang && !e.variant)?.file;
    groups.push({ screen: 'today', theme, lang, web: web.find(w => w.screen === 'today' && w.theme === theme)?.file, iosShell: f('ios', 'appshell'), iosScreen: f('ios', 'today'), android: f('android', 'today') });
  }
  const nSheets = buildReport(outDir, groups, results, cross, web.length ? `Ảnh web: ${web.length} từ ${path.relative(ROOT, webDir)}` : `Không có ảnh web ở ${path.relative(ROOT, webDir)} – tờ chỉ có ảnh native (chạy stitch-render trước để có cột web).`);
  let bad = 0; const say = [];
  for (const r of results) {
    const lm = lmMode === 'fail' ? r.lmFail : [];
    for (const f of r.fail) { bad++; say.push(`✗ ${r.id}: màu ${f.hex} chiếm ${f.area}% không thuộc token (gần nhất ${f.nearest} ${f.nearestHex}, ΔE ${f.de} > ${THRESH.paletteDE})`); }
    for (const c of r.contrastBad) { bad++; say.push(`✗ ${r.id}: chữ ${c.fgToken} ${c.fg} trên ${c.bg} tương phản ${c.ratio}:1 < ${THRESH.contrast}`); }
    for (const m of lm) { bad++; say.push(`✗ ${r.id}: ${m}`); }
    for (const m of lmMode === 'fail' ? [] : r.lmFail) say.push(`! ${r.id}: ${m}`);
    for (const w of r.warn) say.push(`! ${r.id}: màu ${w.hex} ${w.area}% ngoài token (gần ${w.nearest}, ΔE ${w.de})`);
  }
  for (const c of cross) { if (lmMode === 'fail') bad++; say.push(`${lmMode === 'fail' ? '✗' : '!'} ${c.key}: ${c.msg}`); }
  console.log(say.join('\n')); console.log(`${bad ? '✗' : '✓'} native-visual: ${results.length} ảnh (${entries.filter(e => e.platform === 'ios').length} iOS, ${entries.filter(e => e.platform === 'android').length} Android), ${nSheets} tờ so sánh → ${path.relative(ROOT, outDir)}/report.html, ${bad} lỗi`);
  return bad ? 1 : 0;
}

// ---------- tự kiểm với ảnh giả ----------
function makeFixture({ theme, scale = 1, lavender = false, lowContrast = false, badRadius = false, fourTabs = false, tallBar = 83, chip = false, whiteText = false, name }) {
  const pal = Object.fromEntries(L.palette(TOKENS, theme).map(p => [p.name, p.rgb])), s = scale, W = 390 * s, H = 844 * s, img = L.newImage(W, H, pal.background);
  const rect = (x, y, w, h, c) => { for (let yy = Math.round(y * s); yy < Math.round((y + h) * s); yy++) for (let xx = Math.round(x * s); xx < Math.round((x + w) * s); xx++) { const o = (yy * W + xx) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; } };
  const rr = (x, y, w, h, r, c) => { // bo góc, chống răng cưa 4×4
    for (let yy = Math.floor(y * s); yy < Math.ceil((y + h) * s); yy++) for (let xx = Math.floor(x * s); xx < Math.ceil((x + w) * s); xx++) {
      let cov = 0; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const px = (xx + (a + .5) / 4) / s - x, py = (yy + (b + .5) / 4) / s - y; if (px < 0 || py < 0 || px > w || py > h) continue; const cx = Math.min(Math.max(px, r), w - r), cy = Math.min(Math.max(py, r), h - r); if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) cov++; }
      if (!cov) continue; const o = (yy * W + xx) * 4; for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(img.data[o + k] * (1 - cov / 16) + c[k] * cov / 16);
    }
  };
  const card = chip || whiteText ? 'surface-container-highest' : 'surface-container';   // the white fixtures keep white (the ambiguous colour) SMALL: card and bar in the beige container instead
  rr(16, 60, 358, 200, RADII[2], pal[card]);
  for (let i = 0; i < 4; i++) rect(32, 80 + i * 24, 220 - i * 30, 10, pal['on-surface']);
  const pal2 = L.palette(TOKENS, theme), ob = L.palette(TOKENS, theme).filter(t => /^on-/.test(t.name)), bgs = L.palette(TOKENS, theme).filter(t => /^surface|^background/.test(t.name));
  if (lowContrast) { let best = null; for (const f of ob) for (const g of bgs) { const c = L.contrast(f.rgb, g.rgb); if (c < 3.5 && c > 1.5 && !pal2.some(t => !/^on-|^inverse-on/.test(t.name) && L.deltaE2000(t.lab, f.lab) <= THRESH.paletteDE) && (!best || c < best.c)) best = { f, g, c }; } if (!best) throw new Error('fixture: không có cặp on-*/surface tương phản thấp trong theme ' + theme); rr(16, 440, 358, 80, RADII[2], best.g.rgb); for (let i = 0; i < 3; i++) rect(32, 456 + i * 20, 200, 10, best.f.rgb); }
  if (chip) { const w0 = pal['surface-bright']; rr(200, 380, 150, 40, 20, w0); rect(224, 396, 100, 8, pal['on-surface']); rr(16, 520, 300, 8, 4, w0); }   // white chip + progress track on the background: a container (token surface-bright), not "on-error" text
  if (whiteText) { const w0 = pal['surface-bright']; for (let i = 0; i < 3; i++) rr(30, 500.5 + i * 14, 200, 6.2, 3.1, w0); }   // THIN white strokes on the background = invisible text: still caught
  rr(16, 300, 358, 52, badRadius ? 20 : 26, pal.primary); rect(135, 321, 120, 10, pal['on-primary']);     // nút chính dạng pill (cao 52 → bo 26)
  if (lavender) { rr(16, 380, 150, 36, 18, L.hex2rgb('#E8DEF8')); rect(40, 395, 90, 6, pal['on-surface']); }     // lỗi thật ở M0: pill mặc định Material
  const barTop = 844 - tallBar; rect(0, barTop, 390, tallBar, pal[card]); rect(0, barTop, 390, 1, pal['outline-variant']);
  const n = fourTabs ? 4 : FRAME.tabs.length; for (let i = 0; i < n; i++) { const cx = (390 / n) * (i + .5); rr(cx - 12, barTop + 10, 24, 24, 6, pal['on-surface-variant']); rect(cx - 20, barTop + 40, 40, 6, pal['on-surface-variant']); }
  return { name, img };
}
async function selfTest(argv) {
  const dir = path.join(ROOT, 'scripts/test/fixtures/native-visual'), write = argv.includes('--write-fixtures'), errs = [];
  // good/ = iOS appshell + Android today (3×, như CI); bad/ = từng lỗi một
  const spec = [
    ['good/ios/AppShellSnapshotTests/testAppShell.en-light.png', { theme: 'light', scale: 3 }], ['good/ios/AppShellSnapshotTests/testAppShell.en-dark.png', { theme: 'dark', scale: 3 }],
    ['good/android/today-en-light.png', { theme: 'light', scale: 3, tallBar: 100 }], ['good/android/today-en-dark.png', { theme: 'dark', scale: 3, tallBar: 100 }],
    ['bad-lavender/android/today-en-light.png', { theme: 'light', scale: 1, lavender: true }], ['bad-lavender/android/today-en-dark.png', { theme: 'dark', scale: 1, lavender: true }],
    ['bad-contrast/android/today-en-light.png', { theme: 'light', scale: 1, lowContrast: true }],
    ['good-chip/android/today-en-light.png', { theme: 'light', scale: 1, chip: true }], ['bad-whitetext/android/today-en-light.png', { theme: 'light', scale: 1, whiteText: true }],
    ['bad-4tabs/android/today-en-light.png', { theme: 'light', scale: 1, fourTabs: true }],
    ['bad-radius/android/today-en-light.png', { theme: 'light', scale: 1, badRadius: true }],
    ['bad-bar/ios/AppShellSnapshotTests/testAppShell.en-light.png', { theme: 'light', scale: 1, tallBar: 40 }],
  ];
  for (const [rel, o] of spec) {
    const img = makeFixture(o).img, f = path.join(dir, rel);
    if (write) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, L.encodePng(img)); continue; }
    // So PIXEL đã giải mã, không so byte PNG: zlib mỗi bản Node nén khác byte (Node 26 máy ≠ Node 22 CI) dù ảnh y hệt
    let same = false;
    if (fs.existsSync(f)) { try { const d = L.decodePng(fs.readFileSync(f)); same = d.w === img.w && d.h === img.h && Buffer.from(d.data).equals(Buffer.from(img.data)); } catch { same = false; } }
    if (!same) errs.push(`fixture ${rel} thiếu hoặc lỗi thời (node scripts/test/native-visual.mjs --self-test --write-fixtures)`);
  }
  if (write) console.log(`đã ghi ${spec.length} fixture → ${path.relative(ROOT, dir)}`);
  const gate = (sub) => { const es = [...collect(path.join(dir, sub, 'ios'), 'ios'), ...collect(path.join(dir, sub, 'android'), 'android')], rs = es.map(e => { const r = analyze(e, L.decodePng(fs.readFileSync(e.file))); r.platform = e.platform; r.screen = e.screen; r.key = `today-${e.lang}-${e.theme}`; return r; }); return { rs, cross: crossCheck(rs) }; };
  const g = gate('good'); const gl = g.rs.filter(r => r.fail.length || r.contrastBad.length || r.lmFail.length).map(r => r.id + ' ' + JSON.stringify([r.fail, r.contrastBad, r.lmFail])).concat(g.cross.map(c => c.msg));
  if (g.rs.length !== 4) errs.push('good: cần 4 ảnh, có ' + g.rs.length); if (gl.length) errs.push('good phải qua nhưng lỗi: ' + gl.join(' | '));
  if (!g.rs.every(r => r.landmarks.tabBar?.tabs === 5 && r.landmarks.button?.pill)) errs.push('good: mốc không đo đúng ' + JSON.stringify(g.rs.map(r => [r.id, r.landmarks])));
  const expect = (sub, what, test) => { const x = gate(sub); if (!x.rs.length) return errs.push(sub + ': không có ảnh'); if (!x.rs.some(test)) errs.push(`${sub}: phải bắt được ${what}`); };
  expect('bad-lavender', 'pill lavender #E8DEF8', r => r.fail.some(f => L.deltaE2000(L.rgb2lab(L.hex2rgb(f.hex)), L.rgb2lab(L.hex2rgb('#E8DEF8'))) < 3));
  expect('bad-lavender', 'pill lavender ở cả theme tối', r => r.theme === undefined && r.id.includes('dark') && r.fail.length > 0);
  expect('bad-contrast', 'chữ tương phản thấp', r => r.contrastBad.length > 0);
  { const x = gate('good-chip'); if (!x.rs.length) errs.push('good-chip: không có ảnh'); else if (x.rs.some(r => r.fail.length || r.contrastBad.length)) errs.push('good-chip: chip/thanh trắng (surface-bright) là container, không phải chữ: ' + JSON.stringify(x.rs.map(r => [r.fail, r.contrastBad]))); }
  expect('bad-whitetext', 'nét chữ mảnh màu trắng trên nền kem', r => r.contrastBad.length > 0);
  expect('bad-4tabs', 'thanh tab 4 icon', r => r.lmFail.some(m => /4 icon/.test(m)));
  expect('bad-radius', 'bán kính nút ngoài token', r => r.lmFail.some(m => /bo /.test(m)));
  expect('bad-bar', 'thanh tab thấp hơn vùng chạm', r => r.lmFail.some(m => /thanh tab/.test(m)));
  // parse tên
  const pn = parseName('x/testAppShell.ar-dark.png'), pa = parseName('today-de-light-medium.png'), pl = parseName('lesson-question-gap-en-light.png'), pt = parseName('x/testAma.pose-cheer-dark.png');
  if (pn?.screen !== 'appshell' || pn.lang !== 'ar' || pn.theme !== 'dark' || pa?.variant !== 'medium' || pa.lang !== 'de' || pl?.screen !== 'lesson-question-gap' || pl.lang !== 'en' || pt?.screen !== 'ama-pose-cheer') errs.push('parseName sai');
  if (L.deltaE2000(L.rgb2lab([255, 0, 0]), L.rgb2lab([255, 0, 0])) !== 0 || Math.abs(L.deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) > 1e-3) errs.push('ΔE2000 lệch bảng Sharma');
  if (errs.length) { console.log(errs.map(e => '✗ ' + e).join('\n')); console.log(`✗ native-visual self-test ${errs.length} lỗi`); return 1; }
  console.log('✓ native-visual self-test (ảnh đúng token qua; lavender/tương phản/4 tab/bo góc/thanh tab thấp bị chặn)'); return 0;
}

const argv = process.argv.slice(2);
if (isMain(import.meta.url)) process.exit(argv.includes('--self-test') ? await selfTest(argv) : run(argv));
