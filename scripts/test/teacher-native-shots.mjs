// 🧍 Cổng teacher-native (runtime): mở app thật (Playwright, máy chủ tĩnh cho web/) ở 5 màn × 2 theme, 390x844, kiểm mọi ảnh/video giáo viên (teach/…):
//  · trong .tslot: có bệ .tslot-ledge che đáy khung, mép trên bệ đúng 72 % ảnh (không che thân hơn mẫu) · .tslot không đè chữ/nút khác · không bị tổ tiên overflow xén đỉnh, không tràn ngang 0..390 · cao ∈ {72,112,152,208}±1
//  · đặt trần (ngoài .tslot): cảnh báo, đỏ nếu lộ "vệt cắt" ở đáy (>25 % cột đáy khác màu nền ngay dưới) – danh sách chỗ cũ: teacher-native.known.json (tĩnh, kiểm ở teacher-native.mjs)
//  · 0 phần tử giáo viên trên toàn bộ màn = đỏ (cổng không im lặng). Màn không mở được = skip + lý do (không đỏ).
// Dùng: node scripts/test/teacher-native-shots.mjs [web=web] [out=out/teacher-native]   (CI: .github/workflows/teacher-native.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const [WEB = 'web', OUT = 'out/teacher-native'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const ROUTES = [['learn', '?ux1=1#/learn'], ['streak', '?ux1=1#/streak'], ['lesson', '?ux1=1#/lesson/go?demo=1'], ['call', '?ux1=1#/call'], ['goal', '?ux1=1#/goal']];
const THEMES = ['light', 'dark'], SIZES = [72, 112, 152, 208];
let RT_OK = []; try { RT_OK = JSON.parse(fs.readFileSync('scripts/test/teacher-native.known.json', 'utf8')).runtime || []; } catch (e) { /* trống */ }
let KNOWN = {}; try { KNOWN = JSON.parse(fs.readFileSync('scripts/test/teacher-native.known.json', 'utf8')).raw || {}; } catch (e) { /* không có → mọi chỗ trần chỉ cảnh báo */ }
const browser = await chromium.launch();
const rows = [], warns = [], jsErrs = []; let total = 0;

