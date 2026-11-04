// Chụp màn THẬT của app cho ảnh giới thiệu (?sandbox=1&demo=1: dữ liệu mẫu tách riêng, không đăng nhập). Chỉ chạy trên CI (.github/workflows/store-art.yml).
// Ra: <raw>/<phone|tablet>/<lang>/<n>.png theo thứ tự SLIDES. Màn trắng hoặc thiếu thao tác = đỏ, không thay bằng ảnh giả.
// Dùng: BASE=https://lexkite.com/app/ LANGS=en node scripts/store-art/capture.mjs <raw>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { SLIDES, CAPTURE, LANGS as ALL } from './spec.mjs';

const RAW = path.resolve(process.argv[2] || 'store-art-raw');
const BASE = process.env.BASE || 'https://lexkite.com/app/';
const LANGS = (process.env.LANGS || 'en').split(',').filter(l => ALL.includes(l));
if (!LANGS.length) throw new Error('LANGS không có ngôn ngữ hợp lệ');
const HIDE = '#toast,.install-nudge,#installBtn,.lk-rep,#lkRep{display:none!important}';
const ESSAY = 'Many people believe that learning a language online is easier than studying in a classroom. I think this is a good thing because students can practise every day and choose topics they enjoy. However, speaking with other people is still important, and it helps learners feel more confident. In my opinion, the best approach is to combine daily practice with real conversations.';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Thao tác để tới đúng trạng thái đáng xem của màn
const STEPS = {
  async flip(page) { await page.click('#flipBtn', { timeout: 15000 }); await sleep(1500); },
  async say(page) { await page.click('a[href^="#/say/"]', { timeout: 15000 }); await sleep(4000); },
  async write(page) {
    await page.fill('#essay', ESSAY, { timeout: 15000 }); await page.click('#analyze'); await page.waitForSelector('#report > *', { timeout: 15000 }); await sleep(1500);
    await page.evaluate(() => document.querySelector('#report').scrollIntoView({ block: 'start' })); await sleep(500);
  },
  async call(page, url) {
    await page.goto(url('call/coffee'), { waitUntil: 'load' }).catch(() => {}); await page.click('#callGo', { timeout: 20000 });
    await page.waitForSelector('.call-ov', { timeout: 15000 }); await sleep(5000);
  },
};

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const bad = []; let n = 0;
for (const [dev, c] of Object.entries(CAPTURE)) for (const lang of LANGS) {
  fs.mkdirSync(`${RAW}/${dev}/${lang}`, { recursive: true });
  for (const theme of ['light', 'dark']) {
    const list = SLIDES.map((s, i) => [s, i]).filter(([s]) => s.theme === theme);
    const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: c.dsf, isMobile: c.mobile, hasTouch: c.mobile, colorScheme: theme, locale: lang, reducedMotion: 'reduce' });
    await ctx.addInitScript(css => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }), HIDE);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    const url = r => { const [p, q] = r.split('?'); return `${BASE}?sandbox=1&demo=1&hl=${lang}#/${p}${q ? '?' + q : ''}`; };
    await page.goto(url('home'), { waitUntil: 'load' }).catch(() => {}); await sleep(5000);
    if (/#\/welcome/.test(page.url())) { // lần đầu mở: đi qua màn chào như người dùng
      await page.goto(url('welcome/setup'), { waitUntil: 'load' }).catch(() => {}); await page.waitForSelector('#obNext, #go', { timeout: 10000 }).catch(() => {});
      for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await sleep(150); }
      await page.click('#go').catch(() => {}); await sleep(2500);
    }
    for (const [s, i] of list) {
      const tag = `${dev}/${lang}/${i + 1} ${s.id}`;
      try {
        await page.goto(url(s.route), { waitUntil: 'load' }).catch(() => {}); await sleep(s.wait || 3500);
        if (s.steps) await STEPS[s.steps](page, url);
        else await page.evaluate(() => scrollTo(0, 0));
        const chars = await page.evaluate(() => document.body.innerText.trim().length);
        if (chars < 40) throw new Error(`màn gần như trống (${chars} ký tự)`);
        await page.screenshot({ path: `${RAW}/${dev}/${lang}/${i + 1}.png` }); n++; console.log('·', tag);
      } catch (e) { bad.push(`${tag}: ${String(e.message).split('\n')[0]}`); await page.screenshot({ path: `${RAW}/${dev}/${lang}/${i + 1}.fail.png` }).catch(() => {}); }
    }
    if (errs.length) console.warn(`⚠ ${dev}/${lang}/${theme} lỗi JS: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${RAW}/capture-report.json`, JSON.stringify({ base: BASE, ok: n, bad }, null, 1));
console.log(`${bad.length ? '✗' : '✓'} ${n} màn chụp, ${bad.length} lỗi`); bad.forEach(b => console.error('  ✗ ' + b));
if (bad.length || !n) process.exit(1);
