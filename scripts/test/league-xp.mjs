// Hồi quy: XP tuần do máy khách gửi bị kẹp theo tốc độ hợp lý (capXp), không vượt trần tuần
import assert from 'node:assert/strict';
import { capXp, weekOf, XP_BURST, XP_PER_MIN } from '../../functions/api/league.js';
const wk = weekOf(Date.UTC(2026, 10, 4, 12)); // thứ Tư 12:00 UTC → đã trôi 2.5 ngày
const now = wk.start + 2.5 * 864e5;
assert.equal(capXp(10 ** 9, { xp: 0, updated: now }, wk.start, wk.start + 6.9 * 864e5), 20000, 'không vượt trần tuần');
assert.equal(capXp(-50, { xp: 0, updated: now }, wk.start, now), 0, 'âm → 0');
assert.equal(capXp(NaN, { xp: 0, updated: now }, wk.start, now), 0);
assert.equal(capXp(300, { xp: 0, updated: now }, wk.start, now), 300, 'XP hợp lý được giữ nguyên');
// lần nộp đầu của tuần: tính từ đầu tuần (học offline rồi mới nộp)
const first = capXp(50000, { xp: 0, updated: now }, wk.start, now);
assert.equal(first, Math.floor(XP_BURST + XP_PER_MIN * 2.5 * 1440), 'lần đầu: tối đa theo số phút từ đầu tuần');
// lần sau: chỉ tăng theo thời gian từ lần nộp trước
assert.equal(capXp(20000, { xp: 1000, updated: now - 10 * 60000 }, wk.start, now), 1000 + XP_BURST + XP_PER_MIN * 10, 'kẹp theo tốc độ');
assert.equal(capXp(1100, { xp: 1000, updated: now - 10 * 60000 }, wk.start, now), 1100, 'tăng ít được giữ');
assert.ok(capXp(5, { xp: 1000, updated: now }, wk.start, now) <= 5, 'không bao giờ trả cao hơn giá trị gửi');
assert.ok(capXp(20000, { xp: 19990, updated: now }, wk.start, now) <= 20000);
console.log('✓ league XP: kẹp theo tốc độ + trần tuần');
