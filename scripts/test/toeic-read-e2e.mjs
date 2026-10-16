// 🎙️ Kiểm thử đầu-cuối trang TOEIC Speaking "Read aloud" (#/toeic-sw/read) – chấm đọc to tự động.
// Chromium thật + micro giả (--use-fake-device-for-media-stream) + SpeechRecognition GIẢ (bơm trước khi trang chạy)
// phát kết quả nhận dạng theo kịch bản thời gian; đồng hồ giả của Playwright (page.clock) tua nhanh 45 giây ghi âm.
//   A: đọc đủ ~140 từ/phút (định dạng như Chrome trả về: "15%", "$50", "9 o'clock")
//   B: ~65–70% số từ, bỏ 2 cụm (trình duyệt không phát onspeechstart)
//   C: chậm ~90 từ/phút, có 2 khoảng lặng dài
//   D: không có SpeechRecognition → vẫn ghi âm, hiện khung nghe lại, không lỗi
// Dùng: node scripts/test/toeic-read-e2e.mjs   (cần: npm i --no-save playwright@1.48.2 && npx playwright install chromium) – chạy trong health.yml
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import vm from 'vm';
import { execFileSync } from 'child_process';

const ROOT = path.resolve('web');
const ctxSW = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/toeic/sw1.js'), 'utf8'), ctxSW);
const UNIT = ctxSW.self.TOEIC_SW.speaking.filter(u => u.task === 'read')[0]; // đề i=0
const TEXT = UNIT.text;

// ── Phục vụ web/ qua page.route (không cần mở cổng – chạy được cả trong sandbox lẫn CI) ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.xml': 'application/xml' };
const BASE = 'http://lexkite.localhost/';
const serve = route => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
};

