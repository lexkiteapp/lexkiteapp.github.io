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
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
// Linh vật Kit: chỉ từ nguồn duy nhất web/js/kit.js (docs/BRAND-RULES.md)
const KIT = (() => { const g = {}; new Function('window', 'self', fs.readFileSync('web/js/kit.js', 'utf8'))(g, g); return g.Kit.svg('cheer', 230, false); })();
const FONT = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';

// Màn hình: [route, chữ trên ảnh theo ngôn ngữ, tùy chọn]. Chữ chỉ nói đúng tính năng có thật trong web/js.
const SCREENS = [
  { r: 'home', en: ['No login needed', 'Learn English words <em>a little every day</em>', 'A daily plan of new words and reviews, built around your goal.'],
    vi: ['Không cần đăng nhập', 'Học từ vựng tiếng Anh <em>mỗi ngày một chút</em>', 'Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu của bạn.'] },
  { r: 'review', flip: true, en: ['FSRS spaced repetition', 'Review right <em>before you forget</em>', 'Rate how well you remembered – FSRS schedules the next review.'],
    vi: ['Lặp lại ngắt quãng FSRS', 'Ôn đúng lúc <em>sắp quên</em>', 'Chấm mức độ nhớ – FSRS tự hẹn lần ôn tiếp theo.'] },
  { r: 'dict/resilience', wait: 6000, en: ['Dictionary', 'Every word, <em>clearly explained</em>', 'UK & US pronunciation, meanings by part of speech and examples.'],
    vi: ['Tra từ', 'Mỗi từ <em>giải thích rõ ràng</em>', 'Phát âm Anh–Anh, Anh–Mỹ, nghĩa theo từ loại và ví dụ.'] },
  { r: 'tests', en: ['IELTS · TOEIC · TOEFL', 'Practice tests <em>with explanations</em>', 'Placement test, timed mock tests and your score history.'],
    vi: ['IELTS · TOEIC · TOEFL', 'Đề luyện thi <em>có giải thích</em>', 'Kiểm tra trình độ, thi thử tính giờ và lịch sử điểm.'] },
  { r: 'usage/affect-effect', en: ['Usage & grammar', 'Fix the mistakes <em>learners often make</em>', 'Affect or effect? Short, clear notes with examples.'],
    vi: ['Cách dùng & ngữ pháp', 'Sửa những lỗi <em>người học hay mắc</em>', 'Affect hay effect? Giải thích ngắn gọn, có ví dụ.'] },
  { r: 'stats', en: ['Progress', 'Watch your <em>streak grow</em>', 'Daily goals, streaks, XP and words you have mastered.'],
    vi: ['Tiến độ', 'Chuỗi ngày học <em>dài thêm mỗi ngày</em>', 'Mục tiêu ngày, chuỗi ngày, XP và số từ đã thuộc.'] },
  { r: 'practice', dark: true, en: ['Dark mode · 15 languages', 'Study your way, <em>day or night</em>', 'Flashcards, games, listening and speaking practice.'],
    vi: ['Chế độ tối · 15 ngôn ngữ', 'Học theo cách của bạn, <em>ngày hay đêm</em>', 'Flashcard, trò chơi, luyện nghe và luyện nói.'] },
];
const FEATURE = {
  en: ['English vocabulary <em>&amp; exam practice</em>', ['No login', 'Works offline', 'FSRS flashcards', 'IELTS · TOEIC · TOEFL']],
  vi: ['Từ vựng tiếng Anh <em>&amp; luyện thi</em>', ['Không cần đăng nhập', 'Học offline', 'Flashcard FSRS', 'IELTS · TOEIC · TOEFL']],
};

// Ẩn thứ chỉ có trên web / thông báo tạm (toast "chế độ thử nghiệm", nút cài PWA, nút báo lỗi) – app Android không hiện
const HIDE = '#toast,.install-nudge,#installBtn,.lk-rep,#lkRep{display:none!important}';

const BG = `background:radial-gradient(900px 700px at 100% -5%,rgba(255,176,84,.30),transparent 60%),radial-gradient(900px 800px at -15% 105%,rgba(31,122,114,.55),transparent 60%),linear-gradient(165deg,#0B3233,#0F3D3E 45%,#123f40);`;
const BASECSS = `*{box-sizing:border-box;margin:0}body{overflow:hidden;font-family:"Be Vietnam Pro","Noto Sans","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;${BG}position:relative}
em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{display:flex;align-items:center;gap:14px;font-weight:800;letter-spacing:-.02em}.brand img{border-radius:22%;box-shadow:0 8px 22px rgba(0,0,0,.35)}.brand b{color:#FFB054;font-weight:800}`;
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
