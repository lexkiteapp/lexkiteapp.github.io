// 🎭 Cổng khẩu hình con rối (đo trên CHÍNH hàm sample() mà app + Remotion dùng, so với âm thanh thật voice.wav) – docs/LESSON-ENGINE.md §4b.
// Đo mỗi khung 30 fps: (1) tương quan độ mở miệng ↔ năng lượng giọng + độ lệch tốt nhất ≤ 2 khung (≤ 67 ms); (2) im lặng → miệng ngậm;
// (3) đang nói → miệng không đứng yên; (4) từ bắt đầu bằng m/b/p → có hình mím môi A quanh đầu từ. Trượt → exit 1.
// Dùng: node scripts/puppet/gate.mjs out/puppet   → out/puppet/gate.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DIR = process.argv[2] || 'out/puppet', ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const Pup = createRequire(import.meta.url)(path.join(ROOT, 'web/js/lesson/puppet.js'));
const props = JSON.parse(fs.readFileSync(path.join(DIR, 'props.json'), 'utf8')), fps = props.fps, N = props.durationInFrames, SR = 16000;
const b = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.join(DIR, props.audio), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const a = new Float32Array(b.buffer, b.byteOffset, b.length / 4), hop = SR / fps;

const rms = [], db = [], open = [], press = [], rest = [];
for (let i = 0; i < N; i++) {
  let s = 0, n = 0; for (let j = Math.floor(i * hop); j < Math.min(a.length, Math.floor((i + 1) * hop)); j++, n++) s += a[j] * a[j];
  const r = n ? Math.sqrt(s / n) : 0; rms.push(r); db.push(20 * Math.log10(r + 1e-9));
  const m = Pup.sample(props.tl, i / fps).m; open.push(m.open); press.push(m.press); rest.push(m.open < 0.04 && m.press < 0.5 && m.teeth < 0.3);
}
const sm = rms.map((_, i) => (rms[Math.max(0, i - 1)] + 2 * rms[i] + rms[Math.min(N - 1, i + 1)]) / 4);
function corr(lag) {
  const x = [], y = []; for (let i = 0; i < N; i++) { const j = i + lag; if (j >= 0 && j < N) { x.push(open[i]); y.push(sm[j]); } }
  const mx = x.reduce((p, v) => p + v, 0) / x.length, my = y.reduce((p, v) => p + v, 0) / y.length;
  let sxy = 0, sx = 0, sy = 0; for (let k = 0; k < x.length; k++) { sxy += (x[k] - mx) * (y[k] - my); sx += (x[k] - mx) ** 2; sy += (y[k] - my) ** 2; }
  return sxy / Math.sqrt(sx * sy || 1);
}
const lags = []; for (let L = -6; L <= 6; L++) lags.push([L, corr(L)]);
const [bestLag, bestR] = lags.reduce((p, q) => (q[1] > p[1] ? q : p)), r0 = corr(0);

// im lặng: đoạn ≥ 8 khung dưới -50 dB (bỏ 2 khung mép – chuyển tiếp miệng)
const quiet = []; for (let i = 0; i < N;) { if (db[i] < -50) { let j = i; while (j < N && db[j] < -50) j++; if (j - i >= 8) for (let k = i + 2; k < j - 2; k++) quiet.push(k); i = j; } else i++; }
const silOk = quiet.filter(i => open[i] <= 0.06).length / Math.max(1, quiet.length);
const loud = db.map((d, i) => (d > -32 ? i : -1)).filter(i => i >= 0), actOk = loud.filter(i => !rest[i]).length / Math.max(1, loud.length);
const bil = (props.words || []).filter(w => /^[mbp]/i.test(String(w.w).replace(/[^a-z]/gi, '')));
const bilOk = bil.filter(w => { for (let i = Math.floor((w.start - 0.1) * fps); i <= Math.ceil((w.start + 0.12) * fps); i++) if (press[i] >= 0.6) return true; return false; }).length / Math.max(1, bil.length);

const pass = { lag: Math.abs(bestLag) <= 2, corr: r0 >= 0.45, silence: silOk >= 0.95, active: actOk >= 0.85, bilabial: bilOk >= 0.75 };
const score = Math.round(30 * Math.min(1, r0 / 0.6) + 15 * (Math.abs(bestLag) <= 1 ? 1 : Math.abs(bestLag) <= 2 ? 0.7 : 0) + 20 * silOk + 20 * actOk + 15 * bilOk);
const out = { frames: N, corr0: +r0.toFixed(3), bestLag, bestR: +bestR.toFixed(3), lagMs: Math.round(bestLag * 1000 / fps), silence: +silOk.toFixed(3), silenceFrames: quiet.length, active: +actOk.toFixed(3), loudFrames: loud.length, bilabial: +bilOk.toFixed(3), bilabialWords: bil.length, score, pass, ok: Object.values(pass).every(Boolean) };
fs.writeFileSync(path.join(DIR, 'gate.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
if (!out.ok) { console.error('❌ cổng khẩu hình trượt: ' + Object.entries(pass).filter(([, v]) => !v).map(([k]) => k).join(', ')); process.exit(1); }
console.log(`✅ cổng khẩu hình: ${score}/100`);
