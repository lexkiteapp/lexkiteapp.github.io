// 🎙️ Lõi chấm phát âm scripts/pron/gop.mjs (P0): logit CTC tổng hợp → căn chỉnh + GOP-AF + hiệu chỉnh.
// Ca: nói đúng (≥ 80) · thay 1 âm (âm đó ≤ 40, best = âm thay) · xoá âm · chèn âm thừa · im lặng · T quá ngắn · âm lạ ·
// decodeGreedy · fitCalib · đo thời gian (T=50, L=8 ≤ 50 ms). Chạy: node scripts/test/pron-gop.mjs
import { ARPA39, decodeGreedy, score, fitCalib, calibrate, CALIB, pcc } from '../pron/gop.mjs';

let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
// vocab kiểu mô hình thật: blank ở 0, vài nhãn null/lạ, có biến thể trọng âm
const vocab = ['<pad>', null, '|', ...ARPA39.map(p => p.toLowerCase()), 'AH0', 'SPN'];
const blankId = 0, V = vocab.length;
const id = p => vocab.indexOf(p.toLowerCase());
// Mỗi âm: `hold` khung đỉnh 0.9 + `gap` khung blank; nền rải đều phần còn lại. Có thể chèn khung "mơ hồ" giữa 2 âm.
function synth(phones, { hold = 2, gap = 1, lead = 2, tail = 2, peak = 0.9, frames } = {}) {
  const rows = [];
  const row = (k, pk = peak) => { const r = new Float32Array(V).fill(Math.log((1 - pk) / (V - 1))); r[k] = Math.log(pk); return r; };
  for (let i = 0; i < lead; i++) rows.push(row(blankId));
  for (const p of phones) { for (let i = 0; i < hold; i++) rows.push(row(id(p))); for (let i = 0; i < gap; i++) rows.push(row(blankId)); }
  for (let i = 0; i < tail; i++) rows.push(row(blankId));
  const T = frames ?? rows.length, logp = new Float32Array(T * V);
  for (let t = 0; t < T; t++) logp.set(rows[Math.min(t, rows.length - 1)], t * V);
  return { logp, T, V, vocab, blankId };
}
const run = (produced, expected, o) => score({ ...synth(produced, o), expected });

ok(ARPA39.length === 39 && new Set(ARPA39).size === 39, 'ARPA39 = 39 âm khác nhau');

// 1) nói đúng
const cat = ['K', 'AE', 'T'];
let r = run(cat, cat);
ok(r.ok && r.phones.every(p => p.score >= 80), `đúng: mọi âm ≥ 80 (${r.phones.map(p => p.score.toFixed(0))})`);
ok(r.wordScore >= 80 && r.per === 0, `đúng: wordScore ${r.wordScore.toFixed(1)} ≥ 80, PER 0`);
ok(r.phones.every((p, i, a) => p.start >= 0 && p.end >= p.start && (i === 0 || p.start > a[i - 1].end)), 'đúng: start/end tăng dần, không chồng');
ok(r.phones[0].start === 2 && r.phones[0].end === 3, `đúng: K ở khung 2–3 (${r.phones[0].start}-${r.phones[0].end})`);
const think = ['TH', 'IH', 'NG', 'K'];
r = run(think, think);
ok(r.phones.every(p => p.score >= 80), 'đúng (think): mọi âm ≥ 80');

// 2) thay âm: "think" nói thành "sink" (TH→S), "cat" thành "ket" (AE→EH)
r = run(['S', 'IH', 'NG', 'K'], think);
ok(r.phones[0].score <= 40, `thay TH→S: TH ≤ 40 (${r.phones[0].score.toFixed(1)})`);
ok(r.phones[0].best === 'S' && r.phones[0].afBest === 'S', `thay TH→S: best = S (${r.phones[0].best}/${r.phones[0].afBest})`);
ok(r.phones.slice(1).every(p => p.score >= 80), 'thay TH→S: các âm còn lại ≥ 80');
ok(r.per > 0 && Math.abs(r.per - 0.25) < 1e-9, `thay: PER = 1/4 (${r.per})`);
r = run(['K', 'EH', 'T'], cat);
ok(r.phones[1].score <= 40 && r.phones[1].best === 'EH', `thay AE→EH: AE ≤ 40, best EH (${r.phones[1].score.toFixed(1)} ${r.phones[1].best})`);
ok(r.phones[0].score >= 80 && r.phones[2].score >= 80, 'thay AE→EH: K, T vẫn ≥ 80');

