// Video quảng cáo "viral" bản quốc tế (EN, ~30 giây, 1920×1080): hook 3 giây đầu, chữ động, zoom vào thao tác thật, chuyển cảnh mượt,
// nhạc nền + whoosh + pop tự tổng hợp (không bản quyền) và thumbnail YouTube 1280×720.
// Dùng đoạn quay gốc từ store-video.mjs: RAW_OUT=/tmp/raw LANG_V=en node scripts/store-video.mjs x && node scripts/store-video-viral.mjs /tmp/raw <thư-mục-ra>
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const RAW = path.resolve(process.argv[2] || '/tmp/raw'), OUT = path.resolve(process.argv[3] || 'store-video-viral');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lkvv-'));
const S = JSON.parse(fs.readFileSync(path.join(RAW, 'scenes.json'), 'utf8'));
const CW = 1920, CH = 1080, FPS = 30, VW = S.VW, VH = S.VH, XF = 0.4; // XF: thời lượng chuyển cảnh
fs.mkdirSync(OUT, { recursive: true });
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
const b64 = f => fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : '';
const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
const CARD = b64(path.join(RAW, 'card.png')), ARTICLE = b64(path.join(RAW, 'article.png'));
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=block" rel="stylesheet">';

const CSS = `*{box-sizing:border-box;margin:0}body{width:${CW}px;height:${CH}px;overflow:hidden;font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#fff;position:relative;
background:linear-gradient(160deg,#0B3233,#0F3D3E 45%,#123f40)}
.blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;animation:blob 6s ease-in-out infinite both}
.b1{width:900px;height:600px;right:-200px;top:-260px;background:radial-gradient(closest-side,rgba(255,176,84,.55),transparent)}
.b2{width:900px;height:700px;left:-300px;bottom:-350px;background:radial-gradient(closest-side,rgba(31,170,150,.6),transparent);animation-delay:-3s}
.grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1.2px,transparent 1.2px);background-size:26px 26px;mask-image:radial-gradient(ellipse at 30% 50%,#000,transparent 70%)}
em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{position:absolute;left:84px;top:64px;display:flex;align-items:center;gap:16px;font-weight:800;font-size:38px;letter-spacing:-.02em;animation:fadeIn .5s both}
.brand img{width:64px;height:64px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.35)}.brand b{color:#FFB054}
.kick{display:inline-block;font-size:21px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.13);border:1px solid rgba(255,176,84,.4);padding:9px 18px;border-radius:99px}
@keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(110px,-50px) scale(1.12)}}
@keyframes pop{0%{opacity:0;transform:scale(.35) translateY(50px)}55%{opacity:1;transform:scale(1.1) translateY(-6px)}100%{opacity:1;transform:none}}
@keyframes up{0%{opacity:0;transform:translateY(70px)}100%{opacity:1;transform:none}}
@keyframes left{0%{opacity:0;transform:translateX(-110px)}100%{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes strike{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes shine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(260%) skewX(-20deg)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-16px) rotate(-1deg)}}
.a{animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.9,.25,1.15)}`;
const page0 = body => `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${CSS}</style></head><body><div class="blob b1"></div><div class="blob b2"></div><div class="grid"></div>${body}</body></html>`;

// Dựng chuỗi khung hình từ HTML có animation CSS (tua chính xác từng khung qua Web Animations API) → MP4
async function seq(pg, body, d, out) {
  await pg.setContent(page0(body)); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(250);
  const dir = fs.mkdtempSync(path.join(TMP, 'f')), n = Math.round(d * FPS);
  for (let i = 0; i < n; i++) {
    await pg.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }), (i / FPS) * 1000);
    await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 94 });
  }
  ff(['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', out]);
}

