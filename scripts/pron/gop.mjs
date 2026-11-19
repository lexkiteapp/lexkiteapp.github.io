// Lexkite – lõi chấm phát âm theo âm vị (P0). JS thuần, không phụ thuộc: chạy trong Node (CI) và Web Worker (trình duyệt).
// Vào: logit CTC đã log-softmax [T×V] của mô hình nhận dạng âm vị + chuỗi ARPAbet mong đợi.
// Cách chấm (docs/research/pron-phoneme-plan.md §3, mục "P0 – gop.mjs"):
//   1) Gộp cột vocab → 39 âm ARPAbet + blank (log-sum-exp các biến thể trọng âm AA0/AA1…).
//   2) Căn chỉnh cưỡng bức CTC (Viterbi trên chuỗi xen blank, O(T·L)) → start/end mỗi âm, `best` = âm đối thủ mạnh nhất trong đoạn.
//   3) GOP-AF (không cần căn chỉnh, điểm chính): LPR_i = log P(chuỗi đúng) − max_q log P(chuỗi thay âm i bằng q | xoá âm i),
//      mỗi giả thuyết = 1 lượt forward CTC (log-space, log-sum-exp ổn định số).
//   4) Hiệu chỉnh đơn điệu 0–100: sigmoid(a·LPR + b) với tham số `CALIB` (harness học lại trên speechocean762 train bằng `fitCalib`).
export const ARPA39 = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'B', 'CH', 'D', 'DH', 'EH', 'ER', 'EY', 'F', 'G', 'HH', 'IH', 'IY', 'JH', 'K',
  'L', 'M', 'N', 'NG', 'OW', 'OY', 'P', 'R', 'S', 'SH', 'T', 'TH', 'UH', 'UW', 'V', 'W', 'Y', 'Z', 'ZH'];
const K = ARPA39.length, BLANK = K; // chỉ số nội bộ: 0..38 = âm, 39 = blank
const PIDX = new Map(ARPA39.map((p, i) => [p, i]));
const NEG = -Infinity;
// Tham số hiệu chỉnh mặc định (tiên nghiệm: LPR = 0 → 73 vàng; harness ghi đè bằng kết quả fitCalib). clip chặn LPR cực trị.
export const CALIB = { a: 1, b: 1, clip: 30, feature: 'gopAF' };

/** Chuẩn hoá nhãn: 'ah0' → 'AH'; trả chỉ số 0..38 hoặc -1 nếu không phải âm ARPA39. */
export function phoneIndex(label) {
  if (label == null) return -1;
  const s = String(label).trim().toUpperCase().replace(/[0-2]$/, '');
  const i = PIDX.get(s);
  return i === undefined ? -1 : i;
}
const lae = (a, b) => a === NEG ? b : b === NEG ? a : a > b ? a + Math.log1p(Math.exp(b - a)) : b + Math.log1p(Math.exp(a - b));
const lae3 = (a, b, c) => {
  const m = a > b ? (a > c ? a : c) : (b > c ? b : c);
  return m === NEG ? NEG : m + Math.log(Math.exp(a - m) + Math.exp(b - m) + Math.exp(c - m));
};

/** CTC greedy: argmax từng khung → gộp lặp → bỏ blank → nhãn ARPA39 (bỏ nhãn null/lạ). */
export function decodeGreedy({ logp, T, V, vocab, blankId }) {
  const out = [];
  let prev = -1;
  for (let t = 0; t < T; t++) {
    let bi = 0, bv = NEG;
    for (let v = 0, o = t * V; v < V; v++) if (logp[o + v] > bv) { bv = logp[o + v]; bi = v; }
    if (bi !== prev && bi !== blankId) {
      const pi = phoneIndex(vocab[bi]);
      if (pi >= 0) out.push(ARPA39[pi]);
    }
    prev = bi;
  }
  return out;
}

/** Gộp [T×V] → [T×(K+1)] log-prob theo âm (log-sum-exp các id cùng âm); cột không có trong vocab = -Inf. */
function collapse(logp, T, V, vocab, blankId) {
  const X = new Float64Array(T * (K + 1)).fill(NEG);
  const map = new Int16Array(V).fill(-1);
  for (let v = 0; v < V; v++) map[v] = v === blankId ? BLANK : phoneIndex(vocab[v]);
  const has = new Uint8Array(K + 1);
  for (let v = 0; v < V; v++) if (map[v] >= 0) has[map[v]] = 1;
  for (let t = 0; t < T; t++) {
    const o = t * V, r = t * (K + 1);
    for (let v = 0; v < V; v++) {
      const k = map[v];
      if (k < 0) continue;
      const x = logp[o + v];
      if (Number.isFinite(x) || x === NEG) X[r + k] = lae(X[r + k], x); // NaN bị bỏ
    }
  }
  return { X, has };
}

