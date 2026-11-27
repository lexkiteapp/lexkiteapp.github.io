// Nâng sàn từ TRUNG VỊ các lần đo gần nhất, không từ một mẫu may (26/11, #2328): perf Lighthouse dao động 94–99; sàn 97 = mẫu 99 ngày 3/11 − noise 2 → đỏ ~40 % lượt.
// `seen[trục]` = tối đa KEEP số đo gần nhất (lưu trong *.budget.json). Trục có noise: sàn mới = trung vị(seen) − noise, chỉ khi đã có ≥ MIN_SAMPLES mẫu; trục không noise: như cũ (đo tất định).
export const KEEP = 5, MIN_SAMPLES = 3;
export const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/** Ghi mẫu mới vào seen (thuần: trả bản mới) và trả điểm dùng để nâng sàn (null = chưa đủ mẫu để nâng trục nhiễu). */
export function sample(seen, id, value, noisy) {
  const list = [...((seen && seen[id]) || []), value].slice(-KEEP), out = { ...(seen || {}), [id]: list };
  return { seen: out, basis: !noisy ? value : list.length >= MIN_SAMPLES ? median(list) : null };
}
