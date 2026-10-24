// Tạo file âm thanh chất lượng cao cho bài nghe IELTS/TOEIC bằng Kokoro-82M (Apache-2.0), chạy trên máy, miễn phí.
// Dùng: NODE_PATH=<thư mục có kokoro-js> NODE_USE_ENV_PROXY=1 node scripts/gen-audio.mjs [--limit N]
// Kết quả: .media-out/audio/l/<khóa>.mp3 (mono 40 kbps, AUDIO_OUT đổi được) → scripts/media/push.mjs đẩy lên kho media (infra/media-repos.json, KHÔNG vào repo chính)
//   + web/js/listen/audio-index.js (khóa đã có = chỉ mục cũ ∪ file mới). Bỏ qua khóa đã có trong chỉ mục → chạy lại an toàn.
import fs from 'node:fs'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
const OUT = process.env.AUDIO_OUT || '.media-out/audio/l', IDX = 'web/js/listen/audio-index.js', TMP = (process.env.TMPDIR || '/tmp') + '/vb-tts.wav';
const li = process.argv.indexOf('--limit'), limit = li > 0 ? +process.argv[li + 1] : Infinity; // --limit 0 = chỉ đếm, không tạo
fs.mkdirSync(OUT, { recursive: true });
const HAVE = new Set(((fs.existsSync(IDX) ? fs.readFileSync(IDX, 'utf8') : '').match(/new Set\("([^"]*)"/) || [, ''])[1].split(/\s+/).filter(Boolean));
const has = k => HAVE.has(k) || fs.existsSync(`${OUT}/${k}.mp3`);
const c = { self: {} }; c.self = c; vm.createContext(c);
vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
for (const f of fs.readdirSync('web/js/listen').filter(f => /^test\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/listen/' + f, 'utf8'), c);
for (const f of fs.readdirSync('web/js/toeic').filter(f => /^listening\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/toeic/' + f, 'utf8'), c);
for (const f of fs.readdirSync('web/js/toefl').filter(f => /^data\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/toefl/' + f, 'utf8'), c);
const parts = [...(c.LISTENING || []), ...((c.TOEIC || {}).listening || []), ...((c.TOEFL || {}).listening || [])];
const jobs = new Map();
for (const p of parts) {
  const v = c.KVoice.voices(p);
  for (const l of p.script || []) {
    const text = l.say || l.t; if (!text || l.pause != null) continue;
    const voice = l.say ? v._narrator : (v[l.s] || v._narrator), key = c.KVoice.lineKey(voice, text);
    if (!has(key)) jobs.set(key, { voice, text: String(text).trim() });
  }
}
// Câu đọc đơn (UI.tts): giọng chung theo accent – câu hỏi giám khảo Speaking (Anh & Mỹ), TOEFL Listen & Repeat / Interview
const GEN = { 'en-GB': 'bf_emma', 'en-US': 'af_heart' };
const addOne = (voice, text) => { const key = c.KVoice.lineKey(voice, text); if (!has(key)) jobs.set(key, { voice, text: String(text).trim() }); };
for (const u of (c.TOEFL || {}).speaking || []) { const v = GEN[u.accent] || GEN['en-GB']; for (const x of u.sentences || []) x.t && addOne(v, x.t); for (const x of u.questions || []) x.q && addOne(v, x.q); }
{
  const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
  const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: x => x });
  vm.runInContext(fs.readFileSync('web/js/speak/more.js', 'utf8'), c);
  for (const f of ['more2', 'more3']) if (fs.existsSync(`web/js/speak/${f}.js`)) vm.runInContext(fs.readFileSync(`web/js/speak/${f}.js`, 'utf8'), c);
  for (const x of c.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
  for (const b of BANK) for (const v of Object.values(GEN)) { for (const q of [...b.p1, ...b.p3]) addOne(v, q); addOne(v, `${b.p2.q} You should say: ${b.p2.points.join(', ')}.`); }
}
// Đọc dài theo từng câu (UI.tts tách câu): câu trả lời mẫu Speaking + 30 bài đọc – giọng Anh (bf_emma)
{
  for (const f of ['readings', 'readings-more']) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c);
  vm.runInContext(fs.readFileSync('web/js/speak/samples.js', 'utf8'), c);
  const longs = [...(c.READINGS || []).map(r => r.text), ...Object.values(c.SPEAK_SAMPLES || {}).map(x => x.a)];
  for (const txt of longs) for (const sen of c.KVoice.split(txt)) addOne(GEN['en-GB'], sen);
}
// Từ vựng (giọng Anh bf_emma): mọi lần phát âm từ trong app tự dùng Kokoro, và chế độ Học rảnh tay phát được khi khóa màn hình.
// Thứ tự: từ cốt lõi NGSL → công sở → học thuật → còn lại. Câu ví dụ dùng chung đường đọc câu (UI.tts).
{
  const d = { t: x => x }; vm.createContext(d); vm.runInContext(fs.readFileSync('web/js/data.js', 'utf8').replace(/typeof self !== 'undefined' \? self : this/, 'globalThis'), d);
  for (const f of fs.readdirSync('web/js/lib').filter(f => /\.js$/.test(f) && !/^notes/.test(f))) { try { vm.runInContext(fs.readFileSync('web/js/lib/' + f, 'utf8').replace(/typeof self !== 'undefined' \? self : this/, 'globalThis'), d); } catch (e) { /* bỏ qua */ } }
  const ord = id => (/^ngsl/.test(id) ? 0 : /^office/.test(id) ? 1 : /^(awl|nawl)/.test(id) ? 2 : 3);
  const tops = [...((d.IELTS_DATA || {}).TOPICS || [])].sort((a, b) => ord(a.id) - ord(b.id));
  const seen = new Set();
  for (const tp of tops) for (const w of tp.words) { const k = String(w.word || '').trim(); if (!k || seen.has(k.toLowerCase())) continue; seen.add(k.toLowerCase()); addOne(GEN['en-GB'], k); }
  for (const tp of tops) for (const w of tp.words) if (w.ex && w.ex.split(' ').length >= 4) for (const sen of c.KVoice.split(w.ex)) addOne(GEN['en-GB'], sen);
}
const writeIndex = () => { const keys = [...new Set([...HAVE, ...fs.readdirSync(OUT).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4))])].sort(); fs.writeFileSync(IDX, `/* Danh sách câu thoại đã có file âm thanh Kokoro (tự sinh bởi scripts/gen-audio.mjs) */\n(function (g) { g.LISTEN_AUDIO = new Set(${JSON.stringify(keys.join(' '))}.split(' ').filter(Boolean)); })(typeof self !== 'undefined' ? self : this);\n`); return keys.length; };
console.log(`${parts.length} phần nghe · cần tạo ${jobs.size} câu`);
if (jobs.size && limit > 0) {
  // phonemizer (emscripten) nuốt lỗi và in cả mã nguồn 1 dòng khổng lồ → tự in lỗi ngắn gọn trước
  for (const ev of ['uncaughtException', 'unhandledRejection']) process.prependListener(ev, e => console.error(`✗ ${ev}: ${e && (e.cause ? (e.cause.code || e.cause.message) + ' · ' : '') + (e && e.message)}`));
  const { KokoroTTS } = require('kokoro-js');
  // Tải mô hình (~90 MB từ Hugging Face) – thử lại khi mạng/máy chủ lỗi tạm thời (máy chủ CI hay bị từ chối lần đầu)
  let tts = null;
  for (let k = 1; k <= 6 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`Tải mô hình lỗi (lần ${k}): ${e && (e.cause && e.cause.code || e.message)}`); await new Promise(r => setTimeout(r, 15000 * k)); } }
  if (!tts) { console.error('Không tải được mô hình Kokoro – bỏ qua lượt này'); process.exit(1); }
  let n = 0; const t0 = Date.now(), DEADLINE = t0 + (process.env.AUDIO_MIN ? +process.env.AUDIO_MIN : 1e6) * 60000;
  for (const [key, { voice, text }] of jobs) {
    if (n >= limit || Date.now() > DEADLINE) break; // AUDIO_MIN: dừng đúng hạn để CI kịp lưu (quá giờ job bị hủy → mất hết)
    const a = await tts.generate(text, { voice, speed: 1 });
    await a.save(TMP);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', TMP, '-ac', '1', '-ar', '24000', '-b:a', '40k', `${OUT}/${key}.mp3`]);
    if (++n % 25 === 0) { writeIndex(); console.log(`${n}/${jobs.size} · ${Math.round((Date.now() - t0) / 1000)}s`); }
  }
}
console.log(`✓ audio-index: ${writeIndex()} câu có giọng Kokoro`);
