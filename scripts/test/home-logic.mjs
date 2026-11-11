// Logic số liệu trang Hôm nay (chủ 4/11, ảnh /app/#/home): "TOEIC · 7.0", "Còn 20 thẻ" cạnh "Ôn 12 thẻ", "(5 phút)" cạnh "5 phút", "từ đang phai" với thẻ chưa học.
// Chạy đúng khối mã thật trong web/js/hubs.js và web/js/ux1.js (giữa dấu <exam-target>, <goal-left>), không chép lại logic.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url)), rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} home-logic: ${m}`); if (!c) fail++; };
const block = (src, tag) => { const m = src.match(new RegExp(`// <${tag}>[\\s\\S]*?// </${tag}>`)); if (!m) throw new Error('thiếu khối ' + tag); return m[0]; };

const hubs = rd('web/js/hubs.js'), ux1 = rd('web/js/ux1.js'), plan = rd('web/js/plan.js'), tracks = rd('web/js/tracks.js');
const EXAMS = { ielts: {}, ieltsgt: {}, toeic: {}, toefl: {}, general: {} };
function load(settings) {
  const App = { goalLabel: g => (g.exam === 'general' ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][g.target - 1] || '' : String(g.target)) };
  const ctx = { App, EXAMS, state: { settings } };
  vm.runInNewContext(block(hubs, 'exam-target'), ctx);
  return App;
}
const S = { ielts: '7.0', ieltsgt: '6.5', toeic: '650', toefl: '4.5', general: 'B1' };

// 1) Mỗi cặp kỳ cũ → kỳ mới: không bao giờ mượn số của kỳ cũ, quay lại thì lấy lại đúng số
for (const from of Object.keys(S)) for (const to of Object.keys(S)) {
  if (from === to) continue;
  const s = { exam: from, examTarget: S[from] }, A = load(s);
  A.moveExamTarget(s, from, to); s.exam = to;
  ok(s.examTarget === '', `${from} ${S[from]} → ${to}: mục tiêu trống (mời đặt), không mượn số`);
  s.examTarget = S[to]; A.moveExamTarget(s, to, from); s.exam = from;
  ok(s.examTarget === S[from], `${to} → ${from}: lấy lại ${S[from]}`);
}
// 2) Thang điểm
{ const A = load({});
  for (const [ex, v, want] of [['toeic', '7.0', false], ['toeic', '650', true], ['toeic', '900+', true], ['toeic', '990', true], ['toeic', '995', false], ['ielts', '650', false], ['ielts', '7.0', true], ['ielts', '8.0+', true], ['ieltsgt', 'B1', false], ['toefl', '7.0', false], ['toefl', '5.5+', true], ['general', '7.0', false], ['general', 'B1', true], ['general', 'c2', true], ['ielts', '', false], ['ielts', null, false]]) ok(A.targetFits(ex, v) === want, `targetFits(${ex}, ${v}) = ${want}`); }
