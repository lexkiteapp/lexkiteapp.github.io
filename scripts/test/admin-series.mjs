// Test logic biểu đồ "14 ngày qua" (web/js/admin-series.js) – thuần, không DOM/mạng. Ca thật 2/11: lượt xem ~1.000/ngày, khách ~40/ngày
// → chung một trục thì đường khách nằm sát 0 (owner tưởng mất dữ liệu). Kiểm: mỗi chuỗi một thang, điểm hôm nay = số trực tiếp, bộ đệm qua nửa đêm.
import { createRequire } from 'module';
const { niceMax, seriesRows } = createRequire(import.meta.url)('../../web/js/admin-series.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.error('  ✗ ' + m); } };
const D = i => '2026-10-' + String(20 + i).padStart(2, '0');

// 1) niceMax: mốc 1/2/5 × 10^k, không nhỏ hơn giá trị, 0/âm/NaN → 1
ok([[0, 1], [-3, 1], [NaN, 1], [1, 1], [3, 5], [43, 50], [110, 200], [1110, 2000], [500, 500], [5001, 10000]].every(([v, m]) => niceMax(v) === m), 'niceMax mốc tròn ≥ giá trị');

// 2) Ca owner: khách có thang riêng → đỉnh khách cao ~86% khung thay vì ~2% khi dùng chung thang lượt xem
{
  const views = [120, 60, 70, 180, 190, 160, 140, 520, 430, 610, 1110, 887, 534, 689], vis = [7, 3, 15, 12, 21, 23, 33, 31, 42, 43, 43, 41, 30, 38];
  const o = seriesRows({ series: views.map((v, i) => ({ day: D(i), views: v, visitors: vis[i] })) });
  ok(o.maxV === 2000 && o.maxU === 50, `thang: lượt xem 2000, khách 50 – ${o.maxV}/${o.maxU}`);
  ok(43 / o.maxU > 0.8 && 43 / o.maxV < 0.03, 'đỉnh khách cao trên thang riêng (trên thang chung chỉ ~2% → trông như 0)');
  ok(o.rows.every(r => !r.today), 'không có l.day → không đánh dấu hôm nay');
}
// 3) Điểm hôm nay của chuỗi đệm (10 phút) thấp hơn số trực tiếp → lấy số trực tiếp; không bao giờ giảm
{
  const series = [{ day: D(0), views: 9, visitors: 3 }, { day: D(1), views: 0, visitors: 0 }];
  const o = seriesRows({ day: D(1), today: { views: 1, visitors: 1 }, series });
  ok(o.rows[1].views === 1 && o.rows[1].visitors === 1 && o.rows[1].today, 'hôm nay 0/0 (đệm) → 1/1 (trực tiếp), đánh dấu today');
  const p = seriesRows({ day: D(1), today: { views: 0, visitors: 0 }, series: [{ day: D(1), views: 5, visitors: 2 }] });
  ok(p.rows[0].views === 5 && p.rows[0].visitors === 2, 'số trực tiếp nhỏ hơn đệm → giữ số đệm');
  ok(series[1].views === 0, 'không sửa mảng gốc');
}
// 4) Bộ đệm tính trước nửa đêm: chuỗi kết thúc hôm qua → trượt 1 ngày, thêm hôm nay, vẫn 14 điểm
{
  const series = Array.from({ length: 14 }, (_, i) => ({ day: D(i), views: 10, visitors: 2 }));
  const o = seriesRows({ day: D(14), today: { views: 4, visitors: 3 }, series });
  ok(o.rows.length === 14 && o.rows[0].day === D(1) && o.rows[13].day === D(14) && o.rows[13].views === 4 && o.rows[13].today, 'qua nửa đêm: cửa sổ trượt, hôm nay = số trực tiếp');
}
// 5) Rỗng / số bẩn → không NaN
{
  const z = seriesRows({}); ok(z.rows.length === 0 && z.maxV === 1 && z.maxU === 1, 'không có chuỗi: rỗng, thang 1');
  const b = seriesRows({ series: [{ day: D(0), views: '7', visitors: null }, { day: D(1), views: -2, visitors: 'x' }] });
  ok(b.rows[0].views === 7 && b.rows[0].visitors === 0 && b.rows[1].views === 0 && b.rows[1].visitors === 0, 'chuỗi/số âm/null → số ≥ 0');
}
console.log(fails ? `admin-series: ${fails} lỗi / ${passes} đạt` : `✓ admin-series: ${passes} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
