// Video giới thiệu add-on (≈40 giây, 1920×1080, MP4) quay từ add-on THẬT – dùng cho Chrome Web Store (ô Promo video) & YouTube.
// Mỗi cảnh: quay trang thật (Playwright recordVideo, con trỏ giả để người xem thấy thao tác) → ghép lên nền thương hiệu bằng ffmpeg.
// MODE=app → video xem trước ứng dụng (xem khối MODE=app bên dưới): MODE=app BASE=http://localhost:8080/ node scripts/store-video.mjs <out>
// Chạy trên GitHub Actions (.github/workflows/store-video.yml). Dùng: LANG_V=en node scripts/store-video.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { createRequire } from 'module';
import { CAP, VIDEO } from './store-copy.mjs';

const OUT = path.resolve(process.argv[2] || 'store-video');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lkv-'));
const EXT = path.resolve('extension');
const MODE = process.env.MODE || 'addon';
const LANG = process.env.LANG_V || 'en';
const LOCALE = { en: 'es-ES', pt: 'pt-BR', zh: 'zh-CN' }[LANG] || LANG; // en: minh họa dịch EN → ES
const VW = 1280, VH = 800, CW = 1920, CH = 1080, FPS = 30;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';
// Mở trang có thử lại: điều hướng đôi khi treo trên runner CI (trang mẫu qua ctx.route / trang add-on) → 3 lần × 20 giây
async function go(page, url) {
  for (let i = 0; i < 3; i++) {
    try { await page.goto(url, { waitUntil: 'commit', timeout: 20000 }); await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); return; }
    catch (e) { if (i === 2) throw e; await page.goto('about:blank').catch(() => {}); await sleep(1500); }
  }
}
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const T = { ...VIDEO[LANG], s: CAP[LANG].map(([k, h, p]) => [k, h, p]) };

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
const BASE_CSS = `*{box-sizing:border-box;margin:0}body{width:${CW}px;height:${CH}px;overflow:hidden;font-family:"Be Vietnam Pro","Noto Sans","Noto Sans Arabic","Noto Sans Devanagari","Noto Sans Thai","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;${BG}position:relative}
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
const sceneBg = (i, url, extra = '') => { const [k, h, p] = T.s[i]; return `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="txt"${LANG === 'ar' ? ' dir="rtl" style="text-align:right"' : ''}><span class="kick">${k}</span><h1>${h}</h1><p>${p}</p></div>${extra}<div class="win"><div class="bar"><span></span><span></span><span></span><div>🔒 ${url}</div></div></div>`; };

// Ghép 1 cảnh: nền PNG + đoạn video [ss, ss+d] đặt vào khung, mờ dần đầu/cuối
// Bản ghi Playwright luôn 1280×800; phần trang thật nằm góc trên-trái, phần thừa đệm màu xám (~134,132,130) → dò từ 1 khung giữa đoạn
function contentBox(vid, ss, d) {
  const buf = execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', String(ss + d / 2), '-i', vid, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
  const px = (x, y) => { const i = (y * VW + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
  const pad = ([r, g, b]) => Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 105 && r < 165;
  const rowPad = y => { let n = 0; for (let x = 0; x < VW; x += 8) n += pad(px(x, y)); return n / (VW / 8) > 0.97; };
  const colPad = x => { let n = 0; for (let y = 0; y < VH; y += 8) n += pad(px(x, y)); return n / (VH / 8) > 0.97; };
  let h = VH; while (h > 100 && rowPad(h - 1)) h--;
  let w = VW; while (w > 100 && colPad(w - 1)) w--;
  return [w - (w % 2), h - (h % 2)];
}
function compose(bg, vid, ss, d, out, box = WIN, vp = [VW, VH], fit = false) { // fit: thu vừa khung (popup) thay vì phủ kín rồi cắt
  let [cw, ch] = [Math.min(VW, vp[0]), Math.min(VH, vp[1])];
  try { const [dw, dh] = contentBox(vid, ss, d); cw = Math.min(cw, dw); ch = Math.min(ch, dh); } catch (e) { /* giữ kích thước khung nhìn */ }
  console.log(`  cắt ${path.basename(vid)} → ${cw}×${ch}`);
  ff(['-loop', '1', '-t', String(d), '-i', bg, '-ss', String(ss), '-t', String(d), '-i', vid, '-filter_complex',
    `[1:v]crop=${cw}:${ch}:0:0,${fit ? `scale=${box.w}:${box.h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${box.w}:${box.h}:0:0:white` : `scale=${box.w}:${box.h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${box.w}:${box.h}:0:0`},setsar=1[v];[0:v][v]overlay=${box.x}:${box.y}:shortest=1,fps=${FPS},format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35`,
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-an', out]);
}
function still(png, d, out) { // 1 ảnh → d giây, phóng to chậm (zoompan trên 1 khung duy nhất, phóng 2× trước để không rung)
  const n = Math.round(d * FPS);
  ff(['-i', png, '-vf', `scale=${CW * 2}:${CH * 2},zoompan=z='1+0.035*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${CW}x${CH}:fps=${FPS},format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${(d - 0.4).toFixed(2)}:d=0.4`,
    '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-an', out]);
}

