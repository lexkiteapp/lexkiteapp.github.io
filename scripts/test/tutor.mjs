// 🧑‍🏫 Gia sư 1-1 hằng ngày (docs/specs/tutor-daily.md): chọn bài trong ngân sách phút, độ khó vừa sức (~80 %), xen kẽ dạng bài,
// lời gia sư không lặp 7 ngày + không gây tội lỗi + đúng giọng giáo viên, múi giờ thật (qua mốc đổi giờ), báo cáo tuần, lời nhắc giọng gia sư.
import fs from 'node:fs';
import vm from 'node:vm';
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('✗ ' + m); } };
const load = () => { const g = { self: null, Intl, Date, Math }; g.self = g; vm.runInNewContext(fs.readFileSync('web/js/tutor/core.js', 'utf8'), g); return g.Tutor; };
const T = load(), DAY = 864e5;
const now = Date.UTC(2026, 10, 1, 12, 0); // 01/11/2026 12:00 UTC
const due = k => Array.from({ length: k }, (_, i) => ({ id: 'c' + i, r: 0.5 + i / (2 * k) }));
const mist = [{ key: 'm1', w: 'reluctant', at: now - DAY, kind: 'vocab' }, { key: 'm2', w: 'affect', at: now - 3 * DAY }, { key: 'm3', w: 'x', at: now - 2 * DAY }, { key: 'm4', w: 'y', at: now - 5 * DAY }, { key: 'm0', w: 'z', at: now, fixed: true }];
const base = { now, tz: 'Asia/Ho_Chi_Minh', settings: { pace: 20 }, due: due(80), mistakes: mist, next: { href: '#/day/a1-1', mins: 6 }, speak: { href: '#/call?q=1', w: 'reluctant' }, acc: 0.85 };
const kinds = s => s.steps.map(x => x.kind);

// 1) Thời lượng theo mục tiêu (pace 10/20/40 → 5/10/15) và chỉnh tay
ok(T.minutes({ pace: 10 }) === 5 && T.minutes({ pace: 20 }) === 10 && T.minutes({ pace: 40 }) === 15 && T.minutes({}) === 10, 'pace → 5/10/15 phút');
ok(T.minutes({ pace: 40, tutorMins: 5 }) === 5 && T.minutes({ tutorMins: 7 }) === 10, 'tutorMins chỉ nhận 5/10/15');

// 2) Buổi học: đủ 4 phần, đúng thứ tự, trong ngân sách
for (const pace of [10, 20, 40]) {
  const s = T.session({ ...base, settings: { pace } });
  ok(s.est <= s.mins * 60 * 1.1, `pace ${pace}: ước tính ${s.est}s ≤ ngân sách ${s.mins} phút (+10 %)`);
  ok(kinds(s)[0] === 'review' && s.steps[0].tag === 'warm', `pace ${pace}: mở đầu bằng thẻ dễ (thắng nhanh)`);
  ok(kinds(s).at(-1) === 'speak', `pace ${pace}: kết thúc bằng 1 lượt nói`);
  ok(kinds(s).includes('fix') && kinds(s).includes('new'), `pace ${pace}: có sửa lỗi cũ + 1 bài mới`);
  ok(kinds(s).filter(k => k === 'new').length === 1 && kinds(s).filter(k => k === 'speak').length === 1, `pace ${pace}: đúng 1 bài mới, 1 lượt nói`);
  for (let i = 1; i < s.steps.length; i++) ok(!(s.steps[i].kind === s.steps[i - 1].kind && s.steps[i].kind !== 'review') && !(s.steps[i].kind === 'review' && s.steps[i - 1].kind === 'review' && s.steps[i].tag === s.steps[i - 1].tag), `pace ${pace}: xen kẽ dạng bài (bước ${i})`);
}
const s10 = T.session(base), ids = s10.steps.filter(x => x.kind === 'review').flatMap(x => x.ids);
ok(new Set(ids).size === ids.length, 'không ôn trùng một thẻ trong buổi');
ok(s10.steps.find(x => x.kind === 'fix').keys[0] === 'm1', 'lỗi hôm qua được sửa trước');
ok(!s10.steps.find(x => x.kind === 'fix').keys.includes('m0'), 'lỗi đã sửa không quay lại');
ok(s10.steps.find(x => x.kind === 'fix').n <= 3, 'tối đa 3 lỗi/buổi');
ok(s10.left.due > 0 && s10.left.due + ids.length === 80, 'thẻ dư để dành, không mất (left.due)');
const dueStep = s10.steps.find(x => x.tag === 'due'); ok(dueStep.ids[0] === 'c0', 'thẻ có R thấp nhất (sắp quên) được ôn trước');
const warm = s10.steps[0].ids; ok(warm.every(id => !s10.steps.slice(1).some(x => x.ids && x.ids.includes(id))), 'thẻ khởi động không lặp lại');

