// Pronunciation-scoring P0 harness: runs ONNX CTC phoneme models over speechocean762 + LibriSpeech samples and reports
// PER, phone-level PCC vs human labels, false-alarm rate on native speech, latency, model size.
//   node scripts/pron/eval.mjs --cand C --dir models/C --data data --quant fp32,q8 --out reports/pron-eval-C.json
import fs from 'node:fs';
import path from 'node:path';
import * as ort from 'onnxruntime-node';
import { score, decodeGreedy } from './gop.mjs';
import { mapVocab, ARPA39 } from './vocab-map.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const cand = arg('cand'), dir = arg('dir'), dataDir = arg('data'), out = arg('out', `reports/pron-eval-${cand}.json`);
const wantQ = arg('quant', 'fp32,q8').split(',');
const meta = JSON.parse(fs.readFileSync(`${dir}/meta.json`, 'utf8'));
const vocabJson = JSON.parse(fs.readFileSync(`${dir}/vocab.json`, 'utf8'));
const pre = JSON.parse(fs.readFileSync(`${dir}/preprocessor_config.json`, 'utf8'));
const items = JSON.parse(fs.readFileSync(`${dataDir}/manifest.json`, 'utf8'));

function readWav(file) { // 16-bit PCM mono 16 kHz
  const b = fs.readFileSync(file); let p = 12, dataOff = -1, n = 0;
  while (p + 8 <= b.length) { const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4); if (id === 'data') { dataOff = p + 8; n = Math.min(sz, b.length - dataOff) >> 1; break; } p += 8 + sz + (sz & 1); }
  if (dataOff < 0) throw new Error('bad wav ' + file);
  const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = b.readInt16LE(dataOff + 2 * i) / 32768;
  if (pre.do_normalize) { let m = 0; for (const v of x) m += v; m /= n; let s = 0; for (const v of x) s += (v - m) ** 2; const sd = Math.sqrt(s / n + 1e-7); for (let i = 0; i < n; i++) x[i] = (x[i] - m) / sd; }
  return x;
}
function logSoftmax(l, T, V) { const o = new Float32Array(T * V); for (let t = 0; t < T; t++) { let mx = -Infinity; for (let v = 0; v < V; v++) mx = Math.max(mx, l[t * V + v]); let s = 0; for (let v = 0; v < V; v++) s += Math.exp(l[t * V + v] - mx); const ls = mx + Math.log(s); for (let v = 0; v < V; v++) o[t * V + v] = l[t * V + v] - ls; } return o; }
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
function pcc(x, y) { const n = x.length; if (n < 3) return null; const mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; }
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const r = (v, d = 4) => v == null ? null : +v.toFixed(d);

const result = { cand, repo: meta.repo, n_so: items.filter(i => i.set === 'so').length, n_ls: items.filter(i => i.set === 'ls').length, quant: {}, notes: [] };
let mapInfo = null;
for (const q of wantQ) {
  const file = meta.variants[q];
  if (!file) { result.notes.push(`${q}: variant not available for ${cand}`); continue; }
  const sess = await ort.InferenceSession.create(path.join(dir, file), { executionProviders: ['cpu'], graphOptimizationLevel: 'all' });
  const inName = sess.inputNames[0], outName = sess.outputNames[0];
  let size = fs.statSync(path.join(dir, file)).size; for (const f of fs.readdirSync(dir)) if (f.endsWith('.onnx_data') && q === 'fp32') size += fs.statSync(path.join(dir, f)).size;
  const run = async (x) => { const t0 = performance.now(); const o = await sess.run({ [inName]: new ort.Tensor('float32', x, [1, x.length]) }); const ms = performance.now() - t0; const [, T, V] = o[outName].dims; return { logp: logSoftmax(o[outName].data, T, V), T, V, ms }; };
  await run(new Float32Array(16000)); // warm-up
  let editSum = 0, refSum = 0, lsPh = 0, lsRed = 0, mism = 0, soPh = 0, soRed = 0, soGoodN = 0, soGoodRed = 0;
  const sc = [], hu = [], lat = [], gopMs = [], lsScoreAll = [], errs = [];
  for (const it of items) {
    let x, o;
    try { x = readWav(`${dataDir}/wav/${it.wav}`); o = await run(x); } catch (e) { errs.push(`${it.wav}: ${e.message}`); continue; }
    mapInfo ??= mapVocab(vocabJson, o.V);
    const { vocab, blankId } = mapInfo;
    lat.push(o.ms / (x.length / 16000));
    const t0 = performance.now();
    let res; try { res = score({ logp: o.logp, T: o.T, V: o.V, vocab, blankId, expected: it.expected }); } catch (e) { errs.push(`score ${it.wav}: ${e.message}`); continue; }
    gopMs.push(performance.now() - t0);
    if (it.set === 'ls') {
      const hyp = decodeGreedy({ logp: o.logp, T: o.T, V: o.V, vocab, blankId }).filter(p => ARPA39.includes(p));
      editSum += lev(hyp, it.expected); refSum += it.expected.length;
    }
    const ph = res.phones || [];
    if (ph.length !== it.expected.length) { mism++; continue; }
    if (it.set === 'ls') { for (const p of ph) { lsPh++; lsScoreAll.push(p.score); if (p.score < 50) lsRed++; } }
    else ph.forEach((p, i) => { sc.push(p.score); hu.push(it.labels[i]); soPh++; if (it.labels[i] >= 1.8) { soGoodN++; if (p.score < 50) soGoodRed++; } if (p.score < 50) soRed++; });
  }
  const good = sc.filter((_, i) => hu[i] >= 1.8), bad = sc.filter((_, i) => hu[i] <= 1);
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  result.quant[q] = {
    size_mb: r(size / 1048576, 1),
    PER_librispeech: r(refSum ? editSum / refSum : null),
    PCC_phone_so762: r(pcc(sc, hu)),
    false_alarm_native_ls: r(lsPh ? lsRed / lsPh : null),
    false_alarm_so_good_phones: r(soGoodN ? soGoodRed / soGoodN : null),
    mean_score_good_vs_bad: [r(mean(good), 1), r(mean(bad), 1)],
    latency_ms_per_audio_s: { p50: r(pct(lat, 0.5), 0), mean: r(mean(lat), 0), p90: r(pct(lat, 0.9), 0) },
    gop_ms_per_utt_mean: r(mean(gopMs), 1),
    counts: { so_phones: soPh, ls_phones: lsPh, length_mismatch_utts: mism, errors: errs.length },
  };
  if (errs.length) result.notes.push(`${q}: ${errs.slice(0, 3).join(' | ')}`);
  console.log(cand, q, JSON.stringify(result.quant[q]));
  await sess.release?.();
}
result.vocab = mapInfo && { mapped: mapInfo.nMapped, unmapped_sample: mapInfo.unmapped.slice(0, 15), unmapped_total: mapInfo.unmapped.length };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 1));
if (!Object.keys(result.quant).length || Object.values(result.quant).every(v => v.PER_librispeech == null || v.PCC_phone_so762 == null)) { console.error('no usable metrics (all zero / null)'); process.exit(1); }
