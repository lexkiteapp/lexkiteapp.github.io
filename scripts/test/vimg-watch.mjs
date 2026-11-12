// vimg-watch: đỏ ≥ 2 lượt liền, 48 giờ không ảnh dù fill chạy thật; hết nghĩa vẽ được KHÔNG báo đỏ. Không gọi mạng.
import assert from 'node:assert/strict';
import { streak, addedOf, verdict } from '../ci/vimg-watch.mjs';
const N = Date.parse('2026-11-12T06:00:00Z'), r = (c, h) => ({ status: 'completed', conclusion: c, event: 'schedule', created_at: new Date(N - h * 36e5).toISOString() });
assert.equal(streak([r('failure', 1), r('failure', 5), r('success', 9)]), 2); assert.equal(streak([r('success', 1), r('failure', 5)]), 0);
assert.equal(streak([r('cancelled', 1), r('failure', 5), r('failure', 6)]), 2); // huỷ không cắt chuỗi
assert.equal(addedOf('Ảnh cảnh theo nghĩa: lượt fill 1 (16 ảnh) [skip ci]'), 16); assert.equal(addedOf('Ảnh từ vựng tầng miễn phí: +3 icon, +2 Wikimedia'), 5); assert.equal(addedOf('khác'), 0);
const c = (h, n) => ({ at: new Date(N - h * 36e5).toISOString(), msg: `Ảnh cảnh theo nghĩa: lượt fill 1 (${n} ảnh)` });
// free đỏ 2 lượt liền → báo (24/10→9/11 không ai biết)
assert.equal(verdict({ runs: { 'vocab-img-free.yml': [r('failure', 1), r('failure', 170)] }, commits: [c(2, 5)], realScene: 0, now: N }).bad.length, 1);
// 1 lượt đỏ lẻ → không báo
assert.equal(verdict({ runs: { 'vocab-img-free.yml': [r('failure', 1), r('success', 170)] }, commits: [c(2, 5)], realScene: 0, now: N }).bad.length, 0);
// đứng 48 giờ + fill chạy thật = đầu ra không tới chỉ mục → báo
assert.equal(verdict({ runs: {}, commits: [c(60, 5)], realScene: 3, now: N }).bad.length, 1);
// đứng 48 giờ + mọi lượt bị bỏ qua (hết nghĩa) → không báo đỏ, chỉ ghi chú
const v = verdict({ runs: {}, commits: [], realScene: 0, now: N }); assert.equal(v.bad.length, 0); assert.ok(v.info.some(x => /hết nghĩa/.test(x)));
// tốc độ/ngày cộng đúng, bỏ ảnh quá 24 giờ
assert.equal(verdict({ runs: {}, commits: [c(2, 5), c(10, 7), c(30, 9)], realScene: 0, now: N }).perDay, 12);
console.log('vimg-watch OK');
