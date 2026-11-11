// LX-1003: Android/iOS cấp mic cho một bên → không được mở getUserMedia song song với SpeechRecognition (nhận dạng chỉ nghe im lặng).
// Chạy web/js/ui.js thật trong jsdom với SR + mediaDevices giả.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

function env({ ua, touch = 0, sr = true, denied = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://lexkite.com/app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, log = { gum: 0, srs: [] };
  Object.defineProperty(w.navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(w.navigator, 'maxTouchPoints', { value: touch, configurable: true });
  const track = { stop() { log.stopped = (log.stopped || 0) + 1; } };
  Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => { log.gum++; return denied ? Promise.reject(new Error('denied')) : Promise.resolve({ getTracks: () => [track] }); } } });
  w.MediaRecorder = class { constructor() { this.state = 'inactive'; log.rec = (log.rec || 0) + 1; } start() { this.state = 'recording'; this.ondataavailable({ data: new w.Blob(['x']) }); } stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); } };
  w.URL.createObjectURL = () => 'blob:rec'; w.URL.revokeObjectURL = () => {};
  w.speechSynthesis = { cancel() {}, getVoices: () => [], speak() {}, addEventListener() {} };
  if (sr) w.webkitSpeechRecognition = class { constructor() { log.srs.push(this); this.starts = 0; } start() { this.starts++; } stop() { if (this.onend) this.onend(); } abort() { this.aborted = true; if (this.onend) this.onend(); } };
  w.I18N = { t: s => s, lang: () => 'vi', apply() {} }; w.t = s => s;
  w.eval(fs.readFileSync('web/js/ui.js', 'utf8'));
  return { w, log, UI: w.UI };
}
const say = (r, txt, fin = true) => r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: txt }], { isFinal: fin })] });

