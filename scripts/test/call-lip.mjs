// 👄 Test mặt vẽ khớp miệng Ama/Carlos chuẩn app lớn (spec call-test phần A; docs/LESSON-ENGINE.md §Khớp miệng) – chạy trong call-qa.yml, không mạng thật, không tài khoản.
//  sync : đồng bộ âm–hình bằng TIẾNG THẬT Kokoro (brand/library/cine/cafe/voices/kokoro-v4: wav + mốc Rhubarb) dựng mục mốc ĐÚNG đường ống web
//         (align → smooth → lead + độ lớn tiếng 100 Hz → LipSync.packCues/zrun), phát qua LessonTeacher.mount().say() như Call thật (<khóa>-ls.mp3 → wav thật).
//         Mỗi khung ghi (đồng hồ media của khung vừa vẽ, độ mở). Onset tiếng (độ lớn vượt 10 % đỉnh sau ≥ 150 ms im) ↔ lúc miệng mở (open > 0,1) theo đồng hồ media:
//         lệch TB |Δ| ≤ 40 ms, p95 ≤ 80 ms; ở rate 0,75 (🐢 nghe chậm) / 1 / 1,25 và sau khi tua (currentTime nhảy lùi). Kèm: miệng ngậm khi tiếng tắt, mở ở đỉnh âm tiết,
//         đồng hồ media chạy đúng tốc độ (độ dốc so với đồng hồ tường ≈ rate), luôn ở chế độ "pre" (không rơi live).
//  ssim : khung ghép (đầu trơn + LipFace.parts + LipPaint) ở viseme X, A (M/B/P), D (A mở), E (O), F (OO/W), G (F/V) của Ama/Carlos so ảnh mẫu
//         scripts/test/fixtures/lip-ssim/*.png bằng SSIM tự viết trong trang: ≥ 0,97 toàn khung, ≥ 0,95 vùng miệng/mắt. Ca méo cố ý (miệng lệch 8 px, mắt nhắm,
//         sai hình miệng) PHẢI đỏ – chứng minh thước đo bắt được lỗi. --write-golden: sinh lại ảnh mẫu (coordinator + QC máy duyệt trước khi khóa).
//  fps  : màn Call thật (#/call/coffee) 375/1280 px: Chromium CPU chậm 4× (CDP) ≥ 50 fps, khung > 50 ms ≤ 1; WebKit (viewport iPhone, không throttle) cùng ngưỡng.
//  clip : video ngắn khối sync (tiếng thật, rate 1) quay từ CHÍNH canvas mặt vẽ + ghép tiếng đúng lệch → <out>/clips/*.mp4 (artifact call-lip-clips).
// Dùng: node scripts/test/call-lip.mjs --out qa/lip-test [--browser chromium|webkit] [--only sync,ssim,fps,clip] [--repeat N] [--write-golden]
//       Máy dev (sandbox macOS): PW_LOCAL=1 (scripts/test/lib/pw-launch.mjs). WebKit chỉ chạy trên CI Ubuntu.
import * as pw from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { launch, LOCAL } from './lib/pw-launch.mjs';
import { rms100 } from '../lipsync/cues_cli.mjs';

