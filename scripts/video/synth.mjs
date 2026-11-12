// Bộ tổng hợp âm thanh tự làm (JS thuần, không sox, không mẫu bản quyền) cho dây chuyền video – docs/VIDEO-PIPELINE.md §10.
//   · SFX: whoosh, swoosh, pop, ding, bass drop, keyboard ticks, riser, glitch, confetti, tick-tock → brand/library/sfx/*.wav + manifest.json
//   · Nhạc nền: vòng lo-fi/pop theo preset (hợp âm + kick + hat + bass) dài đúng thời lượng video → render.mjs trộn & sidechain dưới giọng.
// Dùng: node scripts/video/synth.mjs --sfx            (tạo lại kho SFX, tất định – cùng mã → cùng file)
//       node scripts/video/synth.mjs --music <preset> <giây> <out.wav>
// Mọi âm thanh do Lexkite tự tổng hợp → giấy phép CC0 (ghi trong manifest).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const SR = 44100;
const TAU = Math.PI * 2;
// nhiễu tất định (xorshift) để file sinh ra giống hệt nhau mỗi lần
function noiseGen(seed = 1) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x / 4294967296) * 2 - 1; }; }
const buf = sec => new Float32Array(Math.max(1, Math.round(sec * SR)));
const env = (t, a, d, total) => (t < a ? t / a : Math.max(0, 1 - (t - a) / Math.max(1e-4, d))) * (t < total ? 1 : 0);
// lọc 1 cực (thông thấp) / thông cao, hệ số cắt có thể thay theo thời gian
function lp(x, fcAt) { const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { const fc = fcAt(i / SR), a = 1 - Math.exp(-TAU * fc / SR); s += a * (x[i] - s); y[i] = s; } return y; }
function hp(x, fc) { const lo = lp(x, () => fc); return x.map((v, i) => v - lo[i]); }
function bp(x, fcAt, q = 1) { return hp(lp(x, t => fcAt(t) * (1 + 0.5 / q)), Math.max(20, fcAt(0) * (1 - 0.5 / q))); }
const norm = (x, peak = 0.89) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); const k = m ? peak / m : 1; return x.map(v => v * k); };
const mixInto = (dst, src, at = 0, gain = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain; return dst; };

