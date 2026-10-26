// 🎬 E2E video bài học (CI, Playwright + Chrome có H.264) – KHÔNG dùng trình duyệt/tài khoản thật: ?sandbox=1&vtest=1.
//   node scripts/test/video-web-e2e.mjs <base-url> <out-dir>
// 3 chỗ đặt (thẻ từ, trang ngữ pháp, ngày học) × vi / ar (RTL) / ja × điện thoại / máy tính: thẻ hiện → phát → tua gần hết →
// câu đố EN (✓/✗) → phản hồi → "Video tiếp theo" phát clip KHÁC. Ảnh: <out>/<lang>-<vp>-<chỗ>-{card,quiz,next}.png
import fs from 'node:fs';
import { chromium } from 'playwright';
const [BASE = 'http://localhost:8080', OUT = 'out/video-web'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const VPS = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, desktop: { viewport: { width: 1280, height: 860 } } };
const PLACES = {
  word: async page => { // thẻ từ: khối "Hiểu sâu" dùng chung (WordCard.notes) – từ có trong thẻ clip mẫu
    await page.evaluate(async () => { await App.need('wordcard'); App.view.innerHTML = '<div class="card" style="padding:1rem"><h2 lang="en">appointment</h2>' + WordCard.notes(null, 'appointment') + '</div>'; });
  },
  grammar: async page => { await page.evaluate(() => { location.hash = '#/grammar/phrasal-verbs-grammar?view=full'; }); },
  day: async page => { await page.evaluate(() => { location.hash = '#/day/1'; }); },
};
const fails = [], log = m => console.log(m);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
for (const lang of ['vi', 'ar', 'ja']) for (const [vp, opt] of Object.entries(VPS)) {
  const ctx = await browser.newContext({ ...opt, locale: lang, reducedMotion: 'reduce' });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}/app/?sandbox=1&vtest=1&hl=${lang}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {}); for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); } const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1500); } // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  for (const [place, open] of Object.entries(PLACES)) {
    const tag = `${lang}-${vp}-${place}`, bad = m => { fails.push(`${tag}: ${m}`); log(`✗ ${tag}: ${m}`); };
    try {
      await page.evaluate(() => { location.hash = '#/home'; }); await page.waitForTimeout(400);
      await open(page);
      const card = page.locator('.lv-slot:not([hidden]) .lv-card').first();
      await card.waitFor({ timeout: 15000 });
      await card.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/${tag}-card.png` });
      if (lang === 'ar' && await page.evaluate(() => document.documentElement.dir) !== 'rtl') bad('trang ar không RTL');
      await card.click();
      const v = page.locator('.lv-slot video').first(); await v.waitFor({ timeout: 10000 });
      const first = await v.evaluate(el => el.querySelector('source').src);
      await page.waitForFunction(() => { const x = document.querySelector('.lv-slot video'); return x && x.readyState >= 2 && !x.paused; }, null, { timeout: 20000 }).catch(() => bad('video không phát'));
      const cap = await v.evaluate(el => [...el.textTracks].map(t => `${t.language}:${t.mode}`).join(','));
      if (cap !== 'en:showing') bad('phụ đề phải chỉ EN và đang hiện: ' + cap);
      await v.evaluate(el => { el.currentTime = Math.max(0, el.duration - 0.4); el.play(); });
      const opt0 = page.locator('.lv-q .lv-o').first(); await opt0.waitFor({ timeout: 15000 });
      const q = await page.locator('.lv-q p[lang="en"]').innerText();
      if (!/[a-z]/i.test(q)) bad('câu đố không phải tiếng Anh');
      await page.locator('.lv-q .lv-o').last().click();
      await page.locator('.lv-q .ok').first().waitFor({ timeout: 5000 });
      await page.waitForFunction(() => (document.querySelector('.lv-fb') || {}).textContent, null, { timeout: 3000 }).catch(() => bad('không có phản hồi câu đố'));
      const marks = await page.locator('.lv-q .lv-mk').allInnerTexts(); if (!marks.includes('✓')) bad('thiếu dấu ✓');
      await page.locator('.lv-q').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/${tag}-quiz.png` });
      await page.locator('[data-lv-next]').click();
      await page.waitForFunction(f => { const s = document.querySelector('.lv-slot video source'); return s && s.src !== f; }, first, { timeout: 10000 }).catch(() => bad('"Video tiếp theo" không đổi clip'));
      await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/${tag}-next.png` });
      await page.evaluate(() => { const x = document.querySelector('.lv-slot video'); if (x) x.pause(); });
      log(`✓ ${tag}: thẻ → phát (${cap}) → câu đố "${q.slice(0, 50)}" → phản hồi → clip tiếp theo`);
    } catch (e) { bad(String(e.message).split('\n')[0].slice(0, 160)); await page.screenshot({ path: `${OUT}/${tag}-error.png` }).catch(() => {}); }
  }
  if (errs.length) { fails.push(`${lang}-${vp}: lỗi JS ${errs.slice(0, 3).join(' | ')}`); log(`✗ lỗi JS: ${errs.slice(0, 3).join(' | ')}`); }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.txt`, fails.length ? fails.join('\n') + '\n' : 'ALL PASS\n');
console.log(fails.length ? `✗ video-web-e2e: ${fails.length} lỗi` : '✓ video-web-e2e: 18 lượt (3 chỗ × 3 ngôn ngữ × 2 khung) đạt');
process.exit(fails.length ? 1 : 0);
