// 📞⚡ Đo Call thời gian thực (cờ lk.call_rt, docs/specs/call-realtime.md M1) – Chromium thật, CPU chậm 4×, chạy trên CI (call-rt.yml).
// Micro GIẢ = AudioContext phát wav espeak-ng (biết chính xác mốc tiếng tắt) → Silero VAD thật (jsdelivr) trong trang.
// SpeechRecognition GIẢ "trên máy": câu cuối trả về FIN ms sau stop() (cờ bật: VAD gọi stop() khi nói xong);
// cờ tắt: như bộ chốt câu của Chrome – EP ms sau khi tiếng tắt (giả định, ghi rõ trong báo cáo). Chữ tạm (interim) bắn trước lúc tắt 100 ms.
// Đo mỗi lượt: tiếng tắt → giáo viên có tiếng (câu đệm hoặc câu đáp) · → câu đáp thật; nói chen: tiếng bật → giáo viên im; fps; lỗi JS.
// Dùng: node scripts/test/call-rt-e2e.mjs --fx fx --out qa-rt   (fx/a1.wav … do call-rt.yml sinh bằng espeak-ng)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', 'qa-rt')), FX = path.resolve(arg('--fx', 'fx')), ROOT = path.resolve(arg('--root', 'web'));
const FIN = +arg('--fin', 150), EP = +arg('--ep', 1000), CPU = +arg('--cpu', 4);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const BASE = 'http://lexkite.localhost/';
const serve = route => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
  const fx = p.startsWith('/__fx/'), dir = fx ? FX : ROOT, f = path.join(dir, path.normalize(fx ? p.slice(5) : p));
  if (!f.startsWith(dir) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
};

