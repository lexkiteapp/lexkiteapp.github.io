// Mobile QA đo "bản phát hành" (.github/workflows/mobile-qa.yml) → mọi bước node trong scripts/build-web.sh ghi vào dist/
// phải có bước tương ứng ghi vào out/site trong workflow. 02/11: thiếu lexicon/shards.mjs → #/dict nạp nhánh dev ~750 KB, LCP 6 ↔ 10 s.
import fs from 'node:fs';
// Chỉ đếm bước DỰNG (ghi dist/). scripts/test/* chỉ KIỂM dist (đọc, không ghi) → bản phát hành không đổi nên mobile-qa không cần chạy lại;
// đòi chúng trong mobile-qa = bước giả. Cổng vẫn đỏ khi thiếu một bước dựng thật – hồi quy: scripts/test/mqa-parity-self.mjs.
// Dùng: node scripts/test/mqa-parity.mjs [build-web.sh] [mobile-qa.yml]  (mặc định file thật; tham số cho test hồi quy)
const [B = 'scripts/build-web.sh', W = '.github/workflows/mobile-qa.yml'] = process.argv.slice(2);
const build = fs.readFileSync(B, 'utf8'), wf = fs.readFileSync(W, 'utf8');
const steps = [...build.matchAll(/^node (scripts\/\S+\.mjs)([^#\n]*)/gm)].filter(m => /(^|\s)dist(\/|\s|$)/.test(m[2]) && !m[1].startsWith('scripts/test/')).map(m => m[1]); // scripts/test/* chỉ KIỂM dist (không ghi) → không phải bước dựng
if (steps.length < 2) { console.error('✗ mqa-parity: không đọc được bước dist/ trong build-web.sh (' + steps.length + ')'); process.exit(1); }
const miss = steps.filter(sc => !wf.split('\n').some(l => l.includes('node ' + sc) && l.includes('out/site')));
if (miss.length) { console.error('✗ mqa-parity: mobile-qa.yml thiếu bước của build-web.sh (ghi out/site): ' + miss.join(', ')); process.exit(1); }
console.log(`✓ mqa-parity: ${steps.length} bước dựng dist/ (${steps.join(', ')}) đều có trong mobile-qa.yml`);
