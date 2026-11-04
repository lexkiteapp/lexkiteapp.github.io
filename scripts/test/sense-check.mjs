// Test cổng nghĩa v2 (scripts/content-qa/sense-check.mjs): mục đúng xanh, từng loại lỗi bị bắt.
import assert from 'node:assert/strict';
import { checkEntry, checkFile, hasForm } from '../content-qa/sense-check.mjs';
import { loadAll, key } from '../lexicon/lib.mjs';
const rows = new Map(); for (const e of loadAll()) { const k = key(e.row); if (!rows.has(k)) rows.set(k, e.row); }
const ctx = () => ({ rows, seenEx: new Map() });
const lvl = rows.get('go#v')[8];
const good = { fam: ['going (n)'], senses: [
  { n: 1, def: 'to move or travel from one place to another', lvl, reg: 'neutral', ex: ['We go to school by bus.', 'She went home early.'], col: ['go home', 'go to school', 'go by bus'], pat: ['go to sth'], src: 'test' },
] };
assert.deepEqual(checkEntry('go#v', good, ctx()), [], 'mục đúng phải xanh');
const bad = (patch, re) => { const e = JSON.parse(JSON.stringify(good)); patch(e); const r = checkEntry('go#v', e, ctx()); assert.ok(r.some(m => re.test(m)), `phải bắt ${re}: ${r.join(' | ')}`); };
bad(e => { e.senses[0].ex = ['We go to school by bus.']; }, /cần ≥ 2/);
bad(e => { e.senses[0].ex[1] = 'She left home early.'; }, /không chứa "go"/);
bad(e => { e.senses[0].ex[1] = 'Every single morning she goes to the big school near the river.'; }, /từ, cấp/);
bad(e => { e.senses[0].ex[1] = 'she went home early'; }, /viết hoa/);
bad(e => { e.senses[0].lvl = 'Z9'; }, /không hợp lệ/);
bad(e => { e.senses[0].reg = 'slangy'; }, /reg/);
bad(e => { e.senses[0].def = 'to go'; }, /def/);
bad(e => { e.senses[0].col = ['go home']; }, /collocation \(cần ≥ 3/);
bad(e => { e.senses[0].col = ['go abroad', 'go wrong', 'go missing']; }, /minh hoạ/);
bad(e => { e.senses[0].pat = ['go there']; }, /chỗ trống/);
bad(e => { e.senses[0].n = 2; }, /n = 2/);
bad(e => { e.fam = ['go (v)']; }, /fam/);
assert.ok(!checkEntry('go#v', { ...good, fam: ['go (n)'] }, ctx()).some(m => /fam/.test(m)), 'cùng chữ khác từ loại là họ từ hợp lệ');
bad(e => { e.senses.push({ ...e.senses[0], n: 2 }); }, /trùng/);
if (lvl !== 'A1') bad(e => { e.senses[0].lvl = 'A1'; }, /< cấp từ/);
else bad(e => { e.senses[0].lvl = 'B1'; }, /nghĩa dễ nhất/);
assert.ok(checkEntry('zzqx#n', good, ctx()).some(m => /không có trong kho/.test(m)));
assert.ok(hasForm('go through', 'We went through the plan.') && !hasForm('fit in', 'It fits well.'));
const r = checkFile(); assert.equal(r.errs.length, 0, r.errs.slice(0, 5).join('\n')); assert.equal(r.core, 3000);
console.log('✓ sense-check test: 16 loại lỗi bị bắt, file thật xanh');
