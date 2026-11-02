// 🌍 Test bảng World (docs/WORLD-SCORECARD.md): hàm chấm thuần, robots.txt, xếp Top 10, sàn CHỈ TĂNG so với main, trục hợp lệ.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseTotal, shellScore, ratioScore, robotsAllows, rank, overall, raiseFloors, checkFloors, AXES, BUDGET } from '../world-scorecard.mjs';

let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
ok(parseTotal('**Tổng: 47.3 / 100**') === 47.3 && parseTotal('không có') === null, 'parseTotal');
ok(shellScore(300, 374, 300) === 100 && shellScore(374, 374, 300) === 0 && shellScore(400, 374, 300) === 0 && Math.round(shellScore(337, 374, 300)) === 50, 'shellScore');
ok(ratioScore(5, 10) === 50 && ratioScore(5, 3) === 100 && ratioScore(1, 0) === 100 && ratioScore(5, null) === null, 'ratioScore');
ok(robotsAllows('User-agent: *\nDisallow: /admin\n', '/') && !robotsAllows('User-agent: *\nDisallow: /\n', '/'), 'robots: Disallow /admin cho phép /, Disallow / chặn');
ok(robotsAllows('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /\n', '/'), 'robots: luật của bot khác không áp cho *');
ok(robotsAllows('User-agent: *\nDisallow: /\nAllow: /$\nAllow: /\n', '/'), 'robots: Allow dài bằng thắng Disallow');
const rows = [{ id: 'a', gap: 50, impact: 5, cost: 5, weight: 1, lexkite: 50 }, { id: 'b', gap: 20, impact: 5, cost: 1, weight: 3, lexkite: 80 }, { id: 'c', gap: 0, impact: 5, cost: 1, weight: 1, lexkite: 100 }, { id: 'd', gap: null, impact: 1, cost: 1, weight: 1, lexkite: null }];
const t = rank(rows); ok(t.length === 2 && t[0].id === 'b' && t[0].prio === 100, 'rank: ưu tiên = khoảng cách × tác động ÷ chi phí, bỏ trục đã đạt/chưa đo');
ok(overall(rows, 'lexkite') === 78, 'overall: trung bình có trọng số, bỏ null');
const fl = raiseFloors({ a: 60, b: 10 }, rows); ok(fl.a === 60 && fl.b === 80 && fl.c === 100 && !('d' in fl), 'raiseFloors: chỉ tăng');
ok(checkFloors({ a: 60, d: 5 }, rows).length === 2 && !checkFloors({ a: 50 }, rows).length, 'checkFloors: dưới sàn + mất số đo đều trượt');
// trục hợp lệ
const A = JSON.parse(fs.readFileSync(AXES, 'utf8'));
for (const a of A.axes) ok(a.id && a.name && a.target > 0 && a.target <= 100 && a.impact >= 1 && a.impact <= 5 && a.cost >= 1 && a.cost <= 5 && a.weight > 0 && a.duolingo, `trục ${a.id}: thiếu/sai trường`);
for (const a of A.axes) if (a.duolingo.score != null) ok(a.duolingo.note && (a.duolingo.source || a.duolingo.verified === false || /không|chưa/.test(a.duolingo.note)), `trục ${a.id}: điểm Duolingo ghi tay phải có nguồn hoặc đánh dấu chưa kiểm`);
ok(new Set(A.axes.map(a => a.id)).size === A.axes.length && A.axes.filter(a => a.mustWin).length >= 5, 'id trùng / thiếu 5 lợi thế phải thắng');
// sàn chỉ tăng so với main (CI có origin/main; máy không có thì bỏ qua)
const cur = JSON.parse(fs.readFileSync(BUDGET, 'utf8')).floors || {};
let main = null; try { main = JSON.parse(execFileSync('git', ['show', 'origin/main:' + BUDGET], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).floors || {}; } catch {}
if (main) for (const [k, v] of Object.entries(main)) ok(cur[k] != null && cur[k] >= v, `sàn ${k} bị hạ/xoá: ${v} → ${cur[k]} (chỉ được tăng – docs/WORLD-SCORECARD.md)`);
if (bad) process.exit(1);
console.log(`✓ world-scorecard: ${A.axes.length} trục, sàn chỉ tăng${main ? ' (so origin/main)' : ''}`);