// ---------- SFX ----------
export const SFX = {
  whoosh: { dur: 0.55, desc: 'whoosh lọc băng thông quét lên – whip-pan, zoom-blur, kit-fly', make: () => { const n = noiseGen(11), d = 0.55, x = buf(d).map(() => n()); const y = bp(x, t => 300 + 3800 * Math.sin(Math.PI * Math.min(1, t / d)) ** 2, 1.2); return norm(y.map((v, i) => v * Math.sin(Math.PI * Math.min(1, i / SR / d)) ** 1.5)); } },
  swoosh: { dur: 0.35, desc: 'swoosh ngắn sáng – slide-stack, page-flip, swipe', make: () => { const n = noiseGen(23), d = 0.35, x = buf(d).map(() => n()); const y = bp(x, t => 1200 + 5000 * (t / d), 1.5); return norm(y.map((v, i) => v * env(i / SR, 0.06, d - 0.06, d))); } },
  pop: { dur: 0.12, desc: 'pop bong bóng – chữ/sticker bật ra', make: () => { const d = 0.12; let ph = 0; return norm(buf(d).map((_, i) => { const t = i / SR, f = 900 - 5200 * t; ph += TAU * Math.max(120, f) / SR; return Math.sin(ph) * Math.exp(-t * 38); }), 0.8); } },
  ding: { dur: 0.9, desc: 'ding chuông (2 hài) – lộ đáp án ✅', make: () => { const d = 0.9; return norm(buf(d).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 1318.5 * t) + 0.5 * Math.sin(TAU * 2637 * t) + 0.25 * Math.sin(TAU * 3955.5 * t)) * Math.exp(-t * 5) * Math.min(1, t / 0.004); }), 0.7); } },
  buzz: { dur: 0.35, desc: 'buzz sai (vuông lọc) – thẻ ❌', make: () => { const d = 0.35; const x = buf(d).map((_, i) => { const t = i / SR; return (Math.sin(TAU * 140 * t) > 0 ? 1 : -1) * 0.6 + (Math.sin(TAU * 147 * t) > 0 ? 0.4 : -0.4); }); return norm(lp(x, () => 1400).map((v, i) => v * env(i / SR, 0.01, d - 0.01, d))); } },
  'bass-drop': { dur: 1.1, desc: 'bass drop (sine quét xuống + sub) – nhịp sốc/hook', make: () => { const d = 1.1; let ph = 0; return norm(buf(d).map((_, i) => { const t = i / SR, f = 40 + 110 * Math.exp(-t * 6); ph += TAU * f / SR; return Math.tanh(1.8 * Math.sin(ph)) * Math.exp(-t * 2.6) * Math.min(1, t / 0.005); })); } },
  keys: { dur: 0.9, desc: 'gõ phím (8 tick) – chữ hook type-on', make: () => { const d = 0.9, out = buf(d), n = noiseGen(5); for (let k = 0; k < 8; k++) { const c = buf(0.03).map((_, i) => n() * Math.exp(-i / SR * 260)); mixInto(out, hp(c, 1800), k * 0.105 + (k % 3) * 0.012, 0.7 + 0.3 * (k % 2)); } return norm(out, 0.7); } },
  riser: { dur: 1.6, desc: 'riser (nhiễu + sine quét lên) – trước câu trả lời', make: () => { const d = 1.6, n = noiseGen(77); let ph = 0; const x = buf(d).map((_, i) => { const t = i / SR, f = 200 * Math.pow(8, t / d); ph += TAU * f / SR; return 0.5 * Math.sin(ph) + 0.5 * n(); }); return norm(bp(x, t => 400 + 6000 * (t / d) ** 2, 1).map((v, i) => v * (i / SR / d) ** 2)); } },
  glitch: { dur: 0.3, desc: 'glitch số (bitcrush ngắt quãng) – chuyển cảnh glitch', make: () => { const d = 0.3, n = noiseGen(9); return norm(buf(d).map((_, i) => { const t = i / SR, gate = Math.floor(t * 40) % 3 !== 1; return gate ? Math.round((Math.sin(TAU * 220 * t) * 0.5 + n() * 0.5) * 4) / 4 : 0; }), 0.6); } },
  confetti: { dur: 0.8, desc: 'confetti (pop nhỏ ngẫu nhiên + lấp lánh) – chúc mừng', make: () => { const d = 0.8, out = buf(d), n = noiseGen(41); for (let k = 0; k < 14; k++) { const f = 1500 + 2500 * Math.abs(n()), c = buf(0.06).map((_, i) => Math.sin(TAU * f * i / SR) * Math.exp(-i / SR * 70)); mixInto(out, c, Math.abs(n()) * 0.6, 0.5); } return norm(out, 0.7); } },
  tick: { dur: 0.08, desc: 'tick đồng hồ – quiz đếm ngược', make: () => { const d = 0.08; return norm(buf(d).map((_, i) => { const t = i / SR; return Math.sin(TAU * 2400 * t) * Math.exp(-t * 120); }), 0.6); } },
};
// Nơi tự đặt SFX (motion.mjs placeSfx dùng): sự kiện → tên SFX + mức (dB so với giọng)
export const SFX_MAP = {
  transition: { 'whip-pan': 'whoosh', 'zoom-blur': 'whoosh', 'swipe-mask': 'swoosh', 'circle-reveal': 'swoosh', glitch: 'glitch', 'page-flip': 'swoosh', 'slide-stack': 'swoosh', 'light-leak': 'whoosh', 'match-cut': 'pop', 'split-screen': 'swoosh', 'kit-fly': 'whoosh', 'confetti-burst': 'confetti' },
  hook: 'bass-drop', shock: 'bass-drop', wordPop: 'pop', sticker: 'pop', reveal: 'ding', wrong: 'buzz', typeOn: 'keys', preReveal: 'riser', quizTick: 'tick',
  gain: { whoosh: -14, swoosh: -15, pop: -18, ding: -12, buzz: -16, 'bass-drop': -10, keys: -20, riser: -18, glitch: -18, confetti: -15, tick: -20 },
};

export function wav16(samples, sr = SR) {
  const n = samples.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return b;
}

