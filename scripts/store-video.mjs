// Video giới thiệu add-on (≈40 giây, 1920×1080, MP4) quay từ add-on THẬT – dùng cho Chrome Web Store (ô Promo video) & YouTube.
// Mỗi cảnh: quay trang thật (Playwright recordVideo, con trỏ giả để người xem thấy thao tác) → ghép lên nền thương hiệu bằng ffmpeg.
// Chạy trên GitHub Actions (.github/workflows/store-video.yml). Dùng: LANG_V=en node scripts/store-video.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OUT = path.resolve(process.argv[2] || 'store-video');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lkv-'));
const EXT = path.resolve('extension');
const LANG = process.env.LANG_V || 'en';
const LOCALE = { en: 'es-ES', pt: 'pt-BR', zh: 'zh-CN' }[LANG] || LANG; // en: minh họa dịch EN → ES
const VW = 1280, VH = 800, CW = 1920, CH = 1080, FPS = 30;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const T = {
  en: {
    intro: ['Learn English words<br><em>while you browse.</em>', 'The free vocabulary extension for IELTS, TOEIC & everyday English'],
    s: [
      ['On any website', 'Double-click.<br><em>Understand instantly.</em>', 'IPA, audio, meanings and examples – right where you read.'],
      ['Translate & learn grammar', 'Select a sentence.<br><em>See how it works.</em>', 'Instant translation plus the grammar structures inside it.'],
      ['Toolbar popup', 'Your daily study,<br><em>one click away.</em>', 'Cards due today, quick lookup and a 1-minute review.'],
      ['New tab', 'Learn a word<br><em>every new tab.</em>', 'A flashcard from your own deck, at the right moment.'],
      ['Full study app included', 'Remember words<br><em>for good.</em>', 'FSRS spaced repetition, 6,000+ words, IELTS & TOEIC practice.'],
    ],
    outro: ['Add to Chrome –<br><em>it’s free.</em>', 'lexkite.com'],
  },
  vi: {
    intro: ['Học từ vựng tiếng Anh<br><em>ngay khi lướt web.</em>', 'Tiện ích từ vựng miễn phí cho IELTS, TOEIC và tiếng Anh hằng ngày'],
    s: [
      ['Trên mọi trang web', 'Bấm đúp vào từ.<br><em>Hiểu ngay lập tức.</em>', 'Phiên âm, phát âm, nghĩa và ví dụ ngay tại chỗ bạn đọc.'],
      ['Dịch & học ngữ pháp', 'Bôi đen một câu.<br><em>Hiểu cả cấu trúc.</em>', 'Dịch tức thì, kèm giải thích cấu trúc ngữ pháp trong câu.'],
      ['Cửa sổ tiện ích', 'Việc học mỗi ngày,<br><em>chỉ một cú bấm.</em>', 'Thẻ cần ôn, tra nhanh và ôn 1 phút.'],
      ['Tab mới', 'Mỗi tab mới,<br><em>thêm một từ.</em>', 'Một thẻ từ chính sổ của bạn, đúng thời điểm.'],
      ['Kèm ứng dụng học đầy đủ', 'Nhớ từ vựng<br><em>thật lâu.</em>', 'Lặp lại ngắt quãng FSRS, 6.000+ từ, luyện IELTS & TOEIC.'],
    ],
    outro: ['Thêm vào Chrome –<br><em>miễn phí.</em>', 'lexkite.com'],
  },
}[LANG];

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Why cities are planting forests</title>
<style>body{margin:0;font:21px/1.75 Georgia,serif;color:#23272a;background:#fbfaf7}nav{display:flex;gap:28px;align-items:center;padding:16px 56px;border-bottom:1px solid #e7e3da;font:600 15px Arial,sans-serif;color:#555}
nav b{font:800 24px Georgia,serif;color:#111;margin-right:24px;letter-spacing:-.02em}main{max-width:820px;margin:0 auto;padding:30px 32px}.k{font:700 13px Arial,sans-serif;color:#1F7A72;letter-spacing:.12em}
h1{font:700 44px/1.15 Georgia,serif;margin:6px 0 10px}.by{font:15px Arial,sans-serif;color:#888;margin-bottom:18px}.hero{height:90px;border-radius:10px;margin-bottom:18px;background:linear-gradient(120deg,#2f6b4f,#7fb069 55%,#d8e2a8)}</style></head>
<body><nav><b>The Daily Planet</b><span>World</span><span>Environment</span><span>Science</span><span>Cities</span></nav><main><div class="k">ENVIRONMENT</div><h1>Why cities are planting forests</h1><div class="by">By Clara Hughes · 6 min read</div><div class="hero"></div>
<p>Urban planners increasingly argue that trees are not decoration but infrastructure. Dense canopies can lower street temperatures by several degrees, improving the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>Critics point out that new trees take decades to mature, yet many councils now see green space as an essential part of climate adaptation rather than an optional extra.</p></main></body></html>`;

// Con trỏ giả (video headless không có con trỏ thật) – theo chuột, co lại khi bấm
const CURSOR = `(() => { const add = () => { if (document.getElementById('lk-cur')) return; const c = document.createElement('div'); c.id = 'lk-cur';
  c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  c.style.cssText = 'position:fixed;left:-50px;top:-50px;z-index:2147483647;pointer-events:none;transition:transform .12s;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', e => { c.style.left = e.clientX - 4 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.8)'; }, true); addEventListener('mouseup', () => { c.style.transform = ''; }, true); };
  if (document.documentElement) add(); document.addEventListener('DOMContentLoaded', add); })();`;

const BG = `background:radial-gradient(1300px 700px at 92% -10%,rgba(255,176,84,.30),transparent 60%),radial-gradient(1000px 700px at -10% 110%,rgba(31,122,114,.55),transparent 60%),linear-gradient(160deg,#0B3233,#0F3D3E 45%,#123f40);`;
const BASE_CSS = `*{box-sizing:border-box;margin:0}body{width:${CW}px;height:${CH}px;overflow:hidden;font-family:"Be Vietnam Pro","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;${BG}position:relative}
em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{position:absolute;left:96px;top:72px;display:flex;align-items:center;gap:16px;font-weight:800;font-size:36px;letter-spacing:-.02em}.brand img{width:62px;height:62px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.3)}.brand b{color:#FFB054}
.txt{position:absolute;left:96px;top:300px;width:520px}.kick{display:inline-block;font-size:19px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:1px solid rgba(255,176,84,.35);padding:8px 16px;border-radius:99px}
h1{font-size:64px;line-height:1.06;font-weight:800;letter-spacing:-.03em;margin-top:30px}p{font-size:26px;line-height:1.45;color:rgba(255,255,255,.8);margin-top:24px}
.win{position:absolute;left:680px;top:150px;width:1160px;height:${Math.round(1160 * VH / VW) + 46}px;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 50px 100px rgba(0,0,0,.5)}
.bar{height:46px;background:#eef1f0;display:flex;align-items:center;gap:10px;padding:0 18px}.bar span{width:13px;height:13px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}
.bar div{margin-left:16px;flex:1;height:30px;border-radius:8px;background:#fff;color:#5b6b6a;font:500 15px system-ui,sans-serif;display:flex;align-items:center;padding:0 14px}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.center img{width:150px;height:150px;border-radius:34px;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.center .n{font-size:72px;font-weight:800;letter-spacing:-.03em;margin-top:28px}.center .n b{color:#FFB054}.center h1{font-size:84px;margin-top:26px}.center p{font-size:30px}
.cws{margin-top:40px;display:inline-flex;align-items:center;gap:14px;background:#fff;color:#0F3D3E;font-size:30px;font-weight:800;padding:18px 34px;border-radius:999px;box-shadow:0 20px 40px rgba(0,0,0,.35)}`;
const WIN = { x: 680, y: 150 + 46, w: 1160, h: Math.round(1160 * VH / VW) };

async function card(page, file, body) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${BASE_CSS}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(300);
  await page.screenshot({ path: file });
}
const sceneBg = (i, url, extra = '') => { const [k, h, p] = T.s[i]; return `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="txt"><span class="kick">${k}</span><h1>${h}</h1><p>${p}</p></div>${extra}<div class="win"><div class="bar"><span></span><span></span><span></span><div>🔒 ${url}</div></div></div>`; };

// Ghép 1 cảnh: nền PNG + đoạn video [ss, ss+d] đặt vào khung, mờ dần đầu/cuối
function compose(bg, vid, ss, d, out, box = WIN) {
  ff(['-loop', '1', '-t', String(d), '-i', bg, '-ss', String(ss), '-t', String(d), '-i', vid, '-filter_complex',
    `[1:v]scale=${box.w}:${box.h}:flags=lanczos,setsar=1[v];[0:v][v]overlay=${box.x}:${box.y}:shortest=1,fps=${FPS},format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35`,
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-an', out]);
}
function still(png, d, out) {
  ff(['-loop', '1', '-t', String(d), '-i', png, '-vf', `fps=${FPS},format=yuv420p,zoompan=z='min(zoom+0.0006,1.04)':d=${Math.round(d * FPS)}:s=${CW}x${CH}:fps=${FPS},fade=t=in:st=0:d=0.4,fade=t=out:st=${(d - 0.4).toFixed(2)}:d=0.4`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-an', out]);
}

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
const ctx = await chromium.launchPersistentContext(prof, {
  channel: 'chromium', headless: true, locale: LOCALE, viewport: { width: VW, height: VH }, deviceScaleFactor: 1,
  recordVideo: { dir: path.join(TMP, 'raw'), size: { width: VW, height: VH } },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${LOCALE}`],
});
await ctx.addInitScript(CURSOR);
await ctx.route('https://news.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), LANG);
await sleep(1500);
for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {});

// Dữ liệu mẫu + làm nóng bộ đệm tra từ/dịch (cảnh quay không phải chờ mạng)
const warm = await ctx.newPage();
await warm.goto(base + `app/index.html?demo=1&hl=${LANG}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(5000);
await setSettings({ selectMode: 'off', markKnown: false, markAcademic: false });
await warm.goto('https://news.example.com/a', { waitUntil: 'domcontentloaded' }); await sleep(2000); await warm.dblclick('#w'); await sleep(9000);
await setSettings({ selectMode: 'auto' });
await warm.goto('https://news.example.com/a', { waitUntil: 'domcontentloaded' }); await sleep(2000);
{ const b = await warm.locator('#s').boundingBox(); await warm.mouse.move(b.x + 1, b.y + 8); await warm.mouse.down(); await warm.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 10 }); await warm.mouse.up(); }
await sleep(9000); await warm.close();
const articleShot = path.join(TMP, 'article.png');

const scenes = []; // { vid, ss, d, bg, box }
async function record(fn) {
  const page = await ctx.newPage(); const t0 = Date.now();
  const mark = () => (Date.now() - t0) / 1000;
  const r = await fn(page, mark);
  await page.close(); const vid = await page.video().path();
  return { vid, ...r };
}

// 1. Bấm đúp tra từ
await setSettings({ selectMode: 'off' });
scenes.push({ i: 0, url: 'dailyplanet.com/environment', ...await record(async (p, mark) => {
  await p.goto('https://news.example.com/cities-forests', { waitUntil: 'domcontentloaded' }); await sleep(1800);
  const ss = mark(); await p.mouse.move(300, 650); await sleep(300);
  const b = await p.locator('#w').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 }); await sleep(350);
  await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await sleep(4200);
  await p.mouse.move(b.x + b.width / 2 + 330, b.y + 120, { steps: 25 }); await sleep(1500);
  await p.screenshot({ path: articleShot });
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
// 2. Bôi đen câu → dịch + cấu trúc
await setSettings({ selectMode: 'auto' });
scenes.push({ i: 1, url: 'dailyplanet.com/environment', ...await record(async (p, mark) => {
  await p.goto('https://news.example.com/cities-forests', { waitUntil: 'domcontentloaded' }); await sleep(1800);
  const ss = mark(); const b = await p.locator('#s').boundingBox();
  await p.mouse.move(200, 700); await p.mouse.move(b.x + 1, b.y + 9, { steps: 25 }); await sleep(250);
  await p.mouse.down(); await p.mouse.move(b.x + b.width - 2, b.y + b.height - 9, { steps: 45 }); await p.mouse.up();
  await sleep(4800);
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
// 3. Popup (khung đứng 380×600 đặt trên ảnh trang mờ)
const popCtxPage = async () => { const p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 600 }); return p; };
{
  const page = await popCtxPage(); const t0 = Date.now(); const mark = () => (Date.now() - t0) / 1000;
  await page.goto(base + 'popup.html', { waitUntil: 'domcontentloaded' }); await sleep(1800);
  const ss = mark(); await page.mouse.move(330, 560); await sleep(300);
  const q = page.locator('#qCard'); if (await q.count()) { const b = await q.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 }); await sleep(400); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(1600); }
  const r = page.locator('#review'); { const b = await r.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 }); } await sleep(1500);
  const d = +(mark() - ss).toFixed(2); await page.close();
  scenes.push({ i: 2, popup: true, vid: await page.video().path(), ss, d });
}
// 4. Tab mới: lật thẻ → "Đã nhớ"
scenes.push({ i: 3, url: 'New Tab', ...await record(async (p, mark) => {
  await p.goto(base + 'newtab.html', { waitUntil: 'domcontentloaded' }); await sleep(1800);
  const ss = mark(); await p.mouse.move(640, 760); await sleep(300);
  const g = p.locator('#ntGood'); if (await g.isVisible()) { const b = await g.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 }); await sleep(500); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
  await sleep(2600);
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
// 5. Ứng dụng học: trang chủ, cuộn nhẹ
scenes.push({ i: 4, url: 'Lexkite', ...await record(async (p, mark) => {
  await p.goto(base + `app/index.html?hl=${LANG}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(3000);
  const ss = mark(); await p.mouse.move(700, 500, { steps: 20 }); await sleep(600);
  for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, 70); await sleep(180); } await sleep(1600);
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
await ctx.close();

// Ghép
const br = await chromium.launch(); const cp = await br.newPage({ viewport: { width: CW, height: CH }, deviceScaleFactor: 1 });
const parts = [];
const intro = path.join(TMP, 'intro.png');
await card(cp, intro, `<div class="center"><img src="${ICON}"><div class="n">lex<b>kite</b></div><h1>${T.intro[0]}</h1><p>${T.intro[1]}</p></div>`);
still(intro, 3.5, path.join(TMP, 'p0.mp4')); parts.push('p0.mp4');
const artB64 = fs.readFileSync(articleShot).toString('base64');
for (const [k, s] of scenes.entries()) {
  const bg = path.join(TMP, `bg${k}.png`);
  if (s.popup) {
    const extra = `<div style="position:absolute;left:720px;top:190px;width:1080px;border-radius:16px;overflow:hidden;opacity:.5;filter:blur(2px)"><img style="display:block;width:100%" src="data:image/png;base64,${artB64}"></div>`;
    const [kk, h, p] = T.s[s.i];
    await card(cp, bg, `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="txt"><span class="kick">${kk}</span><h1>${h}</h1><p>${p}</p></div>${extra}<div style="position:absolute;left:1070px;top:120px;width:456px;height:720px;border-radius:20px;box-shadow:0 50px 110px rgba(0,0,0,.55);background:#fff"></div>`);
    compose(bg, s.vid, s.ss, s.d, path.join(TMP, `p${k + 1}.mp4`), { x: 1070, y: 120, w: 456, h: 720 });
  } else {
    await card(cp, bg, sceneBg(s.i, s.url));
    compose(bg, s.vid, s.ss, s.d, path.join(TMP, `p${k + 1}.mp4`));
  }
  parts.push(`p${k + 1}.mp4`);
}
const outro = path.join(TMP, 'outro.png');
await card(cp, outro, `<div class="center"><img src="${ICON}"><h1>${T.outro[0]}</h1><div class="cws"><img src="${ICON}" style="width:44px;height:44px;border-radius:10px;box-shadow:none">Chrome Web Store</div><p style="margin-top:30px">${T.outro[1]}</p></div>`);
still(outro, 4, path.join(TMP, `p${parts.length}.mp4`)); parts.push(`p${parts.length}.mp4`);
await br.close();
fs.writeFileSync(path.join(TMP, 'list.txt'), parts.map(p => `file '${path.join(TMP, p)}'`).join('\n'));
const mp4 = path.join(OUT, `lexkite-promo-${LANG}.mp4`);
ff(['-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', mp4]);
// Ảnh bìa YouTube 1280×720
ff(['-i', intro, '-vf', 'scale=1280:720', path.join(OUT, `lexkite-thumb-${LANG}.jpg`)]);
console.log('✓', mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB', scenes.map(s => s.d).join(' + '));
