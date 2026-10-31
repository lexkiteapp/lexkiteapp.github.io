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
// align: mở miệng sớm (Rhubarb ở âm hơi H) → neo vào lúc tiếng bắt đầu; khép trễ → neo vào lúc tiếng tắt
const env = Array.from({ length: 100 }, (_, i) => (i >= 30 && i < 70 ? 0.5 : 0.001));
const al = LS.align([{ start: 0, end: 0.22, value: 'X' }, { start: 0.22, end: 0.5, value: 'C' }, { start: 0.5, end: 0.8, value: 'B' }, { start: 0.8, end: 1, value: 'X' }], env);
assert.ok(Math.abs(al[1].start - 0.3) < 1e-9 && al[0].end === al[1].start, 'mở đúng lúc có tiếng'); assert.ok(Math.abs(al[3].start - 0.7) < 1e-9, 'khép lúc tiếng tắt');
assert.ok(Math.abs(LS.align([{ start: 0, end: 0.27, value: 'X' }, { start: 0.27, end: 1, value: 'C' }], env, { words: [{ start: 0.28, end: 0.6 }] })[1].start - 0.3) < 1e-9);
// LipMouth: đủ 9 hình vẽ cho cả 2 giáo viên, trộn bộ số
const LM = createRequire(import.meta.url)('../../web/js/call/mouths.js');
assert.deepEqual(LM.SHAPES, LS.SHAPES, 'cùng bộ 9 hình');
for (const w of ['ama', 'carlos']) for (const k of LM.SHAPES) { const g = LM.svg(w, k, 'm' + k); assert.ok(/^<g class="lk-mouth">.*<\/g>$/.test(g) && !/NaN|undefined/.test(g), w + k); }
assert.equal(LM.mix('X', 'D', 0.5).d, LM.SHAPE.D.d / 2); assert.ok(!/NaN/.test(LM.svg('ama', LM.mix('C', 'F', 0.3))));
console.log('lipsync ok');
