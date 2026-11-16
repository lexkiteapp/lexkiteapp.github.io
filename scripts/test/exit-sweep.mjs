// 🚪 exit-sweep – mọi màn học phải có lối thoát hoạt động (docs/specs/exit-button.md, web/js/exit-guard.js). Chỉ chạy trên CI (qa-bot.yml).
// 1) Mọi route của app (App.routes + gói lười ROUTE_BUNDLE) phải được phân loại: màn học (ALWAYS/WITH_ARG/ExitGuard.learn) hoặc trang trung tâm (NOT_LEARN).
// 2) Mỗi màn học (390 px × sáng/tối, cờ lk.exitbar): có nút thoát [data-exit] nhìn thấy, aria-label, hộp THẬT ≥ 44×44 (getBoundingClientRect), tương phản ≥ 3:1.
//    768 / 1440 px (chuột): hộp thật ≥ 44×44; nút được nới (ExitGuard grow) phải KHÔNG đổi pixel nào (so ảnh có/không nới).
// 3) Thoát thật: bấm nút / Esc / back hệ thống (vuốt iOS = history.back) → rời màn về trang trước, không kẹt (#view có nội dung).
//    Đang làm dở → hộp hỏi "Tiếp tục học" (ở lại, màn còn nguyên) / "Thoát" (rời màn).
// Dùng: node scripts/test/exit-sweep.mjs [--root dist | --base URL] [--out out/exit-sweep] [--themes light,dark]
import { chromium, devices } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../quality/serve.mjs';
import { HUBS, FIXED } from './lib/learn-samples.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('root', 'dist'), OUT = path.resolve(arg('out', 'out/exit-sweep')), THEMES = arg('themes', 'light,dark').split(',');
fs.mkdirSync(OUT + '/shots', { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let srv = null, O = arg('base', '');
if (!O) { srv = await serve(ROOT, 0); O = srv.origin; }
O = O.replace(/\/$/, '');
const appUrl = hash => `${O}/app/?sandbox=1&hl=en#${hash}`;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const fails = [], rows = [];
const fail = (where, msg) => { fails.push(`${where}: ${msg}`); console.log('✗', where, msg); };


const ctxOf = async (theme, flag = true) => {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, colorScheme: theme, locale: 'en-US', serviceWorkers: 'block' });
  await noProd(ctx); // CI: media/audio → GitHub, /api → offline (0 lượt prod)
  await ctx.addInitScript(th => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th.th })); localStorage.setItem('lk.exitbar', th.flag ? '1' : '0'); } catch { /* */ } }, { th: theme, flag });
  return ctx;
};
const ready = page => page.waitForFunction(() => window.App && window.ExitGuard && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 30000 }).then(() => sleep(900));
const boot = async (page, hash) => { await page.goto(appUrl(hash), { waitUntil: 'load', timeout: 45000 }); await ready(page); };
const go = async (page, hash) => { await page.evaluate(x => { location.hash = x; }, hash); await sleep(1300); };
// Màn học: chờ ExitGuard nhận (lk-learn) + nút thoát vẽ xong (gói lười + mạng live chậm hơn 1,3 s → trước đây đỏ giả trên lexkite.com, run 42094308245)
const goLearn = async (page, hash) => { await go(page, hash); await page.waitForFunction(() => document.body.classList.contains('lk-learn') && document.querySelector('#view [data-exit]'), null, { timeout: 15000 }).catch(() => {}); await sleep(300); };
const state = page => page.evaluate(() => ({ hash: location.hash, learn: document.body.classList.contains('lk-learn'), modal: !!document.querySelector('#modal:not([hidden])'), filled: !!document.querySelector('#view > :not(.skel-page):not(.skel-study)') }));
const left = (s, hash) => !s.learn && s.hash !== hash && s.filled;
const diag = page => page.evaluate(() => JSON.stringify(window.ExitGuard && ExitGuard._s ? ExitGuard._s() : {})).catch(() => '');
// Hộp hỏi đang mở → bấm "Thoát" (hộp chung [data-exit-go] hoặc nút thoát của hộp riêng màn)
const confirmLeave = async page => page.evaluate(() => { const b = document.querySelector('#modal:not([hidden]) [data-exit-go]') || [...document.querySelectorAll('#modal:not([hidden]) a.btn, #modal:not([hidden]) button.btn')].find(x => !x.classList.contains('primary')); if (b) b.click(); return !!b; });

