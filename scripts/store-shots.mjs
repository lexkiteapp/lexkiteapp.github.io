// Ảnh Chrome Web Store từ add-on THẬT (nạp extension/ vào Chromium): 5 ảnh 1280×800 (en + vi) + ô quảng cáo 440×280 & 1400×560.
// Thiết kế: nền xanh đậm thương hiệu, tiêu đề lớn có chữ nhấn, 3 lợi ích, ảnh thật trong khung trình duyệt. PNG 24-bit (không alpha).
// Chạy trên GitHub Actions (.github/workflows/store-shots.yml) – cần mạng để tra từ/dịch như người dùng thật.
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
const FONT = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';

// [nhãn nhỏ, tiêu đề (<em> = chữ nhấn), phụ đề, 3 lợi ích, địa chỉ trên thanh trình duyệt]
const CAP = {
  en: [
    ['On any website', 'Double-click.<br><em>Understand instantly.</em>', 'Pronunciation, meanings and examples right where you read.', ['British & American IPA + audio', 'Meanings by part of speech', 'Save with the original sentence'], 'dailyplanet.com/environment'],
    ['Translate & learn grammar', 'Select a sentence.<br><em>See how it works.</em>', 'Instant translation plus the grammar structures inside it.', ['Translate any selection', 'Grammar patterns explained', 'Listen at normal or slow speed'], 'dailyplanet.com/environment'],
    ['Toolbar popup', 'Your daily study,<br><em>one click away.</em>', 'Due cards, daily goal, quick lookup and a 1-minute review.', ['Cards due today at a glance', 'Quick review without leaving the page', 'Sync across devices (optional)'], ''],
    ['New tab', 'Learn a word<br><em>every new tab.</em>', 'A flashcard from your own deck each time you open a tab.', ['Words picked at the right moment', 'One tap: got it / review again', 'Turn off anytime'], 'New Tab'],
    ['Full study app included', 'Remember words<br><em>for good.</em>', 'FSRS spaced repetition plus IELTS & TOEIC practice – free.', ['FSRS reviews like Anki', '6,000+ words with audio', 'Practice tests with explanations'], 'Lexkite'],
  ],
  vi: [
    ['Trên mọi trang web', 'Bấm đúp vào từ.<br><em>Hiểu ngay lập tức.</em>', 'Phiên âm, phát âm, nghĩa và ví dụ ngay tại chỗ bạn đọc.', ['Phiên âm Anh–Anh & Anh–Mỹ', 'Nghĩa theo từ loại', 'Lưu kèm câu gốc'], 'dailyplanet.com/environment'],
    ['Dịch & học ngữ pháp', 'Bôi đen một câu.<br><em>Hiểu cả cấu trúc.</em>', 'Dịch tức thì, kèm giải thích các cấu trúc ngữ pháp trong câu.', ['Dịch mọi đoạn bôi đen', 'Giải thích cấu trúc ngữ pháp', 'Nghe tốc độ thường hoặc chậm'], 'dailyplanet.com/environment'],
    ['Cửa sổ tiện ích', 'Việc học mỗi ngày,<br><em>chỉ một cú bấm.</em>', 'Thẻ cần ôn, mục tiêu ngày, tra nhanh và ôn 1 phút.', ['Thấy ngay số thẻ cần ôn', 'Ôn nhanh không rời trang', 'Đồng bộ nhiều thiết bị (tùy chọn)'], ''],
    ['Tab mới', 'Mỗi tab mới,<br><em>thêm một từ.</em>', 'Một thẻ từ chính sổ của bạn mỗi lần mở tab.', ['Chọn từ đúng thời điểm vàng', 'Một chạm: đã nhớ / ôn lại', 'Tắt bất cứ lúc nào'], 'Tab mới'],
    ['Kèm ứng dụng học đầy đủ', 'Nhớ từ vựng<br><em>thật lâu.</em>', 'Lặp lại ngắt quãng FSRS, luyện IELTS & TOEIC – miễn phí.', ['Ôn FSRS như Anki', '6.000+ từ có phát âm', 'Đề luyện có giải thích'], 'Lexkite'],
  ],
};

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Why cities are planting forests</title>
<style>body{margin:0;font:19px/1.75 Georgia,serif;color:#23272a;background:#fbfaf7}nav{display:flex;gap:28px;align-items:center;padding:16px 56px;border-bottom:1px solid #e7e3da;font:600 14px Arial,sans-serif;color:#555}
nav b{font:800 22px Georgia,serif;color:#111;margin-right:24px;letter-spacing:-.02em}main{max-width:780px;margin:0 auto;padding:30px 32px}.k{font:700 12px Arial,sans-serif;color:#1F7A72;letter-spacing:.12em}
h1{font:700 40px/1.15 Georgia,serif;margin:6px 0 10px}.by{font:14px Arial,sans-serif;color:#888;margin-bottom:18px}.hero{height:70px;border-radius:10px;margin-bottom:18px;background:linear-gradient(120deg,#2f6b4f,#7fb069 55%,#d8e2a8)}</style></head>
<body><nav><b>The Daily Planet</b><span>World</span><span>Environment</span><span>Science</span><span>Cities</span></nav><main><div class="k">ENVIRONMENT</div><h1>Why cities are planting forests</h1><div class="by">By Clara Hughes · 6 min read</div><div class="hero"></div>
<p>Urban planners increasingly argue that trees are not decoration but infrastructure. Dense canopies can lower street temperatures by several degrees, improving the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>Critics point out that new trees take decades to mature, yet many councils now see green space as an essential part of climate adaptation rather than an optional extra.</p></main></body></html>`;

const BG = `background:radial-gradient(900px 500px at 92% -10%,rgba(255,176,84,.30),transparent 60%),radial-gradient(700px 500px at -10% 110%,rgba(31,122,114,.55),transparent 60%),linear-gradient(160deg,#0B3233,#0F3D3E 45%,#123f40);`;
const CSS = `*{box-sizing:border-box;margin:0}body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#fff;${BG}position:relative}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(90deg,#000,transparent 55%)}
.brand{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px;letter-spacing:-.02em}.brand img{width:44px;height:44px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.3)}.brand b{color:#FFB054}
.txt{position:absolute;left:64px;top:170px;width:400px}.kick{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:1px solid rgba(255,176,84,.35);padding:6px 12px;border-radius:99px}
h1{font-size:46px;line-height:1.08;font-weight:800;letter-spacing:-.03em;margin-top:22px}h1 em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
p.sub{font-size:19px;line-height:1.5;color:rgba(255,255,255,.78);margin-top:18px}ul{list-style:none;padding:0;margin-top:28px;display:grid;gap:14px}li{display:flex;gap:12px;align-items:center;font-size:17px;font-weight:600}
li i{flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#FFB054,#F2553B);display:grid;place-items:center;font-style:normal;font-size:14px;color:#0F3D3E;font-weight:800}
.win{position:absolute;right:48px;top:92px;width:752px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 40px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
.bar{height:38px;background:#eef1f0;display:flex;align-items:center;gap:8px;padding:0 14px}.bar span{width:11px;height:11px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}
.bar div{margin-left:14px;flex:1;height:24px;border-radius:7px;background:#fff;color:#5b6b6a;font:500 12.5px system-ui,sans-serif;display:flex;align-items:center;padding:0 12px;gap:8px}.bar div:before{content:"🔒";font-size:10px}
.win img{display:block;width:100%}
.pop{position:absolute;right:150px;top:70px;width:380px;border-radius:16px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.1)}.pop img{display:block;width:100%}
.back{position:absolute;right:48px;top:150px;width:700px;border-radius:14px;overflow:hidden;opacity:.55;filter:blur(1.5px) saturate(.8);box-shadow:0 30px 60px rgba(0,0,0,.4)}.back img{display:block;width:100%}
.glow{position:absolute;right:120px;bottom:-140px;width:520px;height:320px;background:radial-gradient(closest-side,rgba(242,85,59,.35),transparent);filter:blur(10px)}`;

async function frame(page, lang, i, shot, popup = null) {
  const [kick, title, sub, pts, url] = CAP[lang][i];
  const img = 'data:image/png;base64,' + shot.toString('base64');
  const visual = popup
    ? `<div class="back"><img src="data:image/png;base64,${popup.toString('base64')}"></div><div class="pop"><img src="${img}"></div>`
    : `<div class="win"><div class="bar"><span></span><span></span><span></span><div>${url}</div></div><img src="${img}"></div>`;
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${CSS}</style></head><body><div class="glow"></div>
    <div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>
    <div class="txt"><span class="kick">${kick}</span><h1>${title}</h1><p class="sub">${sub}</p><ul>${pts.map(x => `<li><i>✓</i>${x}</li>`).join('')}</ul></div>${visual}</body></html>`);
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  await page.screenshot({ path: `${OUT}/${lang}-${i + 1}.png`, clip: { x: 0, y: 0, width: W, height: H } });
}

async function run(lang) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: true, locale: lang, viewport: { width: 880, height: 660 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`],
  });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host, base = `chrome-extension://${id}/`;
  const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
  await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), lang);
  await sleep(1500);
  for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {}); // trang chào mừng tự mở khi cài

  // Dữ liệu mẫu (thẻ, chuỗi ngày) qua app trong add-on – dùng chung chrome.storage với popup, tab mới, trang web
  const app = await ctx.newPage();
  await app.goto(base + `app/index.html?demo=1&hl=${lang}#/home`); await sleep(5000);
  await app.goto(base + `app/index.html?hl=${lang}#/home`); await sleep(3500);
  const appShot = await app.screenshot();
  const page = await ctx.newPage();
  await page.route('https://news.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));

  // 1. Bấm đúp tra từ (tắt nút 🌐 của vùng chọn để ảnh gọn)
  await setSettings({ selectMode: 'off', markKnown: false, markAcademic: false });
  await page.goto('https://news.example.com/cities-forests'); await sleep(2500);
  await page.dblclick('#w'); await sleep(14000); // chờ bảng tra tải xong (nghĩa, ảnh, ví dụ)
  const s1 = await page.screenshot();
  // 2. Bôi đen câu → tự dịch
  await setSettings({ selectMode: 'auto' });
  await page.goto('https://news.example.com/cities-forests'); await sleep(2500);
  const b = await page.locator('#s').boundingBox();
  await page.mouse.move(b.x + 1, b.y + 6); await page.mouse.down(); await page.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 12 }); await page.mouse.up();
  await sleep(14000);
  const s2 = await page.screenshot();
  // 3. Popup – kích thước thật
  const pop = await ctx.newPage(); await pop.setViewportSize({ width: 380, height: 600 });
  await pop.goto(base + 'popup.html'); await sleep(2500);
  const s3 = await pop.screenshot();
  // 4. Tab mới
  const nt = await ctx.newPage(); await nt.setViewportSize({ width: 880, height: 660 });
  await nt.goto(base + 'newtab.html'); await sleep(2500);
  const s4 = await nt.screenshot();

  await ctx.close();
  // Ghép khung ở trình duyệt riêng tỉ lệ 1× → ảnh ra đúng 1280×800 (ảnh chụp 2× nên vẫn nét)
  const br = await chromium.launch(), out = await br.newPage({ deviceScaleFactor: 1 });
  await frame(out, lang, 0, s1); await frame(out, lang, 1, s2); await frame(out, lang, 2, s3, s1);
  await frame(out, lang, 3, s4); await frame(out, lang, 4, appShot);
  await br.close();
  return s1;
}

