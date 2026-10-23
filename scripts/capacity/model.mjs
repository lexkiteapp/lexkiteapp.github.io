// Mô hình hạn mức Cloudflare (docs/CAPACITY.md) – thuần, không mạng. Dùng chung cho sim.mjs, test và /api/capacity (ngưỡng cảnh báo).
// Số hạn mức theo tài liệu Cloudflare (D1 / Workers / KV / R2 pricing) – kiểm lại khi Cloudflare đổi giá.
export const LIMITS = {
  free: { requests: 100_000, reads: 5_000_000, writes: 100_000, dbBytes: 500 * 1024 ** 2, accountBytes: 5 * 1024 ** 3 }, // mỗi NGÀY (requests = Workers + Pages Functions chung)
  paid: { // $5/tháng: phần đã gồm theo THÁNG → quy về ngày (/30); vượt tính tiền
    base: 5, requests: 10_000_000 / 30, reads: 25_000_000_000 / 30, writes: 50_000_000 / 30, dbBytes: 10 * 1024 ** 3,
    usd: { requestsPerM: 0.30, readsPerM: 0.001, writesPerM: 1.00, storagePerGBMonth: 0.75 },
  },
  kv: { free: { reads: 100_000, writes: 1_000 } }, r2: { free: { storageGB: 10, classAPerMonth: 1_000_000, classBPerMonth: 10_000_000 } },
};
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

// ---------- Cảnh báo nâng gói (functions/api/capacity.js, daily) ----------
export const ALERT = { pct: 0.6, days: 3, projectPct: 0.8, horizon: 14 };
/** Hồi quy tuyến tính trên n ngày gần nhất → ngày (index tính từ hôm nay) chạm ngưỡng, hoặc null. */
export function daysUntil(series, threshold, n = 14) {
  const s = series.slice(-n); if (s.length < 3) return null;
  const xs = s.map((_, i) => i), mx = xs.reduce((a, b) => a + b) / s.length, my = s.reduce((a, b) => a + b) / s.length;
  let num = 0, den = 0; for (let i = 0; i < s.length; i++) { num += (xs[i] - mx) * (s[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den ? num / den : 0, last = my + slope * (s.length - 1 - mx);
  if (last >= threshold) return 0;
  if (slope <= 0) return null;
  return Math.ceil((threshold - last) / slope);
}
/** rows: [{ day:'YYYY-MM-DD', reads, writes, requests }] tăng dần (ngày đã xong + hôm nay). → { alert, metrics:[{k, pct, streak, eta}], upgradeBy, reason } */
export function evaluate(rows, L = LIMITS.free, A = ALERT, today = new Date().toISOString().slice(0, 10)) {
  const done = rows.filter(r => r.day < today); // ngày đã trọn (hôm nay còn dở – chỉ để hiển thị)
  const metrics = ['writes', 'reads', 'requests'].map(k => {
    const ratio = done.map(r => (+r[k] || 0) / L[k]);
    let streak = 0; for (let i = ratio.length - 1; i >= 0 && ratio[i] >= A.pct; i--) streak++;
    const eta = daysUntil(ratio, A.projectPct);
    return { k, pct: ratio.length ? Math.round(ratio[ratio.length - 1] * 100) : 0, streak, eta };
  });
  const hit = metrics.filter(m => m.streak >= A.days || (m.eta != null && m.eta <= A.horizon));
  let upgradeBy = null;
  if (hit.length) {
    const etas = hit.map(m => m.eta == null ? 0 : m.eta), d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.max(1, Math.min(...etas)));
    upgradeBy = d.toISOString().slice(0, 10);
  }
  const reason = hit.map(m => m.streak >= A.days ? `${m.k} ≥ ${Math.round(A.pct * 100)}% gói Free ${m.streak} ngày liền` : `${m.k} dự báo chạm ${Math.round(A.projectPct * 100)}% sau ${m.eta} ngày`).join('; ');
  return { alert: hit.length > 0, metrics, upgradeBy, reason };
}
export const fmtVN = d => d ? d.split('-').reverse().join('/') : '';
export const alertText = ev => `Nâng gói Cloudflare 5 USD trước ngày ${fmtVN(ev.upgradeBy)}`;