const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || 'qa/lip-test'), ROOT = path.resolve(arg('--root') || 'web'), BR = arg('--browser') || 'chromium', WRITE = process.argv.includes('--write-golden');
const ONLY = new Set((arg('--only') || (BR === 'chromium' ? 'sync,ssim,fps,clip' : 'fps')).split(',')), REPEAT = Math.max(1, +(arg('--repeat') || 1));
const VOX = path.resolve('brand/library/cine/cafe/voices/kokoro-v4'), GOLD = path.resolve('scripts/test/fixtures/lip-ssim');
const TYPE = pw[BR]; if (!TYPE) { console.error('trình duyệt lạ: ' + BR); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

// ---- máy chủ tĩnh + chặn mạng (như lip-shots.mjs) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.mp3': 'audio/mpeg' };
const BASE = 'http://lexkite.localhost/';
const serve = route => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
};
// ---- tiếng: WAV PCM16 mono ----
function wavBuf(pcm, sr) {
  const n = pcm.length, b = Buffer.alloc(44 + 2 * n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + 2 * n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(2 * sr, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(2 * n, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(pcm[i], 44 + 2 * i);
  return b;
}
function readWav(f) { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const sr = b.readUInt32LE(24), n = b.readUInt32LE(o + 4) / 2, pcm = new Int16Array(n); for (let i = 0; i < n; i++) pcm[i] = b.readInt16LE(o + 8 + 2 * i); return { sr, pcm }; }
// tiếng giả theo mốc (cho màn Call thật ở khối fps – copy call-e2e.mjs fixtureAudio): đúng độ dài + độ lớn của mốc CI → chế độ pre như máy thật
const CUES = (() => { try { const g = {}; new Function('self', fs.readFileSync(path.join(ROOT, 'js/call/cues.js'), 'utf8'))(g); return g.LK_CUES.k; } catch (e) { return {}; } })();
function fixtureWav(env) { const sr = 24000, hop = sr / 100, pcm = new Int16Array(env.length * hop); let ph = 0;
  for (let i = 0; i < pcm.length; i++) { ph += 2 * Math.PI * 180 / sr; pcm[i] = Math.round(9000 * env[Math.floor(i / hop)] * Math.sin(ph)); } return wavBuf(pcm, sr); }
const AUDIO_HOST = u => /\.mp3(\?|$)/.test(u.href) && !u.href.startsWith(BASE);
let REAL = {}; // khóa câu → wav thật (khối sync)
function audio(route) {
  const url = decodeURIComponent(route.request().url()), hit = Object.keys(REAL).find(k => url.includes('/' + k + '-ls.mp3'));
  const hdr = { 'Access-Control-Allow-Origin': '*' };
  if (hit) return route.fulfill({ status: 200, contentType: 'audio/wav', headers: hdr, body: REAL[hit] });
  const k = url.split('/').pop().replace(/(-s2)?(-ls)?\.mp3$/, ''), e = CUES[k];
  const env = e ? Array.from(Buffer.from(e[2].replace(/~(\d+)\./g, (_, m) => 'AAAA'.repeat(+m)), 'base64'), x => x / 255) : Array.from({ length: 160 }, (_, i) => (i > 10 && i < 70) || (i > 85 && i < 150) ? .8 : 0);
  return route.fulfill({ status: 200, contentType: 'audio/wav', headers: hdr, body: fixtureWav(env) });
}
// SR + TTS giả tối thiểu; móc HTMLMediaElement.play để test bám phần tử tiếng -ls đang phát (đổi rate 1,25 / tua / ghi lúc bắt đầu phát)
const INIT = () => {
  class MockSR { constructor() { this.continuous = false; this.interimResults = false; this.lang = ''; } static available() { return Promise.resolve('available'); }
    addEventListener() {} removeEventListener() {} start() { setTimeout(() => typeof this.onstart === 'function' && this.onstart({}), 20); } stop() { setTimeout(() => typeof this.onend === 'function' && this.onend({}), 0); } abort() {} }
  MockSR.prototype.processLocally = false; window.SpeechRecognition = window.webkitSpeechRecognition = MockSR;
  try { const ss = window.speechSynthesis; ss.speak = u => setTimeout(() => { if (u.onstart) u.onstart({}); if (u.onend) u.onend({}); }, 40); ss.getVoices = () => []; } catch (e) { /* */ }
  const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (/-ls\.mp3/.test(this.src) && window.__onPlay) window.__onPlay(this); return P.apply(this, arguments); };
  try { localStorage.setItem('lk.lipsync', '1'); localStorage.setItem('lk.ux1', '1'); } catch (e) { /* */ }
};

const fails = [], report = {}, ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); return cond; };
const UA = BR === 'webkit' ? { ...pw.devices['iPhone 13'] } : {};
// mỗi ngữ cảnh 1 trình duyệt riêng (máy dev: đóng context = sập trình duyệt; CI: chi phí ~1 s)
async function open(o = {}) {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  const browser = await launch(TYPE, { args });
  const ctx = await browser.newContext({ locale: 'vi', serviceWorkers: 'block', deviceScaleFactor: o.dpr || 1, ...(BR === 'chromium' ? { permissions: ['microphone'] } : {}), ...UA, ...(o.vp ? { viewport: o.vp } : {}) });
  await ctx.route('**/*', r => r.abort()); // mọi host ngoài: chặn (đăng ký TRƯỚC – route sau thắng)
  await ctx.route(BASE + '**', serve);
  await ctx.route(AUDIO_HOST, audio);
  await ctx.route('https://lexkite.com/api/**', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, notices: [], unread_count: 0 }) }));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|googletagmanager|speechSynthesis|net::ERR/i.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(INIT);
  await page.goto(`${BASE}app/?sandbox=1&hl=vi#/welcome/setup`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); }
  const g = await page.$('#go'); if (g) { await g.click().catch(() => {}); await page.waitForTimeout(1000); }
  return { browser, ctx, page, errs, close: async () => { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); } };
}
const go = (page, h) => page.evaluate(x => { location.hash = x; }, h);
// nạp đủ mặt vẽ (màn đổ chuông gọi LessonTeacher.prep()); dự phòng: tự nạp teacher.js + các tệp mặt vẽ
async function lipReady(page) {
  await go(page, '#/call/coffee'); await page.waitForSelector('#callGo', { timeout: 15000 });
  await page.waitForFunction(() => window.LessonTeacher && window.LipFace && window.LipPaint && window.LK_CUES && window.KVoice && window.LKAudio, null, { timeout: 15000 });
}

