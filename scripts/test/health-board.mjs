// Test logic phân loại health-board (scripts/lib/health-board.mjs) + record-yield.
import assert from 'node:assert/strict';
import { ownerOf, classify, cronPeriodHours, crons, minPeriod, rank, render, redCount } from '../lib/health-board.mjs';
import { addYield } from '../ci/record-yield.mjs';
const now = Date.parse('2026-11-17T12:00:00Z'), H = 36e5, ago = h => new Date(now - h * H).toISOString();
const run = (c, h, id = 1) => ({ conclusion: c, created_at: ago(h), id, event: 'schedule' });
const wf = (state = 'active') => ({ name: 'X', file: 'x.yml', state });
const kinds = a => a.map(f => `${f.sev}:${f.kind}`);

assert.equal(cronPeriodHours('17 */3 * * *'), 3);
assert.equal(cronPeriodHours('0 0 * * *'), 24);
assert.equal(cronPeriodHours('0 1,13 * * *'), 12);
assert.equal(cronPeriodHours('0 0 * * 1'), 168);
assert.equal(cronPeriodHours('*/20 * * * *'), 1 / 3 > 0.25 ? 1 / 3 : 0.25);
assert.equal(minPeriod(['0 0 * * *', '0 */6 * * *']), 6);
assert.deepEqual(crons("on:\n  schedule:\n    - cron: '7 * * * *'\n    - cron: \"0 0 * * 1\"\n"), ['7 * * * *', '0 0 * * 1']);

// xanh → không phát hiện
assert.deepEqual(classify({ wf: wf(), runs: [run('success', 2)], cronList: ['0 */6 * * *'], now }), []);
// tắt: không chủ = high; có chủ còn hạn = im; quá hạn = high
assert.deepEqual(kinds(classify({ wf: wf('disabled_manually'), now })), ['high:tắt']);
assert.deepEqual(classify({ wf: wf('disabled_manually'), off: { owner: 'a', due: '2027-01-01', why: 'x' }, now }), []);
assert.deepEqual(kinds(classify({ wf: wf('disabled_manually'), off: { owner: 'a', due: '2026-01-01', why: 'x' }, now })), ['high:tắt']);
// đỏ: 3/3 critical, 2/3 high, 1/3 warn; huỷ/bỏ qua không tính
assert.deepEqual(kinds(classify({ wf: wf(), runs: [run('failure', 1), run('failure', 2), run('failure', 3)], now })), ['critical:đỏ']);
assert.deepEqual(kinds(classify({ wf: wf(), runs: [run('failure', 1), run('failure', 2), run('success', 3)], now })), ['high:đỏ']);
assert.deepEqual(kinds(classify({ wf: wf(), runs: [run('failure', 1), run('success', 2), run('success', 3)], now })), ['warn:đỏ']);
assert.deepEqual(kinds(classify({ wf: wf(), runs: [run('cancelled', 1), run('success', 2)], now })), []);
assert.deepEqual(classify({ wf: wf(), runs: [run('success', 1), run('failure', 2)], now }), []);
// quá hạn cron
assert.deepEqual(kinds(classify({ wf: wf(), runs: [run('success', 70)], cronList: ['0 0 * * *'], now })), ['warn:quá hạn']);
assert.deepEqual(kinds(classify({ wf: wf(), runs: [], cronList: ['0 0 * * *'], now })), ['high:quá hạn']);
assert.deepEqual(classify({ wf: wf(), runs: [run('success', 20)], cronList: ['0 0 * * *'], now }), []);
// sản lượng
const fl = { floor: 40, windowH: 48, unit: 'từ' }, ok = [run('success', 3)];
assert.deepEqual(kinds(classify({ wf: wf(), runs: ok, floor: fl, yieldRuns: [{ t: ago(3), n: 0 }, { t: ago(9), n: 0 }], now })), ['critical:sản lượng']);
assert.deepEqual(kinds(classify({ wf: wf(), runs: ok, floor: fl, yieldRuns: [{ t: ago(3), n: 10 }], now })), ['high:sản lượng']);
assert.deepEqual(classify({ wf: wf(), runs: ok, floor: fl, yieldRuns: [{ t: ago(3), n: 25 }, { t: ago(20), n: 20 }], now }), []);
assert.deepEqual(kinds(classify({ wf: wf(), runs: ok, floor: fl, yieldRuns: [{ t: ago(100), n: 99 }], now })), ['high:sản lượng']);   // bản ghi ngoài cửa sổ = như không có
assert.deepEqual(kinds(classify({ wf: wf(), runs: [], floor: fl, yieldRuns: undefined, now })), ['warn:sản lượng']);
// xếp hạng + render + số đỏ
const all = [...classify({ wf: wf(), runs: [run('failure', 1)], now }), ...classify({ wf: { ...wf(), file: 'a.yml' }, runs: ok, floor: fl, yieldRuns: [{ t: ago(1), n: 0 }], now })];
assert.equal(rank(all)[0].sev, 'critical'); assert.equal(redCount(all), 1);
assert.match(render(all, { total: 2 }), /\| 🔴 critical \| sản lượng \| `a\.yml` \| — · 1 ngày \|/);
const cfg = { rules: [{ match: '^video', owner: 'v' }], default: 'd' }; assert.equal(ownerOf('video-auto.yml', cfg), 'v'); assert.equal(ownerOf('zzz.yml', cfg), 'd');
assert.match(render([], { total: 5 }), /không mục đỏ/);
// record-yield
const d1 = addYield(null, { n: 3.4, t: 'T' }, 'w'); assert.deepEqual(d1.runs, [{ t: 'T', n: 3 }]);
let d = null; for (let i = 0; i < 130; i++) d = addYield(d, { n: i }, 'w'); assert.equal(d.runs.length, 120); assert.equal(addYield(null, { n: -5 }, 'w').runs[0].n, 0);
console.log('health-board OK');