// trong trang: micro giả + SpeechRecognition giả + TTS giả (giáo viên "nói" đúng thời lượng ước tính của teacher.js)
const INIT = cfg => {
  if (cfg.flag != null) localStorage.setItem('lk.call_rt', cfg.flag ? '1' : '0');
  if (cfg.vad) localStorage.setItem('lk.call_rt_vad', cfg.vad);
  let ac = null, dest = null;
  const ctx = () => { if (!ac) { ac = new AudioContext({ sampleRate: 16000 }); dest = ac.createMediaStreamDestination(); } return ac; };
  navigator.mediaDevices.getUserMedia = async () => { ctx(); await ac.resume(); return new MediaStream([dest.stream.getAudioTracks()[0].clone()]); };
  window.__lastEnd = 0; window.__heard = [];
  // phát wav vào micro giả → { onset, end } (giờ performance.now của lúc tiếng bật / tắt thật trong file)
  window.__say = async url => {
    const a = ctx(); await a.resume();
    const buf = await a.decodeAudioData(await (await fetch(url)).arrayBuffer()), d = buf.getChannelData(0);
    let first = -1, last = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.02) { if (first < 0) first = i; last = i; }
    const s = a.createBufferSource(); s.buffer = buf; s.connect(dest);
    const when = a.currentTime + 0.05, ts = a.getOutputTimestamp(), base = ts.performanceTime + (when - ts.contextTime) * 1000;
    s.start(when);
    const r = { onset: base + first / buf.sampleRate * 1000, end: base + last / buf.sampleRate * 1000, dur: buf.duration };
    window.__lastEnd = r.end; window.__lastSay = r; return r;
  };
  class MockSR {
    constructor() { this.continuous = false; this.interimResults = false; this.lang = ''; this._t = []; this._l = []; this._done = false; }
    static available() { return Promise.resolve('available'); }
    addEventListener(n, f) { if (n === 'result') this._l.push(f); }
    removeEventListener() {}
    get onresult() { return this._h; } set onresult(f) { this._h = f; } // thuộc tính IDL nằm trên prototype như trình duyệt thật
    _fire(final) {
      const text = this._text || ''; const alt = [{ transcript: text, confidence: 0.9 }]; alt.isFinal = final;
      const e = { resultIndex: 0, results: [alt] }; this._l.forEach(f => f(e)); if (this._h) this._h(e);
    }
    _final() { if (this._done) return; this._done = true; this._t.forEach(clearTimeout); this._fire(true); setTimeout(() => this.onend && this.onend({}), 0); }
    start() {
      window.__srStarts = (window.__srStarts || 0) + 1; this._text = null;
      setTimeout(() => this.onstart && this.onstart({}), 20);
      // chờ người học nói (wav) → chữ tạm trước lúc tắt 100 ms → câu cuối EP ms sau lúc tắt (nếu không ai gọi stop())
      const poll = setInterval(() => {
        const r = window.__lastSay; if (!r || r._used || this._done) return; r._used = true; clearInterval(poll);
        this._text = window.__heard.shift() || 'Yes';
        const now = performance.now();
        if (this.interimResults) this._t.push(setTimeout(() => !this._done && this._fire(false), Math.max(0, r.end - 100 - now)));
        this._t.push(setTimeout(() => this._final(), Math.max(0, r.end + window.__EP - now)));
      }, 10);
      this._t.push(poll);
    }
    stop() { if (this._text == null) { this._done = true; setTimeout(() => this.onend && this.onend({}), 0); return; } this._t.push(setTimeout(() => this._final(), window.__FIN)); }
    abort() { this._done = true; this._t.forEach(t => { clearTimeout(t); clearInterval(t); }); }
  }
  window.__EP = cfg.ep; window.__FIN = cfg.fin;
  window.SpeechRecognition = window.webkitSpeechRecognition = MockSR;
  try { const ss = window.speechSynthesis; ss.speak = u => setTimeout(() => { if (u.onstart) u.onstart({}); if (u.onend) u.onend({}); }, 40); ss.getVoices = () => []; } catch (e) { /* */ }
  // theo dõi mỗi khung: lúc giáo viên chuyển sang 'talk' + fps
  window.__talk = []; window.__fr = [];
  let prev = '';
  const loop = t => { window.__fr.push(t); if (window.__fr.length > 20000) window.__fr.shift(); const s = window.__callState && window.__callState(); const ph = s && s.phase; if (ph === 'talk' && prev !== 'talk') window.__talk.push(performance.now()); prev = ph; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const fails = [], ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const pct = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const WAVS = fs.readdirSync(FX).filter(f => /^a\d+\.wav$/.test(f)).sort();
const TEXT = JSON.parse(fs.readFileSync(path.join(FX, 'text.json'), 'utf8'));

async function run(tag, cfg, calls, o = {}) {
  const vp = o.vp || { width: 375, height: 812 };
  const ctx = await browser.newContext({ locale: 'en', permissions: ['microphone'], serviceWorkers: 'block', viewport: vp, deviceScaleFactor: 1, ...(o.video ? { recordVideo: { dir: path.join(OUT, 'video-' + tag), size: vp } } : {}) });
  await ctx.route(BASE + '**', serve);
  await ctx.route(/audio\.lexkite\.com|github\.io\/(lexkite-media|audio)/, r => r.abort());
  await ctx.route('https://lexkite.com/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true}' }));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(INIT, { flag: cfg.flag, vad: cfg.vad, ep: EP, fin: FIN });
  await page.goto(`${BASE}app/?sandbox=1&hl=en#/welcome/setup`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); }
  if (await page.$('#go')) { await page.click('#go').catch(() => {}); await page.waitForTimeout(800); }
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const res = { first: [], reply: [], barge: [], fps: 0, src: '', turns: 0 };
  let w = 0;
  for (const id of calls) {
    await page.evaluate(h => { location.hash = h; }, '#/call/' + id); await page.waitForSelector('#callGo', { timeout: 20000 }); await page.click('#callGo');
    await page.waitForFunction(() => window.__callState && window.__callState().phase === 'you', null, { timeout: 30000 });
    await page.click('#cMic'); // bật micro rảnh tay (autoMic)
    for (let k = 0; k < 8; k++) {
      const st = await page.evaluate(() => window.__callState());
      if (!st || st.phase === 'done') break;
      await page.waitForFunction(() => { const s = window.__callState(); return s.phase === 'listen' || s.phase === 'done'; }, null, { timeout: 30000 }).catch(() => {});
      if ((await page.evaluate(() => window.__callState().phase)) === 'done') break;
      await page.waitForTimeout(400); // micro + VAD sẵn sàng (lượt đầu: nạp Silero)
      if (k === 0 && cfg.flag && cfg.vad !== 'energy') await page.waitForFunction(() => window.__callRt && window.__callRt.src === 'silero', null, { timeout: 60000 }).catch(() => {});
      const f = WAVS[w++ % WAVS.length], n0 = st.log.length;
      await page.evaluate(x => window.__heard.push(x), TEXT[f]);
      const r = await page.evaluate(u => window.__say(u), BASE + '__fx/' + f);
      await page.waitForFunction(n => window.__callState().log.length > n, n0, { timeout: 30000 }).catch(() => {});
      await page.waitForFunction(e => window.__talk.some(t => t > e) || window.__callState().phase === 'done', r.end, { timeout: 30000 }).catch(() => {});
      const m = await page.evaluate(e => ({ talk: window.__talk.find(t => t > e), fill: ((window.__callRt || {}).marks || []).find(x => x.name === 'filler' && x.t > e) }), r.end);
      if (m.talk) { res.reply.push(m.talk - r.end); res.first.push(Math.min(m.talk, m.fill ? m.fill.t : Infinity) - r.end); res.turns++; }
      // nói chen: giáo viên đang nói câu đáp + câu hỏi kế → người học nói luôn
      if (o.barge && cfg.flag && k % 2 === 1) {
        await page.waitForTimeout(500);
        if ((await page.evaluate(() => window.__callState().phase)) === 'talk') {
          const n1 = (await page.evaluate(() => window.__callState().log.length));
          await page.evaluate(x => window.__heard.push(x), TEXT[WAVS[w % WAVS.length]]);
          const b = await page.evaluate(u => window.__say(u), BASE + '__fx/' + WAVS[w++ % WAVS.length]);
          await page.waitForFunction(o => (window.__callRt.marks || []).some(x => x.name === 'hushed' && x.t > o), b.onset, { timeout: 5000 }).catch(() => {});
          const h = await page.evaluate(o => (window.__callRt.marks.find(x => x.name === 'hushed' && x.t > o) || {}).t, b.onset);
          res.barge.push(h ? h - b.onset : 9999);
          await page.waitForFunction(n => window.__callState().log.length > n || window.__callState().phase === 'done', n1, { timeout: 30000 }).catch(() => {});
        }
      }
    }
    if (o.shot) await page.screenshot({ path: path.join(OUT, `${tag}-${id}.png`) });
    await page.waitForTimeout(500);
  }
  const fr = await page.evaluate(() => window.__fr); const dt = []; for (let i = 1; i < fr.length; i++) dt.push(fr[i] - fr[i - 1]);
  res.fps = dt.length ? 1000 / (dt.reduce((a, b) => a + b, 0) / dt.length) : 0; res.fpsP5 = dt.length ? 1000 / pct(dt, 0.95) : 0;
  res.src = await page.evaluate(() => (window.__callRt || {}).src || '');
  res.errs = errs; await ctx.close();
  return res;
}

