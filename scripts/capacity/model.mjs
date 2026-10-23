// Mô hình hạn mức Cloudflare (docs/CAPACITY.md) – thuần, không mạng. Dùng chung cho sim.mjs, test và /api/capacity (ngưỡng cảnh báo).
// Số hạn mức theo tài liệu Cloudflare (D1 / Workers / KV / R2 pricing) – kiểm lại khi Cloudflare đổi giá.
import { LIMITS } from '../../functions/api/_capacity.js';
export { LIMITS, ALERT, daysUntil, evaluate, alertText, fmtVN } from '../../functions/api/_capacity.js';
// Hỗn hợp DAU giả định (chỉnh khi có số thật từ Quản trị › Phân tích): khách chưa đăng nhập, học nhẹ, học thường, học nhiều, giáo viên
export const MIX = { anon: 0.30, light: 0.35, typical: 0.25, heavy: 0.08, teacher: 0.02 };
export const COLOS = 5; // Smart Placement: Functions chạy gần D1 → ít trung tâm dữ liệu
export const isolatesFor = dau => Math.min(500, Math.max(2, Math.ceil(dau / 1000)));

/** Chi phí trung bình 1 DAU theo hỗn hợp → { requests, workers, reads, writes } */
export function perUser(profiles, mix = MIX) {
  const o = { requests: 0, workers: 0, reads: 0, writes: 0 };
  for (const [k, w] of Object.entries(mix)) { const p = profiles[k]; if (!p) continue; for (const x of Object.keys(o)) o[x] += w * (p[x] || 0); }
  return o;
}
/** Chi phí cố định/ngày không theo người dùng: làm mới trạng thái hạn mức mỗi phút + khởi động lạnh (giả định mỗi isolate khởi động lại ~mỗi giờ). */
export function fixed(r, dau) {
  const iso = isolatesFor(dau), units = r.quotaState.readsSecondIsolate > 0 ? iso : Math.min(iso, COLOS);
  const coldReads = Object.values(r.cold || {}).reduce((t, v) => t + v.reads, 0), coldWrites = Object.values(r.cold || {}).reduce((t, v) => t + v.writes, 0);
  return { reads: r.quotaState.readsPerRefresh * 1440 * units + coldReads * iso * 24, writes: coldWrites * iso * 24 };
}
export function project(r, mix = MIX, L = LIMITS) {
  const u = perUser(r.profiles, mix), req = u.requests + u.workers;
  const day = dau => { const f = fixed(r, dau); return { dau, requests: Math.round(req * dau), reads: Math.round(u.reads * dau + f.reads), writes: Math.round(u.writes * dau + f.writes) }; };
  const scale = [1e3, 1e4, 1e5, 1e6].map(dau => {
    const d = day(dau), freeOver = ['requests', 'reads', 'writes'].filter(k => d[k] > L.free[k]);
    const m = k => Math.max(0, d[k] * 30 - L.paid[k] * 30) / 1e6, U = L.paid.usd;
    return { ...d, freeOver, paidUsd: L.paid.base + m('requests') * U.requestsPerM + m('reads') * U.readsPerM + m('writes') * U.writesPerM };
  });
  // trần DAU = (hạn mức − cố định) / chi phí 1 người (lặp 2 lần vì phần cố định phụ thuộc DAU)
  const ceil = (lim, k, per) => { let d = lim / Math.max(per, 1e-9); for (let i = 0; i < 3; i++) d = Math.max(0, (lim - (k === 'requests' ? 0 : fixed(r, d)[k])) / Math.max(per, 1e-9)); return Math.floor(d); };
  const ceilingFree = { requests: ceil(L.free.requests, 'requests', req), reads: ceil(L.free.reads, 'reads', u.reads), writes: ceil(L.free.writes, 'writes', u.writes) };
  const ceilingPaid = { requests: ceil(L.paid.requests, 'requests', req), reads: ceil(L.paid.reads, 'reads', u.reads), writes: ceil(L.paid.writes, 'writes', u.writes) };
  const min = o => Object.entries(o).sort((a, b) => a[1] - b[1])[0][0];
  const storage = r.bytesPerTypicalUser ? { usersPerFreeDb: Math.floor(L.free.dbBytes / r.bytesPerTypicalUser), usersPerPaidDb: Math.floor(L.paid.dbBytes / r.bytesPerTypicalUser) } : null;
  return { perUser: { ...u, requestsTotal: req }, scale, ceilingFree, ceilingPaid, bottleneckFree: min(ceilingFree), bottleneckPaid: min(ceilingPaid), storage };
}

