// Bộ media Chrome Web Store (video giới thiệu 1080p + 5 ảnh 1280×800 + ô 440×280) từ add-on THẬT, chỉ tiếng Anh.
// Quay bằng CDP screencast ở deviceScaleFactor 3 (viewport 960×540 → khung 2880×1620) rồi ffmpeg thu nhỏ/zoom → chữ sắc nét.
// Chạy trên GitHub Actions (.github/workflows/cws-media.yml): node scripts/cws-media.mjs <thư-mục-ra>. Màu thương hiệu lấy từ web/js/kit.js.
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

const OUT = path.resolve(process.argv[2] || 'cws-media');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cwsm-'));
const EXT = path.resolve('extension');
const VW = 960, VH = 540, DSF = 3, CW = 1920, CH = 1080, FPS = 30;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const ff = a => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';
const FF = '"Be Vietnam Pro","Noto Sans",system-ui,sans-serif';

const art = (title, kick, body, accent = '#1F7A72', font = 'Georgia,serif') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;font:19px/1.7 ${font};color:#23272a;background:#fbfaf7}nav{display:flex;gap:22px;align-items:center;padding:12px 40px;border-bottom:1px solid #e7e3da;font:600 13px Arial,sans-serif;color:#555}
nav b{font:800 20px ${font};color:#111;margin-right:18px}main{max-width:700px;margin:0 auto;padding:22px 24px}.k{font:700 12px Arial,sans-serif;color:${accent};letter-spacing:.12em}
h1{font:700 34px/1.15 ${font};margin:6px 0 8px}.by{font:13px Arial,sans-serif;color:#888;margin-bottom:12px}.hero{height:56px;border-radius:10px;margin-bottom:14px;background:linear-gradient(120deg,${accent},#8fc7b4 60%,#e5efc4)}p{margin:0 0 12px}</style></head>
<body><nav><b>${title.split(' ')[0]} Daily</b><span>World</span><span>Science</span><span>Culture</span><span>Opinion</span></nav><main><div class="k">${kick}</div><h1>${title}</h1><div class="by">By Clara Hughes · 6 min read</div><div class="hero"></div>${body}</main></body></html>`;
const PAGES = {
  '/a': art('Why cities are planting forests', 'ENVIRONMENT', `<p>Urban planners increasingly argue that trees are not decoration but infrastructure. Dense canopies can lower street temperatures by several degrees, improving the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p><p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p><p>Critics point out that new trees take decades to mature.</p>`),
  '/docs': art('Getting started with sourdough', 'GUIDES', `<p>A healthy starter should <span id="w">double</span> in size within a few hours of feeding, and smell pleasantly tangy rather than sharp.</p><p>Keep the dough warm and be patient: fermentation is what builds flavour.</p>`, '#B4532A', 'system-ui,sans-serif'),
  '/forum': art('How do you stay consistent with learning?', 'COMMUNITY', `<p>Honestly, the most <span id="w">sustainable</span> habit for me was reading something short every morning, no matter what.</p><p>Small steps beat heroic sprints every single time.</p>`, '#3B5BA9', 'Verdana,sans-serif'),
};
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(PAGES[q.url.split('?')[0]] || PAGES['/a']); });
await new Promise(r => srv.listen(8765, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8765';

const CURSOR = `(() => { const add = () => { if (document.getElementById('lk-cur')) return; const c = document.createElement('div'); c.id = 'lk-cur';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  c.style.cssText = 'position:fixed;left:-50px;top:-50px;z-index:2147483647;pointer-events:none;transition:transform .12s;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', e => { c.style.left = e.clientX - 4 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.8)'; }, true); addEventListener('mouseup', () => { c.style.transform = ''; }, true); };
  if (document.documentElement) add(); document.addEventListener('DOMContentLoaded', add); })();`;

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
const ctx = await chromium.launchPersistentContext(prof, {
  channel: 'chromium', headless: true, locale: 'es-ES', viewport: { width: VW, height: VH }, deviceScaleFactor: DSF,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--lang=es-ES'],
});
await ctx.addInitScript(CURSOR);
async function go(page, url) {
  for (let i = 0; i < 3; i++) {
    try { await page.goto(url, { waitUntil: 'commit', timeout: 20000 }); await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); return; }
    catch (e) { if (i === 2) throw e; await page.goto('about:blank').catch(() => {}); await sleep(1500); }
  }
}
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
await sw.evaluate(() => chrome.storage.local.set({ uiLang: 'en' }));
await sleep(1500);
for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {});

// Làm nóng bộ đệm tra từ/dịch + nạp thẻ mẫu (demo=1)
{
  const w = await ctx.newPage();
  try {
    await go(w, base + 'app/index.html?demo=1&hl=en#/home'); await sleep(5000);
    await setSettings({ selectMode: 'off', markKnown: false, markAcademic: false });
    for (const u of ['/a', '/docs', '/forum']) { await go(w, SITE + u); await sleep(1500); await w.dblclick('#w'); await sleep(7000); }
    await setSettings({ selectMode: 'auto' });
    await go(w, SITE + '/a'); await sleep(1500);
    const b = await w.locator('#s').boundingBox(); await w.mouse.move(b.x + 1, b.y + 8); await w.mouse.down(); await w.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 10 }); await w.mouse.up(); await sleep(8000);
  } catch (e) { console.log('⚠ làm nóng:', e.message.split('\n')[0]); }
  await w.close().catch(() => {});
}

// ---- Quay 1 cảnh bằng screencast → mp4 2880×1620 (khung theo dấu thời gian thật)
const clips = [];
async function record(name, fn) {
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const dir = path.join(TMP, name); fs.mkdirSync(dir); const frames = [];
  cdp.on('Page.screencastFrame', f => { const i = frames.length; fs.writeFileSync(path.join(dir, `${i}.jpg`), Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  const info = {};
  await fn(page, async () => { // bắt đầu quay (sau khi trang đã tải)
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VW * DSF, maxHeight: VH * DSF, everyNthFrame: 1 }); await sleep(250);
  }, info);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await page.close();
  if (frames.length < 2) throw new Error('screencast ít khung: ' + name);
  let list = '';
  frames.forEach((t, i) => { const d = i + 1 < frames.length ? frames[i + 1] - t : 0.4; list += `file '${dir}/${i}.jpg'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`; });
  list += `file '${dir}/${frames.length - 1}.jpg'\n`;
  fs.writeFileSync(path.join(dir, 'l.txt'), list);
  const raw = path.join(TMP, name + '.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'l.txt'), '-vf', `fps=${FPS},scale=${VW * DSF}:${VH * DSF}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', raw]);
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', raw], { encoding: 'utf8' });
  clips.push({ name, raw, dur, ...info });
  console.log('  clip', name, dur.toFixed(1) + 's', frames.length, 'khung');
}
const popupBox = p => p.evaluate(() => { const h = document.querySelector('ielts-lexi-popup'), b = h && h.shadowRoot && h.shadowRoot.querySelector('.box'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).catch(() => null);
const moveTo = async (p, sel, steps = 28) => { const b = await p.locator(sel).first().boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps }); return b; };

const dbl = async (p, url, cap) => { // bấm đúp #w → bảng tra; trả về camera (zoom vào bảng)
  await go(p, SITE + url); await sleep(1500);
};
await setSettings({ selectMode: 'off' });
await record('word', async (p, start, info) => {
  await dbl(p, '/a'); await p.mouse.move(120, 460); await start();
  await sleep(500); const b = await moveTo(p, '#w'); await sleep(350); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await sleep(2800);
  const cb = await popupBox(p); info.cam = cb ? { z: 1.5, cx: (cb.x + cb.w / 2) / VW, cy: Math.min(.62, (cb.y + cb.h / 2) / VH), t0: 2.0, t1: 3.1 } : null;
  const spk = p.locator('ielts-lexi-popup .spk[data-acc="en-GB"]'); if (await spk.count()) { await moveTo(p, 'ielts-lexi-popup .spk[data-acc="en-GB"]', 15); await sleep(300); await spk.first().click().catch(() => {}); }
  await sleep(3200);
  await p.screenshot({ path: path.join(TMP, 'word-full.png') });
  if (cb) await p.screenshot({ path: path.join(TMP, 'card.png'), clip: { x: Math.max(0, cb.x - 10), y: Math.max(0, cb.y - 10), width: cb.w + 20, height: cb.h + 20 } });
});
await setSettings({ selectMode: 'auto' });
await record('sentence', async (p, start, info) => {
  await go(p, SITE + '/a'); await sleep(1500); await p.mouse.move(120, 470); await start(); await sleep(400);
  const b = await p.locator('#s').boundingBox(); await p.mouse.move(b.x + 1, b.y + 9, { steps: 20 }); await sleep(250);
  await p.mouse.down(); await p.mouse.move(b.x + b.width - 2, b.y + b.height - 9, { steps: 40 }); await p.mouse.up(); await sleep(3000);
  info.cam = { z: 1.35, cx: .5, cy: .5, t0: 2.0, t1: 3.2 };
  await sleep(2600); await p.screenshot({ path: path.join(TMP, 'sentence-full.png') });
});
await setSettings({ selectMode: 'off' });
await record('save', async (p, start, info) => {
  await go(p, SITE + '/a'); await sleep(1500); await p.mouse.move(120, 470); await start(); await sleep(400);
  const b = await moveTo(p, '#w'); await sleep(250); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await sleep(2400);
  const cb = await popupBox(p); info.cam = cb ? { z: 1.5, cx: (cb.x + cb.w / 2) / VW, cy: Math.min(.62, (cb.y + cb.h / 2) / VH), t0: 0.9, t1: 1.9 } : null;
  if (await p.locator('ielts-lexi-popup #save').count()) { await moveTo(p, 'ielts-lexi-popup #save', 20); await sleep(400); await p.locator('ielts-lexi-popup #save').click().catch(() => {}); }
  await sleep(2600);
});
await record('review', async (p, start, info) => {
  await go(p, base + 'newtab.html'); await sleep(2500); await p.mouse.move(480, 500); await start(); await sleep(900);
  const flip = p.locator('#ntCard, .nt-card, .card').first(); if (await flip.count() && await flip.isVisible()) { await moveTo(p, '#ntCard, .nt-card, .card', 25); await sleep(300); await p.mouse.click(480, 270); await sleep(1400); }
  if (await p.locator('#ntGood').isVisible().catch(() => false)) { await moveTo(p, '#ntGood', 25); await sleep(400); await p.locator('#ntGood').click().catch(() => {}); }
  await sleep(1800); await p.screenshot({ path: path.join(TMP, 'review-full.png') });
});
for (const [n, u] of [['site1', '/docs'], ['site2', '/forum']]) {
  await record(n, async (p, start, info) => {
    await go(p, SITE + u); await sleep(1500); await p.mouse.move(120, 470); await start(); await sleep(300);
    const b = await moveTo(p, '#w', 22); await sleep(200); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await sleep(2400);
    const cb = await popupBox(p); info.cam = cb ? { z: 1.25, cx: (cb.x + cb.w / 2) / VW, cy: .5, t0: 1.0, t1: 2.0 } : null;
    await sleep(900);
  });
}
// Ảnh app (cho ảnh cửa hàng 5): trang chủ ứng dụng ở chế độ demo
{
  const p = await ctx.newPage(); await go(p, base + 'app/index.html?demo=1&hl=en#/home'); await sleep(4000); await p.screenshot({ path: path.join(TMP, 'app-full.png') }); await p.close();
}
// Popup thanh công cụ (380×600)
{
  const p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 600 }); await go(p, base + 'popup.html'); await sleep(2500); await p.screenshot({ path: path.join(TMP, 'popup-full.png') }); await p.close();
}
await ctx.close(); srv.close();

