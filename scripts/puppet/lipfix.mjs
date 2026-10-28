// 🎭 Hậu xử lý khẩu hình sau Rhubarb (dùng chung cho sample.mjs và kiểm cục bộ) – docs/LESSON-ENGINE.md §4b.
//  closures  – Rhubarb hay bỏ sót mím môi đầu từ: ta BIẾT chữ + mốc từ → ép A (m: từ đầu tiếng mũi; b/p: khép trước lúc bật hơi) và G (f/v)
//  silences  – Rhubarb giữ miệng mở qua khoảng ngừng ngắn trong câu (dấu phẩy): đoạn âm thật < -45 dB ≥ 100 ms → miệng về X
//  jaw       – độ mở hàm theo năng lượng dải nguyên âm 200–1000 Hz (âm tiết nhấn mở rộng hơn) → tl.jaw { hz, g[] }, puppet.js nhân vào độ mở viseme
const norm = w => String(w).toLowerCase().replace(/[^a-z']/g, '');
const stateAt = (c, x) => { let v = 'X'; for (const [t0, s] of c) if (t0 <= x) v = s; else break; return v; };
const splice = (cues, a, b, v) => { const after = stateAt(cues, b); return cues.filter(c => c[0] < a || c[0] > b).concat([[+a.toFixed(3), v], [+b.toFixed(3), after]]).sort((x, y) => x[0] - y[0]); };
const dedupe = c => c.filter((x, k) => !k || x[1] !== c[k - 1][1]);

export function closures(cues, words) {
  let out = cues.slice();
  for (const w of words) {
    const ch = norm(w.w)[0], [a, b, v] = ch === 'm' ? [w.start - 0.02, w.start + 0.07, 'A'] : ch === 'b' || ch === 'p' ? [w.start - 0.05, w.start + 0.02, 'A'] : ch === 'f' || ch === 'v' ? [w.start - 0.03, w.start + 0.06, 'G'] : [];
    if (v) out = splice(out, a, b, v);
  }
  return dedupe(out);
}
/** db100: mức dB toàn dải mỗi 10 ms (tính từ đầu dòng thời gian) */
export function silences(cues, db100) {
  let out = cues.slice();
  for (let i = 0; i < db100.length;) {
    if (db100[i] < -45) { let j = i; while (j < db100.length && db100[j] < -45) j++; const a = i / 100 + 0.02, b = j / 100 - 0.05; if (j - i >= 10 && b > a && stateAt(out, a) !== 'X') out = splice(out, a, b, 'X'); i = j; } else i++;
  }
  return dedupe(out);
}
/** vow100: biên độ RMS dải nguyên âm mỗi 10 ms → hệ số hàm 0,5–1 (chuẩn hóa theo p90 lúc nói, làm mượt 90 ms) */
export function jaw(vow100, db100) {
  const sp = vow100.filter((_, i) => db100[i] > -40).sort((a, b) => a - b), p90 = sp[Math.floor(sp.length * 0.9)] || 1;
  const raw = vow100.map(e => Math.max(0.5, Math.min(1, 0.35 + 0.9 * e / p90))); // chỉ GIẢM độ mở (≤ 1) → không vượt biên độ/độ dốc của viseme
  const g = raw.map((_, i) => { let s = 0, n = 0; for (let k = -4; k <= 4; k++) { const x = raw[i + k]; if (x != null) { s += x; n++; } } return +(s / n).toFixed(3); });
  return { hz: 100, g };
}
