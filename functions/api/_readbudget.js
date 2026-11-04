/* Ngân sách dòng đọc D1 theo route Quản trị (sự cố 03/11/2026: Quản trị › Phân tích quét `sessions` 24–88 lượt/câu → 5,1 M/5 M dòng đọc, cả site suýt mất D1).
 * - meter(db, { stale }): bọc env.DB cho MỘT yêu cầu Quản trị, cộng meta.rows_read của mọi câu (first/all/run/batch).
 *   stale = true → mọi câu ném ShedError TRƯỚC khi chạm D1; admin.js cached() bắt lỗi đó và trả bản đệm cũ (≤ 24 h) kèm _stale, không có → 429 'quota-shed'.
 * - spent(op) / addSpent(op, n): bộ đếm theo ngày UTC (đặt lại cùng lúc hạn mức D1) trong bộ nhớ isolate + Cache API (không tốn dòng D1 nào).
 * - overBudget(sp, op): 'route' khi op vượt ROUTE_DAY, 'admin' khi tổng Quản trị vượt ADMIN_DAY (10 % Free – docs/CAPACITY.md §D4) → chế độ đệm cho op đó tới 00:00 UTC.
 * Thao tác ghi (WRITE trong admin.js) không đi qua ngân sách: chủ luôn sửa/chặn/xóa được. */
import { day } from './_d1guard.js';

export const ADMIN_DAY = 5e5; // tổng Quản trị/ngày (≤ 10 % của 5 M – cùng ngưỡng chuông capacity-src)
// Theo op: sau #543 một lần mở Phân tích ≈ 1,8k dòng, 1 giờ Trực tiếp ≈ 5,8k → 150k = ~80 lần mở hoặc ~1 ngày Trực tiếp liên tục. Op khác 100k.
export const ROUTE_DAY = { default: 1e5, analytics: 1.5e5, live: 1.5e5, overview: 1.5e5, growth: 1e5, users: 1e5 };
export class ShedError extends Error { constructor(why) { super('quota-shed'); this.code = 'quota-shed'; this.why = why; } }
export const isShedError = e => !!(e && e.code === 'quota-shed');

const MEM = { day: '', by: /** @type {Record<string, number>} */ ({}) };
const cacheOf = () => (typeof caches !== 'undefined' && /** @type {any} */ (caches).default) || null;
const keyOf = (d, k) => new Request(`https://budget.lexkite.internal/${d}/${encodeURIComponent(k)}`);
const roll = d => { if (MEM.day !== d) { MEM.day = d; MEM.by = {}; } };
async function readOne(d, k) {
  const c = cacheOf(); let n = 0;
  if (c) { try { const r = await c.match(keyOf(d, k)); if (r) n = +(await r.text()) || 0; } catch (e) { /* đệm hỏng → số isolate */ } }
  return Math.max(n, MEM.by[k] || 0);
}
/** → { op: dòng đã đọc hôm nay của op, total: tổng Quản trị } */
export async function spent(op, now = Date.now()) {
  const d = day(now); roll(d);
  const [a, t] = await Promise.all([readOne(d, 'op:' + op), readOne(d, 'total')]);
  MEM.by['op:' + op] = a; MEM.by.total = t;
  return { op: a, total: t };
}
export async function addSpent(op, n, now = Date.now()) {
  if (!(n > 0)) return;
  const d = day(now); roll(d); const c = cacheOf();
  for (const k of ['op:' + op, 'total']) {
    const v = (await readOne(d, k)) + n; MEM.by[k] = v;
    if (c) { try { await c.put(keyOf(d, k), new Response(String(v), { headers: { 'Cache-Control': 'max-age=90000' } })); } catch (e) { /* bỏ qua */ } }
  }
}
export const routeLimit = op => ROUTE_DAY[op] || ROUTE_DAY.default;
/** → null | 'route' | 'admin' */
export const overBudget = (sp, op) => (sp.op >= routeLimit(op) ? 'route' : sp.total >= ADMIN_DAY ? 'admin' : null);
export const _resetBudget = () => { MEM.day = ''; MEM.by = {}; };

/** Bọc D1 cho 1 yêu cầu: m.reads = tổng meta.rows_read. stale → mọi câu ném ShedError (không chạm D1). */
export function meter(db, opts = {}) {
  const m = { reads: 0, queries: 0 };
  const add = r => { m.queries++; m.reads += +(r && r.meta && r.meta.rows_read) || 0; return r; };
  const gate = () => { if (opts.stale) throw new ShedError(opts.why || 'budget'); };
  const wrap = st => ({
    _s: st,
    bind: (...a) => wrap(st.bind(...a)),
    first: async col => { gate(); const r = add(await st.all()), row = (r.results || [])[0] ?? null; return col ? (row ? row[col] ?? null : null) : row; },
    all: async () => { gate(); return add(await st.all()); },
    run: async () => { gate(); return add(await st.run()); },
    raw: async (o) => { gate(); m.queries++; return st.raw(o); },
  });
  return Object.assign(m, {
    prepare: q => wrap(db.prepare(q)),
    batch: async sts => { gate(); const r = await db.batch(sts.map(x => x._s || x)); for (const x of r || []) add(x); m.queries -= (r || []).length - 1; return r; },
    exec: async q => { gate(); m.queries++; return db.exec(q); },
  });
}
