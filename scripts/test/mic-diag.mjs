// P0 23/11 (bài "Nói câu này" luôn báo "Không nghe thấy gì"): UI.recognize phải chẩn đoán ĐÚNG nguyên nhân thay vì báo chung chung –
// micro bị chặn / không có micro / micro thu im lặng / dịch vụ nhận dạng hỏng dù micro tốt (→ lần bấm sau sang Whisper trên máy) / chưa nói –
// và đếm lỗi THẬT (LKAudio mic_*). Chạy web/js/ui.js + audio.js thật trong jsdom với SR + mediaDevices + MediaRecorder giả.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

function env({ ua = DESKTOP, touch = 0, gumErr = '', level = null } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://lexkite.com/app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, log = { gum: [], srs: [] };
  Object.defineProperty(w.navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(w.navigator, 'maxTouchPoints', { value: touch, configurable: true });
  const track = { stop() {} };
  Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: c => { log.gum.push(c); return gumErr ? Promise.reject(Object.assign(new Error(gumErr), { name: gumErr })) : Promise.resolve({ getTracks: () => [track] }); } } });
  w.MediaRecorder = class { constructor() { this.state = 'inactive'; } start() { this.state = 'recording'; this.ondataavailable({ data: new w.Blob(['x']) }); } stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); } };
  w.URL.createObjectURL = () => 'blob:rec'; w.URL.revokeObjectURL = () => {};
  w.speechSynthesis = { cancel() {}, getVoices: () => [], speak() {}, addEventListener() {} };
  w.webkitSpeechRecognition = class { constructor() { log.srs.push(this); } start() {} stop() { if (this.onend) this.onend(); } abort() { if (this.onend) this.onend(); } };
  w.I18N = { t: s => s, lang: () => 'vi', apply() {} }; w.t = s => s;
  w.eval(fs.readFileSync('web/js/audio.js', 'utf8')); w.eval(fs.readFileSync('web/js/ui.js', 'utf8')); w.eval(fs.readFileSync('web/cpack/lesson/micdiag.js', 'utf8'));
  if (level !== undefined) w.MicDiag.setLevel(async () => level);
  return { w, log, UI: w.UI, A: w.LKAudio };
}
const run = async (opts, ev) => { // bấm micro → SR kết thúc theo ev → trả danh sách tín hiệu cb
  const e = env(opts), sig = [];
  e.UI.recognize('work', 'en-US', { result: x => sig.push(['result', x.heard]), error: c => sig.push(['error', c]), end: () => sig.push(['end']) });
  await tick(); ev(e.log.srs[0]); await tick(20); return { ...e, sig };
};
const END = r => r.onend(), NOSP = r => { r.onerror({ error: 'no-speech' }); r.onend(); };
const LOUD = { peak: 0.4, loud: 9 }, SILENT = { peak: 0.001, loud: 0 }, QUIET = { peak: 0.05, loud: 1 };

// micVerdict thuần
const { w: W0 } = env();
assert.deepEqual([W0.MicDiag.verdict(SILENT), W0.MicDiag.verdict(LOUD), W0.MicDiag.verdict(QUIET), W0.MicDiag.verdict(null)], ['silent', 'sr-fail', 'no-speech', 'no-speech'], 'micVerdict'); n++;

