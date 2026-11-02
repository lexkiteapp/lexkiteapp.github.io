// Biểu đồ "14 ngày qua" (Phân tích trực tiếp): số liệu → hai thang. Thuần, không DOM – test: scripts/test/admin-series.mjs.
// - Lượt xem (~1.000/ngày) và khách (~40/ngày) khác nhau ~25 lần → chung một trục thì đường khách nằm sát 0 như mất dữ liệu.
//   Mỗi chuỗi có thang riêng: lượt xem trục trái, khách trục phải.
// - Điểm hôm nay lấy từ l.today (đếm trực tiếp) khi chuỗi 14 ngày (đệm 10 phút) còn thấp hơn – hai thẻ không lệch nhau.
(function (root) {
  // Mốc tròn ≥ v: 1, 2, 5 × 10^k (trục có nhãn 0 / ½ / max dễ đọc); v ≤ 0 → 1
  function niceMax(v) {
    v = +v || 0; if (v <= 1) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function seriesRows(l) {
    l = l || {};
    const rows = (l.series || []).map(r => ({ day: r.day, views: Math.max(0, +r.views || 0), visitors: Math.max(0, +r.visitors || 0) }));
    const t = l.today || {};
    // Bộ đệm 14 ngày tính trước nửa đêm (giờ VN) → chưa có dòng hôm nay: trượt cửa sổ, thêm hôm nay từ số trực tiếp
    if (l.day && rows.length && rows[rows.length - 1].day < l.day) { rows.shift(); rows.push({ day: l.day, views: 0, visitors: 0 }); }
    const last = rows[rows.length - 1];
    if (last && l.day && last.day === l.day) {
      last.views = Math.max(last.views, +t.views || 0); last.visitors = Math.max(last.visitors, +t.visitors || 0); last.today = true;
    }
    return { rows, maxV: niceMax(Math.max(0, ...rows.map(r => r.views))), maxU: niceMax(Math.max(0, ...rows.map(r => r.visitors))) };
  }
  const api = { niceMax, seriesRows };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.AdminSeries = api;
})(typeof window !== 'undefined' ? window : globalThis);
