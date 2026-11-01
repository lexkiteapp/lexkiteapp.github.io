// 🔊 Gói âm thanh "game feel" của Lexkite – TỰ TỔNG HỢP bằng công thức trong file này (không lấy mẫu của ai → CC0 do chính mình làm, $0).
// Chạy: node scripts/sfx/build.mjs [outDir=web/sfx] → <tên>.wav (tạm) → ffmpeg → <tên>.mp3 mono 44.1 kHz ~48 kb/s (vài KB mỗi file).
// Thiết kế: tap gỗ mềm · correct chuông 2 nốt đi lên · wrong "bonk" trầm dịu (không gắt, không buzzer) · combo lấp lánh 3 nốt (app đổi cao độ theo n)
// · complete fanfare 4 nốt chuông + nền ấm · streak vút lên + chuông. Tất cả đỉnh −3 dBFS, đuôi tắt mượt (không click). Chi tiết: docs/GAME-FEEL.md
import { writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const SR = 44100, OUT = process.argv[2] || 'web/sfx';
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1; // nhiễu cố định → bản dựng lặp lại y hệt

const buf = s => new Float32Array(Math.ceil(s * SR));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d)); // nhấc nhanh, tắt dần
// Chuông: các bội âm hơi lệch (như kim loại/thủy tinh) – sáng nhưng không chói
function bell(o, at, f, { dur = 0.5, vol = 0.5, parts = [[1, 1, 1], [2.01, 0.35, 0.6], [3.98, 0.12, 0.35], [5.4, 0.05, 0.2]], glide = 0 } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (const [m, a, dk] of parts) {
    let ph = 0;
    for (let i = 0; i < n && s0 + i < o.length; i++) {
      const t = i / SR, fr = f * m * (1 + glide * Math.exp(-t * 40));
      ph += (2 * Math.PI * fr) / SR;
      o[s0 + i] += Math.sin(ph) * a * vol * env(t, 0.003, dur * 0.25 * dk);
    }
  }
}
// Nốt mềm (sine + chút bội 2), có thể trượt cao độ – dùng cho "bonk"
function soft(o, at, f, { dur = 0.2, vol = 0.5, drop = 0 } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < n && s0 + i < o.length; i++) {
    const t = i / SR; ph += (2 * Math.PI * f * (1 - drop * Math.min(1, t / dur))) / SR;
    o[s0 + i] += (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * vol * env(t, 0.006, dur * 0.3);
  }
}
// Nhiễu lọc (thông thấp 1 cực, tần cắt có thể quét) – tiếng gõ gỗ / tiếng vút
function noise(o, at, { dur = 0.05, vol = 0.3, from = 2000, to = 2000, a = 0.002, d = 0.01, swell = false } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR); let y = 0;
  for (let i = 0; i < n && s0 + i < o.length; i++) {
    const t = i / SR, fc = from + (to - from) * (t / dur), k = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += k * (rnd() - y);
    const e = swell ? Math.sin(Math.PI * Math.min(1, t / dur)) ** 2 : env(t, a, d);
    o[s0 + i] += y * vol * e;
  }
}
// Vang ngắn kiểu "phòng nhỏ" (4 lược hồi tiếp) – ấm hơn, không mờ
function room(o, mix = 0.18) {
  const taps = [0.0297, 0.0371, 0.0411, 0.0437].map(s => Math.floor(s * SR)), fb = 0.55, w = new Float32Array(o.length);
  for (const d of taps) { const b = new Float32Array(o.length); for (let i = 0; i < o.length; i++) { b[i] = o[i] + (i >= d ? b[i - d] * fb : 0); w[i] += b[i] / taps.length; } }
  for (let i = 0; i < o.length; i++) o[i] = o[i] * (1 - mix) + w[i] * mix;
}
function finish(o) {
  const fade = Math.floor(0.03 * SR); for (let i = 0; i < fade; i++) o[o.length - 1 - i] *= i / fade; // đuôi về 0 – không tiếng click
  let pk = 0; for (const v of o) pk = Math.max(pk, Math.abs(v));
  const g = pk ? 0.708 / pk : 1; for (let i = 0; i < o.length; i++) o[i] *= g; // −3 dBFS
  return o;
}

const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093, B5 = 987.8, E5 = 659.3, G5 = 784;
const SOUNDS = {
  tap: () => { const o = buf(0.07); noise(o, 0, { dur: 0.05, vol: 0.5, from: 3200, to: 1400, d: 0.008 }); soft(o, 0, 1760, { dur: 0.05, vol: 0.25 }); return o; },
  correct: () => { const o = buf(0.45); bell(o, 0, B5, { dur: 0.3, vol: 0.45 }); bell(o, 0.075, E6 * 1.122, { dur: 0.38, vol: 0.5 }); room(o, 0.15); return o; }, // B5 → F#6 (quãng 5 đi lên: "đúng rồi!")
  wrong: () => { const o = buf(0.32); soft(o, 0, 233, { dur: 0.14, vol: 0.55, drop: 0.04 }); soft(o, 0.1, 196, { dur: 0.2, vol: 0.5, drop: 0.06 }); noise(o, 0, { dur: 0.03, vol: 0.08, from: 900, to: 500 }); room(o, 0.12); return o; },
  combo: () => { const o = buf(0.42); [G5, C6, E6].forEach((f, i) => bell(o, i * 0.05, f, { dur: 0.24, vol: 0.38, glide: 0.01 })); bell(o, 0.16, C7, { dur: 0.22, vol: 0.18, parts: [[1, 1, 1], [2.76, 0.2, 0.3]] }); room(o, 0.2); return o; },
  complete: () => {
    const o = buf(1.25); [C6, E6, G6].forEach((f, i) => bell(o, i * 0.09, f, { dur: 0.35, vol: 0.4 }));
    bell(o, 0.27, C7, { dur: 0.9, vol: 0.45 }); [E5, G5, C6].forEach(f => soft(o, 0.27, f, { dur: 0.9, vol: 0.12 })); // nền hợp âm ấm dưới nốt cuối
    noise(o, 0.27, { dur: 0.5, vol: 0.05, from: 7000, to: 4000, d: 0.12 }); room(o, 0.22); return o;
  },
  streak: () => { const o = buf(0.85); noise(o, 0, { dur: 0.32, vol: 0.32, from: 400, to: 5200, swell: true }); bell(o, 0.28, E6, { dur: 0.45, vol: 0.4 }); bell(o, 0.34, G6 * 1.122, { dur: 0.5, vol: 0.32 }); room(o, 0.2); return o; },
};

function wav(o) {
  const b = Buffer.alloc(44 + o.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + o.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(o.length * 2, 40);
  o.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
}

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const w = join(OUT, name + '.wav'), m = join(OUT, name + '.mp3');
  writeFileSync(w, wav(finish(make())));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', w, '-ac', '1', '-ar', '44100', '-b:a', '48k', '-map_metadata', '-1', m]);
  rmSync(w);
  console.log(name.padEnd(9), (statSync(m).size / 1024).toFixed(1), 'KB');
}