// ---------- 1) phân loại route ----------
const page0 = await (await ctxOf('light')).newPage();
await boot(page0, '/home');
const appSrc = fs.existsSync(path.join(ROOT, 'js/app.js')) ? fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8') : '';
const bundleKeys = ((/const ROUTE_BUNDLE = \{([^}]*)\}/.exec(appSrc) || [])[1] || '').match(/['"]?([a-z][a-z0-9-]*)['"]?\s*:/g)?.map(s => s.replace(/['":\s]/g, '')) || [];
const cls = await page0.evaluate(extra => { const E = window.ExitGuard, all = [...new Set([...Object.keys(App.routes), ...extra])]; return { all, ALWAYS: E.ALWAYS, WITH_ARG: E.WITH_ARG, NOT_LEARN: E.NOT_LEARN }; }, bundleKeys);
for (const r of cls.all) if (!cls.ALWAYS.includes(r) && !cls.WITH_ARG.includes(r) && !cls.NOT_LEARN.includes(r)) fail('route ' + r, 'chưa phân loại trong web/js/exit-guard.js (ALWAYS / WITH_ARG / NOT_LEARN)');

// ---------- 2) tìm bài mẫu cho từng màn học ----------
const samples = cls.ALWAYS.map(r => [r, '/' + r]);
for (const r of cls.WITH_ARG) {
  if (FIXED[r]) { samples.push([r, FIXED[r]]); continue; }
  let h = null;
  for (const hub of [r, ...(HUBS[r] || [])]) {
    await go(page0, '/' + hub);
    h = await page0.evaluate(rr => { const a = [...document.querySelectorAll(`#view a[href^="#/${rr}/"]`)].find(x => !/\/mix\b/.test(x.getAttribute('href'))); return a ? a.getAttribute('href').slice(1) : null; }, r);
    if (h) break;
  }
  if (h) samples.push([r, h]); else fail('route ' + r, 'không tìm được bài mẫu (link #/' + r + '/…) từ trang trung tâm – thêm vào FIXED/HUBS trong exit-sweep.mjs');
}
await page0.context().close();

