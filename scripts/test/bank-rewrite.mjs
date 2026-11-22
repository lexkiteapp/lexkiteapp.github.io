// Test E1b: luật cứng sau soạn + áp bản vá an toàn (chỉ khi mảng options trùng đúng, duy nhất; đáp án đúng giữ chữ).
import assert from 'node:assert/strict';
import { applyAll, hardRules, pickTargets } from '../content-qa/bank-rewrite.mjs';
const it = { options: ['sort', 'a much longer correct answer', 'mid one', 'x y z'], a: 1 };
const good = { options: ['sort of thing indeed ok yes', 'a much longer correct answer', 'mid one ok yes right so ok', 'one quite different tho ok'], explain: 'Lời giải mới, cụ thể cho câu này.' };
assert.deepEqual(hardRules(it, good), []);
assert.ok(hardRules(it, { ...good, options: ['a', 'a much longer correct answer', 'b', 'c'] }).includes('đáp án vẫn dài nhất'));
assert.ok(hardRules(it, { ...good, options: ['sort of thing indeed ok yes', 'CHANGED key text here ok', 'mid one ok yes right so ok', 'one quite different tho ok'] }).includes('đáp án đúng bị đổi chữ/ô'));
assert.ok(hardRules(it, { ...good, options: good.options.slice(0, 3) }).includes('số phương án đổi'));
assert.ok(hardRules(it, { ...good, options: ['sort of thing indeed ok yes', 'a much longer correct answer', 'sort of thing indeed ok yes', 'one quite different tho ok'] }).includes('trùng phương án'));
const src = "{ options: ['sort', 'a much longer correct answer', 'mid one', 'x y z'], a: 1, explain: 'Cũ.' },\n{ options: ['p', 'q', 'r', 's'], a: 0 },\n";
const p = { old: it.options, new: good.options, oldExplain: 'Cũ.', explain: good.explain, a: 1 };
const r = applyAll(src, [p]); assert.equal(r.hit, 1);
assert.ok(r.text.includes("'sort of thing indeed ok yes'") && r.text.includes('Lời giải mới') && r.text.includes("{ options: ['p', 'q', 'r', 's'], a: 0 }"), 'chỉ thay đúng câu, câu khác giữ nguyên');
assert.equal(applyAll(src + src, [p]).hit, 0, 'mơ hồ (2 câu trùng) → bỏ qua');
assert.equal(applyAll(src, [{ ...p, old: ['x', 'y', 'z', 'w'] }]).hit, 0, 'không khớp → không đổi');
const t = pickTargets([{ group: 'G', level: 'B1', q: 'Which one is correct here?', options: it.options, a: 1, explain: 'x y z w', id: 1 }]); assert.equal(t.length, 1); assert.deepEqual(t[0].why, ['long']);
console.log('✓ bank-rewrite: luật cứng + áp bản vá an toàn');