/** log P(seq | X) bằng forward CTC (2 hàng Float64Array, O(T·(2L+1))). seq: Int32Array chỉ số âm. */
function forward(X, T, seq, L, A, B) {
  const S = 2 * L + 1, W = K + 1;
  if (T === 0) return L === 0 ? 0 : NEG;
  let a = A, b = B;
  for (let s = 0; s < S; s++) a[s] = NEG;
  a[0] = X[BLANK];
  if (L > 0) a[1] = X[seq[0]];
  for (let t = 1; t < T; t++) {
    const r = t * W;
    for (let s = 0; s < S; s++) {
      const odd = s & 1, lab = odd ? seq[(s - 1) >> 1] : BLANK;
      const e = X[r + lab];
      if (e === NEG) { b[s] = NEG; continue; }
      let v;
      if (s === 0) v = a[0];
      else if (odd && s >= 3 && seq[(s - 3) >> 1] !== lab) v = lae3(a[s], a[s - 1], a[s - 2]);
      else v = lae(a[s], a[s - 1]);
      b[s] = v === NEG ? NEG : v + e;
    }
    const tmp = a; a = b; b = tmp;
  }
  return L === 0 ? a[0] : lae(a[S - 1], a[S - 2]);
}

/** Viterbi CTC: trả {ok, logp, path: Int32Array T (trạng thái mở rộng)}. */
function viterbi(X, T, seq, L) {
  const S = 2 * L + 1, W = K + 1;
  if (T === 0 || L === 0) return { ok: false, logp: NEG, path: new Int32Array(T) };
  let a = new Float64Array(S).fill(NEG), b = new Float64Array(S);
  const bp = new Uint8Array(T * S);
  a[0] = X[BLANK]; a[1] = X[seq[0]];
  for (let t = 1; t < T; t++) {
    const r = t * W, o = t * S;
    for (let s = 0; s < S; s++) {
      const odd = s & 1, lab = odd ? seq[(s - 1) >> 1] : BLANK;
      let v = a[s], d = 0;
      if (s >= 1 && a[s - 1] > v) { v = a[s - 1]; d = 1; }
      if (odd && s >= 3 && seq[(s - 3) >> 1] !== lab && a[s - 2] > v) { v = a[s - 2]; d = 2; }
      const e = X[r + lab];
      b[s] = v === NEG || e === NEG ? NEG : v + e;
      bp[o + s] = d;
    }
    const tmp = a; a = b; b = tmp;
  }
  let s = a[S - 1] >= a[S - 2] ? S - 1 : S - 2;
  const best = a[s];
  if (best === NEG) return { ok: false, logp: NEG, path: new Int32Array(T) };
  const path = new Int32Array(T);
  for (let t = T - 1; t >= 0; t--) { path[t] = s; if (t > 0) s -= bp[t * S + s]; }
  return { ok: true, logp: best, path };
}

function levenshtein(a, b) {
  const n = a.length, m = b.length;
  let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    const t = prev; prev = cur; cur = t;
  }
  return prev[m];
}

const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
/** GOP thô → 0–100 (đơn điệu tăng theo x khi a > 0). */
export function calibrate(x, calib = CALIB) {
  if (x == null || Number.isNaN(x)) return 0;
  const c = calib.clip ?? 30, v = Math.max(-c, Math.min(c, x));
  return 100 * sigmoid(calib.a * v + calib.b);
}

/**
 * Học {a,b} cho calibrate(): hồi quy logistic nhãn mềm (y 0–100 → y/100; speechocean762 nhãn âm 0–2 → ×50), Newton/IRLS + L2 nhỏ.
 * pairs: [[x, y]] hoặc [{x, y}]. Trả { a, b, clip, feature, n, loss } (loss = cross-entropy trung bình).
 */
