// Gộp kết quả các shard dựng audio (.st-res/res-*.json) vào scripts/stories/audio-state.json rồi sinh lại lib.js. Dùng: node scripts/stories/merge-audio.mjs .st-res/*.json
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { STATE, readState } from './render-audio.mjs';
const st = readState(); let n = 0;
for (const f of process.argv.slice(2)) for (const [id, chs] of Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')))) for (const [ci, o] of Object.entries(chs)) { (st[id] = st[id] || {})[ci] = o; n++; }
const sorted = Object.fromEntries(Object.keys(st).sort().map(id => [id, st[id]]));
fs.writeFileSync(STATE, JSON.stringify(sorted) + '\n'); execFileSync('node', ['scripts/stories/build-lib.mjs'], { stdio: 'inherit' });
console.log(`✓ audio truyện: +${n} chương · tổng ${Object.values(sorted).reduce((a, c) => a + Object.keys(c).length, 0)}`);
