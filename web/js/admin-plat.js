// Thẻ "📱 Nền tảng" (Phân tích trực tiếp): số liệu → dòng hiển thị. Thuần, không DOM – test: scripts/test/admin-plat.mjs.
// - Một thang chung: thanh = % thiết bị 30 ngày (mẫu số = số thiết bị KHÁC NHAU 30 ngày, không phải max của từng cột).
// - Dòng 0 → không có thanh; dòng > 0 → thanh tối thiểu (CSS min-width) để 1 thiết bị không thành "chấm lỗi".
// - Dòng Tổng = thiết bị khác nhau từ server (dev30/devToday); thiếu (bộ đệm cũ) → cộng các dòng và đánh dấu approx.
// - 30 ngày luôn ≥ hôm nay (cửa sổ 30 ngày gồm cả hôm nay; phần 30 ngày đệm 10 phút nên có thể chậm hơn số hôm nay).
(function (root) {
  const ORDER = ['web', 'pwa', 'ext', 'ios', 'android'];
  const map = rows => Object.fromEntries((rows || []).map(r => [r.k, Math.max(0, +r.n || 0)]));
  const pctText = p => p <= 0 ? '0%' : p < 1 ? '<1%' : p > 99 && p < 100 ? '>99%' : Math.round(p) + '%';
  function platRows(l) {
    l = l || {};
    const pt = map(l.platsToday), p30 = map(l.plats30);
    const keys = [...ORDER, ...Object.keys({ ...pt, ...p30 }).filter(k => !ORDER.includes(k))];
    const rows = keys.map(k => { const today = pt[k] || 0; return { k, today, d30: Math.max(p30[k] || 0, today) }; });
    const sumT = rows.reduce((a, r) => a + r.today, 0), sum30 = rows.reduce((a, r) => a + r.d30, 0);
    const dT = l.devToday && l.devToday.v != null ? +l.devToday.v || 0 : null, d30 = l.dev30 && l.dev30.v != null ? +l.dev30.v || 0 : null;
    // Tổng thiết bị: không nhỏ hơn dòng lớn nhất (mỗi dòng là tập con), không lớn hơn tổng các dòng
    const maxT = Math.max(0, ...rows.map(r => r.today)), max30 = Math.max(0, ...rows.map(r => r.d30));
    const totT = dT == null ? sumT : Math.min(Math.max(dT, maxT), sumT);
    const tot30 = Math.max(d30 == null ? sum30 : Math.min(Math.max(d30, max30), sum30), totT);
    const multi = l.dev30 && l.dev30.multi != null ? Math.max(0, +l.dev30.multi || 0) : Math.max(0, sum30 - tot30);
    for (const r of rows) { r.share = tot30 ? r.d30 / tot30 * 100 : 0; r.w = r.d30 ? Math.min(100, r.share) : 0; r.pct = pctText(r.share); }
    return { rows, total: { today: totT, d30: tot30 }, multi, approx: dT == null || d30 == null };
  }
  const api = { platRows, pctText, ORDER };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.AdminPlat = api;
})(typeof window !== 'undefined' ? window : globalThis);
