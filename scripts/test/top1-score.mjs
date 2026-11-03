// Test bảng Top-1 score (scripts/top1/score.mjs, docs/TOP1-SCORE.md): hàm thuần gom điểm, Top 10, sàn chỉ tăng (so origin/main), workflow gắn đúng.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { AXES, BUDGET, penaltyScore, linScore, gateScore, webItems, compose, upgrades, raiseFloors, checkFloors, render, digestLine, NOISE, SEV_P } from '../top1/score.mjs';

assert.equal(AXES.reduce((s, a) => s + a.weight, 0), 100, 'trọng số các trục cộng = 100');
assert.deepEqual(AXES.map(a => a.id), ['ui', 'ux', 'perf', 'a11y', 'latent', 'content', 'i18n', 'notif']);
// thang điểm
assert.equal(penaltyScore(0), 100); assert.ok(penaltyScore(6) < 100 && penaltyScore(6) > penaltyScore(12)); assert.ok(penaltyScore(1000) > 0 || penaltyScore(1000) === 0);
assert.ok(penaltyScore(150) - penaltyScore(156) > 0, 'đã nhiều lỗi, sửa 1 mục vẫn cộng điểm (không kẹt 0)');
assert.equal(linScore(2500, 2500, 6000), 100); assert.equal(linScore(6000, 2500, 6000), 0); assert.equal(linScore(9283, 2500, 6000), 0); assert.equal(linScore(4250, 2500, 6000), 50); assert.equal(linScore(null, 1, 2), null);
assert.equal(gateScore('success'), 100); assert.equal(gateScore('failure'), 0); assert.equal(gateScore(null), null);
// phát hiện quality-sweep (mẫu thật 1/11) → mục phạt đúng trục
const items = { sources: { web: true, addon: true },
  web: [{ type: 'axe-serious', sev: 'high', key: '.ret-bar', where: ['ar #/streak m-dark', 'en #/streak m-light'], link: 'https://x/shot.png' },
    { type: 'console', sev: 'high', key: 'TypeError x', where: ['vi #/home d-light'] }, { type: 'touch-target', sev: 'low', key: '.chip', where: ['vi #/me m-light'] }, { type: 'longtask', sev: 'low', key: 'x', where: [] }],
  addon: [{ lang: 'vi', check: 'popup: tra nhanh "house"' }, { lang: 'en', check: 'popup: tra nhanh "house"' }, { lang: 'ar', check: 'popup: tra nhanh "house"' }], heavy: [], lighthouse: [] };
