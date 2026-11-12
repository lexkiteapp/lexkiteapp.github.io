#!/usr/bin/env node
// Xưởng nội dung – gom lô của đêm: node scripts/factory/merge.mjs out/factory [--summary out/factory-summary.md]
// Mỗi tệp lô (run.mjs) → K.apply(mục đã nhận) ghi vào nguồn + lo; lô → content/qa/batches/<id>.json (lớp 6);
// mục thấp điểm/lô bị loại → content/factory/review.jsonl (hàng duyệt người, không xuất); trạng thái → content/factory/state.json.
// Sau đó dựng lại tệp sinh (gold.js, speak data) và bảng điểm (content-score --bump: sàn chỉ tăng). Đỏ khi điểm giảm.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { rj, wj, ex, loadState, settle, STATE, loadKinds } from './lib.mjs';

const dir = process.argv[2] || 'out/factory', si = process.argv.indexOf('--summary'), SUM = si > 0 ? process.argv[si + 1] : null;
const REVIEW = 'content/factory/review.jsonl';
const files = ex(dir) ? fs.readdirSync(dir).filter(f => /^[a-z]+-[a-z0-9-]+-s\d+\.json$/.test(f)).sort() : [];
const score = () => { try { execFileSync('node', ['scripts/content-score.mjs'], { stdio: 'pipe' }); } catch {} return rj('reports/content-score.json', { total: 0, areas: {} }); };
const before = score(), state = loadState(), rows = [], by = {};
for (const f of files) {
  const r = rj(`${dir}/${f}`), { area, kind } = r.stats;
  (by[area + '/' + kind] = by[area + '/' + kind] || []).push(r);
}
const touched = new Set();
for (const [ak, list] of Object.entries(by)) {
  const [area, kind] = ak.split('/'), K = (await loadKinds(area))[kind];
  const acc = list.flatMap(r => r.accepted);
  if (acc.length) { K.apply(acc); (K.touches || []).forEach(t => touched.add(t)); }
  for (const r of list) {
    settle(state, kind, r);
    if (r.batch && r.batch.status !== 'empty') wj(`content/qa/batches/${r.batch.id}.json`, r.batch);
    if (r.review.length) fs.appendFileSync(REVIEW, r.review.map(x => JSON.stringify({ ...x, at: new Date().toISOString().slice(0, 10) })).join('\n') + '\n');
  }
  const s = list.reduce((a, r) => { for (const k of ['seeds', 'gen', 'rule', 'judged', 'low', 'nojudge', 'audit', 'auditBad']) a[k] = (a[k] || 0) + (r.stats[k] || 0); return a; }, {});
  rows.push(`| ${area}/${kind} | ${list.length} | ${s.seeds} | ${s.gen} | ${s.rule} | ${s.judged} | ${s.low} | ${s.nojudge} | ${s.audit}/${s.auditBad} | **${acc.length}** |`);
}
state.nights = [...(state.nights || []), { at: new Date().toISOString().slice(0, 10), accepted: Object.fromEntries(Object.entries(by).map(([k, l]) => [k, l.reduce((a, r) => a + r.accepted.length, 0)])) }].slice(-60);
wj(STATE, state);
// tệp sinh phụ thuộc nguồn (kind khai báo touches: 'gold' | 'speak')
if (touched.has('gold')) execFileSync('node', ['scripts/lesson/build-gold.mjs'], { stdio: 'inherit' });
if (touched.has('speak')) execFileSync('node', ['scripts/speak/build.mjs'], { stdio: 'inherit' });
const after = score();
let bumped = true; try { execFileSync('node', ['scripts/content-score.mjs', '--bump'], { stdio: 'pipe' }); } catch { bumped = false; }
const delta = Object.entries(after.areas || {}).map(([k, v]) => `| ${v.name} | ${before.areas?.[k]?.score ?? '–'} | **${v.score}** |`);
const md = ['## Xưởng nội dung – lô đêm ' + new Date().toISOString().slice(0, 10), '',
  `Tổng bảng điểm: **${before.total} → ${after.total}** / 100${bumped ? '' : ' (⚠ content-score đỏ – xem npm test)'}`, '',
  '| Mảng | Trước | Sau |', '|---|---|---|', ...delta, '',
  '| kind | lô | hạt | sinh | trượt luật | chấm | thấp | thiếu GK | soát/sai | nhận |', '|---|---|---|---|---|---|---|---|---|---|', ...rows, '',
  'Cổng: tầng 0 luật kind → 2 giám khảo (≥ 4, lệch ≤ 1, docs/CONTENT-QA.md lớp 3) → soát mẫu ≥ 5 % giám khảo thứ ba (lớp 6, `content/qa/batches/cf-*`). Mục không đạt: `content/factory/review.jsonl`.', '',
  '🤖 Tạo bởi content-factory.yml (scripts/factory/) – $0, không AI tài khoản chính.'].join('\n');
if (SUM) { fs.mkdirSync(SUM.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(SUM, md + '\n'); }
console.log(md);
if ((after.total || 0) < (before.total || 0)) { console.error('✗ bảng điểm giảm sau khi gom lô'); process.exit(1); }
