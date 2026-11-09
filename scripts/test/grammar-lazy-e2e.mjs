// Trình duyệt thật: bài A1/C2 nạp lười (web/cpack/grammar) – danh sách có bài, mở thẳng #/grammar/<id> khi nguội thì có nội dung, không lỗi JS, không tải gói khi chỉ mở danh sách.
// Dùng: node scripts/test/grammar-lazy-e2e.mjs <base>   (.github/workflows/grammar-lazy-e2e.yml)
import { chromium } from 'playwright';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), errs = [], browser = await chromium.launch();
const open = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }), page = await ctx.newPage(), reqs = []; page.on('pageerror', e => errs.push(e.message)); page.on('request', r => reqs.push(r.url())); return { ctx, page, reqs }; };
const url = r => `${BASE}/app/?sandbox=1&hl=vi#/${r}`, lazy = (reqs, f) => reqs.some(u => u.includes('cpack/grammar/' + f));
const list = await open();
await list.page.goto(url('grammar'), { waitUntil: 'networkidle' }); await list.page.waitForTimeout(12000); // đủ lâu để App.prefetchAll (tải sẵn lúc rảnh) chạy
if (lazy(list.reqs, 'starter2') || lazy(list.reqs, 'mastery')) errs.push('màn danh sách đã tải gói bài');
if (!lazy(list.reqs, 'lazy-a1') || !lazy(list.reqs, 'lazy-c2')) errs.push('màn danh sách thiếu chỉ mục');
await list.ctx.close();
for (const [id, f, needle] of [['inversion-range-c2', 'mastery', 'So severe'], ['present-simple-a1', 'starter2', '']]) {
  const c = await open();
  await c.page.goto(url(`grammar/${id}?view=full`), { waitUntil: 'networkidle' }); await c.page.waitForTimeout(2500);
  const text = await c.page.locator('#view, main, body').first().innerText();
  if (!lazy(c.reqs, f)) errs.push(`${id}: không tải gói ${f}`);
  if (text.length < 400 || (needle && !text.includes(needle))) errs.push(`${id}: nội dung không hiện (${text.length} ký tự)`);
  await c.ctx.close();
}
await browser.close();
console.log(errs.length ? '✗ grammar-lazy-e2e' : '✓ grammar-lazy-e2e'); errs.slice(0, 10).forEach(e => console.log(' -', e));
process.exit(errs.length ? 1 : 0);
