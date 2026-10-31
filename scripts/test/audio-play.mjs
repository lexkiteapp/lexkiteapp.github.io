// 🔊 Phát audio ổn định (web/js/audio.js + web/js/ui.js – docs/specs/audio-quality.md việc 4) trên Chromium và WebKit (Safari):
//  1) mở khóa ở lần chạm đầu · 2) phát được, onEnd đúng · 3) gốc CDN đầu 404 → gốc kế tiếp · 4) gốc đầu treo → hết hạn chờ → gốc kế tiếp
//  5) mọi gốc 404 → UI.tts rơi về giọng máy, đúng giới tính người nói (Carlos nam, Ama nữ) + ghi nhật ký dự phòng
//  6) không chồng tiếng: giọng mới dừng giọng cũ (cả Audio tự tạo ở module khác và giọng máy); hiệu ứng sfx không bị dừng
// Không cần máy chủ: page.route trả trang thử + file JS thật từ web/ + WAV tự sinh. Chạy: node scripts/test/audio-play.mjs [chromium,webkit]
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const which = (process.argv[2] || 'chromium,webkit').split(',');

// WAV PCM 16-bit mono 8 kHz, sóng sin nhỏ (decoder nào cũng đọc được)
function wav(sec) {
  const sr = 8000, n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 2000), 44 + i * 2);
  return b;
}
const SHORT = wav(0.4), LONG = wav(4);
const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>audio</title></head><body><button id="go">go</button>
<script>
  window.__said = []; window.__res = {};
  // giọng máy giả lập (danh sách giọng thật của Edge) – ghi lại giọng được chọn
  const VOICES = [['Microsoft Aria Online (Natural) - English (United States)','en-US'],['Microsoft Guy Online (Natural) - English (United States)','en-US'],['Microsoft Sonia Online (Natural) - English (United Kingdom)','en-GB'],['Microsoft Ryan Online (Natural) - English (United Kingdom)','en-GB']].map(([name, lang]) => ({ name, lang, localService: false, voiceURI: name, default: false }));
  const SS = { speaking: false, paused: false, pending: false, getVoices: () => VOICES, cancel() { this.speaking = false; }, pause() {}, resume() {}, addEventListener() {},
    speak(u) { window.__said.push({ text: u.text, voice: u.voice && u.voice.name, lang: u.lang }); this.speaking = !!(u.text && u.text.trim()); setTimeout(() => { this.speaking = false; u.onend && u.onend(); }, 30); } };
  Object.defineProperty(window, 'speechSynthesis', { value: SS, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.App = { state: { settings: { accent: 'en-GB', hqVoice: true } } };
  window.KVoice = { lineKey: (v, t) => v + '_' + t.replace(/\\W+/g, '').toLowerCase() };
  window.LISTEN_AUDIO = new Set(['af_heart_hello', 'am_michael_ok', 'am_michael_gone', 'af_heart_gone', 'bf_emma_gone', 'af_heart_twoparts', 'bf_emma_long']);
  window.Chars = { ids: ['ama', 'carlos'], voice: w => ({ ama: 'af_heart', carlos: 'am_michael' })[w] };
  document.getElementById('go').onclick = () => { const f = window.__step; window.__step = null; if (f) f(); };
</script>
<script src="/js/audio.js"></script><script src="/js/ui.js"></script></body></html>`;
// Gốc CDN (giống AUDIO_BASES của ui.js): A = audio.lexkite.com, B = kho media m2, C = gốc cũ
const A = 'https://audio.lexkite.com/audio/', B = 'https://lexkiteapp.github.io/lexkite-media-2/audio/', C = 'https://lexkiteapp.github.io/audio/';

let fails = 0, passes = 0;
const check = (c, msg) => { if (c) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.error('  ✗ ' + msg); } };

for (const name of which) {
  const type = { chromium, webkit }[name]; if (!type) continue;
  console.log(`— ${name}`);
  const browser = await type.launch(name === 'chromium' ? { args: ['--autoplay-policy=no-user-gesture-required'] } : {});
  const page = await browser.newPage();
  const logs = []; page.on('console', m => logs.push(m.text())); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  const hits = [];
  await page.route('**/*', async route => {
    const u = route.request().url(); hits.push(u);
    if (u === 'https://lk.test/') return route.fulfill({ contentType: 'text/html', body: HTML });
    const js = /^https:\/\/lk\.test\/js\/(audio|ui)\.js$/.exec(u);
    if (js) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'web/js', js[1] + '.js')) });
    if (/\/sfx\//.test(u)) return route.fulfill({ contentType: 'audio/wav', body: LONG });
    if (!/\.mp3$/.test(u)) return route.fulfill({ status: 404, body: '' });
    const key = u.split('/').pop().replace('.mp3', '');
    if (/^miss|gone/.test(key)) return route.fulfill({ status: 404, body: '' });                 // không có ở gốc nào
    if (/^hang/.test(key) && u.startsWith(A)) return;                                          // gốc đầu treo (không trả lời)
    if (/^b404/.test(key) && u.startsWith(A)) return route.fulfill({ status: 404, body: '' });  // gốc đầu 404, gốc 2 có
    if (key.includes('long') || key.includes('first')) return route.fulfill({ contentType: 'audio/wav', body: LONG });
    return route.fulfill({ contentType: 'audio/wav', body: SHORT });
  });
  await page.goto('https://lk.test/');
  await page.waitForFunction(() => window.LKAudio && window.UI && window.UI.tts);
  // chạy f trong cử chỉ người dùng (click thật) – giống người dùng bấm nút nghe
  const step = async (fn, arg) => { await page.evaluate(([src, a]) => { window.__step = () => (0, eval)('(' + src + ')')(a); }, [fn.toString(), arg]); await page.click('#go'); };
  const res = (k, ms = 8000) => page.waitForFunction(k => window.__res[k] !== undefined, k, { timeout: ms }).then(() => page.evaluate(k => window.__res[k], k)).catch(() => undefined);

  // 1) mở khóa
  check(await page.evaluate(() => !LKAudio.isUnlocked()), 'chưa mở khóa trước lần chạm đầu');
  await step(() => 0);
  check(await page.evaluate(() => LKAudio.isUnlocked()), 'mở khóa ở lần chạm đầu');

  // 2) phát được + onEnd
  await step(() => LKAudio.play(['https://audio.lexkite.com/audio/l/ok1.mp3'], { onStart: (u, i) => { __res.start = i; }, onEnd: () => { __res.end = 1; }, onFail: w => { __res.fail = w; } }));
  check(await res('start') === 0, 'phát được file ở gốc đầu');
  check(await res('end') === 1, 'onEnd khi phát xong');

  // 3) gốc đầu 404 → gốc 2
  await step(() => LKAudio.play(['https://audio.lexkite.com/audio/l/b404x.mp3', 'https://lexkiteapp.github.io/lexkite-media-2/audio/l/b404x.mp3'], { onStart: (u, i) => { __res.s404 = i; }, onFail: w => { __res.f404 = w; } }));
  check(await res('s404') === 1, 'gốc đầu 404 → phát từ gốc dự phòng');

  // 4) gốc đầu treo → hết hạn chờ → gốc 2
  await step(() => LKAudio.play(['https://audio.lexkite.com/audio/l/hangx.mp3', 'https://lexkiteapp.github.io/lexkite-media-2/audio/l/hangx.mp3'], { timeout: 1200, onStart: (u, i) => { __res.shang = i; } }));
  check(await res('shang') === 1, 'gốc đầu không trả lời → hết hạn chờ → gốc dự phòng');
  check(await page.evaluate(() => LKAudio.stats.timeout >= 1), 'ghi nhật ký quá giờ');

  // 5) mọi gốc 404 → giọng máy đúng người nói (qua UI.tts thật)
  await page.evaluate(() => { __said.length = 0; });
  await step(() => UI.tts('gone', 'en-US', 1, { voice: 'am_michael', onEnd: () => { __res.carlos = 1; } }));
  await res('carlos');
  const said = await page.evaluate(() => __said.slice());
  check(said.length === 1 && /Guy/.test(said[0].voice || ''), `Carlos: mọi gốc 404 → giọng máy nam Mỹ (${said[0] && said[0].voice})`);
  const tried = hits.filter(u => /am_michael_gone\.mp3$/.test(u));
  check([A, B, C].every(b => tried.some(u => u.startsWith(b))), 'đã thử đủ 3 gốc CDN trước khi dùng giọng máy');
  check(await page.evaluate(() => LKAudio.stats.tts >= 1 && /tts:/.test(LKAudio.stats.last)), 'ghi nhật ký dự phòng giọng máy');
  await page.evaluate(() => { __said.length = 0; });
  await step(() => UI.tts('gone', 'en-GB', 1, { who: 'ama', onEnd: () => { __res.ama = 1; } }));
  await res('ama');
  const said2 = await page.evaluate(() => __said.slice());
  check(said2.length === 1 && /Sonia/.test(said2[0].voice || ''), `Ama (UK): giọng máy nữ Anh (${said2[0] && said2[0].voice})`);
  await page.evaluate(() => { __said.length = 0; });
  await step(() => UI.speak('gonewordzz', 'en-GB'));
  await page.waitForTimeout(300);
  check((await page.evaluate(() => __said.length)) === 1, 'từ không có file → giọng máy');
  // file có ở gốc đầu → KHÔNG dùng giọng máy
  await page.evaluate(() => { __said.length = 0; });
  await step(() => UI.tts('hello', 'en-US', 1, { onEnd: () => { __res.hello = 1; } }));
  check(await res('hello') === 1 && (await page.evaluate(() => __said.length)) === 0, 'có file → phát file, không gọi giọng máy');

  // 6) không chồng tiếng
  await step(() => { const h = LKAudio.play(['https://audio.lexkite.com/audio/l/first_long.mp3'], { onStart: () => { __res.long = 1; } }); window.__h1 = h; });
  await res('long');
  await step(() => { const sfx = window.__sfx = new Audio('https://lk.test/sfx/correct.mp3'); sfx.play().catch(() => {}); });
  await page.waitForTimeout(300);
  await step(() => { const a = window.__other = new Audio('https://audio.lexkite.com/audio/w/other_long.mp3'); a.play().then(() => { __res.other = 1; }).catch(e => { __res.other = String(e); }); });
  await res('other');
  check(await page.evaluate(() => __h1.el.paused && !__other.paused), 'Audio của module khác bắt đầu → giọng đang phát dừng');
  check(await page.evaluate(() => !__sfx.paused), 'hiệu ứng sfx không bị dừng');
  await step(() => { const u = new SpeechSynthesisUtterance('Hello there'); speechSynthesis.speak(u); });
  check(await page.evaluate(() => __other.paused), 'giọng máy bắt đầu → file đang phát dừng');
  await step(() => { const a = window.__x = new Audio('https://audio.lexkite.com/audio/l/x_long.mp3'); a.play().then(() => { __res.x = 1; }).catch(() => {}); });
  await res('x');
  await step(() => LKAudio.play(['https://audio.lexkite.com/audio/l/y_long.mp3'], { onStart: () => { __res.y = 1; } }));
  await res('y');
  check(await page.evaluate(() => __x.paused && document.querySelectorAll('audio').length === 0), 'LKAudio.play mới → giọng cũ dừng');
  const playing = await page.evaluate(() => [__h1.el, __other, __x].filter(e => e && !e.paused).length);
  check(playing === 0, 'chỉ một giọng đọc phát tại một thời điểm');
  const errs = logs.filter(l => /PAGEERROR/.test(l));
  check(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close();
}
console.log(fails ? `✗ audio-play: ${fails} lỗi, ${passes} đạt` : `✓ audio-play: ${passes} kiểm tra đạt (${which.join(', ')})`);
process.exit(fails ? 1 : 0);
