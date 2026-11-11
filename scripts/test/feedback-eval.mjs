// Kiểm chính bộ đo sửa câu (scripts/feedback/eval.mjs): chuẩn hoá, đếm precision/recall/fixP, cổng và mốc không lùi – rồi chạy cổng thật trên gec-set.
import assert from 'node:assert/strict'; import { execFileSync } from 'node:child_process';
import { norm, score, gate, loadSet, edits } from '../feedback/eval.mjs';
eq(norm("I’m  Going, home!"), "i'm going home");
eq(edits('i visit temple', 'i visited a temple'), ['+1:visited', '+1:a', '-1:visit']);
const ga = new Set(edits('last week i visit temple', 'last week i visited a temple'));
assert.ok(edits('last week i visit temple', 'last week i visited temple').every(e => ga.has(e)), 'sửa một phần đúng = mọi chỗ sửa nằm trong đáp án');
assert.ok(!edits('she can go', 'she can goes').every(e => new Set(edits('she can go', 'she can go')).has(e)), 'sửa sai bị bắt');
const set = [
  { id: 'a', src: 'he go to work', cor: 'he goes to work', alt: [], err: ['VERB:SVA'] },
  { id: 'b', src: 'I have two brother', cor: 'I have two brothers', alt: [], err: ['NOUN:NUM'] },
  { id: 'c', src: 'she can go', cor: 'she can go', alt: [], err: [] },
  { id: 'd', src: 'they agree', cor: 'they agree', alt: [], err: [] },
];
const fix = s => ({ 'he go to work': 'He goes to work.', 'she can go': 'she can goes' })[s] || null;
const m = score(set, fix);
eq([m.err, m.ok, m.flagged, m.tp, m.fp, m.fixed], [2, 2, 2, 1, 1, 1]);
eq([m.precision, m.recall, m.fpRate, m.fixP, m.fixR], [0.5, 0.5, 0.5, 0.5, 0.5]);
eq(m.byTag['VERB:SVA'], { n: 1, hit: 1 }); eq(m.byTag['NOUN:NUM'], { n: 1, hit: 0 });
assert.equal(gate('x', m, {}).length, 2, 'precision + fixP dưới 0,9 phải đỏ');
assert.ok(gate('x', { ...m, precision: 1, fixP: 1 }, { x: { recall: 0.6, fixR: 0.4 } }).some(e => /recall .* mốc/.test(e)), 'lùi recall phải đỏ');
assert.equal(gate('x', { ...m, flagged: 0, precision: 1, fixP: 1 }, {}).length, 0, 'engine không báo gì thì không phạt precision');
// Tập thật: đủ 14 L1, có câu đúng (đo báo nhầm), id duy nhất
const S = loadSet(), l1 = new Set(S.map(x => x.l1));
assert.equal(l1.size, 14, 'thiếu L1: ' + [...l1]); assert.equal(new Set(S.map(x => x.id)).size, S.length, 'id trùng');
assert.ok(S.filter(x => !x.err.length).length >= S.length / 4, 'cần ≥ 25 % câu đúng để đo báo nhầm');
execFileSync('node', ['scripts/feedback/eval.mjs'], { stdio: 'inherit' });
console.log('✓ feedback-eval: bộ đo + cổng thật');
function eq(a, b) { assert.deepEqual(a, b); }
