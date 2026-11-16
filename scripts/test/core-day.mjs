// Ngày địa phương trong lõi (web/js/core.js): endOfToday/startOfToday/todayKey/Stats.streak đúng ở mọi múi giờ, qua nửa đêm và ngày ĐỔI GIỜ MÙA HÈ.
// Lỗi cũ: endOfToday = đầu ngày + 24 h → ngày dài 25 h (lùi giờ) kết thúc 22:59 (thẻ đến hạn 23:00–23:59 bị coi "chưa đến hạn"), ngày dài 23 h (tiến giờ) kết thúc 00:59 hôm sau
// (thẻ đến hạn 00:00–00:59 ngày mai bị coi "đến hạn hôm nay"). Chạy lõi thật trong vm, đồng hồ giả + TZ thật; không cần trình duyệt.
import fs from 'node:fs';
import vm from 'node:vm';

let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const SRC = fs.readFileSync('web/js/core.js', 'utf8');
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function core(NOW) {
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
  const mem = {};
  const sb = { Date: FD, chrome: { storage: { local: { get: async k => (typeof k === 'string' ? (k in mem ? { [k]: mem[k] } : {}) : { ...mem }), set: async o => { Object.assign(mem, o); }, remove: async () => {} } } }, console, setTimeout, clearTimeout };
  sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(SRC, sb);
  return sb.Core;
}
const at = (TZ, y, m, d, h, mi = 0) => { process.env.TZ = TZ; return new Date(y, m - 1, d, h, mi).getTime(); };

for (const [TZ, label, y, m, d] of [['America/New_York', 'NY lùi giờ (ngày 25 h)', 2026, 11, 1], ['America/New_York', 'NY tiến giờ (ngày 23 h)', 2026, 3, 8], ['Europe/Berlin', 'Berlin lùi giờ', 2026, 10, 25], ['Australia/Sydney', 'Sydney tiến giờ', 2026, 10, 4], ['Asia/Ho_Chi_Minh', 'VN (không đổi giờ)', 2026, 11, 1]]) {
  const now = at(TZ, y, m, d, 10, 0), C = core(now), e = new Date(C.endOfToday()), s = new Date(C.startOfToday());
  ok(key(e) === key(new Date(now)) && e.getHours() === 23 && e.getMinutes() === 59 && e.getSeconds() === 59, `${label}: endOfToday = 23:59:59 cùng ngày (nhận ${e.toString().slice(0, 33)})`);
  ok(s.getHours() === 0 && s.getMinutes() === 0 && key(s) === key(new Date(now)), `${label}: startOfToday = 00:00 cùng ngày`);
  ok(C.endOfToday() + 1 === new Date(y, m - 1, d + 1).getTime(), `${label}: ngay sau endOfToday là 00:00 ngày kế (không lệch 1 giờ)`);
  const dueLate = new Date(y, m - 1, d, 23, 30).getTime(), dueNext = new Date(y, m - 1, d + 1, 0, 30).getTime();
  const map = { a: { srs: { reps: 1, last: 1, due: dueLate } }, b: { srs: { reps: 1, last: 1, due: dueNext } } };
  const due = C.Cards.dueList(map).map(c => c === map.a ? 'a' : 'b').join('');
  ok(due === 'a', `${label}: thẻ đến hạn 23:30 hôm nay tính, 00:30 ngày mai KHÔNG tính (nhận "${due}")`);
}
// Chuỗi: qua nửa đêm, qua ngày đổi giờ, và "hôm nay chưa học vẫn giữ chuỗi"
for (const TZ of ['America/New_York', 'Pacific/Auckland', 'Asia/Kolkata', 'Asia/Ho_Chi_Minh']) {
  const now = at(TZ, 2026, 11, 2, 0, 5); // 00:05 ngay sau nửa đêm, sát ngày lùi giờ 1/11 ở NY
  const C = core(now), days = {};
  for (let i = 1; i <= 5; i++) days[key(new Date(2026, 10, 2 - i))] = 5; // 5 ngày liền tới hôm qua (bắc qua 1/11)
  ok(C.Stats.streak({ days }) === 5, `${TZ}: 00:05 hôm nay chưa học, 5 ngày trước đó → chuỗi 5 (nhận ${C.Stats.streak({ days })})`);
  days[key(new Date(2026, 10, 2))] = 3;
  ok(C.Stats.streak({ days }) === 6, `${TZ}: học xong hôm nay → chuỗi 6`);
  delete days[key(new Date(2026, 10, 1))];
  ok(C.Stats.streak({ days }) === 1, `${TZ}: thủng 1/11 → chuỗi về 1 (hôm nay)`);
  ok(C.todayKey() === '2026-11-02', `${TZ}: todayKey = ngày địa phương 2026-11-02 (nhận ${C.todayKey()})`);
}
// Cuối ngày 23:59 vẫn là hôm nay, 1 phút sau là ngày mới
{
  const a = core(at('Asia/Ho_Chi_Minh', 2026, 11, 16, 23, 59)), b = core(at('Asia/Ho_Chi_Minh', 2026, 11, 17, 0, 0));
  ok(a.todayKey() === '2026-11-16' && b.todayKey() === '2026-11-17', 'VN: 23:59 → 00:00 đổi ngày đúng');
}
// Đếm ngược ngày thi: ngày LỊCH địa phương (trước: new Date('YYYY-MM-DD') = nửa đêm UTC → sai 1 ngày vài giờ mỗi ngày)
for (const [TZ, h, mi, want, label] of [['America/Los_Angeles', 17, 0, 1, 'LA 17:00 hôm trước ngày thi'], ['America/Los_Angeles', 10, 0, 1, 'LA 10:00 hôm trước'], ['Asia/Ho_Chi_Minh', 3, 0, 1, 'VN 03:00 hôm trước (cũ báo 1 khi ngày thi đã là hôm nay)'], ['Pacific/Auckland', 23, 59, 1, 'Auckland 23:59 hôm trước']]) {
  const C = core(at(TZ, 2026, 12, 16, h, mi));
  ok(C.daysTo('2026-12-17') === want && C.daysTo('2026-12-16') === 0 && C.daysTo('2026-12-15') === -1 && C.daysTo('2026-12-26') === 10, `${label}: còn ${C.daysTo('2026-12-17')} ngày (đúng ${want}), hôm nay = 0, hôm qua = -1`);
}
{ const C = core(at('America/New_York', 2026, 11, 1, 12, 0)); ok(C.daysTo('2026-11-08') === 7 && C.daysTo('2026-11-02') === 1, 'NY bắc qua ngày lùi giờ: 7 ngày = 7, không thành 6,96'); ok(Number.isNaN(C.daysTo('xyz')), 'ngày hỏng → NaN'); }
console.log(bad ? `\n${bad} lỗi` : '\nOK');
process.exit(bad ? 1 : 0);