const CALLS = ['coffee', 'weekend'];
const R = {
  on: await run('on', { flag: true }, CALLS, { barge: true, video: true, shot: true }),
  energy: await run('energy', { flag: true, vad: 'energy' }, CALLS, { barge: true }),
  off: await run('off', { flag: false }, CALLS),
};
const row = (k, r) => `| ${k} | ${r.src || '–'} | ${r.turns} | ${pct(r.first, 0.5).toFixed(0)} / ${pct(r.first, 0.95).toFixed(0)} | ${pct(r.reply, 0.5).toFixed(0)} / ${pct(r.reply, 0.95).toFixed(0)} | ${r.barge.length ? r.barge.map(x => x.toFixed(0)).join(', ') : '–'} | ${r.fps.toFixed(1)} (p5 ${r.fpsP5.toFixed(0)}) | ${r.errs.length} |`;
const md = `# Call RT – số đo (CPU chậm ${CPU}×, Chromium headless)\n\nGiả định: nhận dạng trên máy trả câu cuối ${FIN} ms sau stop(); cờ tắt = bộ chốt câu của Chrome ${EP} ms sau khi tiếng tắt.\n\n| chế độ | VAD | lượt | tắt tiếng → giáo viên có tiếng p50/p95 ms | → câu đáp p50/p95 ms | nói chen → giáo viên im ms | fps | lỗi JS |\n|---|---|---|---|---|---|---|---|\n${row('cờ bật', R.on)}\n${row('cờ bật, năng lượng', R.energy)}\n${row('cờ tắt (cũ)', R.off)}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), md); fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(R, null, 1));
console.log(md);

for (const [k, r] of Object.entries(R)) { ok(r.turns >= 8, `${k}: đủ lượt đo (${r.turns})`); ok(!r.errs.length, `${k}: không lỗi JS ${r.errs.slice(0, 3).join(' | ').slice(0, 300)}`); ok(r.fps >= 50, `${k}: fps ${r.fps.toFixed(1)} ≥ 50`); }
ok(R.on.src === 'silero', 'cờ bật: Silero VAD đã nạp (' + R.on.src + ')');
ok(pct(R.on.first, 0.5) <= 700 && pct(R.on.first, 0.95) <= 900, `cờ bật: giáo viên có tiếng p50 ≤ 700, p95 ≤ 900 ms (${pct(R.on.first, 0.5).toFixed(0)}/${pct(R.on.first, 0.95).toFixed(0)})`);
ok(pct(R.on.first, 0.5) <= 0.7 * pct(R.off.first, 0.5), 'cờ bật nhanh hơn cũ ≥ 30 % (p50)');
for (const k of ['on', 'energy']) ok(R[k].barge.length >= 2 && R[k].barge.every(x => x <= 200), `${k}: nói chen → giáo viên im ≤ 200 ms (${R[k].barge.map(x => x.toFixed(0))})`);
ok(pct(R.energy.first, 0.95) <= 1100, 'năng lượng dự phòng: p95 ≤ 1100 ms');
await browser.close();
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ fails }, null, 1));
if (fails.length) { console.error(`✗ call-rt-e2e: ${fails.length} lỗi`); process.exit(1); }
console.log('✓ call-rt-e2e: mọi cổng đạt');
