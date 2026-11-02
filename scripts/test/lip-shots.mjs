// 👄 Ảnh mặt vẽ khớp miệng của Ama + Carlos (canvas .tch-rig canvas.tch-face): cuộc gọi + bài học, sáng/tối, 375/1280 px.
// Chạy trên CI (call-qa.yml) cho bản mới (qa/lip-after) và bản main (qa/lip-before, chưa có mặt vẽ → chụp những gì hiện ra).
// Không mạng thật: mọi host ngoài bị chặn; audio.lexkite.com / lexkite-media → tiếng giả (fixtureAudio, copy từ call-e2e.mjs); lexkite.com/api → 200/204 rỗng.
// Truyện (hai giáo viên cùng màn): bỏ qua – không có route cố định (nút bản đồ 'story' phụ thuộc kế hoạch học).
// Dùng: node scripts/test/lip-shots.mjs --root web --out qa/lip-after
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || 'qa/lip'), ROOT = path.resolve(arg('--root') || 'web');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.mp3': 'audio/mpeg' };
const BASE = 'http://lexkite.localhost/';
const serve = route => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
};

// ---- tiếng giả (copy từ call-e2e.mjs) ----
const CUES = (() => { try { const g = {}; new Function('self', fs.readFileSync(path.join(ROOT, 'js/call/cues.js'), 'utf8'))(g); return g.LK_CUES.k; } catch (e) { return {}; } })();
function wav(env) {
  const sr = 24000, hop = sr / 100, n = env.length * hop, b = Buffer.alloc(44 + 2 * n); let ph = 0;
  b.write('RIFF', 0); b.writeUInt32LE(36 + 2 * n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(2 * sr, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(2 * n, 40);
  for (let i = 0; i < n; i++) { ph += 2 * Math.PI * 180 / sr; b.writeInt16LE(Math.round(9000 * env[Math.floor(i / hop)] * Math.sin(ph)), 44 + 2 * i); }
  return b;
}
function fixtureAudio(route) {
  const k = decodeURIComponent(new URL(route.request().url()).pathname).split('/').pop().replace(/(-s2)?(-ls)?\.mp3$/, ''), e = CUES[k];
  const env = e ? Array.from(Buffer.from(e[2].replace(/~(\d+)\./g, (_, m) => 'AAAA'.repeat(+m)), 'base64'), x => x / 255) : Array.from({ length: 160 }, (_, i) => (i > 10 && i < 70) || (i > 85 && i < 150) ? .8 : 0);
  return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'Access-Control-Allow-Origin': '*' }, body: wav(env) });
}

// SR + TTS giả tối thiểu (headless không có giọng/micro)
const MOCK = () => {
  window.__heard = [];
  class MockSR {
    constructor() { this.continuous = false; this.interimResults = false; this.lang = ''; }
    static available() { return Promise.resolve('available'); }
    addEventListener() {} removeEventListener() {}
    start() { setTimeout(() => typeof this.onstart === 'function' && this.onstart({}), 20); }
    stop() { setTimeout(() => typeof this.onend === 'function' && this.onend({}), 0); }
    abort() {}
  }
  MockSR.prototype.processLocally = false;
  window.SpeechRecognition = window.webkitSpeechRecognition = MockSR;
  try { const ss = window.speechSynthesis; ss.speak = u => setTimeout(() => { if (u.onstart) u.onstart({}); if (u.onend) u.onend({}); }, 40); ss.getVoices = () => []; } catch (e) { /* */ }
};

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const report = {};

async function open({ vp, theme, who }) {
  const ctx = await browser.newContext({ locale: 'vi', permissions: ['microphone'], serviceWorkers: 'block', viewport: vp, deviceScaleFactor: 1, colorScheme: theme });
  await ctx.route('**/*', r => r.abort()); // mọi host ngoài: chặn (đăng ký TRƯỚC – route sau thắng)
  await ctx.route(BASE + '**', serve);
  await ctx.route(/audio\.lexkite\.com|github\.io\/(lexkite-media|audio)|lexkite-media/, fixtureAudio);
  await ctx.route('https://lexkite.com/api/**', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|googletagmanager|speechSynthesis|net::ERR/i.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(MOCK, { local: true });
  await page.addInitScript(w => { try { localStorage.setItem('lk.lipsync', '1'); localStorage.setItem('lk.ux1', '1'); if (w) localStorage.setItem('lk.lsn.who', w); } catch (e) { /* */ } }, who || null);
  await page.goto(`${BASE}app/?sandbox=1&hl=vi#/welcome/setup`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); }
  const g = await page.$('#go'); if (g) { await g.click().catch(() => {}); await page.waitForTimeout(1000); }
  return { ctx, page, errs };
}
const go = (page, h) => page.evaluate(x => { location.hash = x; }, h);

const SCREENS = [
  { id: 'call', who: 'ama', run: page => call(page, 'coffee') }, // Cuộc gọi coffee: Ama
  { id: 'call', who: 'carlos', run: page => call(page, 'bakery') }, // Cuộc gọi bakery: Carlos (calls-exam.js)
  { id: 'lesson', who: 'auto', pre: 'ama', run: lesson }, // bài học: lk.lsn.who xen kẽ (bản v2 luôn Ama)
];
async function call(page, id) { // màn Call v2 không còn .call-ov: chờ giáo viên #cTch rồi lúc đang nói
  await go(page, '#/call/' + id); await page.waitForSelector('#callGo', { timeout: 15000 }); await page.click('#callGo');
  await page.waitForSelector('#cTch .tch-rig, .tch .tch-rig', { timeout: 12000 });
  await page.waitForFunction(() => window.__callState && window.__callState().phase === 'talk', null, { timeout: 12000 }).catch(() => {});
}
async function lesson(page) {
  await go(page, '#/lesson/go?demo=1');
  await page.waitForSelector('.tch .tch-rig', { timeout: 15000 });
}

for (const sc of SCREENS) for (const theme of ['light', 'dark']) for (const w of [375, 1280]) {
  const name = `${sc.id}-${sc.who}-${theme}-${w}`;
  let ctx, pg;
  try {
    const o = await open({ vp: { width: w, height: w === 375 ? 812 : 800 }, theme, who: sc.pre });
    ctx = o.ctx; const { page, errs } = o; pg = page;
    await sc.run(page);
    await page.waitForSelector('.tch-rig canvas.tch-face', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1200); // giữa câu
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    report[name] = await page.evaluate(() => ({
      canvas: !!document.querySelector('.tch-rig canvas.tch-face'),
      canvases: document.querySelectorAll('canvas.tch-face').length,
      lip: window.__callState ? (() => { try { return window.__callState().lip; } catch (e) { return 'err'; } })() : null,
    }));
    report[name].errors = errs.slice(0, 10);
    console.log('✓ ' + name, JSON.stringify(report[name]));
  } catch (e) {
    report[name] = { error: String(e && e.message || e).slice(0, 300) }; console.log('✗ ' + name + ' ' + report[name].error);
    if (pg) { await pg.screenshot({ path: path.join(OUT, 'fail-' + name + '.png') }).catch(() => {}); console.log('  tại', await pg.evaluate(() => location.hash + ' · ' + document.body.innerText.slice(0, 160).replace(/\s+/g, ' ')).catch(() => '?')); }
  } finally { if (ctx) await ctx.close().catch(() => {}); }
}
fs.writeFileSync(path.join(OUT, 'lip.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('lip-shots: ' + OUT);
