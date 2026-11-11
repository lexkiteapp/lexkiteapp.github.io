// Đếm nguồn giọng THỰC phát (docs/specs/kokoro-on-device.md §Số đo): web/js/audio.js LKAudio.src/sysRate → beacon t:'vo' → functions/api/hit.js voRows.
// Chặn loại lỗi "giám sát mù": tỷ lệ rơi về giọng máy phải đo được, khóa cố định, số đếm có trần, không văn bản/định danh.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const A = createRequire(import.meta.url)('../../web/js/audio.js');
A.src('f'); A.src('f'); A.src('k'); A.src('s', 'wait'); A.src('s', 'bogus'); A.src('x');
assert.deepEqual({ ...A.vo }, { f: 2, k: 1, s: 2, s_wait: 1 }, 'đếm f/k/s + lý do hợp lệ; nguồn/lý do lạ bị bỏ');
assert.equal(A.sysRate(A.vo), 0.4, 'tỷ lệ giọng máy = s/(f+k+s)');
assert.equal(A.sysRate({}), 0, 'chưa phát gì → 0');
const { voRows, VO_KEYS } = await import('../../functions/api/hit.js');
assert.deepEqual(voRows({ c: { f: 3, s: 1, s_off: 1, junk: 9 }, p: 'app' }), [['vo:f', 3], ['vo:s', 1], ['vo:s_off', 1], ['vo:f:app', 3], ['vo:s:app', 1]], 'khóa cố định theo nền tảng');
assert.deepEqual(voRows({ c: { f: 1e9 }, p: 'evil' }), [['vo:f', 500], ['vo:f:web', 500]], 'trần 500/beacon, nền tảng lạ → web');
assert.deepEqual([voRows({}), voRows({ c: 'x' })], [[], []], 'beacon hỏng → không ghi');
assert.ok(A.VO_WHY.every(w => VO_KEYS.includes('s_' + w)), 'mọi lý do client gửi đều được máy chủ nhận (audio.js VO_WHY ⊂ hit.js VO_KEYS)');
const au = fs.readFileSync('web/js/audio.js', 'utf8');
assert.ok(/navigator\.webdriver/.test(au) && /lk\.noTrack/.test(au) && /localhost/.test(au), 'không gửi từ CI/trình duyệt tự động/máy quản trị/localhost');
assert.ok(!/text|word/.test(au.slice(au.indexOf('function flushVo'), au.indexOf("g.addEventListener('pagehide'"))), 'beacon không mang văn bản');
console.log('✓ voice-source: đếm nguồn giọng f/k/s + lý do, beacon an toàn, máy chủ khóa cố định');
