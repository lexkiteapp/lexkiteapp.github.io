/* Hạn mức Cloudflare + luật cảnh báo nâng gói (thuần, không I/O) – dùng chung: functions/api/capacity.js (cron hằng ngày), scripts/capacity/model.mjs (mô phỏng),
 * scripts/test/capacity.mjs. Tài liệu: docs/CAPACITY.md. Số hạn mức theo tài liệu Cloudflare (D1 / Workers / KV / R2) – kiểm lại khi Cloudflare đổi giá. */
export const LIMITS = {
  free: { requests: 100_000, reads: 5_000_000, writes: 100_000, dbBytes: 500 * 1024 ** 2, accountBytes: 5 * 1024 ** 3 }, // mỗi NGÀY (requests = Workers + Pages Functions chung)
  paid: { // $5/tháng: phần đã gồm theo THÁNG → quy về ngày (/30); vượt tính tiền
    base: 5, requests: 10_000_000 / 30, reads: 25_000_000_000 / 30, writes: 50_000_000 / 30, dbBytes: 10 * 1024 ** 3,
    usd: { requestsPerM: 0.30, readsPerM: 0.001, writesPerM: 1.00, storagePerGBMonth: 0.75 },
  },
  kv: { free: { reads: 100_000, writes: 1_000 } }, r2: { free: { storageGB: 10, classAPerMonth: 1_000_000, classBPerMonth: 10_000_000 } },
};
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
  // Hạn chót X = ngày dự báo chạm 100 % (hết hạn mức → người dùng bị lỗi); đi ngang/không đủ dữ liệu → 7 ngày nữa; đã chạm → ngày mai
  let upgradeBy = null;
  if (hit.length) {
    const full = hit.map(m => { const e = daysUntil(done.map(r => (+r[m.k] || 0) / L[m.k]), 1); return e == null ? 7 : e; });
    const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.max(1, Math.min(...full)));
    upgradeBy = d.toISOString().slice(0, 10);
  }
  const reason = hit.map(m => m.streak >= A.days ? `${m.k} ≥ ${Math.round(A.pct * 100)}% gói Free ${m.streak} ngày liền` : `${m.k} dự báo chạm ${Math.round(A.projectPct * 100)}% sau ${m.eta} ngày`).join('; ');
  return { alert: hit.length > 0, metrics, upgradeBy, reason };
}
export const fmtVN = d => d ? d.split('-').reverse().join('/') : '';
export const alertText = ev => `Nâng gói Cloudflare 5 USD trước ngày ${fmtVN(ev.upgradeBy)}`;