// 3) Độ khó vừa sức: hụt (<70 %) → bỏ bài mới, buổi ngắn hơn; giỏi (>92 %) → bài mới "stretch"
const easy = T.session({ ...base, acc: 0.55 }), hard = T.session({ ...base, acc: 0.97 });
ok(easy.mode === 'easy' && !kinds(easy).includes('new'), 'đúng < 70 %: củng cố, chưa thêm bài mới');
ok(easy.steps.filter(x => x.kind === 'review').reduce((a, x) => a + x.n, 0) < s10.steps.filter(x => x.kind === 'review').reduce((a, x) => a + x.n, 0), 'đúng < 70 %: ít thẻ hơn (nhiều lần đúng hơn)');
ok(hard.mode === 'stretch' && hard.steps.find(x => x.kind === 'new').stretch, 'đúng > 92 %: bài mới khó hơn một nấc');
ok(T.session({ ...base, acc: 0.55, due: [] }).steps.some(x => x.kind === 'new'), 'hụt nhưng không còn thẻ đến hạn → vẫn có bài mới');

// 4) Trường hợp biên: người mới (không thẻ, không lỗi), không có lượt nói, quá nhiều thẻ
const fresh = T.session({ ...base, due: [], mistakes: [] });
ok(kinds(fresh).join() === 'new,speak', 'người mới: 1 bài mới + 1 lượt nói');
ok(T.session({ ...base, speak: null }).steps.every(x => x.kind !== 'speak'), 'không có lượt nói → không bịa bước');
ok(T.session({ ...base, due: due(5000) }).est <= 10 * 60 * 1.1, '5.000 thẻ đến hạn vẫn trong 10 phút');
ok(T.session({}).steps.length === 0, 'ctx rỗng không lỗi');

// 5) Múi giờ & ngày địa phương (qua mốc đổi giờ New York 01/11/2026 02:00)
ok(T.dayKey(Date.UTC(2026, 9, 31, 18, 0), 'Asia/Ho_Chi_Minh') === '2026-11-01', 'HCM 01:00 sáng 01/11 = ngày 01/11');
ok(T.dayKey(Date.UTC(2026, 10, 1, 3, 30), 'America/New_York') === '2026-10-31', 'New York 23:30 31/10 (trước đổi giờ) = 31/10');
ok(T.dayKey(Date.UTC(2026, 10, 2, 4, 30), 'America/New_York') === '2026-11-01', 'New York 23:30 01/11 (sau đổi giờ, UTC−5) = 01/11');
ok(T.dayKey(Date.UTC(2026, 10, 1, 18, 45), 'Asia/Kolkata') === '2026-11-02', 'Kolkata +5:30 qua nửa đêm');
ok(T.dayKey(Date.UTC(2026, 10, 1, 11, 30), 'Pacific/Auckland') === '2026-11-02', 'Auckland +13');
const nyY = T.session({ ...base, tz: 'America/New_York', now: Date.UTC(2026, 10, 2, 13, 0), mistakes: [{ key: 'a', w: 'a', at: Date.UTC(2026, 10, 1, 3, 0) }, { key: 'b', w: 'b', at: Date.UTC(2026, 10, 1, 20, 0) }] });
ok(nyY.steps.find(x => x.kind === 'fix').keys[0] === 'b', 'New York: "hôm qua" tính theo ngày địa phương qua đổi giờ');
ok(T.hourIn(Date.UTC(2026, 10, 1, 1, 0), 'Asia/Ho_Chi_Minh') === 8, 'giờ địa phương HCM');

