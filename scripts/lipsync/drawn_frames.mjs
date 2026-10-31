// Miệng VẼ theo mốc (sau lab.mjs, lipsync-lab.yml): mỗi khung 24 fps = LipMouth.svg(mix(a, b, k)) với {a,b,k} = LipSync.stateAt (cùng hàm phát thật).
// Đo lệch tiếng–miệng của chính miệng vẽ (độ mở u+d ↔ năng lượng tiếng, tương quan chéo 100 Hz). Ra: qa/lipsync/drawn.json → scripts/lipsync/drawn_video.py
import fs from 'node:fs'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LM = req('../../web/js/call/mouths.js');
const QA = 'qa/lipsync', lines = JSON.parse(fs.readFileSync('web/lab/lipsync/lines.json', 'utf8')), FPS = 24;
const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = 240, R = []; for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; };
const at = (cues, t) => { const s = LS.stateAt(cues, t); return LM.mix(s.a, s.b, s.k); };
const out = { fps: FPS, lines: [], lag: {} };
for (const l of lines) {
  const env = rms100(`${QA}/${l.id}.wav`);
  out.lag[l.id] = xlag(env.map((_, k) => { const p = at(l.cues, k / 100); return p.u + p.d; }), env);
}
// video ≤ 20 s: xen kẽ Ama/Carlos, có cả 3 câu từng lệch (ama-0, carlos-5, carlos-7)
let tot = 0;
for (const id of ['ama-0', 'carlos-5', 'ama-1', 'carlos-7', 'ama-2', 'carlos-6']) {
  const l = lines.find(x => x.id === id); if (!l || tot + l.dur + 0.3 > 19.5) continue; tot += l.dur + 0.3;
  const n = Math.ceil((l.dur + 0.3) * FPS);
  out.lines.push({ id, who: l.who, text: l.text, wav: `${QA}/${id}.wav`, frames: Array.from({ length: n }, (_, k) => LM.svg(l.who, at(l.cues, k / FPS), 'f')) });
}
const v = Object.values(out.lag).map(Math.abs); out.maxAbsLagMs = Math.max(...v);
fs.writeFileSync(`${QA}/drawn.json`, JSON.stringify(out));
console.log('drawn mouth AV lag ms', JSON.stringify(out.lag), 'max', out.maxAbsLagMs, out.maxAbsLagMs <= 45 ? '✅' : '❌ > 45');
if (out.maxAbsLagMs > 45) process.exitCode = 1;
