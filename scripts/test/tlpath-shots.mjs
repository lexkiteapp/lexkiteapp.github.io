// 🗺️ Ảnh trước/sau hub "Lộ trình ngày" mọi ngôn ngữ đích (web/cpack/es-app/day-ui.js) – Playwright Chromium trên CI (.github/workflows/tlpath-shots.yml).
// TRƯỚC = web/ của commit gốc (input before, lưới ô cũ); SAU = web/ của commit hiện tại – cả hai qua python http.server, ?sandbox=1 (không tài khoản).
// Route lấy TỪ bảng Target (mọi tl có `home` = #/practice/<tl>d) → thêm ngôn ngữ mới tự được chụp. Mỗi route: 390 + 768 × sáng/tối, trạng thái giả lập
// (9 ngày xong → có Xong / Hôm nay / Chưa tới, tuần 2 mở) + 1 ảnh RTL (ar, 390 tối) + 1 ảnh tuần sau mở.
// Dùng: node scripts/test/tlpath-shots.mjs <base-sau> <base-trước> [out=out/tlpath]   → <out>/{before,after}-<tl>-<rộng>-<sáng|tối>[-ar|-wk].png + report.json
// Đỏ khi: lỗi JS, cuộn ngang ở 390, hub mới thiếu hero/thẻ Hôm nay/tuần, còn lưới ô cũ, hoặc không chụp được ảnh nào.
import fs from 'node:fs';
import { chromium } from 'playwright';
const AFTER = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), BEFORE = (process.argv[3] || '').replace(/\/$/, ''), OUT = process.argv[4] || 'out/tlpath';
fs.mkdirSync(OUT, { recursive: true });
const TLS = [...fs.readFileSync('web/js/target.js', 'utf8').matchAll(/^ {4}([a-z]{2}): \{ em: [^\n]*?home: '#\/practice\/([a-z]{2})d'/gm)].map(m => m[1]);
if (!TLS.length) { console.error('✗ không đọc được ngôn ngữ nào có home trong web/js/target.js'); process.exit(1); }
const SIZES = { 390: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }, 768: { width: 768, height: 1024, deviceScaleFactor: 1 } };
const browser = await chromium.launch();
const report = { shots: [], errors: [], overflow: [], missing: [], legacyGrid: [] };
async function shot(tag, base, tl, w, scheme, lang, extra) {
  const vp = SIZES[w], ctx = await browser.newContext({ bypassCSP: true, viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, colorScheme: scheme, locale: lang });
  const day = Object.fromEntries(Array.from({ length: 9 }, (_, n) => [n, 'wgpc']));
  await ctx.addInitScript(([tl, day]) => { try { localStorage.setItem('lk.' + tl, '1'); localStorage.setItem('lk.' + tl + '.day', JSON.stringify(day)); localStorage.setItem('lk.theme', 'auto'); localStorage.setItem('lk.onboarded', '1'); } catch (e) { /* riêng tư */ } }, [tl, day]);
  const page = await ctx.newPage();
  if (tag === 'after') page.on('pageerror', e => report.errors.push(`${tl}-${w}-${scheme}: ${e.message}`));
  await page.goto(`${base}/app/?sandbox=1&hl=${lang}#/practice/${tl}d`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector(tag === 'after' ? '.tp-today' : 'a.chip[href*="d?d="]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (tag === 'after' && extra === 'wk') { await page.evaluate(() => { const d = document.querySelectorAll('details.tp-w')[2]; if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); } }); await page.waitForTimeout(300); }
  const name = `${tag}-${tl}-${w}-${scheme === 'dark' ? 'toi' : 'sang'}${lang === 'en' ? '' : '-' + lang}${extra ? '-' + extra : ''}.png`;
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: true }); report.shots.push(name);
  if (tag === 'after') {
    const st = await page.evaluate(() => ({ ring: !!document.querySelector('.tp-ring'), today: !!document.querySelector('.tp-today a.tp-go'), weeks: document.querySelectorAll('details.tp-w').length, openWeeks: document.querySelectorAll('details.tp-w[open]').length, grid: document.querySelectorAll('a.chip[href*="d?d="]').length, over: document.documentElement.scrollWidth - window.innerWidth }));
    if (!st.ring || !st.today || st.weeks < 2 || !st.openWeeks) report.missing.push(`${name}: ${JSON.stringify(st)}`);
    if (st.grid) report.legacyGrid.push(`${name}: ${st.grid} ô cũ`);
    if (w === 390 && st.over > 2) report.overflow.push(`${name}: +${st.over}px`);
  }
  await ctx.close();
}
for (const tl of TLS) {
  for (const w of [390, 768]) for (const scheme of ['light', 'dark']) {
    if (BEFORE) await shot('before', BEFORE, tl, w, scheme, 'en');
    await shot('after', AFTER, tl, w, scheme, 'en');
  }
  await shot('after', AFTER, tl, 390, 'dark', 'en', 'wk');
  await shot('after', AFTER, tl, 390, 'dark', 'ar');
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`tl ${TLS.join(',')} · ảnh ${report.shots.length} · lỗi JS ${report.errors.length} · thiếu ${report.missing.length} · lưới cũ ${report.legacyGrid.length} · tràn ngang ${report.overflow.length}`);
for (const k of ['errors', 'missing', 'legacyGrid', 'overflow']) report[k].slice(0, 6).forEach(e => console.log('✗', k, e));
process.exit(!report.shots.length || report.errors.length || report.missing.length || report.legacyGrid.length || report.overflow.length ? 1 : 0);