// Vùng trang thật trong bản ghi (bỏ đệm xám) – như store-video.mjs
function contentBox(vid, t) {
  const buf = execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', String(t), '-i', vid, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
  const px = (x, y) => { const i = (y * VW + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
  const pad = ([r, g, b]) => Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 105 && r < 165;
  const rowPad = y => { let k = 0; for (let x = 0; x < VW; x += 8) k += pad(px(x, y)); return k / (VW / 8) > 0.97; };
  const colPad = x => { let k = 0; for (let y = 0; y < VH; y += 8) k += pad(px(x, y)); return k / (VH / 8) > 0.97; };
  let h = VH; while (h > 100 && rowPad(h - 1)) h--; let w = VW; while (w > 100 && colPad(w - 1)) w--;
  return [w - (w % 2), h - (h % 2)];
}

// Cảnh có đoạn quay: nền động (chữ trượt vào + khung trình duyệt) + clip đặt vào khung, zoom máy quay vào điểm (fx, fy) từ giây z0→z1
const WIN = { x: 600, y: 170, w: 1236 };
async function clipScene(pg, k, { kick, title, sub, url = 'dailyplanet.com', start = 0, len, zoom = 1.0, fx = .5, fy = .5, z0 = 1, z1 = 2, popup = false }) {
  const sc = S.scenes[k], vid = path.join(RAW, sc.vid), ss = sc.ss + start, d = Math.min(len, sc.d - start);
  let [cw, ch] = contentBox(vid, ss + d / 2); cw = Math.min(cw, sc.vp[0]); ch = Math.min(ch, sc.vp[1]);
  const winH = popup ? 0 : Math.round(WIN.w * ch / cw);
  const bg = path.join(TMP, `bg${k}.mp4`), out = path.join(TMP, `sc${k}.mp4`);
  const winHtml = popup
    ? `<div class="a" style="position:absolute;left:640px;top:200px;width:1180px;border-radius:18px;overflow:hidden;opacity:.45;filter:blur(3px);animation:fadeIn .6s both"><img style="display:block;width:100%" src="${ARTICLE}"></div>`
    : `<div class="a" style="position:absolute;left:${WIN.x}px;top:${WIN.y - 46}px;width:${WIN.w}px;height:${winH + 46}px;border-radius:18px;background:#fff;box-shadow:0 60px 120px rgba(0,0,0,.55);animation:up .55s .05s both">
        <div style="height:46px;background:#eef1f0;display:flex;align-items:center;gap:10px;padding:0 18px"><i style="width:13px;height:13px;border-radius:50%;background:#ff5f57"></i><i style="width:13px;height:13px;border-radius:50%;background:#febc2e"></i><i style="width:13px;height:13px;border-radius:50%;background:#28c840"></i>
        <span style="margin-left:16px;flex:1;height:30px;border-radius:8px;background:#fff;color:#5b6b6a;font:500 15px system-ui;display:flex;align-items:center;padding:0 14px">🔒 ${url}</span></div></div>`;
  await seq(pg, `<div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>${winHtml}
    <div style="position:absolute;left:84px;top:330px;width:500px">
      <span class="kick a" style="animation:left .5s .1s both">${kick}</span>
      <h1 class="a" style="font-size:66px;line-height:1.04;font-weight:900;letter-spacing:-.035em;margin-top:28px;animation:left .6s .22s both">${title}</h1>
      <p class="a" style="font-size:27px;line-height:1.45;color:rgba(255,255,255,.82);margin-top:24px;animation:up .6s .45s both">${sub}</p></div>`, d, bg);
  const n = Math.round(d * FPS), A = Math.round(z0 * FPS), B = Math.round(z1 * FPS);
  const zexp = `if(lt(on,${A}),1,if(lt(on,${B}),1+(${zoom}-1)*(on-${A})/${Math.max(1, B - A)},${zoom}))`;
  const box = popup ? { w: 456, h: Math.round(456 * ch / cw) } : { w: WIN.w, h: winH };
  const fit = popup ? `scale=${box.w}:${box.h}:flags=lanczos` : `scale=${box.w}:${box.h}:flags=lanczos,zoompan=z='${zexp}':x='(iw-iw/zoom)*${fx}':y='(ih-ih/zoom)*${fy}':d=1:s=${box.w}x${box.h}:fps=${FPS}`;
  const pos = popup ? `x=1180:y='if(lt(t,0.55),${CH}-(${CH}-150)*(1-pow(1-t/0.55,3)),150)'` : `x=${WIN.x}:y=${WIN.y}`;
  ff(['-i', bg, '-ss', String(ss), '-t', String(d), '-i', vid, '-filter_complex',
    `[1:v]fps=${FPS},crop=${cw}:${ch}:0:0,${fit},setsar=1[v];[0:v][v]overlay=${pos}:shortest=1,format=yuv420p`,
    '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-an', out]);
  return { file: out, d: n / FPS };
}

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: CW, height: CH }, deviceScaleFactor: 1 });
const segs = [];

