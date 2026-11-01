// Chụp ảnh giao diện lexkite.com để soát bố cục: điện thoại & máy tính, sáng & tối, các trang chính (chạy trên GitHub Actions)
// Dùng: node scripts/test/screens.mjs <thư-mục-ra>   (cần: npx playwright install chromium)
import { chromium } from 'playwright';
const OUT = process.argv[2] || 'screens';
const BASE = 'https://lexkite.com/app/?sandbox=1&hl=';
const ROUTES = ['home', 'vocab', 'skills', 'skill/listening', 'tests', 'me', 'grammar', 'library', 'settings', 'review'];
const VIEWS = { mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }, desktop: { width: 1366, height: 860 } };
const browser = await chromium.launch();
for (const [vn, vp] of Object.entries(VIEWS)) for (const scheme of ['light', 'dark']) for (const lang of ['vi', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(BASE + lang + '#/welcome/setup', { waitUntil: 'networkidle' });
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {}); for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); } const go = await page.$('#go'); if (go) { await go.click(); await page.waitForTimeout(2500); } // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  for (const r of ROUTES) {
    await page.goto(BASE + lang + '#/' + r, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${vn}-${scheme}-${lang}-${r.replace(/\//g, '_')}.jpg`, type: 'jpeg', quality: 60 });
  }
  await ctx.close();
}
await browser.close();
console.log('✓ đã chụp', ROUTES.length * 8, 'ảnh');
