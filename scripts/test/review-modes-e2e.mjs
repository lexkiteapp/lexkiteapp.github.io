// 🔁 E2E [P2-1.2] ôn tập đa chế độ trên trình duyệt thật (Chromium): Lật → Gõ phản xạ → Nghe chọn nghĩa trong CÙNG một phiên, chỉ dùng bàn phím.
// Kiểm: đổi chế độ giữa phiên không mất tiến độ, nút Thoát, Gõ chấp nhận HOA/thường, Nghe có 4 phương án khác nhau + trạng thái âm thanh không treo,
// axe WCAG 2.1 AA (gồm tương phản) trên màn ôn ở sáng/tối, không tràn ngang ở 390 px, không lỗi JS. Hermetic (web/ trên lk.test, 0 lượt chạm prod).
// Chạy: node scripts/test/review-modes-e2e.mjs [web] [thư-mục-ảnh]   (CI: .github/workflows/review-taps.yml; cần playwright + chromium)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { serve } from './stitch-screens.mjs';
import { waitFn } from '../lib/pw-wait.mjs';
const ROOT = path.resolve(process.argv[2] || 'web'), OUT = process.argv[3] || 'out/review-modes'; fs.mkdirSync(OUT, { recursive: true });
const AXE = createRequire(import.meta.url).resolve('axe-core');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

const seed = async () => {
  localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; await App.saveSettings();
  const now = Date.now(), map = {};
  const mk = (word, vi, srs) => { const c = Core.Cards.make({ word, vi, pos: 'noun', ex: `This ${word} is here.` }); c.srs = { ef: 2.5, interval: 6, reps: 4, lapses: 0, due: now - 1000, last: now - 6 * 864e5, step: 0, S: 6, D: 4, ...srs }; map[word] = c; };
  mk('habit', 'thói quen', { due: now - 3000 }); mk('decline', 'sự suy giảm', { due: now - 2000 }); mk('borrow', 'sự vay mượn', { due: now - 1000 });
  for (const [w, v] of [['river', 'dòng sông'], ['window', 'cửa sổ'], ['garden', 'khu vườn'], ['kitchen', 'nhà bếp']]) mk(w, v, { due: now + 9e9 });
  await Core.Cards.save(map); App.state.cards = await Core.Cards.all();
};
const doneOf = page => page.evaluate(() => { const m = /✅\s*(\d+)/.exec((document.querySelector('.study-top') || {}).textContent || ''); return m ? +m[1] : -1; });
const word = page => page.evaluate(() => (document.querySelector('.back .wc-word') || {}).textContent || '');

