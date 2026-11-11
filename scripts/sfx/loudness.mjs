// 🔊 Đo độ to theo ITU-R BS.1770-4 (LUFS, kênh đơn) – thuần JS, không phụ thuộc. Dùng cho gói SFX (scripts/sfx/build.mjs) + test sfx-loudness.mjs.
// K-weighting = kệ cao (+4 dB từ ~1.7 kHz) + lọc thông cao RLB (~38 Hz); hệ số tính theo tần số mẫu bất kỳ (công thức De Man/pyloudnorm, kiểm bằng sin 1 kHz = −3.01 LUFS).
// Tích hợp: khối 400 ms chồng 75 %, cổng tuyệt đối −70 LUFS, cổng tương đối −10 LU. Âm UI ngắn hơn 400 ms (tap 70 ms) → một khối = cả clip
// (cùng cách các công cụ đo "momentary" xử lý clip ngắn), nếu không thì tap sẽ "không đo được" và lọt khỏi chuẩn.
export const TARGET = -16, TOL = 1, PEAK_MAX = -1; // LUFS, ±LU, dBFS

function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function kWeight(x, sr) { // dạng De Man (tan) – tái tạo đúng hệ số ITU ở 48 kHz, đúng cho 44.1 kHz
  { // kệ cao
    const G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533, K = Math.tan((Math.PI * fc) / sr);
    const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K;
    x = biquad(x, [Vh + (Vb * K) / Q + K * K, 2 * (K * K - Vh), Vh - (Vb * K) / Q + K * K, a0, 2 * (K * K - 1), 1 - K / Q + K * K]);
  }
  { // thông cao RLB
    const Q = 0.5003270373238773, fc = 38.13547087602444, K = Math.tan((Math.PI * fc) / sr), a0 = 1 + K / Q + K * K;
    x = biquad(x, [a0, -2 * a0, a0, a0, 2 * (K * K - 1), 1 - K / Q + K * K]);
  }
  return x;
}
const lufs = ms => -0.691 + 10 * Math.log10(ms);

/** Độ to tích hợp (LUFS) của tín hiệu đơn kênh (mảng số thực −1..1). */
export function loudness(x, sr = 44100) {
  const y = kWeight(x, sr), N = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const blocks = [];
  if (y.length < N) { let s = 0; for (const v of y) s += v * v; blocks.push(s / Math.max(1, y.length)); }
  else for (let i = 0; i + N <= y.length; i += hop) { let s = 0; for (let j = i; j < i + N; j++) s += y[j] * y[j]; blocks.push(s / N); }
  const abs = blocks.filter(b => b > 0 && lufs(b) > -70);
  if (!abs.length) return -Infinity;
  const rel = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter(b => lufs(b) > rel);
  return lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}
/** Đỉnh mẫu (dBFS). */
export function peakDb(x) { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p ? 20 * Math.log10(p) : -Infinity; }
/** Chỉnh khuếch đại tại chỗ để đạt TARGET LUFS; trả về { lufs, peak } sau khi chỉnh. Ném lỗi nếu đỉnh vượt PEAK_MAX (phải sửa công thức âm, không cắt). */
export function normalize(x, sr = 44100, target = TARGET) {
  const g = 10 ** ((target - loudness(x, sr)) / 20);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  const r = { lufs: loudness(x, sr), peak: peakDb(x) };
  if (r.peak > PEAK_MAX) throw new Error(`đỉnh ${r.peak.toFixed(2)} dBFS > ${PEAK_MAX} sau khi chuẩn ${target} LUFS – giảm độ nhọn của âm, không cắt đỉnh`);
  return r;
}
