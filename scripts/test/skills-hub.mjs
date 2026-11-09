// Tab Kỹ năng: logic chọn "nên luyện tiếp" (web/js/skills-hub.js) – điểm thấp nhất → chưa luyện → lâu chưa luyện, nhường kỹ năng đã luyện hôm nay.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const box = { self: {}, window: {} }; box.self = box; vm.runInNewContext(fs.readFileSync('web/js/skills-hub.js', 'utf8'), box);
const { pickNext: pick, rowOf, noteOf, whyOf } = box.SkillsHub, now = new Date('2026-11-09T12:00:00').getTime(), DAY = 864e5, t = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const r = (k, band, last, count = 0) => rowOf(k, { band, last, count }), OPT = { exam: 'IELTS', toeic: false };
assert.deepEqual({ ...pick([r('a', 6, now - DAY), r('b', 5, now - DAY), r('c', null, 0)], now) }, { k: 'b', why: 'band' }, 'điểm thấp nhất thắng');
assert.equal(pick([r('a', 6, now - DAY), r('b', 5, now)], now).k, 'a', 'đã luyện hôm nay → nhường kỹ năng khác');
assert.deepEqual({ ...pick([r('a', null, now - DAY), r('b', null, 0)], now) }, { k: 'b', why: 'never' }, 'chưa luyện được ưu tiên');
const o = pick([r('a', null, now - DAY), r('b', null, now - 3 * DAY)], now); assert.equal(o.k, 'b'); assert.equal(o.why, 'old'); assert.equal(o.days, 3);
const a = pick([r('a', null, now), r('b', null, now - 1000)], now); assert.equal(a.why, 'again', 'mọi kỹ năng đã luyện hôm nay vẫn có gợi ý');
// Dòng lý do và trạng thái cùng một nguồn: bộ dữ kiện → hai dòng không được mâu thuẫn.
const say = rows => { const nx = pick(rows, now), row = rows.find(x => x.k === nx.k); return { nx, note: noteOf(row, t), why: whyOf(nx, row, OPT, t) }; };
const mockOnly = say(['listening', 'reading', 'writing', 'speaking'].map((k, i) => rowOf(k, { band: 6.5 + i / 2 })));
assert.equal(mockOnly.nx.why, 'never', 'có bài thi thử nhưng chưa luyện → không dùng điểm');
assert.equal(mockOnly.note, 'Chưa luyện'); assert.equal(mockOnly.why, 'Nên bắt đầu từ đây để tiến tới mục tiêu IELTS'); assert.ok(!/\d|Band/.test(mockOnly.why), 'chưa luyện thì không có số');
const empty = say(['listening', 'speaking'].map(k => rowOf(k))); assert.equal(empty.nx.why, 'never'); assert.equal(empty.note, 'Chưa luyện'); assert.ok(!/\d|Band/.test(empty.why));
const real = say([rowOf('listening', { band: 7, count: 12, last: now - DAY }), rowOf('speaking', { band: 5.5, days: 2, last: now - DAY })]);
assert.equal(real.nx.k, 'speaking'); assert.equal(real.why, 'Điểm thấp nhất ở lần thi thử gần nhất: Band 5.5'); assert.equal(real.note, '2 ngày đã luyện');
const toeic = rowOf('reading', { band: 300, count: 1, last: now - DAY }); assert.equal(whyOf({ why: 'band' }, toeic, { exam: 'TOEIC', toeic: true }, t), 'Điểm thấp nhất ở lần thi thử gần nhất: 300');
const noDate = say([rowOf('writing', { count: 3 })]); assert.equal(noDate.nx.why, 'old', 'đã làm bài nhưng mất mốc ngày vẫn là đã luyện'); assert.equal(noDate.why, 'Đã lâu bạn chưa luyện kỹ năng này'); assert.equal(noDate.note, '3 bài đã làm');
const dated = say([rowOf('listening', { days: 1, last: now - 2 * DAY })]); assert.equal(dated.note, '1 ngày đã luyện', 'có ngày luyện thì không ghi Chưa luyện'); assert.equal(dated.why, 'Luyện gần nhất 2 ngày trước');
// Bản cũ vẫn là dự phòng; code màn mới không nằm trong khung app (SHELL).
const sw = fs.readFileSync('web/sw.js', 'utf8'); assert.ok(!sw.includes('skills-hub.js') && !sw.includes('st/v2/skills.js'), 'màn Kỹ năng phải ở gói lười');
console.log('skills-hub OK');
