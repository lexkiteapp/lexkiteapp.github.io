#!/usr/bin/env node
// perf-median: chấm số đo thời gian theo TRUNG VỊ nhiều lượt (scripts/test/lib/perf-median.mjs) – 1 lượt nhiễu runner không đỏ PR,
// khựng thật lặp lại vẫn đỏ, ngưỡng không đổi. Hồi quy 10/11 #985 (scroll-perf desktop/dark roleplay task 349 ms 1 lượt).
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { median, medianRuns, RUNS } from './lib/perf-median.mjs';
assert.equal(median([349, 0, 0]), 0, 'lẻ: trung vị'); assert.equal(median([5, 9]), 9, 'chẵn: phần tử trên (bảo thủ)'); assert.equal(median([]), 0);
const run = (d, l, extra = {}) => ({ id: 'roleplay', dist: 1716, droppedPct: d, cls: 0.0023, trace: { longMax: l, layoutMs: 0.2 }, ...extra });
// 1 lượt nhiễu (#985) → trung vị sạch; CLS/tất định giữ của lượt đầu
let r = medianRuns([run(10.1, 349, { cls: 0.0099 }), run(0, 0), run(0.4, 0)], ['droppedPct'], ['longMax', 'layoutMs']);
assert.equal(r.droppedPct, 0.4); assert.equal(r.trace.longMax, 0); assert.equal(r.cls, 0.0099, 'chỉ số tất định lấy từ lượt đầu'); assert.equal(r.runs.length, 3);
// khựng thật: 2/3 lượt vượt → vẫn đỏ
r = medianRuns([run(10.1, 349), run(9, 300), run(0, 0)], ['droppedPct'], ['longMax']);
assert.ok(r.trace.longMax >= 300 && r.droppedPct >= 9, 'khựng lặp ở đa số lượt vẫn vượt ngưỡng');
// lượt đo lại lỗi → không bao giờ xanh nhờ lượt hỏng: còn 1 lượt hợp lệ = chấm lượt đầu
r = medianRuns([run(10.1, 349), { crash: 'x' }, { crash: 'y' }], ['droppedPct'], ['longMax']);
assert.equal(r.trace.longMax, 349);
// 2 lượt hợp lệ → phần tử trên
r = medianRuns([run(10.1, 349), run(0, 0), { crash: 'x' }], ['droppedPct'], ['longMax']);
assert.equal(r.trace.longMax, 349, '2 lượt: lấy số xấu hơn');
assert.ok(RUNS >= 3, 'đủ 3 lượt cho trung vị thật');
// máy gác: scroll-perf dùng trung vị, không quay về "giữ lượt tốt hơn theo rớt khung"
const sp = fs.readFileSync('scripts/test/scroll-perf.mjs', 'utf8');
assert.match(sp, /medianRuns\(runs, \[[^\]]*'droppedPct'[^\]]*\], \[[^\]]*'longMax'/, 'scroll-perf chấm trung vị cả khung rớt lẫn task dài');
assert.doesNotMatch(sp, /r2\.droppedPct <= r\.droppedPct/, 'không còn đo lại 1 lượt chỉ xét rớt khung');
const bud = JSON.parse(fs.readFileSync('scripts/test/scroll-perf.budget.json', 'utf8'));
assert.ok(bud.desktop.longMaxMs <= 100 && bud.desktop.droppedPct <= 5, 'ngưỡng desktop không nới');
console.log('✓ perf-median: 1 lượt nhiễu không đỏ, khựng lặp vẫn đỏ, lượt hỏng không làm xanh, ngưỡng giữ nguyên');
