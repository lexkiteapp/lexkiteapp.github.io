// vimg-watch: đỏ ≥ 2 lượt liền, 48 giờ không ảnh dù fill chạy thật; hết nghĩa vẽ được KHÔNG báo đỏ. Không gọi mạng.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { streak, addedOf, verdict, wordSpeed } from '../ci/vimg-watch.mjs';
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
// dòng tốc độ (13/11): từ/ngày theo lô, ảnh/ngày 7 ngày so đích 300, cỡ hàng duyệt
{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-')); fs.mkdirSync(path.join(d, 'content/lexicon/expand'), { recursive: true }); fs.mkdirSync(path.join(d, 'content/qa'), { recursive: true });
  fs.writeFileSync(path.join(d, 'content/lexicon/expand/20261112-r1.json'), JSON.stringify({ n: 23 })); fs.writeFileSync(path.join(d, 'content/lexicon/expand/20261112.json'), JSON.stringify({ n: 7 })); fs.writeFileSync(path.join(d, 'content/lexicon/expand/20261107.json'), JSON.stringify({ n: 100 }));
  fs.writeFileSync(path.join(d, 'content/qa/review-queue.json'), JSON.stringify({ items: [{ src: 'lexicon-expand' }, { src: 'lexicon-expand' }, { src: 'khac' }] }));
  const sp = wordSpeed(d, N); assert.deepEqual(sp, { w1: 30, w7: 130, queue: 2 });
  const line = verdict({ runs: {}, commits: [c(2, 5)], realScene: 0, now: N, speed: sp }).info.find(x => /^Tốc độ/.test(x)); assert.match(line, /từ xuất 30\/ngày/); assert.match(line, /CHƯA ĐẠT/); assert.match(line, /hàng duyệt lexicon-expand 2 mục/);
  assert.equal(wordSpeed(path.join(d, 'nope'), N).queue, null); fs.rmSync(d, { recursive: true, force: true }); }
console.log('vimg-watch OK');