{ // quyền micro bị chặn: ghi âm song song bị từ chối → báo not-allowed (trước: nuốt lỗi → "không nghe thấy gì")
  const r = await run({ gumErr: 'NotAllowedError' }, END);
  assert.deepEqual(r.sig, [['error', 'not-allowed'], ['end']], 'chặn quyền → not-allowed'); n++;
  ok(r.A.vo.mic_notallowed === 1, 'đếm mic_notallowed');
}
{ const r = await run({ gumErr: 'NotFoundError' }, NOSP);
  assert.deepEqual(r.sig, [['error', 'audio-capture'], ['end']], 'không có micro → audio-capture'); n++;
  ok(r.A.vo.mic_audiocapture === 1, 'đếm mic_audiocapture'); }
{ const r = await run({ gumErr: 'NotReadableError' }, END);
  assert.deepEqual(r.sig[0], ['error', 'audio-capture'], 'micro đang bị app khác giữ → audio-capture'); n++; }
{ const r = await run({ level: SILENT }, NOSP);
  assert.deepEqual(r.sig, [['error', 'silent'], ['end']], 'bản ghi im lặng tuyệt đối → silent (micro câm/sai thiết bị)'); n++;
  ok(r.A.vo.mic_silent === 1 && !/Không nghe thấy gì/.test(r.UI.recErrorText('silent')), 'silent: đếm + lời nhắn riêng'); }
{ const r = await run({ level: QUIET }, NOSP);
  assert.deepEqual(r.sig, [['error', 'no-speech'], ['end']], 'có tiếng nhỏ, chưa nói → no-speech'); n++;
  ok(r.A.vo.mic_nospeech === 1 && !r.A.vo.mic_silent, 'chỉ đếm nospeech một lần'); }
{ // dịch vụ nhận dạng hỏng dù micro tốt (Chrome báo no-speech/kết thúc im lặng khi bản ghi có tiếng) → sr-fail, lần sau sang Whisper trên máy
  for (const ev of [END, NOSP]) {
    const r = await run({ level: LOUD }, ev);
    assert.deepEqual(r.sig, [['error', 'sr-fail'], ['end']], 'bản ghi có tiếng mà không có kết quả → sr-fail'); n++;
    ok(r.A.vo.mic_srfail === 1 && /nhận dạng trên máy/.test(r.UI.recErrorText('sr-fail')), 'sr-fail: đếm + chỉ cách gỡ');
    r.w.localStorage.setItem('vb.whisper', '1');
    const ctl = r.UI.recognize('work', 'en-US', {}); await tick();
    ok(ctl && ctl._whisper, 'sau sr-fail: lần bấm kế dùng Whisper trên máy (ghi âm MediaRecorder, chấm cục bộ)');
  }
}
{ // ghi âm song song dùng micro THÔ (khử ồn/echo/AGC của HĐH làm Chrome nhận dạng nghe im lặng trên một số máy)
  const r = await run({ level: LOUD }, END), c = r.log.gum[0].audio;
  ok(c.echoCancellation === false && c.noiseSuppression === false && c.autoGainControl === false, 'bản ghi song song: micro thô');
}
{ // có kết quả: không chẩn đoán, đếm ok
  const r = await run({ level: LOUD }, s => { s.onresult({ results: [Object.assign([{ transcript: 'work' }], { isFinal: true })] }); s.onend(); });
  assert.deepEqual(r.sig.map(x => x[0]), ['result', 'end'], 'có kết quả → result rồi end'); n++;
  ok(r.A.vo.mic_ok === 1, 'đếm mic_ok'); }
{ // điện thoại (không ghi song song): không có gì để chẩn đoán → no-speech như cũ
  const r = await run({ ua: ANDROID, touch: 5 }, END);
  assert.deepEqual(r.sig, [['error', 'no-speech'], ['end']], 'điện thoại: no-speech'); n++; }
{ // lỗi API thật (network) vẫn được đếm đúng nhóm rồi chuyển Whisper trên máy (đã đồng ý trước đó)
  const e = env({ level: LOUD }); e.w.localStorage.setItem('vb.whisper', '1'); const sig = [];
  e.UI.recognize('work', 'en-US', { error: c => sig.push(c), end: () => sig.push('end') }); await tick();
  e.log.srs[0].onerror({ error: 'network', message: 'x' }); e.log.srs[0].onend(); await tick(20);
  ok(e.A.vo.mic_network === 1 && !sig.includes('no-speech'), 'network: đếm mic_network, sang Whisper (không báo "không nghe thấy")'); }
// máy chủ nhận đủ khóa mic_*
const { VO_KEYS } = await import('../../functions/api/hit.js'), A0 = (await import('node:module')).createRequire(import.meta.url)('../../web/js/audio.js');
ok(A0.MK.every(k => VO_KEYS.includes('mic_' + k)), 'hit.js nhận mọi nhóm mic_*');
// gói lười: ui.js không mang mã chẩn đoán, bundles.js đăng ký micdiag
ok(!/audioLevel|micVerdict/.test(fs.readFileSync('web/js/ui.js', 'utf8')) && /micdiag: \['cpack\/lesson\/micdiag\.js'\]/.test(fs.readFileSync('web/js/bundles.js', 'utf8')), 'chẩn đoán nằm ở gói lười micdiag, không vào ui.js');
// lời nhắn mới có bản tiếng Anh (i18n)
const en = fs.readFileSync('web/js/i18n/en/core.js', 'utf8');
for (const k of ['Micro không thu được tiếng – kiểm tra đã chọn đúng micro và không bị tắt tiếng.', 'Máy thu được giọng bạn nhưng dịch vụ nhận dạng của trình duyệt không trả lời – bấm micro lần nữa để dùng nhận dạng trên máy.']) ok(en.includes(`'${k}'`), 'thiếu tiếng Anh: ' + k.slice(0, 30));
console.log(`✓ mic-diag: ${n} ok`);
process.exit(0);
