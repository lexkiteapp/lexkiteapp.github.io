// 🎭 Cổng khẩu hình con rối (đo trên CHÍNH hàm sample() mà app + Remotion dùng, so với âm thanh thật voice.wav) – docs/LESSON-ENGINE.md §4b.
// Đo mỗi khung 30 fps (độ mở miệng = phần do viseme lái): (1) tương quan độ mở ↔ năng lượng dải nguyên âm + độ lệch tốt nhất ≤ 2 khung (≤ 67 ms); (2) im lặng → miệng ngậm;
// (3) đang nói → miệng không đứng yên; (4b) miệng bắt đầu mở ±60 ms quanh mỗi đầu cụm âm thanh thật; (5) kiểm âm tính: dịch ±150 ms phải trượt (im lặng = miệng về dáng nghỉ của biểu cảm, không mấp máy); (4) từ bắt đầu bằng m/b/p → có hình mím môi A quanh đầu từ. Trượt → exit 1.
// Dùng: node scripts/puppet/gate.mjs out/puppet   → out/puppet/gate.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DIR = process.argv[2] || 'out/puppet', ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const Pup = createRequire(import.meta.url)(path.join(ROOT, 'web/js/lesson/puppet.js'));
const props = JSON.parse(fs.readFileSync(path.join(DIR, 'props.json'), 'utf8')), fps = props.fps, N = props.durationInFrames, SR = 16000;
const dec = af => { const b = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.join(DIR, props.audio), ...(af ? ['-af', af] : []), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
// năng lượng dải nguyên âm 200–1000 Hz (F1 ~ độ mở hàm) cho tương quan; năng lượng toàn dải cho im lặng/đang nói
const a = dec(null), av = dec('highpass=f=200,lowpass=f=1000'), hop = SR / fps;

// năng lượng mỗi khung – tính 1 lần
const rms = [], db = [], vrms = [];
for (let i = 0; i < N; i++) {
  let s = 0, sv = 0, n = 0; for (let j = Math.floor(i * hop); j < Math.min(a.length, Math.floor((i + 1) * hop)); j++, n++) { s += a[j] * a[j]; sv += av[j] * av[j]; }
  const r = n ? Math.sqrt(s / n) : 0; rms.push(r); db.push(20 * Math.log10(r + 1e-9)); vrms.push(n ? Math.sqrt(sv / n) : 0);
}
const sm = vrms.map((_, i) => (vrms[Math.max(0, i - 1)] + 2 * vrms[i] + vrms[Math.min(N - 1, i + 1)]) / 4);
const quiet = []; for (let i = 0; i < N;) { if (db[i] < -50) { let j = i; while (j < N && db[j] < -50) j++; if (j - i >= 8) for (let k = i + 2; k < j - 2; k++) quiet.push(k); i = j; } else i++; } // im ≥ 8 khung, bỏ 2 khung mép
const loud = db.map((d, i) => (d > -32 ? i : -1)).filter(i => i >= 0);
// đầu cụm theo ÂM THANH THẬT (độc lập Rhubarb/whisper): mức 10 ms vượt -40 dB sau ≥ 150 ms dưới -50 dB
const db10 = []; for (let i = 0; i * 160 < a.length; i++) { let q = 0, n = 0; for (let j = i * 160; j < Math.min(a.length, i * 160 + 160); j++, n++) q += a[j] * a[j]; db10.push(10 * Math.log10(q / (n || 1) + 1e-12)); }
const onsets = []; for (let i = 15, low = 0; i < db10.length; i++) { if (db10[i - 1] < -50) low++; else if (db10[i - 1] > -40) low = 0; if (low >= 15 && db10[i] > -40) { onsets.push(i / 100); low = 0; } }
const bil = (props.words || []).filter(w => /^[mbp]/i.test(String(w.w).replace(/[^a-z]/gi, '')));

function measure(tl) {
  const open = [], press = [], rest = [];
  for (let i = 0; i < N; i++) { const S = Pup.sample(tl, i / fps), v = S.vis; open.push(v.open); press.push(S.m.press); rest.push(v.open < 0.04 && v.press < 0.5 && v.teeth < 0.3); }
  const corr = lag => {
    const x = [], y = []; for (let i = 0; i < N; i++) { const j = i + lag; if (j >= 0 && j < N) { x.push(open[i]); y.push(sm[j]); } }
    const mx = x.reduce((p, v) => p + v, 0) / x.length, my = y.reduce((p, v) => p + v, 0) / y.length;
    let sxy = 0, sx = 0, sy = 0; for (let k = 0; k < x.length; k++) { sxy += (x[k] - mx) * (y[k] - my); sx += (x[k] - mx) ** 2; sy += (y[k] - my) ** 2; }
    return sxy / Math.sqrt(sx * sy || 1);
  };
  const lags = []; for (let L = -8; L <= 8; L++) lags.push([L, corr(L)]);
  const [bestLag, bestR] = lags.reduce((p, q) => (q[1] > p[1] ? q : p)), r0 = corr(0);
  const silOk = quiet.filter(i => open[i] <= 0.06).length / Math.max(1, quiet.length), actOk = loud.filter(i => !rest[i]).length / Math.max(1, loud.length);
  const bilOk = bil.filter(w => { for (let i = Math.floor((w.start - 0.1) * fps); i <= Math.ceil((w.start + 0.12) * fps); i++) if (press[i] >= 0.6) return true; return false; }).length / Math.max(1, bil.length);
  // miệng bắt đầu mở (sau ≥ 60 ms đứng yên) trong ±60 ms quanh mỗi đầu cụm âm thanh
  const mv = x => { const v = Pup.sample(tl, x).vis; return v.open > 0.05 || v.press > 0.5 || v.teeth > 0.3; };
  const dOn = onsets.map(o => { for (let x = o - 0.2; x <= o + 0.2; x += 0.002) if (mv(x) && !mv(x - 0.03) && !mv(x - 0.06)) return Math.abs(x - o); return 1; });
  const onOk = dOn.filter(d => d <= 0.06).length / Math.max(1, dOn.length);
  const pass = { onset: onOk >= 0.9, lag: Math.abs(bestLag) <= 2, corr: r0 >= 0.45, silence: silOk >= 0.95, active: actOk >= 0.85, bilabial: bilOk >= 0.75 };
  const score = Math.round(30 * Math.min(1, r0 / 0.6) + 15 * (Math.abs(bestLag) <= 1 ? 1 : Math.abs(bestLag) <= 2 ? 0.7 : 0) + 20 * silOk + 20 * actOk + 15 * bilOk);
  return { corr0: +r0.toFixed(3), bestLag, bestR: +bestR.toFixed(3), lagMs: Math.round(bestLag * 1000 / fps), silence: +silOk.toFixed(3), active: +actOk.toFixed(3), bilabial: +bilOk.toFixed(3), onsets: dOn.length, onset60: +onOk.toFixed(3), onsetMedMs: Math.round((dOn.slice().sort((x, y) => x - y)[dOn.length >> 1] || 0) * 1000), score, pass, ok: Object.values(pass).every(Boolean) };
}
// kiểm âm tính: cùng âm thanh, khẩu hình dịch ±150 ms PHẢI trượt – nếu không, thước đo không đủ nhạy → cổng trượt
const shift = d => ({ ...props.tl, cues: props.tl.cues.map(([t, v]) => [t + d, v]) });
const main = measure(props.tl), neg = { plus150: measure(shift(0.15)), minus150: measure(shift(-0.15)) };
const sensitive = !neg.plus150.ok && !neg.minus150.ok;
const out = { frames: N, silenceFrames: quiet.length, loudFrames: loud.length, bilabialWords: bil.length, ...main, negative: { plus150: { ok: neg.plus150.ok, onset60: neg.plus150.onset60, lagMs: neg.plus150.lagMs, corr0: neg.plus150.corr0, bilabial: neg.plus150.bilabial }, minus150: { ok: neg.minus150.ok, onset60: neg.minus150.onset60, lagMs: neg.minus150.lagMs, corr0: neg.minus150.corr0, bilabial: neg.minus150.bilabial }, sensitive } };
out.ok = main.ok && sensitive;
fs.writeFileSync(path.join(DIR, 'gate.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
if (!sensitive) { console.error('❌ thước đo không bắt được khẩu hình lệch 150 ms → không tin được'); process.exit(1); }
if (!main.ok) { console.error('❌ cổng khẩu hình trượt: ' + Object.entries(main.pass).filter(([, v]) => !v).map(([k]) => k).join(', ')); process.exit(1); }
console.log(`✅ cổng khẩu hình: ${main.score}/100 (lệch ±150 ms bị bắt: có)`);