for (const [name, ua, touch] of [['Android', ANDROID, 5], ['iPhone', IPHONE, 5], ['iPad', IPAD, 5]]) {
  const { log, UI } = env({ ua, touch }), sig = [];
  UI.recognize('hello', 'en-US', { result: x => sig.push(['result', x]), error: c => sig.push(['error', c]), end: () => sig.push(['end']) });
  await tick();
  ok(log.gum === 0 && log.srs.length === 1, `${name}: recognize không mở mic song song với nhận dạng`);
  const r = log.srs[0];
  r.onresult({ results: [Object.assign([{ transcript: 'hello' }], { isFinal: true })] }); r.onend(); await tick();
  assert.deepEqual(sig.map(x => x[0]), ['result', 'end'], `${name}: đúng 1 result rồi end`); n++;
  ok(sig[0][1].score === 100 && sig[0][1].audio === '', `${name}: vẫn chấm, không có bản ghi song song`);
}
{ // máy tính: giữ nguyên ghi âm song song để nghe lại
  const { log, UI } = env({ ua: DESKTOP }), sig = [];
  UI.recognize('hello', 'en-US', { result: x => sig.push(['result', x]), end: () => sig.push(['end']) });
  await tick();
  ok(log.gum === 1 && log.rec === 1, 'máy tính: vẫn ghi âm song song');
  log.srs[0].onresult({ results: [Object.assign([{ transcript: 'hello' }], { isFinal: true })] }); log.srs[0].onend(); await tick();
  ok(sig[0][1].audio === 'blob:rec', 'máy tính: có bản ghi để nghe lại');
}
for (const code of ['no-speech', 'not-allowed', 'audio-capture']) { // mọi lỗi: đúng 1 tín hiệu error rồi end, có lời nhắn chỉ cách xử lý
  const { log, UI } = env({ ua: ANDROID, touch: 5 }), sig = [];
  UI.recognize('hello', 'en-US', { error: c => sig.push(c), end: () => sig.push('end') });
  log.srs[0].onerror({ error: code }); log.srs[0].onend(); await tick();
  assert.deepEqual(sig, [code, 'end'], `${code}: đúng 1 error rồi end`); n++;
  ok(!/Lỗi nhận dạng/.test(UI.recErrorText(code)), `${code}: có lời nhắn riêng`);
}
{ // phiên kết thúc không báo gì (Edge) → vẫn báo no-speech
  const { log, UI } = env({ ua: ANDROID, touch: 5 }), sig = [];
  UI.recognize('hello', 'en-US', { error: c => sig.push(c), end: () => sig.push('end') });
  log.srs[0].onend(); await tick();
  assert.deepEqual(sig, ['no-speech', 'end'], 'kết thúc im lặng → no-speech rồi end'); n++;
}
{ // phiên dài, nền tảng xung đột: chỉ nhận dạng
  const { log, UI } = env({ ua: ANDROID, touch: 5 }); const seen = [];
  const s = await UI.speechSession({ lang: 'en-US', onText: x => seen.push(x) });
  ok(log.gum === 0 && log.srs.length === 1 && log.srs[0].starts === 1, 'speechSession Android: không mở getUserMedia');
  say(log.srs[0], 'hello there'); log.srs[0].onend();
  ok(log.srs[0].starts === 2 && seen[0].includes('hello there'), 'speechSession: tự nghe lại khi trình duyệt ngắt, trả chữ tạm');
  const o = await s.stop();
  ok(o.text === 'hello there' && o.audio === '', 'speechSession: trả chữ, không bản ghi');
}
{ // phiên dài, máy tính: ghi âm + nhận dạng
  const { log, UI } = env({ ua: DESKTOP });
  const s = await UI.speechSession({ lang: 'en-US', slot: 'x' });
  ok(log.gum === 1 && log.rec === 1 && !!s.stream, 'speechSession máy tính: có ghi âm và stream');
  say(log.srs[0], 'hi'); const o = await s.stop();
  ok(o.text === 'hi' && o.audio === 'blob:rec' && log.stopped === 1, 'speechSession: có bản ghi, nhả mic');
}
{ // lỗi không tự hết: báo và không khởi động lại mãi
  const { log, UI } = env({ ua: ANDROID, touch: 5 }), errs = [];
  await UI.speechSession({ lang: 'en-US', onError: c => errs.push(c) });
  log.srs[0].onerror({ error: 'not-allowed' }); log.srs[0].onend();
  ok(errs[0] === 'not-allowed' && log.srs[0].starts === 1, 'speechSession: quyền mic bị chặn → báo, không lặp');
  const q = env({ ua: ANDROID, touch: 5 }); await q.UI.speechSession({ lang: 'en-US', onError: c => errs.push(c) });
  q.log.srs[0].onerror({ error: 'no-speech' }); q.log.srs[0].onend();
  ok(errs.length === 1 && q.log.srs[0].starts === 2, 'speechSession: no-speech vẫn nghe tiếp');
}
{ // mic bị từ chối, không có SR
  const errs = []; const a = env({ ua: DESKTOP, denied: true });
  ok(await a.UI.speechSession({ onError: c => errs.push(c) }) === null && errs[0] === 'not-allowed', 'từ chối mic → báo not-allowed, null');
  const b = env({ ua: ANDROID, touch: 5, sr: false }); await b.UI.speechSession({});
  ok(b.log.gum === 1, 'không có SR: không có gì để tranh, vẫn ghi âm');
}
for (const f of ['speaking', 'confidence', 'mock']) ok(!/new (SR|MediaRecorder)\(|getUserMedia\(\{[^)]*\}\);? ?media =/.test(fs.readFileSync(`web/js/${f}.js`, 'utf8').replace(/st\.getTracks\(\)/g, '')), `${f}: dùng speechSession chung, không tự mở mic + SR`);
ok(/UI\.micParallel\(/.test(fs.readFileSync('web/js/toeic.js', 'utf8')), 'toeic: tôn trọng mic độc quyền');
console.log(`✓ mic-exclusive: ${n} ok`);
process.exit(0); // bộ đếm còn lại của jsdom không giữ suite