// 3) xoá âm cuối (lỗi hay gặp của người Việt): "cat" → "ca"
r = run(['K', 'AE'], cat);
ok(r.ok && r.phones[2].score <= 40, `xoá T: T ≤ 40 (${r.phones[2].score.toFixed(1)}, afBest ${r.phones[2].afBest})`);
ok(r.phones[2].afBest === '-', 'xoá T: đối thủ thắng = xoá âm');
ok(r.phones[0].score >= 80 && r.phones[1].score >= 80, 'xoá T: K, AE ≥ 80');
// xoá âm giữa
r = run(['TH', 'IH', 'K'], think);
ok(r.phones[2].score <= 40 && r.phones[0].score >= 80, `xoá NG giữa: NG ≤ 40 (${r.phones[2].score.toFixed(1)})`);

// 4) chèn âm thừa: "cat" → "k-a-s-t" – âm mong đợi vẫn được chấm cao, PER > 0
r = run(['K', 'AE', 'S', 'T'], cat);
ok(r.ok && r.phones.every(p => p.score >= 60), `chèn S: âm mong đợi vẫn ≥ 60 (${r.phones.map(p => p.score.toFixed(0))})`);
ok(r.per > 0 && r.decoded.join(' ') === 'K AE S T', `chèn S: decode ${r.decoded.join(' ')}, PER ${r.per.toFixed(2)}`);
// thêm schwa cuối (kiểu "cat-uh")
r = run(['K', 'AE', 'T', 'AH'], cat);
ok(r.phones.every(p => p.score >= 60), 'chèn AH cuối: âm mong đợi ≥ 60');

// 5) im lặng / rỗng
const sil = synth([], { lead: 30, tail: 0 });
r = score({ ...sil, expected: cat });
ok(r.phones.every(p => p.score <= 20) && r.wordScore <= 20, `im lặng: điểm thấp (${r.phones.map(p => p.score.toFixed(0))})`);
ok(r.decoded.length === 0 && r.per === 1, 'im lặng: decode rỗng, PER 1');
r = score({ logp: new Float32Array(0), T: 0, V, vocab, blankId, expected: cat });
ok(!r.ok && r.reason === 'empty' && r.phones.length === 3 && r.wordScore === 0, 'T = 0: không lỗi, điểm 0');
r = score({ ...synth(cat), expected: [] });
ok(r.phones.length === 0 && r.wordScore === 0, 'expected rỗng: không lỗi');

// 6) T ngắn hơn chuỗi mong đợi
r = score({ ...synth(['K'], { lead: 0, tail: 0, gap: 0, hold: 2 }), expected: think });
ok(!r.ok && r.reason === 'too-short' && r.phones.length === 4 && r.phones.every(p => p.score === 0 && p.start >= 0 && p.end <= 1), 'T=2 < L=4: điểm thấp, start/end hợp lệ');
// âm lặp cần blank chen giữa: "K K" với T=2 không có đường hợp lệ
r = score({ ...synth(['K'], { lead: 0, tail: 0, gap: 0, hold: 2 }), expected: ['K', 'K'] });
ok(!r.ok && r.phones.every(p => p.score === 0), 'âm lặp không đủ khung: không lỗi');

// 7) âm lạ / nhãn trọng âm / NaN / -Inf
r = run(cat, ['k', 'AE1', 'XX', 't']);
ok(r.ok && r.phones.length === 4 && r.phones[2].unknown && r.phones[2].score === null, 'âm lạ XX: score null, unknown');
ok([0, 1, 3].every(i => r.phones[i].score >= 80), 'âm lạ: các âm khác vẫn chấm (nhãn thường + trọng âm chuẩn hoá)');
const bad = synth(cat); bad.logp[5 * V + 7] = NaN; bad.logp[6 * V + 9] = -Infinity;
r = score({ ...bad, expected: cat });
ok(r.ok && r.phones.every(p => Number.isFinite(p.score)), 'NaN/-Inf trong logit: điểm hữu hạn');