// ---- Thẻ chữ (PNG trong suốt hoặc nền thương hiệu) bằng Chromium thường
const br = await chromium.launch(); const cp = await br.newPage({ viewport: { width: CW, height: CH }, deviceScaleFactor: 1 });
const BG = `radial-gradient(1300px 700px at 92% -10%,rgba(255,176,84,.32),transparent 60%),radial-gradient(1000px 700px at -10% 110%,rgba(31,122,114,.6),transparent 60%),linear-gradient(160deg,#0B3233,#0F3D3E 45%,#123f40)`;
const CSS = `*{box-sizing:border-box;margin:0}body{width:${CW}px;height:${CH}px;overflow:hidden;font-family:${FF};color:#fff;position:relative}em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{position:absolute;left:56px;top:40px;display:flex;align-items:center;gap:14px;font-weight:800;font-size:34px;letter-spacing:-.02em;background:rgba(11,50,51,.78);padding:10px 22px 10px 12px;border-radius:99px}.brand img{width:46px;height:46px;border-radius:12px}.brand b{color:#FFB054}
.cap{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);white-space:nowrap;font-weight:800;font-size:64px;letter-spacing:-.02em;padding:18px 44px;border-radius:26px;background:rgba(11,50,51,.88);box-shadow:0 14px 40px rgba(0,0,0,.35);border:2px solid rgba(255,176,84,.45)}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 120px}.center img.i{width:150px;height:150px;border-radius:34px;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.center h1{font-size:112px;line-height:1.05;font-weight:800;letter-spacing:-.035em;margin-top:34px}.center p{font-size:44px;font-weight:600;color:rgba(255,255,255,.85);margin-top:28px}
.cws{margin-top:48px;display:inline-flex;align-items:center;gap:18px;background:#fff;color:#0F3D3E;font-size:48px;font-weight:800;padding:24px 48px;border-radius:999px;box-shadow:0 20px 40px rgba(0,0,0,.35)}.cws img{width:60px;height:60px;border-radius:14px}`;
async function card(file, body, bg = true, w = CW, h = CH) {
  await cp.setViewportSize({ width: w, height: h });
  await cp.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${CSS}body{${bg ? 'background:' + BG : 'background:transparent'};width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`);
  await cp.evaluate(() => document.fonts.ready); await sleep(300);
  await cp.screenshot({ path: file, omitBackground: !bg });
}
const brand = `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>`;
const CAPS = { word: 'Double-click any word', sentence: 'Highlight a sentence to translate', save: 'Save to flashcards, with context', review: 'Quick spaced-repetition review', site1: 'Works on any website', site2: 'Any site, same one click' };
for (const [k, t] of Object.entries(CAPS)) await card(path.join(TMP, `cap-${k}.png`), brand + `<div class="cap">${t}</div>`, false);
await card(path.join(TMP, 'hook.png'), `<div class="center"><h1>Understand any English word<br>in <em>1 click</em></h1><p>Stop copy-pasting into a translator.</p></div>`);
await card(path.join(TMP, 'cta.png'), `<div class="center"><img class="i" src="${ICON}"><h1>lex<em>kite</em></h1><div class="cws">Add to Chrome – Free</div><p>Pronunciation · Translation · Flashcards</p></div>`);

// ---- Dựng video: mỗi cảnh = zoom/pan mượt + chú thích
const sm = '(3*p*p-2*p*p*p)';
function sceneMp4(c) {
  const out = path.join(TMP, c.name + '.final.mp4'); const d = c.dur;
  const cam = c.cam || { z: 1, cx: .5, cy: .5, t0: 0, t1: 1 };
  const p = `clip((t-${cam.t0})/${cam.t1 - cam.t0},0,1)`;
  const z = `(1+${cam.z - 1}*(3*pow(${p},2)-2*pow(${p},3)))`;
  const cx = `(0.5+${cam.cx - .5}*(3*pow(${p},2)-2*pow(${p},3)))`, cy = `(0.5+${cam.cy - .5}*(3*pow(${p},2)-2*pow(${p},3)))`;
  // nguồn 2880×1620 → phóng tới 1920·z rồi cắt 1920×1080 quanh (cx,cy); ở z=1 ≈ thu nhỏ nguyên khung
  const fc = `[0:v]scale=w='trunc(${CW}*${z}/2)*2':h='trunc(${CH}*${z}/2)*2':eval=frame:flags=lanczos,crop=${CW}:${CH}:x='clip(${cx}*iw-${CW / 2},0,iw-${CW})':y='clip(${cy}*ih-${CH / 2},0,ih-${CH})'[v];[v][1:v]overlay=0:0:format=auto,fps=${FPS},format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=${(d - 0.3).toFixed(2)}:d=0.3[o]`;
  ff(['-i', c.raw, '-loop', '1', '-t', String(d), '-i', path.join(TMP, `cap-${c.name}.png`), '-filter_complex', fc, '-map', '[o]', '-t', String(d), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-an', out]);
  return out;
}
function stillMp4(png, d, out) {
  const n = Math.round(d * FPS);
  ff(['-loop', '1', '-i', png, '-t', String(d), '-vf', `scale=${CW * 2}:${CH * 2},zoompan=z='1+0.04*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${CW}x${CH}:fps=${FPS},format=yuv420p,fade=t=out:st=${(d - 0.3).toFixed(2)}:d=0.3`, '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', out]);
}
const order = ['word', 'sentence', 'save', 'review', 'site1', 'site2'];
const parts = [];
stillMp4(path.join(TMP, 'hook.png'), 2.2, path.join(TMP, 'p-hook.mp4')); parts.push('p-hook.mp4');
for (const n of order) { const c = clips.find(x => x.name === n); c.dur = Math.min(c.dur, n.startsWith('site') ? 3.6 : 8.5); parts.push(path.basename(sceneMp4(c))); }
stillMp4(path.join(TMP, 'cta.png'), 4.5, path.join(TMP, 'p-cta.mp4')); parts.push('p-cta.mp4');
fs.writeFileSync(path.join(TMP, 'list.txt'), parts.map(p => `file '${path.join(TMP, p)}'`).join('\n'));
const silent = path.join(TMP, 'silent.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-c', 'copy', silent]);
const total = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', silent], { encoding: 'utf8' });
// Nhạc nền: chỉ dùng bản có giấy phép rõ (brand/audio/promo-music.mp3, ghi nguồn trong docs/CWS-RULES.md §6); không có → tiếng lặng
// (anh chủ thêm nhạc YouTube Audio Library trong YouTube Studio → Trình chỉnh sửa). Bỏ hợp âm sin tự tạo (khó chịu, 27/10).
const MUSIC = 'brand/audio/promo-music.mp3', hasMusic = fs.existsSync(MUSIC);
ff([...(hasMusic ? ['-stream_loop', '-1', '-i', MUSIC] : ['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`]),
  '-i', silent, '-filter_complex', `[0:a]volume=${hasMusic ? '-18dB' : '0dB'},afade=t=in:d=2,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[a]`, '-map', '1:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', '-shortest', path.join(OUT, 'promo.mp4')]);
// Bản dọc/điện thoại < 30 MB: 1280×720 CRF cao hơn
ff(['-i', path.join(OUT, 'promo.mp4'), '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-maxrate', '5M', '-bufsize', '10M', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(OUT, 'promo-phone.mp4')]);
console.log('✓ promo', total.toFixed(1) + 's', (fs.statSync(path.join(OUT, 'promo.mp4')).size / 1048576).toFixed(1) + ' MB');

// ---- 5 ảnh 1280×800 + ô 440×280 (ảnh thật chụp ở DSF 3, thu nhỏ trong khung)
const SW = 1280, SH = 800;
const SCSS = `*{box-sizing:border-box;margin:0}body{width:${SW}px;height:${SH}px;overflow:hidden;font-family:${FF};color:#fff;background:${BG};position:relative}em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px}.brand img{width:44px;height:44px;border-radius:12px}.brand b{color:#FFB054}
.txt{position:absolute;left:64px;top:190px;width:410px}.kick{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:1px solid rgba(255,176,84,.35);padding:6px 12px;border-radius:99px}
h1{font-size:50px;line-height:1.07;font-weight:800;letter-spacing:-.03em;margin-top:22px}p{font-size:21px;line-height:1.5;color:rgba(255,255,255,.82);margin-top:20px}
.win{position:absolute;right:44px;top:96px;width:720px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 40px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08)}.win img{display:block;width:100%}
.bar{height:34px;background:#eef1f0;display:flex;align-items:center;gap:7px;padding:0 12px}.bar span{width:10px;height:10px;border-radius:50%;background:#ff5f57}.bar span:nth-child(2){background:#febc2e}.bar span:nth-child(3){background:#28c840}
.pop{position:absolute;right:44px;top:80px;max-width:720px;border-radius:16px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.1)}.pop img{display:block;max-width:720px;max-height:640px;width:auto;height:auto}`;
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(TMP, f)).toString('base64');
const win = f => `<div class="win"><div class="bar"><span></span><span></span><span></span></div><img src="${b64(f)}"></div>`;
const SHOTS = [
  ['Free for Chrome', 'Understand any word <em>in 1 click</em>', 'Double-click on any website for meaning, IPA, UK/US audio and translation.', win('word-full.png')],
  ['Dictionary popup', 'Meaning, sound, <em>translation</em>', 'Everything you need appears right where you read. No tab switching.', `<div class="pop"><img src="${b64('card.png')}"></div>`],
  ['Sentence translate', 'Highlight a sentence. <em>Get it.</em>', 'Instant translation of any selection, with the grammar explained.', win('sentence-full.png')],
  ['Flashcards & review', 'Save once. <em>Remember for good.</em>', 'Words are saved with their context and reviewed with spaced repetition (FSRS).', win('review-full.png')],
  ['Your study, one click away', 'Free. Private. <em>15 languages.</em>', 'No account needed. Your words stay in your browser.', `<div class="pop"><img src="${b64('popup-full.png')}"></div>`],
];
const sp = await br.newPage({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 });
for (const [i, [k, h, sub, vis]] of SHOTS.entries()) {
  await sp.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${SCSS}</style></head><body><div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="txt"><span class="kick">${k}</span><h1>${h}</h1><p>${sub}</p></div>${vis}</body></html>`);
  await sp.evaluate(() => document.fonts.ready); await sleep(300);
  await sp.screenshot({ path: path.join(OUT, 'shots', `${i + 1}.png`) });
}
await card(path.join(OUT, 'tile.png'), `<div class="center" style="padding:0 30px"><img class="i" src="${ICON}" style="width:70px;height:70px;border-radius:16px"><h1 style="font-size:42px;margin-top:14px">Understand any word<br>in <em>1 click</em></h1><p style="font-size:18px;margin-top:10px">Free Chrome dictionary &amp; flashcards</p></div>`, true, 440, 280);
// Ảnh thumbnail YouTube 1280×720: hook lớn bên trái + bảng tra thật bên phải + nhãn FREE (27/10)
{ const tp = await br.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await tp.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${SCSS}body{width:1280px;height:720px}
.t{position:absolute;left:60px;top:150px;width:560px}.t h1{font-size:104px;line-height:.95;letter-spacing:-.04em;margin:0;text-transform:uppercase}.t p{font-size:30px;font-weight:700;margin-top:26px;color:#fff}
.pop{right:40px;top:70px;transform:rotate(2deg)}.pop img{max-width:600px;max-height:560px}.free{position:absolute;right:30px;top:24px;background:#F2553B;color:#fff;font-weight:900;font-size:46px;padding:10px 30px;border-radius:18px;transform:rotate(6deg);box-shadow:0 14px 30px rgba(0,0,0,.4)}</style></head>
<body><div class="brand" style="top:44px"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="t"><h1>Double-click<br><em>any word</em></h1><p>Meaning · IPA · translation</p></div><div class="pop"><img src="${b64('card.png')}"></div><div class="free">FREE</div></body></html>`);
  await tp.evaluate(() => document.fonts.ready); await sleep(300);
  await tp.screenshot({ path: path.join(OUT, 'thumbnail.png') }); }
await br.close();
// contact sheet
ff(['-i', path.join(OUT, 'promo.mp4'), '-vf', 'fps=1/4.5,scale=480:-1,tile=4x3:padding=6:color=black', '-frames:v', '1', '-update', '1', path.join(TMP, 'cs1.jpg')]);
ff(['-i', path.join(OUT, 'shots', '%d.png'), '-vf', 'scale=480:-1,tile=3x2:padding=6:color=black', '-frames:v', '1', '-update', '1', path.join(TMP, 'cs2.jpg')]);
ff(['-i', path.join(TMP, 'cs1.jpg'), '-i', path.join(TMP, 'cs2.jpg'), '-filter_complex', '[0:v]scale=1920:-2[a];[1:v]scale=1920:-2[b];[a][b]vstack=inputs=2', '-q:v', '3', path.join(OUT, 'contact-sheet.jpg')]);
for (const f of fs.readdirSync(path.join(OUT, 'shots'))) console.log(f, (fs.statSync(path.join(OUT, 'shots', f)).size / 1024).toFixed(0) + ' KB');
console.log('✓ xong', OUT);
