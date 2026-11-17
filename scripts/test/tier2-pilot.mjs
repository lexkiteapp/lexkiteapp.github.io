// Logic nhận của pilot tầng 2 + chạy khô với AI giả (scripts/lexicon/expand/tier2-pilot.mjs).
import assert from 'node:assert/strict';
import { accept, run, chunks } from '../lexicon/expand/tier2-pilot.mjs';
assert.equal(accept({ vi_ok: true, back_ok: true, ex_ok: 2 }, 'to see'), true);
assert.equal(accept({ vi_ok: true, back_ok: true, ex_ok: 1 }, 'x'), false);
assert.equal(accept({ vi_ok: false, back_ok: true, ex_ok: 2 }, 'x'), false);
assert.equal(accept({ vi_ok: true, back_ok: true, ex_ok: 2 }, ''), false);
assert.equal(accept(null, 'x'), false);
assert.deepEqual(chunks([1, 2, 3], 2), [[1, 2], [3]]);
const items = [{ k: 'a#n', w: 'a', pos: 'n', gloss: 'g' }, { k: 'b#v', w: 'b', pos: 'v', gloss: 'g2' }];
const AI = {
  gen: async r => ({ out: Object.fromEntries(r.items.map(x => [x.k, { vi: 'vi-' + x.k, ex: ['one.', 'two.'] }])), model: 'gem-x', fam: 'gemini' }),
  judge: async (r, o) => r.pilot === 'back'
    ? (assert.deepEqual(o.exclude, ['gemini']), { out: Object.fromEntries(r.items.map(x => [x.k, { en: 'back' }])), model: 'oss', fam: 'gpt-oss' })
    : (assert.ok(o.exclude.includes('gpt-oss') && o.exclude.includes('gemini')), { out: { 'a#n': { vi_ok: true, back_ok: true, ex_ok: 2 }, 'b#v': { vi_ok: false, back_ok: true, ex_ok: 2 } }, model: 'llama', fam: 'llama' }),
};
const r = await run(items, { AI, log: () => {} });
assert.equal(r.res['a#n'].accepted, true); assert.equal(r.res['b#v'].accepted, false); assert.equal(r.models.length, 3);
console.log('tier2-pilot OK');