// ===== thước đo (Node) =====
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
/** Sự kiện tiếng từ độ lớn 100 Hz: onset = vượt 10 % đỉnh sau ≥ 150 ms im · offset = tắt trước ≥ 150 ms im (hoặc hết file) · đỉnh âm tiết (cực đại cục bộ ≥ 40 % đỉnh, có thung ≤ 70 %, tiếng đã kêu ≥ 60 ms). */
function events(env) {
  const pk = Math.max(...env, 1e-6), thr = pk * .1, on = [], off = [], peaks = []; let q = 99;
  for (let i = 0; i < env.length; i++) { if (env[i] > thr) { if (q >= 15) on.push(i / 100); q = 0; } else { if (q === 0 && i > 0) { let j = i; while (j < env.length && env[j] <= thr) j++; if (j - i >= 15 || j === env.length) off.push(i / 100); } q++; } }
  for (let i = 3; i < env.length - 3; i++) { const w = env.slice(Math.max(0, i - 8), i + 9); if (env[i] !== Math.max(...w) || env[i] < pk * .4) continue;
    let lo = i; while (lo > 0 && env[lo - 1] <= env[lo]) lo--; let hi = i; while (hi < env.length - 1 && env[hi + 1] <= env[hi]) hi++; if (Math.min(env[lo], env[hi]) < env[i] * .7 && env.slice(i - 6, i).every(x => x > thr)) peaks.push(i / 100); } // đỉnh ngay sau im (< BLEND 60 ms) = tiếng bật → đã đo ở onset
  return { on, off, peaks };
}
/** Mẫu khung [clk, open, …, động] (1 đoạn đồng hồ media đơn điệu) → lệch miệng so với từng sự kiện tiếng (ms; âm = miệng đi trước).
 * onset: miệng MỞ (open > 0,1) · offset: miệng về NGHỈ (hình X) – không dùng open vì âm cuối s/z/iː đúng hình B (răng khép, open ≈ 0) khi tiếng còn kêu
 * · đỉnh âm tiết: miệng đang phát âm (hình ≠ X). Mốc khung = trung điểm 2 khung kề nhau nơi trạng thái đổi. Không bắt được trong [−200, +250] ms → null (trượt). */
function lags(seg, ev) {
  const t0 = seg[0][0], t1 = seg[seg.length - 1][0], OPEN = x => x[1] > .1, ACT = x => x[4], cross = (tEv, want, f) => {
    for (let j = 1; j < seg.length; j++) { const ta = seg[j - 1][0], tb = seg[j][0]; if (tb < tEv - .2) continue; if (ta > tEv + .25) break;
      if (f(seg[j - 1]) !== want && f(seg[j]) === want) return Math.round(1000 * ((ta + tb) / 2 - tEv)); }
    return null; };
  const cov = t => t - .2 >= t0 && t + .25 <= t1; // sự kiện nằm trọn trong đoạn đã ghi
  const actAt = t => { let j = 0; while (j < seg.length - 1 && seg[j + 1][0] <= t) j++; return ACT(seg[j]); };
  return { on: ev.on.filter(cov).map(t => cross(t, true, OPEN)), off: ev.off.filter(t => cov(t) || (t + .25 > t1 && t - .2 >= t0)).filter(t => t + .05 <= t1).map(t => cross(t, false, ACT)),
    peaks: ev.peaks.filter(cov).map(t => actAt(t) || +t.toFixed(2)) }; // true = miệng đang phát âm · số = đỉnh bị trượt (giây, để dò)
}
const summ = (L, tag) => { const a = L.map(x => x == null ? 250 : Math.abs(x)); return { tag, n: L.length, miss: L.filter(x => x == null).length, mean: Math.round(mean(a)), p95: pct(a, .95), signed: Math.round(mean(L.filter(x => x != null))), all: L }; };

