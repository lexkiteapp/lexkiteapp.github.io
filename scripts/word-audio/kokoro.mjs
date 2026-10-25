// Tổng hợp từ đơn bằng Kokoro-82M (kokoro-js, q8) – dùng chung cho gen-word-audio.mjs và lab.mjs.
// Kokoro đọc từ đứng một mình (2–6 âm vị) hay bịa âm đầu ("just" → "Adjust", "away" → "The way"): kiểu giọng (style) lấy theo độ dài chuỗi,
// chuỗi rất ngắn rơi vào vùng style ít được huấn luyện. Các cách thử: câu mang (carrier) rồi cắt lấy từ, đệm dấu câu, style của chuỗi dài hơn.
import fs from 'node:fs';
export const SR = 24000;
export async function loadKokoro(require) {
  const { KokoroTTS } = require('kokoro-js'), { Tensor } = require('@huggingface/transformers');
  let tts = null;
  for (let i = 1; i <= 6 && !tts; i++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`Tải mô hình lỗi (lần ${i}): ${e.message}`); await new Promise(r => setTimeout(r, 15000 * i)); } }
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
// Câu mang "…: TỪ." → cắt sau khoảng lặng cuối cùng ≥ gapMs trước từ (từ ở cuối câu nên giữ ngữ điệu xuống của từ trích dẫn)
export function cutAfterLastGap(pcm, gapMs = 180, thr = -42) {
  const db = frames(pcm), F = SR / 100, sil = i => db[i] < thr; let end = db.length - 1; while (end > 0 && sil(end)) end--;
  let i = end, run = 0;
  for (; i >= 0; i--) { if (sil(i)) { if (++run * 10 >= gapMs) break; } else run = 0; }
  if (i < 0) return null; // không có khoảng lặng → không cắt được
  let st = i + run; while (st < end && sil(st)) st++;
  return clip(pcm, (st - 3) * F, (end + 9) * F);
}
// Gọt lặng đầu/cuối (từ đứng một mình)
export function trim(pcm, thr = -45) { const db = frames(pcm), F = SR / 100; let a = 0, b = db.length - 1; while (a < b && db[a] < thr) a++; while (b > a && db[b] < thr) b--; return clip(pcm, (a - 2) * F, (b + 8) * F); }
// Cắt theo độ dài âm vị mô hình trả về (nếu có): durations[i] khung (mỗi khung 600 mẫu ở 24 kHz… tính theo tỉ lệ tổng)
export function cutByDur(pcm, dur, from) { const tot = dur.reduce((s, x) => s + x, 0), spf = pcm.length / tot; let a = 0; for (let i = 0; i < from; i++) a += dur[i]; return trim(pcm.slice(Math.floor(a * spf)), -45); }
const CARRIER = { bf_emma: 'The word is:', af_heart: 'The word is:' };
// Các phương án (tên → () => pcm|null). ph = phiên âm dạng mạnh (STRONG) nếu có.
export function variants(k, w, v, ph) {
  const core = async (sp) => ph ? k.phIds(ph + '.') : await k.ids(w + '.', v);
  const midOf = a => a.slice(1, -1);
  return {
    A_plain095: async () => trim((await k.run(await k.ids(w, v), v, 0.95)).pcm),
    C_dot090: async () => trim((await k.run(await core(), v, 0.9)).pcm),
    B_ellipsis: async () => { const p = midOf(k.phIds('… ')), c = midOf(await core()); return trim((await k.run([0, ...p, ...c, 0], v, 0.9)).pcm); },
    B_comma: async () => { const p = midOf(k.phIds(', ')), c = midOf(await core()); return trim((await k.run([0, ...p, ...c, 0], v, 0.9)).pcm); },
    D_style40: async () => trim((await k.run(await core(), v, 0.9, 40)).pcm),
    E_carrier: async () => {
      const car = midOf(await k.ids(CARRIER[v], v)), c = midOf(await core()), sp = midOf(k.phIds(' '));
      const r = await k.run([0, ...car, ...sp, ...c, 0], v, 0.9);
      return r.dur ? cutByDur(r.pcm, r.dur, 1 + car.length + sp.length) : cutAfterLastGap(r.pcm);
    },
    E_carrier_gap: async () => {
      const car = midOf(await k.ids(CARRIER[v], v)), c = midOf(await core()), sp = midOf(k.phIds(' '));
      return cutAfterLastGap((await k.run([0, ...car, ...sp, ...c, 0], v, 0.9)).pcm);
    },
    E_carrier100: async () => {
      const car = midOf(await k.ids(CARRIER[v], v)), c = midOf(await core()), sp = midOf(k.phIds(' '));
      const r = await k.run([0, ...car, ...sp, ...c, 0], v, 1.0);
      return r.dur ? cutByDur(r.pcm, r.dur, 1 + car.length + sp.length) : cutAfterLastGap(r.pcm);
    },
  };
}
