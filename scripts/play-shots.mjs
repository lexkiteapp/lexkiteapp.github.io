// Ảnh cửa hàng app (Google Play + App Store) từ app THẬT (?sandbox=1&demo=1 – dữ liệu mẫu tách riêng, không đăng nhập). BASE = web/ phục vụ nội bộ trên CI
// (giao diện đúng main) hoặc https://lexkite.com/app/. Chụp mỗi màn 1 lần (điện thoại 390×844 @3x, máy tính bảng 1024×1366 @2x), đóng khung chung
// scripts/lib/store-frame.mjs (cùng phong cách ảnh Chrome Web Store scripts/store-shots.mjs). PNG 24-bit không alpha. Chỉ chạy trên CI (store-shots.yml).
// Ra: <out>/play/<lang>/phone-N.png (1080×1920) + feature-1024x500.png, <out>/play/icon-512.png (RGBA – Play bắt buộc),
//     <out>/appstore/<lang>/iphone-69-N.png (1320×2868), iphone-65-N.png (1284×2778), ipad-13-N.png (2064×2752).
// Dùng: BASE=http://localhost:8080/ LANGS=en,vi node scripts/play-shots.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { toRgbaPng } from './lib/png-rgba.mjs';
import { TARGETS, CAPTURE, framePortrait, checkPng } from './lib/store-frame.mjs';

const OUT = path.resolve(process.argv[2] || 'play-shots');
const BASE = process.env.BASE || 'https://lexkite.com/app/';
const LANGS = (process.env.LANGS || 'en,vi').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
import { ICON, FONT, SCREENS, FEATURE, HIDE, BASECSS } from './lib/app-shots-copy.mjs';

// Ảnh nổi bật Play 1024×500: cùng phong cách khung dọc – tiêu đề + nhãn bên trái, 2 màn thật (sáng: Hôm nay, tối: chuỗi) nghiêng bên phải
async function feature(page, lang, light, dark) {
  const [title, tags] = FEATURE[lang];
  const css = `${BASECSS}body{width:1024px;height:500px;background:radial-gradient(520px 420px at 100% 0,rgba(255,176,84,.34),transparent 62%),radial-gradient(600px 380px at 70% 120%,rgba(242,85,59,.30),transparent 62%),linear-gradient(165deg,#0A2E30,#0F3D3E 48%,#0C3436)}
    .r{position:absolute;left:64px;top:92px;width:470px}.brand{font-size:34px}.brand img{width:52px;height:52px}
    h1{font-size:46px;line-height:1.06;font-weight:800;letter-spacing:-.03em;margin-top:22px;text-wrap:balance}
    .tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.tags span{font-size:17px;font-weight:700;padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.22)}
    .ph{position:absolute;width:230px;height:470px;padding:9px;border-radius:40px;background:linear-gradient(155deg,#33494a,#0b1617 55%,#1d2c2d);box-shadow:0 30px 60px rgba(0,0,0,.5),0 0 0 1.5px rgba(255,255,255,.14) inset}
    .ph div{width:100%;height:100%;border-radius:32px;overflow:hidden}.ph img{display:block;width:100%}
    .a{left:600px;top:40px;transform:rotate(-6deg)}.b{left:790px;top:70px;transform:rotate(5deg)}`;
  const ph = (c, img) => `<div class="ph ${c}"><div><img src="data:image/png;base64,${img.toString('base64')}"></div></div>`;
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${FONT}<style>${css}</style></head><body>
    <div class="r"><div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><h1>${title}</h1>
    <div class="tags">${tags.map(x => `<span>${x}</span>`).join('')}</div></div>${ph('b', dark)}${ph('a', light)}</body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  await page.screenshot({ path: `${OUT}/play/${lang}/feature-1024x500.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
}

// Chụp app thật ở cỡ máy kind (điện thoại / máy tính bảng), sáng hoặc tối theo hệ thống
async function appContext(browser, lang, dark, kind) {
  const cap = CAPTURE[kind];
  const ctx = await browser.newContext({ viewport: { width: cap.width, height: cap.height }, isMobile: true, hasTouch: true, deviceScaleFactor: cap.dsf, colorScheme: dark ? 'dark' : 'light', locale: lang });
  await ctx.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, HIDE);
  const page = await ctx.newPage();
  const url = r => `${BASE}?sandbox=1&demo=1&hl=${lang}#/${r}`;
  await page.goto(url('home'), { waitUntil: 'load' }).catch(() => {}); await sleep(5000); // demo=1 gieo thẻ, chuỗi ngày (chỉ khi máy chưa có dữ liệu)
  if (/#\/welcome/.test(page.url())) { // dự phòng: đi qua màn chào như contrast.mjs
    await page.goto(url('welcome/setup'), { waitUntil: 'load' }).catch(() => {}); await sleep(2500);
    await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {}); for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); } const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await sleep(2500); } // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  }
  return { ctx, page, url };
}

