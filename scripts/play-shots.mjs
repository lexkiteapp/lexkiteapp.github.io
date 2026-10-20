// Ảnh Google Play cho app Android (com.lexkite.app) từ app THẬT trên lexkite.com (?sandbox=1&demo=1 – dữ liệu mẫu tách riêng, không đăng nhập).
// Ra: <thư-mục>/<lang>/phone-1..7.png (1080×1920, PNG 24-bit không alpha) + <lang>/feature-1024x500.png + icon-512.png (32-bit, chép từ brand/).
// Thiết kế giống ảnh Chrome Web Store (scripts/store-shots.mjs): nền teal đậm thương hiệu, tiêu đề lớn có chữ nhấn, ảnh thật trong khung điện thoại.
// Chỉ chạy trên GitHub Actions (.github/workflows/play-shots.yml) – nặng, cần mạng. Dùng: node scripts/play-shots.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.argv[2] || 'play-shots');
const BASE = process.env.BASE || 'https://lexkite.com/app/';
const LANGS = (process.env.LANGS || 'en,vi').split(',');
const W = 1080, H = 1920, sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
import { ICON, KIT, FONT, SCREENS, FEATURE, HIDE, BASECSS } from './lib/app-shots-copy.mjs';
const CSS = `${BASECSS}body{width:${W}px;height:${H}px}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1.5px,transparent 1.5px);background-size:30px 30px;mask-image:linear-gradient(180deg,#000,transparent 40%)}
.brand{position:absolute;left:84px;top:84px;font-size:40px}.brand img{width:64px;height:64px}
.txt{position:absolute;left:84px;right:84px;top:210px}.kick{display:inline-block;font-size:26px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:2px solid rgba(255,176,84,.35);padding:9px 22px;border-radius:99px}
h1{font-size:80px;line-height:1.06;font-weight:800;letter-spacing:-.035em;margin-top:30px}p.sub{font-size:34px;line-height:1.4;color:rgba(255,255,255,.8);margin-top:24px}
.phone{position:absolute;left:150px;top:760px;width:780px;padding:22px;border-radius:96px;background:linear-gradient(160deg,#2a3f40,#0b1617);box-shadow:0 60px 120px rgba(0,0,0,.55),0 0 0 3px rgba(255,255,255,.12) inset}
.phone .scr{border-radius:76px;overflow:hidden;background:#fff;position:relative}.phone img{display:block;width:100%}
.phone .cam{position:absolute;left:50%;top:22px;width:26px;height:26px;margin-left:-13px;border-radius:50%;background:#050909;box-shadow:0 0 0 3px rgba(255,255,255,.06)}
.glow{position:absolute;left:140px;bottom:-260px;width:800px;height:520px;background:radial-gradient(closest-side,rgba(242,85,59,.35),transparent);filter:blur(12px)}`;

async function frame(page, lang, i, shot) {
  const [kick, title, sub] = SCREENS[i][lang];
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${FONT}<style>${CSS}</style></head><body><div class="glow"></div>
    <div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>
    <div class="txt"><span class="kick">${kick}</span><h1>${title}</h1><p class="sub">${sub}</p></div>
    <div class="phone"><div class="scr"><img src="data:image/png;base64,${shot.toString('base64')}"></div><div class="cam"></div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  await page.screenshot({ path: `${OUT}/${lang}/phone-${i + 1}.png`, clip: { x: 0, y: 0, width: W, height: H } });
}

