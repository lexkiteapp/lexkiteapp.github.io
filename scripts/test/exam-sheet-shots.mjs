// Ảnh bảng "Bạn đang luyện kỳ thi nào?" (App.examPicker) 390 & 768 × sáng/tối × en/de/ar(RTL), kèm số đo: tràn ngang, vùng chạm < 44, số mục đang chọn.
// Chạy trên CI (exam-sheet-shots.yml, so main vs nhánh): node scripts/test/exam-sheet-shots.mjs <base> <outDir>
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), OUT = process.argv[3] || 'out'; fs.mkdirSync(OUT, { recursive: true });
const VPS = { 390: { width: 390, height: 844, isMobile: true, hasTouch: true }, 768: { width: 768, height: 1024 } }, report = [];
const browser = await chromium.launch();
for (const lang of ['en', 'de', 'ar']) for (const [vn, vp] of Object.entries(VPS)) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: scheme, locale: lang, reducedMotion: 'reduce' });
  await ctx.route(/lexkite\.com|googletagmanager|google-analytics|pagead|cloudflareinsights/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.es', '1'); } catch (e) { /* riêng tư */ } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/app/?sandbox=1&hl=${lang}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(200); }
    const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); }
    await page.evaluate(() => { location.hash = '#/home'; }); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await page.evaluate(() => window.App.examPicker()); await page.waitForSelector('#modal:not([hidden]) #modalBox button', { timeout: 8000 }); await page.waitForTimeout(900);
    const f = `${OUT}/${lang}-${vn}-${scheme}.png`; await page.screenshot({ path: f });
    const m = await page.evaluate(() => { const b = document.getElementById('modalBox'), r = b.getBoundingClientRect();
      const small = [...b.querySelectorAll('button,a[href]')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 2 && Math.min(q.width, q.height) < 43.5; }).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
      return { overflowX: b.scrollWidth - b.clientWidth, boxW: Math.round(r.width), checked: b.querySelectorAll('[aria-checked=true],.on').length, small, dir: document.documentElement.dir };
    });
    report.push({ f, ...m });
  } catch (e) { report.push({ lang, vn, scheme, error: String(e.message).slice(0, 120) }); }
  await ctx.close();
}
await browser.close(); fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1));