// ===== 1) Đồng bộ âm–hình tiếng thật + 7) clip =====
// câu ghép: nhiều câu thật nối nhau, xen 450 ms im → nhiều onset/offset mỗi lượt phát (mốc dựng trên toàn câu ghép – y như mỗi câu dài của Call)
const SETS = { ama: ['a_latte', 'a_could', 'a_idlike', 'a_giveme', 'a_bill', 'a_togo', 'a_muffin', 'a_card'], carlos: ['c_hi', 'c_order', 'c_sure', 'c_try', 'c_four', 'c_direct', 'c_nopro', 'c_forhere', 'c_tryid'] };
function buildLine(ids) {
  const parts = ids.map(id => ({ id, ...readWav(path.join(VOX, id + '.wav')), cues: JSON.parse(fs.readFileSync(path.join(VOX, id + '.json'), 'utf8')).mouthCues }));
  const sr = parts[0].sr, gap = Math.round(.45 * sr), hop = sr / 100; let n = 0; const rh = [];
  for (const p of parts) { if (p.sr !== sr) throw new Error('sr khác nhau: ' + p.id); const t0 = n / sr; for (const c of p.cues) rh.push({ start: t0 + c.start, end: t0 + c.end, value: c.value }); n += p.pcm.length; const g0 = n / sr; n += gap; rh.push({ start: g0, end: n / sr, value: 'X' }); }
  n = Math.ceil(n / hop) * hop; // tròn bước 10 ms → độ dài file = độ dài mốc
  const pcm = new Int16Array(n); let o = 0; for (const p of parts) { pcm.set(p.pcm, o); o += p.pcm.length + gap; }
  const wav = wavBuf(pcm, sr), f = path.join(OUT, 'line-' + ids[0] + '.wav'); fs.writeFileSync(f, wav);
  const env = rms100(f), dur = env.length / 100; rh[rh.length - 1].end = dur;
  const cues = LS.lead(LS.smooth(LS.align(LS.smooth(rh), env))); // đúng đường ống web (call_cues.mjs / cues_cli.mjs fromKokoro: align → smooth → lead)
  const pk = Math.max(...env, 1e-6), b64 = Buffer.from(env.map(x => Math.round(255 * Math.min(1, x / pk)))).toString('base64').replace(/(?:AAAA){2,}/g, m => '~' + m.length / 4 + '.');
  return { wav, file: f, env, dur, entry: [Math.round(dur * 1000), LS.packCues(cues.map(q => q.value + Math.round(q.start * 1000)).join(' ')), b64], ids };
}
// một lượt phát trong trang: mount giáo viên (mặt vẽ) → say() như Call → ghi mỗi khung; o.force = playbackRate ép (1,25) · o.seek = [lúc, tới] · o.rec = quay clip canvas
const RUN = async ({ who, text, voice, entry, o }) => {
  document.querySelector('#lipT')?.remove();
  const W = 420, el = Object.assign(document.createElement('div'), { id: 'lipT' }); el.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${Math.round(W * 960 / 1108)}px;z-index:2147483647;background:#fff`;
  document.body.appendChild(el);
  const key = KVoice.lineKey(voice, text); LK_CUES.k[key] = entry;
  const T = LessonTeacher.mount(el, who, { lip: true }); window.__T = T;
  for (let i = 0; i < 200 && !(T.lip() && el.querySelector('canvas.tch-face')); i++) await new Promise(r => setTimeout(r, 25));
  if (!T.lip()) return { err: 'không có mặt vẽ' };
  const cv = el.querySelector('canvas.tch-face'); await new Promise(r => setTimeout(r, 400)); // ảnh đầu trơn đã vẽ
  const S = [], modes = {}; let a = null, lastF = -1, seeked = false, done = false, rec = null, chunks = [], w0 = 0, w1 = 0, ct1 = 0;
  if (o.rec && window.MediaRecorder) { // quay CHÍNH canvas mặt vẽ (nền trắng) – tiếng ghép sau bằng ffmpeg theo lệch đã đo (w1 − w0 − ct1)
    // cắt sát vùng đầu (tọa độ poster 1108×960, mắt–cằm) để thấy rõ miệng; dpr 2 → canvas mặt vẽ ở độ phân giải gốc
    const k = cv.width / 1108, H = [330, 150, 450, 380].map(v => Math.round(v * k)), rc = Object.assign(document.createElement('canvas'), { width: 720, height: 608 }), x = rc.getContext('2d');
    const paint = () => { if (done) return; x.fillStyle = '#fff'; x.fillRect(0, 0, rc.width, rc.height); x.drawImage(cv, H[0], H[1], H[2], H[3], 0, 0, rc.width, rc.height); requestAnimationFrame(paint); }; paint();
    rec = new MediaRecorder(rc.captureStream(30), { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 3e6 }); rec.ondataavailable = e => e.data.size && chunks.push(e.data); rec.start(200); w0 = performance.now();
  }
  window.__onPlay = el2 => { a = el2; if (o.force) el2.playbackRate = o.force; el2.addEventListener('playing', () => { if (!w1) { w1 = performance.now(); ct1 = el2.currentTime; } }, { once: true }); };
  const loop = () => { if (done) return; const s = T.lip();
    if (s.frames !== lastF) { lastF = s.frames; if (a && s.clk >= 0) { S.push([s.clk, s.open, performance.now(), a.paused ? 0 : a.playbackRate, s.shape !== 'X']); modes[s.mode] = (modes[s.mode] || 0) + 1; } }
    if (a && o.seek && !seeked && a.currentTime >= o.seek[0]) { seeked = true; a.currentTime = o.seek[1]; S.push(['seek']); }
    requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const f0 = T.lip().frames, l0 = T.lip().long, t0 = performance.now();
  await new Promise(res => T.say(text, { voice, rate: o.rate, onEnd: res }));
  await new Promise(r => setTimeout(r, 350)); const after = T.lip(); // hết tiếng → miệng ngậm
  const fps = Math.round(1000 * (after.frames - f0) / (performance.now() - t0)), long = after.long - l0;
  done = true; let vid = null;
  if (rec) { await new Promise(r => { rec.onstop = r; rec.stop(); }); const b = new Blob(chunks, { type: 'video/webm' }); vid = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(b); }); }
  const res = { S, modes, rate: a ? a.playbackRate : 0, src: a ? a.src.split('/').pop() : '', endShape: after.shape, endOpen: after.open, fps, long, vid, off: rec ? (w1 - w0) / 1000 - ct1 : 0, canvases: document.querySelectorAll('canvas.tch-face').length };
  T.destroy(); el.remove(); return res;
};
function analyze(r, line, rate, tag) {
  const segs = [[]]; for (const x of r.S) { if (x[0] === 'seek') { segs.push([]); continue; } const s = segs[segs.length - 1]; if (s.length && x[0] < s[s.length - 1][0] - 1e-3) segs.push([x]); else s.push(x); }
  const ev = events(line.env), use = r.seekOnly ? segs.slice(1) : segs, L = { on: [], off: [], peaks: [] };
  for (const sg of use.filter(s => s.length > 10)) { const l = lags(sg, ev); L.on.push(...l.on); L.off.push(...l.off); L.peaks.push(...l.peaks); }
  // đồng hồ media so đồng hồ tường (đoạn dài nhất, lúc đang phát): độ dốc ≈ rate
  const sg = use.filter(s => s.length > 10).sort((a, b) => b.length - a.length)[0] || [], pl = sg.filter(x => x[3] > 0);
  const slope = pl.length > 20 ? (pl[pl.length - 1][0] - pl[0][0]) / ((pl[pl.length - 1][2] - pl[0][2]) / 1000) : 0;
  return { tag, rate, on: summ(L.on, 'onset'), off: summ(L.off, 'offset'), peakOpen: L.peaks.length ? Math.round(100 * L.peaks.filter(x => x === true).length / L.peaks.length) : 100, peakMiss: L.peaks.filter(x => x !== true), nPeaks: L.peaks.length, slope: Math.round(slope * 1000) / 1000,
    frames: r.S.length, modes: r.modes, fps: r.fps, long: r.long, endShape: r.endShape, endOpen: r.endOpen, src: r.src, canvases: r.canvases };
}
async function sync(rep) {
  const out = []; const clips = path.join(OUT, 'clips'); fs.mkdirSync(clips, { recursive: true });
  for (const who of ['ama', 'carlos']) {
    const line = buildLine(SETS[who]), ev = events(line.env), text = `lip test ${who} ${SETS[who].join(' ')}`;
    const mid = ev.on[Math.floor(ev.on.length / 2)], seek = [Math.min(line.dur - .3, mid + .5), Math.max(0, ev.on[1] - .35)]; // tua LÙI qua 1 nửa câu
    const { page, errs, close } = await open({ vp: { width: 1280, height: 800 }, dpr: 2 });
    try {
      await lipReady(page);
      const voice = await page.evaluate(w => LessonTeacher.VOICE[w], who), key = await page.evaluate(([v, t]) => KVoice.lineKey(v, t), [voice, text]);
      REAL = { [key]: line.wav };
      for (const [rate, o, tag] of [[0.75, { rate: 0.75 }, 'rate 0,75 (🐢)'], [1, { rate: 1, rec: rep === 0 && ONLY.has('clip') }, 'rate 1'], [1.25, { rate: 1, force: 1.25 }, 'rate 1,25'], [1, { rate: 1, seek }, 'sau khi tua']]) {
        const r = await page.evaluate(RUN, { who, text, voice, entry: line.entry, o });
        if (r.err) { ok(false, `${who} ${tag}: ${r.err}`); continue; }
        if (o.seek) r.seekOnly = true;
        const A = analyze(r, line, rate, tag); A.who = who; out.push(A);
        const head = `${who} · ${tag}`;
        ok(A.on.n >= 3 && A.on.mean <= 40 && A.on.p95 <= 80 && !A.on.miss, `${head}: lệch onset tiếng→miệng TB ${A.on.mean} ms (≤ 40) · p95 ${A.on.p95} ms (≤ 80) · ${A.on.n} onset, trượt ${A.on.miss} · có dấu TB ${A.on.signed} ms`);
        ok(A.off.n >= 2 && A.off.mean <= 40 && A.off.p95 <= 80 && !A.off.miss, `${head}: miệng về nghỉ (X) khi tiếng tắt TB ${A.off.mean} ms · p95 ${A.off.p95} ms · ${A.off.n} chỗ tắt, trượt ${A.off.miss}`);
        ok(A.peakOpen >= 95, `${head}: miệng đang phát âm ở đỉnh âm tiết ${A.peakOpen} % (${A.nPeaks} đỉnh, ≥ 95 %)`);
        ok(Math.abs(A.slope - rate) <= 0.05 * rate, `${head}: đồng hồ media chạy ${A.slope}× (rate ${rate}, phần tử ${A.src} playbackRate ${r.rate})`);
        ok(!A.modes.live && !A.modes.idle && A.modes.pre > 30, `${head}: luôn chế độ pre (mốc + tiếng thật) ${JSON.stringify(A.modes)}`);
        ok(A.endShape === 'X' && A.endOpen === 0, `${head}: hết tiếng → miệng ngậm (${A.endShape}, ${A.endOpen})`);
        if (r.vid) { const v = path.join(clips, `${who}-rate1.webm`), mp4 = path.join(clips, `${who}-rate1.mp4`); fs.writeFileSync(v, Buffer.from(r.vid, 'base64'));
          try { // ghép tiếng thật đúng lệch đo được (tiếng bắt đầu sau khung đầu của clip r.off giây)
            execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', v, '-itsoffset', String(Math.max(0, r.off).toFixed(3)), '-i', line.file, '-map', '0:v', '-map', '1:a', '-t', '12', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '96k', '-shortest', mp4]);
            fs.unlinkSync(v); console.log(`  clip: ${path.relative(process.cwd(), mp4)} (tiếng lệch khung đầu ${r.off.toFixed(3)} s)`);
          } catch (e) { console.log('  clip: ffmpeg không ghép được (' + String(e.message).slice(0, 120) + ') – giữ webm không tiếng'); } }
      }
      ok(!errs.length, `${who}: không lỗi JS` + (errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''));
    } finally { await close(); }
  }
  report.sync = (report.sync || []).concat(out.map(({ on, off, ...x }) => ({ ...x, on: { ...on, all: undefined, lags: on.all }, off: { ...off, all: undefined, lags: off.all } })));
}

