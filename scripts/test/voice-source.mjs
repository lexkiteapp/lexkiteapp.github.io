// Đếm nguồn giọng THỰC phát (docs/specs/kokoro-on-device.md §Số đo): web/js/audio.js LKAudio.src/sysRate → beacon t:'vo' → functions/api/hit.js voRows.
// Chặn loại lỗi "giám sát mù": tỷ lệ rơi về giọng máy phải đo được, khóa cố định, số đếm có trần, không văn bản/định danh.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const A = createRequire(import.meta.url)('../../web/js/audio.js');
A.src('f'); A.src('f'); A.src('k'); A.src('s', 'wait'); A.src('s', 'bogus'); A.src('x');
assert.deepEqual({ ...A.vo }, { f: 2, k: 1, s: 2, s_wait: 1 }, 'đếm f/k/s + lý do hợp lệ; nguồn/lý do lạ bị bỏ');
A.src('s', 'off', 'ios', true); A.src('s', 'off', 'bogus'); A.src('f', 'off', 'ios', true);
assert.deepEqual({ ...A.vo }, { f: 3, k: 1, s: 4, s_wait: 1, s_off: 2, s_off_ios: 1, s_part: 1 }, 'nhãn con của off + part chỉ đếm cho giọng máy; nhãn lạ bị bỏ');
A.vo.f = 2; A.vo.s = 2; delete A.vo.s_off; delete A.vo.s_off_ios; delete A.vo.s_part;
assert.equal(A.sysRate(A.vo), 0.4, 'tỷ lệ giọng máy = s/(f+k+s)');
assert.equal(A.sysRate({}), 0, 'chưa phát gì → 0');
A.src('p', 'r15'); A.src('p', 'bogus');
assert.deepEqual([A.vo.kp_r15, A.vo.kp_bogus, A.vo.f, A.vo.s], [1, undefined, 2, 2], "đo thử Kokoro ('p'): chỉ đếm nhóm RTF hợp lệ, không vào f/k/s"); delete A.vo.kp_r15;
const { voRows, VO_KEYS } = await import('../../functions/api/hit.js');
assert.ok(A.KP.every(b => VO_KEYS.includes('kp_' + b)), 'mọi nhóm RTF client gửi đều được máy chủ nhận');
assert.deepEqual(voRows({ c: { f: 3, s: 1, s_off: 1, junk: 9 }, p: 'app' }), [['vo:f', 3], ['vo:s', 1], ['vo:s_off', 1], ['vo:f:app', 3], ['vo:s:app', 1]], 'khóa cố định theo nền tảng');
assert.deepEqual(voRows({ c: { f: 1e9 }, p: 'evil' }), [['vo:f', 500], ['vo:f:web', 500]], 'trần 500/beacon, nền tảng lạ → web');
assert.deepEqual([voRows({}), voRows({ c: 'x' })], [[], []], 'beacon hỏng → không ghi');
assert.ok(A.VO_WHY.every(w => VO_KEYS.includes('s_' + w)), 'mọi lý do client gửi đều được máy chủ nhận (audio.js VO_WHY ⊂ hit.js VO_KEYS)');
// Câu rơi giọng máy: chỉ khóa băm + trang, trần 300 khóa/phiên; beacon gửi 20 khóa / 8 trang nhiều nhất; máy chủ lọc khóa/trang lạ, trần 50/khóa
A.miss('abc12', 'grammar'); A.miss('abc12', 'grammar'); A.miss('zz9', 'Bad Route'); A.miss('NOT A KEY', 'grammar'); A.miss('', 'x');
assert.deepEqual([{ ...A.vm }, { ...A.vr }], [{ abc12: 2, zz9: 1 }, { grammar: 2, other: 1 }], 'miss: chỉ khóa base36 + trang hợp lệ (lạ → other)');
for (let i = 0; i < 400; i++) A.miss('k' + i.toString(36), 'path');
assert.equal(Object.keys(A.vm).length, 300, 'trần 300 khóa/phiên'); A.miss('abc12', 'path'); assert.equal(A.vm.abc12, 3, 'khóa đã có vẫn đếm khi chạm trần');
assert.deepEqual(Object.keys(A.top(A.vm, 2)), ['abc12', 'zz9'], 'top: nhiều nhất trước');
const { vmRows } = await import('../../functions/api/hit.js');
assert.deepEqual(vmRows({ m: { abc12: 3, 'x y': 1, toolongkey9: 2, k0: 1e6 }, r: { grammar: 2, 'B!': 1 } }), [['vm:abc12', 3], ['vm:k0', 50], ['vr:grammar', 2]], 'vmRows: lọc khóa/trang, trần 50');
assert.equal(vmRows({ m: Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['k' + i, 1])) }).length, 20, 'vmRows: ≤ 20 khóa/beacon');
assert.deepEqual([vmRows({}), vmRows({ m: [1, 2] }), vmRows(null)], [[], [], []], 'vmRows: beacon hỏng → không ghi');
const ui = fs.readFileSync('web/js/ui.js', 'utf8');
assert.ok(/LA\(\)\.miss\(k, rt\)/.test(ui) && /!g\.LISTEN_AUDIO\.has\(k\)/.test(ui), 'ui.js: ghi khóa câu chưa có file khi rơi giọng máy');
const au = fs.readFileSync('web/js/audio.js', 'utf8');
assert.ok(/navigator\.webdriver/.test(au) && /lk\.noTrack/.test(au) && /localhost/.test(au), 'không gửi từ CI/trình duyệt tự động/máy quản trị/localhost');
assert.ok(/m: top\(vm, 20\), r: top\(vr, 8\)/.test(au), 'beacon kèm khóa/trang rơi nhiều nhất');
assert.ok(!/text|word/.test(au.slice(au.indexOf('function flushVo'), au.indexOf("g.addEventListener('pagehide'"))), 'beacon không mang văn bản');
console.log('✓ voice-source: đếm nguồn giọng f/k/s + lý do, beacon an toàn, máy chủ khóa cố định');
