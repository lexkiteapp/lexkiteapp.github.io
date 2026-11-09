// Tab Kỹ năng: logic chọn "nên luyện tiếp" (web/js/skills-hub.js) – điểm thấp nhất → chưa luyện → lâu chưa luyện, nhường kỹ năng đã luyện hôm nay.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const box = { self: {}, window: {} }; box.self = box; vm.runInNewContext(fs.readFileSync('web/js/skills-hub.js', 'utf8'), box);
const pick = box.SkillsHub.pickNext, now = new Date('2026-11-09T12:00:00').getTime(), DAY = 864e5, r = (k, band, last) => ({ k, band, last });
assert.deepEqual({ ...pick([r('a', 6, now - DAY), r('b', 5, now - DAY), r('c', null, 0)], now) }, { k: 'b', why: 'band' }, 'điểm thấp nhất thắng');
assert.equal(pick([r('a', 6, now - DAY), r('b', 5, now)], now).k, 'a', 'đã luyện hôm nay → nhường kỹ năng khác');
assert.deepEqual({ ...pick([r('a', null, now - DAY), r('b', null, 0)], now) }, { k: 'b', why: 'never' }, 'chưa luyện được ưu tiên');
const o = pick([r('a', null, now - DAY), r('b', null, now - 3 * DAY)], now); assert.equal(o.k, 'b'); assert.equal(o.why, 'old'); assert.equal(o.days, 3);
const a = pick([r('a', null, now), r('b', null, now - 1000)], now); assert.equal(a.why, 'again', 'mọi kỹ năng đã luyện hôm nay vẫn có gợi ý');
// Bản cũ vẫn là dự phòng; code màn mới không nằm trong khung app (SHELL).
const sw = fs.readFileSync('web/sw.js', 'utf8'); assert.ok(!sw.includes('skills-hub.js') && !sw.includes('st/v2/skills.js'), 'màn Kỹ năng phải ở gói lười');
console.log('skills-hub OK');
