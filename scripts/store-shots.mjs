// Ảnh Chrome Web Store từ add-on THẬT (nạp extension/ vào Chromium): 5 ảnh 1280×800 (en + vi) + ô quảng cáo 440×280 & 1400×560.
// Chạy trên GitHub Actions (.github/workflows/store-shots.yml) – máy cần mạng để tra từ/dịch như người dùng thật.
// Dùng: node scripts/store-shots.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OUT = path.resolve(process.argv[2] || 'store-shots');
const EXT = path.resolve('extension');
const W = 1280, H = 800, sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');

const CAP = {
  en: [
    ['Double-click any word', 'IPA, audio, meanings and examples – right on the page you are reading'],
    ['Select a sentence to translate', 'Instant translation with grammar structures explained'],
    ['Your study hub in one click', 'Cards due today, daily goal, quick lookup and sync'],
    ['Learn on every new tab', 'One vocabulary card each time you open a tab – turn it off anytime'],
    ['Spaced repetition that sticks', 'FSRS reviews at the right moment, plus IELTS & TOEIC practice'],
  ],
  vi: [
    ['Bấm đúp vào từ bất kỳ', 'Phiên âm, phát âm, nghĩa và ví dụ – ngay trên trang bạn đang đọc'],
    ['Bôi đen câu để dịch', 'Dịch tức thì, kèm giải thích cấu trúc ngữ pháp'],
    ['Góc học tập trong một cú bấm', 'Thẻ cần ôn hôm nay, mục tiêu ngày, tra nhanh và đồng bộ'],
    ['Học trên mỗi tab mới', 'Một thẻ từ vựng mỗi lần mở tab – tắt bất cứ lúc nào'],
    ['Ôn tập ngắt quãng nhớ lâu', 'FSRS nhắc ôn đúng lúc, kèm luyện IELTS & TOEIC'],
  ],
};

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Why cities are planting forests</title>
<style>body{margin:0;font:19px/1.75 Georgia,serif;color:#222;background:#faf8f4}header{background:#1d1d1d;color:#fff;padding:14px 48px;font:700 22px Arial,sans-serif;letter-spacing:.04em}
main{max-width:760px;margin:0 auto;padding:36px 32px}h1{font:700 40px/1.2 Georgia,serif;margin:0 0 10px}.by{font:14px Arial,sans-serif;color:#777;margin-bottom:24px}</style></head>
<body><header>THE DAILY PLANET · Environment</header><main><h1>Why cities are planting forests</h1><div class="by">By Clara Hughes · 6 min read</div>
<p>Urban planners increasingly argue that trees are not decoration but infrastructure. Dense canopies can lower street temperatures by several degrees, improving the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>Critics point out that new trees take decades to mature, yet many councils now see green space as an essential part of climate adaptation rather than an optional extra.</p></main></body></html>`;

async function frame(page, lang, i, shot, { pad = 'full' } = {}) {
  const [title, sub] = CAP[lang][i];
  const img = 'data:image/png;base64,' + shot.toString('base64');
  const inner = pad === 'full'
    ? `<img src="${img}" style="width:1120px;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);display:block">`
    : `<img src="${img}" style="height:560px;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);display:block">`;
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Be Vietnam Pro","Segoe UI",Arial,sans-serif;color:#fff;
    background:radial-gradient(circle at 88% 8%,rgba(255,176,84,.35),transparent 30%),linear-gradient(150deg,#0F3D3E,#1F5F5A 60%,#2a6f66)}
    .top{display:flex;align-items:center;gap:18px;padding:30px 80px 0}.top img{width:54px;height:54px;border-radius:13px}
    h1{font-size:38px;font-weight:800;letter-spacing:-.02em}p{font-size:19px;opacity:.85;margin-top:4px}.shot{display:flex;justify-content:center;margin-top:22px}</style></head>
    <body><div class="top"><img src="${ICON}"><div><h1>${title}</h1><p>${sub}</p></div></div><div class="shot">${inner}</div></body></html>`);
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${lang}-${i + 1}.png`, clip: { x: 0, y: 0, width: W, height: H } });
}

async function run(lang) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: true, locale: lang, viewport: { width: 1120, height: 640 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`],
  });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host, base = `chrome-extension://${id}/`;
  await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), lang);
  await sleep(1500);
  for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {}); // trang chào mừng tự mở khi cài

  // Dữ liệu mẫu (thẻ, chuỗi ngày) qua app trong add-on – dùng chung chrome.storage với popup, tab mới, trang web
  const app = await ctx.newPage();
  await app.goto(base + `app/index.html?demo=1&hl=${lang}#/home`); await sleep(5000);
  const appShot = await (async () => { await app.goto(base + `app/index.html?hl=${lang}#/home`); await sleep(3500); return app.screenshot(); })();
  const page = await ctx.newPage();
  await page.route('https://news.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));

  // 1. Bấm đúp tra từ trên trang báo
  await page.goto('https://news.example.com/cities-forests'); await sleep(2500);
  await page.dblclick('#w'); await sleep(6000);
  const s1 = await page.screenshot();
  // 2. Bôi đen câu → tự dịch
  await sw.evaluate(() => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), selectMode: 'auto' } })));
  await page.goto('https://news.example.com/cities-forests'); await sleep(2500);
  const b = await page.locator('#s').boundingBox();
  await page.mouse.move(b.x + 1, b.y + 6); await page.mouse.down(); await page.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 12 }); await page.mouse.up();
  await sleep(6000);
  const s2 = await page.screenshot();
  // 3. Cửa sổ add-on (popup) – kích thước thật của popup
  const pop = await ctx.newPage(); await pop.setViewportSize({ width: 380, height: 560 });
  await pop.goto(base + 'popup.html'); await sleep(2500);
  const s3 = await pop.screenshot();
  // 4. Tab mới
  const nt = await ctx.newPage(); await nt.setViewportSize({ width: 1120, height: 640 });
  await nt.goto(base + 'newtab.html'); await sleep(2500);
  const s4 = await nt.screenshot();

  const out = await ctx.newPage();
  await frame(out, lang, 0, s1); await frame(out, lang, 1, s2); await frame(out, lang, 2, s3, { pad: 'tall' });
  await frame(out, lang, 3, s4); await frame(out, lang, 4, appShot);
  await ctx.close();
}

