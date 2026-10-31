// LipSync (web/js/call/lipsync.js): bảng âm vị → miệng, chống nháy, trộn hình, con trỏ live nhân quả.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const LS = createRequire(import.meta.url)('../../web/js/call/lipsync.js');
LS.setDict(fs.readFileSync('content/lexicon/cmudict-subset.txt', 'utf8'));
const v = t => LS.units(t).map(u => u.v).join('');
assert.equal(v('mom'), 'ADA'); assert.equal(v('food')[0], 'G'); assert.ok(v('you').endsWith('F')); assert.ok(v('let').startsWith('H'));
const c = LS.fromText('Hello, how are you today?', 2.2);
assert.equal(c[0].value, 'X'); assert.equal(c[c.length - 1].value, 'X');
assert.ok(c.every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9), 'không mảnh < MIN_HOLD');
assert.ok(c.every((x, i) => !i || x.value !== c[i - 1].value), 'không 2 hình trùng liền kề');
assert.ok(Math.abs(c[c.length - 1].end - 2.2) < 1e-6);
const s = LS.stateAt([{ start: 0, end: 1, value: 'X' }, { start: 1, end: 2, value: 'D' }], 1 - LS.LEAD + LS.BLEND / 2);
assert.equal(s.a, 'X'); assert.equal(s.b, 'D'); assert.ok(Math.abs(s.k - 0.5) < 1e-6);
const L = LS.live('Good morning', { dur: 1 }); let t = 0;
for (; t < 0.2; t += 1 / 60) L.tick(t, false, 1 / 60); assert.equal(L.tick(t, false, 1 / 60), 'X', 'im → X');
for (; t < 0.9; t += 1 / 60) L.tick(t, true, 1 / 60); assert.ok(L.cues.length > 3, 'có tiếng → miệng chạy');
assert.ok(L.cues.slice(1, -1).every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9));
const vd = LS.vad({ floor: 0.01 }); assert.equal(vd(0.05), true); assert.equal(vd(0.005), true, 'trễ tắt'); for (let i = 0; i < 6; i++) vd(0.005); assert.equal(vd(0.005), false);
console.log('lipsync ok');
