// Ảnh thật sổ mẫu câu #/phrases (390 px, sáng/tối, vi/en) – Playwright trên CI (.github/workflows/phrasebook-shots.yml).
// Đỏ khi: lỗi JS, mục không nạp được, tràn ngang, hoặc không có ảnh. Dùng: node scripts/test/phrasebook-shots.mjs <base> [out=out/phrasebook]
import fs from 'node:fs';
import { chromium } from 'playwright';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), OUT = process.argv[3] || 'out/phrasebook';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(), errs = []; let shots = 0;
const CASES = [...['light', 'dark'].flatMap(c => ['vi', 'en'].map(l => [c, l, 390])), ['light', 'de', 360]];
for (const [colorScheme, lang, width] of CASES) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, colorScheme }), page = await ctx.newPage(), tag = `${colorScheme}-${lang}-${width}`;
  page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  const url = r => `${BASE}/app/?sandbox=1&hl=${lang}#/${r}`;
  await page.goto(url('welcome/setup'), { waitUntil: 'networkidle' }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); }
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(400); }
  await page.goto(url('phrases'), { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForSelector('#pbook > summary', { timeout: 15000 }); await page.waitForTimeout(7000); // chờ hiệu ứng và toast sau onboarding tan
  const snap = async n => { await page.screenshot({ path: `${OUT}/${tag}-${n}.png` }); shots++; const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) errs.push(`${tag}-${n}: tràn ngang +${w}px`); };
  await page.locator('#pbook > summary').scrollIntoViewIfNeeded(); await snap('1-closed');
  await page.click('#pbook > summary');
  await page.waitForSelector('#pbHost details summary', { timeout: 15000 }).catch(() => errs.push(`${tag}: danh sách không nạp`));
  await page.locator('#pbook > summary').evaluate(e => e.scrollIntoView()); await page.waitForTimeout(300); await snap('2-list');
  const first = page.locator('#pbHost details summary').first();
  if (await first.count()) { await first.click(); await page.waitForTimeout(400); await first.evaluate(e => e.scrollIntoView()); await page.waitForTimeout(200); await snap('3-open'); }
  await ctx.close();
}
await browser.close();
console.log(`ảnh ${shots} · lỗi ${errs.length}`); errs.slice(0, 10).forEach(e => console.log('✗', e));
process.exit(!shots || errs.length ? 1 : 0);