async function feature(page, lang) {
  const [title, tags] = FEATURE[lang];
  const css = `${BASECSS}body{width:1024px;height:500px}
    .kit{position:absolute;left:80px;top:95px;width:310px;height:310px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#FFF7EA,#FFE7C2);display:grid;place-items:center;box-shadow:0 30px 70px rgba(0,0,0,.4),0 0 0 10px rgba(255,201,74,.18)}
    .r{position:absolute;left:440px;right:72px;top:100px}.brand{font-size:44px}.brand img{width:66px;height:66px}
    h1{font-size:46px;line-height:1.1;font-weight:800;letter-spacing:-.03em;margin-top:26px}
    .tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.tags span{font-size:19px;font-weight:700;padding:8px 16px;border-radius:99px;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.22)}`;
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${FONT}<style>${css}</style></head><body>
    <div class="kit">${KIT}</div><div class="r"><div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><h1>${title}</h1>
    <div class="tags">${tags.map(x => `<span>${x}</span>`).join('')}</div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  await page.screenshot({ path: `${OUT}/${lang}/feature-1024x500.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
}

// Chụp app thật: điện thoại 390×800 @3x → ảnh 1170×2400 thu vào khung (nét)
async function appContext(browser, lang, dark) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, colorScheme: dark ? 'dark' : 'light', locale: lang });
  await ctx.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, HIDE);
  const page = await ctx.newPage();
  const url = r => `${BASE}?sandbox=1&demo=1&hl=${lang}#/${r}`;
  await page.goto(url('home'), { waitUntil: 'load' }).catch(() => {}); await sleep(5000); // demo=1 gieo thẻ, chuỗi ngày (chỉ khi máy chưa có dữ liệu)
  if (/#\/welcome/.test(page.url())) { // dự phòng: đi qua màn chào như contrast.mjs
    await page.goto(url('welcome/setup'), { waitUntil: 'load' }).catch(() => {}); await sleep(2500);
    const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await sleep(2500); }
  }
  return { ctx, page, url };
}

async function shoot(page, url, s) {
  await page.goto(url(s.r), { waitUntil: 'load' }).catch(() => {}); await sleep(s.wait || 3500);
  if (s.flip) {
    const b = await page.$('#flipBtn');
    if (b) { await b.click().catch(() => {}); await sleep(1500); } else console.warn('⚠ không có thẻ đến hạn ở #/review');
  }
  await page.evaluate(() => scrollTo(0, 0)).catch(() => {}); await sleep(300);
  return page.screenshot();
}

// PNG phải đúng kích thước, kiểu màu 2 = RGB (không alpha) – Play từ chối ảnh có alpha
function checkPng(f, w, h, colorType) {
  const b = fs.readFileSync(f);
  const ok = b.readUInt32BE(16) === w && b.readUInt32BE(20) === h && b[24] === 8 && b[25] === colorType;
  if (!ok) throw new Error(`✗ ${path.relative(OUT, f)}: ${b.readUInt32BE(16)}×${b.readUInt32BE(20)} bit ${b[24]} type ${b[25]} (cần ${w}×${h}, type ${colorType})`);
}

const browser = await chromium.launch();
const out = await browser.newPage({ deviceScaleFactor: 1 });
for (const lang of LANGS) {
  if (!SCREENS[0][lang]) throw new Error('Chưa có chữ cho ngôn ngữ ' + lang);
  fs.mkdirSync(`${OUT}/${lang}`, { recursive: true });
  const shots = [];
  for (const dark of [false, true]) {
    const list = SCREENS.map((s, i) => [s, i]).filter(([s]) => !!s.dark === dark);
    if (!list.length) continue;
    const { ctx, page, url } = await appContext(browser, lang, dark);
    for (const [s, i] of list) { shots[i] = await shoot(page, url, s); console.log(`· ${lang} ${i + 1} #/${s.r}`); }
    await ctx.close();
  }
  for (let i = 0; i < SCREENS.length; i++) await frame(out, lang, i, shots[i]);
  await feature(out, lang);
}
await browser.close();
fs.copyFileSync('brand/lexkite-icon-512.png', `${OUT}/icon-512.png`);

checkPng(`${OUT}/icon-512.png`, 512, 512, 6); // Play: icon 512×512 PNG 32-bit (có alpha)
let n = 0;
for (const lang of LANGS) {
  for (let i = 1; i <= SCREENS.length; i++) { checkPng(`${OUT}/${lang}/phone-${i}.png`, W, H, 2); n++; }
  checkPng(`${OUT}/${lang}/feature-1024x500.png`, 1024, 500, 2); n++;
}
if (n !== LANGS.length * (SCREENS.length + 1)) throw new Error('✗ thiếu ảnh');
console.log(`✓ ${n} ảnh + icon → ${OUT}`);
