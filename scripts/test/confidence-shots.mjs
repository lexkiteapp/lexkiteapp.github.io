// 🗣️ Ảnh trước/sau cho Giao tiếp tự tin (docs/CONFIDENCE.md §8) – Playwright Chromium trên CI (.github/workflows/confidence-shots.yml).
// TRƯỚC = web/ của commit gốc (input before); SAU = web/ của commit hiện tại – cả hai qua python http.server, ?sandbox=1 (không tài khoản).
// Dùng: node scripts/test/confidence-shots.mjs <base-sau> <base-trước> [out=out/confidence]   → <out>/{before,after}-<máy>-<ngôn ngữ>-<trang>.png + report.json
// Đỏ khi: lỗi JS trên trang mới, tràn ngang (cuộn ngang) ở điện thoại, hoặc không chụp được ảnh nào.
import fs from 'node:fs';
import { chromium } from 'playwright';
const AFTER = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), BEFORE = (process.argv[3] || 'https://lexkite.com').replace(/\/$/, ''), OUT = process.argv[4] || 'out/confidence';
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = { mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }, desktop: { width: 1366, height: 860 } };
const BEFORE_R = ['home', 'skill/speaking'];
const AFTER_R = ['home', 'skill/speaking', 'confidence', 'confidence/cafe#can-i-get', 'confidence/cafe@run', 'confidence/toolkit', 'confidence/daily'];
const browser = await chromium.launch();
const report = { shots: [], errors: [], overflow: [] };
async function pass(tag, base, routes, vn, lang) {
  const vp = VIEWS[vn];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, colorScheme: 'light' });
  const page = await ctx.newPage();
  if (tag === 'after') page.on('pageerror', e => report.errors.push(`${vn}-${lang}: ${e.message}`));
  const url = r => `${base}/app/?sandbox=1&hl=${lang}#/${r}`;
  await page.goto(url('welcome/setup'), { waitUntil: 'networkidle' }).catch(() => {});
  const g = await page.$('#go'); if (g) { await g.click(); await page.waitForTimeout(2500); }
  for (const r0 of routes) {
    const [r, act] = r0.split('@');
    await page.goto(url(r), { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(1500);
    if (act === 'run') { const b = await page.$('#cfGo'); if (b) { await b.click(); await page.waitForTimeout(600); const n = await page.$('#cfNext'); if (n) { await n.click(); await page.waitForTimeout(600); } } }
    const name = `${tag}-${vn}-${lang}-${r0.replace(/[/#@]/g, '_')}.png`;
    await page.screenshot({ path: `${OUT}/${name}` }); report.shots.push(name);
    if (tag === 'after' && vn === 'mobile') { const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) report.overflow.push(`${name}: +${w}px`); }
  }
  await ctx.close();
}
for (const vn of ['mobile', 'desktop']) {
  await pass('before', BEFORE, BEFORE_R, vn, 'en');
  await pass('after', AFTER, AFTER_R, vn, 'en');
}
await pass('after', AFTER, ['confidence', 'confidence/cafe#can-i-get'], 'mobile', 'ar'); // RTL
await pass('after', AFTER, ['confidence', 'confidence/cafe@run'], 'mobile', 'vi');
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`ảnh ${report.shots.length} · lỗi JS ${report.errors.length} · tràn ngang ${report.overflow.length}`);
report.errors.slice(0, 5).forEach(e => console.log('✗', e)); report.overflow.forEach(e => console.log('✗ tràn', e));
process.exit(!report.shots.length || report.errors.length || report.overflow.length ? 1 : 0);