export function fitCalib(pairs, { clip = CALIB.clip, l2 = 1e-4, iters = 50, feature = CALIB.feature } = {}) {
  const xs = [], ys = [];
  for (const p of pairs || []) {
    const x = Array.isArray(p) ? p[0] : p?.x, y = Array.isArray(p) ? p[1] : p?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    xs.push(Math.max(-clip, Math.min(clip, x))); ys.push(Math.max(0, Math.min(1, y / 100)));
  }
  const n = xs.length;
  if (n < 2) return { ...CALIB, n };
  let a = 0, b = 0;
  for (let it = 0; it < iters; it++) {
    let ga = l2 * a, gb = 0, haa = l2, hab = 0, hbb = 1e-9;
    for (let i = 0; i < n; i++) {
      const p = sigmoid(a * xs[i] + b), r = p - ys[i], w = Math.max(p * (1 - p), 1e-9);
      ga += r * xs[i]; gb += r; haa += w * xs[i] * xs[i]; hab += w * xs[i]; hbb += w;
    }
    const det = haa * hbb - hab * hab;
    if (!(det > 1e-12)) break;
    let da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det;
    const step = Math.max(Math.abs(da), Math.abs(db));
    if (step > 5) { da *= 5 / step; db *= 5 / step; } // chặn bước khi dữ liệu gần tách tuyệt đối
    a -= da; b -= db;
    if (step < 1e-8) break;
  }
  let loss = 0;
  for (let i = 0; i < n; i++) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(a * xs[i] + b)));
    loss -= ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p);
  }
  return { a, b, clip, feature, n, loss: loss / n };
}