const it = webItems(items);
assert.deepEqual(it.map(x => `${x.axis}/${x.comp}`), ['a11y/axe', 'latent/runtime', 'a11y/touch', 'perf/findings', 'latent/addon']);
assert.equal(it[4].p, 6, 'add-on: 3 ngôn ngữ × 2 = 1 lỗi high'); assert.match(it[0].evidence, /\[ảnh\]\(https:\/\/x\/shot\.png\).*route ar #\/streak/);
// gộp: thành phần null không tính, trục null không kéo tổng
const comps = [{ axis: 'ui', id: 'ssim', name: 'SSIM', score: 50, effort: 5 }, { axis: 'ui', id: 'frame', name: 'frame', score: null },
  { axis: 'a11y', id: 'axe', name: 'axe', penalty: true, available: true }, { axis: 'a11y', id: 'touch', name: 'touch', penalty: true, available: true },
  { axis: 'latent', id: 'runtime', name: 'rt', penalty: true, available: true }, { axis: 'latent', id: 'addon', name: 'ad', penalty: true, available: false },
  { axis: 'perf', id: 'lcp', name: 'LCP', score: 0, effort: 3 }, { axis: 'perf', id: 'findings', name: 'f', penalty: true, available: true }];
const res = compose(comps, it, [{ id: 'perf', duo: 80 }]);
const ax = Object.fromEntries(res.axes.map(a => [a.id, a]));
assert.equal(ax.ui.score, 50); assert.equal(ax.ux.score, null); assert.equal(ax.latent.n, 1, 'add-on không chạy → không tính (không coi là sạch)');
assert.equal(ax.a11y.score, Math.round((penaltyScore(SEV_P.high) + penaltyScore(SEV_P.low)) / 2 * 10) / 10);
assert.equal(ax.perf.duo, 80); assert.equal(res.vs.n, 1);
assert.equal(res.wsum, 15 + 15 + 15 + 15, 'chỉ trục có số đo'); assert.ok(res.total > 0 && res.total < 100);
// Top 10: mỗi mục có lợi ích > 0, sắp theo ưu tiên, có bằng chứng
const top = upgrades(res);
assert.ok(top.length >= 4 && top.length <= 10); for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].prio >= top[i].prio, 'sắp theo ưu tiên');
assert.ok(top.every(t => t.gain > 0 && t.evidence), 'mọi mục có +điểm và bằng chứng'); assert.ok(top.some(t => /LCP/.test(t.title)));
const sumGain = top.reduce((s, t) => s + t.gain, 0); assert.ok(sumGain <= 100 - res.total + 1, 'tổng lợi ích không vượt khoảng còn thiếu');
// sàn chỉ tăng
const fl = raiseFloors({ ui: 60, total: 10 }, res);
assert.equal(fl.ui, 60, 'không hạ sàn'); assert.equal(fl.total, Math.round((res.total - NOISE.total) * 10) / 10); assert.ok(fl.perf <= ax.perf.score);
assert.deepEqual(checkFloors({ ui: 49 }, res), []); assert.match(checkFloors({ ui: 51 }, res)[0], /ui: 50 < sàn 51/);
assert.match(checkFloors({ ux: 40 }, res)[0], /mất số đo/, 'trục có sàn mà mất số đo → đỏ (mất tín hiệu ≠ sạch)');
assert.match(checkFloors({ total: 999 }, res)[0], /^total/);
const md = render(res, top, fl, { bad: ['x'] });
assert.match(md, /^<!-- top1-score -->/); assert.match(md, /Top-1 score: \*\*[\d.]+ \/ 100\*\*/); assert.match(md, /Top 10 nâng cấp/); assert.match(md, /Dưới sàn/);
assert.match(digestLine(res, top, 'https://i'), /^• Top-1 score [\d.]+\/100 .*nâng cấp #1: .* – https:\/\/i$/);
// sàn trong repo: hợp lệ + không thấp hơn origin/main
const B = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
for (const [k, v] of Object.entries(B.floors)) { assert.ok(k === 'total' || AXES.some(a => a.id === k), 'sàn lạ: ' + k); assert.ok(v >= 0 && v <= 100); }
let main = null; try { main = JSON.parse(execFileSync('git', ['show', 'origin/main:' + BUDGET], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).floors || {}; } catch {}
if (main) for (const [k, v] of Object.entries(main)) { assert.ok(k in B.floors, `xoá sàn ${k} (no-cuts)`); assert.ok(B.floors[k] >= v, `hạ sàn ${k}: ${B.floors[k]} < ${v} (no-cuts)`); }
// gắn lịch: đêm (quality-sweep) + tuần (world-scorecard nâng sàn); không chạy trên PR
const qs = fs.readFileSync('.github/workflows/quality-sweep.yml', 'utf8'), ws = fs.readFileSync('.github/workflows/world-scorecard.yml', 'utf8');
assert.match(qs, /scripts\/top1\/score\.mjs --qs qs-report[^\n]*--ci[^\n]*--check[^\n]*--issue/, 'quality-sweep chấm Top-1 mỗi đêm');
assert.match(qs, /name: qs-report/, 'quality-sweep lưu artifact qs-report cho lượt tuần');
assert.match(ws, /scripts\/top1\/score\.mjs --qs-latest[^\n]*--raise/, 'world-scorecard nâng sàn Top-1 hằng tuần');
assert.match(ws, /git add [^\n]*content\/pipeline\/top1\.budget\.json/, 'world-scorecard commit sàn Top-1');
for (const [n, y] of [['quality-sweep', qs], ['world-scorecard', ws]]) assert.ok(!/^\s+pull_request/m.test(y), n + ' không chạy trên PR');
console.log(`✓ top1-score: ${AXES.length} trục (tổng trọng số 100), Top 10 theo lợi ích/công sức, sàn chỉ tăng${main ? ' (so origin/main)' : ''}, gắn đêm + tuần`);