async function shoot(page, url, s) {
  await page.goto(url(s.r), { waitUntil: 'load' }).catch(() => {}); await sleep(s.wait || 3500);
  if (s.flip) {
    const b = await page.$('#flipBtn');
    if (b) { await b.click().catch(() => {}); await sleep(1500); } else console.warn('⚠ không có thẻ đến hạn ở #/review');
  }
  for (const sel of s.tap || []) { // bấm thật (vd. bắt đầu bài học) – thiếu nút = ảnh sai màn → dừng
    const el = await page.waitForSelector(sel, { timeout: 8000 }).catch(() => null);
    if (!el) throw new Error(`✗ #/${s.r}: không thấy ${sel}`);
    await el.evaluate(e => e.click()); await sleep(3000); // nút nhún liên tục (lsnBob) → Playwright click chờ 'ổn định' mãi
  }
  await page.evaluate(() => scrollTo(0, 0)).catch(() => {}); await sleep(300);
  return page.screenshot();
}

const browser = await chromium.launch();
const out = await browser.newPage({ deviceScaleFactor: 1 });
let n = 0, phone;
for (const lang of LANGS) {
  if (!SCREENS[0][lang]) throw new Error('Chưa có chữ cho ngôn ngữ ' + lang);
  for (const d of ['play', 'appstore']) fs.mkdirSync(`${OUT}/${d}/${lang}`, { recursive: true });
  for (const kind of ['phone', 'tablet']) {
    const shots = []; if (kind === 'phone') phone = shots;
    for (const dark of [false, true]) {
      const list = SCREENS.map((s, i) => [s, i]).filter(([s]) => !!s.dark === dark);
      if (!list.length) continue;
      const { ctx, page, url } = await appContext(browser, lang, dark, kind);
      for (const [s, i] of list) { shots[i] = await shoot(page, url, s); console.log(`· ${lang} ${kind} ${i + 1} #/${s.r}`); }
      await ctx.close();
    }
    for (const [name, t] of Object.entries(TARGETS).filter(([, t]) => t.kind === kind)) {
      for (let i = 0; i < SCREENS.length; i++) {
        const [kick, title, sub] = SCREENS[i][lang], chip = SCREENS[i].chip?.[lang];
        const file = t.os === 'android' ? `${OUT}/play/${lang}/phone-${i + 1}.png` : `${OUT}/appstore/${lang}/${name}-${i + 1}.png`;
        await framePortrait(out, t, { lang, kick, title, sub, chip, shot: shots[i], file }); n++;
      }
    }
  }
  await feature(out, lang, phone[0], phone[SCREENS.findIndex(x => x.r === 'streak')]); checkPng(`${OUT}/play/${lang}/feature-1024x500.png`, 1024, 500, 2); n++;
}
await browser.close();
// Play bắt buộc icon 32-bit có alpha; brand/ có thể là PNG bảng màu (kiểu 3) → đổi sang RGBA, giữ nguyên điểm ảnh
fs.writeFileSync(`${OUT}/play/icon-512.png`, toRgbaPng(fs.readFileSync('brand/lexkite-icon-512.png')));
checkPng(`${OUT}/play/icon-512.png`, 512, 512, 6);
const want = LANGS.length * (SCREENS.length * Object.keys(TARGETS).length + 1);
if (n !== want) throw new Error(`✗ chỉ có ${n}/${want} ảnh`);
console.log(`✓ ${n} ảnh + icon → ${OUT}`);
