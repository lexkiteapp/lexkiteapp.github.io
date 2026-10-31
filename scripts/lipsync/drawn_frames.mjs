// Mặt VẼ theo mốc (sau lab.mjs, lipsync-lab.yml): mỗi khung 24 fps = LipFace.svg(machine.at(t)) – lớp miệng (viseme × độ lớn tiếng) + chớp/liếc/mày/nghiêng đầu, cùng hàm phát thật.
// Điểm chất lượng (cổng): lệch tiếng–miệng ≤ 45 ms (độ mở vẽ ↔ năng lượng, tương quan chéo 100 Hz) · đúng hình theo âm vị Kokoro ≥ 80 % (khung có tiếng, dung sai ±40 ms)
//   · 0 nháy (hình hiện < MIN_HOLD) · chớp mắt 6–30 lần/phút, mỗi lần 80–220 ms. Ra: qa/lipsync/drawn.json (→ drawn_video.py) + drawn-metrics.json.
import fs from 'node:fs'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LF = req('../../web/js/call/face.js');
const QA = 'qa/lipsync', lines = JSON.parse(fs.readFileSync('web/lab/lipsync/lines.json', 'utf8')), FPS = 24;
const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = 240, R = []; for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; };
// hình "đúng" theo âm vị Kokoro ở thời điểm t (bỏ dấu nhấn/khoảng trắng)
const truthAt = (ph, t) => { const x = ph.find(q => q.s <= t && t < q.e && !/[ˈˌː\s]/.test(q.p)); return x ? (/[^\p{L}ᵊ]/u.test(x.p) ? 'X' : LS.IPA[x.p] || 'B') : null; };
const machineOf = (l, i, env) => LF.machine(l.who, { cues: l.cues, env, dur: l.dur, emo: l.emo, seed: 11 + i, text: l.text });
const out = { fps: FPS, lines: [], lag: {}, rows: [] };
let blinkN = 0, blinkT = 0, blinkBad = 0;
for (const [i, l] of lines.entries()) {
  const env = rms100(`${QA}/${l.id}.wav`), M = machineOf(l, i, env), peak = Math.max(...env), n = env.length;
  const S = Array.from({ length: n }, (_, k) => M.at(k / 100));
  const lag = xlag(S.map(s => s.mouth.u + s.mouth.d), env); out.lag[l.id] = lag;
  // đúng hình (chỉ khi có mốc Kokoro): khung có tiếng, khớp nếu hình vẽ trùng hình âm vị nào trong ±40 ms
  let ok = 0, tot = 0, rok = 0;
  if (l.ph) for (let k = 0; k < n; k++) { if (env[k] < peak * .1) continue; const want = new Set(); for (let d = -4; d <= 4; d++) { const v = truthAt(l.ph, (k + d) / 100); if (v) want.add(v); } if (!want.size) continue;
    tot++; if (want.has(S[k].shape)) ok++; const rs = LS.stateAt(l.rhCues, k / 100); if (want.has(rs.k >= .5 ? rs.b : rs.a)) rok++; }
  // nháy: một hình hiện liền < MIN_HOLD rồi đổi (đo trên khung vẽ 100 Hz)
  let flick = 0, run = 1; for (let k = 1; k < n; k++) { if (S[k].shape === S[k - 1].shape) { run++; continue; } if (k - run > 0 && run < Math.round(LS.MIN_HOLD * 100) - 1) flick++; run = 1; } // dung sai 1 khung đo (10 ms)
  // chớp mắt: đếm đoạn blink > .5 và độ dài
  let bl = 0; for (let k = 0; k < n; k++) { if (S[k].blink > .5) bl++; else if (bl) { blinkN++; if (bl < 8 || bl > 22) blinkBad++; bl = 0; } } blinkT += l.dur;
  out.rows.push({ id: l.id, src: l.src, lagMs: lag, rhLagMs: l.rhLagMs, visemePct: tot ? Math.round(100 * ok / tot) : null, rhubarbVisemePct: tot ? Math.round(100 * rok / tot) : null, flicker: flick });
}
// video ≤ 20 s: xen kẽ Ama/Carlos, có cả 3 câu từng lệch (ama-0, carlos-5, carlos-7)
let vsec = 0;
for (const id of ['ama-0', 'carlos-5', 'ama-1', 'carlos-7', 'ama-2', 'carlos-6']) {
  const i = lines.findIndex(x => x.id === id), l = lines[i]; if (!l || vsec + l.dur + 0.3 > 19.5) continue; vsec += l.dur + 0.3;
  const M = machineOf(l, i, rms100(`${QA}/${l.id}.wav`)), n = Math.ceil((l.dur + 0.3) * FPS);
  out.lines.push({ id, who: l.who, text: l.text, wav: `${QA}/${id}.wav`, frames: Array.from({ length: n }, (_, k) => { const s = M.at(k / FPS); return [LF.svg(l.who, s, 'f'), +s.tilt.toFixed(2), +s.nod.toFixed(1)]; }) });
}
const R = out.rows, vp = R.map(r => r.visemePct).filter(x => x != null);
out.summary = { lagMaxAbsMs: Math.max(...R.map(r => Math.abs(r.lagMs))), visemePctMin: vp.length ? Math.min(...vp) : null, visemePctMean: vp.length ? Math.round(vp.reduce((a, b) => a + b, 0) / vp.length) : null,
  rhubarbVisemePctMean: vp.length ? Math.round(R.map(r => r.rhubarbVisemePct).reduce((a, b) => a + b, 0) / vp.length) : null, flicker: R.reduce((a, r) => a + r.flicker, 0),
  blinksPerMin: Math.round(60 * blinkN / blinkT), blinkBadDur: blinkBad, videoSec: +vsec.toFixed(1) };
const s = out.summary;
out.gates = { av_lag_le_45ms: s.lagMaxAbsMs <= 45, viseme_ge_80pct: s.visemePctMin == null || s.visemePctMin >= 80, no_flicker: s.flicker === 0, blink_6_30_per_min: s.blinksPerMin >= 6 && s.blinksPerMin <= 30 && s.blinkBadDur === 0 };
fs.writeFileSync(`${QA}/drawn.json`, JSON.stringify(out)); const { lines: _, ...m } = out; fs.writeFileSync(`${QA}/drawn-metrics.json`, JSON.stringify(m, null, 1));
console.log(['## Mặt vẽ – điểm chất lượng', '', '| gate | ok |', '|---|---|', ...Object.entries(out.gates).map(([k, v]) => `| ${k} | ${v ? '✅' : '❌'} |`), '', '```', JSON.stringify(s, null, 1), '```', '',
  '| line | mốc | lệch ms (Rhubarb) | đúng hình % (Rhubarb) | nháy |', '|---|---|---|---|---|', ...R.map(r => `| ${r.id} | ${r.src} | ${r.lagMs} (${r.rhLagMs}) | ${r.visemePct} (${r.rhubarbVisemePct}) | ${r.flicker} |`)].join('\n'));
if (!Object.values(out.gates).every(Boolean)) process.exitCode = 1;