// ---------- Nhạc nền ----------
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// preset: bpm, vòng hợp âm (MIDI gốc + quãng), mức kick/hat. Tên khớp content/video/formats.json music[].id
export const MUSIC = {
  'lofi-warm': { bpm: 84, chords: [[57, [0, 3, 7, 10]], [53, [0, 4, 7, 11]], [55, [0, 4, 7, 10]], [52, [0, 3, 7, 10]]], kick: 0.9, hat: 0.25, swing: 0.12 },
  'pop-bright': { bpm: 112, chords: [[60, [0, 4, 7]], [55, [0, 4, 7]], [57, [0, 3, 7]], [53, [0, 4, 7]]], kick: 1, hat: 0.35, swing: 0 },
  'quiz-pulse': { bpm: 120, chords: [[57, [0, 3, 7]], [57, [0, 3, 7]], [53, [0, 4, 7]], [55, [0, 4, 7]]], kick: 1, hat: 0.45, swing: 0 },
  'chill-keys': { bpm: 92, chords: [[62, [0, 3, 7, 10]], [55, [0, 4, 7, 11]], [60, [0, 4, 7, 11]], [57, [0, 3, 7, 10]]], kick: 0.7, hat: 0.2, swing: 0.08 },
  'night-drive': { bpm: 96, chords: [[50, [0, 3, 7, 10]], [46, [0, 4, 7, 11]], [48, [0, 4, 7]], [45, [0, 3, 7]]], kick: 0.9, hat: 0.3, swing: 0.05 },
  'upbeat-claps': { bpm: 118, chords: [[64, [0, 4, 7]], [61, [0, 3, 7]], [57, [0, 4, 7]], [59, [0, 4, 7]]], kick: 1, hat: 0.4, swing: 0, clap: 0.5 },
};
export function music(preset, sec) {
  const P = MUSIC[preset] || MUSIC['lofi-warm'], beat = 60 / P.bpm, bar = beat * 4, out = buf(sec), n = noiseGen(3);
  const kick = buf(0.35).map((_, i) => { const t = i / SR; return Math.sin(TAU * (45 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9); });
  const hat = hp(buf(0.05).map((_, i) => n() * Math.exp(-i / SR * 90)), 6000);
  const clap = bp(buf(0.15).map((_, i) => n() * Math.exp(-i / SR * 25)), () => 1500, 1);
  for (let b = 0; b * bar < sec; b++) {
    const [root, iv] = P.chords[b % P.chords.length], t0 = b * bar;
    // pad: sóng tam giác mềm, 2 tầng quãng tám, vào/ra mềm từng ô nhịp
    const pad = buf(bar + 0.3).map((_, i) => { const t = i / SR, e = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (bar + 0.3 - t) / 0.4)); return e * iv.reduce((a, q) => { const f = NOTE(root + q); return a + (2 / Math.PI) * Math.asin(Math.sin(TAU * f * t)) * 0.5 + 0.15 * Math.sin(TAU * f * 2 * t); }, 0) / iv.length; });
    mixInto(out, lp(pad, () => 1800), t0, 0.22);
    const bass = buf(bar).map((_, i) => { const t = i / SR, f = NOTE(root - 12); return Math.sin(TAU * f * t) * (0.6 + 0.4 * Math.exp(-((t % beat) * 6))); });
    mixInto(out, bass, t0, 0.18);
    for (let k = 0; k < 4; k++) { mixInto(out, kick, t0 + k * beat, k % 2 ? 0.35 * P.kick : 0.5 * P.kick); if (P.clap && k % 2) mixInto(out, clap, t0 + k * beat, P.clap * 0.3); }
    for (let k = 0; k < 8; k++) mixInto(out, hat, t0 + k * beat / 2 + (k % 2 ? P.swing * beat : 0), P.hat * (k % 2 ? 0.6 : 1) * 0.3);
  }
  const fadeIn = 0.6 * SR, fadeOut = 1.2 * SR;
  return norm(out.map((v, i) => v * Math.min(1, i / fadeIn) * Math.min(1, (out.length - i) / fadeOut)), 0.7);
}

// ---------- CLI ----------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function writeSfxLibrary(dir = path.join(ROOT, 'brand/library/sfx')) {
  fs.mkdirSync(dir, { recursive: true });
  const items = Object.entries(SFX).map(([id, d]) => { const f = `${id}.wav`; fs.writeFileSync(path.join(dir, f), wav16(d.make())); return { id, file: `sfx/${f}`, dur: d.dur, gainDb: SFX_MAP.gain[id] ?? -16, desc: d.desc, license: 'CC0-1.0 (Lexkite tự tổng hợp – scripts/video/synth.mjs)' }; });
  const man = { _note: 'Kho hiệu ứng âm thanh video (tự tổng hợp, CC0). Tạo lại: node scripts/video/synth.mjs --sfx. Đường dẫn tương đối brand/library/. Tự đặt theo SFX_MAP ở synth.mjs (motion.mjs placeSfx).', sr: SR, items, placement: SFX_MAP };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
  return man;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  if (a[0] === '--sfx') { const m = writeSfxLibrary(); console.log(`✓ ${m.items.length} SFX → brand/library/sfx/`); }
  else if (a[0] === '--music') { fs.writeFileSync(a[3], wav16(music(a[1], +a[2]))); console.log(`✓ nhạc ${a[1]} ${a[2]} s → ${a[3]}`); }
  else console.log('node scripts/video/synth.mjs --sfx | --music <preset> <giây> <out.wav>');
}
