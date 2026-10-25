// Tổng hợp từ đơn bằng Kokoro-82M (kokoro-js, q8) – dùng chung cho gen-word-audio.mjs và lab.mjs.
// Kokoro đọc từ đứng một mình (2–6 âm vị) hay bịa âm đầu ("just" → "Adjust", "away" → "The way"): kiểu giọng (style) lấy theo độ dài chuỗi,
// chuỗi rất ngắn rơi vào vùng style ít được huấn luyện. Các cách thử: câu mang (carrier) rồi cắt lấy từ, đệm dấu câu, style của chuỗi dài hơn.
import fs from 'node:fs';
export const SR = 24000;
// fp32 (lab 25/10: đạt nhiều hơn q8 và tạo nhanh hơn trên CPU CI). Khóa |s3 gắn với lựa chọn này – đổi thì đổi hậu tố WAV.
export const DTYPE = process.env.KOKORO_DTYPE || 'fp32';
export async function loadKokoro(require) {
  const { KokoroTTS } = require('kokoro-js'), { Tensor } = require('@huggingface/transformers');
  let tts = null;
  for (let i = 1; i <= 6 && !tts; i++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: DTYPE, device: 'cpu' }); } catch (e) { console.error(`Tải mô hình lỗi (lần ${i}): ${e.message}`); await new Promise(r => setTimeout(r, 15000 * i)); } }
  if (!tts) throw new Error('Không tải được mô hình Kokoro');
  const vdir = require.resolve('kokoro-js').replace(/dist\/.*$/, 'voices/'), VC = {};
  const voice = v => VC[v] || (VC[v] = new Float32Array(new Uint8Array(fs.readFileSync(vdir + v + '.bin')).buffer));
  // chữ → id (bắt id mà kokoro-js tự phiên âm, không chạy mô hình)
  const ids = async (text, v) => { const o = tts.generate_from_ids; let cap; tts.generate_from_ids = async x => { cap = x; }; try { await tts.generate(text, { voice: v }); } finally { tts.generate_from_ids = o; } return Array.from(cap.data, Number); };
  const phIds = ph => Array.from(tts.tokenizer(ph, { truncation: true }).input_ids.data, Number);
  const k = { tts, outNames: '', ids, phIds };
  // chạy mô hình; styleLen: độ dài dùng để chọn style (mặc định = số token thật như kokoro-js)
  k.run = async (arr, v, speed = 1, styleLen) => {
    const n = styleLen ?? arr.length - 2, off = 256 * Math.min(Math.max(n, 0), 509);
    const out = await tts.model({ input_ids: new Tensor('int64', BigInt64Array.from(arr.map(BigInt)), [1, arr.length]), style: new Tensor('float32', voice(v).slice(off, off + 256), [1, 256]), speed: new Tensor('float32', [speed], [1]) });
    k.outNames = Object.keys(out).join(',');
    return { pcm: Float32Array.from(out.waveform.data), dur: out.durations ? Array.from(out.durations.data, Number) : null };
  };
  k.wav = (f, pcm) => { const b = Buffer.alloc(44 + pcm.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40); for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), 44 + i * 2); fs.writeFileSync(f, b); };
  return k;
}
// Khung 10 ms → dB so với đỉnh
const frames = pcm => { const F = SR / 100, n = Math.floor(pcm.length / F), db = new Float32Array(n); let pk = 1e-9; for (const x of pcm) pk = Math.max(pk, Math.abs(x)); for (let i = 0; i < n; i++) { let s = 0; for (let j = i * F; j < (i + 1) * F; j++) s += pcm[j] * pcm[j]; db[i] = 10 * Math.log10(s / F + 1e-12) - 20 * Math.log10(pk); } return db; };
// Gọt: lấy đoạn [a, b) mẫu, chừa lề, fade vào 8 ms / ra 25 ms
export function clip(pcm, a, b) { a = Math.max(0, a); b = Math.min(pcm.length, b); const o = pcm.slice(a, b), fi = SR * 0.008, fo = SR * 0.025; for (let i = 0; i < o.length; i++) { const g = Math.min(1, i / fi, (o.length - 1 - i) / fo); o[i] *= Math.max(0, g); } return o; }
// Gọt lặng đầu/cuối (từ đứng một mình)
export function trim(pcm, thr = -45) { const db = frames(pcm), F = SR / 100; let a = 0, b = db.length - 1; while (a < b && db[a] < thr) a++; while (b > a && db[b] < thr) b--; return clip(pcm, (a - 2) * F, (b + 8) * F); }
// Câu mang: Kokoro đọc trọn câu rất chuẩn (lab 25/10: Whisper nghe "The word is away." đúng 40/40) nhưng không ngắt hơi đủ để cắt theo khoảng lặng
// → xuất NGUYÊN câu (tên bắt đầu "cut_"), scripts/word-audio/asr_lib.py cắt lấy từ cuối theo mốc thời gian từng chữ của Whisper rồi mới nghe lại.
const raw = async (k, carrier, w, v, ph, speed) => { const mid = a => a.slice(1, -1), c = ph ? k.phIds(ph + '.') : await k.ids(w + '.', v); return (await k.run([0, ...mid(await k.ids(carrier, v)), ...mid(k.phIds(' ')), ...mid(c), 0], v, speed)).pcm; };
// Phương án theo thứ tự ưu tiên (gen-word-audio.mjs: vòng 1 = phương án đầu, vòng 2 = các phương án còn lại). (k, từ, giọng, phiên âm mạnh?) → pcm | null
export const METHODS = {
  cut_wordis: (k, w, v, ph) => raw(k, 'The word is:', w, v, ph, 0.9),
  dot100: async (k, w, v, ph) => trim((await k.run(ph ? k.phIds(ph + '.') : await k.ids(w + '.', v), v, 1.0)).pcm),
  cut_wordis100: (k, w, v, ph) => raw(k, 'The word is:', w, v, ph, 1.0),
  cut_next: (k, w, v, ph) => raw(k, 'Next word.', w, v, ph, 0.9),
  plain095: async (k, w, v) => trim((await k.run(await k.ids(w, v), v, 0.95)).pcm),
  dot090: async (k, w, v, ph) => trim((await k.run(ph ? k.phIds(ph + '.') : await k.ids(w + '.', v), v, 0.9)).pcm),
};
// lab: mọi phương án
export function variants(k, w, v, ph) { return Object.fromEntries(Object.entries(METHODS).map(([n, f]) => [n, () => f(k, w, v, ph)])); }
