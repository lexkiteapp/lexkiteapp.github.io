// Ảnh + cổng thẻ kết quả (docs/specs/learn-card.md): 390 px, sáng/tối, vi/ar, đúng + sai. Chạy trong CI lcard-shots.yml.
//   node scripts/test/lcard-shots.mjs <base-url> <thư mục ra> <before|after>
// after: đỏ khi chữ < 4,5:1, nút < 44 px, tràn ngang, hoặc lỗi JS. Câu thử = "Hi! Can I have a large coffee, please?" (truyện s-cafe).
import { chromium } from 'playwright';
import fs from 'node:fs';
const [BASE, OUT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important}#toast,body>canvas{display:none!important}';
const browser = await chromium.launch(); const errs = [];
const seed = () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); localStorage.setItem('lk.lesson', '1'); };
for (const [lang, scheme, res] of [['vi', 'dark', 'ok'], ['vi', 'light', 'ok'], ['vi', 'dark', 'bad'], ['vi', 'light', 'bad'], ['ar', 'light', 'ok']]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: lang, colorScheme: scheme, reducedMotion: 'reduce' });
  await ctx.addInitScript(seed);
  const page = await ctx.newPage(), name = `${TAG}-${lang}-${scheme}-${res}`;
  page.on('pageerror', e => errs.push(`${name}: ${String(e.message).slice(0, 160)}`));
  await page.goto(`${BASE}/app/?sandbox=1&hl=${lang}#/lesson/go?demo=1&story=s-cafe`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6 && !(await page.$('#lsnBank')); i++) { const go = await page.$('#lsnGo'); if (go) await go.click().catch(() => {}); await page.waitForTimeout(500); }
  await page.addStyleTag({ content: STILL });
  const placed = await page.evaluate(wrong => {
    const it = App.lessonState && App.lessonState().sess.cur; if (!it) return 0;
    const L = LessonEngine.toks(it.sent); if (wrong) [L[0], L[1]] = [L[1], L[0]];
    for (const w of L) { const b = [...document.querySelectorAll('#lsnBank .lsn-tile:not(.used)')].find(x => x.textContent.trim() === w); if (b) b.click(); }
    const c = document.querySelector('#lsnCheck'); if (c) c.click(); return L.length;
  }, res === 'bad');
  if (!placed) { errs.push(`${name}: không tới được bài xếp câu`); await ctx.close(); continue; }
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  if (TAG === 'after') {
    const bad = await page.evaluate(() => {
      const out = [], card = document.querySelector('#lkc'); if (!card) return ['không có thẻ #lkc'];
      const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return m.length > 3 && m[3] === 0 ? null : m; };
      const lum = c => { const f = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c) return c; } return [255, 255, 255]; };
      for (const el of card.querySelectorAll('*')) { if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const a = rgb(getComputedStyle(el).color), b = bgOf(el), L1 = lum(a), L2 = lum(b), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (cr < 4.5) out.push(`tương phản ${cr.toFixed(2)}: ${el.textContent.slice(0, 30)}`); }
      for (const b of document.querySelectorAll('.lkc-b, .lkc-alt, #lsnNext')) { const r = b.getBoundingClientRect(); if (r.height && r.height < 44) out.push(`nút ${r.height} px: ${b.textContent.slice(0, 24)}`); }
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push('tràn ngang ' + document.documentElement.scrollWidth);
      if (!document.querySelector('#lsnNext')) out.push('mất nút Tiếp tục');
      return out;
    });
    bad.forEach(x => errs.push(`${name}: ${x}`));
    const sw = await page.$('#lkcSwap'); if (sw) { await sw.click(); await page.waitForTimeout(200); await page.screenshot({ path: `${OUT}/${name}-open.png`, fullPage: true }); }
  }
  await ctx.close();
}
await browser.close();
if (errs.length) { console.error('✗ lcard-shots:\n  ' + errs.join('\n  ')); if (TAG === 'after') process.exit(1); }
console.log(`✓ lcard-shots ${TAG}`);
