// Người dùng LUÔN được ưu tiên quota AI (điều phối 23/11, sau ai-golden đỏ 18:44Z: 85 khoá Gemini + 109 khoá Groq cùng 429 khi job nền content-factory/explain chạy chồng).
// Hai máy gác chung cho MỌI việc nền dùng ai-pool (docs/AI-CHAIN.md §Quota nền):
//   1) TRẦN NGÀY: việc nền cộng lại ≤ 60 % hạn mức ngày của mỗi nhà cung cấp (Gemini ≈ 20 lượt × 85 khoá, Groq ≈ 1.000 × 109) – 40 % còn lại để dành cho /api/ai.
//      Mỗi việc khai est.gemini_calls / est.groq_calls trong infra/jobs.json (test scripts/test/ai-share.mjs cộng lại); ai-pool dừng dùng nhà cung cấp đó khi lượt chạy chạm số đã khai
//      (hết Gemini → chuỗi rơi sang Groq, không cắt nội dung).
//   2) CẦU DAO 429: > 20 % lượt gọi bị 429 trong 10 phút (≥ 20 lượt) → việc nền NGỪNG gọi nhà cung cấp đó (và các tuyến cùng khoá: lexai/gc-*) 30 phút; không còn tuyến → bỏ qua trung tính,
//      lượt cron sau làm lại.
import fs from 'node:fs';

export const BG_SHARE = 0.6;
export const PER_KEY_DAY = { gem: 20, groq: 1000 };      // docs/QUOTAS.md §AI người dùng
export const KEYS = { gem: 85, groq: 109 };               // chủ nạp 30/10 (GEMINI_POOL/GROQ_POOL)
export const dayCap = p => PER_KEY_DAY[p] * KEYS[p];
export const bgBudget = p => Math.floor(dayCap(p) * BG_SHARE);
export const EST_KEY = { gem: 'gemini_calls', groq: 'groq_calls' };
export const DEFAULT_RUN_CAP = { gem: 50, groq: 2000 };   // việc chưa khai est → trần thấp
/** Việc nền dùng ai-pool = khai tài nguyên gemini hoặc cf_pool (chuỗi soạn/chấm bắt đầu bằng gem → groq). */
export const usesPool = j => (j.resources || []).some(r => r === 'gemini' || r === 'cf_pool');
/** Hàm thuần: số lượt/lượt chạy việc j có thể gọi nhà cung cấp p (est khai, hoặc mặc định thấp cho việc dùng pool). */
export const perRun = (j, p) => { const e = (j.est || {})[EST_KEY[p]]; return e != null ? +e : usesPool(j) ? DEFAULT_RUN_CAP[p] : 0; };
/** Hàm thuần: tổng lượt/ngày các việc nền đã khai cho nhà cung cấp p (mỗi việc × số lần chạy/ngày – runsPerDay(j) lấy từ cron). */
export function declaredPerDay(reg, p, runsPerDay) {
  let sum = 0; const rows = [];
  for (const j of reg.jobs) { const n = perRun(j, p); if (!n) continue; const v = n * runsPerDay(j); sum += v; rows.push([j.id, v]); }
  return { sum, rows };
}
/** Hàm thuần: trần lượt gọi cho MỘT lượt chạy của workflow (đọc est trong sổ); không có → mặc định thấp. */
export function runCap(reg, wfRef, p) {
  const wf = String(wfRef || '').split('@')[0].split('/').pop(), j = (reg.jobs || []).find(x => x.workflow === wf), e = j && (j.est || {})[EST_KEY[p]];
  return e != null ? +e : DEFAULT_RUN_CAP[p];
}
export function loadReg(file = 'infra/jobs.json') { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { jobs: [] }; } }

export const WINDOW_MS = 10 * 60e3, TRIP_RATE = 0.2, MIN_SAMPLES = 20, BACKOFF_MS = 30 * 60e3;
/** Cầu dao 429: record(true|false = bị 429) · tripped() → ms còn phải lùi (0 = chạy tiếp). Thuần theo `now`. */
export function createBreaker({ now = Date.now, windowMs = WINDOW_MS, rate = TRIP_RATE, min = MIN_SAMPLES, backoff = BACKOFF_MS } = {}) {
  let ev = [], until = 0;
  return {
    record(is429) {
      const t = now(); ev.push([t, !!is429]); ev = ev.filter(([x]) => t - x <= windowMs);
      if (ev.length >= min && ev.filter(([, b]) => b).length / ev.length > rate) { until = t + backoff; ev = []; }
    },
    tripped() { const d = until - now(); return d > 0 ? d : 0; },
  };
}