/** Hệ số tương quan Pearson (tiện cho harness đo PCC cấp âm). */
export function pcc(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/**
 * Chấm 1 từ/câu.
 * opts: calib (mặc định CALIB), competitors (số âm thay thế thử cho GOP-AF; mặc định cả 38 khi L·T ≤ 4000, ngược lại 10 âm mạnh nhất trong đoạn).
 * Trả { phones:[{p, score, start, end, best, gop, gopAF, lpp, afBest, unknown?}], wordScore, per, decoded, logp, ok, reason? }.
 *   score null + unknown:true khi âm mong đợi không thuộc ARPA39/vocab (không tính vào wordScore). afBest '-' = xoá âm thắng.
 */
export function score({ logp, T, V, vocab, blankId, expected }, opts = {}) {
  const calib = opts.calib || CALIB;
  T = Math.max(0, T | 0);
  const exp = (expected || []).map(p => ({ raw: p, k: phoneIndex(p) }));
  const decoded = T > 0 && V > 0 ? decodeGreedy({ logp, T, V, vocab, blankId }) : [];
  const { X, has } = T > 0 && V > 0 ? collapse(logp, T, V, vocab, blankId) : { X: new Float64Array(0), has: new Uint8Array(K + 1) };
  const known = exp.filter(e => e.k >= 0 && has[e.k]);
  const L = known.length;
  const seq = Int32Array.from(known.map(e => e.k));
  const per = exp.length ? levenshtein(decoded, known.map(e => ARPA39[e.k])) / Math.max(1, L) : (decoded.length ? 1 : 0);
  const mk = (e, extra) => e.k >= 0 && has[e.k]
    ? { p: ARPA39[e.k], score: 0, start: 0, end: Math.max(0, T - 1), best: null, gop: null, gopAF: null, lpp: null, afBest: null, ...extra }
    : { p: String(e.raw ?? ''), score: null, start: -1, end: -1, best: null, gop: null, gopAF: null, lpp: null, afBest: null, unknown: true };
  if (L === 0 || T === 0) return { phones: exp.map(e => mk(e)), wordScore: 0, per, decoded, logp: NEG, ok: false, reason: T === 0 ? 'empty' : 'no-known-phones' };

  const vit = viterbi(X, T, seq, L);
  if (!vit.ok) {
    // T quá ngắn (cần ≥ L khung + khung blank giữa âm lặp) hoặc âm có xác suất 0: điểm thấp, chia đều thời gian, không lỗi.
    let j = 0;
    const phones = exp.map(e => {
      if (!(e.k >= 0 && has[e.k])) return mk(e);
      const st = Math.min(T - 1, Math.floor(j * T / L)), en = Math.max(st, Math.min(T - 1, Math.floor((j + 1) * T / L) - 1));
      j++;
      return mk(e, { start: st, end: en });
    });
    return { phones, wordScore: 0, per, decoded, logp: NEG, ok: false, reason: 'too-short' };
  }

  // Đoạn của từng âm: khung ở trạng thái nhãn 2j+1; vùng đối thủ = từ sau âm trước tới trước âm sau (gồm blank xen giữa).
  const start = new Int32Array(L).fill(-1), end = new Int32Array(L).fill(-1);
  for (let t = 0; t < T; t++) {
    const s = vit.path[t];
    if (s & 1) { const j = (s - 1) >> 1; if (start[j] < 0) start[j] = t; end[j] = t; }
  }
  const W = K + 1;
  const segInfo = [];
  for (let j = 0; j < L; j++) {
    const lo = j > 0 ? end[j - 1] + 1 : 0, hi = j < L - 1 ? start[j + 1] - 1 : T - 1;
    const p = seq[j];
    // LPP + GOP theo đoạn (trung bình trên khung nhãn): log p(âm) − max âm khác
    let lpp = 0, gseg = 0, nf = 0;
    for (let t = start[j]; t <= end[j]; t++) {
      const r = t * W; let mo = NEG;
      for (let k = 0; k < K; k++) if (k !== p && X[r + k] > mo) mo = X[r + k];
      lpp += X[r + p]; gseg += X[r + p] - (mo === NEG ? X[r + p] - 30 : mo); nf++;
    }
    // âm đối thủ mạnh nhất trong vùng: max theo khung của log p(q)
    const peak = new Float64Array(K).fill(NEG);
    for (let t = lo; t <= hi; t++) { const r = t * W; for (let k = 0; k < K; k++) if (X[r + k] > peak[k]) peak[k] = X[r + k]; }
    let best = -1;
    for (let k = 0; k < K; k++) if (k !== p && has[k] && (best < 0 || peak[k] > peak[best])) best = k;
    segInfo.push({ lpp: lpp / nf, gseg: gseg / nf, best, peak });
  }

  // GOP-AF: 1 forward cho chuỗi đúng + mỗi âm: (số đối thủ) forward thay âm + 1 forward xoá âm.
  const A = new Float64Array(2 * L + 1), B = new Float64Array(2 * L + 1);
  const full = forward(X, T, seq, L, A, B);
  const nComp = opts.competitors ?? (L * T <= 4000 ? K - 1 : 10);
  const alt = new Int32Array(L), del = new Int32Array(Math.max(0, L - 1));
  const af = [];
  for (let j = 0; j < L; j++) {
    const p = seq[j];
    let cands;
    if (nComp >= K - 1) { cands = []; for (let k = 0; k < K; k++) if (k !== p && has[k]) cands.push(k); }
    else {
      const pk = segInfo[j].peak;
      cands = [];
      for (let k = 0; k < K; k++) if (k !== p && has[k]) cands.push(k);
      cands.sort((x, y) => pk[y] - pk[x]); cands = cands.slice(0, nComp);
    }
    alt.set(seq);
    let mx = NEG, arg = null;
    for (const q of cands) {
      alt[j] = q;
      const v = forward(X, T, alt, L, A, B);
      if (v > mx) { mx = v; arg = ARPA39[q]; }
    }
    if (L > 1) {
      for (let i = 0, o = 0; i < L; i++) if (i !== j) del[o++] = seq[i];
      const v = forward(X, T, del, L - 1, A, B);
      if (v > mx) { mx = v; arg = '-'; }
    }
    // L = 1 và không có đối thủ hữu hạn → so với "không có âm" (toàn blank)
    if (L === 1) {
      let sil = 0; for (let t = 0; t < T; t++) sil += X[t * W + BLANK];
      if (sil > mx) { mx = sil; arg = '-'; }
    }
    af.push({ gopAF: mx === NEG ? calib.clip ?? 30 : full - mx, afBest: arg });
  }

  let j = 0, ws = 0, wd = 0;
  const phones = exp.map(e => {
    if (!(e.k >= 0 && has[e.k])) return mk(e);
    const i = j++, g = af[i], si = segInfo[i];
    const x = calib.feature === 'lpp' ? si.lpp : calib.feature === 'gop' ? si.gseg : g.gopAF;
    const sc = calibrate(x, calib);
    const dur = end[i] - start[i] + 1;
    ws += sc * dur; wd += dur;
    return { p: ARPA39[e.k], score: sc, start: start[i], end: end[i], best: si.best >= 0 ? ARPA39[si.best] : null,
      gop: si.gseg, gopAF: g.gopAF, lpp: si.lpp, afBest: g.afBest };
  });
  return { phones, wordScore: wd ? ws / wd : 0, per, decoded, logp: full, ok: true };
}
