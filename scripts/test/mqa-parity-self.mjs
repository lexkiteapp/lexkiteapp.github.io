// Hồi quy cổng mqa-parity (3/11): đổi cách đếm (bỏ scripts/test/*) KHÔNG được làm cổng yếu đi.
// Thiếu một bước DỰNG dist/ trong mobile-qa → vẫn đỏ; chỉ bước KIỂM scripts/test/* được bỏ qua; đủ bước → xanh.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mqa-self-')), bad = [];
const run = (build, wf) => { fs.writeFileSync(path.join(d, 'b.sh'), build); fs.writeFileSync(path.join(d, 'w.yml'), wf); return spawnSync(process.execPath, ['scripts/test/mqa-parity.mjs', path.join(d, 'b.sh'), path.join(d, 'w.yml')], { encoding: 'utf8' }).status; };
const B = 'node scripts/app-loader.mjs dist/app/index.html\nnode scripts/lexicon/shards.mjs --out dist\n';
const W = 'node scripts/app-loader.mjs out/site/app/index.html\nnode scripts/lexicon/shards.mjs --out out/site\n';
if (run(B, W) !== 0) bad.push('đủ bước dựng → phải xanh');
if (run(B + 'node scripts/build-new.mjs dist\n', W) !== 1) bad.push('thiếu bước DỰNG scripts/build-new.mjs trong mobile-qa → phải ĐỎ');
if (run(B.replace('node scripts/lexicon/shards.mjs --out dist\n', 'node scripts/lexicon/shards.mjs --out dist\nnode scripts/lib/x.mjs dist  # ghi\n'), W) !== 1) bad.push('thiếu bước dựng scripts/lib/* → phải ĐỎ');
if (run(B + 'node scripts/test/theme-switch.mjs dist  # chỉ kiểm\n', W) !== 0) bad.push('bước KIỂM scripts/test/* thiếu trong mobile-qa → được bỏ qua (xanh)');
if (run(B, 'node scripts/app-loader.mjs out/site/app/index.html\n') !== 1) bad.push('mobile-qa thiếu lexicon/shards.mjs → phải ĐỎ (sự cố 02/11)');
fs.rmSync(d, { recursive: true, force: true });
if (bad.length) { console.error('✗ mqa-parity-self: ' + bad.join(' · ')); process.exit(1); }
console.log('✓ mqa-parity-self: 5 ca – thiếu bước dựng vẫn đỏ, chỉ bỏ qua bước kiểm scripts/test/*');
