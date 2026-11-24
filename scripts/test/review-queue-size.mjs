// Hàng duyệt tách theo lô + không tệp JSON nào trong content/qa > 5 MB (24/11: review-queue.json 37,5 MB làm cây repo vượt trần 600 MB).
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readQueue, writeQueue, QDIR, QLEGACY } from '../lib/review-queue.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), MAX = 5e6;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const big = walk(path.join(ROOT, 'content/qa')).filter(f => /\.json(\.gz)?$/.test(f) && fs.statSync(f).size > MAX);
assert.deepEqual(big, [], 'tệp JSON > 5 MB trong content/qa (tách theo lô/ngày): ' + big.join(', '));
assert.ok(!fs.existsSync(path.join(ROOT, QLEGACY)), 'review-queue.json đơn đã bị tách → ' + QDIR + '/<lô>.json');
// vòng đọc/ghi: giữ thứ tự mục trong lô, tách khi vượt cỡ, xoá tệp lô rỗng
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-'));
const items = [{ src: 'a', id: '1', batch: 'x' }, { src: 'a', id: '2', batch: 'y/z' }, { src: 'b', id: '3' }, { src: 'a', id: '4', batch: 'x', data: 'q'.repeat(3.2e6) }, { src: 'a', id: '5', batch: 'x', data: 'q'.repeat(100) }];
writeQueue(d, { items });
const r = readQueue(d).items; assert.equal(r.length, 5); assert.deepEqual(r.map(i => i.id).sort(), ['1', '2', '3', '4', '5']);
const files = fs.readdirSync(path.join(d, QDIR)); assert.ok(files.length >= 4 && files.every(f => fs.statSync(path.join(d, QDIR, f)).size < MAX), files.join());
writeQueue(d, { items: items.filter(i => i.batch !== 'x') }); assert.equal(readQueue(d).items.length, 2); assert.ok(!fs.readdirSync(path.join(d, QDIR)).some(f => /^x/.test(f)));
fs.writeFileSync(path.join(d, QLEGACY), JSON.stringify({ items: [{ id: 'old' }] })); assert.equal(readQueue(d).items.length, 3); writeQueue(d, readQueue(d)); assert.ok(!fs.existsSync(path.join(d, QLEGACY)));
fs.rmSync(d, { recursive: true, force: true });
console.log('review-queue-size OK');