// Chạy trong trang: thu thập số liệu mọi phần tử giáo viên đang hiển thị
function measure(SZ) {
  const W = innerWidth, sel = 'img[src*="teach/"], video[src*="teach/"]';
  const shown = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const b = el.getBoundingClientRect(); return b.width > 2 && b.height > 2; };
  const R = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const lab = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')) + ((e.textContent || '').trim() ? ' "' + e.textContent.trim().slice(0, 14) + '"' : '');
  const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const out = { items: [] };
  const all = [...document.querySelectorAll('*')].filter(e => e.closest('.tslot') == null);
  for (const m of document.querySelectorAll(sel)) {
    if (!shown(m)) continue;
    const slot = m.closest('.tslot'), it = { src: (m.getAttribute('src') || '').split('/').slice(-3).join('/'), errs: [], slot: !!slot };
    if (slot) {
      const sr = R(slot), led = slot.querySelector('.tslot-ledge'), mr = R(m);
      if (!led) it.errs.push('thiếu .tslot-ledge');
      else { const lr = R(led), fg = slot.querySelector('.tslot-fig'), vb = Math.min(mr.b, fg ? R(fg).b : mr.b); // đáy NHÌN THẤY (khung .tslot-fig cắt phần mờ dưới bệ)
        if (!(lr.w > 0 && lr.h > 0) || lr.b < vb - 1.5 || lr.t > vb - 1) it.errs.push(`bệ không che đáy khung (bệ ${Math.round(lr.t)}..${Math.round(lr.b)} · ảnh đáy ${Math.round(vb)})`);
        // bệ không che thân hơn mẫu: mép trên bệ ở hàng 688/960 của ảnh ± 1,5 px (lỗi 06/11: rig tụt → bệ che tới vai)
        const mi = slot.querySelector('img.tslot-img'); if (mi) { const ir = R(mi);
          if (slot.classList.contains('tslot-hip')) { const hy = ir.t + ir.h * TeacherSlot.HIP / 960; if (Math.abs(lr.t - hy) > 1.5) it.errs.push(`bệ lệch hông (mép bệ ${Math.round(lr.t)} ≠ hông ${Math.round(hy)})`); } // hip:true: lộ tới hông, bệ che dải đáy
          else { const wy = ir.t + ir.h * 688 / 960; if (Math.abs(lr.t - wy) > 1.5) it.errs.push(`bệ lệch mẫu (mép bệ ${Math.round(lr.t)} ≠ ${Math.round(wy)} = 72 % ảnh)`); } } }
      const fr = { l: sr.l + sr.w * 0.15, r: sr.r - sr.w * 0.15, t: sr.t + sr.h * 0.07, b: sr.b }; fr.w = fr.r - fr.l; fr.h = fr.b - fr.t; // vùng người + bệ (bỏ khoảng trong suốt trên đầu/hai bên)
      for (const e of all) { // đè chữ / nút khác
        if (e.contains(slot) || slot.contains(e) || e === document.body) continue;
        const leafText = e.children.length === 0 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!leafText && !e.matches('button, a[href], [role=button]')) continue;
        if (!shown(e) || e.closest('[role=status][aria-live]')) continue; const er = R(e); if (inter(fr, er) > 4) { it.errs.push('đè lên ' + lab(e)); if (it.errs.length > 4) break; }
      }
      for (let a = slot.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { // tổ tiên xén đỉnh
        const s = getComputedStyle(a); if (!/(hidden|clip|auto|scroll)/.test(s.overflowY + s.overflowX)) continue;
        const ar = R(a); if (/(hidden|clip|auto|scroll)/.test(s.overflowY) && sr.t < ar.t - 2) it.errs.push(`đỉnh bị ${lab(a)} xén (${Math.round(ar.t - sr.t)}px)`);
        if (/(hidden|clip)/.test(s.overflowX) && (sr.l < ar.l - 2 || sr.r > ar.r + 2) && ar.w < sr.w + 4) it.errs.push(`tràn ngang khỏi ${lab(a)}`);
      }
      if (sr.l < -2 || sr.r > W + 2) it.errs.push(`tràn ngang ${Math.round(sr.l)}..${Math.round(sr.r)}`);
      if (!SZ.some(h => Math.abs(sr.h - h) <= 1)) it.errs.push(`cao ${Math.round(sr.h * 10) / 10} ngoài {72,112,152,208}`);
      it.h = Math.round(sr.h);
    } else it.bare = true;
    out.items.push(it);
  }
  return out;
}
// Đặt trần: so 3 hàng đáy vùng ảnh với hàng ngay dưới (cùng cột) – vệt cắt = nhiều cột khác màu
async function bareCut(page, idx) {
  const info = await page.evaluate(i => { const m = [...document.querySelectorAll('img[src*="teach/"], video[src*="teach/"]')].filter(e => !e.closest('.tslot')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2 && getComputedStyle(e).visibility !== 'hidden'; })[i]; if (!m) return null; m.scrollIntoView({ block: 'center' }); const b = m.getBoundingClientRect(); return { x: Math.max(0, Math.floor(b.left)), y: Math.floor(b.bottom) - 3, w: Math.min(innerWidth, Math.ceil(b.right)) - Math.max(0, Math.floor(b.left)), vh: innerHeight }; }, idx);
  if (!info || info.w < 4 || info.y < 0 || info.y + 4 > info.vh) return null;
  const png = await page.screenshot({ clip: { x: info.x, y: info.y, width: info.w, height: 4 }, type: 'png' });
  return page.evaluate(async ([b64, w]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const sc = im.width / w, d = x.getImageData(0, 0, im.width, im.height).data, W = im.width; let bad = 0, n = 0; for (let col = 0; col < W; col++) { const below = (3 * sc | 0) * W + col; if (3 * sc >= im.height) continue; const bi = ((im.height - 1) * W + col) * 4; for (let r = 0; r < im.height - 1 - Math.floor(sc) + 1 && r < 3 * sc; r++) { const p = (r * W + col) * 4; n++; if (Math.abs(d[p] - d[bi]) + Math.abs(d[p + 1] - d[bi + 1]) + Math.abs(d[p + 2] - d[bi + 2]) > 36) bad++; } } return n ? bad / n : 0; }, [png.toString('base64'), info.w]);
}
async function run(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: theme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(WEB, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); let cur = '';
  page.on('pageerror', e => jsErrs.push(`${cur}-${theme}: ${e.message}`));
  await page.addInitScript(t => { try { localStorage.setItem('lk.ux1', '1'); } catch (e) {} }, theme);
  const url = q => `https://lk.test/app/?sandbox=1&hl=en${q.startsWith('?') ? '&' + q.slice(1) : q}`;
  try { // chọn mục tiêu + theme (như ux-shots.mjs)
    await page.goto(url('#/home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
    await page.evaluate(async t => { App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '6.5'; App.state.settings.theme = t; await App.saveSettings(); }, theme);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  } catch (e) { warns.push(`setup ${theme}: ${e.message.split('\n')[0]}`); }
  for (const [name, q] of ROUTES) {
    cur = name; const row = { name, theme, n: 0, errs: [], note: '' };
    try {
      await page.goto(url(q), { waitUntil: 'load', timeout: 20000 });
      if (name === 'lesson') await page.waitForTimeout(500);
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForTimeout(2500);
      const res = await page.evaluate(measure, SIZES);
      row.n = res.items.length; let bi = 0;
      for (const it of res.items) {
        if (it.slot) for (const e of it.errs) row.errs.push(`${it.src}: ${e}`);
        else { const frac = await bareCut(page, bi++).catch(() => null); const msg = `${it.src}: đặt trần` + (frac == null ? '' : ` (đáy khác nền ${Math.round(frac * 100)}%)`); warns.push(`${name}/${theme} ${msg}`); if (frac != null && frac > 0.25) (RT_OK.includes(name) ? warns : row.errs).push(`${msg} → vệt cắt${RT_OK.includes(name) ? ' (màn chờ chuyển – known.json runtime)' : ''}`); }
      }
      await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(OUT, `${name}-${theme}.jpg`), type: 'jpeg', quality: 70, scale: 'css' }).catch(() => {});
      if (!row.n) row.note = 'không có giáo viên trên màn';
    } catch (e) { row.skip = e.message.split('\n')[0].slice(0, 120); }
    total += row.n; rows.push(row);
  }
  await ctx.close();
}
for (const t of THEMES) await run(t);
await browser.close();
const red = rows.flatMap(r => r.errs.map(e => `${r.name}/${r.theme}: ${e}`));
if (!total) red.push('0 phần tử giáo viên (img/video teach/) trên toàn bộ 5 màn – cổng không được im lặng');
const md = ['# teacher-native (runtime)', '', '| Màn | Theme | GV | Lỗi |', '|---|---|---|---|'];
for (const r of rows) md.push(`| ${r.name} | ${r.theme} | ${r.skip ? 'skip' : r.n} | ${r.skip ? 'skip: ' + r.skip : r.errs.length ? r.errs.join('<br>') : (r.note ? 'ok (' + r.note + ')' : 'ok')} |`);
md.push('', `Tổng phần tử giáo viên: ${total} · đỏ: ${red.length} · cảnh báo đặt trần: ${warns.length}`, '', '## Cảnh báo (đặt trần – danh sách cho phép theo nguồn ở teacher-native.known.json)', ...(warns.length ? [...new Set(warns)].map(w => '- ' + w) : ['- (không)']), `- known.json: ${Object.keys(KNOWN).length} file nguồn`, '', '## Lỗi JS (thông tin)', ...(jsErrs.length ? jsErrs.slice(0, 20).map(e => '- ' + e) : ['- (không)']));
if (red.length) md.push('', '## ĐỎ', ...red.map(e => '- ' + e));
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
if (red.length) { console.error(`✗ teacher-native-shots: ${red.length} lỗi`); process.exit(1); }
console.log('✓ teacher-native-shots OK');