async function run(tag, ctxOpts, lang) {
  const browser = await chromium.launch(), ctx = await browser.newContext({ ...ctxOpts, serviceWorkers: 'block' }); await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await waitFn(page, () => window.App && App.state && App.saveSettings && window.Core, null, { timeout: 30000 });
  await page.evaluate(seed); await page.reload({ waitUntil: 'load' });
  await page.goto(url('review'), { waitUntil: 'load' }); await page.waitForSelector('#rmSel', { timeout: 30000 });
  const mobile = ctxOpts.viewport.width < 600;
  const check = async step => {
    if (mobile) { const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(over <= 1, `${tag} ${step}: không tràn ngang (${over}px)`); }
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(async () => (await axe.run(document.querySelector('.study-wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.filter(x => /serious|critical/.test(x.impact)).map(x => `${x.id}: ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`));
    ok(!v.length, `${tag} ${step}: axe WCAG AA 0 lỗi nặng${v.length ? ' – ' + v.join(' | ') : ''}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-${step}.png`), fullPage: mobile });
  };
  ok(await page.$('.study-top a.icon-btn[aria-label]'), `${tag}: có nút Thoát (aria-label)`);
  const sel = await page.$('#rmSel'); ok(sel && await sel.getAttribute('aria-label'), `${tag}: bộ chọn chế độ có nhãn`);

  // 1) Lật: Space lật → phím 3 = Nhớ (Good)
  await page.selectOption('#rmSel', 'flip'); await page.waitForTimeout(400);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await check('flip');
  await page.keyboard.press('Space'); await page.waitForSelector('#flash.flipped', { timeout: 3000 }).catch(() => {});
  ok(await page.$('#flash.flipped'), `${tag} Lật: Space lật thẻ`);
  await page.keyboard.press('3'); await waitFn(page, () => /✅\s*1\b/.test(document.querySelector('.study-top').textContent), null, { timeout: 5000 }).catch(() => {});
  ok(await doneOf(page) === 1, `${tag} Lật: phím 3 chấm xong (đã ôn 1)`);

  // 2) Đổi sang Gõ giữa phiên: tiến độ giữ nguyên; gõ HOA vẫn đúng; Enter trên nút được gợi ý = chấm
  await page.selectOption('#rmSel', 'type'); await page.waitForSelector('#typeIn', { timeout: 5000 }).catch(() => {});
  ok(await doneOf(page) === 1, `${tag}: đổi chế độ giữa phiên không mất tiến độ`);
  ok(await waitFn(page, () => document.activeElement && document.activeElement.id === 'typeIn', null, { timeout: 2000 }).then(() => true, () => false), `${tag} Gõ: ô gõ tự nhận focus`);
  await check('type');
  const w1 = await word(page); await page.keyboard.type(`  ${w1.toUpperCase()} `); await page.keyboard.press('Enter');
  await page.waitForSelector('#flash.flipped', { timeout: 3000 }).catch(() => {});
  const sg = await page.evaluate(() => { const b = document.querySelector('[data-grade].suggest'); return b && b === document.activeElement ? +b.dataset.grade : -1; });
  ok(sg >= 2, `${tag} Gõ: "${w1.toUpperCase()}" (HOA, thừa khoảng trắng) = đúng → gợi ý Nhớ/Dễ và focus vào nút (mức ${sg})`);
  ok(/✅/.test(await page.textContent('#typeRes')), `${tag} Gõ: báo Chính xác`);
  await page.keyboard.press('Enter'); await waitFn(page, () => /✅\s*2\b/.test(document.querySelector('.study-top').textContent), null, { timeout: 5000 }).catch(() => {});
  ok(await doneOf(page) === 2, `${tag} Gõ: Enter chấm xong (đã ôn 2)`);

  // 3) Nghe chọn nghĩa: 4 phương án khác nhau, có đáp án; âm thanh không treo ở "đang tải"; phím số chọn, ✓ không chỉ màu
  await page.selectOption('#rmSel', 'audio'); await page.waitForSelector('[data-opt]', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const opts = await page.$$eval('[data-opt]', b => b.map(x => (x.querySelector('span') || x).textContent.trim())); // bỏ số phím <kbd>
  const right = await page.evaluate(() => (document.querySelector('.back .wi-vi') || {}).textContent || '');
  ok(opts.length === 4 && new Set(opts).size === 4, `${tag} Nghe: 4 phương án không trùng (${opts.join(' / ')})`);
  ok(opts.filter(o => o === right).length === 1, `${tag} Nghe: đúng 1 phương án là nghĩa của từ`);
  await waitFn(page, () => !document.querySelector('#rmPlay[aria-busy]'), null, { timeout: 10000 }).catch(() => {});
  ok(!(await page.$('#rmPlay[aria-busy]')), `${tag} Nghe: trạng thái âm thanh kết thúc (phát được hoặc báo lỗi), không treo`);
  await check('audio');
  await page.keyboard.press(String(opts.indexOf(right) + 1)); await page.waitForSelector('#flash.flipped', { timeout: 3000 }).catch(() => {});
  ok(/✓/.test(await page.textContent('[data-opt].ok').catch(() => '')), `${tag} Nghe: đáp án đúng có dấu ✓`);
  await page.keyboard.press('3'); await page.waitForTimeout(800);
  ok(!(await page.$('#flash')) || await doneOf(page) === 3, `${tag} Nghe: phím 3 chấm xong (hết 3 thẻ đến hạn)`);
  ok(!errs.length, `${tag}: không lỗi JS ${errs.slice(0, 3).join(' | ')}`);
  await browser.close();
}
const M390 = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await run('m390-light-vi', { ...M390, colorScheme: 'light' }, 'vi');
await run('m390-dark-en', { ...M390, colorScheme: 'dark' }, 'en');
await run('desktop-light-ar', { viewport: { width: 1280, height: 860 }, colorScheme: 'light' }, 'ar');
console.log(fails ? `✗ review-modes-e2e: ${fails} lỗi` : '✓ review-modes-e2e: Lật → Gõ → Nghe cùng phiên, bàn phím, a11y, 390 px sáng/tối');
process.exit(fails ? 1 : 0);
