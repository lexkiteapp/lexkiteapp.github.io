// 🧭 Chuyển trang & Quay lại trên trình duyệt thật (Chromium · WebKit/Safari · Firefox; máy tính + điện thoại) – bản live, ?sandbox=1.
// Bắt lỗi "vẽ lệch / chồng mảng / trắng" sau khi đổi trang hoặc bấm Back: sau mỗi bước, khung nội dung phải
//  (1) có nội dung, (2) đứng yên (2 ảnh chụp cách 400 ms giống hệt), (3) không còn hiệu ứng View Transition treo,
//  (4) điểm lấy mẫu trong vùng nội dung trúng phần tử thuộc #view (không phải nền trống / mảnh trang cũ).
// Dùng: node scripts/test/nav-render.mjs [base]   (CI: nav-render.yml)
import { chromium, webkit, firefox } from 'playwright';
const BASE = process.argv[2] || 'https://lexkite.com/app/';
const ROUTES = ['home', 'vocab', 'skills', 'tests', 'me', 'grammar', 'library', 'stats', 'settings', 'models'];
const VIEWS = { desktop: { viewport: { width: 1366, height: 860 } }, mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
const fails = []; let checks = 0;
const ok = (c, msg) => { checks++; if (!c) fails.push(msg); };
async function settle(page, where) {
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => {
    const v = document.getElementById('view'); if (!v) return { noView: 1 };
    const r = v.getBoundingClientRect(), vh = innerHeight;
    const pts = []; for (let y = Math.max(r.top + 20, 80); y < Math.min(r.bottom, vh) - 10; y += Math.max(60, (vh - 100) / 6)) pts.push([Math.round(r.left + r.width / 2), Math.round(y)]);
    const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && (v.contains(e) || e.closest('.bottom-nav,.topbar,.lkr-fab,.modal'))); });
    const vt = document.getAnimations ? document.getAnimations().filter(a => String(a.effect && a.effect.pseudoElement || '').includes('view-transition')).length : 0;
    return { kids: v.children.length, text: (v.innerText || '').trim().length, hits: hits.filter(Boolean).length, pts: pts.length, vt };
  });
  ok(!st.noView && st.kids > 0 && st.text > 20, `${where}: khung nội dung trống`);
  ok(!st.vt, `${where}: còn hiệu ứng View Transition treo`);
  ok(st.pts === 0 || st.hits >= st.pts - 1, `${where}: ${st.pts - st.hits}/${st.pts} điểm trong vùng nội dung không trúng phần tử trang`);
  // Dừng hiệu ứng chủ ý (khung chờ lấp lánh, Kit chớp mắt, pháo giấy canvas mừng xong cài đặt…) để chỉ còn bắt được vẽ lỗi thật
  await page.evaluate(() => { if (!document.getElementById('navStill')) { const st = document.createElement('style'); st.id = 'navStill'; st.textContent = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}#toast,.lkr-toast,body>canvas[style*="z-index:9999"]{visibility:hidden!important}'; document.head.appendChild(st); } document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} }); });
  const a = await page.screenshot({ type: 'png' }); await page.waitForTimeout(400); const b = await page.screenshot({ type: 'png' });
  ok(a.equals(b), `${where}: màn hình còn nhảy/chưa ổn định sau 1,1 s`);
}
for (const [bn, bt] of Object.entries({ chromium, webkit, firefox })) {
  let browser; try { browser = await bt.launch(); } catch (e) { fails.push(`${bn}: không khởi động được (${e.message.split('\n')[0]})`); continue; }
  for (const [vn, vp] of Object.entries(VIEWS)) {
    if (bn === 'firefox' && vn === 'mobile') continue; // Firefox không hỗ trợ isMobile
    const ctx = await browser.newContext({ ...vp, locale: 'vi' }); const page = await ctx.newPage();
    const tag = `${bn}/${vn}`;
    page.on('pageerror', e => fails.push(`${tag}: lỗi JS ${String(e.message).slice(0, 140)}`));
    await page.goto(BASE + '?sandbox=1&hl=vi#/welcome/setup', { waitUntil: 'networkidle' }).catch(() => {});
    const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(2000); }
    for (const r of ROUTES) {
      await page.evaluate(h => { location.hash = h; }, '#/' + r); await page.waitForTimeout(500);
      await page.evaluate(() => scrollBy(0, 2500)); await page.waitForTimeout(300); // cuộn xuống giữa/cuối trang rồi mới đi tiếp (đúng tình huống lỗi)
      await settle(page, `${tag} #/${r}`);
    }
    for (let i = 0; i < 5; i++) { await page.goBack().catch(() => {}); await settle(page, `${tag} Back ${i + 1}`); }
    for (let i = 0; i < 2; i++) { await page.goForward().catch(() => {}); await settle(page, `${tag} Forward ${i + 1}`); }
    await ctx.close();
  }
  await browser.close();
}
for (const f of fails) console.log('✗ ' + f);
console.log(fails.length ? `✗ nav-render: ${fails.length}/${checks} lỗi (${BASE})` : `✓ nav-render: ${checks} kiểm tra – chuyển trang/Back/Forward ổn định trên Chromium, WebKit, Firefox (${BASE})`);
process.exit(fails.length ? 1 : 0);
