// 📚 E2E Truyện & podcast (Chromium, 390 px sáng/tối + desktop): thư viện → đọc → chạm từ → Học (thẻ vào dueList) → quiz → tổng kết; axe WCAG AA, không tràn ngang, không lỗi JS.
// Hermetic (web/ trên lk.test). Chạy: node scripts/test/stories-e2e.mjs [web] [thư-mục-ảnh]  (CI: .github/workflows/stories-e2e.yml). Spec: docs/STORIES.md §5.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { serve } from './stitch-screens.mjs';
const ROOT = path.resolve(process.argv[2] || 'web'), OUT = process.argv[3] || 'out/stories-e2e'; fs.mkdirSync(OUT, { recursive: true });
const AXE = createRequire(import.meta.url).resolve('axe-core');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

async function run(tag, ctxOpts, lang) {
  const browser = await chromium.launch(), ctx = await browser.newContext({ ...ctxOpts, serviceWorkers: 'block' }); await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`, mobile = ctxOpts.viewport.width < 600;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForFunction(() => window.App && App.state && App.saveSettings && window.Core, null, { timeout: 30000 });
  await page.evaluate(async () => { localStorage.setItem('lk.onb', '1'); localStorage.setItem('lk.st.lv', JSON.stringify('A2')); App.state.settings.onboarded = true; await App.saveSettings(); });
  const check = async step => {
    if (mobile) { const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(over <= 1, `${tag} ${step}: không tràn ngang (${over}px)`); }
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(async () => (await axe.run(document.querySelector('#stReader, .st-lib'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.filter(x => /serious|critical/.test(x.impact)).map(x => x.id + ':' + x.nodes.length));
    ok(!v.length, `${tag} ${step}: axe WCAG AA 0 lỗi nặng${v.length ? ' – ' + v.join(' | ') : ''}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-${step}.png`), fullPage: mobile });
  };
  // 1) Thư viện: ≥ 5 mục mỗi cấp, đổi cấp
  await page.goto(url('stories'), { waitUntil: 'load' }); await page.waitForSelector('.st-card', { timeout: 30000 });
  ok(await page.$$eval('.st-card', c => c.length) >= 5, `${tag}: thư viện A2 có ≥ 5 mục`);
  for (const lv of ['A1', 'B1', 'B2', 'C1']) { await page.click(`.st-lvb[data-lv="${lv}"]`); await page.waitForSelector(`.st-lvb[data-lv="${lv}"][aria-checked="true"]`); ok(await page.$$eval('.st-card', c => c.length) >= 5, `${tag}: cấp ${lv} có ≥ 5 mục`); }
  await page.click('.st-lvb[data-lv="A2"]'); await check('library');
  // 2) Mở truyện A2 đầu tiên (kiểu book), đọc: từ chạm được, từ mới gạch chân
  await page.click('.st-card >> nth=0'); await page.waitForSelector('#stReader .st-w', { timeout: 15000 });
  ok(await page.$$eval('.st-s', s => s.length) >= 3, `${tag}: trình đọc hiện ≥ 3 câu`);
  const newW = await page.$$eval('.st-w.st-new', b => b.length); ok(newW >= 3, `${tag}: từ mới gạch chân (${newW})`);
  await check('reader');
  // 3) Chạm từ → thẻ tra → Học → thẻ vào sổ + dueList
  const word = await page.$eval('.st-w.st-new', b => b.dataset.w); await page.click('.st-w.st-new >> nth=0');
  await page.waitForSelector('#stSheet [data-learn]', { timeout: 20000 }); ok(await page.$('#stSheet .st-hw'), `${tag}: thẻ tra từ hiện từ (${word})`);
  const box = await page.$eval('#stSheet [data-learn]', b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }); ok(box[1] >= 44, `${tag}: nút Học ≥ 44 px`);
  await check('wordcard'); await page.click('#stSheet [data-learn]');
  await page.waitForFunction(w => Object.keys(App.state.cards).some(k => k.startsWith(w.slice(0, 4))) && !!(App.state.game.story || {}).learn, word, { timeout: 15000 });
  ok(await page.evaluate(() => { const due = Core.Cards.dueList(App.state.cards).map(c => c.word); return Object.values(App.state.cards).some(c => /^Truyện: /.test((c.ctx && c.ctx.title) || (c.contexts && c.contexts[0] && c.contexts[0].title) || '')) || due.length > 0; }), `${tag}: nút Học → thẻ vào sổ ôn (dueList)`);
  // 4) Nghe: chạm ▶ không lỗi, dừng được
  await page.evaluate(() => document.querySelector('#stSheet [data-x]') && document.querySelector('#stSheet [data-x]').click());
  await page.click('#stPlay'); await page.waitForTimeout(500); await page.click('#stPlay');
  // 5) Quiz → tổng kết
  await page.click('#stQuiz'); await page.waitForSelector('.st-opt');
  let n = await page.evaluate(() => document.querySelector('h2').textContent && document.querySelectorAll('.st-q').length);
  for (let i = 0; i < 10 && !(await page.$('.st-res')); i++) { await page.click('.st-opt >> nth=0'); await page.waitForSelector('#stNext'); await page.click('#stNext'); await page.waitForTimeout(150); }
  await page.waitForSelector('.st-res', { timeout: 15000 }); ok(await page.$('.st-new-n'), `${tag}: tổng kết có "+N từ mới"`);
  ok(/^\d\/\d$/.test(await page.textContent('.st-score')), `${tag}: tổng kết có điểm quiz`);
  await check('summary');
  ok(await page.evaluate(() => Object.keys((App.state.game.story || {}).done || {}).length >= 1), `${tag}: chương ghi vào game.story.done`);
  // 6) Podcast: có lượt thoại Ama/Carlos
  await page.goto(url('stories'), { waitUntil: 'load' }); await page.waitForSelector('.st-card');
  const pod = await page.evaluate(() => { const a = [...document.querySelectorAll('.st-card')].find(c => /Podcast/.test(c.textContent)); return a && a.getAttribute('href'); });
  if (pod) { await page.goto(`https://lk.test/app/?sandbox=1&hl=${lang}${pod}`, { waitUntil: 'load' }); await page.waitForSelector('.st-pod', { timeout: 15000 }); ok(await page.$$eval('.st-pod img', i => i.length) >= 2, `${tag}: podcast có avatar người nói`); await check('podcast'); }
  ok(!errs.length, `${tag}: không lỗi JS ${errs.slice(0, 3).join(' | ')}`);
  await browser.close();
}
const M390 = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await run('m390-light-vi', { ...M390, colorScheme: 'light' }, 'vi');
await run('m390-dark-en', { ...M390, colorScheme: 'dark' }, 'en');
await run('desktop-light-ar', { viewport: { width: 1280, height: 860 }, colorScheme: 'light' }, 'ar');
console.log(fails ? `✗ stories-e2e: ${fails} lỗi` : '✓ stories-e2e: thư viện → đọc → chạm từ → Học → quiz → tổng kết, podcast, a11y, 390 px sáng/tối');
process.exit(fails ? 1 : 0);
