// 🎨 Kiểm độ tương phản chữ/nền (WCAG AA, axe-core color-contrast) trên Chromium thật – bản live, ?sandbox=1.
// Sáng & tối × điện thoại, vi + en, các màn hình chính + hộp thoại (báo cáo sự cố) + trạng thái đã chọn (radio/tab/nút bật).
// Bắt lỗi kiểu "chọn xong chữ trắng trên nền sáng". Dùng: node scripts/test/contrast.mjs [base]  (CI: contrast.yml)
import { chromium } from 'playwright';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
let BASE = process.argv[2];
if (!BASE) BASE = (await fetch('https://lexkite.com/app/').then(r => r.ok).catch(() => false)) ? 'https://lexkite.com/app/' : 'https://lexkite.com/';
const ROUTES = ['home', 'vocab', 'library', 'review', 'practice', 'skills', 'tests', 'grammar', 'phrases', 'models', 'me', 'stats', 'settings', 'contact',
  'verb/take', 'fix', 'courses', 'roleplay', 'reflex', 'paraphrase', 'toeic', 'letters', 'goal', 'placement', 'usage', 'usage/interested', 'usage/stop', 'usage?c=adv', 'usage/affect-effect',
  'practice/learn?src=topic:ngsl1', 'practice/mcq?src=topic:ngsl1'];
const found = new Map();
const add = (scheme, lang, where, n) => {
  const k = n.target.join(' ') + '|' + where.split('#')[0];
  const d = n.any[0]?.data || {};
  const f = found.get(k) || { where, sel: n.target.join(' '), html: n.html.slice(0, 120), fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, need: d.expectedContrastRatio, modes: new Set() };
  f.modes.add(scheme + '/' + lang); found.set(k, f);
};
const scan = async (page, scheme, lang, where) => {
  await page.addScriptTag({ content: AXE }).catch(() => {});
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['color-contrast'] })).catch(() => null);
  for (const v of res?.violations || []) for (const n of v.nodes) add(scheme, lang, where, n);
};
// Bấm thử các ô chọn an toàn (radio/checkbox trong form, tab, nút aria-pressed) để soi trạng thái "đã chọn"
const toggles = page => page.evaluate(() => {
  let n = 0;
  for (const el of document.querySelectorAll('main input[type=radio]:not(:checked), [role=dialog] input[type=radio]:not(:checked), dialog input[type=radio]:not(:checked), main [role=tab][aria-selected=false], main [aria-pressed=false]')) {
    if (n > 12) break; if (el.closest('a[href]') || el.disabled) continue;
    try { el.click(); n++; } catch {}
  }
  return n;
});
const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) for (const lang of ['vi', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, colorScheme: scheme, locale: lang });
  const page = await ctx.newPage();
  const url = r => `${BASE}?sandbox=1&hl=${lang}#/${r}`;
  await page.goto(url('welcome/setup'), { waitUntil: 'networkidle' }).catch(() => {});
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(2000); }
  for (const r of ROUTES) {
    await page.goto(url(r), { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(900);
    await scan(page, scheme, lang, '#/' + r);
    if (await toggles(page)) { await page.waitForTimeout(300); await scan(page, scheme, lang, '#/' + r + ' (đã chọn)'); }
  }
  // Kiểm tra đầu vào: câu hỏi (chưa chọn – không phương án nào được tô) → trả lời hết → trang kết quả (band, vòng kỹ năng, CTA)
  await page.goto(url('placement'), { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(600);
  if (await page.$('#go')) {
    await page.click('#go').catch(() => {}); await page.waitForTimeout(500); await scan(page, scheme, lang, '#/placement (câu hỏi)');
    for (let k = 0; k < 20 && await page.$('.pl-wrap .opt-idk'); k++) { await page.click(k % 2 ? '.pl-wrap .option' : '.pl-wrap .opt-idk').catch(() => {}); await page.waitForTimeout(450); }
    await page.waitForTimeout(800); await scan(page, scheme, lang, '#/placement (kết quả)');
  }
  // Học thông minh: bảng phản hồi đúng/sai sau khi chọn
  await page.goto(url('practice/mcq?src=topic:ngsl1'), { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(700);
  if (await page.$('.options .option')) { await page.click('.options .option').catch(() => {}); await page.waitForTimeout(500); await scan(page, scheme, lang, '#/practice/mcq (phản hồi)'); }
  // Hộp thoại báo cáo sự cố: mặc định + chọn từng loại
  await page.goto(url('home'), { waitUntil: 'networkidle' }).catch(() => {});
  if (await page.evaluate(() => { if (!window.LexReport) return false; window.LexReport.open({}); return true; }).catch(() => false)) {
    await page.waitForTimeout(800); await scan(page, scheme, lang, 'báo cáo sự cố');
    for (const r of await page.$$('dialog input[name=cat]')) { await r.evaluate(e => e.click()); await page.waitForTimeout(80); await scan(page, scheme, lang, 'báo cáo sự cố (chọn loại)'); }
  }
  await ctx.close();
}
await browser.close();
const list = [...found.values()];
for (const f of list) console.log(`✗ ${f.where} [${[...f.modes].join(', ')}] ${f.fg} trên ${f.bg} = ${f.ratio}:1 (cần ${f.need})\n   ${f.sel}\n   ${f.html}`);
fs.writeFileSync('contrast-report.json', JSON.stringify(list.map(f => ({ ...f, modes: [...f.modes] })), null, 1));
console.log(list.length ? `✗ tương phản: ${list.length} chỗ chưa đạt AA (${BASE})` : `✓ tương phản: đạt AA trên ${ROUTES.length} màn hình × sáng/tối × vi/en (${BASE})`);
process.exit(list.length ? 1 : 0);