async function promos(shot) {
  const br = await chromium.launch();
  const p = await br.newPage();
  const card = `<div class="wc"><div class="w">resilience <span>/rɪˈzɪliəns/</span></div><div class="m"><b>noun</b> the capacity to recover quickly from difficulties</div><div class="btn">+ Save flashcard</div></div>`;
  const small = `<body class="s"><div class="l"><img src="${ICON}"><div class="n">lex<b>kite</b></div></div><div class="t">Double-click any word.<br><em>Learn it for good.</em></div>${card}</body>`;
  const img = 'data:image/png;base64,' + shot.toString('base64');
  const big = `<body class="b"><div class="txt"><div class="l"><img src="${ICON}"><div class="n">lex<b>kite</b></div></div><h1>Learn English words<br><em>while you browse.</em></h1>
    <p>Double-click to look up · Save with context · Remember with FSRS</p><div class="tags"><span>Free</span><span>15 languages</span><span>IELTS · TOEIC</span></div></div>
    <div class="win"><div class="bar"><span></span><span></span><span></span></div><img src="${img}"></div></body>`;
  const css = `*{margin:0;box-sizing:border-box}body{font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#fff;overflow:hidden;position:relative;${BG}}
    em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
    .l{display:flex;align-items:center;gap:10px}.l img{border-radius:22%;box-shadow:0 8px 20px rgba(0,0,0,.35)}.n{font-weight:800;letter-spacing:-.03em}.n b{color:#FFB054}
    .s{width:440px;height:280px;padding:26px 28px}.s .l img{width:42px;height:42px}.s .n{font-size:28px}.s .t{font-size:24px;font-weight:800;line-height:1.15;letter-spacing:-.02em;margin-top:18px;width:250px}
    .wc{position:absolute;right:-18px;bottom:26px;width:200px;background:#fff;color:#1c2b2b;border-radius:14px;padding:12px 14px;box-shadow:0 18px 40px rgba(0,0,0,.4);transform:rotate(-4deg)}
    .wc .w{font-weight:800;font-size:16px}.wc .w span{font-weight:500;font-size:11px;color:#1F7A72}.wc .m{font-size:11px;line-height:1.35;margin-top:6px;color:#44524f}.wc .m b{color:#F2553B}.wc .btn{margin-top:8px;display:inline-block;background:#E5502F;color:#fff;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:7px}
    .b{width:1400px;height:560px}.b .txt{position:absolute;left:80px;top:70px;width:560px}.b .l img{width:56px;height:56px}.b .n{font-size:34px}
    .b h1{font-size:54px;line-height:1.06;letter-spacing:-.035em;font-weight:800;margin-top:34px}.b p{font-size:20px;color:rgba(255,255,255,.8);margin-top:20px}
    .tags{display:flex;gap:10px;margin-top:26px}.tags span{font-size:15px;font-weight:700;padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}
    .win{position:absolute;right:70px;top:60px;width:640px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 40px 80px rgba(0,0,0,.5)}.win img{display:block;width:100%}
    .bar{height:30px;background:#eef1f0;display:flex;align-items:center;gap:7px;padding:0 12px}.bar span{width:10px;height:10px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}`;
  for (const [w, h, f, body] of [[440, 280, 'promo-440x280', small], [1400, 560, 'promo-1400x560', big]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${css}</style></head>${body}</html>`);
    await p.evaluate(() => document.fonts.ready); await sleep(400);
    await p.screenshot({ path: `${OUT}/${f}.png` });
  }
  await br.close();
}

const enShot = await run('en');
await run('vi');
await promos(enShot);
console.log('✓', fs.readdirSync(OUT).join(' '));
