// Khớp miệng câu bài học (không có mốc CI, chỉ có file tiếng): LipSync.fromEnv (căn âm vị theo độ lớn tiếng thật) và con trỏ live
// so với mốc Kokoro (đúng thời điểm âm vị) của 256 câu Call + Truyện trong web/js/call/cues.js. Cổng chặt, không nới:
//  - lệch lúc mở miệng sau im |lệch| p95 ≤ 80 ms (fromEnv và live) · môi mím M/B/P đúng lúc (±60 ms) ≥ 78 % · đúng hình ≥ 50 % (khung gộp) · im ↔ nói/mím ≥ 92 %
//  - fromEnv phải hơn live rõ ở M/B/P (live chỉ ~25 %). Chạy: node scripts/test/lipsync-lesson.mjs [--learn = in lại bảng ELV]
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const LS = createRequire(import.meta.url)('../../web/js/call/lipsync.js');
const c = { self: {} }; c.self = c; vm.createContext(c);
for (const f of ['web/js/listen/kvoice.js', 'web/js/call/calls.js', 'web/js/call/calls-exam.js', 'web/cpack/lesson/stories.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
const V = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')).people, T = new Map(); // khóa → câu (cùng cách lập như scripts/lipsync/call_cues.mjs)
const add = (who, x) => { if (!x) return; who = V[who] ? who : 'ama'; const text = String(x).trim(); T.set(c.KVoice.lineKey(V[who].voice.app, text), text); };
for (const k of c.CALLS || []) { const n = k.nodes ? Object.values(k.nodes) : (k.turns || []); for (const x of [...n.flatMap(n => [n.m, n.re, ...(n.br || []).map(b => b[1])]), k.end, "Let's keep our chat friendly and on topic!"]) add(k.who, x); }
for (const st of c.LESSON_STORIES || []) for (const l of st.lines) add(l.who, l.en);
const g = {}; new Function('self', fs.readFileSync('web/js/call/cues.js', 'utf8'))(g);
LS.setDict(fs.readFileSync('content/lexicon/cmudict-subset.txt', 'utf8')); // app nạp từ điển nhỏ của cues.js + luật chữ; bộ đầy đủ = trường hợp tốt nhất của chữ → đo đúng phần căn thời gian
const at = (q, t) => { for (const x of q) if (x.start <= t && t < x.end) return x.value; return 'X'; };
const onsets = q => q.filter((x, i) => i && q[i - 1].value === 'X' && x.value !== 'X').map(x => x.start);
function measure(make) {
  const lag = [], R = { n: 0, mbp: [0, 0], shape: [0, 0], quiet: [0, 0] }, LV = {};
  for (const [k, e] of Object.entries(g.LK_CUES.k)) { if (!e || !T.has(k)) continue; const { dur, cues, env } = LS.unpack(e); if (!env) continue; R.n++;
    const pk = Math.max(...env), got = make(T.get(k), dur, env, pk);
    for (const t of onsets(cues)) { let d = 1e9; for (const u of onsets(got)) if (Math.abs(u - t) < Math.abs(d)) d = u - t; if (Math.abs(d) < 0.5) lag.push(Math.abs(d) * 1000); }
    for (const x of cues) if (x.value === 'A') { R.mbp[1]++; const m = (x.start + x.end) / 2; if (got.some(y => y.value === 'A' && y.start <= m + 0.06 && y.end >= m - 0.06)) R.mbp[0]++; }
    for (let i = 0; i < env.length; i++) { const t = i / 100, x = at(cues, t), y = at(got, t); (LV[x] ||= []).push(Math.sqrt(env[i] / pk));
      R.quiet[1]++; if ((x === 'X') === (y === 'X') && (x === 'A') === (y === 'A')) R.quiet[0]++; if (x !== 'X') { R.shape[1]++; if (x === y) R.shape[0]++; } }
  }
  lag.sort((a, b) => a - b); const pc = ([a, b]) => Math.round(a / b * 1000) / 10;
  return { n: R.n, opens: lag.length, p50: Math.round(lag[Math.floor(lag.length * 0.5)]), p95: Math.round(lag[Math.floor(lag.length * 0.95)]), mbp: pc(R.mbp), shape: pc(R.shape), quiet: pc(R.quiet), LV };
}
const env = measure((text, dur, env) => LS.fromEnv(text, dur, env));
const live = measure((text, dur, env, pk) => { const L = LS.live(text, { dur }), vd = LS.vad(); // con trỏ nhân quả 60 fps, RMS kiểu AnalyserNode (đỉnh ~0,25)
  for (let t = 0; t < dur; t += 1 / 60) L.tick(t, vd(env[Math.min(env.length - 1, Math.floor(t * 100))] / pk * 0.25), 1 / 60); return L.cues; });
if (process.argv.includes('--learn')) console.log(JSON.stringify(Object.fromEntries(Object.entries(env.LV).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)]))));
const fmt = (k, r) => `${k}: ${r.n} câu · mở ${r.opens} · lệch p50 ${r.p50} ms p95 ${r.p95} ms · môi mím M/B/P ${r.mbp} % · đúng hình ${r.shape} % · im/nói ${r.quiet} %`;
console.log(fmt('fromEnv', env)); console.log(fmt('live', live));
assert.ok(env.n >= 200, 'cần ≥ 200 câu có mốc Kokoro để đo');
assert.ok(env.p95 <= 80, `fromEnv lệch mở miệng p95 ${env.p95} ms > 80`); assert.ok(live.p95 <= 80, `live lệch mở miệng p95 ${live.p95} ms > 80`);
assert.ok(env.mbp >= 78, `fromEnv môi mím M/B/P ${env.mbp} % < 78`); assert.ok(env.shape >= 50 && env.shape >= live.shape + 20, `fromEnv đúng hình ${env.shape} % < 50 (live ${live.shape} %)`); assert.ok(env.quiet >= 92, `fromEnv im/nói ${env.quiet} % < 92`);
assert.ok(env.mbp >= live.mbp + 30, 'fromEnv phải hơn live rõ ở M/B/P');
// envOf: AudioBuffer giả 48 kHz, 0,3 s im + 0,4 s sin → 70 khung, im = 0, có tiếng ≈ 0,707 × biên độ
const sr = 48000, x = new Float32Array(sr * 0.7); for (let i = sr * 0.3; i < x.length; i++) x[i] = 0.5 * Math.sin(i / sr * 2 * Math.PI * 220);
const ev = LS.envOf({ sampleRate: sr, getChannelData: () => x }); assert.equal(ev.length, 70); assert.equal(ev[10], 0); assert.ok(Math.abs(ev[50] - 0.5 / Math.SQRT2) < 0.01);
// câu im hoàn toàn / chữ rỗng → không vỡ, về fromText (miệng đứng yên lúc im)
assert.ok(LS.fromEnv('', 1, new Array(100).fill(0)).every(q => q.value === 'X'));
assert.ok(LS.fromEnv('Hi.', 0.5, new Array(50).fill(0)).length >= 1);
console.log('✓ lipsync-lesson');