// ── Âm thanh giả cho micro (tùy chọn: ffmpeg có sẵn thì dùng sóng sin 440 Hz) ──
const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
try { const wav = path.join(os.tmpdir(), 'lexkite-sine.wav'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=60', '-ar', '16000', '-ac', '1', wav]); args.push(`--use-file-for-fake-audio-capture=${wav}`); } catch (e) { /* không có ffmpeg – micro giả mặc định (tiếng bíp) */ }

// ── Kịch bản nhận dạng: chia thành cụm ~10 từ, mỗi cụm trả kết quả cuối khi nói xong (+300 ms trễ) ──
function script(transcript, wpm, { gaps = {}, speechStart = true, lead = 400 } = {}) {
  const words = transcript.split(/\s+/).filter(Boolean), chunks = []; let t = 0;
  for (let i = 0, k = 0; i < words.length; i += 10, k++) {
    const w = words.slice(i, i + 10); t += (gaps[k] || 0) + w.length / wpm * 60000;
    chunks.push({ text: w.join(' '), at: Math.round(t) + 300 });
  }
  return { chunks, speechStart, lead };
}
// Chuỗi Chrome thực tế trả về (thường, không dấu câu, số viết bằng chữ số)
const srStyle = s => s.replace(/fifteen percent/g, '15%').replace(/fifty dollars/g, '$50').replace(/nine o'clock/g, "9 o'clock").replace(/[.,]/g, '').toLowerCase();
const SKIP = ["Our bakery, deli and seafood counters are open until nine o'clock this evening.", 'please ask any member of our staff, who will be happy to assist you.'];
const textB = SKIP.reduce((s, x) => s.replace(x, ''), TEXT).replace(/\s+/g, ' ').trim();
const skippedOnly = new Set(SKIP.join(' ').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !` ${textB.toLowerCase().replace(/[^a-z' ]/g, ' ')} `.includes(` ${w} `)));
const textC = TEXT.split(/\s+/).slice(0, 52).join(' '); // đọc chậm → hết 45 giây chỉ kịp ~2/3 bài
const CASES = {
  A: script(srStyle(TEXT), 140),
  B: script(srStyle(textB), 140, { speechStart: false }),
  C: script(srStyle(textC), 90, { gaps: { 2: 4000, 4: 4500 } }),
};

const MOCK = cfg => {
  if (cfg === 'none') { try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; } catch (e) { /* */ } window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; return; }
  class MockSR {
    constructor() { this.continuous = false; this.interimResults = false; this.lang = ''; this._t = []; }
    addEventListener() {} removeEventListener() {}
    start() {
      const c = cfg, results = [], fire = (n, e) => typeof this[n] === 'function' && this[n](e || {});
      this._t.push(setTimeout(() => { fire('onstart'); fire('onaudiostart'); }, 30));
      if (c.speechStart) this._t.push(setTimeout(() => fire('onspeechstart'), c.lead));
      c.chunks.forEach(ch => this._t.push(setTimeout(() => {
        const alt = [{ transcript: ch.text, confidence: 0.92 }]; alt.isFinal = true; results.push(alt);
        fire('onresult', { resultIndex: results.length - 1, results });
      }, c.lead + ch.at)));
    }
    stop() { this._t.forEach(clearTimeout); this._t = []; setTimeout(() => typeof this.onend === 'function' && this.onend({}), 0); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = MockSR;
};

const browser = await chromium.launch({ args });
const fails = [], out = {}, ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

async function run(name, cfg) {
  const ctx = await browser.newContext({ locale: 'vi', permissions: ['microphone'], serviceWorkers: 'block' });
  await ctx.route(BASE + '**', serve);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|googletagmanager|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(MOCK, cfg);
  await page.clock.install();
  await page.goto(`${BASE}?sandbox=1&hl=vi#/welcome/setup`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); const go0 = await page.$('#go'); if (go0) { await go0.click().catch(() => {}); await page.waitForTimeout(1000); }
  await page.evaluate(() => { location.hash = '#/toeic-sw/read?i=0'; });
  await page.waitForSelector('#swGo', { timeout: 15000 });
  ok((await page.textContent('.toeic-pass')).includes('Greenfield Market'), `${name}: hiện đề "${UNIT.title}"`);
  // Bấm chuẩn bị rồi "Nói ngay" (bỏ qua 45 giây chuẩn bị)
  await page.click('#swPrepB'); await page.clock.runFor(2000);
  await page.click('#swGo');
  await page.waitForFunction(() => window.MediaRecorder && document.querySelector('#swPhase').textContent.includes('🔴'), null, { timeout: 5000 });
  await page.waitForTimeout(1200); // để MediaRecorder có dữ liệu thật
  await page.clock.runFor((UNIT.secs + 1) * 1000); // tua hết 45 giây ghi âm
  await page.waitForFunction(() => (document.querySelector('#swRes') || {}).textContent, null, { timeout: 10000 });
  const r = await page.evaluate(() => {
    const el = document.querySelector('#swRes'), tx = el.innerText;
    const num = re => { const m = tx.match(re); return m ? +m[1] : null; };
    return { tx, pct: num(/khớp với văn bản: (\d+)%/), wpm: num(/Tốc độ: (\d+) từ\/phút/), pauses: num(/Ngắt quãng dài: (\d+)/), est: num(/Ước tính: (\d)\/3/),
      slow: /Hơi chậm/.test(tx), missed: [...el.querySelectorAll('.chip')].map(c => c.textContent.trim()), audio: !!el.querySelector('audio[src^="blob:"]') };
  });
  ok(!errs.length, `${name}: không lỗi console/JS${errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''}`);
  await ctx.close();
  return r;
}

try {
  for (const k of ['A', 'B', 'C']) {
    const r = out[k] = await run(k, CASES[k]);
    console.log(`   ${k}: khớp ${r.pct}% · ${r.wpm} từ/phút · ngắt ${r.pauses} · ước tính ${r.est}/3 · sót [${r.missed.join(', ')}]`);
    ok(r.pct != null && r.wpm != null && r.est != null, `${k}: hiện khung chấm điểm`);
  }
  const { A, B, C } = out;
  ok(A.pct >= 90, `A: độ khớp ≥ 90 (${A.pct})`);
  ok(A.wpm >= 125 && A.wpm <= 155, `A: tốc độ ~140 từ/phút (${A.wpm})`);
  ok(!A.missed.some(w => /fifteen|percent|fifty|dollars|nine/.test(w)), `A: số đọc đúng ("15%", "$50", "9 o'clock") không bị tính là sót (${A.missed.join(',') || 'không'})`);
  ok(A.est === 3 && !A.slow, `A: ước tính 3/3, không cảnh báo chậm (${A.est})`);
  ok(B.pct >= 60 && B.pct <= 80, `B: độ khớp 60–80 (${B.pct})`);
  ok(B.wpm >= 120 && B.wpm <= 160, `B: tốc độ ~140 từ/phút dù không có onspeechstart (${B.wpm})`);
  ok(B.missed.length >= 4 && B.missed.every(w => skippedOnly.has(w)), `B: từ sót đều thuộc 2 cụm bị bỏ (${B.missed.join(',')})`);
  ok(['bakery', 'deli', 'seafood', 'counters'].every(w => B.missed.includes(w)), 'B: có bakery, deli, seafood, counters');
  ok(C.slow && C.wpm >= 60 && C.wpm < 110, `C: cảnh báo đọc chậm, tốc độ < 110 (${C.wpm})`);
  ok(C.pauses >= 2, `C: phát hiện ≥ 2 lần ngắt quãng dài (${C.pauses})`);
  ok(A.est >= B.est && A.est >= C.est, `Ước tính: A ≥ B và A ≥ C (${A.est}, ${B.est}, ${C.est})`);
  // D: không có SpeechRecognition
  const D = await run('D', 'none');
  ok(/Đã ghi âm/.test(D.tx) && D.audio, `D: không có SpeechRecognition → vẫn ghi âm và hiện khung nghe lại (audio=${D.audio})`);
} finally {
  await browser.close();
}
const md = `### 🎙️ TOEIC Read aloud e2e: ${fails.length ? '❌ ' + fails.length + ' lỗi\n' + fails.map(f => '- ' + f).join('\n') : '✅ đạt'}\n`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(fails.length ? 1 : 0);