async function promos() {
  const br = await chromium.launch();
  const p = await br.newPage();
  for (const [w, h, f] of [[440, 280, 'promo-440x280'], [1400, 560, 'promo-1400x560']]) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}
      body{width:${w}px;height:${h}px;overflow:hidden;font-family:"Segoe UI",Arial,sans-serif;color:#fff;display:flex;align-items:center;gap:${h * .08}px;padding:0 ${h * .13}px;
      background:radial-gradient(circle at 88% 12%,rgba(255,176,84,.45),transparent 38%),linear-gradient(150deg,#0F3D3E,#1F5F5A 65%,#2a6f66)}
      img{width:${h * .36}px;height:${h * .36}px;border-radius:22%;box-shadow:0 12px 30px rgba(0,0,0,.3)}h1{font-size:${h * .19}px;font-weight:800;letter-spacing:-.03em;line-height:1}
      h1 b{color:#FFB054}p{font-size:${h * .075}px;margin-top:${h * .045}px;opacity:.92;line-height:1.3}</style></head>
      <body><img src="${ICON}"><div><h1>lex<b>kite</b></h1><p>Double-click to look up.<br>Save with context. Remember with FSRS.</p></div></body></html>`);
    await sleep(300);
    await p.screenshot({ path: `${OUT}/${f}.png` });
  }
  await br.close();
}

await promos();
for (const l of ['en', 'vi']) await run(l);
console.log('✓', fs.readdirSync(OUT).join(' '));