// ───────── MODE=app: video xem trước ứng dụng (App Store app preview 886×1920 + Play/YouTube 1080×1920), quay từ web app THẬT ─────────
// Dùng: MODE=app BASE=http://localhost:8080/ node scripts/store-video.mjs <out>   (CI: cd web && python3 -m http.server 8080; cần ffmpeg + kokoro-js qua KOKORO_NODE_PATH như video-motion.yml)
// Ra: app-preview-886x1920.mp4 · promo-1080x1920.mp4 · poster.png. Giọng: Kokoro af_bella = giọng Ama (content/video/cine/teachers.json), không nhạc nền (repo chưa có bản nhạc miễn phí).
const NARR = [ // lời đọc (chỉ nêu tính năng có thật, không "tốt nhất/số 1", không giá); giờ bắt đầu lấy theo mốc cảnh thật khi quay
  'Meet Lexkite. Your daily English plan is ready the moment you open the app.',
  'Short lessons mix listening, speaking and sentence building.',
  'Review your own words, and watch your vocabulary grow.',
  'Practice every skill. Lexkite: learn English a little every day.',
];
async function appMode() {
  const AW = 886, AH = 1920, BASE = process.env.BASE || 'http://localhost:8080/', END = 2.8;
  const { BASECSS, HIDE } = await import('./lib/app-shots-copy.mjs');
  const RIPPLE = `addEventListener('pointerdown', e => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(255,176,84,.55);border:3px solid #fff;left:' + e.clientX + 'px;top:' + e.clientY + 'px;transition:transform .5s ease-out,opacity .5s ease-out;transform:scale(.4)'; (document.body || document.documentElement).appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.5)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600); }, true);`;
  const br = await chromium.launch({ args: ['--force-device-scale-factor=2'] }); // để screencast gửi khung điểm ảnh thật 886×1920
  const ctx = await br.newContext({ viewport: { width: 443, height: 960 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: 'light', locale: 'en-US' }); // KHÔNG dùng recordVideo (Playwright bỏ qua deviceScaleFactor → app nằm góc trái-trên); quay bằng CDP screencast đúng điểm ảnh thiết bị
  await ctx.addInitScript(([css, rip]) => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); new Function(rip)();
    setInterval(() => { try { // móc: ghi lại câu mà bài học đang đọc (đáp án của xếp câu / điền chỗ trống nằm ở đó, DOM không có)
      const note = x => { window.__said = String(x || ''); }, T = window.LessonTeacher;
      if (T && !T.__h) { T.__h = 1; const m = T.mount; T.mount = function () { const api = m.apply(this, arguments); if (api && api.say) { const sy = api.say; api.say = function (tx) { note(tx); return sy.apply(this, arguments); }; } return api; }; }
      if (window.UI && UI.tts && !UI.tts.__h) { const t = UI.tts; UI.tts = function (tx) { note(tx); return t.apply(this, arguments); }; UI.tts.__h = 1; }
    } catch (e) {} }, 40); }, [HIDE, RIPPLE]);
  const q = `?sandbox=1&demo=1&hl=en`;
  const warm = await ctx.newPage(); await go(warm, `${BASE}${q}#/home`); await sleep(5000); await warm.close(); // demo=1 gieo dữ liệu mẫu vào kho của context; video trang này bỏ đi
  const p = await ctx.newPage(); await go(p, `${BASE}${q}#/home`); await p.waitForLoadState('load').catch(() => {}); await sleep(2500);
  // Quay bằng CDP screencast: khung JPEG 886×1920 (= 443×960 × dsf 2) kèm timestamp → ghép CFR 30 fps bằng concat demuxer
  const cdp = await ctx.newCDPSession(p), FR = path.join(TMP, 'fr'), frames = []; fs.mkdirSync(FR);
  cdp.on('Page.screencastFrame', async ev => { const f = path.join(FR, `f${String(frames.length).padStart(5, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(ev.data, 'base64')); frames.push({ ts: ev.metadata.timestamp, f }); await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: AW, maxHeight: AH, everyNthFrame: 1 });
  for (let i = 0; i < 100 && !frames.length; i++) await sleep(100);
  if (!frames.length) throw new Error('✗ screencast không có khung nào');
  const t0 = Date.now(), mark = () => (Date.now() - t0) / 1000, M = {};
  const hash = h => p.evaluate(h => { location.hash = h; }, h);
  const tap = async (sel, h) => { // chạm thật vào phần tử (có gợn tròn); không thấy → đổi hash (chỉ cho tab dưới), không có h → lỗi
    try { const el = p.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 8000 }); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(250); /* nút nhún (lsnBob) không bao giờ 'đứng yên' → không dùng chờ ổn định của Playwright */ const b = await el.boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); return true; }
    catch (e) { if (!h) throw new Error(`✗ không chạm được ${sel}`); console.log(`  ⚠ không chạm được ${sel} → hash ${h}`); await hash(h); return false; }
  };
  const swipe = async dy => { // cuộn thật bằng con lăn giữa màn; sau màn focus (bài học) con lăn có thể không ăn → cuộn mượt bằng JS, không để khung đứng yên
    const vp = p.viewportSize(), y0 = await p.evaluate(() => scrollY); await p.mouse.move(vp.width / 2, vp.height / 2);
    for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, dy / 6); await sleep(120); }
    if (await p.evaluate(y0 => scrollY === y0, y0)) await p.evaluate(dy => scrollBy({ top: dy, behavior: 'smooth' }), dy);
  };
  const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  // 1. Hôm nay
  M.home = mark(); await sleep(1200); await swipe(260); await sleep(500);
  // 2. Bài học demo: bản đồ → Bắt đầu → làm đúng 2 câu (đáp án lấy từ câu đang đọc: window.__said)
  M.map = mark(); await hash('#/lesson?demo=1'); await sleep(1600);
  await tap('.lsn-start'); await sleep(2000);
  let done = 0;
  for (let guard = 0; guard < 8 && done < 2; guard++) {
    const kind = await p.waitForSelector('#lsnBank .lsn-tile, .lsn-opts [data-o], #lsnGo', { timeout: done ? 1500 : 8000 }).then(h => h.evaluate(e => e.id === 'lsnGo' ? 'go' : e.classList.contains('lsn-tile') ? 'tiles' : 'opts')).catch(() => null);
    if (!kind) { if (done) break; throw new Error('✗ bài học không có câu ghép chữ/trắc nghiệm'); } // câu tiếp là dạng nói/gõ → dừng ở đó (người xem thấy câu mới)
    if (kind === 'go') { await tap('#lsnGo'); await sleep(1500); continue; } // lời thoại/video xen kẽ → Tiếp tục
    if (done === 0) M.item = mark();
    for (let i = 0; i < 30 && !(await p.evaluate(() => window.__said)); i++) await sleep(100);
    const said = norm(await p.evaluate(() => window.__said)); if (!said) throw new Error('✗ không bắt được câu đang đọc để suy ra đáp án');
    if (kind === 'tiles') {
      for (const w of said.split(' ')) { // chạm từng chip theo thứ tự câu
        const idx = await p.evaluate(w => { document.querySelectorAll('[data-lkpick]').forEach(e => e.removeAttribute('data-lkpick')); const e = [...document.querySelectorAll('#lsnBank .lsn-tile')].filter(e => !e.disabled && e.offsetParent).find(e => e.textContent.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').trim() === w); if (e) e.setAttribute('data-lkpick', '1'); return e ? 0 : -1; }, w); // đánh dấu đúng chip (chip đã dùng vẫn hiện, chỉ bị khoá → không dùng chỉ số)
        if (idx < 0) throw new Error(`✗ không có chip "${w}" cho câu "${said}"`);
        const b = await p.locator('[data-lkpick="1"]').boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(380);
      }
    } else { // trắc nghiệm: chọn đáp án khớp câu/từ đang đọc
      const idx = await p.evaluate(sd => { const o = [...document.querySelectorAll('.lsn-opts [data-o]')].map(e => e.dataset.o.toLowerCase()); let i = o.findIndex(x => x === sd); if (i < 0) i = o.findIndex(x => (' ' + sd + ' ').includes(' ' + x + ' ')); return i; }, said);
      if (idx < 0) throw new Error(`✗ không có lựa chọn khớp "${said}"`);
      const b = await p.locator('.lsn-opts [data-o]').nth(idx).boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(500);
    }
    await tap('#lsnCheck'); await sleep(1500); // hiện phản hồi đúng
    if (!(await p.locator('#lsnNext').count())) throw new Error('✗ không thấy tấm phản hồi sau khi Kiểm tra');
    await tap('#lsnNext'); done++; await p.evaluate(() => { window.__said = ''; }); await sleep(900);
  }
  if (done < 1) throw new Error('✗ chưa làm được câu bài học nào');
  // 3. Từ vựng → 4. Kỹ năng (chạm tab dưới) – mỗi 2–3 s có chuyển động
  M.vocab = mark(); await hash('#/vocab'); await sleep(1300); // màn bài học (focus) không có thanh tab → đổi hash, khỏi chờ 8 s
  await swipe(240); await sleep(900); await swipe(240); await sleep(900); await swipe(-480); await sleep(600);
  M.skills = mark(); await tap('#bnav a[data-tab="skills"]', '#/skills'); await sleep(1300); await swipe(240); await sleep(1100); await swipe(-240); await sleep(900); // đủ chỗ cho lời cuối
  await cdp.send('Page.stopScreencast').catch(() => {});
  await p.close(); await ctx.close(); await br.close();
  // Nén thời gian chết: khung đứng yên (chờ giọng/tải) giữ tối đa HOLD s; còn dài hơn 26,5 s thì tăng tốc đều. Mốc M đổi theo cùng trục.
  const HOLD = 1.1, T0 = frames[0].ts; let acc = 0;
  const nt = frames.map((x, i) => (i ? (acc += Math.min(x.ts - frames[i - 1].ts, HOLD)) : 0));
  const warp = t => { const a = T0 + t, i = frames.findIndex(x => x.ts > a); const j = (i < 0 ? frames.length : i) - 1; return j < 0 ? 0 : nt[j] + Math.min(a - frames[j].ts, HOLD); };
  const k = Math.min(1, 26.5 / (nt[nt.length - 1] + 0.5));
  for (const key of Object.keys(M)) M[key] = warp(M[key]) * k;
  const dur = +((nt[nt.length - 1] + 0.5) * k).toFixed(2);
  const dim = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', frames[0].f], { encoding: 'utf8' }).trim();
  if (dim !== `${AW}x${AH}` && dim !== `${AW / 2}x${AH / 2}`) throw new Error(`✗ khung screencast ${dim}, cần ${AW}x${AH}`);
  if (dim !== `${AW}x${AH}`) console.log(`  ⚠ screencast ${dim} (CSS px) → phóng ×2 lanczos`); // headless có thể gửi khung theo CSS px dù dsf 2
  const lst = path.join(TMP, 'frames.txt'); // concat demuxer: mỗi khung giữ đến timestamp khung sau
  fs.writeFileSync(lst, frames.map((x, i) => `file '${x.f}'\nduration ${Math.max(0.01, (frames[i + 1] ? nt[i + 1] - nt[i] : 0.5) * k).toFixed(4)}`).join('\n') + `\nfile '${frames[frames.length - 1].f}'\n`);
  console.log(`  ${frames.length} khung · ${dur.toFixed(1)} s · mốc ${JSON.stringify(Object.fromEntries(Object.entries(M).map(([k, v]) => [k, +v.toFixed(1)])))}`);

  // Thẻ cuối 886×1920 theo thương hiệu (nền teal đậm, chữ nhấn dải nắng→san hô) – không logo mới
  const end = path.join(TMP, 'end.png'), cb = await chromium.launch(); const cp = await cb.newPage({ viewport: { width: AW, height: AH }, deviceScaleFactor: 1 });
  await cp.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${BASECSS}body{width:${AW}px;height:${AH}px}.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px}.c img{width:190px;height:190px;border-radius:22%;box-shadow:0 24px 60px rgba(0,0,0,.4)}.n{font-size:92px;font-weight:800;letter-spacing:-.03em;margin-top:40px}.n b{color:#FFB054}h1{font-size:60px;line-height:1.12;font-weight:800;letter-spacing:-.02em;margin-top:30px}</style></head><body><div class="c"><img src="${ICON}"><div class="n">lex<b>kite</b></div><h1>Learn English <em>a little every day</em></h1></div></body></html>`);
  await cp.evaluate(() => document.fonts.ready); await sleep(400); await cp.screenshot({ path: end }); await cb.close();

  // Giọng Kokoro (cùng đường với scripts/video/render.mjs: kokoro-js q8, giọng Ama af_bella, loudnorm −16 LUFS)
  const np = process.env.KOKORO_NODE_PATH || process.env.NODE_PATH;
  const { KokoroTTS } = createRequire(np ? np.split(':')[0] + '/' : import.meta.url)('kokoro-js');
  let tts = null; for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`  tải Kokoro lỗi (lần ${k})`); await sleep(10000 * k); } }
  if (!tts) throw new Error('không tải được mô hình Kokoro');
  const total = +(dur + END).toFixed(2); const wavs = [], AT = [0.4, M.item + 0.2, M.vocab + 0.3, M.skills + 0.3];
  let prev = 0; // lời bắt đầu ở mốc cảnh, hoặc ngay sau lời trước nếu lời trước còn đang nói (không bao giờ đè)
  for (const [i, text] of NARR.entries()) {
    const raw = path.join(TMP, `n${i}.raw.wav`), w = path.join(TMP, `n${i}.wav`); await (await tts.generate(text, { voice: 'af_bella', speed: 1 })).save(raw);
    ff(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,aresample=48000', '-ac', '1', w]);
    const wd = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', w], { encoding: 'utf8' });
    const at = Math.max(AT[i], prev + 0.25); prev = at + wd; wavs.push([at, w]);
    if (at + wd > total - 0.3) throw new Error(`lời ${i} dài quá khung (${(at + wd).toFixed(1)} > ${total})`);
  }
  ff([...wavs.flatMap(([, w]) => ['-i', w]), '-filter_complex', wavs.map(([at], i) => `[${i}:a]adelay=${Math.round(at * 1000)}:all=1[a${i}]`).join(';') + `;${wavs.map((_, i) => `[a${i}]`).join('')}amix=inputs=${wavs.length}:normalize=0,apad,atrim=0:${total},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`, '-map', '[a]', '-ac', '2', path.join(TMP, 'narr.wav')]);

  // Ghép: đoạn quay + thẻ cuối + giọng → app preview (H.264 High, yuv420p, 30 fps không đổi, AAC stereo 48 kHz 256k)
  const mp4 = path.join(OUT, 'app-preview-886x1920.mp4'), promo = path.join(OUT, 'promo-1080x1920.mp4');
  ff(['-f', 'concat', '-safe', '0', '-t', String(dur), '-i', lst, '-loop', '1', '-t', String(END), '-framerate', String(FPS), '-i', end, '-i', path.join(TMP, 'narr.wav'), '-filter_complex',
    `[0:v]scale=${AW}:${AH}:flags=lanczos:in_range=pc:out_range=tv,format=yuv420p,setsar=1,fps=${FPS},fade=t=in:st=0:d=0.3[a];[1:v]scale=${AW}:${AH},setsar=1,fps=${FPS},fade=t=in:st=0:d=0.4[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]`,
    '-map', '[v]', '-map', '2:a', '-r', String(FPS), '-fps_mode', 'cfr', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-t', String(total), '-movflags', '+faststart', mp4]);
  ff(['-i', mp4, '-vf', `scale=-2:1920:flags=lanczos,pad=1080:1920:(ow-iw)/2:0:color=0x0F3D3E,setsar=1,format=yuv420p`, '-r', String(FPS), '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', promo]);
  ff(['-ss', '3', '-i', mp4, '-frames:v', '1', '-pix_fmt', 'rgb24', path.join(OUT, 'poster.png')]);

  // Kiểm: thời lượng 15–30 s, kích thước, fps, codec, ≤ 500 MB
  const pr = f => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }));
  for (const [f, w, h] of [[mp4, AW, AH], [promo, 1080, 1920]]) {
    const j = pr(f), v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio'), d = +j.format.duration, bad = [];
    if (!(d >= 15 && d <= 30)) bad.push(`thời lượng ${d}`); if (+v.width !== w || +v.height !== h) bad.push(`kích thước ${v.width}×${v.height}`);
    if (v.codec_name !== 'h264' || v.profile !== 'High' || v.pix_fmt !== 'yuv420p') bad.push(`video ${v.codec_name}/${v.profile}/${v.pix_fmt}`);
    if (v.r_frame_rate !== `${FPS}/1` || v.avg_frame_rate !== `${FPS}/1`) bad.push(`fps ${v.r_frame_rate}/${v.avg_frame_rate}`);
    if (!a || a.codec_name !== 'aac' || +a.sample_rate !== 48000 || +a.channels !== 2) bad.push('âm thanh không phải AAC stereo 48 kHz');
    if (+j.format.size > 500 * 1048576) bad.push('quá 500 MB');
    if (bad.length) throw new Error(`✗ ${path.basename(f)}: ${bad.join('; ')}`);
    console.log(`✓ ${path.basename(f)} ${d.toFixed(1)} s ${(j.format.size / 1048576).toFixed(1)} MB`);
  }
  { // góc dưới-phải 40×40 của khung giữa video không được là xám phẳng (lỗi app chỉ chiếm 1/4 khung)
    const buf = execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', String(total / 2), '-i', mp4, '-frames:v', '1', '-vf', 'crop=40:40:iw-40:ih-40', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
    let lo = 255, hi = 0, gr = 0; for (let i = 0; i < buf.length; i += 3) { lo = Math.min(lo, buf[i]); hi = Math.max(hi, buf[i]); gr += Math.abs(buf[i] - buf[i + 1]) < 8 && Math.abs(buf[i + 1] - buf[i + 2]) < 8 && buf[i] > 100 && buf[i] < 170; }
    if (buf.length !== 4800 || (hi - lo < 6 && gr / 1600 > 0.95)) throw new Error('✗ góc dưới-phải là xám phẳng – app không phủ kín khung');
  }
  const pj = fs.readFileSync(path.join(OUT, 'poster.png')); if (pj.readUInt32BE(16) !== AW || pj.readUInt32BE(20) !== AH || pj[25] !== 2) throw new Error('✗ poster.png phải 886×1920 RGB không alpha');
}
if (MODE === 'app') { await appMode(); process.exit(0); }

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-'));
const ctx = await chromium.launchPersistentContext(prof, {
  channel: 'chromium', headless: true, locale: LOCALE, viewport: { width: VW, height: VH }, deviceScaleFactor: 1,
  recordVideo: { dir: path.join(TMP, 'raw'), size: { width: VW, height: VH } },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${LOCALE}`],
});
await ctx.addInitScript(CURSOR);
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(ARTICLE); });
await new Promise(r => srv.listen(8765, '127.0.0.1', r));
const NEWS = 'http://127.0.0.1:8765/';
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), LANG);
await sleep(1500);
for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {});

// Dữ liệu mẫu + làm nóng bộ đệm tra từ/dịch (cảnh quay không phải chờ mạng)
const warm = await ctx.newPage();
try {
await go(warm, base + `app/index.html?demo=1&hl=${LANG}#/home`); await sleep(5000);
await setSettings({ selectMode: 'off', markKnown: false, markAcademic: false });
await go(warm, NEWS + 'a'); await sleep(2000); await warm.dblclick('#w'); await sleep(9000);
await setSettings({ selectMode: 'auto' });
await go(warm, NEWS + 'a'); await sleep(2000);
{ const b = await warm.locator('#s').boundingBox(); await warm.mouse.move(b.x + 1, b.y + 8); await warm.mouse.down(); await warm.mouse.move(b.x + b.width - 2, b.y + b.height - 8, { steps: 10 }); await warm.mouse.up(); }
await sleep(9000);
} catch (e) { console.log('⚠ làm nóng lỗi (bỏ qua):', e.message.split('\n')[0]); }
await warm.close().catch(() => {});
const articleShot = path.join(TMP, 'article.png');
let cardBox = null;

const scenes = []; // { vid, ss, d, bg, box }
async function record(fn) {
  const page = await ctx.newPage(); const t0 = Date.now();
  const mark = () => (Date.now() - t0) / 1000;
  const r = await fn(page, mark);
  const vp = await page.evaluate(() => [innerWidth, innerHeight]).catch(() => [VW, VH]);
  await page.close(); const vid = await page.video().path();
  return { vid, vp, ...r };
}

// 1. Bấm đúp tra từ
await setSettings({ selectMode: 'off' });
scenes.push({ i: 0, url: 'dailyplanet.com/environment', ...await record(async (p, mark) => {
  await go(p, NEWS + 'cities-forests'); await sleep(1800);
  const ss = mark(); await p.mouse.move(300, 650); await sleep(300);
  const b = await p.locator('#w').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 }); await sleep(350);
  await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await sleep(4200);
  await p.mouse.move(b.x + b.width / 2 + 330, b.y + 120, { steps: 25 }); await sleep(1500);
  await p.screenshot({ path: articleShot });
  // Ảnh bảng tra (cho thumbnail/hook bản viral) + vị trí tương đối để zoom máy quay
  const cb = await p.evaluate(() => { const h = document.querySelector('ielts-lexi-popup'), b = h && h.shadowRoot && h.shadowRoot.querySelector('.box'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).catch(() => null);
  if (cb) { cardBox = cb; await p.screenshot({ path: path.join(TMP, 'card.png'), clip: { x: Math.max(0, cb.x - 8), y: Math.max(0, cb.y - 8), width: cb.w + 16, height: cb.h + 16 } }).catch(() => {}); }
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
// 2. Bôi đen câu → dịch + cấu trúc
await setSettings({ selectMode: 'auto' });
scenes.push({ i: 1, url: 'dailyplanet.com/environment', ...await record(async (p, mark) => {
  await go(p, NEWS + 'cities-forests'); await sleep(1800);
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
  await go(page, base + 'popup.html'); await sleep(1800);
  const ss = mark(); await page.mouse.move(330, 560); await sleep(300);
  const q = page.locator('#qCard'); if (await q.count()) { const b = await q.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 }); await sleep(400); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(1600); }
  const r = page.locator('#review'); { const b = await r.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 }); } await sleep(1500);
  const d = +(mark() - ss).toFixed(2); const vp = await page.evaluate(() => [innerWidth, innerHeight]).catch(() => [380, 600]); await page.close();
  scenes.push({ i: 2, popup: true, vid: await page.video().path(), ss, d, vp });
}
// 4. Tab mới: lật thẻ → "Đã nhớ"
scenes.push({ i: 3, url: 'New Tab', ...await record(async (p, mark) => {
  await go(p, base + 'newtab.html'); await sleep(1800);
  const ss = mark(); await p.mouse.move(640, 760); await sleep(300);
  const g = p.locator('#ntGood'); if (await g.isVisible()) { const b = await g.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 }); await sleep(500); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
  await sleep(2600);
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
// 5. Ứng dụng học: trang chủ, cuộn nhẹ
scenes.push({ i: 4, url: 'Lexkite', ...await record(async (p, mark) => {
  await go(p, base + `app/index.html?hl=${LANG}#/home`); await sleep(3000);
  const ss = mark(); await p.mouse.move(700, 500, { steps: 20 }); await sleep(600);
  for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, 70); await sleep(180); } await sleep(1600);
  return { ss, d: +(mark() - ss).toFixed(2) };
}) });
await ctx.close();

// Bản viral (scripts/store-video-viral.mjs) dùng lại đoạn quay gốc: RAW_OUT=<thư mục> → chép video + ảnh + mô tả cảnh rồi dừng
if (process.env.RAW_OUT) {
  const R = path.resolve(process.env.RAW_OUT); fs.mkdirSync(R, { recursive: true });
  const out = scenes.map((s, k) => { const f = `clip${k}.webm`; fs.copyFileSync(s.vid, path.join(R, f)); return { ...s, vid: f }; });
  for (const f of ['article.png', 'card.png']) if (fs.existsSync(path.join(TMP, f))) fs.copyFileSync(path.join(TMP, f), path.join(R, f));
  fs.writeFileSync(path.join(R, 'scenes.json'), JSON.stringify({ lang: LANG, VW, VH, cardBox, scenes: out }, null, 1));
  srv.close(); console.log('✓ RAW', R); process.exit(0);
}

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
    await card(cp, bg, `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div><div class="txt"${LANG === 'ar' ? ' dir="rtl" style="text-align:right"' : ''}><span class="kick">${kk}</span><h1>${h}</h1><p>${p}</p></div>${extra}<div style="position:absolute;left:1070px;top:120px;width:456px;height:720px;border-radius:20px;box-shadow:0 50px 110px rgba(0,0,0,.55);background:#fff"></div>`);
    compose(bg, s.vid, s.ss, s.d, path.join(TMP, `p${k + 1}.mp4`), { x: 1070, y: 120, w: 456, h: 720 }, s.vp, true);
  } else {
    await card(cp, bg, sceneBg(s.i, s.url));
    compose(bg, s.vid, s.ss, s.d, path.join(TMP, `p${k + 1}.mp4`), WIN, s.vp);
  }
  parts.push(`p${k + 1}.mp4`);
}
const outro = path.join(TMP, 'outro.png');
await card(cp, outro, `<div class="center"><img src="${ICON}"><h1>${T.outro[0]}</h1><div class="cws"><img src="${ICON}" style="width:44px;height:44px;border-radius:10px;box-shadow:none">Chrome Web Store</div><p style="margin-top:30px">${T.outro[1]}</p></div>`);
still(outro, 4, path.join(TMP, `p${parts.length}.mp4`)); parts.push(`p${parts.length}.mp4`);
await br.close(); srv.close();
fs.writeFileSync(path.join(TMP, 'list.txt'), parts.map(p => `file '${path.join(TMP, p)}'`).join('\n'));
const mp4 = path.join(OUT, `lexkite-promo-${LANG}.mp4`);
ff(['-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', mp4]);
// Ảnh bìa YouTube 1280×720
ff(['-i', intro, '-vf', 'scale=1280:720', path.join(OUT, `lexkite-thumb-${LANG}.jpg`)]);
const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
if (dur > 70) throw new Error('Video quá dài: ' + dur + 's');
console.log('✓', mp4, dur.toFixed(1) + 's', (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB', scenes.map(s => s.d).join(' + '));
