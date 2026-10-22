// Ảnh trước/sau của phản hồi đáp án (bài "Cách dùng từ" engaged ___) – chạy trong CI explain-shots.yml (Playwright, sandbox).
//   node scripts/test/explain-shots.mjs <base-url> <thư mục ra> <nhãn: before|after>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [BASE, OUT, TAG] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important}#toast,body>canvas{display:none!important}';
const browser = await chromium.launch();
let shots = 0;
for (const l of ['vi', 'en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: l, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${l}] pageerror ${String(e.message).slice(0, 120)}`));
  await page.goto(`${BASE}/app/?sandbox=1&hl=${l}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1500); }
  // câu mẫu của chủ: "Most students are engaged ___ part-time work. (with/in/for/of)" → đặt lên đầu bài luyện chuyên mục
  await page.evaluate(() => { location.hash = '#/usage'; });
  await page.waitForFunction(() => window.LK_USAGE, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { const U = LK_USAGE, orig = U.quiz; U.quiz = (es, n, s) => { const r = orig(es, n, s), e = U.byId('p', 'engaged'), q = e && U.quizItems(e).find(z => z.ans === 'in'); if (q) r[0] = { ...q, choices: ['with', 'in', 'for', 'of'] }; return r; }; location.hash = '#/usage?c=p'; });
  await page.waitForSelector('.us-q', { timeout: 20000 }).catch(() => {});
  if (!(await page.$('.us-q'))) console.log(`[${l}] trang: ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200)}`);
  await page.addStyleTag({ content: STILL });
  // câu "engaged ___" nếu có, chọn phương án sai "with"/"for"… (không phải "in")
  const ok = await page.evaluate(() => {
    const qs = [...document.querySelectorAll('.us-q')], li = qs.find(q => /engaged/.test(q.querySelector('p').textContent)) || qs[0]; if (!li) return false;
    const ins = [...li.querySelectorAll('input')], pick = ins.find(i => i.value === 'with') || ins[0];
    li.id = 'shotQ'; pick.click(); return true;
  });
  if (!ok) { console.log(`[${l}] không thấy câu luyện`); await ctx.close(); continue; }
  await page.waitForTimeout(2500);
  const q = await page.$('#shotQ'); await q.scrollIntoViewIfNeeded();
  await q.screenshot({ path: `${OUT}/${TAG}-${l}.png` }); shots++;
  const sum = await page.$('#shotQ details.xc-more summary');
  if (sum) { if (!(await page.$('#shotQ details[open]'))) await sum.click(); await page.waitForTimeout(400); await q.screenshot({ path: `${OUT}/${TAG}-${l}-detail.png` }); shots++; }
  console.log(`[${l}] ${TAG}: ${(await q.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  await ctx.close();
}
await browser.close();
console.log(`ảnh: ${shots}`); if (!shots) process.exit(1);