// 1. HOOK (2,8 s) – nỗi khổ quen thuộc → lời hứa
{
  const words = ['Still', 'copy-pasting', 'words', 'into'];
  const f = path.join(TMP, 'hook.mp4');
  await seq(pg, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <div style="font-size:96px;font-weight:900;letter-spacing:-.04em;line-height:1.05">${words.map((w, i) => `<span class="a" style="display:inline-block;margin:0 14px;animation:pop .45s ${0.08 + i * 0.16}s both">${w}</span>`).join('')}</div>
    <div style="position:relative;display:inline-block;margin-top:14px"><span class="a" style="display:inline-block;font-size:104px;font-weight:900;letter-spacing:-.04em;color:#9fb3b1;animation:pop .45s .74s both">Google Translate?</span>
      <i class="a" style="position:absolute;left:-10px;right:-10px;top:52%;height:12px;border-radius:6px;background:#F2553B;transform-origin:left;animation:strike .35s 1.45s both"></i></div>
    <div class="a" style="margin-top:46px;font-size:64px;font-weight:900;letter-spacing:-.03em;animation:up .45s 1.75s both">There’s a <em>faster</em> way.</div></div>`, 2.9, f);
  segs.push({ file: f, d: 2.9, tr: 'circleopen' });
}
// 2–6. Cảnh thật
const cb = S.cardBox, sc0 = S.scenes[0];
const fx0 = cb ? Math.min(.95, Math.max(.05, (cb.x + cb.w / 2) / (sc0.vp[0] || VW))) : .62, fy0 = cb ? Math.min(.9, Math.max(.1, (cb.y + cb.h / 2) / 662)) : .45;
segs.push({ ...await clipScene(pg, 0, { kick: 'On any website', title: 'Double-click.<br><em>Understand instantly.</em>', sub: 'IPA, audio, meanings & examples — right where you read.', url: 'dailyplanet.com/environment', start: .3, len: 6.2, zoom: 1.55, fx: fx0, fy: fy0, z0: 1.9, z1: 2.6 }), tr: 'slideleft' });
segs.push({ ...await clipScene(pg, 1, { kick: 'Translate + grammar', title: 'Select a sentence.<br><em>See how it works.</em>', sub: 'Instant translation with the grammar explained.', url: 'dailyplanet.com/environment', start: .2, len: 5.6, zoom: 1.5, fx: .55, fy: .2, z0: 2.6, z1: 3.3 }), tr: 'wipeleft' });
segs.push({ ...await clipScene(pg, 2, { kick: 'One click away', title: 'Your daily study,<br><em>always ready.</em>', sub: 'Due cards, daily goal and a 1-minute review.', len: 4.2, popup: true }), tr: 'slideup' });
segs.push({ ...await clipScene(pg, 3, { kick: 'Every new tab', title: 'Learn a word<br><em>every new tab.</em>', sub: 'Flashcards from your own deck, at the right moment.', url: 'New Tab', start: .2, len: 3.4, zoom: 1.18, fx: .5, fy: .45, z0: 0.3, z1: 3.3 }), tr: 'smoothleft' });
segs.push({ ...await clipScene(pg, 4, { kick: 'Full study app', title: 'Remember words<br><em>for good.</em>', sub: 'FSRS spaced repetition + IELTS & TOEIC practice.', url: 'lexkite.com', start: .3, len: 3.4, zoom: 1.15, fx: .5, fy: .3, z0: 0.2, z1: 3.3 }), tr: 'circlecrop' });
// 7. Lợi ích bật ra lần lượt
{
  const chips = ['✓ 100% free', '🌍 15 languages', '🎯 IELTS · TOEIC', '⚡ Works on every website'];
  const f = path.join(TMP, 'chips.mp4');
  await seq(pg, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
    <div class="a" style="font-size:78px;font-weight:900;letter-spacing:-.035em;animation:pop .5s .05s both">Learn English <em>while you browse</em></div>
    <div style="display:flex;gap:22px;margin-top:56px;flex-wrap:wrap;justify-content:center;max-width:1500px">${chips.map((c, i) => `<span class="a" style="font-size:38px;font-weight:800;padding:18px 34px;border-radius:999px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.22);animation:pop .45s ${0.45 + i * 0.22}s both">${c}</span>`).join('')}</div></div>`, 2.9, f);
  segs.push({ file: f, d: 2.9, tr: 'fade' });
}
// 8. CTA
{
  const f = path.join(TMP, 'cta.mp4');
  await seq(pg, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <img class="a" src="${ICON}" style="width:170px;height:170px;border-radius:40px;box-shadow:0 26px 60px rgba(0,0,0,.45);animation:pop .55s .05s both, pulse 1.6s 1s ease-in-out infinite">
    <div class="a" style="font-size:80px;font-weight:900;letter-spacing:-.035em;margin-top:34px;animation:up .5s .35s both">lex<span style="color:#FFB054">kite</span></div>
    <div class="a" style="font-size:96px;font-weight:900;letter-spacing:-.04em;line-height:1.05;margin-top:18px;animation:pop .55s .6s both">Add to Chrome — <em>it’s free.</em></div>
    <div class="a" style="position:relative;overflow:hidden;margin-top:46px;display:inline-flex;align-items:center;gap:16px;background:#fff;color:#0F3D3E;font-size:36px;font-weight:900;padding:22px 44px;border-radius:999px;box-shadow:0 22px 50px rgba(0,0,0,.4);animation:pop .5s 1s both">
      <img src="${ICON}" style="width:50px;height:50px;border-radius:12px">Chrome Web Store<i class="a" style="position:absolute;top:0;bottom:0;width:90px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:shine 1.1s 1.6s both"></i></div>
    <div class="a" style="font-size:34px;margin-top:30px;color:rgba(255,255,255,.85);animation:fadeIn .5s 1.3s both">lexkite.com</div></div>`, 3.6, f);
  segs.push({ file: f, d: 3.6 });
}

// Ghép với chuyển cảnh xfade
const inputs = segs.flatMap(s => ['-i', s.file]);
let fc = segs.map((_, i) => `[${i}:v]fps=${FPS},settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p[s${i}];`).join(''), prev = '[s0]', t = segs[0].d; const trTimes = [];
for (let i = 1; i < segs.length; i++) {
  const off = (t - XF).toFixed(3); trTimes.push(+off);
  fc += `${prev}[s${i}]xfade=transition=${segs[i - 1].tr || 'fade'}:duration=${XF}:offset=${off}[x${i}];`; prev = `[x${i}]`; t = t - XF + segs[i].d;
}
const silent = path.join(TMP, 'video.mp4');
ff([...inputs, '-filter_complex', fc + `${prev}format=yuv420p[v]`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(FPS), silent]);
const total = dur(silent);

// ---------- Âm thanh tự tổng hợp (không bản quyền): nhạc nền 112 BPM + riser trước khi vào nhịp + whoosh chuyển cảnh + pop ----------
const SR = 44100, N = Math.ceil(total * SR), mix = new Float32Array(N);
const add = (t0, d, fn) => { const s0 = Math.floor(t0 * SR), n = Math.floor(d * SR); for (let i = 0; i < n && s0 + i < N; i++) if (s0 + i >= 0) mix[s0 + i] += fn(i / SR); };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
const noise = () => rnd();
const BPM = 112, beat = 60 / BPM, drop = segs[0].d - XF; // nhịp vào đúng lúc hết hook
const prog = [[220, 261.6, 329.6, 110], [174.6, 220, 261.6, 87.3], [261.6, 329.6, 392, 130.8], [196, 246.9, 293.7, 98]]; // Am F C G
const bar = 4 * beat;
// pad xuyên suốt (nhỏ hơn trong hook)
for (let b = 0; b * bar < total; b++) { const ch = prog[b % 4]; for (const f of ch.slice(0, 3)) add(b * bar, bar + .3, t => { const env = Math.min(1, t / .35) * Math.min(1, (bar + .3 - t) / .3); return env * .045 * (Math.sin(2 * Math.PI * f * t) + .5 * Math.sin(2 * Math.PI * f * 1.003 * t) + .25 * Math.sin(4 * Math.PI * f * t)); }); }
// riser trong hook
add(0, drop, t => { const p = t / drop; return noise() * .12 * p * p + Math.sin(2 * Math.PI * (200 + 900 * p * p) * t) * .03 * p; });
// trống + bass từ lúc vào nhịp
for (let k = 0; drop + k * beat < total - .4; k++) {
  const t0 = drop + k * beat, b = Math.floor(k / 4), ch = prog[b % 4];
  add(t0, .3, t => { const f = 45 + 80 * Math.exp(-t * 30); return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * .9; }); // kick
  if (k % 2 === 1) add(t0, .18, t => noise() * Math.exp(-t * 22) * .32); // clap
  add(t0 + beat / 2, .05, t => { let hp = noise(); return hp * Math.exp(-t * 90) * .14; }); // hat
  for (const e of [0, .5]) add(t0 + e * beat, beat * .45, t => { const f = ch[3]; const env = Math.exp(-t * 6); return env * .22 * (Math.sin(2 * Math.PI * f * t) + .35 * Math.sin(4 * Math.PI * f * t) + .15 * Math.sin(6 * Math.PI * f * t)); });
}
// whoosh ở mỗi chuyển cảnh
for (const tt of trTimes) { let lp = 0; add(tt - .25, .7, t => { const p = t / .7, env = Math.sin(Math.PI * p); const a = .05 + .5 * p; lp += a * (noise() - lp); return lp * env * .9; }); }
// pop khi bảng tra / bản dịch hiện, khi chip bật, khi CTA
const segStart = i => segs.slice(0, i).reduce((s, x) => s + x.d - XF, 0);
const pops = [segStart(1) + 2.0, segStart(2) + 2.7, ...[0, 1, 2, 3].map(i => segStart(6) + .5 + i * .22), segStart(7) + .65, segStart(7) + 1.05];
for (const tt of pops) add(tt, .12, t => Math.sin(2 * Math.PI * (700 + 900 * t / .12) * t) * Math.exp(-t * 35) * .45);
// tiếng gõ chữ trong hook
for (let i = 0; i < 5; i++) add(.08 + i * .16, .06, t => noise() * Math.exp(-t * 80) * .25 + Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 60) * .1);
// master: nén mềm, fade cuối, chuẩn hóa
let peak = 0; for (let i = 0; i < N; i++) { let v = Math.tanh(mix[i] * 1.1); const tEnd = (N - i) / SR; if (tEnd < 1.6) v *= tEnd / 1.6; mix[i] = v; peak = Math.max(peak, Math.abs(v)); }
const wav = Buffer.alloc(44 + N * 2); const g = .89 / (peak || 1);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * g)) * 32767), 44 + i * 2);
const music = path.join(TMP, 'music.wav'); fs.writeFileSync(music, wav);
const mp4 = path.join(OUT, 'lexkite-promo-viral.mp4');
ff(['-i', silent, '-i', music, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);

// ---------- Thumbnail YouTube 1280×720 ----------
await pg.setViewportSize({ width: 1280, height: 720 });
await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${CSS}
  body{width:1280px;height:720px}.t{position:absolute;left:62px;top:150px;width:640px}
  .big{font-size:118px;font-weight:900;line-height:.92;letter-spacing:-.05em;text-transform:uppercase}
  .card{position:absolute;right:46px;top:96px;width:520px;border-radius:22px;overflow:hidden;transform:rotate(-3deg);box-shadow:0 0 0 8px rgba(255,255,255,.9),0 40px 90px rgba(0,0,0,.6)}
  .card img{display:block;width:100%}.free{position:absolute;right:30px;top:40px;background:#F2553B;color:#fff;font-weight:900;font-size:40px;padding:10px 26px;border-radius:14px;transform:rotate(6deg);box-shadow:0 10px 30px rgba(0,0,0,.4)}
  .cur{position:absolute;right:440px;top:300px;width:84px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}</style></head><body>
  <div class="blob b1" style="animation:none"></div><div class="blob b2" style="animation:none"></div><div class="grid"></div>
  <div class="brand" style="left:62px;top:50px;font-size:34px;animation:none"><img src="${ICON}" style="width:56px;height:56px"><span>lex<b>kite</b></span></div>
  <div class="t"><div class="big">Double-<br>click</div><div class="big"><em>any word</em></div><div style="font-size:34px;font-weight:700;margin-top:22px;color:rgba(255,255,255,.88)">Instant meaning · IPA · translation</div></div>
  ${CARD ? `<div class="card"><img src="${CARD}"></div>` : ''}<div class="free">FREE</div>
  <svg class="cur" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></body></html>`);
await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
await pg.screenshot({ path: path.join(OUT, 'lexkite-thumb-viral.jpg'), type: 'jpeg', quality: 92 });
await br.close();
console.log('✓', mp4, dur(mp4).toFixed(1) + 's', (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB');
