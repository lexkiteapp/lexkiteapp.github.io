#!/usr/bin/env node
// Gộp kết quả chấm mù: node scripts/content-qa/lesson-tally.mjs DIR  → bảng tỉ lệ lỗi theo loại/nguồn/ngôn ngữ/cấp.
import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2];
const items = Object.fromEntries(fs.readFileSync(path.join(dir, 'items.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).map(x => [x.id, x]));
const res = fs.readdirSync(dir).filter(f => /^result-/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const T = {}; const bump = (g, k, r) => { const o = (T[g] ||= {})[k] ||= { n: 0, major: 0, minor: 0 }; o.n++; if (r.verdict === 'error') o[r.severity === 'major' ? 'major' : 'minor']++; };
let n = 0, miss = 0;
for (const r of res) { const it = items[r.id]; if (!it) { miss++; continue; } n++;
  bump('kind', it.kind, r); bump('lang', it.lang.split('+')[0] === it.lang ? it.lang : 'vocab-multi', r); bump('level', it.lv, r); bump('all', 'ALL', r);
  if (r.verdict === 'error') for (const t of r.error_types || []) bump('type', t, { verdict: 'error', severity: r.severity }); }
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
for (const [g, m] of Object.entries(T)) { console.log('\n## ' + g); console.log('| ' + g + ' | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |\n|---|--:|--:|--:|--:|--:|');
  for (const [k, o] of Object.entries(m).sort()) console.log(`| ${k} | ${o.n} | ${o.major} | ${o.minor} | ${pct(o.major, o.n)} | ${pct(o.major + o.minor, o.n)} |`); }
console.log(`\nchấm ${n}/${Object.keys(items).length} mục, ${miss} id lạ`);