// 8) decodeGreedy: gộp lặp, blank tách âm lặp, bỏ nhãn null/'|'/'SPN'
const g = synth(['K', 'K', 'AE', 'T']);
ok(decodeGreedy(g).join(' ') === 'K K AE T', 'greedy: blank giữa 2 K giữ 2 âm');
const junk = synth(['K'], { lead: 0, tail: 0 });
const lj = new Float32Array(3 * V).fill(-10); lj[0 * V + 1] = 0; lj[1 * V + 2] = 0; lj[2 * V + vocab.indexOf('SPN')] = 0;
ok(decodeGreedy({ logp: lj, T: 3, V, vocab, blankId }).length === 0 && junk.T > 0, 'greedy: bỏ null/|/SPN');
const st = new Float32Array(2 * V).fill(-10); st[vocab.indexOf('AH0')] = 0; st[V + id('AH')] = 0;
ok(decodeGreedy({ logp: st, T: 2, V, vocab, blankId }).join(' ') === 'AH AH', 'greedy: AH0 → AH');

// 9) hiệu chỉnh: đơn điệu + fitCalib khôi phục tham số
ok(calibrate(-5) < calibrate(0) && calibrate(0) < calibrate(5) && calibrate(1e9) <= 100 && calibrate(-1e9) >= 0, 'calibrate đơn điệu, trong 0–100');
const truth = { a: 0.6, b: -0.8 }, pairs = [];
for (let x = -10; x <= 10; x += 0.25) pairs.push([x, 100 / (1 + Math.exp(-(truth.a * x + truth.b)))]);
const fit = fitCalib(pairs);
ok(Math.abs(fit.a - truth.a) < 0.02 && Math.abs(fit.b - truth.b) < 0.02 && fit.n === pairs.length, `fitCalib khôi phục a,b (${fit.a.toFixed(3)}, ${fit.b.toFixed(3)})`);
const sep = fitCalib([[-3, 0], [-2, 0], [2, 100], [3, 100], [-1, 50], [1, 50]]);
ok(Number.isFinite(sep.a) && sep.a > 0, 'fitCalib dữ liệu gần tách: hữu hạn, a > 0');
ok(fitCalib([]).a === CALIB.a, 'fitCalib rỗng → CALIB');
r = score({ ...synth(['S', 'IH', 'NG', 'K']), expected: think }, { calib: { ...CALIB, feature: 'gop' } });
ok(r.phones[0].score < r.phones[1].score, 'feature gop theo đoạn cũng phân biệt âm sai');
ok(Math.abs(pcc([1, 2, 3], [2, 4, 6]) - 1) < 1e-12, 'pcc');

// 10) đo thời gian: T=50, L=8
const word = ['S', 'T', 'R', 'EH', 'NG', 'K', 'TH', 'S'];
const bench = synth(word, { hold: 2, gap: 1, lead: 13, tail: 13, frames: 50 });
for (let i = 0; i < 3; i++) score({ ...bench, expected: word });
const N = 20, t0 = performance.now();
for (let i = 0; i < N; i++) r = score({ ...bench, expected: word });
const ms = (performance.now() - t0) / N;
ok(bench.T === 50 && ms <= 50, `thời gian T=50 L=8: ${ms.toFixed(2)} ms ≤ 50`);
ok(r.ok && r.phones.every(p => p.score >= 80), 'bench: chuỗi đúng ≥ 80');
// câu dài (T=500, L=40) dùng tập đối thủ rút gọn – vẫn nhanh
const long = Array.from({ length: 40 }, (_, i) => ARPA39[(i * 7) % 39]);
const lb = synth(long, { hold: 3, gap: 2, lead: 150, tail: 150, frames: 500 });
const t1 = performance.now(); r = score({ ...lb, expected: long }); const msL = performance.now() - t1;
ok(r.ok && r.phones.every(p => p.score >= 80) && msL < 1500, `câu dài T=500 L=40: ${msL.toFixed(0)} ms, mọi âm ≥ 80`);

console.log(`${fails ? '✗' : '✓'} pron-gop: ${n - fails}/${n} (T=50 L=8: ${ms.toFixed(2)} ms/lần)`);
process.exit(fails ? 1 : 0);