// ===== 2) SSIM khung ghép =====
const VIS = ['X', 'A', 'D', 'E', 'F', 'G'];
// trong trang: khung ghép đầu trơn (poster-2x) + lớp mặt vẽ ở trạng thái cố định, cắt vùng đầu (tọa độ poster 1108×960). mut: 'shift' miệng lệch 8 px · 'blink' mắt nhắm · 'wrong' sai hình miệng
const FRAMES = async ({ who, list, gold }) => {
  const R = LipFace.RIG[who], ex = R.eyes, x0 = Math.min(...ex.map(e => e.c[0] - e.rx)) - 90, x1 = Math.max(...ex.map(e => e.c[0] + e.rx)) + 90, y0 = Math.min(...R.brows.map(b => b.p[1])) - 50, y1 = R.mouth[1] + 90;
  const box = [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];
  const reg = { mouth: [R.mouth[0] - 80, R.mouth[1] - 45, 160, 100], eyes: [Math.min(...ex.map(e => e.c[0] - e.rx)) - 14, Math.min(...ex.map(e => e.c[1] - e.ry)) - 14, 0, 0] };
  reg.eyes[2] = Math.max(...ex.map(e => e.c[0] + e.rx)) + 14 - reg.eyes[0]; reg.eyes[3] = Math.max(...ex.map(e => e.c[1] + e.ry)) + 14 - reg.eyes[1];
  const head = new Image(); head.src = Chars.head(who, true); await head.decode();
  const frame = (v, mut) => {
    const cv = Object.assign(document.createElement('canvas'), { width: box[2], height: box[3] }), x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, box[2], box[3]); x.translate(-box[0], -box[1]); x.drawImage(head, 0, 0, 1108, 960);
    const sh = mut === 'wrong' ? (v === 'D' ? 'A' : 'D') : v, m = LipMouth.mix(sh, sh, 1), open = m.u + m.d > .02 ? Math.min(1, (m.u + m.d) / .9) : 0;
    const p = LipFace.parts(who, { mouth: m, blink: mut === 'blink' ? 1 : 0, look: { x: R.look[0], y: R.look[1] }, brow: 0, knit: 0, open }, 'g');
    if (mut === 'shift') p[3] = `<g transform="translate(8 0)">${p[3]}</g>`;
    for (const s of p) if (s) LipPaint.draw(x, s);
    return cv;
  };
  const gray = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, g = new Float32Array(cv.width * cv.height); for (let i = 0; i < g.length; i++) g[i] = .299 * d[4 * i] + .587 * d[4 * i + 1] + .114 * d[4 * i + 2]; return g; };
  // SSIM (Wang 2004) cửa sổ 8×8 bước 4 trên độ sáng; r = vùng [x, y, w, h] theo tọa độ poster (chỉ cửa sổ nằm trọn trong vùng)
  const ssim = (A, B, w, h, r) => { const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2, rx = r ? r[0] - box[0] : 0, ry = r ? r[1] - box[1] : 0, rw = r ? r[2] : w, rh = r ? r[3] : h; let s = 0, n = 0;
    for (let y = Math.max(0, ry); y + 8 <= Math.min(h, ry + rh); y += 4) for (let x = Math.max(0, rx); x + 8 <= Math.min(w, rx + rw); x += 4) {
      let ma = 0, mb = 0; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + x + i; ma += A[k]; mb += B[k]; } ma /= 64; mb /= 64;
      let va = 0, vb = 0, cov = 0; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + x + i, a = A[k] - ma, b = B[k] - mb; va += a * a; vb += b * b; cov += a * b; } va /= 63; vb /= 63; cov /= 63;
      s += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); n++; }
    return Math.round(1e4 * s / (n || 1)) / 1e4; };
  const out = [];
  for (const { v, mut } of list) {
    const cv = frame(v, mut), png = cv.toDataURL('image/png').split(',')[1];
    let cmp = null;
    if (gold[v]) { const im = new Image(); im.src = 'data:image/png;base64,' + gold[v]; await im.decode(); const gc = Object.assign(document.createElement('canvas'), { width: box[2], height: box[3] }); gc.getContext('2d').drawImage(im, 0, 0);
      const A = gray(gc), B = gray(cv); cmp = { size: im.width === box[2] && im.height === box[3], full: ssim(A, B, box[2], box[3]), mouth: ssim(A, B, box[2], box[3], reg.mouth), eyes: ssim(A, B, box[2], box[3], reg.eyes) }; }
    out.push({ v, mut, png: mut ? null : png, cmp });
  }
  return { box, reg, out };
};
async function ssimBlock() {
  const { page, errs, close } = await open({ vp: { width: 1280, height: 800 } });
  try {
    await lipReady(page); fs.mkdirSync(GOLD, { recursive: true });
    for (const who of ['ama', 'carlos']) {
      const gold = {}; if (!WRITE) for (const v of VIS) { const f = path.join(GOLD, `${who}-${v}.png`); if (fs.existsSync(f)) gold[v] = fs.readFileSync(f).toString('base64'); }
      const list = [...VIS.map(v => ({ v })), { v: 'D', mut: 'shift' }, { v: 'X', mut: 'blink' }, { v: 'X', mut: 'wrong' }, { v: 'G', mut: 'shift' }];
      const r = await page.evaluate(FRAMES, { who, list, gold });
      if (WRITE) { for (const x of r.out) if (x.png) fs.writeFileSync(path.join(GOLD, `${who}-${x.v}.png`), Buffer.from(x.png, 'base64')); console.log(`  ảnh mẫu ${who}: ${VIS.length} khung ${r.box[2]}×${r.box[3]} → ${path.relative(process.cwd(), GOLD)}`); continue; }
      const sd = path.join(OUT, 'ssim'); fs.mkdirSync(sd, { recursive: true });
      for (const x of r.out) {
        const c = x.cmp; if (x.png) fs.writeFileSync(path.join(sd, `${who}-${x.v}.png`), Buffer.from(x.png, 'base64'));
        if (!c) { ok(false, `SSIM ${who} ${x.v}: thiếu ảnh mẫu ${path.relative(process.cwd(), GOLD)}/${who}-${x.v}.png (chạy --write-golden, duyệt rồi commit)`); continue; }
        const pass = c.size && c.full >= 0.97 && c.mouth >= 0.95 && c.eyes >= 0.95, s = `toàn khung ${c.full} · miệng ${c.mouth} · mắt ${c.eyes}`;
        if (!x.mut) ok(pass, `SSIM ${who} viseme ${x.v}: ${s} (≥ 0,97 / 0,95 / 0,95)`);
        else { const hitReg = x.mut === 'blink' ? c.eyes < 0.95 : c.mouth < 0.95; ok(!pass && hitReg, `SSIM ${who} ca méo cố ý "${x.mut}" ${x.v} bị bắt (ĐỎ đúng): ${s}`); }
        (report.ssim ||= []).push({ who, v: x.v, mut: x.mut || null, ...c });
      }
    }
    ok(!errs.length, 'SSIM: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''));
  } finally { await close(); }
}

// ===== 3) fps màn Call thật =====
async function fps(rep) {
  const vps = BR === 'webkit' ? [null] : [{ width: 375, height: 812 }, { width: 1280, height: 800 }];
  for (const vp of vps) {
    const tag = `${BR} ${vp ? vp.width + ' px' : 'iPhone 13 ' + UA.viewport.width + ' px'}${BR === 'chromium' ? ' · CPU 4×' : ''}${REPEAT > 1 ? ` · lượt ${rep + 1}/${REPEAT}` : ''}`;
    const { ctx, page, errs, close } = await open({ vp });
    try {
      await lipReady(page); await page.click('#callGo');
      const on = await page.waitForFunction(() => document.querySelector('.tch-rig canvas.tch-face'), null, { timeout: 15000 }).then(() => true, () => false);
      if (!ok(on, `${tag}: mặt vẽ canvas hiện trên màn Call`)) continue;
      const lip = () => page.evaluate(() => window.__callState && window.__callState().lip);
      await page.waitForFunction(() => { const l = window.__callState && window.__callState().lip; return l && l.mode !== 'idle'; }, null, { timeout: 8000 }).catch(() => {});
      const cdp = BR === 'chromium' ? await ctx.newCDPSession(page) : null; if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(300); // bỏ khung chuyển tiếp lúc đổi throttle
      await page.evaluate(() => { window.__loaf = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 50) window.__loaf.push({ t: Math.round(e.startTime), d: Math.round(e.duration), blk: Math.round(e.blockingDuration || 0), render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0), sc: (e.scripts || []).map(x => `${x.invoker || ''} ${(x.sourceURL || '').split('/').pop()}:${x.sourceFunctionName || ''} ${Math.round(x.duration)}ms`).slice(0, 4) }); }).observe({ type: 'long-animation-frame', buffered: false }); } catch (e) { /* WebKit: không có LoAF */ } });
      const a = await lip(), modes = new Set(); for (let i = 0; i < 15; i++) { await page.waitForTimeout(200); const l = await lip(); if (l) modes.add(l.mode); }
      const b = await lip(); if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const f = a && b ? Math.round(1000 * (b.frames - a.frames) / (b.now - a.now)) : 0, lg = a && b ? b.long - a.long : 99;
      ok(f >= 50 && lg <= 1, `${tag}: mặt vẽ ${f} fps (≥ 50) · khung > 50 ms: ${lg} (≤ 1) · chế độ ${[...modes].join('/')}`);
      ok(modes.has('pre') || modes.has('live'), `${tag}: đo lúc giáo viên ĐANG NÓI (${[...modes].join('/')})`);
      ok(await page.evaluate(() => document.querySelectorAll('canvas.tch-face').length === 1), `${tag}: đúng 1 canvas mặt vẽ`);
      ok(!errs.length, `${tag}: không lỗi JS` + (errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''));
      const loaf = await page.evaluate(() => window.__loaf || []); if (lg) console.log(`  khung dài (LoAF): ${JSON.stringify(loaf).slice(0, 900)}`);
      (report.fps ||= []).push({ tag, fps: f, long: lg, modes: [...modes], loaf });
    } finally { await close(); }
  }
}

for (let rep = 0; rep < REPEAT; rep++) {
  if (REPEAT > 1) console.log(`— lượt ${rep + 1}/${REPEAT} —`);
  if (ONLY.has('ssim') && rep === 0) await ssimBlock();
  if (WRITE) break;
  if (ONLY.has('fps')) await fps(rep);
  if (ONLY.has('sync') && BR === 'chromium') await sync(rep);
}
fs.writeFileSync(path.join(OUT, `result-${BR}.json`), JSON.stringify({ fails, local: LOCAL, ...report }, null, 1));
if (fails.length) { console.error(`✗ call-lip (${BR}): ${fails.length} lỗi`); process.exit(1); }
console.log(`✓ call-lip (${BR}): mọi kiểm tra đạt`);