// 3) Dữ liệu đã lệch trên máy người dùng tự chữa khi mở app, chạy lại không đổi gì
{ const s = { exam: 'toeic', examTarget: '7.0' }, A = load(s); A.fixExamTarget(s); ok(s.examTarget === '', 'lỗi chủ báo: TOEIC + 7.0 → trống');
  const snap = JSON.stringify(s); A.fixExamTarget(s); ok(JSON.stringify(s) === snap, 'fixExamTarget chạy lại không đổi'); }
{ const s = { exam: 'toeic', examTarget: '7', goal: { exam: 'ielts', target: 7, date: '2030-01-01' } }, A = load(s); A.fixExamTarget(s);
  ok(!s.goal && s.examTarget === '' && s.goalsBy.ielts.target === 7, 'mục tiêu + ngày thi của IELTS không gắn sang TOEIC, vẫn được giữ lại');
  s.exam = 'ielts'; s.examTarget = ''; A.fixExamTarget(s); ok(s.goal && s.goal.target === 7 && s.examTarget === '7', 'quay lại IELTS: lấy lại mục tiêu + ngày thi'); }
{ const s = { exam: 'ielts', examTarget: '4.5', goalPick: { exam: 'toefl', target: 4.5 } }, A = load(s); A.fixExamTarget(s); ok(s.examTarget === '', 'số lọt thang nhưng goalPick cho thấy của kỳ khác → bỏ'); }
{ const s = { exam: 'toeic', examTarget: '650', goal: { exam: 'toeic', target: 650 } }, A = load(s); A.fixExamTarget(s); ok(s.examTarget === '650' && s.goal.target === 650, 'dữ liệu đúng giữ nguyên'); }
// 4) Lộ trình đi theo kỳ thi: Ngày N đọc tracks.cur
{ const s = { exam: 'ielts', examTarget: '7.0', tracks: { cur: 'ielts', on: ['ielts'], lv: {}, v: {}, goals: {} } }, A = load(s); A.moveExamTarget(s, 'ielts', 'toeic'); s.exam = 'toeic';
  ok(s.tracks.cur === 'toeic' && s.tracks.on.includes('ielts') && s.tracks.on.includes('toeic'), 'đổi sang TOEIC: gói học = TOEIC, gói cũ vẫn theo dõi'); }
{ const s = { exam: 'general', tracks: { cur: 'work', on: ['work'], lv: {}, v: {} } }, A = load(s); A.fixExamTarget(s); ok(s.tracks.cur === 'work', 'gói Công sở (kỳ General) không bị đổi'); }
{ const s = { tracks: { cur: 'toeic', on: ['toeic'], lv: {}, v: {} } }, A = load(s); A.fixExamTarget(s); ok(s.tracks.cur === 'toeic', 'chưa có settings.exam: không đụng gói học'); }
// 5) Mọi nơi đổi kỳ thi đều qua một nguồn
ok(/App\.setExam = async e => \{[^\n]*moveExamTarget/.test(hubs), 'App.setExam dùng moveExamTarget');
ok(/moveExamTarget\(s, exOld, ex\)/.test(tracks), 'Tracks.use dùng moveExamTarget');
ok(/App\.updateExamChip = \(\) => \{ App\.fixExamTarget\(\)/.test(hubs), 'mở app/đồng bộ về đều tự chữa (updateExamChip)');

// 6) Thẻ Mục tiêu ngày không hứa quá số thẻ đang có
{ const ctx = { t: (k, v) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]) };
  vm.runInNewContext(block(ux1, 'goal-left').replace('const goalLeftOf', 'this.goalLeftOf'), ctx);
  const f = ctx.goalLeftOf;
  ok(f(0, 20, 12) === '12 đến hạn', 'lỗi chủ báo: mục tiêu 20, có 12 thẻ → "12 đến hạn", không "Còn 20 thẻ"');
  ok(f(0, 20, 50) === 'Còn 20 thẻ', 'nhiều thẻ hơn mục tiêu → còn đủ 20');
  ok(f(15, 20, 12) === 'Còn 5 thẻ', 'đã ôn 15 → còn 5');
  ok(f(5, 20, 0) === 'Không còn thẻ đến hạn', 'hết thẻ → nói đúng thế');
  ok(f(20, 20, 3) === 'Đã đạt mục tiêu ngày', 'đạt mục tiêu'); }

// 7) Kế hoạch: tiêu đề không lặp thời lượng mà cột phút đã hiện; không đếm việc ôn 2 lần; thẻ chưa học không "đang phai"
ok(!/t\('[^']*\(\d+ phút\)'\)[^}]*mins:/.test(plan), 'plan.js: tiêu đề có mins không kèm "(N phút)"');
ok(!/và \{b\} từ cần ôn/.test(ux1), 'lời chào không cộng "và N từ cần ôn" vào số việc (việc ôn đã nằm trong kế hoạch)');
ok(/due = demo \? 0 : dc\.due/.test(ux1) && /r: \{ due, title: t\('\{n\} từ đang phai dần'/.test(ux1), '"từ đang phai dần" chỉ tính thẻ đã học tới hạn');
ok(/planC\.sig === sig/.test(ux1) && /planSig = \(\) => \[exam\(\)/.test(ux1), 'kế hoạch nhớ 30 s tính lại khi đổi kỳ thi / vừa ôn');
ok(/parseFloat\(tg\)/.test(ux1), 'mục tiêu "8.0+" / "900+" vẫn tính được % sẵn sàng');

// 8) Bảng cấp thấp nhất của gói (ux1 TRACK_LO) khớp tracks.js
const lo = JSON.parse(ux1.match(/TRACK_LO = (\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":'));
for (const [id, v] of Object.entries(lo)) { const m = tracks.match(new RegExp(`ST\\('${id}', 0, '[^']+', (\\d)`)); ok(m && +m[1] === v, `TRACK_LO.${id} = ${v} khớp tracks.js`); }
for (const id of Object.keys(lo)) for (let i = 1; i < 3; i++) { const m = tracks.match(new RegExp(`ST\\('${id}', ${i}, '[^']+', (\\d)`)); if (m) ok(+m[1] === lo[id] + i, `${id} chặng ${i + 1}: cấp ${m[1]} = gốc + ${i}`); }

// 9) Một bộ chọn ngôn ngữ trên màn máy tính
ok(/k === 'today-desk'\) \{ const lb = document\.getElementById\('langBtn'\)/.test(ux1), 'today-desk bỏ bộ chọn ngôn ngữ thứ hai khi thanh trên đang hiện');
if (fail) { console.error(`✗ home-logic: ${fail} lỗi`); process.exit(1); }
console.log('✓ home-logic: đạt');
