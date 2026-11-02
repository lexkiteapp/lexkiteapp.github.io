// Mobile QA đo "bản phát hành" (.github/workflows/mobile-qa.yml) → mọi bước node trong scripts/build-web.sh ghi vào dist/
// phải có bước tương ứng ghi vào out/site trong workflow. 02/11: thiếu lexicon/shards.mjs → #/dict nạp nhánh dev ~750 KB, LCP 6 ↔ 10 s.
import fs from 'node:fs';
const build = fs.readFileSync('scripts/build-web.sh', 'utf8'), wf = fs.readFileSync('.github/workflows/mobile-qa.yml', 'utf8');
const steps = [...build.matchAll(/^node (scripts\/\S+\.mjs)([^#\n]*)/gm)].filter(m => /(^|\s)dist(\/|\s|$)/.test(m[2])).map(m => m[1]);
if (steps.length < 2) { console.error('✗ mqa-parity: không đọc được bước dist/ trong build-web.sh (' + steps.length + ')'); process.exit(1); }
const miss = steps.filter(sc => !wf.split('\n').some(l => l.includes('node ' + sc) && l.includes('out/site')));
if (miss.length) { console.error('✗ mqa-parity: mobile-qa.yml thiếu bước của build-web.sh (ghi out/site): ' + miss.join(', ')); process.exit(1); }
console.log(`✓ mqa-parity: ${steps.length} bước dựng dist/ (${steps.join(', ')}) đều có trong mobile-qa.yml`);
