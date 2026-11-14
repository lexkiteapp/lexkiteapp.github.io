// Test lib/floor-guard.mjs: sàn chỉ chặn khi PR TỰ hạ so với merge-base, không đỏ oan khi main nâng sàn sau lúc tách nhánh.
import assert from 'node:assert/strict';
import { loweredFloors } from './lib/floor-guard.mjs';

const base = { content: 78.8, total: 83 };           // sàn lúc nhánh tách ra
const mainNow = { content: 79, total: 83.9 };         // main đã nâng sau đó
// ca lỗi cũ: nhánh không đụng file sàn (= base) → so với mainNow thì "thấp hơn" nhưng KHÔNG phải do PR
assert.deepEqual(loweredFloors({ ...base }, base), [], 'PR không đụng sàn → xanh dù main đã nâng');
assert.ok(Object.entries(mainNow).some(([k, v]) => base[k] < v), 'giả định: main đã nâng sàn cao hơn base');
// PR tự nâng → xanh
assert.deepEqual(loweredFloors({ content: 80, total: 84 }, base), []);
// PR tự hạ → đỏ (không nới ngưỡng)
assert.match(loweredFloors({ content: 70, total: 83 }, base)[0], /hạ sàn content: 70 < 78\.8/);
// PR xoá sàn → đỏ
assert.match(loweredFloors({ content: 78.8 }, base)[0], /xoá sàn total/);
// không có mốc (máy không có origin/main) → bỏ qua
assert.deepEqual(loweredFloors({}, null), []);
console.log('✓ floor-guard: chỉ chặn PR tự hạ/xoá sàn so với merge-base');
