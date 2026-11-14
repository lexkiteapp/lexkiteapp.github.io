/* Giám sát chuỗi AI người dùng (docs/AI-CHAIN.md §Giám sát) – không phải route, không import gì.
 * Mỗi lượt /api/ai ghi 1 dòng đếm vào D1 ai_quota: id 'm:<tuyến>' (gemini | groq | wai | busy), day = khung 10 phút 'YYYY-MM-DDTHH:M'
 * (cùng bảng/khóa chính với bộ đếm '*' sẵn có → không thêm bảng, 1 câu UPSERT trong batch đã có).
 * Cảnh báo 'ai:weak' (Quản trị → Khóa API + thư ≤ 1/24 h qua syncAlerts): > 10 % lượt trong 60 phút qua rơi về model yếu (wai) hoặc báo bận. */
export const ROUTES = ['gemini', 'groq', 'wai', 'busy'];
export const WEAK = new Set(['wai', 'busy']);
export const WEAK_MAX = 0.1, WEAK_MIN_N = 5; // ít hơn 5 lượt/giờ → không kết luận (tránh báo động vì 1 lượt)
const BUCKET = 600e3;
/** khung 10 phút: '2026-11-03T10:2' */
export const bucket = (t = Date.now()) => new Date(Math.floor(t / BUCKET) * BUCKET).toISOString().slice(0, 15);
export const buckets = (ms, now = Date.now()) => { const out = []; for (let t = now - ms + BUCKET; t <= now + 1; t += BUCKET) out.push(bucket(t)); return [...new Set(out)]; };
const UP = 'INSERT INTO ai_quota (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1';
/** câu lệnh đếm 1 lượt của tuyến route (gộp vào batch của endpoint) */
export const mixStmt = (db, route, now = Date.now()) => db.prepare(UP).bind('m:' + (ROUTES.includes(route) ? route : 'busy'), bucket(now));

/** Đếm theo tuyến trong ms vừa qua → { gemini, groq, wai, busy, total, weak, share } */
export async function aiMix(db, ms = 3600e3, now = Date.now()) {
  const mix = { gemini: 0, groq: 0, wai: 0, busy: 0 };
  if (db) {
    const B = buckets(ms, now);
    try {
      const r = await db.prepare(`SELECT id, SUM(n) AS n FROM ai_quota WHERE id IN ('m:gemini', 'm:groq', 'm:wai', 'm:busy') AND day IN (${B.map(() => '?').join(', ')}) GROUP BY id`).bind(...B).all();
      for (const x of (r && r.results) || []) mix[x.id.slice(2)] = +x.n || 0;
    } catch (e) { /* bảng chưa có → 0 */ }
  }
  const total = ROUTES.reduce((s, k) => s + mix[k], 0), weak = mix.wai + mix.busy;
  return { ...mix, total, weak, share: total ? weak / total : 0 };
}
/** Cảnh báo từ tỉ lệ 1 giờ (thuần – test được) */
export function mixAlerts(mix) {
  if (!mix || mix.total < WEAK_MIN_N || mix.share <= WEAK_MAX) return [];
  const pct = Math.round(mix.share * 100);
  return [{ kind: 'ai:weak', level: mix.share > 0.5 ? 'crit' : 'warn', provider: 'ai', pct,
    msg: `AI người dùng: ${pct}% lượt trong 1 giờ qua rơi về model yếu/báo bận (${mix.weak}/${mix.total}: Gemini ${mix.gemini} · Groq ${mix.groq} · Llama ${mix.wai} · bận ${mix.busy}) – kiểm khóa Gemini/Groq ở Quản trị → Khóa API.` }];
}
/** dọn lười dòng đếm cũ (> 3 ngày) */
export const pruneStmt = (db, now = Date.now()) => db.prepare("DELETE FROM ai_quota WHERE id IN ('m:gemini', 'm:groq', 'm:wai', 'm:busy') AND day < ?").bind(bucket(now - 3 * 86400e3));