// ---------- 3) kiểm từng màn ----------
// Giải mã PNG (8 bit, không xen kẽ – ảnh chụp Chromium) → so từng điểm ảnh: số điểm khác + chênh lệch kênh lớn nhất
const png = buf => {
  let i = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (i < buf.length) { const len = buf.readUInt32BE(i), type = buf.toString('ascii', i + 4, i + 8), d = buf.subarray(i + 8, i + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); i += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const v = raw[y * (st + 1) + 1 + x], a = x >= bpp ? out[y * st + x - bpp] : 0, b = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0; const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); out[y * st + x] = (v + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255; } }
  return { w, h, bpp, px: out };
};
const pxDiff = (A, B) => { const a = png(A), b = png(B); if (a.w !== b.w || a.h !== b.h) return { n: -1, max: 255 }; let n = 0, max = 0; for (let k = 0; k < a.px.length; k += a.bpp) { let d = 0; for (let c = 0; c < Math.min(3, a.bpp); c++) d = Math.max(d, Math.abs(a.px[k + c] - b.px[k + c])); if (d) { n++; max = Math.max(max, d); } } return { n, max }; };
const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return 1; const [r, g, b] = m.slice(0, 3).map(v => { v = +v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ctxBefore = await ctxOf(THEMES[0], false);
for (const theme of THEMES) {
  const ctx = await ctxOf(theme);
  for (const [r, hash] of samples) {
    const where = `${r} ${theme} (${hash})`, page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    try {
      await boot(page, '/home'); await goLearn(page, hash);
      const btn = await page.evaluate(() => {
        const v = document.querySelector('#view'), x = v && v.querySelector('[data-exit]');
        if (!document.body.classList.contains('lk-learn')) return { err: 'ExitGuard không nhận là màn học' };
        if (!x) return { err: 'không có nút thoát [data-exit]' };
        const rc = x.getBoundingClientRect(), cs = getComputedStyle(x); // hộp THẬT – ::after (lk-hit44) không tính: qa-bot và chạm WebKit không theo nó
        const ic = x.querySelector('svg') ? getComputedStyle(x.querySelector('svg')).color : cs.color;
        let bg = 'rgb(255,255,255)', e = x; while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(.*,\s*0\)|transparent/.test(b)) { bg = b; break; } e = e.parentElement; }
        return { label: x.getAttribute('aria-label') || x.textContent.trim(), w: rc.width, h: rc.height, top: rc.top, ic, bg, vis: rc.width > 0 && rc.height > 0 && cs.visibility !== 'hidden' };
      });
      if (btn.err) { fail(where, btn.err); await page.screenshot({ path: `${OUT}/shots/${r}-${theme}.png`, scale: 'css' }); continue; }
      const L1 = lum(btn.ic), L2 = lum(btn.bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (!btn.vis) fail(where, 'nút thoát bị ẩn');
      if (!btn.label) fail(where, 'nút thoát thiếu aria-label');
      if (btn.w < 44 || btn.h < 44) fail(where, `vùng chạm ${Math.round(btn.w)}×${Math.round(btn.h)} < 44×44`);
      if (btn.top > 200) fail(where, `nút thoát không ở top-bar (top=${Math.round(btn.top)})`);
      if (ratio < 3) fail(where, `tương phản nút ${ratio.toFixed(2)} < 3:1`);
      if (theme === THEMES[0]) { // ảnh trước/sau cho trang Duyệt hình: sau = cờ lk.exitbar, trước = như bản đang chạy
        await page.screenshot({ path: `${OUT}/shots/${r}-after.png`, scale: 'css' });
        const pb = await ctxBefore.newPage(); pb.on('dialog', d => d.accept());
        try { await boot(pb, '/home'); await go(pb, hash); await pb.screenshot({ path: `${OUT}/shots/${r}-before.png`, scale: 'css' }); } catch { /* chỉ là ảnh */ } finally { await pb.close(); }
      }
      // a) bấm nút (chưa làm gì → thoát ngay)
      await page.click('#view [data-exit]', { timeout: 5000 }); await sleep(1300);
      let s = await state(page); if (s.modal) { await confirmLeave(page); await sleep(1300); s = await state(page); }
      if (!left(s, '#' + hash)) fail(where, 'bấm nút thoát không rời màn / kẹt (' + s.hash + ')');
      // b) Esc
      await go(page, hash); await page.keyboard.press('Escape'); await sleep(1300);
      s = await state(page); if (s.modal) { await confirmLeave(page); await sleep(1300); s = await state(page); }
      if (!left(s, '#' + hash)) fail(where, 'Esc không rời màn (' + s.hash + ') ' + JSON.stringify(s) + ' ' + await diag(page));
      // c) back hệ thống khi đang làm dở → hỏi; "Tiếp tục học" ở lại; "Thoát" rời màn
      await go(page, '/home'); await go(page, hash); await page.evaluate(() => ExitGuard.dirty(true));
      await page.goBack(); await sleep(1300); s = await state(page);
      if (!s.modal || !s.learn) fail(where, 'back hệ thống khi làm dở không hỏi xác nhận (' + s.hash + ')');
      else {
        const stay = await page.evaluate(() => { const b = document.querySelector('#modal:not([hidden]) [data-exit-stay], #modal:not([hidden]) .btn.primary'); if (b) b.click(); return !!b; });
        await sleep(600); s = await state(page);
        if (!stay || s.modal || !s.learn || s.hash !== '#' + hash) fail(where, '"Tiếp tục học" không giữ màn (' + s.hash + ')');
        await page.goBack(); await sleep(1300); await confirmLeave(page); await sleep(1300); s = await state(page);
        if (!left(s, '#' + hash)) fail(where, '"Thoát" sau back không rời màn (' + s.hash + ') ' + JSON.stringify(s) + ' ' + await diag(page));
      }
      rows.push(`| ${r} | ${theme} | \`${hash}\` | ${Math.round(btn.w)}×${Math.round(btn.h)} | ${ratio.toFixed(1)} |`);
    } catch (e) { fail(where, 'lỗi: ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
    finally { await page.close(); }
  }
  await ctx.close();
}
// ---------- 4) 768 / 1440 (chuột, pointer: fine – nút .icon-btn 36 px): hộp thật ≥ 44×44 + nới không đổi pixel nào ----------
const notes = [];
for (const W of [768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, colorScheme: THEMES[0], locale: 'en-US', serviceWorkers: 'block' });
  await noProd(ctx); // CI: media/audio → GitHub, /api → offline (0 lượt prod)
  await ctx.addInitScript(th => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th })); localStorage.setItem('lk.exitbar', '1'); } catch { /* */ } }, THEMES[0]);
  for (const [r, hash] of samples) {
    const where = `${r} @${W} (${hash})`, page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    try {
      await boot(page, '/home'); await goLearn(page, hash); await page.mouse.move(W - 2, 898);
      const b = await page.evaluate(() => { const x = document.querySelector('#view [data-exit]'); if (!x) return null; const rc = x.getBoundingClientRect(); return { w: rc.width, h: rc.height, x: rc.left, y: rc.top, grown: x.dataset.lkGrow != null, sel: x.tagName.toLowerCase() + '.' + [...x.classList].join('.') }; });
      if (!b) { fail(where, 'không có nút thoát [data-exit]'); continue; }
      if (b.w < 44 || b.h < 44) fail(where, `vùng chạm thật ${Math.round(b.w)}×${Math.round(b.h)} < 44×44 (${b.sel})`);
      let px = '–';
      if (b.grown) {
        // So hai lần vẽ MỚI (như người dùng thấy): A = trang có nới, B = trang riêng tắt nới (ExitGuard._noGrow) – cùng route, cùng cỡ.
        // (Bật/tắt nới trên cùng trang để lại vết vẽ lại cục bộ ở góc bo của thanh dính .mk-bar – không phải hình người dùng thấy.)
        // Bố cục: hộp nhìn thấy trùng tuyệt đối; tổ tiên so x/y/rộng (chiều cao phụ thuộc nội dung ngẫu nhiên của bài – quick/practice).
        const clip = { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.w + 16, height: b.h + 16 };
        const shotOf = pg => pg.screenshot({ clip, animations: 'disabled', caret: 'hide' });
        const geo = pg => pg.evaluate(() => { const out = []; let e = document.querySelector('#view [data-exit]'); const f = e.querySelector(':scope > .lk-face'); out.push('hiện ' + (q => [q.x, q.y, q.width, q.height].join(','))((f || e).getBoundingClientRect())); for (let k = 0; e && k < 7; k++, e = e.parentElement) { const q = e.getBoundingClientRect(); out.push(e.tagName.toLowerCase() + '.' + [...e.classList].filter(c => !/^lk-(grow|hit44)$/.test(c)).join('.') + ' ' + (k ? [q.x, q.y, q.width].join(',') : '')); } return out; });
        const A = await shotOf(page), gA = await geo(page); await sleep(400); const A2 = await shotOf(page);
        const pb = await ctx.newPage(); pb.on('dialog', d => d.accept());
        try {
          await boot(pb, '/home'); await pb.evaluate(() => ExitGuard._noGrow(true)); await go(pb, hash); await pb.mouse.move(W - 2, 898);
          const B = await shotOf(pb), gB = await geo(pb), same = gA.every((g, k) => g === gB[k]);
          if (!A.equals(A2)) { px = 'nền động'; notes.push(`${where}: vùng nút có chuyển động – bỏ qua so ảnh`); }
          else if (!same) { px = 'lệch'; fail(where, 'nới làm lệch bố cục: ' + gA.map((g, k) => g === gB[k] ? '' : g + ' ≠ ' + gB[k]).filter(Boolean).join(' | ')); }
          else { const d = pxDiff(A, B); if (d.n) { px = `${d.n} điểm (max ${d.max})`; fail(where, `nới vùng chạm làm đổi ${d.n} điểm ảnh, chênh tối đa ${d.max}/255 (${b.sel})`); fs.writeFileSync(`${OUT}/shots/${r}-${W}-grow.png`, A); fs.writeFileSync(`${OUT}/shots/${r}-${W}-nogrow.png`, B); } else px = '0'; }
        } finally { await pb.close(); }
      }
      rows.push(`| ${r} | ${W} px | \`${hash}\` | ${Math.round(b.w)}×${Math.round(b.h)} | diff ${px} |`);
    } catch (e) { fail(where, 'lỗi: ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
    finally { await page.close(); }
  }
  await ctx.close();
}
for (const n of notes) console.log('·', n);
await ctxBefore.close(); await browser.close(); if (srv) srv.close();
const md = `# exit-sweep\n\n${samples.length} màn học × ${THEMES.join('/')} · ${fails.length} lỗi\n\n| route | theme | hash | chạm | tương phản |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n${fails.length ? '## Lỗi\n' + fails.map(f => '- ' + f).join('\n') : '✓ mọi màn học có lối thoát hoạt động'}\n`;
fs.writeFileSync(OUT + '/report.md', md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(fails.length ? `✗ exit-sweep: ${fails.length} lỗi` : '✓ exit-sweep xanh');
process.exit(fails.length ? 1 : 0);
