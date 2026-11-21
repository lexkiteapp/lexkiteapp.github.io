// Test E1: bank-balance chỉ hoán vị (đáp án đúng giữ nguyên chữ) + KHO THẬT giữ vị trí đáp án đều (lệch ≤ 3 % mỗi nhóm).
import assert from 'node:assert/strict';
import { balanceText } from '../content-qa/bank-balance.mjs';
import { loadContent } from '../lib/content-load.mjs';
import { auditBank } from '../content-qa/bank-audit.mjs';

const run = src => balanceText(src, 'g', new Map()).text, pick = (t, n) => { const m = /options:\s*\[(.*?)\],\s*a:\s*(\d)/.exec(t.split('\n')[n]); return (0, eval)(`[${m[1]}]`)[+m[2]]; };
// 4 câu cùng đáp án ở ô 0 → phải rải đều, mỗi câu vẫn đúng chữ
const src = [0, 1, 2, 3].map(i => `{ options: ['ok${i}', 'x${i}', 'y${i}', 'z${i}'], a: 0, explain: 'ok${i} đúng.' },`).join('\n'), out = run(src);
out.split('\n').forEach((_, i) => assert.equal(pick(out, i), `ok${i}`, 'đáp án đúng phải giữ nguyên chữ'));
assert.equal(new Set(out.split('\n').map((l, i) => /a:\s*(\d)/.exec(l)[1])).size, 4, 'vị trí đáp án phải trải đủ 4 ô');
// câu không được đổi chỗ
for (const bad of [`{ options: ['A', 'B', 'both', 'x'], a: 0 }`, `{ options: ['a', 'b', 'c', 'all of the above'], a: 0 }`, `{ options: ['a1', 'b1', 'c1', 'd1'], a: 0, explain: 'Đáp án B vì…' }`, `{ options: ['A one', 'B two', 'C three'], a: 1 }`])
  assert.equal(run(bad + '\n' + bad), bad + '\n' + bad, 'câu rủi ro phải giữ nguyên: ' + bad);
// chuỗi dùng backtick + answer:
assert.match(run('{ options: [`p`, `q`, `r`, `s`], answer: 0, explain: `t` },\n'.repeat(4)), /answer: 3/);
// kho thật
const bank = auditBank(loadContent()).out;
for (const [k, g] of Object.entries(bank)) if (g.items >= 60) assert.ok(g.posSkew <= 3, `${k}: lệch vị trí đáp án ${g.posSkew}% > 3%`);
// lời giải kết bằng “→ B” phải trỏ ĐÚNG chữ của đáp án (giám khảo LLM bắt được 23 câu lệch sau khi hoán vị)
const arrow = /(?:→|->|=>)\s*([A-E])\b/g;
for (const it of auditBank(loadContent()).items) { let m, last = null; arrow.lastIndex = 0; while ((m = arrow.exec(it.explain))) last = m[1]; if (last) assert.equal(last, 'ABCDE'[it.a], `lời giải trỏ ${last} nhưng đáp án ${'ABCDE'[it.a]}: ${it.q.slice(0, 50)}`); }
console.log('✓ bank-balance: hoán vị an toàn + kho thật cân bằng vị trí đáp án');