// 6) Lời gia sư: chào theo giờ, quay lại sau nghỉ, nhắc lỗi hôm qua, khen cụ thể, mục tiêu nhỏ
const L = (o) => T.line({ now, tz: 'Asia/Ho_Chi_Minh', settings: { name: 'Lan' }, ...o });
ok(/^ge/.test(L({}).id), '19:00 HCM → chào buổi tối');
ok(/^gm/.test(L({ now: Date.UTC(2026, 10, 1, 1, 0) }).id), '08:00 HCM → chào buổi sáng');
ok(/^gl/.test(L({ now: Date.UTC(2026, 10, 1, 16, 0) }).id), '23:00 HCM → học muộn, làm gọn');
ok(/^gb/.test(L({ lastDay: '2026-10-28' }).id), 'nghỉ 4 ngày → "mừng quay lại", không nhắc chuỗi');
ok(/^gf/.test(L({ first: true }).id), 'buổi đầu → gia sư tự giới thiệu');
ok(L({}).v.name === 'Lan', 'chào theo tên');
ok(L({ slot: 'recall', yMistake: { w: 'reluctant' } }).v.w === 'reluctant' && /reluctant/.test(L({ slot: 'recall', yMistake: { w: 'reluctant' } }).say), 'nhắc lỗi hôm qua đúng từ (cả lời nói)');
ok(L({ slot: 'recall' }) === null, 'không có lỗi hôm qua → không bịa');
ok(L({ slot: 'praise', wk: { accDelta: 8 } }).id === 'pa1' && L({ slot: 'praise', wk: { accDelta: 8 } }).v.d === 8, 'khen cụ thể: độ chính xác +8 %');
ok(L({ slot: 'praise', wk: { mastered: 12 } }).id === 'pm1', 'khen cụ thể: số từ đã thuộc');
ok(L({ slot: 'praise', wk: { speakW: 'thought' } }).id === 'pk1', 'khen cụ thể: phát âm từ đã luyện');
ok(L({ slot: 'praise', streak: 7 }).id === 'ps1' && /^pe/.test(L({ slot: 'praise', streak: 8 }).id), 'khen chuỗi chỉ ở mốc, ngoài mốc khen nỗ lực');
const gl = L({ slot: 'goal', plan: s10 }); ok(gl.v.m === 10 && gl.v.n > 0, 'mục tiêu nhỏ có số phút + số thẻ thật của buổi');
ok(L({ slot: 'done', focus: 'grammar' }).v.k === 'grammar', 'kết buổi gợi trọng tâm ngày mai');
// không lặp mẫu trong 7 ngày (khi còn mẫu khác); trong ngày giữ nguyên câu
const h1 = L({}); ok(L({}).id === h1.id, 'mở lại app trong ngày → cùng câu chào');
const nxt = T.line({ now: now + DAY, tz: 'Asia/Ho_Chi_Minh', settings: {}, hist: [{ id: h1.id, day: '2026-11-01' }] });
ok(nxt.id !== h1.id, 'hôm sau không lặp câu chào hôm qua');
const goals = new Set(); let hist = [];
for (let i = 0; i < 3; i++) { const x = T.line({ now: now + i * DAY, tz: 'UTC', slot: 'goal', plan: s10, hist }); goals.add(x.id); hist.push({ id: x.id, day: T.dayKey(now + i * DAY, 'UTC') }); }
ok(goals.size === 3, '3 ngày liền: 3 câu mục tiêu khác nhau');
// giọng = giáo viên: Ama nữ, Carlos nam
ok(L({ settings: { teacher: 'ama' } }).voice === 'female' && L({ settings: { teacher: 'carlos' } }).voice === 'male', 'Ama giọng nữ, Carlos giọng nam');
const w2 = new Set(); for (let i = 0; i < 6; i++) { const x = T.line({ now: now + i * DAY, tz: 'UTC' }); w2.add(x.who); ok(T.VOICE[x.who] === x.voice, 'giọng khớp giáo viên ngày ' + i); }
ok(w2.size === 2, 'không chọn giáo viên → luân phiên Ama/Carlos theo ngày');
// không gây tội lỗi, câu nói ngắn (≤ 12 từ, ≤ 150 wpm dễ nghe), đủ biến
for (const r of T.all()) {
  ok(!T.BAN.test(r[1]) && !T.BAN.test(r[2] || ''), 'không gây tội lỗi/áp lực: ' + r[0]);
  if (r[2] && !/^(recall|ready|due)$/.test(r[2])) ok(r[2].split(/\s+/).length <= 12, 'câu nói ≤ 12 từ: ' + r[0]);
  ok(!/\{(?!name|w|n|m|s|d|k|who)\w+\}/.test(r[1]), 'biến hợp lệ: ' + r[0]);
}
ok(new Set(T.all().map(r => r[0])).size === T.all().length, 'id mẫu không trùng');

// 7) Báo cáo tuần
const wk = T.week({ cur: { vocab: { ok: 90, n: 100 }, grammar: { ok: 12, n: 20 }, listen: { ok: 8, n: 10 } }, prev: { vocab: { ok: 78, n: 100 }, grammar: { ok: 13, n: 20 } }, mistakes: { grammar: 6, vocab: 2 }, days: 5, mins: 52.4, mastered: 14 });
ok(wk.up && wk.up.k === 'vocab' && wk.up.d === 12, 'tuần: giỏi lên ở từ vựng +12 %');
ok(wk.focus === 'grammar', 'tuần tới tập trung: ngữ pháp (yếu nhất + nhiều lỗi)');
ok(wk.days === 5 && wk.mins === 52 && wk.words === 14, 'tuần: số ngày, phút, từ đã thuộc');
ok(T.week({ cur: { vocab: { ok: 3, n: 4 } }, prev: {} }).up === null, 'ít dữ liệu → không khen bừa');

// 8) Lời nhắc giọng gia sư (giờ/≤ 1 ngày/giãn cách do remind.js – scripts/test/reminders.mjs)
const nd = T.nudge({ now, tz: 'UTC', settings: { teacher: 'carlos', pace: 10 }, yMistake: { w: 'affect' }, due: 12 });
ok(nd.kind === 'recall' && nd.v.w === 'affect' && nd.v.who === 'Carlos' && nd.who === 'carlos', 'nhắc: ưu tiên lỗi hôm qua, đúng giáo viên');
ok(T.nudge({ now, settings: { pace: 40 }, due: 0 }).kind === 'ready' && T.nudge({ now, settings: { pace: 40 } }).v.m === 15, 'nhắc: không thẻ → mời buổi 15 phút');

console.log(fail ? `✗ tutor: ${fail}/${n} lỗi` : `✓ tutor: ${n} kiểm`);
process.exit(fail ? 1 : 0);
