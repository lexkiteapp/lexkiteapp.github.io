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

// E1b+: đề TOEFL dựng bằng hàm Q(...) / m(...) (đáp án đúng đứng đầu, vị trí dựng lúc chạy) + nguồn xếp lại khi nạp → khớp theo CHỮ, giữ nguyên đáp án đúng
const tp = { group: 'TOEFL.reading', old: ['B1 text', 'RIGHT answer here', 'C1 text', 'D1 text'], new: ['B2 text longer one', 'RIGHT answer here', 'C2 text longer one', 'D2 text longer one'], a: 1, oldExplain: 'Cũ.', explain: 'Mới, cụ thể cho câu này.' };
const qsrc = "Q(1, 'q?', ['RIGHT answer here', 'D1 text', 'B1 text', 'C1 text'], 'cue', 'Cũ.'),\nQ(2, 'q2?', ['x', 'y', 'z', 'w'], 'cue', 'e'),\n";
const qr = applyAll(qsrc, [tp]); assert.equal(qr.hit, 1, 'Q(): khớp theo tập chữ (thứ tự nguồn ≠ thứ tự nạp)');
assert.ok(qr.text.includes("['RIGHT answer here', 'D2 text longer one', 'B2 text longer one', 'C2 text longer one'], 'cue', 'Mới, cụ thể cho câu này.'") && qr.text.includes("Q(2, 'q2?'"), 'Q(): thay nhiễu theo chữ, lời giải đi theo, câu khác nguyên');
const msrc = "m(65, 'q?', 'RIGHT answer here', ['C1 text', 'B1 text', 'D1 text'], 1, 'cue', 'Cũ.'),\n";
const mr = applyAll(msrc, [tp]); assert.equal(mr.hit, 1, 'm(): khớp'); assert.ok(mr.text.includes("'RIGHT answer here', ['C2 text longer one', 'B2 text longer one', 'D2 text longer one'], 1, 'cue', 'Mới"), 'm(): đúng thứ tự');
assert.equal(applyAll(qsrc.replace('RIGHT answer here', 'OTHER'), [tp]).hit, 0, 'đáp án đúng khác → bỏ');
const opSrc = "options: ['D1 text', 'RIGHT answer here', 'B1 text', 'C1 text'], a: 1, explain: 'Cũ.'";
const orr = applyAll(opSrc, [tp]); assert.equal(orr.hit, 1); assert.ok(orr.text.includes("['D2 text longer one', 'RIGHT answer here', 'B2 text longer one', 'C2 text longer one']"), 'options: xếp lại → vẫn khớp, giữ ô đáp án');
// luật riêng TOEFL: nhiễu không được ngắn (<75 %) và phải có ít nhất 1 nhiễu dài bằng đáp án
const ti = { group: 'TOEFL.listening', options: ['short one', 'A fairly long correct answer text', 'mid mid', 'tiny'], a: 1 };
assert.ok(hardRules(ti, { options: ['short one', 'A fairly long correct answer text', 'mid mid', 'tiny'], explain: 'Đủ dài để qua luật lời giải.' }).some(x => /^TOEFL/.test(x)), 'TOEFL: nhiễu ngắn → loại');
assert.deepEqual(hardRules(ti, { options: ['A reason that sounds equally long here', 'A fairly long correct answer text', 'Another distractor of similar size', 'Yet another plausible but wrong one'], explain: 'Đủ dài để qua luật lời giải.' }), [], 'TOEFL: nhiễu dài ngang → nhận');
console.log('✓ bank-rewrite: luật cứng + áp bản vá an toàn');
