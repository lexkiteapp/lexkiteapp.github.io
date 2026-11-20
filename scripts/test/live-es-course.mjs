// Kiểm LIVE khóa Español (post-deploy-check.yml): 15 ngôn ngữ giao diện × lộ trình ngày/phát âm/thi thử (esd/esp/esx):
// không lỗi JS, không chữ Việt ở giao diện không-vi, không "undefined"/"[object", không ảnh vỡ, có nội dung. Ảnh ở out/live-es-course.
// Chạy: node scripts/test/live-es-course.mjs [origin] [out]
import fs from 'node:fs'; import { chromium } from 'playwright';
const ORIGIN = process.argv[2] || 'https://lexkite.com', OUT = process.argv[3] || 'out/live-es-course'; fs.mkdirSync(OUT, { recursive: true });
const VI = /[ăđơưảẳẩẻểỉỏổởủửỷạặậẹệịọộợụựỵẵẫẽễĩõỗỡũữỹắằấầếềốồớờứừ]/i, BAD = /\bundefined\b|\[object|\bNaN\b|\{\{|%s\b/;
const LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'], ROUTES = ['practice/esd', 'practice/esp', 'practice/esx'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const browser = await chromium.launch();
for (const lang of LANGS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: lang }), page = await ctx.newPage(), errs = [], img = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('response', r => { if (r.status() >= 400 && /\.(png|jpe?g|webp|avif|mp3|ogg|wav)(\?|$)/.test(r.url())) img.push(r.status() + ' ' + r.url()); });
  await page.goto(`${ORIGIN}/app/?sandbox=1&hl=${lang}#/home`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.App && App.state && App.saveSettings, null, { timeout: 45000 });
  await page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); localStorage.setItem('lk.es', '1'); localStorage.setItem('lk.tl', 'es'); App.state.settings.onboarded = true; await App.saveSettings(); });
  for (const r of ROUTES) {
    await page.goto(`${ORIGIN}/app/?sandbox=1&hl=${lang}#/${r}`, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3500);
    const t = await page.evaluate(() => document.body.innerText), tag = `${lang} ${r}`;
    ok(t.length > 300, `${tag}: có nội dung (${t.length} ký tự)`);
    ok(lang === 'vi' || !VI.test(t), `${tag}: không chữ Việt${VI.test(t) && lang !== 'vi' ? ' [' + t.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i'))[0].replace(/\n/g, ' ') + ']' : ''}`);
    ok(!BAD.test(t), `${tag}: không undefined/[object${BAD.test(t) ? ' [' + t.match(new RegExp('.{0,25}' + BAD.source + '.{0,25}'))[0].replace(/\n/g, ' ') + ']' : ''}`);
    if (lang === 'en' || lang === 'vi') await page.screenshot({ path: `${OUT}/${lang}-${r.split('/')[1]}.png` });
  }
  ok(errs.length === 0, `${lang}: không lỗi JS (${errs.slice(0, 2).join(' | ')})`); ok(img.length === 0, `${lang}: không ảnh/âm thanh 4xx (${img.slice(0, 2).join(' | ')})`);
  await ctx.close();
}
await browser.close(); process.exit(fails ? 1 : 0);
