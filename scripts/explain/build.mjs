#!/usr/bin/env node
// content/explain/<set>.json → web/js/explain/<sub>/<lang>.json (tải lười theo bộ câu hỏi + ngôn ngữ) – docs/EXPLAIN.md
//   Chỉ xuất mục bản en được 2 giám khảo khác họ mô hình cùng chấm ≥ 4 (qa.en.j); ngôn ngữ chưa đạt → phần giải thích tiếng Anh (cờ 1). Dòng: [mẫu, vì sao, mẹo, {sai}, [ví dụ], cờ en]
//   node scripts/explain/build.mjs [--check]   (--check: báo lệch giữa nguồn và tệp web, không ghi)
import fs from 'fs';
import { items, SETS, LANGS } from './sets.mjs';
import { agree } from '../content-qa/lib.mjs'; // cổng QA: 2 giám khảo độc lập đồng ý (docs/CONTENT-QA.md §4)
const CHECK = process.argv.includes('--check'), U = p => new URL('../../' + p, import.meta.url);
let bad = 0, n = 0; const have = {}; // web/js/explain/sets.json: bộ → [ngôn ngữ] có dữ liệu – ExplainCard chỉ tải tệp có thật (app gốc: tệp thiếu = lỗi mạng)
for (const set of Object.keys(SETS)) {
  const F = U(`content/explain/${set}.json`); if (!fs.existsSync(F)) continue;
  const DB = JSON.parse(fs.readFileSync(F, 'utf8')), subs = {};
  for (const x of items(set)) { const d = DB[x.id]; if (d && agree((d.qa || {}).en).ok) (subs[x.sub] = subs[x.sub] || []).push([x.id, d]); }
  for (const [sub, rows] of Object.entries(subs)) for (const l of ['en', ...LANGS]) {
    const out = {};
    for (const [id, d] of rows) { const own = l !== 'en' && d[l] && agree((d.qa || {})[l]).ok, v = own ? d[l] : d.en; out[id] = [d.p, v.why, v.hook, v.wrong, d.ex, ...(own || l === 'en' ? [] : [1])]; }
    (have[sub] = have[sub] || []).push(l);
    const P = U(`web/js/explain/${sub}/${l}.json`), s = JSON.stringify(out);
    if (CHECK) { if (!fs.existsSync(P) || fs.readFileSync(P, 'utf8') !== s) { bad++; console.error('lệch: ' + P.pathname.split('/web/')[1]); } }
    else { fs.mkdirSync(U(`web/js/explain/${sub}`), { recursive: true }); fs.writeFileSync(P, s); }
    n++;
  }
}
{ const P = U('web/js/explain/sets.json'), s = JSON.stringify(have);
  if (CHECK) { if (!fs.existsSync(P) || fs.readFileSync(P, 'utf8') !== s) { bad++; console.error('lệch: js/explain/sets.json'); } } else { fs.mkdirSync(U('web/js/explain'), { recursive: true }); fs.writeFileSync(P, s); } }
console.log(`explain build: ${n} tệp${CHECK ? `, lệch ${bad}` : ''}`);
if (bad) process.exit(1);
