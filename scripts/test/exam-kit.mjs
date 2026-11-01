// ExamKit (web/js/exam-kit.js): đồng hồ theo mốc thời gian thật – tab ẩn, tải lại trang, hết giờ tự nộp; lưu tiến độ; giây từng câu; quy đổi TOEIC.
// node scripts/test/exam-kit.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XK = require('../../web/js/exam-kit.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗', m); } else console.log('✓', m); };

let T = 1_000_000; const now = () => T;
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; };

// 1. Đếm ngược theo Date.now: "tab ẩn" = không tick trong 10 phút → quay lại đúng giờ còn lại
{
  let exp = 0; const warns = [];
  const c = XK.clock({ mode: 'exam', duration: 75 * 60, now, autostart: false, onWarn: s => warns.push(s), onExpire: () => exp++ });
  c.tick(); ok(c.view().text === '1:15:00', 'bắt đầu 1:15:00 (TOEIC Reading)');
  T += 10 * 60 * 1000; c.tick(); ok(c.view().text === '1:05:00', 'tab ẩn 10 phút → còn đúng 1:05:00 (không lệch)');
  T += 60 * 60 * 1000 + 30 * 1000; c.tick(); ok(warns.join() === '300', 'còn 4:30 → đúng 1 cảnh báo 5 phút (không dồn)');
  ok(c.view().level === 'w5', 'chip đổi màu mức 5 phút');
  T += 3.6 * 60 * 1000; c.tick(); ok(warns.join() === '300,60' && c.view().level === 'w1', 'còn 54 s → cảnh báo 1 phút');
  T += 60 * 1000; c.tick(); c.tick(); ok(exp === 1, 'hết giờ → tự nộp đúng 1 lần');
  ok(c.view().text === '00:00', 'đồng hồ dừng ở 00:00');
}
// 2. Hết giờ trong lúc tab ẩn: quay lại là nộp ngay, không cảnh báo thừa
{
  let exp = 0; const warns = [];
  const c = XK.clock({ mode: 'exam', duration: 600, now, autostart: false, onWarn: s => warns.push(s), onExpire: () => exp++ });
  c.tick(); T += 20 * 60 * 1000; c.tick();
  ok(exp === 1 && warns.length === 0, 'hết giờ khi tab ẩn → nộp ngay khi quay lại, 0 cảnh báo thừa');
}
// 3. Tải lại trang: mốc endAt + cảnh báo đã báo được lưu → khôi phục đúng giờ, không báo lại
{
  const ls = mem(), st = XK.store('toeic.5', { storage: ls, now });
  const c1 = XK.clock({ mode: 'exam', duration: 3600, now, autostart: false, onState: s => st.save({ clock: s }) });
  c1.tick(); st.save({ clock: c1.state(), answers: { 101: 2 }, flags: ['104'] });
  T += 56 * 60 * 1000; c1.tick(); // còn 4' → đã cảnh báo 5'
  T += 30 * 1000; // "tải lại trang"
  const st2 = XK.store('toeic.5', { storage: ls, now }), sv = st2.saved();
  ok(sv && sv.answers[101] === 2 && sv.flags[0] === '104', 'tải lại → còn đáp án + câu đánh dấu');
  const warns = [];
  const c2 = XK.clock({ mode: 'exam', duration: 3600, state: sv.clock, now, autostart: false, onWarn: s => warns.push(s) });
  c2.tick(); ok(c2.view().text === '03:30', 'tải lại → đồng hồ tiếp tục đúng 03:30');
  ok(warns.length === 0, 'tải lại → không báo lại cảnh báo 5 phút');
  T += 864e5; ok(XK.store('toeic.5', { storage: ls, now }).saved() === null, 'bài làm dở quá 24 h → bỏ');
}
// 4. Chế độ luyện: đếm xuôi, không bao giờ tự nộp; chế độ tắt giờ: chuỗi rỗng
{
  let exp = 0; const c = XK.clock({ mode: 'practice', duration: 60, now, autostart: false, onExpire: () => exp++ });
  T += 2 * 3600 * 1000; c.tick(); ok(c.view().text === '2:00:00' && exp === 0, 'luyện: đếm xuôi 2:00:00, không tự nộp');
  ok(XK.clock({ mode: 'off', now, autostart: false }).view().text === '', 'tắt giờ: không hiện');
}
// 5. Giây từng câu
{
  const tk = XK.timeTracker({}, now); tk.set('101'); T += 40e3; tk.set('102'); T += 15e3; tk.set('101'); T += 5e3; tk.pause();
  const tm = tk.times(); ok(tm[101] === 45 && tm[102] === 15, 'giây từng câu: 101=45 s, 102=15 s');
  tk.set('103'); T += 3600e3; tk.pause(); ok(!tk.times()[103], 'bỏ quãng treo máy > 30 phút');
}
// 6. Tóm tắt trước khi nộp
{
  const s = XK.summary([1, 2, 3, 4], q => q % 2 === 0, ['3', '4']);
  ok(s.answered === 2 && s.blank === 2 && s.flagged === 2 && s.blankList.join() === '1,3', 'tóm tắt: đã làm/trống/đánh dấu');
}
// 7. Quy đổi TOEIC: biên + đơn điệu + bội 5
{
  const L = n => XK.toeicScaled(n, 100, 'L'), R = n => XK.toeicScaled(n, 100, 'R');
  ok(L(0) === 5 && R(0) === 5 && L(100) === 495 && R(100) === 495, 'TOEIC: 0 → 5, 100 % → 495');
  let mono = true; for (let i = 1; i <= 100; i++) if (L(i) < L(i - 1) || R(i) < R(i - 1) || L(i) % 5 || R(i) % 5) mono = false;
  ok(mono, 'TOEIC: đơn điệu tăng, bội số 5');
  ok(L(75) >= R(75), 'TOEIC: cùng số câu, Listening ≥ Reading');
  ok(XK.toeicScaled(30, 40, 'R') === R(75), 'TOEIC: quy về 100 câu khi đề ngắn hơn');
}
// 8. Thời lượng chuẩn
ok(XK.DURATION['toeic.reading'] === 4500 && XK.DURATION['ielts.reading'] === 3600 && XK.DURATION['toeic.listening'] === 2700, 'thời lượng chuẩn TOEIC/IELTS');

console.log(fail ? `exam-kit: ${fail} lỗi` : 'exam-kit: OK');
process.exit(fail ? 1 : 0);
