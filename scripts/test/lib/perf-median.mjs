// Số đo THỜI GIAN trên runner CI ồn (khung rớt, task dài, layout): khi 1 lượt vượt ngưỡng → đo thêm, chấm theo TRUNG VỊ từng chỉ số
// (cùng cách route-vitals/mobile-qa). Ngưỡng KHÔNG đổi; khựng thật lặp lại ở đa số lượt vẫn đỏ. Số lượt chẵn → lấy phần tử TRÊN (bảo thủ).
// Gốc 10/11 (#985): scroll-perf desktop/dark roleplay 1 lượt "task 349 ms" (0 ms JS = runner bị cướp CPU; 6 lượt khác 0 task dài) đỏ PR
// không đụng roleplay – lượt đo lại cũ chỉ được giữ khi rớt khung ÍT hơn, task dài không xét. Test: scripts/test/perf-median.mjs.
export const RUNS = 3;
export const median = a => { const s = a.map(Number).filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
// runs: kết quả đo cùng 1 màn; keys: chỉ số cấp gốc; traceKeys: chỉ số trong .trace. Trả bản sao lượt đầu với chỉ số = trung vị + .runs (vết từng lượt)
export function medianRuns(runs, keys, traceKeys = []) {
  const ok = runs.filter(x => x && !x.crash);
  if (ok.length < 2) return runs[0];   // không đủ lượt hợp lệ → chấm lượt đầu như cũ (không bao giờ xanh nhờ lượt hỏng)
  const r = { ...ok[0], trace: { ...(ok[0].trace || {}) }, runs: ok.map(x => Object.fromEntries([...keys.map(k => [k, x[k]]), ...traceKeys.map(k => [k, (x.trace || {})[k]])])) };
  for (const k of keys) r[k] = median(ok.map(x => x[k] ?? 0));
  for (const k of traceKeys) r.trace[k] = median(ok.map(x => (x.trace || {})[k] ?? 0));
  return r;
}
