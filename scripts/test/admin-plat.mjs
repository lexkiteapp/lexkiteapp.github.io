// Test logic thẻ "📱 Nền tảng" (web/js/admin-plat.js) – thuần, không DOM/mạng. Ca thật của owner 1/11: Web 17/209, PWA 0/12, Add-on 1/15, iOS 0/1, Android 2/8.
// Kiểm: 1 thang chung (mẫu số = thiết bị khác nhau 30 ngày), dòng 0 không có thanh, % làm tròn (<1%), Tổng không đếm trùng, 30 ngày ≥ hôm nay, bộ đệm cũ → approx.
import { createRequire } from 'module';
const { platRows, pctText } = createRequire(import.meta.url)('../../web/js/admin-plat.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.error('  ✗ ' + m); } };
const R = o => Object.entries(o).map(([k, n]) => ({ k, n }));
const OWNER = { platsToday: R({ web: 17, android: 2, ext: 1 }), plats30: R({ web: 209, ext: 15, pwa: 12, android: 8, ios: 1 }) };

// 1) Ca owner, server mới: 230 thiết bị khác nhau trong 30 ngày (245 dòng – 15 máy dùng web + PWA)
{
  const o = platRows({ ...OWNER, devToday: { v: 20, multi: 0 }, dev30: { v: 230, multi: 15 } }), by = Object.fromEntries(o.rows.map(r => [r.k, r]));
  ok(o.rows.map(r => r.k).join() === 'web,pwa,ext,ios,android', 'thứ tự cố định Web, PWA, Add-on, iOS, Android – ' + o.rows.map(r => r.k));
  ok(o.total.today === 20 && o.total.d30 === 230 && o.multi === 15 && !o.approx, 'Tổng = thiết bị khác nhau từ server (20 / 230), multi 15');
  ok(Math.abs(by.web.share - 209 / 230 * 100) < 1e-9 && by.web.pct === '91%', 'Web 209/230 = 91% (mẫu số chung, không phải max cột) – ' + by.web.pct);
  ok(by.web.w < 100 && by.ios.w > 0 && by.ios.pct === '<1%', 'thang chung: Web không còn là thanh đầy; iOS 1 → thanh > 0 và "<1%"');
  ok(Math.abs(by.pwa.w / by.web.w - 12 / 209) < 1e-9 && Math.abs(by.android.w / by.ext.w - 8 / 15) < 1e-9, 'tỉ lệ độ dài thanh = tỉ lệ số 30 ngày');
  ok(by.web.today === 17 && by.pwa.today === 0 && by.ios.today === 0, 'cột hôm nay giữ số thật, 0 vẫn là 0');
}
// 2) Dòng 0 → không có thanh; tất cả 0 → Tổng 0, không chia cho 0
{
  const o = platRows({ platsToday: [], plats30: R({ web: 3 }), devToday: { v: 0 }, dev30: { v: 3, multi: 0 } }), by = Object.fromEntries(o.rows.map(r => [r.k, r]));
  ok(by.pwa.w === 0 && by.pwa.pct === '0%' && by.web.w === 100 && by.web.pct === '100%', 'dòng 0: w 0, "0%"; dòng duy nhất: 100%');
  const z = platRows({});
  ok(z.total.d30 === 0 && z.rows.every(r => r.w === 0 && r.share === 0 && r.pct === '0%'), 'không có dữ liệu: mọi dòng 0, không NaN');
}
// 3) Bộ đệm 30 ngày (10 phút) chậm hơn số hôm nay → 30 ngày nâng lên ≥ hôm nay; Tổng 30 ngày ≥ Tổng hôm nay
{
  const o = platRows({ platsToday: R({ web: 5, ios: 2 }), plats30: R({ web: 4 }), devToday: { v: 7 }, dev30: { v: 4, multi: 0 } }), by = Object.fromEntries(o.rows.map(r => [r.k, r]));
  ok(by.web.d30 === 5 && by.ios.d30 === 2 && o.total.d30 === 7, '30 ngày ≥ hôm nay ở từng dòng và ở Tổng – ' + JSON.stringify([by.web.d30, by.ios.d30, o.total.d30]));
}
// 4) Server cũ (chưa có devToday/dev30) → Tổng tạm = cộng dòng, approx
{
  const o = platRows(OWNER);
  ok(o.approx && o.total.d30 === 245 && o.total.today === 20 && o.multi === 0, 'thiếu số thiết bị khác nhau: Tổng = cộng dòng, approx = true');
  ok(Math.abs(o.rows.reduce((a, r) => a + r.share, 0) - 100) < 1e-9, 'approx: các % cộng đúng 100');
}
// 5) Số server vô lý được kẹp: Tổng ≥ dòng lớn nhất, ≤ cộng các dòng; nền tảng lạ vẫn hiện (cuối danh sách)
{
  const o = platRows({ platsToday: R({ web: 9 }), plats30: R({ web: 9, app: 2 }), devToday: { v: 3 }, dev30: { v: 999, multi: 0 } });
  ok(o.total.today === 9 && o.total.d30 === 11, 'kẹp Tổng vào [max dòng, cộng dòng] – ' + JSON.stringify(o.total));
  ok(o.rows[o.rows.length - 1].k === 'app', 'nền tảng cũ "app" vẫn có dòng');
}
ok(pctText(0) === '0%' && pctText(0.4) === '<1%' && pctText(0.5) === '<1%' && pctText(1.4) === '1%' && pctText(99.6) === '>99%' && pctText(100) === '100%', 'pctText: 0% · <1% · 1% · >99% · 100%');

console.log(fails ? `admin-plat: ${fails} lỗi / ${passes} đạt` : `✓ admin-plat: ${passes} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
