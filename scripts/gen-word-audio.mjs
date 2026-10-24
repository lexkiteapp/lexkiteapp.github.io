// Giọng đọc TỪ ĐƠN (Anh bf_emma + Mỹ af_heart) bằng Kokoro-82M (Apache-2.0) – chỉ chạy trên CI (word-audio.yml), tiếp tục được.
//   NODE_PATH=<thư mục có kokoro-js> node scripts/gen-word-audio.mjs [--limit N từ] [--count]
// Kết quả: .media-out/audio/w/<fnv(giọng|từ)>.mp3 (mono 40 kbps, WORD_AUDIO_OUT đổi được) → scripts/media/push.mjs đẩy lên kho media (infra/media-repos.json)
//   → audio.lexkite.com/audio/w/… (Worker lexkite-audio dò các kho). KHÔNG ghi mp3 vào repo chính.
// Thứ tự: kho từ (NGSL trước = thông dụng trước), từ/cụm ≤ 3 chữ. App & add-on thử file này, lỗi/không mạng → giọng máy.
// Không ghi chỉ mục vào web/js (giữ ngân sách dung lượng): web/audio/w/index.txt (danh sách từ đã có đủ 2 giọng) cho gen-newtab.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { loadAllPlus } from './lexicon/lib.mjs'; import { STRONG, wordKey } from './word-audio-strong.mjs';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
const OUT = process.env.WORD_AUDIO_OUT || '.media-out/audio/w', IDX = 'web/audio/w/index.txt', TMP = (process.env.TMPDIR || '/tmp') + '/lk-word.wav', VOICES = ['bf_emma', 'af_heart'];
const li = process.argv.indexOf('--limit'), limit = li > 0 ? +process.argv[li + 1] : 300;
export { fnv } from './word-audio-strong.mjs';
// Từ dạng mạnh (word-audio-strong.mjs): tạo vài bản thử vào CAND + MANIFEST; scripts/word-audio-asr.py nghe lại (faster-whisper + độ dài),
// chọn bản đầu tiên đạt → OUT/<fnv(giọng|từ|s2)>.mp3 và ghi web/audio/w/s2.txt. Không đạt → job lỗi, không đẩy gì.
const CAND = process.env.WORD_AUDIO_CAND || '.s2-cand', S2F = 'web/audio/w/s2.txt';
const S2DONE = new Set((fs.existsSync(S2F) ? fs.readFileSync(S2F, 'utf8') : '').split('\n').filter(Boolean));
fs.mkdirSync(OUT, { recursive: true });
// mục mở rộng (x: 1): khi WORD_AUDIO_EXPAND=1 (word-audio.yml bật từ 24/10 – mp3 vào kho media m2, không vào repo chính)
const words = [...new Set((await loadAllPlus()).filter(e => !e.x || process.env.WORD_AUDIO_EXPAND === '1').map(e => e.row[0].trim()).filter(w => /^[A-Za-z][A-Za-z' -]*$/.test(w) && w.split(/\s+/).length <= 3))];
const HAVE = new Set((fs.existsSync(IDX) ? fs.readFileSync(IDX, 'utf8') : '').split('\n').filter(Boolean));
const has = w => (STRONG[w] ? S2DONE.has(w) : HAVE.has(w)) || VOICES.every(v => fs.existsSync(`${OUT}/${wordKey(v, w)}.mp3`));
const todo = [...words.filter(w => STRONG[w] && !has(w)), ...words.filter(w => !STRONG[w] && !has(w))]; // từ dạng mạnh trước
// chỉ mục: từ dạng mạnh chưa xong bản s2 vẫn giữ (file cũ còn) – app dùng khóa s2, thiếu thì rơi về giọng máy
const writeIndex = () => { const ok = words.filter(w => has(w) || (STRONG[w] && HAVE.has(w))); fs.writeFileSync(IDX, ok.join('\n') + '\n'); return ok.length; };
console.log(`${words.length} từ · cần tạo ${todo.length} từ`);
if (process.argv.includes('--count') || !todo.length || limit <= 0) { console.log(`✓ word-audio: ${writeIndex()} từ có đủ giọng Anh + Mỹ`); process.exit(0); }
const { KokoroTTS } = require('kokoro-js');
let tts = null;
for (let k = 1; k <= 6 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`Tải mô hình lỗi (lần ${k})`); await new Promise(r => setTimeout(r, 15000 * k)); } }
if (!tts) { console.error('✗ Không tải được mô hình Kokoro'); process.exit(1); }
const enc = f => execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', TMP, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ac', '1', '-ar', '24000', '-b:a', '40k', f]);
const fromPh = (ph, voice, speed) => tts.generate_from_ids(tts.tokenizer(ph, { truncation: true }).input_ids, { voice, speed });
const manifest = [];
let n = 0, clips = 0; const t0 = Date.now(), DEADLINE = t0 + (+process.env.AUDIO_MIN || 1e6) * 60000;
for (const w of todo) {
  if (n >= limit || Date.now() > DEADLINE) break;
  if (STRONG[w]) { // bản thử: 1) phiên âm mạnh + '.' 2) Mỹ bỏ ː / Anh chậm hơn 3) chữ thường + '.'
    fs.mkdirSync(CAND, { recursive: true });
    for (const [i, v] of VOICES.entries()) {
      const ph = STRONG[w][i], key = wordKey(v, w), cands = [];
      const gens = [() => fromPh(ph + '.', v, 0.9), () => (v === 'af_heart' ? fromPh(ph.replace(/ː/g, '') + '.', v, 0.9) : fromPh(ph, v, 0.8)), () => tts.generate(w + '.', { voice: v, speed: 0.9 })];
      for (const [k, gen] of gens.entries()) { await (await gen()).save(TMP); const c = `${CAND}/${key}.c${k}.mp3`; enc(c); cands.push(c); clips++; }
      manifest.push({ word: w, voice: v, out: `${OUT}/${key}.mp3`, cands });
    }
    fs.writeFileSync(`${CAND}/manifest.json`, JSON.stringify(manifest, null, 1));
    n++; continue;
  }
  for (const v of VOICES) {
    const f = `${OUT}/${wordKey(v, w)}.mp3`; if (fs.existsSync(f)) continue;
    const a = await tts.generate(w, { voice: v, speed: 0.95 });
    await a.save(TMP);
    enc(f); // cắt lặng đầu/cuối cho bấm là nghe ngay
    clips++;
  }
  if (++n % 50 === 0) console.log(`${n}/${Math.min(limit, todo.length)} từ · ${Math.round((Date.now() - t0) / 1000)}s`);
}
const total = writeIndex();
console.log(`✓ word-audio: +${n} từ (${clips} file) · tổng ${total}/${words.length} từ có đủ giọng Anh + Mỹ`);
if (n === 0) { console.error('✗ word-audio: không tạo được từ nào'); process.exit(1); }
